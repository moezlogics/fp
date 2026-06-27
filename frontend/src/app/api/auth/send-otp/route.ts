import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/send-otp
 * Proxies send-otp request to the Core API backend.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const res = await fetch(`${process.env.CORE_API_URL || "http://localhost:4000/api/v1"}/auth/send-otp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Origin": process.env.NEXTAUTH_URL || "https://foodiespakistan.pk",
                "x-app-internal-secret": process.env.INTERNAL_SECRET || "",
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("[send-otp] Error:", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}
