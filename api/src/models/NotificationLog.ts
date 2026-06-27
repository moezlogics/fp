import mongoose, { Schema, Document } from "mongoose";

/**
 * NotificationLog — Multi-channel notification audit trail.
 * Tracks every notification sent across Email, SMS, WhatsApp, and Push.
 */

export const NOTIFICATION_CHANNELS = [
    "Email",
    "SMS",
    "WhatsApp",
    "Push",
] as const;

export const NOTIFICATION_STATUSES = [
    "Queued",
    "Sent",
    "Delivered",
    "Failed",
    "Bounced",
] as const;

export interface INotificationLog extends Document {
    recipientId: mongoose.Types.ObjectId; // userId or ownerId
    recipientType: "User" | "Owner";
    channel: (typeof NOTIFICATION_CHANNELS)[number];
    templateId: string; // e.g., "booking_confirmed", "waitlist_offer"
    subject?: string;
    status: (typeof NOTIFICATION_STATUSES)[number];
    sentAt?: Date;
    deliveredAt?: Date;
    failReason?: string;
    metadata: Record<string, any>; // template variables
}

const NotificationLogSchema = new Schema<INotificationLog>(
    {
        recipientId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        recipientType: {
            type: String,
            enum: ["User", "Owner"],
            required: true,
        },
        channel: {
            type: String,
            enum: NOTIFICATION_CHANNELS,
            required: true,
        },
        templateId: { type: String, required: true },
        subject: { type: String },
        status: {
            type: String,
            enum: NOTIFICATION_STATUSES,
            default: "Queued",
        },
        sentAt: { type: Date },
        deliveredAt: { type: Date },
        failReason: { type: String },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

NotificationLogSchema.index({ recipientId: 1, createdAt: -1 });
NotificationLogSchema.index({ templateId: 1, status: 1 });
NotificationLogSchema.index({ channel: 1, createdAt: -1 });

export const NotificationLog =
    mongoose.models.NotificationLog ||
    mongoose.model<INotificationLog>("NotificationLog", NotificationLogSchema);
