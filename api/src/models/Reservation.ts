import mongoose, { Schema, Document } from "mongoose";
import { nanoid } from "nanoid";

/**
 * Reservation — the core transactional model of the platform.
 *
 * State Machine:
 *   Draft → Confirmed → Seated → Completed
 *                ↘ CancelledByUser / CancelledByOwner
 *   Draft → (expired, auto-deleted by CRON)
 *   Confirmed → NoShow (auto-marked by CRON if not seated within 20 min)
 *
 * Financial Snapshot:
 *   At booking time, we capture the exact discounts applied so the
 *   restaurant and user both have an immutable record of the deal.
 */

export const RESERVATION_STATUSES = [
    "Draft",
    "Confirmed",
    "Seated",
    "Completed",
    "NoShow",
    "CancelledByUser",
    "CancelledByOwner",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const OCCASIONS = [
    "None",
    "Birthday",
    "Anniversary",
    "Business",
    "Date",
    "Family",
    "Celebration",
] as const;

export type Occasion = (typeof OCCASIONS)[number];

export interface IReservation extends Document {
    reservationCode: string;
    userId: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    date: Date;
    timeSlot: string; // "19:30"
    pax: number; // party size
    status: ReservationStatus;
    lockExpiresAt: Date | null; // Draft reservations expire after 3 min

    // ── Financial snapshot (captured at booking time) ──
    appliedYieldDiscount: number; // e.g., 30 (%)
    appliedBankDiscount: number; // e.g., 15 (%)
    appliedPrimeDiscount: number; // e.g., 15 (%)
    appliedCoinsDiscount: number; // e.g., 200 (PKR equivalent)
    estimatedBillBeforeDiscount: number;
    estimatedBillAfterDiscount: number;

    // ── Guest details ──
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    specialRequests: string;
    occasion: Occasion;

    // ── Loyalty ──
    coinsEarned: number; // awarded after Completed

    // ── Owner/Staff notes ──
    ownerNotes: string;

    // ── Timestamps for state transitions ──
    confirmedAt: Date | null;
    seatedAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    cancelReason: string;

    // ── No-show tracking ──
    isNoShowPenaltyApplied: boolean;

    // ── Post-Dining Bill ──
    paymentMode: "FoodiePay" | "AtRestaurant" | "Pending";
    billSubmittedAt: Date | null;
    billAmountPaisa: number;
}

const ReservationSchema = new Schema<IReservation>(
    {
        reservationCode: {
            type: String,
            unique: true,
            default: () => `FP-${nanoid(8).toUpperCase()}`,
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
        date: { type: Date, required: true },
        timeSlot: { type: String, required: true },
        pax: { type: Number, required: true, min: 1, max: 50 },
        status: {
            type: String,
            enum: RESERVATION_STATUSES,
            default: "Draft",
        },
        lockExpiresAt: { type: Date, default: null },

        // Financial snapshot
        appliedYieldDiscount: { type: Number, default: 0 },
        appliedBankDiscount: { type: Number, default: 0 },
        appliedPrimeDiscount: { type: Number, default: 0 },
        appliedCoinsDiscount: { type: Number, default: 0 },
        estimatedBillBeforeDiscount: { type: Number, default: 0 },
        estimatedBillAfterDiscount: { type: Number, default: 0 },

        // Guest
        guestName: { type: String, default: "" },
        guestPhone: { type: String, default: "" },
        guestEmail: { type: String },
        specialRequests: { type: String, default: "" },
        occasion: { type: String, enum: OCCASIONS, default: "None" },

        // Loyalty
        coinsEarned: { type: Number, default: 0 },

        // Owner
        ownerNotes: { type: String, default: "" },

        // State transition timestamps
        confirmedAt: { type: Date, default: null },
        seatedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },
        cancelReason: { type: String, default: "" },

        // No-show
        isNoShowPenaltyApplied: { type: Boolean, default: false },

        // Post-Dining Bill
        paymentMode: { type: String, enum: ["FoodiePay", "AtRestaurant", "Pending"], default: "Pending" },
        billSubmittedAt: { type: Date, default: null },
        billAmountPaisa: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// ── Indexes for performance ──
ReservationSchema.index({ userId: 1, status: 1 });
ReservationSchema.index({ restaurantId: 1, date: 1, timeSlot: 1 });
ReservationSchema.index({ restaurantId: 1, status: 1, date: 1 });
ReservationSchema.index({ status: 1, lockExpiresAt: 1 }); // CRON: expired drafts
ReservationSchema.index({ status: 1, date: -1, restaurantId: 1 });
ReservationSchema.index({ reservationCode: 1 }, { unique: true });

export const Reservation =
    mongoose.models.Reservation ||
    mongoose.model<IReservation>("Reservation", ReservationSchema);
