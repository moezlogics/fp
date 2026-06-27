import mongoose, { Schema, Document } from "mongoose";
import { nanoid } from "nanoid";

/**
 * GiftCard — Digital gift cards that can be purchased, gifted, and redeemed.
 *
 * Flow:
 * 1. User/Corporate buys a gift card → JazzCash payment → GiftCard created with unique PIN.
 * 2. Buyer shares PIN/link with recipient.
 * 3. Recipient redeems PIN → balance credits their WalletLedger as "GiftCard" source.
 * 4. Balance is then usable at FoodiePay checkout.
 *
 * Corporate: Admin creates bulk cards. Each has a unique PIN and is unassigned.
 */

export const GIFT_CARD_STATUSES = ["Active", "Redeemed", "PartiallyRedeemed", "Expired", "Cancelled"] as const;

export interface IGiftCard extends Document {
    pin: string; // Unique 12-char alphanumeric code
    originalBalancePaisa: number; // e.g., 500000 = Rs. 5,000
    remainingBalancePaisa: number;
    status: (typeof GIFT_CARD_STATUSES)[number];

    // Purchase info
    purchasedById?: mongoose.Types.ObjectId; // null for admin-created bulk cards
    purchasePaymentRef?: string;

    // Recipient
    redeemedById?: mongoose.Types.ObjectId;
    redeemedAt?: Date;

    // Metadata
    recipientName?: string; // "For Ahmed's Birthday"
    customMessage?: string; // "Enjoy your dinner!"
    designTemplate?: string; // "birthday" | "eid" | "corporate" | "default"

    // Validity
    validFrom: Date;
    validTo: Date;

    // Corporate
    isCorporate: boolean;
    corporateName?: string; // "Systems Ltd."
    batchId?: string; // Groups bulk-created cards
}

const GiftCardSchema = new Schema<IGiftCard>(
    {
        pin: {
            type: String,
            unique: true,
            default: () => `GC-${nanoid(10).toUpperCase()}`,
        },
        originalBalancePaisa: { type: Number, required: true, min: 10000 }, // Min Rs. 100
        remainingBalancePaisa: { type: Number, required: true },
        status: { type: String, enum: GIFT_CARD_STATUSES, default: "Active" },

        purchasedById: { type: Schema.Types.ObjectId, ref: "User" },
        purchasePaymentRef: { type: String },

        redeemedById: { type: Schema.Types.ObjectId, ref: "User" },
        redeemedAt: { type: Date },

        recipientName: { type: String, default: "" },
        customMessage: { type: String, default: "" },
        designTemplate: { type: String, default: "default" },

        validFrom: { type: Date, default: Date.now },
        validTo: {
            type: Date,
            default: () => {
                const d = new Date();
                d.setFullYear(d.getFullYear() + 1); // 1 year validity
                return d;
            },
        },

        isCorporate: { type: Boolean, default: false },
        corporateName: { type: String },
        batchId: { type: String },
    },
    { timestamps: true }
);

GiftCardSchema.index({ pin: 1 }, { unique: true });
GiftCardSchema.index({ purchasedById: 1 });
GiftCardSchema.index({ redeemedById: 1 });
GiftCardSchema.index({ batchId: 1 });
GiftCardSchema.index({ validTo: 1, status: 1 });

export const GiftCard =
    mongoose.models.GiftCard || mongoose.model<IGiftCard>("GiftCard", GiftCardSchema);
