import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();

        const res = await apiClient(`/owners/${id}`, {
            method: "PUT",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data || { success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update owner" }, { status: 500 });
    }
}
