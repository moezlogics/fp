/**
 * Auth Service — JWT Token Management & Password Hashing
 *
 * Architecture (SEC-01 HARDENED):
 * - Access tokens: 24h lifespan (Facebook/Instagram style — long enough to avoid
 *   constant refresh failures, short enough to limit stolen token damage).
 * - Refresh tokens: 90d lifespan, hashed with SHA-256 before DB storage.
 * - bcrypt with cost factor 12 for password hashing.
 * - Token rotation: old refresh token is invalidated upon use.
 *
 * This approach mirrors how major social platforms (Facebook, Instagram)
 * handle auth — long sessions with transparent refresh, not 365-day tokens.
 */

import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { env } from "../config/env";

const BCRYPT_ROUNDS = 12;

// Token lifespans — Facebook/Instagram style
const ACCESS_TOKEN_EXPIRY = "24h";   // Was 365d — now 24h (SEC-01)
const REFRESH_TOKEN_EXPIRY = "90d";  // Was 365d — now 90d (SEC-01)

export interface TokenPayload {
    id: string;
    email: string;
    role: "user" | "admin" | "owner";
    name?: string;
    phone?: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    accessExpiresIn: string;
}

/**
 * Hash a plaintext password with bcrypt.
 */
export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
    plain: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

/**
 * Hash a refresh token with SHA-256 for secure DB storage (SEC-15).
 * Even if the DB is breached, refresh tokens cannot be used.
 */
export function hashRefreshToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate an access token — 24h for all roles (SEC-01).
 * Short enough to limit damage if stolen, long enough to avoid UX issues.
 */
export function generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload as object, env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        issuer: "foodies-api",
        audience: "foodies-client",
    });
}

/**
 * Generate a refresh token — 90 days (SEC-01).
 * Hashed before storage; user stays logged in for ~3 months like Facebook.
 */
export function generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(
        { id: payload.id, type: "refresh" },
        env.JWT_SECRET,
        {
            expiresIn: REFRESH_TOKEN_EXPIRY,
            issuer: "foodies-api",
            audience: "foodies-client",
        }
    );
}

/**
 * Generate both access and refresh tokens.
 */
export function generateTokenPair(payload: TokenPayload): TokenPair {
    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
        accessExpiresIn: ACCESS_TOKEN_EXPIRY,
    };
}

/**
 * Generate a time-limited impersonation token — 1 hour max (SEC-05).
 */
export function generateImpersonationToken(payload: TokenPayload): string {
    return jwt.sign(
        { ...payload, impersonated: true } as object,
        env.JWT_SECRET,
        {
            expiresIn: "1h",
            issuer: "foodies-api",
            audience: "foodies-client",
        }
    );
}

/**
 * Verify and decode an access token.
 * Throws if expired, malformed, or invalid signature.
 */
export function verifyAccessToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
        issuer: "foodies-api",
        audience: "foodies-client",
    }) as JwtPayload & TokenPayload;

    return {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
    };
}

/**
 * Verify and decode a refresh token.
 * Returns the user ID if valid.
 */
export function verifyRefreshToken(token: string): { id: string } {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
        issuer: "foodies-api",
        audience: "foodies-client",
    }) as JwtPayload & { id: string; type: string };

    if (decoded.type !== "refresh") {
        throw new Error("Invalid token type. Expected refresh token.");
    }

    return { id: decoded.id };
}
