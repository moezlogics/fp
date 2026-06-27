import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

/* Detect nearest city from lat/lng using Haversine distance */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const lat = searchParams.get("lat") || "0";
        const lng = searchParams.get("lng") || "0";

        const res = await apiClient(`/cities/detect?lat=${lat}&lng=${lng}`, { requireAuth: false });
        return NextResponse.json(res.data.data);
    } catch {
        return NextResponse.json({ slug: "lahore", name: "Lahore" });
    }
}
