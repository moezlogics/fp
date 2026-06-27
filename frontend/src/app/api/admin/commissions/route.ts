import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await auth();
        const user = session?.user as any;
        if (user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const res = await apiClient("/commissions/admin", {
            requireAuth: true,
        });

        return NextResponse.json(res.data);
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to fetch commission profiles" }, { status: error.response?.status || 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        const user = session?.user as any;
        if (user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();

        const res = await apiClient("/commissions/admin", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data, { status: res.status });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to create commission profile" }, { status: error.response?.status || 500 });
    }
}
