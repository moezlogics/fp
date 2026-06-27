import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const { searchParams } = new URL(req.url);
        const date = searchParams.get("date");
        const pax = searchParams.get("pax");

        if (!date) {
            return NextResponse.json(
                { error: "date query parameter is required (YYYY-MM-DD)" },
                { status: 400 }
            );
        }

        const res = await apiClient(`/restaurants/${slug}/slots?date=${date}&pax=${pax || 2}`, { requireAuth: false });
        // apiClient returns { data: { success, data: { restaurant, slots, ... } }, status }
        return NextResponse.json(res.data.data);
    } catch (err: any) {
        // apiClient throws plain Error — no err.response
        // Return empty slots instead of 500 (no slots is a valid state)
        console.error(`[Slots Proxy] Error for ${(await params).slug}:`, err.message);
        return NextResponse.json({
            restaurant: null,
            slots: [],
            bankDeals: [],
            error: err.message || "Failed to fetch slots",
        });
    }
}
