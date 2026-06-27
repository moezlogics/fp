import mongoose, { Schema, Document } from "mongoose";
import { nanoid } from "nanoid";

/**
 * VoucherPurchase — Individual voucher purchase records.
 * Each purchase gets a unique QR code for redemption at the restaurant.
 */

export const VOUCHER_PURCHASE_STATUSES = [
    "Purchased",
    "Redeemed",
    "Expired",
    "Refunded",
] as const;

export interface IVoucherPurchase extends Document {
    voucherId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    qrCode: string;
    status: (typeof VOUCHER_PURCHASE_STATUSES)[number];
    pricePaid: number;
    purchasedAt: Date;
    redeemedAt?: Date;
    paymentRef?: string;
}

const VoucherPurchaseSchema = new Schema<IVoucherPurchase>(
    {
        voucherId: {
            type: Schema.Types.ObjectId,
            ref: "Voucher",
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },
        qrCode: {
            type: String,
            unique: true,
            default: () => `VCH-${nanoid(12).toUpperCase()}`,
        },
        status: {
            type: String,
            enum: VOUCHER_PURCHASE_STATUSES,
            default: "Purchased",
        },
        pricePaid: { type: Number, required: true },
        purchasedAt: { type: Date, default: Date.now },
        redeemedAt: { type: Date },
        paymentRef: { type: String },
    },
    { timestamps: true }
);

VoucherPurchaseSchema.index({ userId: 1, status: 1 });
VoucherPurchaseSchema.index({ qrCode: 1 }, { unique: true });
VoucherPurchaseSchema.index({ restaurantId: 1, status: 1 });

export const VoucherPurchase =
    mongoose.models.VoucherPurchase ||
    mongoose.model<IVoucherPurchase>("VoucherPurchase", VoucherPurchaseSchema);
