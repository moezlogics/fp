import mongoose, { Schema, Document } from "mongoose";

/**
 * WalletLedger — Strict Double-Entry Accounting for Foodie Coins.
 *
 * RULE: The user's wallet balance is NEVER stored as a static field.
 * It is ALWAYS computed as SUM(Credit amounts) - SUM(Debit amounts).
 * This prevents fraud, race conditions, and calculation drift.
 *
 * Every transaction creates exactly ONE ledger entry (Credit or Debit).
 * The `balanceAfter` field is a convenience snapshot, but the real
 * source of truth is always the aggregate sum.
 */

export const WALLET_SOURCES = [
    "Signup",
    "Booking",
    "Review",
    "PhotoReview",
    "Referral",
    "Redemption",
    "Expiry",
    "AdminAdjustment",
    "Refund",
    "PromoBonus",
] as const;

export type WalletSource = (typeof WALLET_SOURCES)[number];

export interface IWalletLedger extends Document {
    userId: mongoose.Types.ObjectId;
    amount: number; // always positive
    direction: "Credit" | "Debit";
    source: WalletSource;
    referenceType: string; // "Reservation" | "Review" | "User" | "Manual"
    referenceId?: mongoose.Types.ObjectId;
    description: string;
    balanceAfter: number; // snapshot after this transaction
    expiresAt?: Date; // coins expire after 12 months if unused
}

const WalletLedgerSchema = new Schema<IWalletLedger>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        amount: { type: Number, required: true, min: 0 },
        direction: {
            type: String,
            enum: ["Credit", "Debit"],
            required: true,
        },
        source: {
            type: String,
            enum: WALLET_SOURCES,
            required: true,
        },
        referenceType: { type: String, default: "Manual" },
        referenceId: { type: Schema.Types.ObjectId },
        description: { type: String, required: true },
        balanceAfter: { type: Number, default: 0 },
        expiresAt: { type: Date },
    },
    { timestamps: true }
);

// Fast user ledger queries
WalletLedgerSchema.index({ userId: 1, createdAt: -1 });
// CRON: find expiring coins
WalletLedgerSchema.index({ direction: 1, expiresAt: 1 });
// Audit by source
WalletLedgerSchema.index({ userId: 1, source: 1 });

export const WalletLedger =
    mongoose.models.WalletLedger ||
    mongoose.model<IWalletLedger>("WalletLedger", WalletLedgerSchema);
