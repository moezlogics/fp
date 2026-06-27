import mongoose, { Schema, Document } from "mongoose";

/**
 * BillSubmission — Records every bill submitted by an owner after a guest dines.
 *
 * Two modes:
 *   FoodiePay  — Owner submits bill → User pays online via checkout.
 *   AtRestaurant — Owner marks the bill as paid in cash/card at the venue.
 *
 * Financial note:
 *   All amounts are stored in PAISA (integer) to eliminate floating-point errors.
 *   Rs. 5,000 = 500_000 paisa.
 */

export const PAYMENT_MODES = ["FoodiePay", "AtRestaurant"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const BILL_STATUSES = [
    "Pending",       // Bill submitted, awaiting user payment (FoodiePay)
    "Paid",          // Fully settled
    "Expired",       // FoodiePay: user didn't pay within 24 hours
    "Disputed",      // Either party disputes the amount
] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export interface IBillSubmission extends Document {
    reservationId: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;

    // ── Bill Info ──
    originalBillPaisa: number;
    paymentMode: PaymentMode;
    billReceiptUrl: string;          // CDN image of physical receipt
    status: BillStatus;

    // ── FoodiePay Discount Breakdown ──
    yieldDiscountPaisa: number;
    primeDiscountPaisa: number;
    bankDiscountPaisa: number;
    coinsDiscountPaisa: number;
    totalDiscountPaisa: number;
    finalAmountPaisa: number;        // What user actually pays

    // ── Cash at Restaurant ──
    cashPaidPaisa: number;           // What user paid at the counter
    bankDealAppliedOffline: boolean;
    bankNameOffline: string;

    // ── Platform Financials ──
    platformFeePaisa: number;        // 3% of originalBill
    platformFeeCollected: boolean;   // true after FoodiePay or monthly invoice

    // ── Timestamps ──
    submittedAt: Date;
    paidAt: Date | null;
    expiresAt: Date | null;          // FoodiePay: 24hr payment window
}

const BillSubmissionSchema = new Schema<IBillSubmission>(
    {
        reservationId: {
            type: Schema.Types.ObjectId,
            ref: "Reservation",
            required: true,
            index: true,
        },
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Bill Info
        originalBillPaisa: { type: Number, required: true, min: 0 },
        paymentMode: { type: String, enum: PAYMENT_MODES, required: true },
        billReceiptUrl: { type: String, default: "" },
        status: { type: String, enum: BILL_STATUSES, default: "Pending" },

        // FoodiePay Breakdown
        yieldDiscountPaisa: { type: Number, default: 0 },
        primeDiscountPaisa: { type: Number, default: 0 },
        bankDiscountPaisa: { type: Number, default: 0 },
        coinsDiscountPaisa: { type: Number, default: 0 },
        totalDiscountPaisa: { type: Number, default: 0 },
        finalAmountPaisa: { type: Number, default: 0 },

        // Cash
        cashPaidPaisa: { type: Number, default: 0 },
        bankDealAppliedOffline: { type: Boolean, default: false },
        bankNameOffline: { type: String, default: "" },

        // Platform Financials
        platformFeePaisa: { type: Number, default: 0 },
        platformFeeCollected: { type: Boolean, default: false },

        // Timestamps
        submittedAt: { type: Date, default: Date.now },
        paidAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// ── Indexes ──
BillSubmissionSchema.index({ restaurantId: 1, status: 1 });
BillSubmissionSchema.index({ userId: 1, status: 1 });
BillSubmissionSchema.index({ reservationId: 1 }, { unique: true }); // one bill per reservation
BillSubmissionSchema.index({ status: 1, expiresAt: 1 }); // CRON: expire unpaid FoodiePay bills

export const BillSubmission =
    mongoose.models.BillSubmission ||
    mongoose.model<IBillSubmission>("BillSubmission", BillSubmissionSchema);
