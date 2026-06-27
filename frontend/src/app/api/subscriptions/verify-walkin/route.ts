import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * POST /api/subscriptions/verify-walkin
 *
 * Proxies 3 different walk-in verification actions based on `action` field:
 *   - "check"   → POST /subscriptions/verify-walkin/check
 *   - "otp"     → POST /subscriptions/verify-walkin/otp
 *   - "confirm" → POST /subscriptions/verify-walkin/confirm
 */
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only owners/admins can verify walk-ins
        const role = (session.user as any).role;
        if (role !== "owner" && role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { action, ...payload } = body;

        if (!action || !["check", "otp", "confirm"].includes(action)) {
            return NextResponse.json(
                { error: "Invalid action. Use: check, otp, or confirm." },
                { status: 400 }
            );
        }

        const res = await apiClient(`/subscriptions/verify-walkin/${action}`, {
            method: "POST",
            body: JSON.stringify(payload),
            requireAuth: true,
        });

        // apiClient returns { data: { success, data: ... }, status }
        // The actual payload is inside res.data.data or res.data
        const responseData = res.data?.data ?? res.data;
        return NextResponse.json(responseData);
    } catch (error: any) {
        console.error("[verify-walkin proxy] Error:", error?.message);
        const status = error?.status || 500;
        const message = error?.message || "Internal server error";
        return NextResponse.json({ error: message }, { status });
    }
}
