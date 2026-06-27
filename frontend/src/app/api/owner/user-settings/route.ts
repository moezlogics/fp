import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiClient } from "@/lib/api-client";

function ensureOwnerOrAdmin(session: any) {
  const role = (session?.user as any)?.role;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["owner", "admin"].includes(role)) {
    return NextResponse.json(
      { error: "Owner access required" },
      { status: 403 },
    );
  }

  return null;
}

/**
 * GET /api/owner/user-settings
 * Returns the authenticated owner's live profile (including isApproved).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const authError = ensureOwnerOrAdmin(session);
    if (authError) return authError;

    const accessToken = (session as any)?.accessToken;
    if (!accessToken) {
      console.error(
        "[user-settings GET] No accessToken in session for user:",
        (session?.user as any)?.id,
      );
      return NextResponse.json({ error: "No auth token" }, { status: 401 });
    }

    const res = await apiClient("/users/profile", { requireAuth: true }).catch(err => { console.error("[user-settings] API call failed:", err); throw err; });
    const user = res.data?.data || res.data;
    return NextResponse.json(user);
  } catch (error: any) {
    console.error("[user-settings GET] ERROR:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch" },
      { status: 500 },
    );
  }
}
/**
 * PUT /api/owner/user-settings
 * Updates owner-specific user fields (branchType, etc.)
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    const authError = ensureOwnerOrAdmin(session);
    if (authError) return authError;

    const body = await req.json();
    const { branchType } = body;

    if (branchType && !["single", "multi"].includes(branchType)) {
      return NextResponse.json(
        { error: "Invalid branchType" },
        { status: 400 },
      );
    }

    const res = await apiClient(`/users/profile`, {
      method: "PUT",
      body: JSON.stringify({ branchType }),
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    console.error("Update user settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
