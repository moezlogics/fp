import mongoose, { Schema, Document } from "mongoose";

/**
 * SubscriptionPlan — Admin-configurable plan definitions.
 * Defines what users can subscribe to and what benefits they get.
 */

export const PLAN_DURATIONS = ["SemiAnnual", "Annual"] as const;

export const BENEFIT_TYPES = [
    "ExtraDiscount",
    "FreeBookingFee",
    "PriorityWaitlist",
    "FreeDrink",
    "ExclusiveAccess",
    "DoubleCoins",
] as const;

export interface IPlanBenefit {
    type: (typeof BENEFIT_TYPES)[number];
    value: number; // e.g., 15 for 15% extra discount
    label: string; // "15% extra discount on all bookings"
}

export interface ISubscriptionPlan extends Document {
    name: string;
    slug: string;
    duration: (typeof PLAN_DURATIONS)[number];
    durationMonths: number;
    price: number;
    currency: string;
    benefits: IPlanBenefit[];
    isActive: boolean;
    displayOrder: number;
    highlightText?: string; // "Best Value"
}

const PlanBenefitSchema = new Schema<IPlanBenefit>(
    {
        type: { type: String, enum: BENEFIT_TYPES, required: true },
        value: { type: Number, required: true },
        label: { type: String, required: true },
    },
    { _id: false }
);

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        duration: { type: String, enum: PLAN_DURATIONS, required: true },
        durationMonths: { type: Number, required: true, min: 1, max: 24 },
        price: { type: Number, required: true },
        currency: { type: String, default: "PKR" },
        benefits: { type: [PlanBenefitSchema], default: [] },
        isActive: { type: Boolean, default: true },
        displayOrder: { type: Number, default: 0 },
        highlightText: { type: String },
    },
    { timestamps: true }
);

SubscriptionPlanSchema.index({ slug: 1 }, { unique: true });
SubscriptionPlanSchema.index({ isActive: 1, displayOrder: 1 });

export const SubscriptionPlan =
    mongoose.models.SubscriptionPlan ||
    mongoose.model<ISubscriptionPlan>("SubscriptionPlan", SubscriptionPlanSchema);
