import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

/**
 * GET /api/restaurants/by-slug/[slug]
 * Resolves a restaurant by its slug (used by the QR table-order page to get the
 * restaurant id before loading its menu). Proxies to Core GET /restaurants/:slug.
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const res = await apiClient(`/restaurants/${slug}`, { requireAuth: false });
        // Core returns { success, data: restaurant }; forward as-is so callers can
        // read slugData.data._id / .brandName.
        return NextResponse.json(res.data, { status: res.status });
    } catch (err: any) {
        const status = err?.status || 404;
        return NextResponse.json(
            { error: err?.message || "Restaurant not found" },
            { status },
        );
    }
}
