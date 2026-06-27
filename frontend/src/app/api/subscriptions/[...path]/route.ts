import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiClient } from "@/lib/api-client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json();
        const resolvedParams = await params;
        const route = resolvedParams.path.join("/");

        const res = await apiClient(`/subscriptions/${route}`, {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data?.data || res.data, { status: res.status });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Subscription request failed." }, { status: error.status || 500 });
    }
}
