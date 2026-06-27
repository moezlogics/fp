import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim() || "";
        const limit = searchParams.get("limit") || "8";
        const city = searchParams.get("city") || "";

        if (!q) return NextResponse.json([]);

        let queryUrl = `/search?q=${encodeURIComponent(q)}&limit=${limit}`;
        if (city) queryUrl += `&city=${encodeURIComponent(city)}`;

        const res = await apiClient(queryUrl, { requireAuth: false });
        return NextResponse.json(res.data.data);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
}
