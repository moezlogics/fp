import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const res = await apiClient("/subscriptions/plans", { requireAuth: false });
        return NextResponse.json(res.data.data);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || (session.user as any).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const res = await apiClient("/subscriptions/plans", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data.data, { status: 201 });
    } catch (error: any) {
        if (error.response?.data?.error) {
            return NextResponse.json({ error: error.response.data.error }, { status: error.response.status });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
