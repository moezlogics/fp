import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * POST /api/auth/impersonate
 * Admin-only: Generate JWT tokens for any user account.
 * Proxies to backend POST /auth/impersonate.
 */
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 401 });
        }

        const body = await req.json();
        const res = await apiClient("/auth/impersonate", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        const data = res.data?.data || res.data;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: "Impersonation failed" }, { status: 500 });
    }
}
