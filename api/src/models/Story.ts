import mongoose, { Document, Schema } from "mongoose";

export interface IStory extends Document {
    restaurantId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    mediaUrl: string;
    mediaType: "image" | "video";
    thumbnailUrl?: string; // Optional, useful for videos
    caption?: string;
    likes: mongoose.Types.ObjectId[];
    likesCount: number;
    viewsCount: number;
    viewers: mongoose.Types.ObjectId[];
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const StorySchema = new Schema<IStory>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        mediaUrl: { type: String, required: true },
        mediaType: { type: String, enum: ["image", "video"], required: true },
        thumbnailUrl: { type: String },
        caption: { type: String, maxlength: 200 },
        likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
        likesCount: { type: Number, default: 0 },
        viewsCount: { type: Number, default: 0 },
        viewers: [{ type: Schema.Types.ObjectId, ref: "User" }],
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

// Compound index for efficient querying by restaurant and expiry
StorySchema.index({ restaurantId: 1, expiresAt: 1 });

// TTL index to automatically delete documents when expiresAt is reached
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Story = mongoose.model<IStory>("Story", StorySchema);
