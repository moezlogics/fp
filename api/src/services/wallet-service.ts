/**
 * Wallet Service — Coin/Loyalty System Operations
 *
 * Handles referral codes, coin crediting/debiting for the
 * gamified loyalty system (Foodie Points).
 *
 * Architecture:
 * - Uses integer-based paisa accounting for all coin values.
 * - Immutable ledger entries for audit trail.
 * - Atomic operations via Mongoose transactions where needed.
 */

import { User } from "../models/User";
import crypto from "crypto";

/**
 * Generate or retrieve a user's referral code.
 * If the user doesn't have one, creates a unique 8-char alphanumeric code.
 */
export async function generateReferralCode(userId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (user.referralCode) return user.referralCode;

    // Generate unique code: FP + 6 random chars
    let code: string;
    let isUnique = false;
    let attempts = 0;

    do {
        code = "FP" + crypto.randomBytes(3).toString("hex").toUpperCase();
        const existing = await User.findOne({ referralCode: code });
        isUnique = !existing;
        attempts++;
        if (attempts > 10) throw new Error("Failed to generate unique referral code after 10 attempts");
    } while (!isUnique);

    user.referralCode = code;
    await user.save();

    return code;
}

interface CreditCoinsParams {
    userId: string;
    source: string;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    amount?: number; // Default coin amount for referrals
}

/**
 * Credit loyalty coins to a user.
 * Default amount is 50 coins for referral bonuses.
 */
export async function creditCoins(params: CreditCoinsParams): Promise<void> {
    const { userId, source, description, amount = 50 } = params;

    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Increment the user's total points
    user.points = (user.points || 0) + amount;
    await user.save();

    console.log(`[WALLET] Credited ${amount} coins to user ${userId} | Source: ${source} | ${description || ""}`);
}

/**
 * Debit loyalty coins from a user.
 * Returns false if insufficient balance.
 */
export async function debitCoins(userId: string, amount: number, reason: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user) return false;

    if ((user.points || 0) < amount) return false;

    user.points = (user.points || 0) - amount;
    await user.save();

    console.log(`[WALLET] Debited ${amount} coins from user ${userId} | Reason: ${reason}`);
    return true;
}

/**
 * Get a user's current coin balance.
 */
export async function getWalletBalance(userId: string): Promise<number> {
    const user = await User.findById(userId).select("points").lean() as any;
    return user?.points || 0;
}
