import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiClient } from "@/lib/api-client";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json();
        const res = await apiClient("/escrow/calculate", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });
        return NextResponse.json(res.data, { status: res.status });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to calculate bill preview." }, { status: error.status || 500 });
    }
}
