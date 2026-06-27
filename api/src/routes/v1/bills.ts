import { Router, Request, Response } from "express";
import { BillSubmission } from "../../models/BillSubmission";
import { Reservation } from "../../models/Reservation";
import { Restaurant } from "../../models/Restaurant";
import { CheckoutEngine } from "../../services/payment/checkout-engine";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * POST /api/v1/bills/submit
 * Protected: owner, admin
 *
 * Owner submits the food bill after a guest has dined.
 * This creates a BillSubmission record and triggers FoodiePay or Cash flow.
 */
router.post(
    "/submit",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const {
                reservationId,
                originalBillPaisa,
                paymentMode, // "FoodiePay" or "AtRestaurant"
                billReceiptUrl,
                cashPaidPaisa,
                bankDealAppliedOffline,
                bankNameOffline,
            } = req.body;

            if (!reservationId || !originalBillPaisa || !paymentMode) {
                errorResponse(res, "reservationId, originalBillPaisa, and paymentMode required", 400);
                return;
            }

            if (!["FoodiePay", "AtRestaurant"].includes(paymentMode)) {
                errorResponse(res, "paymentMode must be FoodiePay or AtRestaurant", 400);
                return;
            }

            // Fetch reservation and verify ownership
            const reservation = await Reservation.findById(reservationId);
            if (!reservation) {
                errorResponse(res, "Reservation not found", 404);
                return;
            }

            // Only Seated reservations can have bills submitted
            if (reservation.status !== "Seated") {
                errorResponse(res, "Bill can only be submitted for Seated reservations", 400);
                return;
            }

            // Ownership check
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({
                    _id: reservation.restaurantId,
                    ownerId: req.user!.id,
                });
                if (!rest) {
                    errorResponse(res, "Not your restaurant", 403);
                    return;
                }
            }

            // Check if bill already submitted for this reservation
            const existingBill = await BillSubmission.findOne({ reservationId });
            if (existingBill) {
                errorResponse(res, "Bill already submitted for this reservation", 409);
                return;
            }

            // Fetch restaurant for platform fee calculation
            const restaurant = await Restaurant.findById(reservation.restaurantId).lean() as any;
            const feeRate = restaurant?.platformFeeRate || 3.0;
            const isPrimePartner = restaurant?.bookingSettings?.isPrimePartner || false;
            const platformFeePaisa = Math.floor(originalBillPaisa * (feeRate / 100));
            const effectiveFee = isPrimePartner ? 0 : platformFeePaisa;

            if (paymentMode === "FoodiePay") {
                // ── FoodiePay Flow ──
                // Calculate the discount breakdown using checkout engine
                const yieldDiscount = reservation.appliedYieldDiscount || 0;

                const breakdown = await CheckoutEngine.calculateBill({
                    userId: reservation.userId.toString(),
                    restaurantId: reservation.restaurantId.toString(),
                    originalBillPaisa,
                    yieldDiscountPercent: yieldDiscount,
                });

                const bill = await BillSubmission.create({
                    reservationId,
                    restaurantId: reservation.restaurantId,
                    userId: reservation.userId,
                    originalBillPaisa,
                    paymentMode: "FoodiePay",
                    billReceiptUrl: billReceiptUrl || "",
                    status: "Pending", // Awaiting user payment
                    yieldDiscountPaisa: breakdown.yieldDiscountPaisa,
                    primeDiscountPaisa: breakdown.subscriptionDiscountPaisa,
                    bankDiscountPaisa: 0, // Applied when user selects bank at checkout
                    coinsDiscountPaisa: 0, // Applied when user chooses at checkout
                    totalDiscountPaisa: breakdown.yieldDiscountPaisa + breakdown.subscriptionDiscountPaisa,
                    finalAmountPaisa: originalBillPaisa - breakdown.yieldDiscountPaisa - breakdown.subscriptionDiscountPaisa,
                    platformFeePaisa: effectiveFee,
                    platformFeeCollected: false,
                    submittedAt: new Date(),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hour payment window
                });

                // Update reservation
                reservation.paymentMode = "FoodiePay";
                reservation.billSubmittedAt = new Date();
                reservation.billAmountPaisa = originalBillPaisa;
                await reservation.save();

                // Send email notification to user
                try {
                    const User = (await import("../../models/User")).User;
                    const user = await User.findById(reservation.userId).select("email").lean() as any;
                    if (user?.email) {
                        const { sendBillNotification } = await import("../../services/email-service");
                        const siteUrl = process.env.SITE_URL || "https://foodiespakistan.pk";
                        await sendBillNotification(user.email, {
                            restaurantName: restaurant?.name || "Restaurant",
                            originalBillRs: (originalBillPaisa / 100).toFixed(0),
                            discountRs: ((breakdown.yieldDiscountPaisa + breakdown.subscriptionDiscountPaisa) / 100).toFixed(0),
                            finalAmountRs: ((originalBillPaisa - breakdown.yieldDiscountPaisa - breakdown.subscriptionDiscountPaisa) / 100).toFixed(0),
                            payLink: `${siteUrl}/foodiepay?billId=${bill._id}`,
                            expiresIn: "24 hours",
                        });
                    }
                } catch (emailErr) {
                    console.error("Failed to send bill notification email:", emailErr);
                    // Don't fail the bill submission if email fails
                }

                successResponse(res, {
                    message: "Bill submitted. User has been notified to pay via FoodiePay.",
                    bill,
                    breakdown,
                    payLink: `${process.env.SITE_URL || "https://foodiespakistan.pk"}/foodiepay?billId=${bill._id}`,
                }, 201);

            } else {
                // ── Cash at Restaurant Flow ──
                const yieldDiscount = reservation.appliedYieldDiscount || 0;
                const yieldDiscountPaisa = Math.floor(originalBillPaisa * (yieldDiscount / 100));

                // Check MDC cap for cash (only yield + possibly prime)
                const maxDiscountCap = restaurant?.bookingSettings?.maxDiscountCap || 50;
                const maxDiscountPaisa = Math.floor(originalBillPaisa * (maxDiscountCap / 100));
                const cappedYieldDiscount = Math.min(yieldDiscountPaisa, maxDiscountPaisa);

                const bill = await BillSubmission.create({
                    reservationId,
                    restaurantId: reservation.restaurantId,
                    userId: reservation.userId,
                    originalBillPaisa,
                    paymentMode: "AtRestaurant",
                    billReceiptUrl: billReceiptUrl || "",
                    status: "Paid", // Immediate since cash
                    yieldDiscountPaisa: cappedYieldDiscount,
                    totalDiscountPaisa: cappedYieldDiscount,
                    finalAmountPaisa: originalBillPaisa - cappedYieldDiscount,
                    cashPaidPaisa: cashPaidPaisa || (originalBillPaisa - cappedYieldDiscount),
                    bankDealAppliedOffline: bankDealAppliedOffline || false,
                    bankNameOffline: bankNameOffline || "",
                    platformFeePaisa: effectiveFee,
                    platformFeeCollected: false, // Collected via monthly invoice
                    submittedAt: new Date(),
                    paidAt: new Date(),
                });

                // Update reservation
                reservation.paymentMode = "AtRestaurant";
                reservation.status = "Completed";
                reservation.billSubmittedAt = new Date();
                reservation.billAmountPaisa = originalBillPaisa;
                await reservation.save();

                successResponse(res, {
                    message: "Cash payment recorded. Platform fee added to monthly invoice.",
                    bill,
                    platformFee: isPrimePartner ? "Waived (Prime Partner)" : `Rs. ${(effectiveFee / 100).toFixed(0)}`,
                }, 201);
            }
        } catch (err: any) {
            console.error("Bill submission error:", err);
            errorResponse(res, "Bill submission failed due to an internal error.", 500);
        }
    }
);

/**
 * GET /api/v1/bills/id/:billId
 * Protected: authenticated user (owner sees their restaurant's, user sees their own)
 */
router.get(
    "/id/:billId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const bill = await BillSubmission.findById(req.params.billId)
                .populate("restaurantId", "name brandName branchName")
                .lean();

            if (!bill) {
                errorResponse(res, "Bill not found", 404);
                return;
            }

            const userId = req.user!.id;
            if ((bill as any).userId.toString() !== userId && req.user!.role !== "admin") {
                if (req.user!.role === "owner") {
                    const rest = await Restaurant.findOne({
                        _id: (bill as any).restaurantId._id || (bill as any).restaurantId,
                        ownerId: userId,
                    });
                    if (!rest) {
                        errorResponse(res, "Unauthorized", 403);
                        return;
                    }
                } else {
                    errorResponse(res, "Unauthorized", 403);
                    return;
                }
            }

            successResponse(res, bill);
        } catch (err) {
            errorResponse(res, "Failed to fetch bill", 500);
        }
    }
);

/**
 * GET /api/v1/bills/reservation/:reservationId
 * Protected: authenticated user (owner sees their restaurant's, user sees their own)
 */
router.get(
    "/reservation/:reservationId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { reservationId } = req.params;

            const bill = await BillSubmission.findOne({ reservationId })
                .populate("restaurantId", "name brandName branchName")
                .lean();

            if (!bill) {
                errorResponse(res, "No bill found for this reservation", 404);
                return;
            }

            // Authorization: user can see their own, owner can see their restaurant's
            const userId = req.user!.id;
            if (
                (bill as any).userId.toString() !== userId &&
                req.user!.role !== "admin"
            ) {
                // Check if owner of the restaurant
                if (req.user!.role === "owner") {
                    const rest = await Restaurant.findOne({
                        _id: (bill as any).restaurantId._id || (bill as any).restaurantId,
                        ownerId: userId,
                    });
                    if (!rest) {
                        errorResponse(res, "Unauthorized", 403);
                        return;
                    }
                } else {
                    errorResponse(res, "Unauthorized", 403);
                    return;
                }
            }

            successResponse(res, bill);
        } catch (err) {
            errorResponse(res, "Failed to fetch bill", 500);
        }
    }
);

/**
 * GET /api/v1/bills/restaurant/:restaurantId
 * Protected: owner, admin
 * List all bills for a restaurant (with optional month filter).
 */
router.get(
    "/restaurant/:restaurantId",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const { restaurantId } = req.params;
            const month = req.query.month as string; // "2026-03"
            const page = parseInt(req.query.page as string, 10) || 1;
            const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

            // Ownership check
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({
                    _id: restaurantId,
                    ownerId: req.user!.id,
                });
                if (!rest) {
                    errorResponse(res, "Not your restaurant", 403);
                    return;
                }
            }

            const query: any = { restaurantId };
            if (month) {
                const [year, mon] = month.split("-").map(Number);
                const start = new Date(year, mon - 1, 1);
                const end = new Date(year, mon, 0, 23, 59, 59);
                query.submittedAt = { $gte: start, $lte: end };
            }

            const [bills, total] = await Promise.all([
                BillSubmission.find(query)
                    .sort({ submittedAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .populate("userId", "name phone")
                    .lean(),
                BillSubmission.countDocuments(query),
            ]);

            // Summary aggregation
            const summary = await BillSubmission.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalBills: { $sum: 1 },
                        totalRevenuePaisa: { $sum: "$originalBillPaisa" },
                        totalDiscountsPaisa: { $sum: "$totalDiscountPaisa" },
                        totalPlatformFeePaisa: { $sum: "$platformFeePaisa" },
                        foodiePayCount: { $sum: { $cond: [{ $eq: ["$paymentMode", "FoodiePay"] }, 1, 0] } },
                        cashCount: { $sum: { $cond: [{ $eq: ["$paymentMode", "AtRestaurant"] }, 1, 0] } },
                    },
                },
            ]);

            successResponse(res, {
                bills,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
                summary: summary[0] || {
                    totalBills: 0,
                    totalRevenuePaisa: 0,
                    totalDiscountsPaisa: 0,
                    totalPlatformFeePaisa: 0,
                    foodiePayCount: 0,
                    cashCount: 0,
                },
            });
        } catch (err) {
            errorResponse(res, "Failed to fetch bills", 500);
        }
    }
);

export default router;
