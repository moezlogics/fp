import mongoose, { Schema, Document } from "mongoose";

/**
 * Deal — Restaurant-specific bank deals & offers.
 *
 * Architecture:
 * - Owner creates deals linking their restaurant to specific banks
 * - Each deal defines discount %, validity, applicable card types, days
 * - `applicableOn` determines if the deal works online (FoodiesPay), dine-in, or both
 * - When a booking is made via FoodiesPay, the system matches card BIN → Bank →
 *   checks if restaurant has a Deal for that bank → applies discount
 * - For dine-in, owner sees the deal card and asks customer which bank card they have
 *
 * The `bankId` field is optional — if null, it's a generic walk-in/promotional deal
 * (e.g., "Flat 20% off on weekdays")
 */
export interface IDeal extends Document {
    restaurantId: mongoose.Types.ObjectId;
    bankId?: mongoose.Types.ObjectId;         // null = general deal (no bank required)
    cardTypes: string[];                       // e.g. ["Platinum", "Gold"] — empty = all card types
    discountPercent: number;
    maxDiscountCapPaisa: number;               // max discount in paisa (0 = no cap)
    minSpendPaisa: number;                     // minimum bill in paisa (0 = no minimum)
    daysValid: string[];                       // e.g. ["Monday","Tuesday"] — empty = all days
    applicableOn: "online" | "dine-in" | "both"; // where the deal applies
    description: string;
    validFrom?: Date;
    validTo?: Date;
    isActive: boolean;
}

const DealSchema = new Schema<IDeal>(
    {
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
            index: true,
        },
        bankId: {
            type: Schema.Types.ObjectId,
            ref: "Bank",
            default: null,
        },
        cardTypes: [{ type: String }],         // empty array = all card types accepted
        discountPercent: {
            type: Number,
            required: true,
            min: 1,
            max: 100,
        },
        maxDiscountCapPaisa: {
            type: Number,
            default: 0,                        // 0 = no cap
            min: 0,
        },
        minSpendPaisa: {
            type: Number,
            default: 0,
            min: 0,
        },
        daysValid: [{ type: String }],         // empty array = all days
        applicableOn: {
            type: String,
            enum: ["online", "dine-in", "both"],
            default: "both",
        },
        description: { type: String, default: "" },
        validFrom: { type: Date },
        validTo: { type: Date },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Compound index for efficient lookups by restaurant + active status
DealSchema.index({ restaurantId: 1, isActive: 1 });
DealSchema.index({ restaurantId: 1, bankId: 1 });

export const Deal = mongoose.models.Deal || mongoose.model<IDeal>("Deal", DealSchema);
