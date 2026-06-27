import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";
import { toApiErrorResponse } from "@/lib/api-route-error";

// PUT update category
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        const res = await apiClient(`/categories/${id}`, {
            method: "PUT",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data.data);
    } catch (error: any) {
        return toApiErrorResponse(error, "Failed to update");
    }
}

// DELETE category
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        await apiClient(`/categories/${id}`, {
            method: "DELETE",
            requireAuth: true,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return toApiErrorResponse(error, "Failed to delete");
    }
}
