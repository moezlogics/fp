import { NextRequest, NextResponse } from "next/server";

const CORE_API_URL = process.env.CORE_API_URL || "http://localhost:4000/api/v1";

/**
 * GET /api/restaurants/load-more
 * 
 * Next.js proxy to Core API for AJAX load-more in archive pages.
 * No caching — user-specific filter state.
 * 
 * Query params: city, page, limit, sort, minRating, area, cuisine
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const params = new URLSearchParams();

        // Forward all query params to Core API
        for (const [key, value] of searchParams.entries()) {
            params.set(key, value);
        }

        const res = await fetch(
            `${CORE_API_URL}/search/load-more?${params.toString()}`,
            {
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            }
        );

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                { error: data.error || "Failed to load more" },
                { status: res.status }
            );
        }

        return NextResponse.json(data.data || data);
    } catch (error) {
        console.error("[Proxy] Load-more error:", error);
        return NextResponse.json(
            { error: "Failed to load more restaurants" },
            { status: 500 }
        );
    }
}
