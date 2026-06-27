import mongoose, { Schema, Document } from "mongoose";

/** Reserved usernames that cannot be claimed by users */
export const RESERVED_USERNAMES = new Set([
    "admin", "administrator", "support", "help", "foodies", "foodiespakistan",
    "moderator", "mod", "official", "system", "bot", "api", "root", "owner",
    "restaurant", "restaurants", "user", "users", "profile", "profiles",
    "settings", "account", "login", "register", "signup", "signin",
    "dashboard", "home", "about", "contact", "privacy", "terms",
    "search", "explore", "discover", "feed", "stories", "story",
    "deals", "offers", "prime", "wallet", "payment", "billing",
    "null", "undefined", "deleted", "anonymous", "guest",
]);

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    phone?: string; // Pakistani +92 format
    avatar?: string;
    city?: string;
    role: "user" | "admin" | "owner";
    // Auth verification
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    profileCompleted: boolean; // true once phone+city are set
    // Owner-specific fields
    businessName?: string;     // Brand name they operate
    cnicNumber?: string;       // Pakistani CNIC for owner verification
    branchType: "single" | "multi"; // Whether owner has single or multiple branches
    restaurantIds: mongoose.Types.ObjectId[]; // All branches they manage
    isApproved: boolean;
    rejectionReason?: string;
    // Community & Public Profile
    username?: string;
    bio?: string;
    socialLinks?: {
        instagram?: string;
        tiktok?: string;
        twitter?: string;
        youtube?: string;
        facebook?: string;
    };
    isPublicProfile: boolean;
    // Gamification & Wallet
    foodieLevel: number;
    points: number;
    badges: string[];
    reviewCount: number;
    photoCount: number;
    savedRestaurants: mongoose.Types.ObjectId[];
    // Referral system
    referralCode?: string;
    referredBy?: mongoose.Types.ObjectId;
    // Reservation tracking
    noShowCount: number;
    totalCoinsEarned: number;
    // Prime cache
    isPrime: boolean;
    primeValidTo?: Date;
    totalPrimeSavings: number;
    // Follow System
    followedRestaurants: mongoose.Types.ObjectId[];
    // Community Preferences
    dietaryPreferences: string[];
    favoriteCuisines: string[];
    notificationPreferences: {
        deals: boolean;
        stories: boolean;
        reviews: boolean;
    };
    themePreference: "light" | "dark" | "system";
    // Auth & Security
    refreshToken?: string;
    oldRefreshToken?: string;
    oldRefreshTokenExpiresAt?: Date;
    failedLoginAttempts: number;
    lockedUntil?: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, select: false },
        phone: { type: String },
        avatar: { type: String },
        city: { type: String },
        role: { type: String, enum: ["user", "admin", "owner"], default: "user" },
        isEmailVerified: { type: Boolean, default: false },
        isPhoneVerified: { type: Boolean, default: false },
        profileCompleted: { type: Boolean, default: false },
        businessName: { type: String },
        cnicNumber: { type: String },
        branchType: { type: String, enum: ["single", "multi"], default: "single" },
        restaurantIds: [{ type: Schema.Types.ObjectId, ref: "Restaurant" }],
        isApproved: { type: Boolean, default: true },
        rejectionReason: { type: String },
        username: { type: String, unique: true, sparse: true },
        bio: { type: String, maxLength: 160 },
        socialLinks: {
            instagram: { type: String },
            tiktok: { type: String },
            twitter: { type: String },
            youtube: { type: String },
            facebook: { type: String },
        },
        isPublicProfile: { type: Boolean, default: true },
        foodieLevel: { type: Number, default: 1 },
        points: { type: Number, default: 0 },
        badges: [{ type: String }],
        reviewCount: { type: Number, default: 0 },
        photoCount: { type: Number, default: 0 },
        savedRestaurants: [{ type: Schema.Types.ObjectId, ref: "Restaurant" }],
        // Referral
        referralCode: { type: String, unique: true, sparse: true },
        referredBy: { type: Schema.Types.ObjectId, ref: "User" },
        // Reservation tracking
        noShowCount: { type: Number, default: 0 },
        totalCoinsEarned: { type: Number, default: 0 },
        // Prime cache
        isPrime: { type: Boolean, default: false },
        primeValidTo: { type: Date },
        totalPrimeSavings: { type: Number, default: 0 },
        // Follow System
        followedRestaurants: [{ type: Schema.Types.ObjectId, ref: "Restaurant" }],
        // Community Preferences
        dietaryPreferences: [{ type: String }],
        favoriteCuisines: [{ type: String }],
        notificationPreferences: {
            deals: { type: Boolean, default: true },
            stories: { type: Boolean, default: true },
            reviews: { type: Boolean, default: true },
        },
        themePreference: { type: String, enum: ["light", "dark", "system"], default: "system" },
        // Auth & Security
        refreshToken: { type: String, select: false },
        oldRefreshToken: { type: String, select: false },
        oldRefreshTokenExpiresAt: { type: Date, select: false },
        failedLoginAttempts: { type: Number, default: 0 },
        lockedUntil: { type: Date }
    },
    { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1, isApproved: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
