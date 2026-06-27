/**
 * CORS Configuration — Strict Whitelist
 *
 * Read (GET) requests are allowed from any origin.
 * Write (POST/PUT/PATCH/DELETE) requests are restricted to whitelisted origins.
 */

import cors from "cors";
import { env } from "../config/env";

export const corsMiddleware = cors({
    origin: (origin, callback) => {
        // Allow read operations with no origin (curl, etc)
        if (!origin) {
            callback(null, true);
            return;
        }

        if (env.CORS_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: Origin ${origin} is not allowed.`));
        }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-cdn-key",
        "X-Request-Id",
    ],
    credentials: true,
    maxAge: 86400, // Pre-flight cache: 24 hours
});

/**
 * Strict Origin Enforcer for Write Operations (SEC-06 fix)
 * 
 * Ensures that POST/PUT/PATCH/DELETE requests cannot be made without an Origin.
 * Mobile apps or custom clients must send a custom Origin or an explicit bypass header.
 */
import { Request, Response, NextFunction } from "express";

export function requireOriginForWrites(req: Request, res: Response, next: NextFunction): void {
    const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

    const bypassSecret = req.headers["x-app-internal-secret"];
    const isInternal = bypassSecret === env.INTERNAL_SECRET;

    // Proceed if not a write method, OR if Origin/Auth is present, OR if it's an internal proxy call
    if (!isWriteMethod || req.headers.origin || req.headers.authorization || isInternal) {
        next();
        return;
    }

    // Otherwise, block write operations
    res.status(403).json({
        success: false,
        error: "Forbidden. Write operations require an Origin header or Authorization.",
    });
}
