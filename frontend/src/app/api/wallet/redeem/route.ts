import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * POST /api/wallet/redeem
 * Redeem Foodie Coins against a reservation. Max 50% of estimated bill.
 *
 * Body: { reservationId, coinsToRedeem }
 */
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();

        const res = await apiClient("/wallet/redeem", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        // Backend response wrapper puts actual output in .data
        return NextResponse.json(res.data.data, { status: res.status });
    } catch (error: any) {
        if (error.response?.data?.error) {
            return NextResponse.json({ error: error.response.data.error }, { status: error.response.status });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
