import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBanner extends Document {
    title?: string;
    subtitle?: string;
    imageUrl: string;
    linkUrl?: string;
    citySlug?: string;  // null/empty = default banner shown everywhere
    order: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const BannerSchema: Schema = new Schema(
    {
        title: { type: String, trim: true },
        subtitle: { type: String, trim: true },
        imageUrl: { type: String, required: true },
        linkUrl: { type: String, trim: true },
        citySlug: { type: String, trim: true, default: null },
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Banner: Model<IBanner> = mongoose.models.Banner || mongoose.model<IBanner>('Banner', BannerSchema);

export default Banner;
