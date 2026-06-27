import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
    name: string;
    slug: string;
    image: string;
    icon?: string; // emoji or lucide icon name
    description?: string;
    order: number;
    isActive: boolean;
    restaurantCount: number; // cached count, updated periodically
}

const CategorySchema = new Schema<ICategory>(
    {
        name: { type: String, required: true, unique: true },
        slug: { type: String, required: true, unique: true },
        image: { type: String, required: true },
        icon: { type: String },
        description: { type: String },
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        restaurantCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

CategorySchema.index({ slug: 1 });
CategorySchema.index({ isActive: 1, order: 1 });

export const Category = mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);
