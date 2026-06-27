import mongoose, { Schema, Document } from "mongoose";
import { nanoid } from "nanoid";

/**
 * TableOrder — An order placed via QR code scanning at the restaurant.
 *
 * Flow:
 * 1. Guest scans QR: foodiespakistan.pk/order/{slug}?table={number}
 * 2. Digital menu loads → Guest adds items to cart.
 * 3. Cart is submitted as a TableOrder.
 * 4. Kitchen sees the order in real-time.
 * 5. Guest pays via FoodiePay (all discount layers apply).
 * 6. Guest leaves. No waiter needed for ordering or payment.
 */

export const TABLE_ORDER_STATUSES = [
    "Cart",        // Still adding items
    "Placed",      // Submitted to kitchen
    "Preparing",   // Kitchen acknowledged
    "Served",      // Food delivered to table
    "Completed",   // Paid and done
    "Cancelled",   // Guest cancelled
] as const;

export interface IOrderItem {
    menuItemId: mongoose.Types.ObjectId;
    name: string; // Denormalized for immutability
    pricePaisa: number; // Denormalized
    quantity: number;
    specialInstructions?: string;
}

export interface ITableOrder extends Document {
    orderCode: string;
    restaurantId: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId; // Optional — guest can order without account
    reservationId?: mongoose.Types.ObjectId; // Link to existing reservation if any
    tableNumber: string; // "T-12", "Rooftop-3", etc.
    items: IOrderItem[];
    subtotalPaisa: number; // Sum of all items × quantity
    status: (typeof TABLE_ORDER_STATUSES)[number];
    transactionId?: mongoose.Types.ObjectId; // Links to FoodiePay Transaction after payment
    kitchenNotes?: string;
    placedAt?: Date;
    servedAt?: Date;
    completedAt?: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
    {
        menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
        name: { type: String, required: true },
        pricePaisa: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1, max: 50 },
        specialInstructions: { type: String, default: "" },
    },
    { _id: true }
);

const TableOrderSchema = new Schema<ITableOrder>(
    {
        orderCode: {
            type: String,
            unique: true,
            default: () => `ORD-${nanoid(8).toUpperCase()}`,
        },
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        reservationId: { type: Schema.Types.ObjectId, ref: "Reservation" },
        tableNumber: { type: String, required: true },
        items: { type: [OrderItemSchema], default: [] },
        subtotalPaisa: { type: Number, default: 0 },
        status: {
            type: String,
            enum: TABLE_ORDER_STATUSES,
            default: "Cart",
        },
        transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
        kitchenNotes: { type: String, default: "" },
        placedAt: { type: Date },
        servedAt: { type: Date },
        completedAt: { type: Date },
    },
    { timestamps: true }
);

TableOrderSchema.index({ restaurantId: 1, status: 1 });
TableOrderSchema.index({ userId: 1, status: 1 });
TableOrderSchema.index({ orderCode: 1 }, { unique: true });
TableOrderSchema.index({ restaurantId: 1, tableNumber: 1, status: 1 });

export const TableOrder =
    mongoose.models.TableOrder || mongoose.model<ITableOrder>("TableOrder", TableOrderSchema);
