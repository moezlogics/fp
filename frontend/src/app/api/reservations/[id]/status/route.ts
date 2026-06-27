import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { newStatus, ownerNotes } = body;

        // Map POST { newStatus } to PATCH { status }
        const res = await apiClient(`/reservations/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({
                status: newStatus,
                ownerNotes,
            }),
            requireAuth: true,
        });

        // The core API successfully processes the state transition. Return it matching the structure expected.
        return NextResponse.json({
            reservation: res.data.data,
            message: `Reservation updated to ${newStatus}`,
        });
    } catch (err: any) {
        if (err.response?.data?.error) {
            return NextResponse.json({ error: err.response.data.error }, { status: err.response.status });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
