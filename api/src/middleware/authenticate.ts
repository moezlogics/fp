/**
 * Authentication Middleware — JWT Bearer Token Verification
 *
 * Reads the Authorization header, verifies the JWT,
 * and attaches the decoded user payload to req.user.
 *
 * Usage: app.use("/protected", authenticate, handler);
 */

import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "../services/auth-service";
import { env } from "../config/env";

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

export function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // 1. Bypass check for internal server-to-server calls (Next.js)
    const internalSecret = req.headers["x-app-internal-secret"];
    if (internalSecret === env.INTERNAL_SECRET) {
        req.user = {
            id: "system-internal",
            email: "system@foodiespakistan.pk",
            role: "admin",
            name: "System Internal Bypass"
        };
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            success: false,
            error: "Authentication required. Send Authorization: Bearer <token>",
        });
        return;
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    try {
        const payload = verifyAccessToken(token);
        req.user = payload;

        // Prevent Caching on all authenticated routes globally
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Surrogate-Control", "no-store");

        next();
    } catch (err: any) {
        if (err.name === "TokenExpiredError") {
            res.status(401).json({
                success: false,
                error: "Token expired. Please refresh your session.",
                code: "TOKEN_EXPIRED",
            });
            return;
        }

        res.status(401).json({
            success: false,
            error: "Invalid authentication token.",
        });
    }
}
