/**
 * CRON Utilities for the Reservation & Yield Engine
 * Ported from frontend to core API.
 */

import { TableInventory } from "../models/TableInventory";
import { Reservation } from "../models/Reservation";
import { YieldRule } from "../models/YieldRule";
import { Restaurant } from "../models/Restaurant";
import { BillSubmission } from "../models/BillSubmission";
import { RestaurantInvoice } from "../models/RestaurantInvoice";

// ── Standard time slots (30-min intervals from 11:00 to 23:30) ──
const TIME_SLOTS: string[] = [];
for (let h = 11; h <= 23; h++) {
    TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:00`);
    TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:30`);
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * 1. Expire Stale Holds
 */
export async function expireStaleHolds() {
    const now = new Date();

    const expiredDrafts = await Reservation.find({
        status: "Draft",
        lockExpiresAt: { $lt: now },
    });

    let cleaned = 0;
    for (const draft of expiredDrafts) {
        // Release held covers
        await TableInventory.findOneAndUpdate(
            {
                restaurantId: draft.restaurantId,
                date: draft.date,
                timeSlot: draft.timeSlot,
            },
            { $inc: { heldCovers: -draft.pax } }
        );

        // Delete the expired draft
        await Reservation.findByIdAndDelete(draft._id);
        cleaned++;
    }

    return { cleaned, message: `Expired ${cleaned} stale draft holds` };
}

/**
 * 2. Generate Inventory (Rolling window based on bookingSettings)
 *
 * Uses each restaurant's bookingSettings to:
 * - Only generate for booking-enabled restaurants
 * - Respect bookable days (Mon-Sat, etc.)
 * - Respect bookable hours (bookableTimeStart/End)
 * - Use the configured slot duration (15/30/60 min)
 * - Set maxCovers based on meal period (lunch/afternoon/dinner)
 */

// Helper: determine meal period from time HH:MM
function getMealPeriod(timeSlot: string): "lunch" | "afternoon" | "dinner" {
    const hour = parseInt(timeSlot.split(":")[0], 10);
    if (hour >= 12 && hour < 15) return "lunch";
    if (hour >= 15 && hour < 18) return "afternoon";
    return "dinner";
}

// Helper: generate time slots for a restaurant based on its bookingSettings
function generateTimeSlots(startTime: string, endTime: string, durationMin: number): string[] {
    const slots: string[] = [];
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    for (let m = startMinutes; m < endMinutes; m += durationMin) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        slots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
    }
    return slots;
}

export async function generateInventory() {
    // Only fetch restaurants with booking enabled
    const restaurants = await Restaurant.find({
        isApproved: true,
        isActive: true,
        "bookingSettings.isBookingEnabled": true,
    })
        .select("_id bookingSettings")
        .lean();

    let created = 0;
    let skipped = 0;

    for (const rest of restaurants as any[]) {
        const settings = rest.bookingSettings || {};
        const slotDuration = settings.slotDurationMinutes || 30;
        const bookableDays: string[] = settings.bookableDays ||
            ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const timeStart = settings.bookableTimeStart || "12:00";
        const timeEnd = settings.bookableTimeEnd || "23:00";
        const covers = settings.coversPerSlot || { lunch: 20, afternoon: 12, dinner: 30 };
        const advanceDays = settings.maxAdvanceBookingDays || 30;

        // Generate slots for this restaurant
        const timeSlots = generateTimeSlots(timeStart, timeEnd, slotDuration);

        // Fetch active yield rules
        const rules = await YieldRule.find({
            restaurantId: rest._id,
            isActive: true,
            validTo: { $gte: new Date() },
        })
            .sort({ priority: -1 })
            .lean();

        for (let dayOffset = 0; dayOffset < advanceDays; dayOffset++) {
            const date = new Date();
            date.setDate(date.getDate() + dayOffset);
            date.setHours(0, 0, 0, 0);

            const dayName = DAYS[date.getDay()];

            // Skip if this day is not bookable
            if (!bookableDays.includes(dayName)) {
                skipped++;
                continue;
            }

            for (const slot of timeSlots) {
                // Check if slot already exists
                const existing = await TableInventory.findOne({
                    restaurantId: rest._id,
                    date,
                    timeSlot: slot,
                });

                // Never overwrite manual overrides or existing slots
                if (existing && existing.isManualOverride) continue;
                if (existing) continue;

                // Find applicable yield rule (highest priority first)
                let discountPercent = 0;
                for (const rule of rules as any[]) {
                    if (!rule.daysOfWeek.includes(dayName)) continue;
                    if (date < new Date(rule.validFrom) || date > new Date(rule.validTo)) continue;
                    if (slot >= rule.timeSlotStart && slot < rule.timeSlotEnd) {
                        discountPercent = rule.discountPercent;
                        break;
                    }
                }

                // Determine max covers based on meal period
                const period = getMealPeriod(slot);
                const maxCovers = covers[period] || 20;

                await TableInventory.create({
                    restaurantId: rest._id,
                    date,
                    timeSlot: slot,
                    maxCovers,
                    bookedCovers: 0,
                    heldCovers: 0,
                    discountPercent,
                    isBlocked: false,
                    isManualOverride: false,
                });
                created++;
            }
        }
    }

    return { created, skipped, message: `Generated ${created} new inventory slots (${skipped} day-skips)` };
}

/**
 * 3. Mark No-Shows
 */
export async function markNoShows() {
    const now = new Date();

    const candidates = await Reservation.find({
        status: "Confirmed",
        date: { $lte: now },
    });

    let marked = 0;
    for (const res of candidates) {
        const [h, m] = res.timeSlot.split(":").map(Number);
        const slotTime = new Date(res.date);
        slotTime.setHours(h, m, 0, 0);

        const diffMs = now.getTime() - slotTime.getTime();
        if (diffMs > 20 * 60 * 1000) {
            res.status = "NoShow";
            res.isNoShowPenaltyApplied = true;
            await res.save();

            await TableInventory.findOneAndUpdate(
                {
                    restaurantId: res.restaurantId,
                    date: res.date,
                    timeSlot: res.timeSlot,
                },
                { $inc: { bookedCovers: -res.pax } }
            );

            marked++;
        }
    }

    return { marked, message: `Marked ${marked} reservations as NoShow` };
}

/**
 * 4. Recalculate Surge Pricing
 * Runs every 15 minutes — adjusts discounts based on real-time occupancy.
 */
export async function recalculateSurge() {
    const { SurgeEngine } = await import("./surge-engine");
    const result = await SurgeEngine.recalculateAll();
    return { ...result, message: `Surge: ${result.processed} slots processed, ${result.surged} adjusted` };
}

/**
 * 5. Expire Unpaid FoodiePay Bills
 * Runs frequently (e.g. hourly) to mark pending FoodiePay bills as expired
 * if 24 hours have passed since submission.
 */
export async function expireUnpaidFoodiePayBills() {
    const now = new Date();
    const expiredBills = await BillSubmission.find({
        status: "PendingPayment",
        paymentMode: "FoodiePay",
        expiresAt: { $lt: now }
    });

    let expiredCount = 0;
    for (const bill of expiredBills) {
        bill.status = "Expired";
        await bill.save();

        // Expire the corresponding reservation payment status as well if needed
        await Reservation.findByIdAndUpdate(bill.reservationId, {
            paymentStatus: "Expired"
        });

        expiredCount++;
    }

    return { expiredCount, message: `Expired ${expiredCount} unpaid FoodiePay bills` };
}

/**
 * 6. Generate Monthly Invoices
 * Runs on the 1st of every month to aggregate all BillSubmissions
 * from the previous month for each restaurant.
 */
export async function generateMonthlyInvoices() {
    const now = new Date();

    // Set target month to previous month
    let targetMonth = now.getMonth() - 1;
    let targetYear = now.getFullYear();
    if (targetMonth < 0) {
        targetMonth = 11;
        targetYear -= 1;
    }

    // Format "YYYY-MM"
    const monthString = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

    // Date boundaries for the query
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const matchQuery = {
        submittedAt: { $gte: startDate, $lte: endDate },
        status: "Paid" // Only aggregate settled/paid bills
    };

    // Aggregate bills by restaurant
    const aggregates = await BillSubmission.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: "$restaurantId",
                totalBookings: { $sum: 1 },
                totalFoodiePayBookings: {
                    $sum: { $cond: [{ $eq: ["$paymentMode", "FoodiePay"] }, 1, 0] }
                },
                totalCashBookings: {
                    $sum: { $cond: [{ $eq: ["$paymentMode", "AtRestaurant"] }, 1, 0] }
                },
                totalBillValuePaisa: { $sum: "$originalBillPaisa" },
                totalFoodiePayBillsPaisa: {
                    $sum: { $cond: [{ $eq: ["$paymentMode", "FoodiePay"] }, "$originalBillPaisa", 0] }
                },
                totalCashBillsPaisa: {
                    $sum: { $cond: [{ $eq: ["$paymentMode", "AtRestaurant"] }, "$originalBillPaisa", 0] }
                },
                totalFoodiePayFeePaisa: {
                    $sum: { $cond: [{ $eq: ["$paymentMode", "FoodiePay"] }, "$platformFeePaisa", 0] }
                },
                totalCashFeePaisa: {
                    $sum: { $cond: [{ $eq: ["$paymentMode", "AtRestaurant"] }, "$platformFeePaisa", 0] }
                }
            }
        }
    ]);

    let generated = 0;
    let skipped = 0;

    for (const agg of aggregates) {
        const restaurantId = agg._id;

        // Check if invoice already exists for this month
        const existing = await RestaurantInvoice.findOne({ restaurantId, month: monthString });
        if (existing) {
            skipped++;
            continue;
        }

        const restaurant = await Restaurant.findById(restaurantId).lean() as any;
        const isPrimePartner = restaurant?.bookingSettings?.isPrimePartner || false;

        // Note: totalCovers is tricky without joining Reservation, but for now we default 0
        // Calculate outstanding balance: only the fees from Cash payments are owed to the platform
        const totalOutstandingPaisa = agg.totalCashFeePaisa;

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15); // Due in 15 days

        await RestaurantInvoice.create({
            restaurantId,
            month: monthString,
            totalBookings: agg.totalBookings,
            totalCovers: 0, // Need to aggregate covers from reservations separately if critical
            totalFoodiePayBookings: agg.totalFoodiePayBookings,
            totalCashBookings: agg.totalCashBookings,
            totalBillValuePaisa: agg.totalBillValuePaisa,
            totalFoodiePayBillsPaisa: agg.totalFoodiePayBillsPaisa,
            totalCashBillsPaisa: agg.totalCashBillsPaisa,
            totalFoodiePayFeePaisa: agg.totalFoodiePayFeePaisa,
            totalCashFeePaisa: agg.totalCashFeePaisa,
            isPrimePartner,
            totalOutstandingPaisa,
            status: totalOutstandingPaisa > 0 ? "Pending" : "Paid", // Auto-mark paid if 0 owed
            dueDate,
        });

        generated++;
    }

    return { generated, skipped, message: `Generated ${generated} monthly invoices for ${monthString}` };
}
