import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
    PORT: parseInt(process.env.PORT || "4000", 10),
    NODE_ENV: process.env.NODE_ENV || "development",

    // MongoDB
    MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/foodiespk",

    // JWT
    JWT_SECRET: process.env.JWT_SECRET || "",
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || "15m",
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || "7d",

    // CDN
    CDN_BASE_URL: process.env.CDN_BASE_URL || "http://localhost:3001",
    CDN_API_KEY: process.env.CDN_API_KEY || "",

    // CORS
    CORS_ORIGINS: (process.env.CORS_ORIGINS || "http://localhost:3000")
        .split(",")
        .map((o) => o.trim()),

    // Redis
    REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379",

    // SMTP
    SMTP_HOST: process.env.SMTP_HOST || "",
    SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),
    SMTP_USER: process.env.SMTP_USER || "",
    SMTP_PASS: process.env.SMTP_PASS || "",
    SMTP_FROM: process.env.SMTP_FROM || "noreply@foodiespakistan.com",

    // Rate Limits
    AUTH_RATE_LIMIT_WINDOW_MS: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "60000", 10),
    AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "10", 10),

    // Twilio SMS
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "",

    // PayFast Payment Gateway
    PAYFAST_MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID || "",
    PAYFAST_SECURED_KEY: process.env.PAYFAST_SECURED_KEY || "",
    PAYFAST_MERCHANT_KEY: process.env.PAYFAST_MERCHANT_KEY || "test_key",
    PAYFAST_RETURN_URL: process.env.PAYFAST_RETURN_URL || "",
    PAYFAST_ENVIRONMENT: (process.env.PAYFAST_ENVIRONMENT as "sandbox" | "production") || "sandbox",
    ADMIN_ALERT_EMAIL: process.env.ADMIN_ALERT_EMAIL || "admin@foodiespakistan.pk",
    INTERNAL_SECRET: process.env.INTERNAL_SECRET || "foodies_internal_bypass_secure_key_2024",

    // VR Tour Microservice (fastapi.foodiespakistan.pk)
    VR_TOUR_SECRET: process.env.VR_TOUR_SECRET || "foodies_vr_tour_hmac_secret_2026",
    VR_TOUR_APP_URL: process.env.VR_TOUR_APP_URL || "http://localhost:8500",
} as const;

// Fail-fast validations
if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long. Check .env");
}
if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be set in .env");
}
if (env.NODE_ENV === "production") {
    if (!env.CDN_API_KEY || env.CDN_API_KEY.length < 16) {
        throw new Error("CDN_API_KEY must be set securely in production. Check .env");
    }
    if (process.env.PAYFAST_ENVIRONMENT && process.env.PAYFAST_ENVIRONMENT !== "production") { 
        console.warn("WARNING: PAYFAST_ENVIRONMENT is not set to 'production' while NODE_ENV is production.");
    }
}
