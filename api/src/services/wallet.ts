/**
 * Wallet Service — Core double-entry accounting logic for Foodie Coins.
 *
 * All coin operations go through this service to ensure consistency.
 * Balance is ALWAYS computed from the ledger, never from a static field.
 */

import mongoose from "mongoose";
import { WalletLedger } from "../models/WalletLedger";
import { RewardConfig } from "../models/RewardConfig";
import { User } from "../models/User";

// Sync enum with frontend WalletSource if needed
export type WalletSource =
    | "Signup"
    | "Referral"
    | "Reservation"
    | "Review"
    | "Refund"
    | "Redemption"
    | "AdminAdjustment";

/**
 * Get user's current wallet balance by summing the ledger.
 */
export async function getWalletBalance(userId: string): Promise<number> {
    const result = await WalletLedger.aggregate([
        { $match: { userId: new (mongoose.Types.ObjectId as any)(userId) } },
        {
            $group: {
                _id: null,
                totalCredits: {
                    $sum: {
                        $cond: [{ $eq: ["$direction", "Credit"] }, "$amount", 0],
                    },
                },
                totalDebits: {
                    $sum: {
                        $cond: [{ $eq: ["$direction", "Debit"] }, "$amount", 0],
                    },
                },
            },
        },
    ]);

    if (!result.length) return 0;
    return Math.max(0, result[0].totalCredits - result[0].totalDebits);
}

/**
 * Credit coins to a user's wallet.
 * Automatically looks up RewardConfig for the coins amount and multiplier.
 */
export async function creditCoins(params: {
    userId: string;
    source: WalletSource;
    referenceType?: string;
    referenceId?: string;
    description: string;
    overrideAmount?: number; // bypass RewardConfig
}): Promise<{ entry: any; balance: number }> {
    let amount = params.overrideAmount || 0;

    // Look up reward config if no override
    if (!params.overrideAmount) {
        const config = await RewardConfig.findOne({
            event: params.source,
            isActive: true,
        });
        if (!config) return { entry: null, balance: await getWalletBalance(params.userId) };

        amount = config.coinsAwarded;

        // Apply multiplier if within promo window
        if (config.multiplier > 1 && config.multiplierValidUntil) {
            if (new Date() < config.multiplierValidUntil) {
                amount = Math.round(amount * config.multiplier);
            }
        }
    }

    if (amount <= 0) return { entry: null, balance: await getWalletBalance(params.userId) };

    const balance = (await getWalletBalance(params.userId)) + amount;

    const entry = await WalletLedger.create({
        userId: params.userId,
        amount,
        direction: "Credit",
        source: params.source,
        referenceType: params.referenceType || "Manual",
        referenceId: params.referenceId ? new (mongoose.Types.ObjectId as any)(params.referenceId) : undefined,
        description: params.description,
        balanceAfter: balance,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 12 months
    });

    // Update user's totalCoinsEarned counter
    await User.findByIdAndUpdate(params.userId, { $inc: { totalCoinsEarned: amount } });

    return { entry, balance };
}

/**
 * Debit coins from a user's wallet.
 * Returns null if insufficient balance.
 */
export async function debitCoins(params: {
    userId: string;
    amount: number;
    source: WalletSource;
    referenceType?: string;
    referenceId?: string;
    description: string;
}): Promise<{ entry: any; balance: number } | null> {
    const currentBalance = await getWalletBalance(params.userId);
    if (currentBalance < params.amount) return null; // insufficient

    const newBalance = currentBalance - params.amount;

    const entry = await WalletLedger.create({
        userId: params.userId,
        amount: params.amount,
        direction: "Debit",
        source: params.source,
        referenceType: params.referenceType || "Manual",
        referenceId: params.referenceId ? new (mongoose.Types.ObjectId as any)(params.referenceId) : undefined,
        description: params.description,
        balanceAfter: newBalance,
    });

    return { entry, balance: newBalance };
}

/**
 * Generate a unique referral code for a user.
 */
export async function generateReferralCode(userId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (user.referralCode) return user.referralCode;

    // Generate code: first 4 chars of name (uppercase) + random 4 digits
    const namePrefix = (user.name || "FOOD")
        .replace(/[^a-zA-Z]/g, "")
        .substring(0, 4)
        .toUpperCase();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `${namePrefix}${randomSuffix}`;

    user.referralCode = code;
    await user.save();

    return code;
}
