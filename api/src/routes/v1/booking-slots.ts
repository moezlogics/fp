import { Router, Request, Response } from "express";
import { Restaurant } from "../../models/Restaurant";
import { YieldRule } from "../../models/YieldRule";
import { Deal } from "../../models/Deal";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

function parseDateOnly(dateStr: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const [year, month, day] = dateStr.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    parsed.setHours(0, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getKarachiNow(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
}

function getKarachiDateString(date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Karachi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    return `${year}-${month}-${day}`;
}

/**
 * GET /api/v1/booking-slots/restaurant/:restaurantId
 * Public: Returns available booking slots for a specific date.
 *
 * Query: ?date=2026-03-10&pax=4
 *
 * NEW LOGIC:
 * - Slots are generated DYNAMICALLY from opening hours (bookableTimeStart → bookableTimeEnd)
 * - No dependency on pre-generated TableInventory rows
 * - Discounts come from YieldRule matching — if no rule matches, discount = 0 but slot is still bookable
 * - Any time during opening hours = bookable
 * - Discount = only at owner-set yield rule times
 */
router.get(
    "/restaurant/:restaurantId",
    async (req: Request, res: Response) => {
        try {
            const { restaurantId } = req.params;
            const dateStr = req.query.date as string;
            const pax = parseInt(req.query.pax as string, 10) || 2;

            if (!dateStr) {
                errorResponse(res, "date query parameter required (YYYY-MM-DD)", 400);
                return;
            }

            // ── Fetch restaurant + booking settings ──
            const rest = await Restaurant.findById(restaurantId)
                .select("bookingSettings name brandName branchName")
                .lean() as any;

            if (!rest) {
                errorResponse(res, "Restaurant not found", 404);
                return;
            }

            const settings = rest.bookingSettings || {};

            // ── Check if booking is enabled ──
            if (!settings.isBookingEnabled) {
                successResponse(res, {
                    available: false,
                    reason: "Booking is not available for this restaurant",
                    slots: [],
                });
                return;
            }

            // ── Party size validation ──
            if (pax < (settings.minPartySize || 1)) {
                errorResponse(res, `Minimum party size is ${settings.minPartySize || 1}`, 400);
                return;
            }
            if (pax > (settings.maxPartySize || 10)) {
                errorResponse(res, `Maximum party size is ${settings.maxPartySize || 10}`, 400);
                return;
            }

            // ── Date validation ──
            const requestedDate = parseDateOnly(dateStr);
            if (!requestedDate) {
                errorResponse(res, "Invalid date format. Use YYYY-MM-DD.", 400);
                return;
            }
            const today = parseDateOnly(getKarachiDateString())!;
            const maxDate = new Date(today);
            maxDate.setDate(maxDate.getDate() + (settings.maxAdvanceBookingDays || 30));

            if (requestedDate < today) {
                errorResponse(res, "Cannot book for past dates", 400);
                return;
            }
            if (requestedDate > maxDate) {
                errorResponse(res, `Booking available only up to ${settings.maxAdvanceBookingDays || 30} days in advance`, 400);
                return;
            }

            // ── Day-of-week check ──
            const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const dayName = DAYS[requestedDate.getDay()];
            const bookableDays = settings.bookableDays ||
                ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

            if (!bookableDays.includes(dayName)) {
                console.log(`[Booking Slots] Day blocked: ${dayName} not in`, bookableDays);
                successResponse(res, {
                    available: true,
                    dayBlocked: true,
                    reason: `Bookings not available on ${dayName}`,
                    slots: [],
                });
                return;
            }

            // ── Dynamic Slot Generation ──
            const startTime = settings.bookableTimeStart || "12:00";
            const endTime = settings.bookableTimeEnd || "23:00";
            const slotDuration = settings.slotDurationMinutes || 30;

            console.log(`[Booking Slots] Generating from ${startTime} to ${endTime} (Duration: ${slotDuration})`);

            const [startH, startM] = startTime.split(":").map(Number);
            const [endH, endM] = endTime.split(":").map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            // Determine meal period cover limits
            const coversPerSlot = settings.coversPerSlot || { lunch: 20, afternoon: 12, dinner: 30 };

            // ── Fetch active yield rules for this restaurant on this day ──
            const now = getKarachiNow();
            const yieldRules = await YieldRule.find({
                restaurantId,
                isActive: true,
                validFrom: { $lte: requestedDate },
                validTo: { $gte: requestedDate },
                daysOfWeek: dayName,
            })
                .sort({ priority: -1 })
                .lean() as any[];

            // ── Generate slots ──
            // Parse local PKT time rigorously to prevent UTC offset bugs
            const reqDateStr = dateStr;
            const isToday = reqDateStr === getKarachiDateString(now);

            // Local current time in minutes for "isToday" filtering
            const currentTotalMins = now.getHours() * 60 + now.getMinutes();

            const slots: any[] = [];

            for (let mins = startMinutes; mins < endMinutes; mins += slotDuration) {
                const hour = Math.floor(mins / 60);
                const minute = mins % 60;
                const timeSlot = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

                // Skip past slots if today (Adding 30 min buffer so users can't book a slot that just started)
                if (isToday) {
                    if (mins <= currentTotalMins + 15) {
                        continue;
                    }
                }

                // ── Determine meal period for cover capacity ──
                let maxCovers: number;
                if (hour < 15) {
                    maxCovers = coversPerSlot.lunch || 20;
                } else if (hour < 18) {
                    maxCovers = coversPerSlot.afternoon || 12;
                } else {
                    maxCovers = coversPerSlot.dinner || 30;
                }

                // ── Match yield rules for discount ──
                let discountPercent = 0;
                let matchedRuleName = "";
                for (const rule of yieldRules) {
                    const [rStartH, rStartM] = rule.timeSlotStart.split(":").map(Number);
                    const [rEndH, rEndM] = rule.timeSlotEnd.split(":").map(Number);
                    const ruleStart = rStartH * 60 + rStartM;
                    const ruleEnd = rEndH * 60 + rEndM;

                    if (mins >= ruleStart && mins < ruleEnd) {
                        discountPercent = rule.discountPercent;
                        matchedRuleName = rule.name;
                        break; // Highest priority rule wins (already sorted)
                    }
                }

                const isAvailable = maxCovers >= pax;

                slots.push({
                    timeSlot,
                    discountPercent,
                    dealName: matchedRuleName || null,
                    availableCovers: maxCovers,
                    isAvailable,
                    isLimited: maxCovers > 0 && maxCovers <= 4,
                    maxCovers,
                    mealPeriod: hour < 15 ? "lunch" : hour < 18 ? "afternoon" : "dinner",
                });
            }

            // ── Best deal (highest discount available) ──
            const availableSlots = slots.filter(s => s.isAvailable);
            const bestDeal = availableSlots.length > 0
                ? availableSlots.reduce((best, s) =>
                    s.discountPercent > best.discountPercent ? s : best
                )
                : null;

            // ── Bank deals (restaurant-level) ──
            const bankDeals = await Deal.find({
                restaurantId,
                isActive: true,
                $or: [
                    { validTo: { $exists: false } },
                    { validTo: null },
                    { validTo: { $gte: new Date() } },
                ],
            })
                .populate("bankId", "name logoUrl color slug")
                .select("bankId cardTypes discountPercent maxDiscountCapPaisa minSpendPaisa daysValid applicableOn description")
                .lean();

            // Filter deals valid for the requested day
            const dayFilteredDeals = (bankDeals as any[]).filter((deal: any) => {
                if (!deal.daysValid || deal.daysValid.length === 0) return true;
                return deal.daysValid.includes(dayName);
            });

            successResponse(res, {
                available: true,
                restaurant: {
                    name: rest.name,
                    brandName: rest.brandName,
                    branchName: rest.branchName,
                },
                settings: {
                    slotDuration: settings.slotDurationMinutes || 30,
                    minPartySize: settings.minPartySize || 1,
                    maxPartySize: settings.maxPartySize || 10,
                    cancellationWindow: settings.cancellationWindowMinutes || 360,
                    maxDiscountCap: settings.maxDiscountCap || 50,
                    isPrimePartner: settings.isPrimePartner || false,
                    minimumBillForDiscount: settings.minimumBillForDiscountPaisa || 150000,
                },
                date: dateStr,
                day: dayName,
                pax,
                totalSlots: slots.length,
                availableSlots: availableSlots.length,
                slotsWithDiscount: slots.filter(s => s.discountPercent > 0).length,
                slots,
                bestDeal: bestDeal
                    ? { timeSlot: bestDeal.timeSlot, discountPercent: bestDeal.discountPercent, dealName: bestDeal.dealName }
                    : null,
                bankDeals: dayFilteredDeals.map((deal: any) => ({
                    _id: deal._id,
                    bankName: deal.bankId?.name || "General Deal",
                    bankLogo: deal.bankId?.logoUrl || "",
                    bankColor: deal.bankId?.color || "#1a1a1a",
                    cardTypes: deal.cardTypes || [],
                    discountPercent: deal.discountPercent,
                    maxDiscount: deal.maxDiscountCapPaisa,
                    minSpend: deal.minSpendPaisa,
                    applicableOn: deal.applicableOn,
                    description: deal.description,
                })),
            });
        } catch (err) {
            console.error("Booking slots error:", err);
            errorResponse(res, "Failed to fetch booking slots", 500);
        }
    }
);

export default router;
