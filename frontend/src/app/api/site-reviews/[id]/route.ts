import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        const res = await apiClient(`/site-reviews/${id}`, {
            method: "PUT",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        const payload = res.data?.data ?? res.data ?? {};
        return NextResponse.json(payload);
    } catch (error: any) {
        console.error("[site-reviews PUT] Error:", error?.message);
        return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const res = await apiClient(`/site-reviews/${id}`, {
            method: "DELETE",
            requireAuth: true,
        });

        const payload = res.data?.data ?? res.data ?? {};
        return NextResponse.json(payload);
    } catch (error: any) {
        console.error("[site-reviews DELETE] Error:", error?.message);
        return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
    }
}

