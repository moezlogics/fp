import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * POST /api/auth/complete-profile
 * Proxies profile completion request to the Core API backend.
 */
export async function POST(req: NextRequest) {
    try {
        const session: any = await auth();
        // Since we need to hit the authenticated backend endpoint, we pass the user's accessToken.
        if (!session?.accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const res = await fetch(`${process.env.CORE_API_URL || "http://localhost:4000/api/v1"}/auth/complete-profile`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.accessToken}`,
                "Origin": process.env.NEXTAUTH_URL || "https://foodiespakistan.pk",
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("[complete-profile] Error:", error);
        return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
    }
}
