import mongoose, { Schema, Document } from "mongoose";

/**
 * Transaction Model — Immutable Escrow Ledger for FoodiePay.
 * 
 * Architecture:
 * - All amounts are in Paisa (1 PKR = 100 Paisa) to prevent floating-point errors.
 * - Each transaction is a permanent, immutable record.
 * - idempotencyKey prevents duplicate charges from concurrent requests.
 * - The lifecycle is: PENDING → SUCCESS | FAILED → REFUNDED
 */

export interface ITransaction extends Document {
    userId: mongoose.Types.ObjectId;
    merchantId: mongoose.Types.ObjectId;      // Restaurant ObjectId
    reservationId?: mongoose.Types.ObjectId;   // Optional link to table booking
    bankOfferId?: mongoose.Types.ObjectId;     // Optional link to the applied BankOffer

    // ── Bill Breakdown (all in Paisa) ──
    originalBillPaisa: number;
    tableDealDiscountPaisa: number;            // Discount from yield/time-slot deal
    subscriptionDiscountPaisa: number;         // Discount from Prime subscription
    bankDiscountPaisa: number;                 // Discount from Bank Offer
    coinsRedeemed: number;                     // Quantity of Foodie Coins burned
    coinDiscountPaisa: number;                 // Equivalent discount from coins in Paisa
    totalDiscountPaisa: number;                // Sum of all 4 discount layers
    amountPaidPaisa: number;                   // What the user actually paid via gateway
    coinsEarned: number;                       // Foodie Coins awarded for this transaction

    // ── Platform Economics (all in Paisa) ──
    platformFeePaisa: number;                  // Our commission
    netMerchantPaisa: number;                  // What goes into MerchantWallet

    // ── Metadata ──
    discountMethod: "exclusive" | "stacked";   // Which discount rule was applied
    effectiveDiscountPercent: number;           // Final effective % for audit

    // ── Status ──
    status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
    gatewayRef: string;                        // JazzCash transaction ID
    idempotencyKey: string;

    completedAt?: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        merchantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
        reservationId: { type: Schema.Types.ObjectId, ref: "Reservation" },
        bankOfferId: { type: Schema.Types.ObjectId, ref: "BankOffer" },

        originalBillPaisa: { type: Number, required: true },
        tableDealDiscountPaisa: { type: Number, default: 0 },
        subscriptionDiscountPaisa: { type: Number, default: 0 },
        bankDiscountPaisa: { type: Number, default: 0 },
        coinsRedeemed: { type: Number, default: 0 },
        coinDiscountPaisa: { type: Number, default: 0 },
        totalDiscountPaisa: { type: Number, default: 0 },
        amountPaidPaisa: { type: Number, required: true },
        coinsEarned: { type: Number, default: 0 },

        platformFeePaisa: { type: Number, default: 0 },
        netMerchantPaisa: { type: Number, default: 0 },

        discountMethod: { type: String, enum: ["exclusive", "stacked"], default: "exclusive" },
        effectiveDiscountPercent: { type: Number, default: 0 },

        status: {
            type: String,
            enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
            default: "PENDING",
            index: true,
        },
        gatewayRef: { type: String, default: "" },
        idempotencyKey: { type: String, required: true, unique: true },

        completedAt: { type: Date },
    },
    { timestamps: true }
);

// Compound indexes for reporting
TransactionSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
TransactionSchema.index({ userId: 1, createdAt: -1 });

export const Transaction =
    mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", TransactionSchema);
