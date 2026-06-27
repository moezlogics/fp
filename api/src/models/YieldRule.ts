import mongoose, { Schema, Document } from "mongoose";

/**
 * YieldRule — owner-defined automation rules that control the dynamic
 * discount percentages applied to time slots.
 *
 * Example: "Every Tuesday and Wednesday, from 3:00 PM to 5:30 PM,
 * apply a 40% discount, effective from March 1 to March 31."
 *
 * The CRON job reads these rules and bulk-inserts TableInventory rows
 * with the correct discountPercent for the next 30 days.
 */

export interface IYieldRule extends Document {
    restaurantId: mongoose.Types.ObjectId;
    name: string; // "Off-Peak Afternoon Deal"
    daysOfWeek: string[]; // ["Monday", "Tuesday", "Wednesday"...]
    timeSlotStart: string; // "15:00"
    timeSlotEnd: string; // "17:30"
    discountPercent: number; // 40
    validFrom: Date;
    validTo: Date;
    priority: number; // higher = takes precedence if rules overlap
    isActive: boolean;
    createdBy: mongoose.Types.ObjectId; // owner or admin
}

const YieldRuleSchema = new Schema<IYieldRule>(
    {
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },
        name: { type: String, required: true },
        daysOfWeek: {
            type: [String],
            required: true,
            enum: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
            ],
        },
        timeSlotStart: { type: String, required: true }, // "15:00"
        timeSlotEnd: { type: String, required: true }, // "17:30"
        discountPercent: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        validFrom: { type: Date, required: true },
        validTo: { type: Date, required: true },
        priority: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

YieldRuleSchema.index({ restaurantId: 1, isActive: 1 });
YieldRuleSchema.index({ restaurantId: 1, validFrom: 1, validTo: 1 });

export const YieldRule =
    mongoose.models.YieldRule ||
    mongoose.model<IYieldRule>("YieldRule", YieldRuleSchema);
