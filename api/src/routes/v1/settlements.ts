import { Router, Request, Response } from "express";
import { Settlement } from "../../models/Settlement";
import { Restaurant } from "../../models/Restaurant";
import { User } from "../../models/User";
import { CommissionProfile } from "../../models/CommissionProfile";
import { Reservation } from "../../models/Reservation";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";
import { redis } from "../../config/redis";

const router = Router();

/**
 * GET /api/v1/settlements — View all settlements across all restaurants.
 * Protected: admin
 */
router.get(
    "/",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const status = req.query.status as string;

            const filter: any = {};
            if (status && ["Pending", "Paid"].includes(status)) {
                filter.status = status;
            }

            const settlements = await Settlement.find(filter)
                .populate("restaurantId", "name brandName branchName city")
                .sort({ periodStart: -1 })
                .limit(100)
                .lean();

            // Platform-wide summary
            const allSettlements = await Settlement.aggregate([
                {
                    $group: {
                        _id: null,
                        totalGMV: { $sum: "$totalGrossRevenue" },
                        totalCommission: { $sum: "$totalCommission" },
                        totalPayable: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "Pending"] }, "$netPayable", 0],
                            },
                        },
                        totalPaid: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "Paid"] }, "$netPayable", 0],
                            },
                        },
                    },
                },
            ]);

            successResponse(res, {
                settlements,
                platform: allSettlements.length ? allSettlements[0] : { totalGMV: 0, totalCommission: 0, totalPayable: 0, totalPaid: 0 },
            });
        } catch (err) {
            errorResponse(res, "Internal server error", 500);
        }
    }
);

/**
 * POST /api/v1/settlements — Generate weekly settlements for all restaurants.
 * Protected: admin
 */
router.post(
    "/",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        const lockKey = "settlement_gen_lock";
        const lockAcquired = await redis.set(lockKey, "1", "EX", 120, "NX");
        if (!lockAcquired) {
            errorResponse(res, "Settlement generation already in progress. Please wait.", 409);
            return;
        }

        try {
            // Calculate the last week: Monday to Sunday
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
            const periodEnd = new Date(now);
            periodEnd.setDate(now.getDate() - (dayOfWeek === 0 ? 0 : dayOfWeek)); // last Sunday
            periodEnd.setHours(23, 59, 59, 999);

            const periodStart = new Date(periodEnd);
            periodStart.setDate(periodEnd.getDate() - 6); // Monday
            periodStart.setHours(0, 0, 0, 0);

            const restaurants = await Restaurant.find({ isApproved: true, isActive: true })
                .select("_id bookingSettings.isPrimePartner")
                .lean();

            let generated = 0;
            for (const rest of restaurants as any[]) {
                // Check if settlement already exists for this period
                const existing = await Settlement.findOne({
                    restaurantId: rest._id,
                    periodStart,
                    periodEnd,
                });
                if (existing) continue;

                // Get completed reservations for this restaurant in this period
                const completedReservations = await Reservation.find({
                    restaurantId: rest._id,
                    status: "Completed",
                    completedAt: { $gte: periodStart, $lte: periodEnd },
                }).lean();

                if (completedReservations.length === 0) continue;

                // Calculate financials
                const totalBookings = completedReservations.length;
                const totalPax = completedReservations.reduce((s: number, r: any) => s + r.pax, 0);
                const totalGrossRevenue = completedReservations.reduce(
                    (s: number, r: any) => s + (r.estimatedBillAfterDiscount || 0),
                    0
                );
                const totalCoinRedemptions = completedReservations.reduce(
                    (s: number, r: any) => s + (r.appliedCoinsDiscount || 0),
                    0
                );

                // Get commission rate for this restaurant
                const commissionProfile = await CommissionProfile.findOne({
                    restaurantId: rest._id,
                    effectiveFrom: { $lte: periodEnd },
                    $or: [
                        { effectiveTo: null },
                        { effectiveTo: { $gte: periodStart } },
                    ],
                })
                    .sort({ effectiveFrom: -1 })
                    .lean();

                const isPrimePartner = Boolean((rest as any).bookingSettings?.isPrimePartner);
                const commissionRate = isPrimePartner
                    ? 0
                    : commissionProfile
                        ? (commissionProfile as any).commissionRate
                        : 0.03; // default 3%

                const totalCommission = Math.round(totalGrossRevenue * commissionRate);
                const netPayable = totalGrossRevenue - totalCommission;

                await Settlement.create({
                    restaurantId: rest._id,
                    periodStart,
                    periodEnd,
                    totalBookings,
                    totalPax,
                    totalGrossRevenue,
                    totalCommission,
                    totalCoinRedemptions,
                    totalBankPromosCost: 0,
                    netPayable,
                    commissionRate,
                    status: "Pending",
                });

                generated++;
            }

            successResponse(res, {
                message: `Generated ${generated} settlements for period ${periodStart.toISOString().split("T")[0]} to ${periodEnd.toISOString().split("T")[0]}`,
                generated,
            });
        } catch (err: any) {
            console.error("Settlement generation error:", err);
            errorResponse(res, "Internal server error", 500);
        } finally {
            await redis.del(lockKey);
        }
    }
);

/**
 * PUT /api/v1/settlements — Mark a settlement as paid.
 * Protected: admin
 */
router.put(
    "/",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const { settlementId, paymentRef, notes } = req.body;
            if (!settlementId) {
                errorResponse(res, "settlementId required", 400);
                return;
            }

            const settlement = await Settlement.findByIdAndUpdate(
                settlementId,
                {
                    status: "Paid",
                    paymentRef: paymentRef || "",
                    paidAt: new Date(),
                    notes: notes || "",
                },
                { new: true }
            );

            if (!settlement) {
                errorResponse(res, "Settlement not found", 404);
                return;
            }

            successResponse(res, { message: "Settlement marked as paid", settlement });
        } catch (err) {
            errorResponse(res, "Internal server error", 500);
        }
    }
);
/**
 * GET /api/v1/settlements/restaurant/:restaurantId
 * Protected: admin, owner
 */
router.get(
    "/restaurant/:restaurantId",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const { restaurantId } = req.params;

            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Restaurant not found or not yours", 403);
                    return;
                }
            }

            const settlements = await Settlement.find({ restaurantId })
                .sort({ periodStart: -1 })
                .lean();

            const totalPaid = settlements
                .filter((s: any) => s.status === "Paid")
                .reduce((sum: number, s: any) => sum + s.netPayable, 0);

            const totalPending = settlements
                .filter((s: any) => s.status === "Pending")
                .reduce((sum: number, s: any) => sum + s.netPayable, 0);

            successResponse(res, {
                settlements,
                summary: { totalPaid, totalPending },
            });
        } catch (err) {
            errorResponse(res, "Failed to fetch settlements", 500);
        }
    }
);

export default router;
