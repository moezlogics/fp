import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const res = await apiClient(`/bills/reservation/${id}`, {
            requireAuth: true,
        });

        return NextResponse.json(res.data?.data || res.data, { status: res.status });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch bill." }, { status: error.status || 500 });
    }
}
