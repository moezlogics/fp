import mongoose, { Schema, Document } from "mongoose";

/**
 * PaymentMethod — Tokenized card via PayFast gateway.
 *
 * The user adds a card through PayFast's PCI-compliant hosted checkout.
 * After a successful Rs. 1 verification charge, PayFast returns a
 * permanent instrument_token that we store for future charges.
 *
 * Raw card numbers NEVER touch our servers — PayFast handles all PCI compliance.
 * We only store:
 *   - Display info (masked number, brand, expiry)
 *   - PayFast instrument token for future charges
 *   - User-friendly nickname
 */

export interface IPaymentMethod extends Document {
    userId: mongoose.Types.ObjectId;
    cardNickname: string;              // "My HBL Visa"
    maskedCardNumber: string;          // "**** **** **** 4242"
    cardBrand: string;                 // "visa", "mastercard", "paypak", "unionpay"
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
    payfastInstrumentToken: string;    // Permanent token from PayFast for recurring charges
    payfastTokenCreatedAt: Date;
    isVerified: boolean;               // true after Rs.1 verification succeeds
    createdAt: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        cardNickname: { type: String, required: true, maxlength: 50 },
        maskedCardNumber: { type: String, required: true },  // "**** **** **** 4242"
        cardBrand: {
            type: String,
            required: true,
            enum: ["visa", "mastercard", "paypak", "unionpay", "amex", "other"],
        },
        expiryMonth: { type: Number, required: true, min: 1, max: 12 },
        expiryYear: { type: Number, required: true },
        isDefault: { type: Boolean, default: false },
        payfastInstrumentToken: { type: String, required: true, unique: true },
        payfastTokenCreatedAt: { type: Date, default: Date.now },
        isVerified: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// ── Indexes ──
PaymentMethodSchema.index({ userId: 1 });
PaymentMethodSchema.index({ userId: 1, isDefault: 1 });
PaymentMethodSchema.index({ payfastInstrumentToken: 1 }, { unique: true });

export const PaymentMethod =
    mongoose.models.PaymentMethod ||
    mongoose.model<IPaymentMethod>("PaymentMethod", PaymentMethodSchema);
