import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        await apiClient(`/deals/${id}`, {
            method: "DELETE",
            requireAuth: true,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.response?.data?.error) {
            return NextResponse.json({ error: error.response.data.error }, { status: error.response.status });
        }
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}
