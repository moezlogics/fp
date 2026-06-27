import mongoose, { Schema, Document } from "mongoose";

export interface IContactLead extends Document {
    name: string;
    email: string;
    subject: string;
    message: string;
    ip: string;
    userAgent: string;
    status: "new" | "read" | "replied" | "archived";
    adminNotes: string;
    readAt: Date | null;
    repliedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const ContactLeadSchema = new Schema<IContactLead>(
    {
        name: { type: String, required: true, maxlength: 100 },
        email: { type: String, required: true, maxlength: 200 },
        subject: {
            type: String,
            required: true,
            enum: ["booking", "partnership", "feedback", "payment", "other"],
        },
        message: { type: String, required: true, maxlength: 2000 },
        ip: { type: String, default: "" },
        userAgent: { type: String, default: "" },
        status: {
            type: String,
            enum: ["new", "read", "replied", "archived"],
            default: "new",
        },
        adminNotes: { type: String, default: "" },
        readAt: { type: Date, default: null },
        repliedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// Performance indexes
ContactLeadSchema.index({ createdAt: -1 });
ContactLeadSchema.index({ status: 1, createdAt: -1 });
ContactLeadSchema.index({ email: 1 });
ContactLeadSchema.index({ ip: 1, createdAt: -1 });

export const ContactLead =
    mongoose.models.ContactLead ||
    mongoose.model<IContactLead>("ContactLead", ContactLeadSchema);
