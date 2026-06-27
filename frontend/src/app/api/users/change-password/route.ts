import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiClient } from "@/lib/api-client";

/**
 * POST /api/users/change-password
 * Proxy to Core API
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const res = await apiClient("/users/change-password", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data.data);
    } catch (error: any) {
        console.error("[CHANGE_PASSWORD_PROXY_ERROR]", error);
        if (error.response?.data?.error) {
            return NextResponse.json({ error: error.response.data.error }, { status: error.response.status });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
