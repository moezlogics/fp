import mongoose, { Schema, Document } from "mongoose";

export interface ISeoPage extends Document {
    type:
        | "city-category"
        | "city-area"
        | "area-category"
        | "city-deals"
        | "city-bank-deals";
    citySlug: string;
    cityName: string;
    areaSlug: string | null;
    areaName: string | null;
    categorySlug: string | null;
    categoryName: string | null;
    bankSlug: string | null;
    bankName: string | null;
    combinationSlug: string; // unique key e.g. "lahore/bbq", "lahore/deals", "lahore/deals/hbl"
    title: string;
    metaDescription: string;
    content: string; // Rich HTML content
    featuredImage: string; // CDN URL for featured image
    isPublished: boolean;
    isCustomized: boolean; // admin has manually edited
}

const SeoPageSchema = new Schema<ISeoPage>(
    {
        type: {
            type: String,
            enum: [
                "city-category",
                "city-area",
                "area-category",
                "city-deals",
                "city-bank-deals",
            ],
            required: true,
        },
        citySlug: { type: String, required: true },
        cityName: { type: String, required: true },
        areaSlug: { type: String, default: null },
        areaName: { type: String, default: null },
        categorySlug: { type: String, default: null },
        categoryName: { type: String, default: null },
        bankSlug: { type: String, default: null },
        bankName: { type: String, default: null },
        combinationSlug: { type: String, required: true, unique: true },
        title: { type: String, default: "" },
        metaDescription: { type: String, default: "" },
        content: { type: String, default: "" },
        featuredImage: { type: String, default: "" },
        isPublished: { type: Boolean, default: true },
        isCustomized: { type: Boolean, default: false },
    },
    { timestamps: true }
);

SeoPageSchema.index({ type: 1, citySlug: 1 });
SeoPageSchema.index({ combinationSlug: 1 }, { unique: true });
SeoPageSchema.index({ citySlug: 1, categorySlug: 1 });
SeoPageSchema.index({ citySlug: 1, areaSlug: 1 });
SeoPageSchema.index({ citySlug: 1, areaSlug: 1, categorySlug: 1 });
SeoPageSchema.index({ citySlug: 1, bankSlug: 1 });
SeoPageSchema.index({ type: 1, citySlug: 1, bankSlug: 1 });

export const SeoPage = mongoose.models.SeoPage || mongoose.model<ISeoPage>("SeoPage", SeoPageSchema);
