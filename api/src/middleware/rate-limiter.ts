/**
 * Rate Limiter — Per-route configurable limits.
 */

import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../config/redis";
import { env } from "../config/env";

/** Auth endpoints (login/register): 10 attempts per minute */
export const authRateLimiter = rateLimit({
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS || 60000,
    max: env.AUTH_RATE_LIMIT_MAX || 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many authentication attempts. Please try again later.",
        code: "RATE_LIMITED",
    },
    store: new RedisStore({
        sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as any,
        prefix: "rl:auth:",
    }),
    keyGenerator: (req) => {
        // Express trust proxy securely determines req.ip when configured correctly.
        return req.ip || "unknown";
    },
});

/** General API: 100 requests per minute */
export const generalRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many requests. Please slow down.",
        code: "RATE_LIMITED",
    },
    store: new RedisStore({
        sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as any,
        prefix: "rl:global:",
    }),
    keyGenerator: (req) => {
        // Secure IP resolution
        return req.ip || "unknown";
    },
});

/** OTP verification: 3 attempts per 5 minutes (SEC-24) */
export const otpRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many OTP verification attempts. Please try again in 5 minutes.",
        code: "RATE_LIMITED",
    },
    store: new RedisStore({
        sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as any,
        prefix: "rl:otp:",
    }),
    keyGenerator: (req) => {
        // Use email if available, otherwise IP
        return (req.body.email || req.ip || "unknown").toLowerCase();
    },
});
