import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function POST(req: Request, { params }: { params: Promise<{ orderCode: string }> }) {
    try {
        const { orderCode } = await params;
        const res = await apiClient(`/table-orders/${orderCode}/place`, { method: "POST" });
        const data = res.data;
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
