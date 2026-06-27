import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/forgot-password
 * Proxies forgot-password request to the Core API.
 * Checks user existence before sending OTP.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const res = await fetch(`${process.env.CORE_API_URL || "http://localhost:4000/api/v1"}/auth/forgot-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Origin": process.env.NEXTAUTH_URL || "https://foodiespakistan.pk",
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("[forgot-password] Error:", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}
