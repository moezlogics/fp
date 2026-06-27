/**
 * PlatformSettings Model
 *
 * Singleton document pattern — only ONE settings document ever exists in the collection.
 * Uses a fixed `key: "global"` field with a unique index to enforce this at the DB level.
 *
 * Architecture:
 * - findOneAndUpdate with upsert ensures atomic reads and writes
 * - No risk of duplicate settings documents
 * - All fields have sensible defaults so the platform works even before admin configures anything
 */

import mongoose, { Schema, Document } from "mongoose";

export interface IPlatformSettings extends Document {
    key: string;

    /* ── Platform Identity ── */
    siteName: string;
    tagline: string;
    faviconUrl: string;

    /* ── Logo ── */
    logoUrl: string;
    logoWidthDesktop: number;
    logoHeightDesktop: number;
    logoWidthMobile: number;
    logoHeightMobile: number;

    /* ── Contact ── */
    contactEmail: string;
    contactPhone: string;
    whatsapp: string;

    /* ── Social Media ── */
    facebookUrl: string;
    instagramUrl: string;
    tiktokUrl: string;
    youtubeUrl: string;

    /* ── SEO Defaults ── */
    defaultMetaTitle: string;
    defaultMetaDescription: string;

    /* ── Business ── */
    defaultCommissionPercent: number;
    maintenanceMode: boolean;

    /* ── Homepage Content ── */
    homeContent: string;
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
    {
        key: { type: String, default: "global", unique: true, immutable: true },

        /* Platform Identity */
        siteName: { type: String, default: "Foodies Pakistan" },
        tagline: { type: String, default: "Pakistan's #1 Restaurant Discovery & Booking Platform" },
        faviconUrl: { type: String, default: "" },

        /* Logo */
        logoUrl: { type: String, default: "" },
        logoWidthDesktop: { type: Number, default: 140 },
        logoHeightDesktop: { type: Number, default: 40 },
        logoWidthMobile: { type: Number, default: 100 },
        logoHeightMobile: { type: Number, default: 32 },

        /* Contact */
        contactEmail: { type: String, default: "" },
        contactPhone: { type: String, default: "" },
        whatsapp: { type: String, default: "" },

        /* Social Media */
        facebookUrl: { type: String, default: "" },
        instagramUrl: { type: String, default: "" },
        tiktokUrl: { type: String, default: "" },
        youtubeUrl: { type: String, default: "" },

        /* SEO Defaults */
        defaultMetaTitle: { type: String, default: "Best Restaurants in Pakistan — Foodies Pakistan" },
        defaultMetaDescription: {
            type: String,
            default: "Discover, book, and save at Pakistan's top restaurants. Exclusive bank deals, verified reviews, and instant reservations.",
        },

        /* Business */
        defaultCommissionPercent: { type: Number, default: 0, min: 0, max: 100 },
        maintenanceMode: { type: Boolean, default: false },

        /* Homepage Content (rich HTML from admin) */
        homeContent: { type: String, default: "" },
    },
    { timestamps: true }
);

export const PlatformSettings =
    mongoose.models.PlatformSettings ||
    mongoose.model<IPlatformSettings>("PlatformSettings", PlatformSettingsSchema);

