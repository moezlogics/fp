import { NextResponse } from "next/server";

/**
 * POST /api/subscriptions/scan — DISABLED.
 *
 * The QR/TOTP scan redemption path has been removed:
 *  - The Core API never implemented `/subscriptions/scan` (every call 404'd).
 *  - The client-side "TOTP" was a non-cryptographic, forgeable 32-bit hash with
 *    the secret shipped to the browser — any QR could be forged for any member.
 *
 * Prime walk-in verification now goes exclusively through the secure email-OTP
 * flow at /api/subscriptions/verify-walkin (per-restaurant 12h cooldown +
 * redemption audit trail).
 */
export async function POST() {
    return NextResponse.json(
        {
            error:
                "QR scan verification has been disabled. Please use the OTP walk-in verification.",
        },
        { status: 410 },
    );
}
