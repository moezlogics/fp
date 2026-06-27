import mongoose, { Schema, Document } from "mongoose";

/**
 * TableInventory — represents available seating capacity for a specific
 * restaurant, date, and 30-minute time slot. The Yield Engine populates
 * these rows 30 days in advance using the restaurant's YieldRules.
 *
 * Key design decisions:
 * - `bookedCovers` and `heldCovers` use Mongo atomic `$inc` to prevent
 *   double-booking under concurrency.
 * - `discountPercent` is either auto-populated from YieldRules or manually
 *   overridden by the owner via the Yield Calendar UI.
 */

export interface ITableInventory extends Document {
    restaurantId: mongoose.Types.ObjectId;
    date: Date;
    timeSlot: string; // "19:00", "19:30", "20:00", etc.
    maxCovers: number; // total pax capacity for this slot
    bookedCovers: number; // confirmed pax
    heldCovers: number; // temporarily locked pax (Draft reservations)
    discountPercent: number; // EFFECTIVE yield discount for this slot (0-100); surge may reduce it
    baseDiscountPercent?: number; // pre-surge base — surge computes from THIS so it never ratchets down
    isBlocked: boolean; // owner can block a slot entirely
    isManualOverride: boolean; // true if owner manually set the discount
}

const TableInventorySchema = new Schema<ITableInventory>(
    {
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },
        date: { type: Date, required: true },
        timeSlot: { type: String, required: true }, // "19:00"
        maxCovers: { type: Number, required: true, default: 20 },
        bookedCovers: { type: Number, default: 0 },
        heldCovers: { type: Number, default: 0 },
        discountPercent: { type: Number, default: 0, min: 0, max: 100 },
        baseDiscountPercent: { type: Number, min: 0, max: 100 },
        isBlocked: { type: Boolean, default: false },
        isManualOverride: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// ── Compound unique index: one slot per restaurant per date per time ──
TableInventorySchema.index(
    { restaurantId: 1, date: 1, timeSlot: 1 },
    { unique: true }
);
// ── Fast lookups for a restaurant's full day ──
TableInventorySchema.index({ restaurantId: 1, date: 1, isBlocked: 1, timeSlot: 1 });
TableInventorySchema.index({ restaurantId: 1, date: 1 });

// ── Virtual: available covers ──
TableInventorySchema.virtual("availableCovers").get(function () {
    return Math.max(0, this.maxCovers - this.bookedCovers - this.heldCovers);
});

// ── Virtual: occupancy percentage ──
TableInventorySchema.virtual("occupancyPercent").get(function () {
    if (this.maxCovers === 0) return 100;
    return Math.round(
        ((this.bookedCovers + this.heldCovers) / this.maxCovers) * 100
    );
});

TableInventorySchema.set("toJSON", { virtuals: true });

export const TableInventory =
    mongoose.models.TableInventory ||
    mongoose.model<ITableInventory>("TableInventory", TableInventorySchema);
