import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = searchParams.get("page") || "1";
        const limit = searchParams.get("limit") || "10";
        const search = searchParams.get("search") || "";

        const res = await apiClient(`/reviews/admin?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, { requireAuth: true });
        return NextResponse.json(res.data?.data || res.data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch admin reviews." }, { status: 500 });
    }
}
