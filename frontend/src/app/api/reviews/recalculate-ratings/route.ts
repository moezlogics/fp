import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

/**
 * POST /api/reviews/recalculate-ratings
 * Admin-only: Recalculates all restaurant ratings from their reviews.
 * This is a one-time fix endpoint.
 */
export async function POST() {
    try {
        const res = await apiClient("/reviews/recalculate-ratings", {
            method: "POST",
            requireAuth: true,
        });
        return NextResponse.json(res.data?.data || res.data);
    } catch (error: any) {
        const status = error?.response?.status || 500;
        const msg = error?.response?.data?.error || "Failed to recalculate ratings.";
        return NextResponse.json({ error: msg }, { status });
    }
}
