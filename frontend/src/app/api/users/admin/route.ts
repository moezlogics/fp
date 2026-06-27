import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function GET(req: Request) {
    try {
        const session = await auth();
        const user = session?.user as any;
        if (user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const role = searchParams.get("role") || "all";
        const page = searchParams.get("page") || "1";

        const res = await apiClient(`/users/admin?search=${encodeURIComponent(search)}&role=${role}&page=${page}`, {
            requireAuth: true,
        });

        // The frontend expects the array directly to match old behavior, or paginated object.
        return NextResponse.json(res.data.data ? res.data.data : res.data);
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to fetch users" }, { status: error.response?.status || 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await auth();
        const user = session?.user as any;
        if (user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { id, ...updates } = body;
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        const res = await apiClient(`/users/admin/${id}`, {
            method: "PUT",
            body: JSON.stringify(updates),
            requireAuth: true,
        });

        return NextResponse.json(res.data);
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to update user" }, { status: error.response?.status || 500 });
    }
}
