import mongoose, { Schema, Document } from "mongoose";

/**
 * PrimeRedemption — Immutable ledger of every Prime discount usage.
 *
 * Records whether the discount was applied via:
 *   - "booking"       → Auto-applied from Reservation.appliedPrimeDiscount
 *   - "walk-in-otp"   → Verified via email OTP at restaurant
 *
 * This ledger serves three purposes:
 *   1. Financial audit trail (immutable)
 *   2. Anti-fraud analytics (detect abuse patterns)
 *   3. User savings dashboard ("You saved Rs. X with Prime!")
 *
 * All amounts in PAISA (integer).
 */

export const VERIFICATION_METHODS = [
    "booking",
    "walk-in-otp",
] as const;

export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export interface IPrimeRedemption extends Document {
    userId: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    reservationId?: mongoose.Types.ObjectId;   // null for walk-ins
    subscriptionId: mongoose.Types.ObjectId;

    // Snapshot at time of redemption
    originalBillPaisa: number;
    primeDiscountPercent: number;
    primeDiscountPaisa: number;

    // Verification method
    verificationMethod: VerificationMethod;
    verifiedByOwnerId?: mongoose.Types.ObjectId;

    // Timestamps
    redeemedAt: Date;
}

const PrimeRedemptionSchema = new Schema<IPrimeRedemption>(
    {
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
        reservationId: {
            type: Schema.Types.ObjectId,
            ref: "Reservation",
        },
        subscriptionId: {
            type: Schema.Types.ObjectId,
            ref: "Subscription",
            required: true,
        },

        // Financial snapshot
        originalBillPaisa: { type: Number, required: true, min: 0 },
        primeDiscountPercent: { type: Number, required: true, min: 0 },
        primeDiscountPaisa: { type: Number, required: true, min: 0 },

        // Verification
        verificationMethod: {
            type: String,
            enum: VERIFICATION_METHODS,
            required: true,
        },
        verifiedByOwnerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        // Timestamps
        redeemedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// ── Indexes ──
PrimeRedemptionSchema.index({ userId: 1, redeemedAt: -1 });       // User savings history
PrimeRedemptionSchema.index({ restaurantId: 1, redeemedAt: -1 }); // Restaurant audit
PrimeRedemptionSchema.index({ userId: 1, restaurantId: 1 });       // Velocity check
PrimeRedemptionSchema.index({ subscriptionId: 1 });                // Subscription audit

export const PrimeRedemption =
    mongoose.models.PrimeRedemption ||
    mongoose.model<IPrimeRedemption>("PrimeRedemption", PrimeRedemptionSchema);
