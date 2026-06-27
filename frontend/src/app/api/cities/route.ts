import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";
import { toApiErrorResponse } from "@/lib/api-route-error";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const res = await apiClient("/cities", { requireAuth: false });
        return NextResponse.json(res.data.data || []);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const res = await apiClient("/cities", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data.data, { status: 201 });
    } catch (error: any) {
        return toApiErrorResponse(error, "Failed to create city");
    }
}
