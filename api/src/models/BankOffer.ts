import mongoose, { Schema, Document } from "mongoose";

/**
 * BankOffer — Defines special discounts for specific bank cards.
 * Uses BIN (Bank Identification Number - first 6 digits of card) for detection.
 */
export interface IBankOffer extends Document {
    bankId: mongoose.Types.ObjectId;
    name: string; // "HBL 20% Off Weekend Special"
    binRanges: string[]; // ["450644", "432100", "512345"]
    discountPercent: number; // e.g., 20
    maxDiscountPaisa: number; // e.g., 100000 (1000 PKR)
    minOrderPaisa: number; // e.g., 300000 (3000 PKR)
    isActive: boolean;
    validFrom: Date;
    validTo: Date;
    description: string;
    termsAndConditions: string;
}

const BankOfferSchema = new Schema<IBankOffer>(
    {
        bankId: {
            type: Schema.Types.ObjectId,
            ref: "Bank",
            required: true,
            index: true,
        },
        name: { type: String, required: true },
        binRanges: [
            {
                type: String,
                required: true,
                validate: {
                    validator: function (v: string) {
                        return /^\d{6,8}$/.test(v); // Standard BIN length is 6 to 8 digits
                    },
                    message: "BIN must be a 6 to 8 digit number string.",
                },
            },
        ],
        discountPercent: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        maxDiscountPaisa: {
            type: Number,
            required: true,
            min: 0,
        },
        minOrderPaisa: {
            type: Number,
            default: 0,
            min: 0,
        },
        isActive: { type: Boolean, default: true, index: true },
        validFrom: { type: Date, required: true },
        validTo: { type: Date, required: true },
        description: { type: String, default: "" },
        termsAndConditions: { type: String, default: "" },
    },
    { timestamps: true }
);

// Index to quickly check if a BIN matches any active offer
BankOfferSchema.index({ isActive: 1, validFrom: 1, validTo: 1 });
BankOfferSchema.index({ binRanges: 1 });

export const BankOffer =
    mongoose.models.BankOffer ||
    mongoose.model<IBankOffer>("BankOffer", BankOfferSchema);
