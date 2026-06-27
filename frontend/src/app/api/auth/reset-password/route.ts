import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/reset-password
 * Proxies password reset request (OTP verification and update) to the Core API backend.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const res = await fetch(`${process.env.CORE_API_URL || "http://localhost:4000/api/v1"}/auth/reset-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Origin": process.env.NEXTAUTH_URL || "https://foodiespakistan.pk",
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        console.error("[RESET_PASSWORD_ERROR]", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
