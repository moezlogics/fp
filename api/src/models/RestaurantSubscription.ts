import mongoose, { Schema, Document } from "mongoose";

export const RESTAURANT_SUBSCRIPTION_STATUSES = [
    "Pending",
    "Active",
    "Failed",
    "Cancelled",
    "Expired",
] as const;

export type RestaurantSubscriptionStatus = (typeof RESTAURANT_SUBSCRIPTION_STATUSES)[number];

export const RESTAURANT_SUBSCRIPTION_PLANS = ["prime", "featured"] as const;
export type RestaurantSubscriptionPlanSlug = (typeof RESTAURANT_SUBSCRIPTION_PLANS)[number];

export interface IRestaurantSubscriptionFeatures {
    zeroPlatformFee: boolean;
    primeBadge: boolean;
    featuredPlacement: boolean;
    verifiedBadge: boolean;
    leadBoost: boolean;
}

export interface IRestaurantSubscription extends Document {
    restaurantId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    planSlug: RestaurantSubscriptionPlanSlug;
    planName: string;
    billingCycle: "Monthly";
    amountPaisa: number;
    status: RestaurantSubscriptionStatus;
    validFrom: Date;
    validTo: Date;
    features: IRestaurantSubscriptionFeatures;
    paymentGateway: string;
    paymentId?: mongoose.Types.ObjectId;
    txnRefNo?: string;
    activatedAt?: Date | null;
    cancelledAt?: Date | null;
    cancelReason?: string;
}

const RestaurantSubscriptionFeaturesSchema = new Schema<IRestaurantSubscriptionFeatures>(
    {
        zeroPlatformFee: { type: Boolean, default: false },
        primeBadge: { type: Boolean, default: false },
        featuredPlacement: { type: Boolean, default: false },
        verifiedBadge: { type: Boolean, default: false },
        leadBoost: { type: Boolean, default: false },
    },
    { _id: false }
);

const RestaurantSubscriptionSchema = new Schema<IRestaurantSubscription>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
        ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        planSlug: { type: String, enum: RESTAURANT_SUBSCRIPTION_PLANS, required: true },
        planName: { type: String, required: true },
        billingCycle: { type: String, enum: ["Monthly"], default: "Monthly" },
        amountPaisa: { type: Number, required: true, min: 0 },
        status: { type: String, enum: RESTAURANT_SUBSCRIPTION_STATUSES, default: "Pending", index: true },
        validFrom: { type: Date, required: true },
        validTo: { type: Date, required: true },
        features: { type: RestaurantSubscriptionFeaturesSchema, required: true },
        paymentGateway: { type: String, default: "payfast" },
        paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
        txnRefNo: { type: String },
        activatedAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },
        cancelReason: { type: String, default: "" },
    },
    { timestamps: true }
);

RestaurantSubscriptionSchema.index({ restaurantId: 1, status: 1, validTo: 1 });
RestaurantSubscriptionSchema.index({ ownerId: 1, status: 1, validTo: 1 });

export const RestaurantSubscription =
    mongoose.models.RestaurantSubscription ||
    mongoose.model<IRestaurantSubscription>("RestaurantSubscription", RestaurantSubscriptionSchema);
