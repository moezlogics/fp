import mongoose, { Schema, Document } from "mongoose";

/**
 * Waitlist — Queue management for fully-booked time slots.
 * When a cancellation happens, the first person on the waitlist
 * gets offered the freed slot (5-minute window to accept).
 * Prime members get priority positioning.
 */

export const WAITLIST_STATUSES = [
    "Waiting",
    "Offered",
    "Confirmed",
    "Expired",
    "Declined",
] as const;

export interface IWaitlist extends Document {
    restaurantId: mongoose.Types.ObjectId;
    date: Date;
    timeSlot: string;
    userId: mongoose.Types.ObjectId;
    pax: number;
    isPrime: boolean;
    position: number;
    status: (typeof WAITLIST_STATUSES)[number];
    offeredAt?: Date;
    offerExpiresAt?: Date; // 5-minute window
    guestName: string;
    guestPhone: string;
}

const WaitlistSchema = new Schema<IWaitlist>(
    {
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },
        date: { type: Date, required: true },
        timeSlot: { type: String, required: true },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        pax: { type: Number, required: true, min: 1 },
        isPrime: { type: Boolean, default: false },
        position: { type: Number, default: 0 },
        status: {
            type: String,
            enum: WAITLIST_STATUSES,
            default: "Waiting",
        },
        offeredAt: { type: Date },
        offerExpiresAt: { type: Date },
        guestName: { type: String, default: "" },
        guestPhone: { type: String, default: "" },
    },
    { timestamps: true }
);

// Sort: Prime first (isPrime desc), then by position (asc)
WaitlistSchema.index({
    restaurantId: 1,
    date: 1,
    timeSlot: 1,
    isPrime: -1,
    position: 1,
});
WaitlistSchema.index({ userId: 1, status: 1 });

export const Waitlist =
    mongoose.models.Waitlist ||
    mongoose.model<IWaitlist>("Waitlist", WaitlistSchema);
