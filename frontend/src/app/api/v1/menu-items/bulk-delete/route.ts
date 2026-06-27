import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const res = await apiClient("/menu-items/bulk-delete", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true
        });
        return NextResponse.json(res.data, { status: res.status });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: err.response?.status || err.status || 500 }
        );
    }
}
