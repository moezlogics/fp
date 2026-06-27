import mongoose, { Schema, Document } from "mongoose";

/**
 * Voucher — Prepay dining voucher definitions created by restaurant owners.
 * E.g., "Ramadan Iftar Buffet — Pre-buy at Rs. 1500, worth Rs. 2500"
 */

export interface IVoucher extends Document {
    restaurantId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    originalPrice: number;
    salePrice: number;
    totalQuantity: number;
    soldQuantity: number;
    redeemedQuantity: number;
    validFrom: Date;
    validTo: Date;
    termsAndConditions: string;
    coverImage?: string;
    isActive: boolean;
}

const VoucherSchema = new Schema<IVoucher>(
    {
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },
        title: { type: String, required: true },
        description: { type: String, default: "" },
        originalPrice: { type: Number, required: true },
        salePrice: { type: Number, required: true },
        totalQuantity: { type: Number, required: true, default: 100 },
        soldQuantity: { type: Number, default: 0 },
        redeemedQuantity: { type: Number, default: 0 },
        validFrom: { type: Date, required: true },
        validTo: { type: Date, required: true },
        termsAndConditions: { type: String, default: "" },
        coverImage: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

VoucherSchema.index({ restaurantId: 1, isActive: 1 });
VoucherSchema.index({ validTo: 1, isActive: 1 });

export const Voucher =
    mongoose.models.Voucher ||
    mongoose.model<IVoucher>("Voucher", VoucherSchema);
