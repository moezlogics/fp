import { TableInventory } from "../models/TableInventory";
import { Restaurant } from "../models/Restaurant";
import mongoose from "mongoose";

/**
 * SurgeEngine — Dynamic Yield Pricing
 *
 * Core Formula:
 *   effectiveDiscount = baseDiscount × (1 − occupancyRatio × surgeIntensity)
 *
 * Example (surgeIntensity = 0.8):
 *   0% occupancy  → effectiveDiscount = 50% × (1 − 0 × 0.8)  = 50%
 *   50% occupancy → effectiveDiscount = 50% × (1 − 0.5 × 0.8) = 30%
 *   90% occupancy → effectiveDiscount = 50% × (1 − 0.9 × 0.8) = 14%
 *   100% occupancy→ effectiveDiscount = 50% × (1 − 1.0 × 0.8) = 10%
 *
 * The restaurant's base discount (from YieldRule) is NEVER exceeded.
 * Surge only REDUCES the discount when demand is high,
 * increasing the restaurant's per-cover revenue.
 *
 * Design Principles:
 * - Restaurant opts in via `surgeEnabled` flag
 * - `surgeIntensity` (0.0–1.0) controls aggressiveness
 * - Manual overrides (`isManualOverride`) are NEVER touched
 * - Minimum floor of 5% discount is maintained to keep the "deal" badge visible
 */

export interface SurgeResult {
    slotId: string;
    restaurantId: string;
    date: Date;
    timeSlot: string;
    baseDiscount: number;
    occupancyPercent: number;
    surgeMultiplier: number;
    effectiveDiscount: number;
    wasSurged: boolean;
}

export class SurgeEngine {
    /**
     * Minimum discount floor. Even under 100% occupancy, we keep
     * at least 5% so the slot still shows as "discounted" in the UI.
     */
    private static readonly MIN_DISCOUNT_FLOOR = 5;

    /**
     * Recalculates surge-adjusted discounts for ALL surge-enabled restaurants.
     * Called by the CRON service every 15 minutes.
     */
    static async recalculateAll(): Promise<{ processed: number; surged: number }> {
        // Find all surge-enabled restaurants
        const restaurants = await Restaurant.find({
            surgeEnabled: true,
            isActive: true,
            isApproved: true,
        })
            .select("_id surgeIntensity")
            .lean();

        let processed = 0;
        let surged = 0;

        for (const restaurant of restaurants) {
            const results = await SurgeEngine.recalculateForRestaurant(
                (restaurant._id as any).toString(),
                (restaurant as any).surgeIntensity ?? 0.8
            );
            processed += results.length;
            surged += results.filter((r) => r.wasSurged).length;
        }

        return { processed, surged };
    }

    /**
     * Recalculates surge for a single restaurant's upcoming slots (today + tomorrow).
     */
    static async recalculateForRestaurant(
        restaurantId: string,
        surgeIntensity: number
    ): Promise<SurgeResult[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

        // Fetch all non-manually-overridden slots for today and tomorrow
        const slots = await TableInventory.find({
            restaurantId: new mongoose.Types.ObjectId(restaurantId),
            date: { $gte: today, $lt: dayAfterTomorrow },
            isManualOverride: false,
            isBlocked: false,
        });

        const results: SurgeResult[] = [];

        const bulkOps: any[] = [];
        for (const slot of slots) {
            const maxCovers = slot.maxCovers || 1;
            const usedCovers = slot.bookedCovers + slot.heldCovers;
            const occupancyRatio = Math.min(usedCovers / maxCovers, 1.0);
            const occupancyPercent = Math.round(occupancyRatio * 100);

            const surgeMultiplier = 1 - occupancyRatio * surgeIntensity;
            // Compute from the STABLE base, not the (possibly already-surged)
            // discountPercent — otherwise each run re-surges its own output and
            // the discount ratchets down to the floor and never recovers.
            const baseDiscount = (slot as any).baseDiscountPercent ?? slot.discountPercent;
            let effectiveDiscount = Math.round(baseDiscount * surgeMultiplier);

            if (baseDiscount > 0 && effectiveDiscount < SurgeEngine.MIN_DISCOUNT_FLOOR) {
                effectiveDiscount = SurgeEngine.MIN_DISCOUNT_FLOOR;
            }

            const wasSurged = effectiveDiscount !== baseDiscount;
            // Write when the effective value changed OR the base hasn't been
            // recorded yet. Persisting the base makes surge idempotent and lets
            // the discount recover toward base when occupancy drops.
            const needsWrite =
                effectiveDiscount !== slot.discountPercent ||
                (slot as any).baseDiscountPercent == null;

            if (needsWrite) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: slot._id },
                        update: { $set: { discountPercent: effectiveDiscount, baseDiscountPercent: baseDiscount } }
                    }
                });
            }

            results.push({
                slotId: slot._id.toString(),
                restaurantId,
                date: slot.date,
                timeSlot: slot.timeSlot,
                baseDiscount,
                occupancyPercent,
                surgeMultiplier: parseFloat(surgeMultiplier.toFixed(3)),
                effectiveDiscount,
                wasSurged,
            });
        }

        if (bulkOps.length > 0) {
            await TableInventory.bulkWrite(bulkOps, { ordered: false });
        }

        return results;
    }

    /**
     * Returns live surge info for a specific restaurant (for frontend display).
     */
    static async getLiveSurgeInfo(
        restaurantId: string
    ): Promise<{ slots: SurgeResult[]; avgOccupancy: number; isSurging: boolean }> {
        const restaurant = await Restaurant.findById(restaurantId)
            .select("surgeEnabled surgeIntensity")
            .lean();

        if (!restaurant || !(restaurant as any).surgeEnabled) {
            return { slots: [], avgOccupancy: 0, isSurging: false };
        }

        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const slots = await TableInventory.find({
            restaurantId: new mongoose.Types.ObjectId(restaurantId),
            date: { $gte: today, $lt: tomorrow },
            isBlocked: false,
        }).lean();

        if (slots.length === 0) {
            return { slots: [], avgOccupancy: 0, isSurging: false };
        }

        const surgeIntensity = (restaurant as any).surgeIntensity ?? 0.8;
        const results: SurgeResult[] = [];
        let totalOccupancy = 0;

        for (const slot of slots) {
            const maxCovers = slot.maxCovers || 1;
            const usedCovers = slot.bookedCovers + slot.heldCovers;
            const occupancyRatio = Math.min(usedCovers / maxCovers, 1.0);
            const occupancyPercent = Math.round(occupancyRatio * 100);
            const surgeMultiplier = 1 - occupancyRatio * surgeIntensity;
            const baseDiscount = (slot as any).baseDiscountPercent ?? slot.discountPercent;
            let effectiveDiscount = Math.round(baseDiscount * surgeMultiplier);
            if (baseDiscount > 0 && effectiveDiscount < SurgeEngine.MIN_DISCOUNT_FLOOR) {
                effectiveDiscount = SurgeEngine.MIN_DISCOUNT_FLOOR;
            }

            totalOccupancy += occupancyPercent;

            results.push({
                slotId: (slot._id as any).toString(),
                restaurantId,
                date: slot.date,
                timeSlot: slot.timeSlot,
                baseDiscount,
                occupancyPercent,
                surgeMultiplier: parseFloat(surgeMultiplier.toFixed(3)),
                effectiveDiscount,
                wasSurged: effectiveDiscount !== baseDiscount,
            });
        }

        const avgOccupancy = Math.round(totalOccupancy / slots.length);
        const isSurging = results.some((r) => r.wasSurged);

        return { slots: results, avgOccupancy, isSurging };
    }
}
