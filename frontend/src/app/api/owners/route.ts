import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const filter = searchParams.get("filter") || "pending";

        // Query backend for owners (admin authorized via apiClient's auth context from Next.js session)
        const res = await apiClient(`/owners?filter=${filter}`, { requireAuth: true });

        // res.data = { success, data: [...] }, unwrap to get the actual array
        return NextResponse.json(res.data?.data || []);
    } catch (error: any) {
        console.error("[/api/owners proxy] Error fetching owners:", error?.message || error);
        // By returning an empty array on error, we prevent the frontend `e.map is not a function` crash
        return NextResponse.json([], { status: error?.status || 500 });
    }
}
