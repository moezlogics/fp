import mongoose, { Schema, Document } from "mongoose";

export interface ICity extends Document {
    name: string;
    slug: string;
    latitude: number;
    longitude: number;
    image?: string;
    content?: string;        // Rich HTML content for city page SEO
    featuredImage?: string;  // Featured image for city page
    order: number;
    isActive: boolean;
    restaurantCount: number;
}

const CitySchema = new Schema<ICity>(
    {
        name: { type: String, required: true, unique: true },
        slug: { type: String, required: true, unique: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        image: { type: String },
        content: { type: String, default: "" },
        featuredImage: { type: String },
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        restaurantCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

CitySchema.index({ slug: 1 });
CitySchema.index({ isActive: 1, order: 1 });

export const City = mongoose.models.City || mongoose.model<ICity>("City", CitySchema);
