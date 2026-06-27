import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q");
        if (!q || q.length < 2) {
            return NextResponse.json({ restaurants: [], categories: [], areas: [] });
        }

        // Proxy the search request to our highly optimized Core API endpoint.
        // requireAuth: false is used because global search is public.
        const res = await apiClient(`/search/autocomplete?q=${encodeURIComponent(q)}`, {
            requireAuth: false,
        });

        // apiClient wraps as { data: { success, data: {restaurants,categories,areas} }, status }
        return NextResponse.json(res.data?.data || { restaurants: [], categories: [], areas: [] });
    } catch (error) {
        console.error("Autocomplete proxy error:", error);
        return NextResponse.json({ restaurants: [], categories: [], areas: [] });
    }
}
