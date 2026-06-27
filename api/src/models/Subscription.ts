import mongoose, { Schema, Document } from "mongoose";

/**
 * Subscription — Individual user subscription records.
 * Tracks active Prime memberships, payment status, and auto-renewal.
 */

export const SUBSCRIPTION_STATUSES = [
    "Pending",
    "Active",
    "PastDue",
    "Failed",
    "Cancelled",
    "Expired",
] as const;

export interface ISubscription extends Document {
    userId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId;
    plan: string; // "SemiAnnual" | "Annual"
    status: (typeof SUBSCRIPTION_STATUSES)[number];
    priceAtPurchase: number;
    currency: string;
    validFrom: Date;
    validTo: Date;
    autoRenew: boolean;
    paymentGateway: string; // "stripe" | "jazzcash" | "easypaisa" | "payfast"
    gatewaySubscriptionId?: string;
    gatewayCustomerId?: string;
    cancelledAt?: Date;
    cancelReason?: string;
    // Prime tracking
    totalSavingsPaisa: number;
    lastRedemptionAt?: Date;
    welcomeBonusGranted: boolean;
}

const SubscriptionSchema = new Schema<ISubscription>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        planId: {
            type: Schema.Types.ObjectId,
            ref: "SubscriptionPlan",
            required: true,
        },
        plan: { type: String, required: true },
        status: {
            type: String,
            enum: SUBSCRIPTION_STATUSES,
            default: "Active",
        },
        priceAtPurchase: { type: Number, required: true },
        currency: { type: String, default: "PKR" },
        validFrom: { type: Date, required: true },
        validTo: { type: Date, required: true },
        autoRenew: { type: Boolean, default: true },
        paymentGateway: { type: String, default: "stripe" },
        gatewaySubscriptionId: { type: String },
        gatewayCustomerId: { type: String },
        cancelledAt: { type: Date },
        cancelReason: { type: String },
        // Prime tracking
        totalSavingsPaisa: { type: Number, default: 0 },
        lastRedemptionAt: { type: Date },
        welcomeBonusGranted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ validTo: 1, status: 1 }); // CRON: expire check

export const Subscription =
    mongoose.models.Subscription ||
    mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
