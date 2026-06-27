import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
    PORT: parseInt(process.env.PORT || "3001", 10),
    NODE_ENV: process.env.NODE_ENV || "development",
    CDN_PUBLIC_URL: process.env.CDN_PUBLIC_URL || "http://localhost:3001",
    CDN_API_KEY: process.env.CDN_API_KEY || "",
    UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || "./uploads"),
    MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || "10", 10),
    WEBP_QUALITY: parseInt(process.env.WEBP_QUALITY || "80", 10),
    MAX_WIDTH: parseInt(process.env.MAX_WIDTH || "1920", 10),
    THUMB_WIDTH: parseInt(process.env.THUMB_WIDTH || "400", 10),
    CORS_ORIGINS: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:4000,http://localhost:3001")
        .split(",")
        .map((o) => o.trim()),
} as const;

// Fail-fast: CDN_API_KEY is mandatory in production
if (!env.CDN_API_KEY) {
    console.warn(
        "⚠️  CDN_API_KEY is not set. Upload endpoint is UNPROTECTED. Set it in .env for production."
    );
}
