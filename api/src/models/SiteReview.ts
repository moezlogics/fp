import mongoose, { Schema, Document } from "mongoose";

export interface ISiteReview extends Document {
    userId?: mongoose.Types.ObjectId; // optional (if logged in)
    rating: number;       // 1-5 (mapped from emoji reactions)
    phone: string;        // optional
    message: string;      // optional
    ip: string;           // for rate limiting
    userAgent: string;    // client info
    isEdited: boolean;    // admin has edited
    originalRating: number; // preserved original
}

const SiteReviewSchema = new Schema<ISiteReview>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
        rating: { type: Number, required: true, min: 1, max: 5 },
        phone: { type: String, default: "" },
        message: { type: String, default: "" },
        ip: { type: String, default: "" },
        userAgent: { type: String, default: "" },
        isEdited: { type: Boolean, default: false },
        originalRating: { type: Number, default: 0 },
    },
    { timestamps: true }
);

SiteReviewSchema.index({ createdAt: -1 });
SiteReviewSchema.index({ ip: 1, createdAt: -1 });
SiteReviewSchema.index({ userId: 1 });
SiteReviewSchema.index({ rating: 1 });

export const SiteReview = mongoose.models.SiteReview || mongoose.model<ISiteReview>("SiteReview", SiteReviewSchema);
