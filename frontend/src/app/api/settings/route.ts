import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";
import { toApiErrorResponse } from "@/lib/api-route-error";

/**
 * GET /api/settings — Fetch platform settings (admin proxy)
 */
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await auth();
        const user = session?.user as any;
        if (user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const res = await apiClient("/settings", { requireAuth: true });

        // Unwrap: res.data = { success, data: { settings object } }
        return NextResponse.json(res.data?.data || res.data);
    } catch (error: any) {
        console.error("[Settings GET] Error:", error?.message);
        return toApiErrorResponse(error, "Failed to fetch settings");
    }
}

/**
 * PUT /api/settings — Update platform settings (admin proxy)
 */
export async function PUT(req: Request) {
    try {
        const session = await auth();
        const user = session?.user as any;
        if (user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const res = await apiClient("/settings", {
            method: "PUT",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data?.data || res.data);
    } catch (error: any) {
        console.error("[Settings PUT] Error:", error?.message);
        return toApiErrorResponse(error, "Failed to update settings");
    }
}
