import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";
import { toApiErrorResponse } from "@/lib/api-route-error";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const citySlug = searchParams.get("citySlug") || "";
        const res = await apiClient(`/areas?citySlug=${encodeURIComponent(citySlug)}`, { requireAuth: false });
        // res.data = { success, data: [...] }, res.data.data = array of areas
        const areas = Array.isArray(res.data.data) ? res.data.data : [];
        return NextResponse.json(areas);
    } catch (error) {
        return NextResponse.json([]);
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const res = await apiClient("/areas", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data.data, { status: 201 });
    } catch (error: any) {
        return toApiErrorResponse(error, "Failed to create area");
    }
}
