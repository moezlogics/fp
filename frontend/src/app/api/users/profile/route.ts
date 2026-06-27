import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const API_BASE_URL = process.env.CORE_API_URL || "http://localhost:4000/api/v1";

/**
 * GET /api/users/profile
 * Returns the authenticated user's full profile from the Core API.
 */
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const accessToken = (session as any)?.accessToken;
        if (!accessToken) {
            console.error("[PROFILE_GET] No accessToken found in session");
            return NextResponse.json({ error: "No access token" }, { status: 401 });
        }

        const res = await fetch(`${API_BASE_URL}/users/profile`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
            cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("[PROFILE_GET] API error:", res.status, data);
            return NextResponse.json({ error: data?.error || "API error" }, { status: res.status });
        }

        // Core API returns { success: true, data: <user> }
        return NextResponse.json({ data: data.data });
    } catch (error: any) {
        console.error("[PROFILE_GET_ERROR]", error?.message || error);
        return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
    }
}

/**
 * PUT /api/users/profile
 * Updates the authenticated user's profile fields.
 * Body: { name?, phone?, city?, avatar? }
 */
export async function PUT(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const accessToken = (session as any)?.accessToken;
        if (!accessToken) {
            return NextResponse.json({ error: "No access token" }, { status: 401 });
        }

        const body = await req.json();

        const res = await fetch(`${API_BASE_URL}/users/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("[PROFILE_PUT] API error:", res.status, data);
            return NextResponse.json({ error: data?.error || "API error" }, { status: res.status });
        }

        return NextResponse.json({ data: data.data });
    } catch (error: any) {
        console.error("[PROFILE_PUT_ERROR]", error?.message || error);
        return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
    }
}
