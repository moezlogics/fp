import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * POST /api/owner/branch-auth — Proxy to backend branch-auth endpoints
 *
 * Body: { action: "verify-pin" | "set-pin", branchId, pin, currentPin? }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["owner", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Owner or admin access required." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { action, ...payload } = body;

    if (!action || !["verify-pin", "set-pin"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const res = await apiClient(`/branch-auth/${action}`, {
      method: "POST",
      body: JSON.stringify(payload),
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    console.error("[branch-auth proxy] Error:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Branch auth request failed." },
      { status: 500 },
    );
  }
}
