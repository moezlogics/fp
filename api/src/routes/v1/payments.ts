import { Router, Request, Response } from "express";
import { Payment } from "../../models/Payment";
import { Transaction } from "../../models/Transaction";
import { WalletLedger } from "../../models/WalletLedger";
import { MerchantWallet } from "../../models/MerchantWallet";
import { initiatePayment, verifyCallbackSignature, isTransactionSuccessful } from "../../services/payment/payfast";
import { authenticate } from "../../middleware/authenticate";
import { successResponse, errorResponse } from "../../utils/api-response";
import { RestaurantSubscription } from "../../models/RestaurantSubscription";
import { syncRestaurantSubscriptionState } from "../../services/restaurant-subscription-service";

const router = Router();

function buildRedirectUrl(params: {
    status: "SUCCESS" | "FAILED";
    txnRefNo: string;
    responseMessage?: string;
    payment?: any | null;
    transaction?: any | null;
}) {
    const { status, txnRefNo, responseMessage = "", payment, transaction } = params;
    const encodedReason = encodeURIComponent(responseMessage || "Payment failed.");

    if (payment?.type === "subscription") {
        return status === "SUCCESS"
            ? `/payment/success?ref=${txnRefNo}&kind=prime`
            : `/payment/failed?ref=${txnRefNo}&kind=prime&reason=${encodedReason}`;
    }

    if (payment?.type === "card_verify") {
        return status === "SUCCESS"
            ? `/account/payment-methods?saved=1&ref=${txnRefNo}`
            : `/account/payment-methods?failed=1&ref=${txnRefNo}&reason=${encodedReason}`;
    }

    if (payment?.type === "restaurant_subscription") {
        return status === "SUCCESS"
            ? `/owner/prime?status=success&ref=${txnRefNo}`
            : `/owner/prime?status=failed&ref=${txnRefNo}&reason=${encodedReason}`;
    }

    if (transaction || payment?.type === "bill_pay" || payment?.type === "booking_deposit") {
        return status === "SUCCESS"
            ? `/payment/success?ref=${txnRefNo}&kind=foodiepay`
            : `/payment/failed?ref=${txnRefNo}&kind=foodiepay&reason=${encodedReason}`;
    }

    return status === "SUCCESS"
        ? `/payment/success?ref=${txnRefNo}`
        : `/payment/failed?ref=${txnRefNo}&reason=${encodedReason}`;
}

/**
 * POST /api/v1/payments/initiate
 * Creates a payment record and returns JazzCash form data for redirect.
 * Protected: authenticated user
 */
router.post("/initiate", authenticate, async (req: Request, res: Response) => {
    try {
        const { type, amountPaisa, orderId, description, idempotencyKey: reqIdempotencyKey, metadata } = req.body;

        // Validation
        if (!type || !amountPaisa || !orderId) {
            errorResponse(res, "type, amountPaisa, and orderId are required.", 400);
            return;
        }

        if (!["subscription", "bill_pay", "booking_deposit", "card_verify", "restaurant_subscription"].includes(type)) {
            errorResponse(res, "Invalid payment type.", 400);
            return;
        }

        if (!Number.isInteger(amountPaisa) || amountPaisa < 100) {
            errorResponse(res, "Amount must be at least 1 PKR (100 Paisa).", 400);
            return;
        }

        const idempotencyKey = reqIdempotencyKey || `${req.user!.id}_${orderId}_${Date.now()}`;

        // Idempotency check
        const existingPayment = await Payment.findOne({ idempotencyKey });
        if (existingPayment) {
            if (existingPayment.status === "INITIATED") {
                const payfastData = await initiatePayment({
                    amountPaisa,
                    orderId,
                    description: description || "Foodies Pakistan Payment",
                    customerEmail: req.user!.email,
                    customerPhone: (req.user as any).phone,
                });

                successResponse(res, {
                    paymentId: existingPayment._id,
                    txnRefNo: existingPayment.txnRefNo,
                    formData: payfastData.formData,
                    redirectUrl: payfastData.redirectUrl,
                });
                return;
            }

            res.status(409).json({
                success: false,
                error: "This payment has already been processed.",
                status: existingPayment.status
            });
            return;
        }

        const payfastData = await initiatePayment({
            amountPaisa,
            orderId,
            description: description || "Foodies Pakistan Payment",
            customerEmail: req.user!.email,
            customerPhone: (req.user as any).phone,
        });

        const payment = await Payment.create({
            userId: req.user!.id,
            type,
            amountPaisa,
            status: "INITIATED",
            txnRefNo: payfastData.txnRefNo,
            orderId,
            description: description || "Foodies Pakistan Payment",
            idempotencyKey,
            metadata: metadata || {},
        });

        successResponse(res, {
            paymentId: payment._id,
            txnRefNo: payfastData.txnRefNo,
            formData: payfastData.formData,
            redirectUrl: payfastData.redirectUrl,
        });
    } catch (err: any) {
        console.error("[PAYMENT_INITIATE_ERROR]", err);
        errorResponse(res, "Failed to initiate payment.", 500);
    }
});

/**
 * POST /api/v1/payments/callback
 * PayFast server-to-server callback.
 * Public (verified via HMAC-SHA256)
 */
router.post("/callback", async (req: Request, res: Response) => {
    try {
        const callbackParams: Record<string, string> = req.body;

        const isValid = verifyCallbackSignature(callbackParams);
        if (!isValid) {
            console.error("[PAYMENT_CALLBACK] PayFast signature verification FAILED. Possible tampering.");
            errorResponse(res, "Invalid signature. Request rejected.", 403);
            return;
        }

        const txnRefNo = callbackParams.TXNREFNO || callbackParams.BASKET_ID;
        const responseCode = callbackParams.RESPONSE_CODE;
        const responseMessage = callbackParams.RESPONSE_MESSAGE || "";

        if (!txnRefNo) {
            errorResponse(res, "Missing transaction reference.", 400);
            return;
        }

        const isSuccess = isTransactionSuccessful(responseCode);
        const newStatus = isSuccess ? "SUCCESS" : "FAILED";

        let payment = await Payment.findOneAndUpdate(
            { txnRefNo, status: "INITIATED" },
            {
                $set: {
                    status: newStatus,
                    gatewayRef: callbackParams.RETRIEVAL_REF_NO || txnRefNo,
                    gatewayResponseCode: responseCode,
                    gatewayResponseMessage: responseMessage,
                    callbackPayload: callbackParams,
                    completedAt: new Date(),
                },
            },
            { new: true }
        );

        let isTransaction = false;
        let escrowTransaction = null;

        if (!payment) {
            // It might be a FoodiePay Escrow Transaction
            escrowTransaction = await Transaction.findOneAndUpdate(
                { gatewayRef: txnRefNo, status: "PENDING" },
                {
                    $set: {
                        status: newStatus,
                        completedAt: new Date(),
                    },
                },
                { new: true }
            );

            if (escrowTransaction) {
                isTransaction = true;
            } else {
                const existingPayment = await Payment.findOne({ txnRefNo });
                const existingTransaction = await Transaction.findOne({ gatewayRef: txnRefNo });

                if (existingPayment || existingTransaction) {
                    const settledStatus: "SUCCESS" | "FAILED" =
                        existingPayment?.status === "SUCCESS" || existingTransaction?.status === "SUCCESS"
                            ? "SUCCESS"
                            : "FAILED";
                    res.status(200).json({
                        status: settledStatus,
                        txnRefNo,
                        redirectUrl: buildRedirectUrl({
                            status: settledStatus,
                            txnRefNo,
                            responseMessage: existingPayment?.gatewayResponseMessage || responseMessage,
                            payment: existingPayment,
                            transaction: existingTransaction,
                        }),
                    });
                    return;
                }

                console.warn("[PAYMENT_CALLBACK] Record not found:", txnRefNo);
                res.status(200).json({
                    status: "FAILED",
                    txnRefNo,
                    redirectUrl: buildRedirectUrl({
                        status: "FAILED",
                        txnRefNo,
                        responseMessage: responseMessage || "Payment record not found.",
                    }),
                });
                return;
            }
        }

        if (isSuccess) {
            if (!isTransaction && payment) {
                console.log(`[PAYMENT_SUCCESS] ${payment.type} | ${payment.txnRefNo} | ${payment.amountPaisa} paisa`);
                
                // ── 0. Handle Subscription Activation ──
                if (payment.type === "subscription" && payment.metadata?.subscriptionId) {
                    const { Subscription } = await import("../../models/Subscription");
                    const { User } = await import("../../models/User");

                    const sub = await Subscription.findById(payment.metadata.subscriptionId);
                    if (sub && sub.status === "Pending") {
                        // Derive validity from the plan's durationMonths (single
                        // source of truth, same as the purchase path) instead of a
                        // duplicated switch that silently diverges for new plans.
                        const { SubscriptionPlan } = await import("../../models/SubscriptionPlan");
                        const planDoc = (await SubscriptionPlan.findById(sub.planId).lean()) as any;
                        const months =
                            Number(planDoc?.durationMonths) ||
                            (sub.plan === "Annual"
                                ? 12
                                : sub.plan === "SemiAnnual"
                                    ? 6
                                    : sub.plan === "Quarterly"
                                        ? 3
                                        : 1);
                        const validFrom = new Date();
                        const validTo = new Date();
                        validTo.setMonth(validTo.getMonth() + months);

                        // Activate it
                        sub.status = "Active";
                        sub.validFrom = validFrom;
                        sub.validTo = validTo;
                        sub.paymentGateway = "payfast";
                        await sub.save();

                        // Update User flag
                        await User.findByIdAndUpdate(sub.userId, {
                            isPrime: true,
                            primeValidTo: validTo,
                        });
                        console.log(`[SUBSCRIPTION_ACTIVATED] User ${sub.userId} Prime Active until ${validTo}`);
                    }
                } else if (payment.type === "restaurant_subscription" && payment.metadata?.restaurantSubscriptionId) {
                    const branchSubscription = await RestaurantSubscription.findById(payment.metadata.restaurantSubscriptionId);
                    if (branchSubscription && branchSubscription.status === "Pending") {
                        branchSubscription.status = "Active";
                        branchSubscription.activatedAt = new Date();
                        branchSubscription.txnRefNo = txnRefNo;
                        await branchSubscription.save();
                        await syncRestaurantSubscriptionState(branchSubscription.restaurantId.toString());
                        console.log(`[RESTAURANT_SUBSCRIPTION_ACTIVATED] Branch ${branchSubscription.restaurantId} -> ${branchSubscription.planSlug}`);
                    }
                } else if (payment.type === "card_verify") {
                    // ── Handle Card Verification / Save Card ──
                    const instrumentToken = callbackParams.TOKEN || callbackParams.token || callbackParams.INSTRUMENT_TOKEN || callbackParams.instrument_token;
                    
                    if (instrumentToken) {
                        const { PaymentMethod } = await import("../../models/PaymentMethod");
                        
                        // Check if it's already saved
                        const existing = await PaymentMethod.findOne({ payfastInstrumentToken: instrumentToken });
                        if (!existing) {
                            const count = await PaymentMethod.countDocuments({ userId: payment.userId });
                            const nickname = payment.metadata?.nickname || "Saved Card";
                            // For security, if PayFast returns any masked info we can use it, else default
                            const maskedCardNumber = callbackParams.CUSTOMER_CARD_NO || "**** **** **** ****";
                            
                            await PaymentMethod.create({
                                userId: payment.userId,
                                cardNickname: nickname,
                                maskedCardNumber,
                                cardBrand: "other", // Default unless PayFast sends card brand
                                expiryMonth: 12,    // Default placeholder
                                expiryYear: 2030,   // Default placeholder
                                isDefault: count === 0,
                                payfastInstrumentToken: instrumentToken,
                                payfastTokenCreatedAt: new Date(),
                                isVerified: true,
                            });
                            console.log(`[CARD_SAVED] User ${payment.userId} successfully saved a new card.`);
                        }
                    } else {
                        console.warn(`[CARD_VERIFY_WARNING] Callback received for ${payment.txnRefNo} but no instrument token provided.`);
                    }
                }
            } else if (isTransaction && escrowTransaction) {
                console.log(`[ESCROW_SUCCESS] FoodiePay Txn: ${escrowTransaction._id} | Paid: ${escrowTransaction.amountPaidPaisa}`);

                // ── 1. Burn Coins if redeemed ──
                if (escrowTransaction.coinsRedeemed > 0) {
                    await WalletLedger.create({
                        userId: escrowTransaction.userId,
                        amount: escrowTransaction.coinsRedeemed,
                        direction: "Debit",
                        source: "Redemption",
                        referenceType: "Transaction",
                        referenceId: escrowTransaction._id,
                        description: `Redeemed ${escrowTransaction.coinsRedeemed} coins for FoodiePay order`,
                    });
                }

                // ── 2. Earn Coins as cashback ──
                if (escrowTransaction.coinsEarned > 0) {
                    // Coins expire 12 months after earning
                    const expiresAt = new Date();
                    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

                    await WalletLedger.create({
                        userId: escrowTransaction.userId,
                        amount: escrowTransaction.coinsEarned,
                        direction: "Credit",
                        source: "Booking",
                        referenceType: "Transaction",
                        referenceId: escrowTransaction._id,
                        description: `Earned ${escrowTransaction.coinsEarned} coins from FoodiePay cashback`,
                        expiresAt,
                    });
                }

                // ── 3. Credit Merchant Wallet (Escrow Pending Clearance) ──
                await MerchantWallet.findOneAndUpdate(
                    { merchantId: escrowTransaction.merchantId },
                    {
                        $inc: {
                            pendingClearancePaisa: escrowTransaction.netMerchantPaisa,
                            totalEarnedPaisa: escrowTransaction.netMerchantPaisa,
                        },
                    }
                );

                // ── 4. Mark BillSubmission as Paid ──
                if (escrowTransaction.reservationId) {
                    const { BillSubmission } = await import("../../models/BillSubmission");
                    const { Reservation } = await import("../../models/Reservation");

                    await BillSubmission.findOneAndUpdate(
                        { reservationId: escrowTransaction.reservationId, status: { $in: ["Pending", "PendingPayment"] } },
                        {
                            $set: {
                                status: "Paid",
                                paidAt: new Date(),
                                bankDiscountPaisa: escrowTransaction.bankDiscountPaisa || 0,
                                coinsDiscountPaisa: escrowTransaction.coinDiscountPaisa || 0,
                                totalDiscountPaisa: escrowTransaction.totalDiscountPaisa || 0,
                                finalAmountPaisa: escrowTransaction.amountPaidPaisa,
                                platformFeeCollected: true,
                            },
                        }
                    );

                    // Mark reservation as Completed
                    await Reservation.findByIdAndUpdate(escrowTransaction.reservationId, {
                        $set: { status: "Completed", completedAt: new Date() },
                    });
                }
            }
        } else if (payment?.type === "subscription" && payment.metadata?.subscriptionId) {
            const { Subscription } = await import("../../models/Subscription");
            await Subscription.findOneAndUpdate(
                { _id: payment.metadata.subscriptionId, status: "Pending" },
                { $set: { status: "Failed" } }
            );
        } else if (payment?.type === "restaurant_subscription" && payment.metadata?.restaurantSubscriptionId) {
            await RestaurantSubscription.findOneAndUpdate(
                { _id: payment.metadata.restaurantSubscriptionId, status: "Pending" },
                { $set: { status: "Failed", txnRefNo } }
            );
        }

        const redirectUrl = buildRedirectUrl({
            status: newStatus,
            txnRefNo,
            responseMessage,
            payment,
            transaction: escrowTransaction,
        });

        res.status(200).json({
            status: newStatus,
            txnRefNo,
            redirectUrl,
        });
    } catch (error: any) {
        console.error("[PAYMENT_CALLBACK_ERROR]", error);
        res.status(200).json({ status: "error", message: "Internal error" });
    }
});

/**
 * GET /api/v1/payments/status/:txnId
 * Check the status of a payment.
 * Protected: authenticated user (owner of payment)
 */
router.get("/status/:txnId", authenticate, async (req: Request, res: Response) => {
    try {
        const { txnId } = req.params;

        const payment = await Payment.findOne({
            txnRefNo: txnId,
            userId: req.user!.id,
        }).select("status type amountPaisa txnRefNo orderId description completedAt createdAt");

        if (!payment) {
            errorResponse(res, "Payment not found.", 404);
            return;
        }

        successResponse(res, {
            status: payment.status,
            type: payment.type,
            amountPaisa: payment.amountPaisa,
            amountPKR: payment.amountPaisa / 100,
            txnRefNo: payment.txnRefNo,
            orderId: payment.orderId,
            description: payment.description,
            completedAt: payment.completedAt,
            createdAt: payment.createdAt,
        });
    } catch (err: any) {
        console.error("[PAYMENT_STATUS_ERROR]", err);
        errorResponse(res, "Internal server error.", 500);
    }
});

export default router;
