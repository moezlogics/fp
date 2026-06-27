import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";
import { toApiErrorResponse } from "@/lib/api-route-error";

// GET all restaurants for admin (with search + filter)
export async function GET(req: Request) {
    try {
        const session = await auth();
        const user = session?.user as any;
        if (user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status") || "all";
        const page = searchParams.get("page") || "1";

        const res = await apiClient(`/restaurants/admin?search=${encodeURIComponent(search)}&status=${status}&page=${page}`, {
            requireAuth: true,
        });

        return NextResponse.json(res.data?.data || res.data);
    } catch (error: any) {
        console.error("[Admin restaurants GET] Error:", error?.message);
        return toApiErrorResponse(error, "Failed to fetch");
    }
}

// POST create new restaurant (admin)
export async function POST(req: Request) {
    try {
        const session = await auth();
        const user = session?.user as any;
        if (user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const res = await apiClient("/restaurants", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data?.data || res.data, { status: 201 });
    } catch (error: any) {
        return toApiErrorResponse(error, "Failed to create restaurant");
    }
}

// PUT update restaurant (approve/reject/feature/edit)
export async function PUT(req: Request) {
    try {
        const session = await auth();
        const user = session?.user as any;
        if (user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { id, ...updates } = body;
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        const res = await apiClient(`/restaurants/${id}`, {
            method: "PUT",
            body: JSON.stringify(updates),
            requireAuth: true,
        });

        return NextResponse.json(res.data);
    } catch (error: any) {
        console.error("[Admin restaurants PUT] Error:", error?.message);
        return toApiErrorResponse(error, "Failed to update");
    }
}

// PATCH update-all-dates — single DB call, admin only
export async function PATCH(req: Request) {
    try {
        const session = await auth();
        const user = session?.user as any;
        if (user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const res = await apiClient("/restaurants/update-all-dates", {
            method: "PATCH",
            requireAuth: true,
        });

        return NextResponse.json(res.data);
    } catch (error: any) {
        console.error("[Admin restaurants PATCH] Error:", error?.message);
        return toApiErrorResponse(error, "Failed to update dates");
    }
}

// DELETE restaurant
export async function DELETE(req: Request) {
    try {
        const session = await auth();
        const user = session?.user as any;
        if (user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        const res = await apiClient(`/restaurants/${id}`, {
            method: "DELETE",
            requireAuth: true,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[Admin restaurants DELETE] Error:", error?.message);
        return toApiErrorResponse(error, "Failed to delete");
    }
}
