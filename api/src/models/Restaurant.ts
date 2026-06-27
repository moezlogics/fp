import mongoose, { Schema, Document } from "mongoose";

/* ── Sub-document interfaces ── */

export interface IOpeningHour {
    day: string; // "Monday", "Tuesday", etc.
    open: string; // "09:00"
    close: string; // "23:00"
    isClosed: boolean;
}

export interface ISpecialOverride {
    label: string; // "Ramadan Sehri", "Eid ul Fitr Day 1"
    date?: string;
    open?: string;
    close?: string;
    isClosed: boolean;
}

/* ── Booking Settings sub-document ── */
export interface ICoversPerSlot {
    lunch: number;       // 12:00-15:00
    afternoon: number;   // 15:00-18:00
    dinner: number;      // 18:00-23:00
}

export const SLOT_DURATIONS = [15, 30, 60] as const;
export const BANK_DEAL_CASH_MODES = ["trust", "last4", "disabled"] as const;

export interface IBookingSettings {
    isBookingEnabled: boolean;
    isPrimePartner: boolean;       // Zero platform fee if true
    slotDurationMinutes: number;   // 15 | 30 | 60
    maxPartySize: number;
    minPartySize: number;
    maxAdvanceBookingDays: number;
    autoConfirm: boolean;
    cancellationWindowMinutes: number; // 360 = 6 hours
    bookableDays: string[];        // ["Monday","Tuesday"...]
    bookableTimeStart: string;     // "12:00"
    bookableTimeEnd: string;       // "23:00"
    coversPerSlot: ICoversPerSlot;
    minimumBillForDiscountPaisa: number; // e.g., 150000 = Rs. 1,500
    maxDiscountCap: number;        // 20-60% ceiling
    bankDealsOnCash: string;       // "trust" | "last4" | "disabled"
}

/* ── Main Restaurant (Branch) interface ── */
export interface IRestaurant extends Document {
    /* ── Brand / Branch hierarchy ── */
    brandName: string;        // e.g. "Salt'n Pepper"
    branchName: string;       // e.g. "DHA Phase 5 Branch"
    parentBrandId?: mongoose.Types.ObjectId; // links to head-office/first branch
    isHeadOffice: boolean;    // true for the primary listing

    /* ── Identity ── */
    name: string;             // Computed: "brandName — branchName"
    slug: string;
    description: string;
    logo: string;             // Restaurant/Brand logo
    coverImage: string;       // Hero banner
    galleryImages: { url: string; category: "Food" | "Interior" | "Vibes" | "Location" }[];  // Categorized photos

    /* ── Location ── */
    location: { type: "Point"; coordinates: number[] };
    address: string;
    city: string;
    area: string;
    areas?: string[];

    /* ── Contact ── */
    phone: string;
    whatsapp?: string;
    website?: string;
    email?: string;
    instagram?: string;
    facebook?: string;

    /* ── Classification ── */
    priceRange: 1 | 2 | 3 | 4;
    cuisines: string[];
    restaurantType: string[];
    vibes: string[];
    facilities: string[];

    /* ── Menu (Image-based) ── */
    menuImages: string[];     // Array of high-res menu page images
    menuPdf?: string;         // Optional downloadable PDF

    /* ── Hours ── */
    openingHours: IOpeningHour[];
    specialOverrides: ISpecialOverride[];

    /* ── Ratings ─── */
    averageRating: number;
    totalReviews: number;
    avgFoodRating: number;
    avgAmbianceRating: number;
    avgServiceRating: number;

    /* ── Ownership ── */
    ownerId?: mongoose.Types.ObjectId;

    /* ── Status ── */
    isApproved: boolean;
    isFeatured: boolean;
    featuredSource?: "manual" | "owner-plan";
    isVerifiedPartner: boolean;
    verifiedSource?: "manual" | "owner-plan";
    isActive: boolean;

    /* ── SEO ── */
    metaTitle?: string;
    metaDescription?: string;

    /* ── Analytics ── */
    viewCount: number;
    menuViewCount: number;
    directionClickCount: number;
    phoneRevealCount: number;
    whatsappClickCount: number;
    shareCount: number;

    /* ── Booking Management ── */
    bookingSettings: IBookingSettings;
    partnerSource?: "manual" | "owner-plan";
    ownerSubscriptionTier?: "prime" | "featured";
    ownerSubscriptionValidTo?: Date;

    /* ── Fintech / FoodiePay ── */
    platformFeeRate: number;             // Fixed 3% for all restaurants
    allowDiscountStacking: boolean;      // Can table deal + subscription stack?
    maxStackedDiscountPercentage: number; // Cap on stacked discounts

    /* ── Dynamic Surge Pricing ── */
    surgeEnabled: boolean;               // Opt-in for dynamic pricing
    surgeIntensity: number;              // 0.0 to 1.0 — how aggressively discounts drop under demand

    /* ── Branch Access Control ── */
    branchAccessPin?: string;            // Hashed 4-digit PIN for device-lock access (select: false)

    /* ── 3D Virtual Tour (Proprietary) ── */
    virtualTour: {
        status: "idle" | "processing" | "ready" | "published" | "failed";
        defaultSceneId?: string;
        scenes: {
            id: string;
            name: string;
            panoramaUrl: string;
            thumbnailUrl?: string;
            hotspots?: {
                id?: string;
                type?: "scene" | "info";
                pitch?: number;
                yaw?: number;
                targetSceneId?: string;
                text?: string;
            }[];
            initialView?: {
                pitch?: number;
                yaw?: number;
                hfov?: number;
            };
            createdAt?: Date;
        }[];
    };
    followersCount: number;
}

/* ── Sub-schemas ── */
const OpeningHourSchema = new Schema<IOpeningHour>(
    {
        day: { type: String, required: true },
        open: { type: String, default: "09:00" },
        close: { type: String, default: "23:00" },
        isClosed: { type: Boolean, default: false },
    },
    { _id: false }
);

const SpecialOverrideSchema = new Schema<ISpecialOverride>(
    {
        label: { type: String, required: true },
        date: { type: String },
        open: { type: String },
        close: { type: String },
        isClosed: { type: Boolean, default: false },
    },
    { _id: false }
);

/* ── Facilities & Vibes — defined inline ── */
export const FACILITIES = ["wifi", "parking", "ac", "outdoor", "rooftop", "valet", "delivery", "private_dining", "wheelchair"];
export const VIBES = ["family_friendly", "casual", "fine_dining", "romantic", "cafe_vibes", "rooftop", "live_music", "sports_bar"];

/* ── Booking Settings sub-schema ── */
const CoversPerSlotSchema = new Schema<ICoversPerSlot>(
    {
        lunch: { type: Number, default: 20, min: 0, max: 200 },
        afternoon: { type: Number, default: 12, min: 0, max: 200 },
        dinner: { type: Number, default: 30, min: 0, max: 200 },
    },
    { _id: false }
);

const BookingSettingsSchema = new Schema<IBookingSettings>(
    {
        isBookingEnabled: { type: Boolean, default: false },
        isPrimePartner: { type: Boolean, default: false },
        slotDurationMinutes: { type: Number, enum: SLOT_DURATIONS, default: 30 },
        maxPartySize: { type: Number, default: 10, min: 1, max: 50 },
        minPartySize: { type: Number, default: 1, min: 1, max: 20 },
        maxAdvanceBookingDays: { type: Number, default: 30, min: 1, max: 90 },
        autoConfirm: { type: Boolean, default: true },
        cancellationWindowMinutes: { type: Number, default: 360 }, // 6 hours
        bookableDays: {
            type: [String],
            default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        },
        bookableTimeStart: { type: String, default: "12:00" },
        bookableTimeEnd: { type: String, default: "23:00" },
        coversPerSlot: { type: CoversPerSlotSchema, default: () => ({}) },
        minimumBillForDiscountPaisa: { type: Number, default: 150000, min: 0 }, // Rs. 1,500
        maxDiscountCap: { type: Number, default: 50, min: 10, max: 70 },
        bankDealsOnCash: { type: String, enum: BANK_DEAL_CASH_MODES, default: "trust" },
    },
    { _id: false }
);

/* ── Main Schema ── */
const RestaurantSchema = new Schema<IRestaurant>(
    {
        /* Brand/Branch */
        brandName: { type: String, required: true },
        branchName: { type: String, default: "Main Branch" },
        parentBrandId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
        isHeadOffice: { type: Boolean, default: true },

        /* Identity */
        name: { type: String, required: true }, // "brandName — branchName"
        slug: { type: String, required: true, unique: true },
        description: { type: String, default: "" },
        logo: { type: String, default: "" },
        coverImage: { type: String, default: "" },
        galleryImages: [
            {
                url: { type: String, required: true },
                category: { 
                    type: String, 
                    enum: ["Food", "Interior", "Vibes", "Location"], 
                    default: "Food" 
                },
            },
        ],

        /* Location */
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], default: [74.3587, 31.5204] },
        },
        address: { type: String, default: "" },
        city: { type: String, required: true },
        area: { type: String, default: "" },
        areas: [{ type: String }],

        /* Contact */
        phone: { type: String, default: "" },
        whatsapp: { type: String },
        website: { type: String },
        email: { type: String },
        instagram: { type: String },
        facebook: { type: String },

        /* Classification */
        priceRange: { type: Number, enum: [1, 2, 3, 4], default: 2 },
        cuisines: [{ type: String }],
        restaurantType: [{ type: String }],
        vibes: [{ type: String }],
        facilities: [{ type: String }],

        /* Menu (Image-based) */
        menuImages: [{ type: String }],
        menuPdf: { type: String },

        /* Hours */
        openingHours: { type: [OpeningHourSchema], default: [] },
        specialOverrides: { type: [SpecialOverrideSchema], default: [] },

        /* Ratings */
        averageRating: { type: Number, default: 0 },
        totalReviews: { type: Number, default: 0 },
        avgFoodRating: { type: Number, default: 0 },
        avgAmbianceRating: { type: Number, default: 0 },
        avgServiceRating: { type: Number, default: 0 },

        /* Owner */
        ownerId: { type: Schema.Types.ObjectId, ref: "User" },

        /* Status */
        isApproved: { type: Boolean, default: false },
        isFeatured: { type: Boolean, default: false },
        featuredSource: { type: String, enum: ["manual", "owner-plan"] },
        isVerifiedPartner: { type: Boolean, default: false },
        verifiedSource: { type: String, enum: ["manual", "owner-plan"] },
        isActive: { type: Boolean, default: true },

        /* SEO */
        metaTitle: { type: String },
        metaDescription: { type: String },

        /* Analytics */
        viewCount: { type: Number, default: 0 },
        menuViewCount: { type: Number, default: 0 },
        directionClickCount: { type: Number, default: 0 },
        phoneRevealCount: { type: Number, default: 0 },
        whatsappClickCount: { type: Number, default: 0 },
        shareCount: { type: Number, default: 0 },

        /* Booking Management */
        bookingSettings: { type: BookingSettingsSchema, default: () => ({}) },
        partnerSource: { type: String, enum: ["manual", "owner-plan"] },
        ownerSubscriptionTier: { type: String, enum: ["prime", "featured"] },
        ownerSubscriptionValidTo: { type: Date },

        /* Fintech / FoodiePay */
        platformFeeRate: { type: Number, default: 3.0 }, // 3% fixed
        allowDiscountStacking: { type: Boolean, default: false },
        maxStackedDiscountPercentage: { type: Number, default: 50 },

        /* Dynamic Surge Pricing */
        surgeEnabled: { type: Boolean, default: false },
        surgeIntensity: { type: Number, default: 0.8, min: 0, max: 1 },

        /* Branch Access Control (PIN-based device lock) */
        branchAccessPin: { type: String, select: false },  // bcrypt-hashed 4-digit PIN; never returned in normal queries

        /* 360° Virtual Tour (Professional — Pannellum Viewer) */
        virtualTour: {
            status: {
                type: String,
                enum: ["idle", "processing", "ready", "published", "failed"],
                default: "idle",
            },
            defaultSceneId: { type: String },
            scenes: [
                {
                    id: { type: String, required: true },
                    name: { type: String, required: true },
                    panoramaUrl: { type: String, required: true },
                    thumbnailUrl: { type: String },
                    hotspots: [
                        {
                            id: { type: String },
                            type: { type: String, enum: ["scene", "info"], default: "scene" },
                            pitch: { type: Number, default: 0 },
                            yaw: { type: Number, default: 0 },
                            targetSceneId: { type: String },
                            text: { type: String },
                        },
                    ],
                    initialView: {
                        pitch: { type: Number, default: 0 },
                        yaw: { type: Number, default: 0 },
                        hfov: { type: Number, default: 110 },
                    },
                    createdAt: { type: Date, default: Date.now },
                },
            ],
        },
        followersCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

RestaurantSchema.index({ location: "2dsphere" });
RestaurantSchema.index({ city: 1, cuisines: 1 });
RestaurantSchema.index({ slug: 1 });
RestaurantSchema.index({ ownerId: 1 });
RestaurantSchema.index({ parentBrandId: 1 });
RestaurantSchema.index({ brandName: 1, city: 1 });
RestaurantSchema.index({ city: 1, isApproved: 1, isActive: 1 });
RestaurantSchema.index({ cuisines: 1 });
RestaurantSchema.index({ averageRating: -1 });

export const Restaurant =
    mongoose.models.Restaurant || mongoose.model<IRestaurant>("Restaurant", RestaurantSchema);
