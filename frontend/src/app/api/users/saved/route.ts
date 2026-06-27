import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiClient } from "@/lib/api-client";

/**
 * GET /api/users/saved
 * Returns the user's saved restaurants with full details.
 */
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const res = await apiClient("/users/saved", {
            requireAuth: true,
        });

        return NextResponse.json(res.data.data);
    } catch (error: any) {
        console.error("[SAVED_GET_PROXY_ERROR]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: error.response?.status || 500 });
    }
}

/**
 * POST /api/users/saved
 * Toggle save/unsave a restaurant.
 * Body: { restaurantId }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const res = await apiClient("/users/saved", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data.data);
    } catch (error: any) {
        console.error("[SAVED_POST_PROXY_ERROR]", error);
        if (error.response?.data?.error) {
            return NextResponse.json({ error: error.response.data.error }, { status: error.response.status });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
