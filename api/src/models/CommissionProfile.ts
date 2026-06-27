import mongoose, { Schema, Document } from "mongoose";

/**
 * CommissionProfile — Per-restaurant commission rate configuration.
 * Admin sets how much the platform takes as a fee from each
 * completed reservation's estimated bill.
 */

export interface ICommissionProfile extends Document {
    restaurantId: mongoose.Types.ObjectId;
    commissionRate: number; // 0.15 = 15%
    effectiveFrom: Date;
    effectiveTo?: Date; // null = indefinite
    notes: string;
    createdBy: mongoose.Types.ObjectId; // admin
}

const CommissionProfileSchema = new Schema<ICommissionProfile>(
    {
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },
        commissionRate: {
            type: Number,
            required: true,
            min: 0,
            max: 1, // 0-100%
            default: 0.03,
        },
        effectiveFrom: { type: Date, required: true, default: Date.now },
        effectiveTo: { type: Date, default: null },
        notes: { type: String, default: "" },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

CommissionProfileSchema.index({ restaurantId: 1, effectiveFrom: -1 });

export const CommissionProfile =
    mongoose.models.CommissionProfile ||
    mongoose.model<ICommissionProfile>("CommissionProfile", CommissionProfileSchema);
