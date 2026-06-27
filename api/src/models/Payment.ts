import mongoose, { Schema, Document } from "mongoose";

/**
 * Payment Model — Tracks all payment transactions through JazzCash.
 * 
 * Architecture Notes:
 * - All monetary values are stored in Paisa (integer) to avoid floating-point errors.
 * - Uses idempotencyKey to prevent duplicate charges.
 * - Status transitions: INITIATED → SUCCESS | FAILED → REFUNDED
 * - gatewayRef links to JazzCash's own transaction ID for reconciliation.
 */

export interface IPayment extends Document {
    userId: mongoose.Types.ObjectId;
    type: "subscription" | "bill_pay" | "booking_deposit" | "card_verify" | "restaurant_subscription";
    amountPaisa: number;
    status: "INITIATED" | "SUCCESS" | "FAILED" | "REFUNDED";
    txnRefNo: string;         // Our internal reference
    gatewayRef?: string;       // JazzCash's pp_TxnRefNo or response ref
    gatewayResponseCode?: string;
    gatewayResponseMessage?: string;
    orderId: string;           // What this payment is for (subscriptionId, reservationId, etc.)
    description: string;
    idempotencyKey: string;    // Prevents duplicate charges
    callbackPayload?: Record<string, any>; // Full JazzCash callback for audit
    metadata?: Record<string, any>;        // Extra data (planId, etc.)
    completedAt?: Date;
}

const PaymentSchema = new Schema<IPayment>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        type: {
            type: String,
            enum: ["subscription", "bill_pay", "booking_deposit", "card_verify", "restaurant_subscription"],
            required: true,
        },
        amountPaisa: { type: Number, required: true },
        status: {
            type: String,
            enum: ["INITIATED", "SUCCESS", "FAILED", "REFUNDED"],
            default: "INITIATED",
            index: true,
        },
        txnRefNo: { type: String, required: true, unique: true },
        gatewayRef: { type: String },
        gatewayResponseCode: { type: String },
        gatewayResponseMessage: { type: String },
        orderId: { type: String, required: true },
        description: { type: String, default: "" },
        idempotencyKey: { type: String, required: true, unique: true },
        callbackPayload: { type: Schema.Types.Mixed },
        metadata: { type: Schema.Types.Mixed },
        completedAt: { type: Date },
    },
    { timestamps: true }
);

// Compound index for finding user's payments by type
PaymentSchema.index({ userId: 1, type: 1, status: 1 });
// TTL index — clean up abandoned INITIATED payments after 24 hours
PaymentSchema.index(
    { createdAt: 1 },
    {
        expireAfterSeconds: 86400,
        partialFilterExpression: { status: "INITIATED" },
    }
);

export const Payment =
    mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
