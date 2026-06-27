import mongoose, { Schema, Document } from "mongoose";

/**
 * RewardConfig — Admin-managed configuration for coin rewards.
 * Defines how many Foodie Coins are awarded for each action.
 *
 * Admin can toggle rewards on/off, adjust amounts, and create
 * temporary promotional multipliers (e.g., "Double coins weekend").
 */

export interface IRewardConfig extends Document {
    event: string; // "Signup" | "Booking" | "Review" | "PhotoReview" | "Referral"
    coinsAwarded: number;
    isActive: boolean;
    description: string;
    multiplier: number; // 1 = normal, 2 = double coins promo
    multiplierValidUntil?: Date;
}

const RewardConfigSchema = new Schema<IRewardConfig>(
    {
        event: {
            type: String,
            required: true,
            unique: true,
            enum: [
                "Signup",
                "Booking",
                "Review",
                "PhotoReview",
                "Referral",
                "ReferralFirstBooking",
            ],
        },
        coinsAwarded: { type: Number, required: true, default: 10 },
        isActive: { type: Boolean, default: true },
        description: { type: String, default: "" },
        multiplier: { type: Number, default: 1 },
        multiplierValidUntil: { type: Date },
    },
    { timestamps: true }
);

RewardConfigSchema.index({ event: 1 }, { unique: true });

export const RewardConfig =
    mongoose.models.RewardConfig ||
    mongoose.model<IRewardConfig>("RewardConfig", RewardConfigSchema);
