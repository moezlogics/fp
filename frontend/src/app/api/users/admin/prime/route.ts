import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * GET /api/users/admin/prime?action=search&q=...
 * GET /api/users/admin/prime?action=active
 */
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || (session.user as any).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const action = searchParams.get("action");

        if (action === "search") {
            const q = searchParams.get("q") || "";
            const res = await apiClient(`/subscriptions/admin/search-users?q=${encodeURIComponent(q)}`, { requireAuth: true });
            return NextResponse.json(res.data);
        }

        if (action === "active") {
            const res = await apiClient("/subscriptions/admin/active", { requireAuth: true });
            return NextResponse.json(res.data);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * POST /api/users/admin/prime
 * Admin grants or cancels Prime for any user.
 * Body: { userId, action: "grant" | "cancel", durationMonths? }
 */
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || (session.user as any).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const res = await apiClient("/subscriptions/admin/prime", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json(res.data.data);
    } catch (error: any) {
        // apiClient throws an Error object with an optional .status property
        if (error.message) {
            return NextResponse.json(
                { error: error.message },
                { status: error.status || 500 }
            );
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

