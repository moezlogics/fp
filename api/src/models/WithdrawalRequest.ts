import mongoose, { Schema, Document } from "mongoose";

/**
 * WithdrawalRequest — Tracks owner withdrawal requests from MerchantWallet.
 *
 * Flow: Owner requests withdrawal → Admin reviews → Admin processes bank transfer → Completed
 * All amounts in Paisa (integer accounting).
 */

export const WITHDRAWAL_STATUSES = [
    "Pending",      // Owner submitted, awaiting admin processing
    "Processing",   // Admin approved, bank transfer in progress
    "Completed",    // Funds transferred successfully
    "Rejected",     // Admin rejected (insufficient balance, fraud, etc.)
] as const;

export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

export interface IWithdrawalRequest extends Document {
    merchantId: mongoose.Types.ObjectId;   // Restaurant ID
    ownerId: mongoose.Types.ObjectId;      // Owner user ID
    amountPaisa: number;
    bankDetails: {
        bankName: string;
        accountTitle: string;
        accountNumber: string;
        iban: string;
    };
    status: WithdrawalStatus;
    processedAt?: Date;
    bankTransferRef?: string;
    rejectionReason?: string;
    notes?: string;
    processedBy?: mongoose.Types.ObjectId; // Admin who processed
}

const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>(
    {
        merchantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        amountPaisa: { type: Number, required: true, min: 10000 }, // Min Rs. 100
        bankDetails: {
            bankName: { type: String, required: true },
            accountTitle: { type: String, required: true },
            accountNumber: { type: String, required: true },
            iban: { type: String, required: true },
        },
        status: {
            type: String,
            enum: WITHDRAWAL_STATUSES,
            default: "Pending",
        },
        processedAt: { type: Date },
        bankTransferRef: { type: String },
        rejectionReason: { type: String },
        notes: { type: String },
        processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

WithdrawalRequestSchema.index({ merchantId: 1, status: 1 });
WithdrawalRequestSchema.index({ ownerId: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ status: 1, createdAt: -1 });

export const WithdrawalRequest =
    mongoose.models.WithdrawalRequest ||
    mongoose.model<IWithdrawalRequest>("WithdrawalRequest", WithdrawalRequestSchema);
