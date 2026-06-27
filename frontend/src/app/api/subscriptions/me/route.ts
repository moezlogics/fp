import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const res = await apiClient("/subscriptions/me", { requireAuth: true });
        return NextResponse.json(res.data.data, { status: res.status });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const res = await apiClient("/subscriptions/me", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data.data, { status: res.status });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: error.status || 500 });
    }
}
