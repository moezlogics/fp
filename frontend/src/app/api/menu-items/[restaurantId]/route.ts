import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function GET(req: Request, { params }: { params: Promise<{ restaurantId: string }> }) {
    try {
        const { restaurantId } = await params;
        const res = await apiClient(`/menu-items/${restaurantId}`, { method: "GET" });
        const payload = res.data?.data ?? res.data ?? {};
        return NextResponse.json(payload, { status: res.status });
    } catch {
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
