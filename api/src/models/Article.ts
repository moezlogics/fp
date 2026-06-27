import mongoose, { Schema, Document } from "mongoose";

export interface IArticle extends Document {
    title: string;
    slug: string;
    content: string; // rich text / markdown
    excerpt: string; // short summary for cards
    coverImage: string;
    author: string;
    cityId?: mongoose.Types.ObjectId;
    citySlug?: string;
    tags: string[];
    linkedRestaurants: mongoose.Types.ObjectId[];
    isPublished: boolean;
    publishedAt?: Date;
    viewCount: number;
    metaTitle?: string;
    metaDescription?: string;
}

const ArticleSchema = new Schema<IArticle>(
    {
        title: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        content: { type: String, required: true },
        excerpt: { type: String, required: true },
        coverImage: { type: String, required: true },
        author: { type: String, required: true },
        cityId: { type: Schema.Types.ObjectId, ref: "City" },
        citySlug: { type: String },
        tags: [{ type: String }],
        linkedRestaurants: [{ type: Schema.Types.ObjectId, ref: "Restaurant" }],
        isPublished: { type: Boolean, default: false },
        publishedAt: { type: Date },
        viewCount: { type: Number, default: 0 },
        metaTitle: { type: String },
        metaDescription: { type: String },
    },
    { timestamps: true }
);

ArticleSchema.index({ slug: 1 });
ArticleSchema.index({ isPublished: 1, publishedAt: -1 });

export const Article = mongoose.models.Article || mongoose.model<IArticle>("Article", ArticleSchema);
