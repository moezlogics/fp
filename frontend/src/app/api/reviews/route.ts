import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * POST /api/reviews
 * Supports both authenticated users and guests.
 * Authenticated users get verified badge; guests must provide guestName.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const body = await req.json();

        // Forward to backend (optionalAuth handles auth/guest logic there)
        const res = await apiClient("/reviews", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: !!session?.user, // Send auth header only if logged in
        });

        const data = res.data?.data || res.data;
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        const errMsg = error?.message || "Failed to submit review.";
        const status = error?.status || 500;
        return NextResponse.json({ error: errMsg }, { status });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const restaurantId = searchParams.get("restaurantId");
        const page = searchParams.get("page") || "1";

        if (!restaurantId) {
            return NextResponse.json({ error: "restaurantId is required." }, { status: 400 });
        }

        const res = await apiClient(`/reviews?restaurantId=${restaurantId}&page=${page}`, { requireAuth: false });
        return NextResponse.json(res.data?.data || res.data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch reviews." }, { status: 500 });
    }
}
