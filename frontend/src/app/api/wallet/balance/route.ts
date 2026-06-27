import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * GET /api/wallet/balance — Returns user's live wallet balance + expiry warnings.
 */
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const res = await apiClient("/wallet/balance", {
            requireAuth: true,
        });

        return NextResponse.json(res.data.data);
    } catch (error: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: error.response?.status || 500 });
    }
}
