import { Router, Request, Response } from "express";
import { MerchantWallet } from "../../models/MerchantWallet";
import { WithdrawalRequest } from "../../models/WithdrawalRequest";
import { Transaction } from "../../models/Transaction";
import { Restaurant } from "../../models/Restaurant";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * GET /api/v1/merchant-wallet/balance
 * Protected: owner, admin
 * Returns the wallet balance for the owner's restaurant.
 */
router.get("/balance", authenticate, authorize("admin", "owner"), async (req: Request, res: Response) => {
    try {
        const restaurantId = req.query.restaurantId as string;
        if (!restaurantId) {
            errorResponse(res, "restaurantId query param required", 400);
            return;
        }

        // Ownership check
        if (req.user!.role === "owner") {
            const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
            if (!rest) {
                errorResponse(res, "Not your restaurant", 403);
                return;
            }
        }

        // Upsert wallet (creates if doesn't exist)
        const wallet = await MerchantWallet.findOneAndUpdate(
            { merchantId: restaurantId },
            { $setOnInsert: { availableBalancePaisa: 0, pendingClearancePaisa: 0, totalEarnedPaisa: 0 } },
            { upsert: true, new: true }
        );

        successResponse(res, {
            availableBalancePaisa: wallet.availableBalancePaisa,
            pendingClearancePaisa: wallet.pendingClearancePaisa,
            totalEarnedPaisa: wallet.totalEarnedPaisa,
            availableBalanceRs: (wallet.availableBalancePaisa / 100).toFixed(0),
            pendingClearanceRs: (wallet.pendingClearancePaisa / 100).toFixed(0),
            totalEarnedRs: (wallet.totalEarnedPaisa / 100).toFixed(0),
            lastSettlementAt: wallet.lastSettlementAt,
            hasBankDetails: !!(wallet.bankDetails?.iban),
        });
    } catch (err) {
        console.error("Merchant wallet balance error:", err);
        errorResponse(res, "Failed to fetch wallet balance", 500);
    }
});

/**
 * GET /api/v1/merchant-wallet/bank-details
 * Protected: owner, admin
 */
router.get("/bank-details", authenticate, authorize("admin", "owner"), async (req: Request, res: Response) => {
    try {
        const restaurantId = req.query.restaurantId as string;
        if (!restaurantId) {
            errorResponse(res, "restaurantId query param required", 400);
            return;
        }

        if (req.user!.role === "owner") {
            const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
            if (!rest) {
                errorResponse(res, "Not your restaurant", 403);
                return;
            }
        }

        const wallet = await MerchantWallet.findOne({ merchantId: restaurantId })
            .select("bankDetails")
            .lean() as any;

        successResponse(res, {
            bankDetails: wallet?.bankDetails || null,
        });
    } catch (err) {
        errorResponse(res, "Failed to fetch bank details", 500);
    }
});

/**
 * PUT /api/v1/merchant-wallet/bank-details
 * Protected: owner, admin
 * Add or update bank account details.
 */
router.put("/bank-details", authenticate, authorize("admin", "owner"), async (req: Request, res: Response) => {
    try {
        const { restaurantId, bankName, accountTitle, accountNumber, iban } = req.body;

        if (!restaurantId || !bankName || !accountTitle || !accountNumber || !iban) {
            errorResponse(res, "restaurantId, bankName, accountTitle, accountNumber, and iban are required", 400);
            return;
        }

        // IBAN validation (Pakistan: PK + 2 check digits + 4 bank code + 16 account number = 24 chars)
        const cleanIban = iban.replace(/\s/g, "").toUpperCase();
        if (!/^PK\d{2}[A-Z]{4}\d{16}$/.test(cleanIban)) {
            errorResponse(res, "Invalid IBAN format. Pakistani IBAN must be 24 characters: PK + 2 digits + 4 letter bank code + 16 digit account", 400);
            return;
        }

        if (req.user!.role === "owner") {
            const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
            if (!rest) {
                errorResponse(res, "Not your restaurant", 403);
                return;
            }
        }

        const wallet = await MerchantWallet.findOneAndUpdate(
            { merchantId: restaurantId },
            {
                $set: {
                    "bankDetails.bankName": bankName.trim(),
                    "bankDetails.accountTitle": accountTitle.trim(),
                    "bankDetails.accountNumber": accountNumber.trim(),
                    "bankDetails.iban": cleanIban,
                },
                $setOnInsert: {
                    availableBalancePaisa: 0,
                    pendingClearancePaisa: 0,
                    totalEarnedPaisa: 0,
                },
            },
            { upsert: true, new: true }
        );

        successResponse(res, {
            message: "Bank details saved successfully",
            bankDetails: wallet.bankDetails,
        });
    } catch (err) {
        console.error("Bank details update error:", err);
        errorResponse(res, "Failed to update bank details", 500);
    }
});

/**
 * POST /api/v1/merchant-wallet/withdraw
 * Protected: owner
 * Request a withdrawal to the registered bank account.
 */
router.post("/withdraw", authenticate, authorize("owner"), async (req: Request, res: Response) => {
    try {
        const { restaurantId, amountPaisa } = req.body;

        if (!restaurantId || !amountPaisa) {
            errorResponse(res, "restaurantId and amountPaisa are required", 400);
            return;
        }

        if (!Number.isInteger(amountPaisa) || amountPaisa < 10000) {
            errorResponse(res, "Minimum withdrawal is Rs. 100 (10000 paisa)", 400);
            return;
        }

        // Ownership check
        const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
        if (!rest) {
            errorResponse(res, "Not your restaurant", 403);
            return;
        }

        // Get wallet
        const wallet = await MerchantWallet.findOne({ merchantId: restaurantId });
        if (!wallet) {
            errorResponse(res, "Wallet not found. No earnings yet.", 404);
            return;
        }

        // Check bank details
        if (!wallet.bankDetails?.iban || !wallet.bankDetails?.accountTitle) {
            errorResponse(res, "Please add your bank details before requesting a withdrawal", 400);
            return;
        }

        // Check available balance
        if (wallet.availableBalancePaisa < amountPaisa) {
            errorResponse(res, `Insufficient balance. Available: Rs. ${(wallet.availableBalancePaisa / 100).toFixed(0)}`, 400);
            return;
        }

        // Check for pending withdrawal
        const pendingWithdrawal = await WithdrawalRequest.findOne({
            merchantId: restaurantId,
            status: { $in: ["Pending", "Processing"] },
        });
        if (pendingWithdrawal) {
            errorResponse(res, "You already have a pending withdrawal request. Please wait for it to be processed.", 409);
            return;
        }

        // Atomically deduct from available balance
        const updated = await MerchantWallet.findOneAndUpdate(
            {
                merchantId: restaurantId,
                availableBalancePaisa: { $gte: amountPaisa },
            },
            {
                $inc: { availableBalancePaisa: -amountPaisa },
            },
            { new: true }
        );

        if (!updated) {
            errorResponse(res, "Balance changed. Please try again.", 409);
            return;
        }

        // Create withdrawal request
        const withdrawal = await WithdrawalRequest.create({
            merchantId: restaurantId,
            ownerId: req.user!.id,
            amountPaisa,
            bankDetails: {
                bankName: wallet.bankDetails.bankName,
                accountTitle: wallet.bankDetails.accountTitle,
                accountNumber: wallet.bankDetails.accountNumber,
                iban: wallet.bankDetails.iban,
            },
            status: "Pending",
        });

        successResponse(res, {
            message: `Withdrawal of Rs. ${(amountPaisa / 100).toFixed(0)} requested. It will be processed within 2-3 business days.`,
            withdrawal,
            newAvailableBalance: updated.availableBalancePaisa,
        }, 201);
    } catch (err) {
        console.error("Withdrawal request error:", err);
        errorResponse(res, "Failed to request withdrawal", 500);
    }
});

/**
 * GET /api/v1/merchant-wallet/withdrawals
 * Protected: owner, admin
 * List withdrawal history.
 */
router.get("/withdrawals", authenticate, authorize("admin", "owner"), async (req: Request, res: Response) => {
    try {
        const restaurantId = req.query.restaurantId as string;
        if (!restaurantId) {
            errorResponse(res, "restaurantId query param required", 400);
            return;
        }

        if (req.user!.role === "owner") {
            const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
            if (!rest) {
                errorResponse(res, "Not your restaurant", 403);
                return;
            }
        }

        const withdrawals = await WithdrawalRequest.find({ merchantId: restaurantId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        successResponse(res, { withdrawals });
    } catch (err) {
        errorResponse(res, "Failed to fetch withdrawals", 500);
    }
});

/**
 * GET /api/v1/merchant-wallet/transactions
 * Protected: owner, admin
 * List recent escrow transactions for this restaurant.
 */
router.get("/transactions", authenticate, authorize("admin", "owner"), async (req: Request, res: Response) => {
    try {
        const restaurantId = req.query.restaurantId as string;
        if (!restaurantId) {
            errorResponse(res, "restaurantId query param required", 400);
            return;
        }

        if (req.user!.role === "owner") {
            const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
            if (!rest) {
                errorResponse(res, "Not your restaurant", 403);
                return;
            }
        }

        const transactions = await Transaction.find({
            merchantId: restaurantId,
            status: "SUCCESS",
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate("userId", "name phone")
            .select("originalBillPaisa totalDiscountPaisa amountPaidPaisa platformFeePaisa netMerchantPaisa coinsRedeemed createdAt")
            .lean();

        successResponse(res, { transactions });
    } catch (err) {
        errorResponse(res, "Failed to fetch transactions", 500);
    }
});

/**
 * Admin-only: Process a withdrawal request
 * PUT /api/v1/merchant-wallet/withdrawals/process
 */
router.put("/withdrawals/process", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { withdrawalId, action, bankTransferRef, rejectionReason } = req.body;

        if (!withdrawalId || !action || !["approve", "reject"].includes(action)) {
            errorResponse(res, "withdrawalId and action (approve/reject) required", 400);
            return;
        }

        const withdrawal = await WithdrawalRequest.findById(withdrawalId);
        if (!withdrawal) {
            errorResponse(res, "Withdrawal request not found", 404);
            return;
        }

        if (withdrawal.status !== "Pending") {
            errorResponse(res, `Cannot process: withdrawal is already ${withdrawal.status}`, 400);
            return;
        }

        if (action === "approve") {
            withdrawal.status = "Completed";
            withdrawal.processedAt = new Date();
            withdrawal.bankTransferRef = bankTransferRef || "";
            withdrawal.processedBy = req.user!.id;
            await withdrawal.save();

            // Update last settlement date
            await MerchantWallet.updateOne(
                { merchantId: withdrawal.merchantId },
                { lastSettlementAt: new Date() }
            );

            successResponse(res, { message: "Withdrawal approved and marked as completed", withdrawal });
        } else {
            // Reject — return funds to available balance
            withdrawal.status = "Rejected";
            withdrawal.rejectionReason = rejectionReason || "Request rejected by admin";
            withdrawal.processedBy = req.user!.id;
            await withdrawal.save();

            await MerchantWallet.updateOne(
                { merchantId: withdrawal.merchantId },
                { $inc: { availableBalancePaisa: withdrawal.amountPaisa } }
            );

            successResponse(res, { message: "Withdrawal rejected. Funds returned to available balance.", withdrawal });
        }
    } catch (err) {
        console.error("Withdrawal processing error:", err);
        errorResponse(res, "Failed to process withdrawal", 500);
    }
});

export default router;
