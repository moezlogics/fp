// eslint-disable-next-line @typescript-eslint/no-var-requires
const cron = require("node-cron");
import { MerchantWallet } from "../models/MerchantWallet";
import { BillSubmission } from "../models/BillSubmission";
import { Transaction } from "../models/Transaction";
import { WalletLedger } from "../models/WalletLedger";
import { Settlement } from "../models/Settlement";
import { CommissionProfile } from "../models/CommissionProfile";
import { Reservation } from "../models/Reservation";
import { Restaurant } from "../models/Restaurant";
import { Subscription } from "../models/Subscription";
import { User } from "../models/User";
import { RestaurantSubscription } from "../models/RestaurantSubscription";
import { syncRestaurantSubscriptionState } from "./restaurant-subscription-service";

/**
 * Foodies Pakistan — Automated CRON Jobs
 *
 * These jobs run on schedule to maintain financial integrity:
 * 1. clearPendingFunds — Daily 6am: Move T+2 cleared funds to available
 * 2. expireFoodiePayBills — Hourly: Mark expired unpaid FoodiePay bills
 * 3. generateWeeklySettlements — Sunday midnight: Auto-generate weekly settlements
 * 4. expireOldHeldReservations — Every 5 min: Release expired held slots
 */

export function initCronJobs(): void {
    console.log("[CRON] Initializing scheduled jobs...");

    /**
     * 1. Clear Pending Funds → Available (Daily 6:00 AM)
     *    Moves pendingClearancePaisa → availableBalancePaisa
     *    for transactions completed more than 2 days ago.
     */
    cron.schedule("0 6 * * *", async () => {
        console.log("[CRON] Running clearPendingFunds...");
        try {
            const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

            const uncleared = await Transaction.find({
                status: "SUCCESS",
                cleared: { $ne: true },
                createdAt: { $lt: twoDaysAgo },
            }).lean();

            if (uncleared.length === 0) return;

            const walletOps: any[] = [];
            const transactionIds: any[] = [];

            for (const txn of uncleared) {
                const netAmount = (txn as any).netMerchantPaisa || 0;
                if (netAmount <= 0) continue;

                walletOps.push({
                    updateOne: {
                        filter: {
                            merchantId: (txn as any).merchantId,
                            pendingClearancePaisa: { $gte: netAmount },
                        },
                        update: {
                            $inc: {
                                pendingClearancePaisa: -netAmount,
                                availableBalancePaisa: netAmount,
                            },
                        },
                    }
                });
                transactionIds.push(txn._id);
            }

            if (walletOps.length > 0) {
                const result = await MerchantWallet.bulkWrite(walletOps, { ordered: false });
                if (result.modifiedCount > 0) {
                    await Transaction.updateMany(
                        { _id: { $in: transactionIds } },
                        { $set: { cleared: true } }
                    );
                }
                console.log(`[CRON] Cleared ${result.modifiedCount} transactions to available balance`);
            }
        } catch (err) {
            console.error("[CRON] clearPendingFunds error:", err);
        }
    });

    /**
     * 2. Expire FoodiePay Bills (Every hour)
     *    Marks FoodiePay bills as Expired if unpaid after 24h.
     */
    cron.schedule("0 * * * *", async () => {
        console.log("[CRON] Running expireFoodiePayBills...");
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const result = await BillSubmission.updateMany(
                {
                    paymentMode: "FoodiePay",
                    status: "PendingPayment",
                    createdAt: { $lt: twentyFourHoursAgo },
                },
                { $set: { status: "Expired" } }
            );

            if (result.modifiedCount > 0) {
                console.log(`[CRON] Expired ${result.modifiedCount} FoodiePay bills`);
            }
        } catch (err) {
            console.error("[CRON] expireFoodiePayBills error:", err);
        }
    });

    /**
     * 3. Generate Weekly Settlements (Sunday midnight)
     *    Creates settlement records for each restaurant with completed bookings.
     */
    cron.schedule("0 0 * * 0", async () => {
        console.log("[CRON] Running generateWeeklySettlements...");
        try {
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setHours(0, 0, 0, 0);
            const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

            // Find all restaurants with completed reservations in this period
            const completedReservations = await Reservation.aggregate([
                {
                    $match: {
                        status: "Completed",
                        completedAt: { $gte: periodStart, $lt: periodEnd },
                    },
                },
                {
                    $group: {
                        _id: "$restaurantId",
                        totalBookings: { $sum: 1 },
                        totalBillAmount: { $sum: { $ifNull: ["$billAmountPaisa", 0] } },
                    },
                },
            ]);

            if (completedReservations.length === 0) return;

            const restaurantIds = completedReservations.map(r => r._id);

            // ── Batch Fetch: Commission Profiles (N+1 Resolution) ──
            const profiles = await CommissionProfile.find({
                restaurantId: { $in: restaurantIds },
                effectiveFrom: { $lte: now },
                $or: [{ effectiveTo: null }, { effectiveTo: { $gt: now } }],
            }).sort({ effectiveFrom: -1 }).lean();

            // ── Batch Fetch: Restaurant Settings (isPrimePartner) ──
            const restauratSettings = await Restaurant.find({
                _id: { $in: restaurantIds }
            }).select("bookingSettings.isPrimePartner").lean();

            // Map for O(1) lookup
            const profileMap = new Map();
            profiles.forEach(p => {
                if (!profileMap.has(p.restaurantId.toString())) {
                    profileMap.set(p.restaurantId.toString(), p);
                }
            });

            const settingsMap = new Map();
            restauratSettings.forEach((r: any) => settingsMap.set(r._id.toString(), r));

            let settlementsCreated = 0;
            for (const entry of completedReservations) {
                const restIdStr = entry._id.toString();

                const exists = await Settlement.findOne({
                    restaurantId: entry._id,
                    periodStart,
                    periodEnd,
                });
                if (exists) continue;

                const cp = profileMap.get(restIdStr);
                const rest = settingsMap.get(restIdStr);

                const isPrime = rest?.bookingSettings?.isPrimePartner || false;
                const commissionRate = isPrime ? 0 : (cp?.commissionRate ?? 0.03);

                const totalGrossRevenue = entry.totalBillAmount;
                const totalCommission = Math.round(totalGrossRevenue * commissionRate);
                const netPayable = totalGrossRevenue - totalCommission;

                await Settlement.create({
                    restaurantId: entry._id,
                    periodStart,
                    periodEnd,
                    totalBookings: entry.totalBookings,
                    totalGrossRevenue,
                    totalCommission,
                    commissionRate,
                    netPayable,
                    status: "Pending",
                });
                settlementsCreated++;
            }

            console.log(`[CRON] Generated ${settlementsCreated} weekly settlements`);
        } catch (err) {
            console.error("[CRON] generateWeeklySettlements error:", err);
        }
    });

    /**
     * 4. Release Expired Held Reservations (Every 5 minutes)
     *    Frees up TableInventory capacity for draft reservations past lockExpiresAt.
     */
    cron.schedule("*/5 * * * *", async () => {
        try {
            console.log("[CRON] Running releaseExpiredHolds...");
            const { TableInventory } = await import("../models/TableInventory");
            const now = new Date();
            
            const expired = await Reservation.find({
                status: "Draft",
                lockExpiresAt: { $lt: now },
            }).lean();

            if (expired.length === 0) return;

            const inventoryOps: any[] = [];
            const reservationIds: any[] = [];

            for (const res of expired) {
                reservationIds.push(res._id);
                inventoryOps.push({
                    updateOne: {
                        filter: {
                            restaurantId: res.restaurantId,
                            date: res.date,
                            timeSlot: res.timeSlot
                        },
                        update: { $inc: { heldCovers: -res.pax } }
                    }
                });
            }

            // Perform updates in bulk
            if (inventoryOps.length > 0) {
                await Promise.all([
                    Reservation.updateMany(
                        { _id: { $in: reservationIds } },
                        { 
                            $set: { 
                                status: "CancelledByUser", 
                                cancelReason: "Lock Expired (CRON)" 
                            } 
                        }
                    ),
                    TableInventory.bulkWrite(inventoryOps, { ordered: false })
                ]);
            }

            console.log(`[CRON] Released ${expired.length} expired held reservations`);
        } catch (err) {
            console.error("[CRON] releaseExpiredHolds error:", err);
        }
    });

    /**
     * 5. Expire Prime subscriptions (Hourly)
     *    Clears memberships exactly when validity ends.
     */
    cron.schedule("5 * * * *", async () => {
        try {
            const now = new Date();
            const expiredSubs = await Subscription.find({
                status: { $in: ["Active", "Cancelled"] },
                validTo: { $lte: now },
            }).select("_id userId");

            if (expiredSubs.length > 0) {
                await Subscription.updateMany(
                    { _id: { $in: expiredSubs.map((sub) => sub._id) } },
                    { $set: { status: "Expired", autoRenew: false } }
                );

                await User.updateMany(
                    { _id: { $in: expiredSubs.map((sub) => sub.userId) } },
                    { $set: { isPrime: false }, $unset: { primeValidTo: 1 } }
                );
            }

            await User.updateMany(
                {
                    isPrime: true,
                    primeValidTo: { $lte: now },
                },
                { $set: { isPrime: false }, $unset: { primeValidTo: 1 } }
            );

            if (expiredSubs.length > 0) {
                console.log(`[CRON] Expired ${expiredSubs.length} Prime subscriptions`);
            }
        } catch (err) {
            console.error("[CRON] expirePrimeSubscriptions error:", err);
        }
    });

    /**
     * 6. Expire owner branch subscriptions (hourly)
     *    Ensures paid branch benefits are removed exactly at expiry.
     */
    cron.schedule("10 * * * *", async () => {
        try {
            const now = new Date();
            const expiring = await RestaurantSubscription.find({
                status: { $in: ["Active", "Cancelled"] },
                validTo: { $lte: now },
            }).select("_id restaurantId");

            if (expiring.length > 0) {
                await RestaurantSubscription.updateMany(
                    { _id: { $in: expiring.map((sub) => sub._id) } },
                    { $set: { status: "Expired" } }
                );

                for (const sub of expiring) {
                    await syncRestaurantSubscriptionState(sub.restaurantId.toString());
                }

                console.log(`[CRON] Expired ${expiring.length} branch subscriptions`);
            }
        } catch (err) {
            console.error("[CRON] expireRestaurantSubscriptions error:", err);
        }
    });

    /**
     * 7. Clean up expired story media from CDN (Every hour)
     *    MongoDB TTL auto-deletes the documents, but CDN files need cleanup.
     *    We find stories expiring in the next 5 min and delete their CDN media.
     */
    cron.schedule("15 * * * *", async () => {
        try {
            const { Story } = await import("../models/Story");
            const { cdnClient } = await import("./cdn-client");
            const now = new Date();
            const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000);

            // Find stories that expired or will expire in 5 minutes
            const expiring = await Story.find({
                expiresAt: { $lte: fiveMinFromNow },
            }).select("mediaUrl thumbnailUrl").lean();

            if (expiring.length === 0) return;

            let cleaned = 0;
            for (const story of expiring) {
                try {
                    if ((story as any).mediaUrl) {
                        await cdnClient.deleteImage((story as any).mediaUrl);
                        cleaned++;
                    }
                } catch {
                    // Non-critical — CDN may not support delete
                }
            }

            // Delete documents that already expired (redundant with TTL, but ensures cleanup)
            await Story.deleteMany({ expiresAt: { $lte: now } });

            if (cleaned > 0) {
                console.log(`[CRON] Cleaned ${cleaned} expired story media files`);
            }
        } catch (err) {
            console.error("[CRON] Story cleanup error:", err);
        }
    });

    console.log("[CRON] All scheduled jobs initialized ✓");
}
