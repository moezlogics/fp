import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const res = await apiClient(`/reviews/admin/${id}`, { 
            method: "PUT",
            body: JSON.stringify(body),
            requireAuth: true 
        });
        return NextResponse.json(res.data);
    } catch (error: any) {
        return NextResponse.json({ error: error.response?.data?.error || error.response?.data?.message || "Failed to edit review." }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const res = await apiClient(`/reviews/admin/${id}`, { 
            method: "DELETE",
            requireAuth: true 
        });
        return NextResponse.json(res.data);
    } catch (error: any) {
        return NextResponse.json({ error: error.response?.data?.error || error.response?.data?.message || "Failed to delete review." }, { status: 500 });
    }
}
