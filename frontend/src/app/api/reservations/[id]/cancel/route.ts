import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * POST /api/reservations/[id]/cancel
 * Proxies the cancellation request to the Core API.
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json().catch(() => ({}));

        // Proxy the request to Core API
        // Core API expects a PATCH for status changes
        const res = await apiClient(`/reservations/${id}/cancel`, {
            method: "PATCH",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data, { status: res.status });
    } catch (err: any) {
        console.error("Cancel reservation proxy error:", err);
        const status = err.response?.status || 500;
        const msg = err.response?.data?.error || "Failed to cancel reservation";
        return NextResponse.json({ error: msg }, { status });
    }
}
