import mongoose, { Schema, Document } from "mongoose";

export interface IArea extends Document {
    name: string;
    slug: string;
    cityId: mongoose.Types.ObjectId;
    citySlug: string; // denormalized for fast queries
    latitude: number;
    longitude: number;
    content?: string;        // Rich HTML content for area page SEO
    featuredImage?: string;  // Featured image for area page
    isActive: boolean;
    restaurantCount: number;
}

const AreaSchema = new Schema<IArea>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true },
        cityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
        citySlug: { type: String, required: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        content: { type: String, default: "" },
        featuredImage: { type: String },
        isActive: { type: Boolean, default: true },
        restaurantCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

AreaSchema.index({ cityId: 1 });
AreaSchema.index({ citySlug: 1, slug: 1 }, { unique: true });

export const Area = mongoose.models.Area || mongoose.model<IArea>("Area", AreaSchema);
