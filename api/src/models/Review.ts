import mongoose, { Schema, Document } from "mongoose";

export interface IReviewReply {
    userId?: mongoose.Types.ObjectId;
    guestName?: string;
    guestEmail?: string;
    text: string;
    isVerified: boolean;
    createdAt: Date;
}

export interface IReview extends Document {
    restaurantId: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    guestName?: string;
    guestEmail?: string;
    deviceId?: string;
    ip?: string;
    // Granular ratings (1-5 each)
    foodRating: number;
    ambianceRating: number;
    serviceRating: number;
    overallRating: number; // computed average of the 3
    text: string;
    photos: string[];
    // Verification
    isVerified: boolean; // true if posted by a logged-in user
    isVerifiedDiner: boolean; // true if user had a "Completed" reservation
    // Owner interaction
    ownerReply?: string;
    ownerReplyDate?: Date;
    // Threaded replies
    replies: IReviewReply[];
    // Engagement
    helpfulCount: number;
    // Moderation
    sentimentScore?: number;
    isFlagged: boolean;
    isVisible: boolean;
}

const ReplySchema = new Schema<IReviewReply>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        guestName: { type: String },
        guestEmail: { type: String },
        text: { type: String, required: true, minlength: 1, maxlength: 1000 },
        isVerified: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const ReviewSchema = new Schema<IReview>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        guestName: { type: String },
        guestEmail: { type: String },
        deviceId: { type: String },
        ip: { type: String },
        foodRating: { type: Number, required: true, min: 1, max: 5 },
        ambianceRating: { type: Number, required: true, min: 1, max: 5 },
        serviceRating: { type: Number, required: true, min: 1, max: 5 },
        overallRating: { type: Number, required: true, min: 1, max: 5 },
        text: { type: String, required: true, minlength: 10 },
        photos: [{ type: String }],
        isVerified: { type: Boolean, default: false },
        isVerifiedDiner: { type: Boolean, default: false },
        ownerReply: { type: String },
        ownerReplyDate: { type: Date },
        replies: [ReplySchema],
        helpfulCount: { type: Number, default: 0 },
        sentimentScore: { type: Number },
        isFlagged: { type: Boolean, default: false },
        isVisible: { type: Boolean, default: true },
    },
    { timestamps: true }
);

ReviewSchema.index({ restaurantId: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1 });

export const Review = mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);
