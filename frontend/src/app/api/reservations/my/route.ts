import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const page = searchParams.get("page") || "1";
        const limit = searchParams.get("limit") || "20";

        // Proxy to the Core API
        const res = await apiClient(`/reservations/my?page=${page}&limit=${limit}`, {
            requireAuth: true,
        });

        return NextResponse.json({
            reservations: res.data?.data || [],
            pagination: res.data?.pagination,
        });
    } catch (err: any) {
        console.error("Fetch my reservations proxy error:", err);
        const status = err.status || 500;
        const msg = err.message || "Failed to fetch reservations";
        return NextResponse.json({ error: msg }, { status });
    }
}
