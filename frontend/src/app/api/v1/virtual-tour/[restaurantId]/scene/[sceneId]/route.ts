import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { requireOwnerOrAdmin } from "@/lib/api-route-guards";

/**
 * Proxy for /api/v1/virtual-tour/:restaurantId/scene/:sceneId
 *
 * Maps owner-facing VT scene API calls to the Node.js backend:
 *   GET    /scene/:id        → Get scene data (for hotspot editor)
 *   DELETE /scene/:id        → Delete scene
 */

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; sceneId: string }> };

// ── GET handler (scene data for hotspot editor) ──
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const { restaurantId, sceneId } = await ctx.params;

    const res = await apiClient(`/virtual-tour/${restaurantId}/scene/${sceneId}`, {
      requireAuth: true,
    });

    const payload = res.data?.data ?? res.data ?? {};
    return NextResponse.json(payload, { status: res.status });
  } catch (error: any) {
    console.error("[vt-proxy GET scene]", error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to get scene" },
      { status: error?.status || 500 },
    );
  }
}

// ── DELETE handler (delete scene) ──
export async function DELETE(_req: Request, ctx: RouteContext) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const { restaurantId, sceneId } = await ctx.params;

    const res = await apiClient(`/virtual-tour/${restaurantId}/scene/${sceneId}`, {
      method: "DELETE",
      requireAuth: true,
    });

    const payload = res.data?.data ?? res.data ?? {};
    return NextResponse.json(payload, { status: res.status });
  } catch (error: any) {
    console.error("[vt-proxy DELETE scene]", error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete scene" },
      { status: error?.status || 500 },
    );
  }
}
