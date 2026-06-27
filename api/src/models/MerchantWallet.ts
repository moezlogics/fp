import mongoose, { Schema, Document } from "mongoose";

/**
 * MerchantWallet — Virtual Escrow Balances for restaurant owners.
 * 
 * Architecture:
 * - All amounts in Paisa (integer accounting).
 * - availableBalancePaisa: Cleared funds ready for withdrawal.
 * - pendingClearancePaisa: Funds from recent transactions (T+2 settlement cycle).
 * - totalEarnedPaisa: Lifetime earnings (never decremented, for auditing).
 * - Uses $inc for all balance updates to prevent race conditions.
 */

export interface IMerchantWallet extends Document {
    merchantId: mongoose.Types.ObjectId;
    availableBalancePaisa: number;
    pendingClearancePaisa: number;
    totalEarnedPaisa: number;
    lastSettlementAt?: Date;
    bankDetails?: {
        bankName: string;
        accountTitle: string;
        accountNumber: string;
        iban: string;
    };
}

const MerchantWalletSchema = new Schema<IMerchantWallet>(
    {
        merchantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
            unique: true,
        },
        availableBalancePaisa: { type: Number, default: 0 },
        pendingClearancePaisa: { type: Number, default: 0 },
        totalEarnedPaisa: { type: Number, default: 0 },
        lastSettlementAt: { type: Date },
        bankDetails: {
            bankName: { type: String },
            accountTitle: { type: String },
            accountNumber: { type: String },
            iban: { type: String },
        },
    },
    { timestamps: true }
);

export const MerchantWallet =
    mongoose.models.MerchantWallet || mongoose.model<IMerchantWallet>("MerchantWallet", MerchantWalletSchema);
