import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiClient } from "@/lib/api-client";

/**
 * GET /api/users/reviews
 * Returns all reviews written by the authenticated user.
 */
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const res = await apiClient("/users/reviews", {
            requireAuth: true,
        });

        return NextResponse.json(res.data.data);
    } catch (error: any) {
        console.error("[USER_REVIEWS_PROXY_ERROR]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: error.response?.status || 500 });
    }
}
