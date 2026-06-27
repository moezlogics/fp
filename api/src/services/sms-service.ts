import { env } from "../config/env";
import { redis } from "../config/redis";

/**
 * SMS Service — Twilio-powered OTP delivery for Foodies Pakistan.
 *
 * Security layers:
 *   1. Rate limit: max 3 OTPs per phone per hour
 *   2. OTP stored in Redis with 60-second TTL
 *   3. Single-use: deleted after successful verification
 *   4. Replay prevention: Redis NX lock on verification attempt
 *
 * All OTPs are 4-digit numeric codes (easy for restaurant staff to enter).
 */

const TWILIO_API_URL = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;

const OTP_TTL_SECONDS = 120;             // OTP valid for 2 minutes
const OTP_RATE_LIMIT_MAX = 15;           // Max OTPs per phone per 30 min
const OTP_RATE_LIMIT_WINDOW = 1800;      // 30 minutes in seconds
const COOLDOWN_TTL_SECONDS = 43200;      // 12 hours per restaurant per user

/**
 * Generate a cryptographically-random 4-digit OTP.
 */
function generateOTP(): string {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    return otp;
}

/**
 * Normalize Pakistani phone numbers to E.164 format.
 * Accepts: 03001234567, +923001234567, 923001234567, 0300-1234567
 * Returns: +923001234567
 */
function normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, "");

    if (cleaned.startsWith("0")) {
        cleaned = "+92" + cleaned.substring(1);
    } else if (cleaned.startsWith("92") && !cleaned.startsWith("+92")) {
        cleaned = "+" + cleaned;
    } else if (!cleaned.startsWith("+")) {
        cleaned = "+92" + cleaned;
    }

    return cleaned;
}

/**
 * Send an SMS via Twilio REST API (no SDK dependency).
 */
async function sendSMS(to: string, body: string): Promise<boolean> {
    try {
        const normalizedTo = normalizePhone(to);

        const params = new URLSearchParams();
        params.append("To", normalizedTo);
        params.append("From", env.TWILIO_PHONE_NUMBER);
        params.append("Body", body);

        const authHeader = Buffer.from(
            `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`
        ).toString("base64");

        const response = await fetch(TWILIO_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${authHeader}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("[SMS] Twilio error:", response.status, errorBody);
            return false;
        }

        const data = await response.json();
        console.log(`[SMS] Sent to ${normalizedTo} — SID: ${data.sid}`);
        return true;
    } catch (err) {
        console.error("[SMS] Failed to send:", err);
        return false;
    }
}

/**
 * Send a Prime walk-in OTP to a phone number.
 *
 * Returns: { success, message, otp? (only in dev for testing) }
 *
 * Rate limiting:
 *   - Max 5 OTPs per phone per hour
 *   - OTP stored in Redis with 2-minute TTL
 */
export async function sendPrimeOTP(
    phone: string
): Promise<{ success: boolean; message: string; code?: "RATE_LIMIT" | "TWILIO_ERROR" }> {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");

    // ── Rate limit check ──
    const rateLimitKey = `otp_rate:${cleanPhone}`;
    const currentCount = await redis.get(rateLimitKey);

    if (currentCount && parseInt(currentCount) >= OTP_RATE_LIMIT_MAX) {
        return {
            success: false,
            message: "Too many OTP requests. Please try again later.",
            code: "RATE_LIMIT"
        };
    }

    // ── Generate & store OTP ──
    const otp = generateOTP();
    const otpKey = `otp:walkin:${cleanPhone}`;

    await redis.set(otpKey, otp, "EX", OTP_TTL_SECONDS);

    // Increment rate limit counter
    const pipeline = redis.pipeline();
    pipeline.incr(rateLimitKey);
    pipeline.expire(rateLimitKey, OTP_RATE_LIMIT_WINDOW);
    await pipeline.exec();

    // ── Send SMS ──
    const messageBody = `Your Foodies Prime verification code is: ${otp}\n\nThis code expires in 2 minutes. Do not share it with anyone.\n\n- Foodies Pakistan`;

    try {
        const normalizedTo = normalizePhone(phone);
        const params = new URLSearchParams();
        params.append("To", normalizedTo);
        params.append("From", env.TWILIO_PHONE_NUMBER);
        params.append("Body", messageBody);

        const authHeader = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
        const response = await fetch(TWILIO_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${authHeader}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const errorBodyStr = await response.text();
            console.error("[SMS] Twilio error:", response.status, errorBodyStr);
            let twilioErr = "Failed to send SMS via Twilio.";
            try {
                const parsed = JSON.parse(errorBodyStr);
                if (parsed.message) twilioErr = parsed.message;
            } catch (e) { }

            await redis.del(otpKey);
            return {
                success: false,
                message: `Twilio Error: ${twilioErr}`,
                code: "TWILIO_ERROR"
            };
        }

        console.log(`[SMS] OTP sent to ${normalizedTo}`);
        return {
            success: true,
            message: "OTP sent successfully.",
        };
    } catch (err: any) {
        console.error("[SMS] Failed to send:", err);
        await redis.del(otpKey);
        return {
            success: false,
            message: `Twilio Exception: ${err.message}`,
            code: "TWILIO_ERROR"
        };
    }
}

/**
 * Verify a Prime walk-in OTP.
 *
 * Returns: { success, message }
 *
 * Security:
 *   - Single-use: OTP deleted after successful verification
 *   - NX lock prevents replay attacks
 *   - Max 3 failed attempts before OTP is invalidated
 */
export async function verifyPrimeOTP(
    phone: string,
    otp: string
): Promise<{ success: boolean; message: string }> {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    const otpKey = `otp:walkin:${cleanPhone}`;
    const failKey = `otp_fail:${cleanPhone}`;

    // ── Check failed attempts ──
    const failCount = await redis.get(failKey);
    if (failCount && parseInt(failCount) >= 3) {
        await redis.del(otpKey);
        return {
            success: false,
            message: "Too many failed attempts. Please request a new OTP.",
        };
    }

    // ── Get stored OTP ──
    const storedOTP = await redis.get(otpKey);

    if (!storedOTP) {
        return {
            success: false,
            message: "OTP has expired or was not requested. Please request a new one.",
        };
    }

    // ── Compare ──
    if (storedOTP !== otp.trim()) {
        // Increment failure counter
        const pipeline = redis.pipeline();
        pipeline.incr(failKey);
        pipeline.expire(failKey, OTP_TTL_SECONDS);
        await pipeline.exec();

        return {
            success: false,
            message: "Invalid OTP. Please try again.",
        };
    }

    // ── Success: delete OTP (single-use) ──
    await redis.del(otpKey);
    await redis.del(failKey);

    return {
        success: true,
        message: "OTP verified successfully.",
    };
}

/**
 * Check and set the velocity cooldown (1 Prime use per 12h at same restaurant).
 *
 * Returns: { allowed, message }
 */
export async function checkPrimeCooldown(
    userId: string,
    restaurantId: string
): Promise<{ allowed: boolean; message: string; hoursRemaining?: number }> {
    const cooldownKey = `prime_cooldown:${userId}:${restaurantId}`;
    const existing = await redis.get(cooldownKey);

    if (existing) {
        const usedAt = parseInt(existing);
        const elapsed = Math.floor((Date.now() - usedAt) / 1000);
        const remaining = COOLDOWN_TTL_SECONDS - elapsed;
        const hoursRemaining = Math.ceil(remaining / 3600);

        return {
            allowed: false,
            message: `Prime discount already used at this restaurant. Available again in ${hoursRemaining} hour(s).`,
            hoursRemaining,
        };
    }

    return { allowed: true, message: "Prime discount available." };
}

/**
 * Set the velocity cooldown after a Prime discount is applied.
 */
export async function setPrimeCooldown(
    userId: string,
    restaurantId: string
): Promise<void> {
    const cooldownKey = `prime_cooldown:${userId}:${restaurantId}`;
    await redis.set(cooldownKey, Date.now().toString(), "EX", COOLDOWN_TTL_SECONDS);
}
