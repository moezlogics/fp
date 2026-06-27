import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const lat = searchParams.get("lat");
        const lng = searchParams.get("lng");
        const maxDistance = searchParams.get("maxDistance") || "10000";
        const limit = searchParams.get("limit") || "10";

        if (!lat || !lng) {
            return NextResponse.json({ error: "Missing lat/lng coordinates" }, { status: 400 });
        }

        const res = await apiClient(
            `/restaurants/nearby?lat=${lat}&lng=${lng}&maxDistance=${maxDistance}&limit=${limit}`,
            { requireAuth: false }
        );
        // apiClient returns { data: { success, data: [...] }, status }
        const restaurants = res.data.data || [];
        return NextResponse.json(restaurants);
    } catch (error: any) {
        console.error("[Nearby API Proxy] Error:", error.message);
        return NextResponse.json(
            { error: "Failed to fetch nearby restaurants" },
            { status: 500 }
        );
    }
}
