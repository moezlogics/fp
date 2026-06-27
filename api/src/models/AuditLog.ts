import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
    action: string;
    adminId: mongoose.Types.ObjectId;
    adminEmail: string;
    targetUserId?: mongoose.Types.ObjectId;
    targetUserEmail?: string;
    targetRole?: string;
    ip: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        action: { type: String, required: true, index: true },
        adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        adminEmail: { type: String, required: true },
        targetUserId: { type: Schema.Types.ObjectId, ref: "User" },
        targetUserEmail: { type: String },
        targetRole: { type: String },
        ip: { type: String, required: true },
        userAgent: { type: String },
        metadata: { type: Schema.Types.Mixed },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// TTL index: auto-delete after 1 year
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
