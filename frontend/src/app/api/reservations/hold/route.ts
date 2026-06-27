import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * POST /api/reservations/hold
 * Proxies the booking request to the highly-scalable Core API.
 */
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "You must be logged in to make a reservation" }, { status: 401 });
        }

        const body = await req.json();

        // Let the Core API handle the atomic table inventory management.
        const res = await apiClient("/reservations/hold", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data?.data || res.data, { status: res.status });
    } catch (err: any) {
        console.error("Reservation hold proxy error:", err);
        const status = err.status || 500;
        const msg = err.message || "Failed to hold reservation";
        return NextResponse.json({ error: msg }, { status });
    }
}
