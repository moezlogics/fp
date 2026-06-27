import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const res = await apiClient("/table-orders/create", {
            method: "POST",
            body: JSON.stringify(body),
        });
        const data = res.data;
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
