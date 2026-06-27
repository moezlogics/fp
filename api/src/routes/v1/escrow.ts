import { Router, Request, Response } from "express";
import { Transaction } from "../../models/Transaction";
import { BillSubmission } from "../../models/BillSubmission";
import { Reservation } from "../../models/Reservation";
import { Restaurant } from "../../models/Restaurant";
import { MerchantWallet } from "../../models/MerchantWallet";
import { WalletLedger } from "../../models/WalletLedger";
import { PaymentMethod } from "../../models/PaymentMethod";
import { CheckoutEngine } from "../../services/payment/checkout-engine";
import { initiatePayment, chargeTokenizedCard } from "../../services/payment/payfast";
import { authenticate } from "../../middleware/authenticate";
import { successResponse, errorResponse } from "../../utils/api-response";
import { redis } from "../../config/redis";
import crypto from "crypto";

const router = Router();

/**
 * POST /api/v1/escrow/calculate
 * Preview endpoint — returns full discount breakdown WITHOUT creating a transaction.
 * Used for real-time price display in the FoodiePay checkout UI.
 *
 * Body: {
 *   restaurantId: string,
 *   originalBillPaisa: number,
 *   yieldDiscountPercent?: number,
 *   cardBin?: string,
 *   applyCoins?: boolean
 * }
 */
router.post("/calculate", authenticate, async (req: Request, res: Response) => {
    try {
        const {
            billId,
            restaurantId,
            originalBillPaisa,
            yieldDiscountPercent: requestedYieldDiscountPercent,
            cardBin,
            applyCoins,
        } = req.body;
        const userId = req.user!.id;
        let effectiveRestaurantId = restaurantId;
        let effectiveOriginalBillPaisa = originalBillPaisa;
        let effectiveYieldDiscountPercent = Number(requestedYieldDiscountPercent || 0);

        if (billId) {
            const billSubmission = await BillSubmission.findById(billId).lean() as any;
            if (!billSubmission || billSubmission.userId.toString() !== userId) {
                errorResponse(res, "Bill not found or unauthorized.", 404);
                return;
            }

            const reservation = await Reservation.findById(billSubmission.reservationId).lean() as any;
            effectiveRestaurantId = billSubmission.restaurantId.toString();
            effectiveOriginalBillPaisa = billSubmission.originalBillPaisa;
            effectiveYieldDiscountPercent = reservation?.appliedYieldDiscount || 0;
        } else if (!effectiveRestaurantId || !Number.isInteger(effectiveOriginalBillPaisa) || effectiveOriginalBillPaisa <= 0) {
            errorResponse(res, "Provide either billId or restaurantId with originalBillPaisa.", 400);
            return;
        }

        const breakdown = await CheckoutEngine.calculateBill({
            userId,
            restaurantId: effectiveRestaurantId,
            originalBillPaisa: effectiveOriginalBillPaisa,
            yieldDiscountPercent: effectiveYieldDiscountPercent,
            cardBin,
            applyCoins,
        });

        res.json({
            success: true,
            breakdown: {
                originalBillPaisa: breakdown.originalBillPaisa,
                meetsMinimumBill: breakdown.meetsMinimumBill,
                minimumBillPaisa: breakdown.minimumBillPaisa,

                yieldDiscountPercent: breakdown.yieldDiscountPercent,
                yieldDiscountPaisa: breakdown.yieldDiscountPaisa,
                tableDealDiscountPaisa: breakdown.tableDealDiscountPaisa,

                isPrimeUser: breakdown.isPrimeUser,
                subscriptionDiscountPercent: breakdown.subscriptionDiscountPercent,
                subscriptionDiscountPaisa: breakdown.subscriptionDiscountPaisa,

                bankName: breakdown.bankName,
                bankDiscountPercent: breakdown.bankDiscountPercent,
                bankDiscountPaisa: breakdown.bankDiscountPaisa,

                maxEligibleCoins: breakdown.maxEligibleCoins,
                coinsRedeemed: breakdown.coinsRedeemed,
                coinDiscountPaisa: breakdown.coinDiscountPaisa,

                totalDiscountPaisa: breakdown.totalDiscountPaisa,
                totalDiscountPercent: breakdown.totalDiscountPercent,
                wasCapped: breakdown.wasCapped,
                maxDiscountCap: breakdown.maxDiscountCap,

                amountToPayPaisa: breakdown.amountToPayPaisa,
                coinsToEarn: breakdown.coinsToEarn,

                platformFeeRate: breakdown.platformFeeRate,
                isPrimePartner: breakdown.isPrimePartner,
                effectivePlatformFeePaisa: breakdown.effectivePlatformFeePaisa,
            },
        });
    } catch (error: any) {
        console.error("[ESCROW_CALCULATE_ERROR]", error);
        console.error("[Escrow] Calculation error:", error);
        errorResponse(res, "Failed to calculate bill due to an internal error.", 500);
    }
});

/**
 * POST /api/v1/escrow/initiate
 * Initiates a FoodiePay bill payment session.
 * 
 * Uses:
 * - Compounding Engine for discount math
 * - Redis Distributed Lock (SET NX) for idempotency
 * - Redis Rate Limiting (4-hour TTL per user+restaurant)
 * 
 * Body: {
 *   restaurantId: string,
 *   billAmountPaisa: number,
 *   reservationId?: string,  // optional, for table deal lookup
 *   cardBin?: string,        // optional, bank BIN
 *   applyCoins?: boolean     // optional, whether to burn coins
 * }
 */
router.post("/initiate", authenticate, async (req: Request, res: Response) => {
    try {
        const {
            billId,
            restaurantId: requestedRestaurantId,
            billAmountPaisa,
            originalBillPaisa,
            yieldDiscountPercent: requestedYieldDiscountPercent,
            cardBin,
            applyCoins,
            savedCardId,
        } = req.body;
        const userId = req.user!.id;
        let billSubmission: any = null;
        let restaurantId = requestedRestaurantId;
        let effectiveBillAmountPaisa = billAmountPaisa ?? originalBillPaisa;
        let reservationId = undefined;
        let yieldDiscountPercent = Number(requestedYieldDiscountPercent || 0);

        if (billId) {
            billSubmission = await BillSubmission.findById(billId).lean() as any;
            if (!billSubmission || billSubmission.userId.toString() !== userId) {
                errorResponse(res, "Bill not found or unauthorized.", 404);
                return;
            }

            if (billSubmission.status !== "Pending") {
                errorResponse(res, `Bill payment is no longer pending. Status: ${billSubmission.status}`, 400);
                return;
            }

            const reservation = await Reservation.findById(billSubmission.reservationId).lean() as any;
            restaurantId = billSubmission.restaurantId.toString();
            effectiveBillAmountPaisa = billSubmission.originalBillPaisa;
            reservationId = billSubmission.reservationId?.toString();
            yieldDiscountPercent = reservation?.appliedYieldDiscount || 0;
        } else if (!restaurantId || !Number.isInteger(effectiveBillAmountPaisa) || effectiveBillAmountPaisa <= 0) {
            errorResponse(res, "Provide either billId or restaurantId with billAmountPaisa.", 400);
            return;
        }

        // ── Rate Limiting ──
        // Scope to the specific bill when present so a restaurant can legitimately
        // collect for two DIFFERENT bills (two visits) for the same user within 4h.
        // The old user+restaurant key wrongly blocked the second genuine bill.
        const rateLimitKey = billId
            ? `rate_limit:foodiepay:bill:${billId}`
            : `rate_limit:discount:${userId}:${restaurantId}`;
        const existing = await redis.get(rateLimitKey);
        if (existing) {
            errorResponse(res, "This payment was already processed recently. Please check My Bookings.", 429);
            return;
        }

        // ── Distributed Lock: Prevent concurrent duplicate requests ──
        const lockKey = `escrow_lock:${userId}:${Date.now().toString(36)}`;
        const lockAcquired = await redis.set(lockKey, "1", "EX", 10, "NX");
        if (!lockAcquired) {
            errorResponse(res, "Another payment is being processed. Please wait.", 409);
            return;
        }

        try {
            // ── Fetch restaurant config ──
            const restaurant = await Restaurant.findById(restaurantId)
                .select("brandName platformFeeRate bookingSettings.isPrimePartner allowDiscountStacking maxStackedDiscountPercentage")
                .lean();

            if (!restaurant) {
                errorResponse(res, "Restaurant not found.", 404);
                return;
            }


            // ── Run Checkout Engine ──
            const bill = await CheckoutEngine.calculateBill({
                userId,
                restaurantId,
                originalBillPaisa: effectiveBillAmountPaisa,
                yieldDiscountPercent,
                cardBin,
                applyCoins,
            });

            // The merchant can NEVER be credited more than the gateway actually
            // collected from the customer. Previously this used
            // subtotalAfterSubscriptionPaisa (before bank + coin discounts), which
            // over-credited the wallet whenever a bank deal or coins were applied —
            // the platform would pay out money it never received. Base the payout on
            // amountToPay (after ALL discounts) minus the platform fee.
            // NOTE: if bank/coins are meant to be bank-/platform-funded (merchant
            // made whole), that reimbursement must be a separate ledger entry — but
            // crediting it out of the merchant wallet against money never collected
            // is unambiguously wrong.
            const platformFeePaisa = bill.effectivePlatformFeePaisa;
            const netMerchantPaisa = Math.max(0, bill.amountToPayPaisa - platformFeePaisa);

            // ── Generate idempotency key ──
            const idempotencyKey = crypto
                .createHash("sha256")
                .update(`${userId}:${restaurantId}:${effectiveBillAmountPaisa}:${Date.now()}`)
                .digest("hex");

            let payfastData: any = { formData: {}, redirectUrl: null, txnRefNo: idempotencyKey.slice(0, 20) };
            let isImmediateSuccess = false;

            if (bill.amountToPayPaisa === 0) {
                // Fully discounted. Bypassing PayFast.
                isImmediateSuccess = true;
            } else if (savedCardId) {
                const pm = await PaymentMethod.findOne({ _id: savedCardId, userId });
                if (!pm) {
                    errorResponse(res, "Saved card not found or unauthorized.", 404);
                    return;
                }

                const chargeRes = await chargeTokenizedCard({
                    instrumentToken: pm.payfastInstrumentToken,
                    amountPaisa: bill.amountToPayPaisa,
                    orderId: idempotencyKey.slice(0, 20),
                    description: `FoodiePay Tokenized at ${(restaurant as any).brandName}`,
                    customerEmail: req.user!.email,
                    customerPhone: (req.user as any).phone,
                });

                if (!chargeRes.success) {
                    errorResponse(res, `Failed to charge saved card: ${chargeRes.message}`, 400);
                    return;
                }

                payfastData.txnRefNo = chargeRes.data?.TXNREFNO || idempotencyKey.slice(0, 20);
                isImmediateSuccess = true;
            } else {
                // ── Initiate PayFast payment ──
                const initRes = await initiatePayment({
                    amountPaisa: bill.amountToPayPaisa,
                    orderId: idempotencyKey.slice(0, 20),
                    description: `FoodiePay at ${(restaurant as any).brandName}`,
                    customerEmail: req.user!.email,
                    customerPhone: (req.user as any).phone,
                });
                payfastData = initRes;
            }

            // ── Create Transaction record ──
            const transaction = await Transaction.create({
                userId,
                merchantId: restaurantId,
                reservationId: reservationId || undefined,
                bankOfferId: bill.bankOfferId,

                originalBillPaisa: bill.originalBillPaisa,
                tableDealDiscountPaisa: bill.tableDealDiscountPaisa,
                subscriptionDiscountPaisa: bill.subscriptionDiscountPaisa,
                bankDiscountPaisa: bill.bankDiscountPaisa,
                coinsRedeemed: bill.coinsRedeemed,
                coinDiscountPaisa: bill.coinDiscountPaisa,
                totalDiscountPaisa: bill.totalDiscountPaisa,

                amountPaidPaisa: bill.amountToPayPaisa,
                coinsEarned: bill.coinsToEarn,
                platformFeePaisa,
                netMerchantPaisa,

                // Record the restaurant's REAL discount mode, not an inference
                // from whether a bank deal happened to land.
                discountMethod: (restaurant as any).allowDiscountStacking ? "stacked" : "exclusive",
                // Reuse the engine's zero-guarded percent (avoids NaN on 0-bills).
                effectiveDiscountPercent: bill.totalDiscountPercent,

                status: isImmediateSuccess ? "SUCCESS" : "PENDING",
                gatewayRef: payfastData.txnRefNo,
                idempotencyKey,
            });

            if (isImmediateSuccess) {
                await completeEscrowTransaction(transaction);
            }

            // ── Set rate limit (4 hours) ──
            await redis.set(rateLimitKey, transaction._id.toString(), "EX", 14400);

            // ── Ensure MerchantWallet exists ──
            await MerchantWallet.findOneAndUpdate(
                { merchantId: restaurantId },
                { $setOnInsert: { availableBalancePaisa: 0, pendingClearancePaisa: 0, totalEarnedPaisa: 0 } },
                { upsert: true }
            );

            successResponse(res, {
                transactionId: transaction._id,
                billBreakdown: {
                    originalBill: bill.originalBillPaisa / 100,
                    tableDealDiscount: bill.tableDealDiscountPaisa / 100,
                    subscriptionDiscount: bill.subscriptionDiscountPaisa / 100,
                    bankDiscount: bill.bankDiscountPaisa / 100,
                    coinsRedeemed: bill.coinsRedeemed,
                    coinDiscount: bill.coinDiscountPaisa / 100,
                    totalDiscount: bill.totalDiscountPaisa / 100,
                    amountToPay: bill.amountToPayPaisa / 100,
                    platformFee: platformFeePaisa / 100,
                    platformFeeRate: bill.platformFeeRate,
                    effectivePlatformFee: bill.effectivePlatformFeePaisa / 100,
                    isPrimePartner: bill.isPrimePartner,
                    effectiveDiscount: `${bill.totalDiscountPercent}%`,
                    coinsToEarn: bill.coinsToEarn,
                },
                payment: {
                    redirectUrl: payfastData.redirectUrl,
                    formData: payfastData.formData,
                    txnRefNo: payfastData.txnRefNo,
                },
            });
        } finally {
            // Always release the lock
            await redis.del(lockKey);
        }
    } catch (error: any) {
        console.error("[ESCROW_INITIATE_ERROR]", error);
        errorResponse(res, "Failed to initiate bill payment.", 500);
    }
});

export default router;

async function completeEscrowTransaction(transaction: any) {
    if (transaction.coinsRedeemed > 0) {
        await WalletLedger.create({
            userId: transaction.userId,
            amount: transaction.coinsRedeemed,
            direction: "Debit",
            source: "Redemption",
            referenceType: "Transaction",
            referenceId: transaction._id,
            description: `Redeemed ${transaction.coinsRedeemed} coins for FoodiePay order`,
        });
    }

    if (transaction.coinsEarned > 0) {
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        await WalletLedger.create({
            userId: transaction.userId,
            amount: transaction.coinsEarned,
            direction: "Credit",
            source: "Booking",
            referenceType: "Transaction",
            referenceId: transaction._id,
            description: `Earned ${transaction.coinsEarned} coins from FoodiePay cashback`,
            expiresAt,
        });
    }

    await MerchantWallet.findOneAndUpdate(
        { merchantId: transaction.merchantId },
        {
            $inc: {
                pendingClearancePaisa: transaction.netMerchantPaisa,
                totalEarnedPaisa: transaction.netMerchantPaisa,
            },
        }
    );

    if (transaction.reservationId) {
        await BillSubmission.findOneAndUpdate(
            { reservationId: transaction.reservationId, status: { $in: ["Pending", "PendingPayment"] } },
            {
                $set: {
                    status: "Paid",
                    paidAt: new Date(),
                    bankDiscountPaisa: transaction.bankDiscountPaisa || 0,
                    coinsDiscountPaisa: transaction.coinDiscountPaisa || 0,
                    totalDiscountPaisa: transaction.totalDiscountPaisa || 0,
                    finalAmountPaisa: transaction.amountPaidPaisa,
                    platformFeeCollected: true,
                },
            }
        );

        await Reservation.findByIdAndUpdate(transaction.reservationId, {
            $set: { status: "Completed", completedAt: new Date() },
        });
    }
}
