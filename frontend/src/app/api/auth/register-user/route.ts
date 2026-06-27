import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/register-user
 * Proxies consumer registration request to the Core API backend.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const res = await fetch(`${process.env.CORE_API_URL || "http://localhost:4000/api/v1"}/auth/register-user`, {
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
    } catch (error: any) {
        console.error("[register-user] Error:", error);
        return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
    }
}
