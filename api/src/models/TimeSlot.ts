import mongoose, { Schema, Document } from "mongoose";

export interface ITimeSlot extends Document {
    restaurantId: mongoose.Types.ObjectId;
    date: string; // e.g. YYYY-MM-DD
    time: string; // e.g. "15:00"
    discountPercent: number; // e.g. 50%
    availableSeats: number; // e.g. 4
    active: boolean;
}

const TimeSlotSchema = new Schema<ITimeSlot>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        date: { type: String, required: true },
        time: { type: String, required: true },
        discountPercent: { type: Number, required: true },
        availableSeats: { type: Number, required: true },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

TimeSlotSchema.index({ restaurantId: 1, date: 1, time: 1 }, { unique: true });

export const TimeSlot = mongoose.models.TimeSlot || mongoose.model<ITimeSlot>("TimeSlot", TimeSlotSchema);
