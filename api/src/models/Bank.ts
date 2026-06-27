import mongoose, { Schema, Document } from "mongoose";

export interface IBank extends Document {
    name: string;
    slug: string;
    logoUrl?: string;
    color: string; // hex color for UI card bg
    cardTypes: string[]; // ["Platinum", "Gold", "Visa Signature", "Mastercard"]
    isActive: boolean;
    order: number;
}

const BankSchema = new Schema<IBank>(
    {
        name: { type: String, required: true, unique: true },
        slug: { type: String, unique: true, sparse: true },
        logoUrl: { type: String },
        color: { type: String, default: "#1a1a1a" },
        cardTypes: [{ type: String }],
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

BankSchema.index({ isActive: 1, order: 1 });

export const Bank = mongoose.models.Bank || mongoose.model<IBank>("Bank", BankSchema);
