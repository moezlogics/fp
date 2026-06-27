import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiClient } from "@/lib/api-client";

/**
 * POST /api/escrow/initiate
 * Proxies the initiate request to the Core API.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Pass the request forward to the Core API
        const res = await apiClient("/escrow/initiate", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data.data, { status: res.status });
    } catch (error: any) {
        console.error("[ESCROW_INITIATE_PROXY_ERROR]", error);
        return NextResponse.json(
            { error: error.message || "Failed to initiate bill payment." },
            { status: error.status || 500 }
        );
    }
}
