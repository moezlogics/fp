import { redis } from "../config/redis";
import crypto from "crypto";

const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_LOCKOUT_DURATION = 3600; // 1 hour (SEC-24)
const OTP_RATE_LIMIT_WINDOW = 3600; // 1 hour
const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_ATTEMPTS = 5; // max wrong guesses before lockout

/**
 * Generates a cryptographically secure 6-digit OTP,
 * stores it in Redis with TTL, and enforces rate limits.
 */
export async function generateOTP(email: string): Promise<{ success: boolean; message: string; code?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitKey = `otp_rate:${normalizedEmail}`;
    const otpKey = `otp:${normalizedEmail}`;
    const attemptsKey = `otp_attempts:${normalizedEmail}`;

    // --- Rate Limit Check ---
    const currentCount = await redis.get(rateLimitKey);
    if (currentCount && parseInt(currentCount, 10) >= OTP_MAX_PER_HOUR) {
        return { success: false, message: "Too many OTP requests. Please wait before trying again." };
    }

    // --- Generate Secure 6-Digit Code ---
    const code = crypto.randomInt(100000, 999999).toString();

    // --- Store OTP in Redis with 5-minute expiry ---
    await redis.set(otpKey, code, "EX", OTP_TTL_SECONDS);

    // --- Reset attempts counter ---
    await redis.del(attemptsKey);

    // --- Increment Rate Limit Counter ---
    const pipeline = redis.pipeline();
    pipeline.incr(rateLimitKey);
    pipeline.expire(rateLimitKey, OTP_RATE_LIMIT_WINDOW);
    await pipeline.exec();

    return { success: true, message: "OTP sent successfully.", code };
}

/**
 * Verifies the OTP entered by the user against Redis.
 * Deletes the OTP on success.
 * Enforces max failed attempts.
 */
export async function verifyOTP(email: string, code: string): Promise<{ valid: boolean; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const otpKey = `otp:${normalizedEmail}`;
    const attemptsKey = `otp_attempts:${normalizedEmail}`;

    // --- Check Attempts Lockout ---
    const attempts = await redis.get(attemptsKey);
    if (attempts && parseInt(attempts, 10) >= OTP_MAX_ATTEMPTS) {
        return { valid: false, message: "Too many incorrect attempts. Request a new OTP." };
    }

    // --- Retrieve Stored OTP ---
    const storedCode = await redis.get(otpKey);
    if (!storedCode) {
        return { valid: false, message: "OTP expired or not found. Please request a new one." };
    }

    // --- Constant-Time Comparison (prevents timing attacks) ---
    const isValid =
        code.length === storedCode.length &&
        crypto.timingSafeEqual(Buffer.from(code), Buffer.from(storedCode));

    if (!isValid) {
        await redis.incr(attemptsKey);
        await redis.expire(attemptsKey, OTP_LOCKOUT_DURATION); // 1-hour block (SEC-24)
        return { valid: false, message: `Invalid OTP code. Too many failures will lock your account for 1 hour.` };
    }

    // --- Success: Clean up ---
    await redis.del(otpKey);
    await redis.del(attemptsKey);

    return { valid: true, message: "OTP verified successfully." };
}
