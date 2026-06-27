import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * GET /api/wallet/history?page=1&limit=20
 * Paginated wallet transaction history with source labels.
 */
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const page = searchParams.get("page") || "1";
        const limit = searchParams.get("limit") || "20";

        const res = await apiClient(`/wallet/history?page=${page}&limit=${limit}`, {
            requireAuth: true,
        });

        const data = res.data as any;
        // The frontend UI expects { entries, pagination } based on the original code
        return NextResponse.json({
            entries: data.data,
            pagination: data.meta?.pagination,
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: error.response?.status || 500 });
    }
}
