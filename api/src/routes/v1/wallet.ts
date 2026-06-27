/**
 * Wallet Routes — /api/v1/wallet
 *
 * GET /balance   — Computed balance (SUM credits - SUM debits), expiring coins
 * GET /history   — Ledger entries (paginated)
 * POST /redeem   — Redeem coins against a reservation
 */

import { Router, Request, Response } from "express";
import { WalletLedger } from "../../models/WalletLedger";
import { Reservation } from "../../models/Reservation";
import { authenticate } from "../../middleware/authenticate";
import { successResponse, errorResponse, paginatedResponse } from "../../utils/api-response";
import { getWalletBalance, debitCoins } from "../../services/wallet";
import mongoose from "mongoose";

const router = Router();

/**
 * GET /api/v1/wallet/balance
 * Returns computed balance from the ledger (source of truth) and expiring coins.
 */
router.get("/balance", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const balance = await getWalletBalance(userId);

        // Check for coins expiring in the next 30 days
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const expiringEntries = await WalletLedger.aggregate([
            {
                $match: {
                    userId: new (mongoose.Types.ObjectId as any)(userId),
                    direction: "Credit",
                    expiresAt: { $lte: thirtyDaysFromNow, $gt: new Date() },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const expiringCoins = expiringEntries.length ? expiringEntries[0].total : 0;

        successResponse(res, {
            balance,
            expiringCoins,
            expiringWarning: expiringCoins > 0
                ? `${expiringCoins} coins will expire in the next 30 days. Use them before they're gone!`
                : null,
        });
    } catch (err) {
        console.error("Balance fetch error:", err);
        errorResponse(res, "Failed to compute wallet balance.", 500);
    }
});

/**
 * GET /api/v1/wallet/history
 * Returns paginated ledger entries.
 */
router.get("/history", authenticate, async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
        const limit = Math.min(50, parseInt(req.query.limit as string || "20", 10));

        const skip = (page - 1) * limit;

        const [entries, total] = await Promise.all([
            WalletLedger.find({ userId: req.user!.id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WalletLedger.countDocuments({ userId: req.user!.id }),
        ]);

        paginatedResponse(res, entries, total, page, limit);
    } catch (err) {
        errorResponse(res, "Failed to fetch wallet history.", 500);
    }
});

/**
 * POST /api/v1/wallet/redeem
 * Redeem Foodie Coins against a reservation. Max 50% of estimated bill.
 * 
 * Body: { reservationId, coinsToRedeem }
 */
router.post("/redeem", authenticate, async (req: Request, res: Response) => {
    try {
        const { reservationId, coinsToRedeem } = req.body;
        if (!reservationId || !coinsToRedeem || coinsToRedeem <= 0) {
            errorResponse(res, "reservationId and coinsToRedeem (> 0) required", 400);
            return;
        }

        const reservation = await Reservation.findById(reservationId);
        if (!reservation) {
            errorResponse(res, "Reservation not found", 404);
            return;
        }
        if (reservation.userId.toString() !== req.user!.id) {
            errorResponse(res, "Not your reservation", 403);
            return;
        }
        if (!["Draft", "Confirmed"].includes(reservation.status)) {
            errorResponse(res, "Can only redeem coins on Draft/Confirmed reservations", 400);
            return;
        }

        // Cap at 50% of estimated bill
        const maxRedeemable = Math.floor(reservation.estimatedBillBeforeDiscount * 0.5);
        const actualRedeem = Math.min(coinsToRedeem, maxRedeemable);

        if (actualRedeem <= 0) {
            errorResponse(res, "Nothing to redeem (bill too low or already redeemed)", 400);
            return;
        }

        // Check balance and debit
        const result = await debitCoins({
            userId: req.user!.id,
            amount: actualRedeem,
            source: "Redemption",
            referenceType: "Reservation",
            referenceId: reservationId,
            description: `Redeemed ${actualRedeem} coins for reservation ${reservation.reservationCode}`,
        });

        if (!result) {
            const balance = await getWalletBalance(req.user!.id);
            errorResponse(res, `Insufficient balance. You have ${balance} coins.`, 400);
            return;
        }

        // Update reservation financial snapshot
        reservation.appliedCoinsDiscount = (reservation.appliedCoinsDiscount || 0) + actualRedeem;
        reservation.estimatedBillAfterDiscount = Math.max(0,
            reservation.estimatedBillBeforeDiscount
            - (reservation.estimatedBillBeforeDiscount * reservation.appliedYieldDiscount / 100)
            - (reservation.estimatedBillBeforeDiscount * reservation.appliedBankDiscount / 100)
            - reservation.appliedCoinsDiscount
        );
        await reservation.save();

        successResponse(res, {
            coinsRedeemed: actualRedeem,
            newBalance: result.balance,
            reservation: {
                reservationCode: reservation.reservationCode,
                appliedCoinsDiscount: reservation.appliedCoinsDiscount,
                estimatedBillAfterDiscount: reservation.estimatedBillAfterDiscount,
            },
        });
    } catch (err: any) {
        console.error("Redeem error:", err);
        errorResponse(res, "Internal server error", 500);
    }
});

export default router;
