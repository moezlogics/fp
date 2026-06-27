import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";
import { toApiErrorResponse } from "@/lib/api-route-error";

/**
 * DELETE /api/areas/[id] — Delete an area (admin only)
 * PUT /api/areas/[id] — Update an area (admin only)
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const res = await apiClient(`/areas/${id}`, {
            method: "DELETE",
            requireAuth: true,
        });

        return NextResponse.json(res.data.data || { success: true });
    } catch (error: any) {
        return toApiErrorResponse(error, "Failed to delete area");
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const res = await apiClient(`/areas/${id}`, {
            method: "PUT",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data.data || res.data);
    } catch (error: any) {
        return toApiErrorResponse(error, "Failed to update area");
    }
}
