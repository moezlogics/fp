import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";
import { toApiErrorResponse } from "@/lib/api-route-error";

export const dynamic = "force-dynamic";

// GET all categories
export async function GET() {
    try {
        const res = await apiClient("/categories", { requireAuth: false });
        return NextResponse.json(res.data.data);
    } catch (error) {
        console.error("[Categories API] GET error:", error);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}

// POST create new category
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const res = await apiClient("/categories", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data.data, { status: 201 });
    } catch (error: any) {
        return toApiErrorResponse(error, "Failed to create category");
    }
}
