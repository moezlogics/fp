import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * POST /api/reservations/[id]/confirm
 * Proxies the confirmation request to the Core API.
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

        // Proxy the request to Core API — forward guest details
        const res = await apiClient(`/reservations/${id}/confirm`, {
            method: "POST",
            requireAuth: true,
            body: JSON.stringify(body),
        });

        const payload = (res.data as any)?.data || res.data;
        return NextResponse.json(
            {
                reservation: {
                    _id: id,
                    reservationCode: payload?.reservationCode,
                },
                reservationCode: payload?.reservationCode,
            },
            { status: res.status }
        );
    } catch (err: any) {
        console.error("Confirm reservation proxy error:", err);
        const status = err.status || 500;
        const msg = err.message || "Failed to confirm reservation";
        return NextResponse.json({ error: msg }, { status });
    }
}
