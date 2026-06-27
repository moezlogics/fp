import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { requireOwnerOrAdmin } from "@/lib/api-route-guards";

/**
 * Proxy for /api/v1/virtual-tour/:restaurantId/scene/:sceneId/:action
 *
 * Maps owner-facing VT scene sub-actions to the Node.js backend:
 *   PUT /scene/:id/hotspots       → Save hotspots for a scene
 *   PUT /scene/:id/initial-view   → Save initial camera angle
 */

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ restaurantId: string; sceneId: string; action: string }>;
};

// ── PUT handler (hotspots, initial-view) ──
export async function PUT(req: Request, ctx: RouteContext) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const { restaurantId, sceneId, action } = await ctx.params;

    // Only allow known actions
    if (!["hotspots", "initial-view"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Unknown action" },
        { status: 400 },
      );
    }

    const body = await req.text();

    const res = await apiClient(
      `/virtual-tour/${restaurantId}/scene/${sceneId}/${action}`,
      {
        method: "PUT",
        body,
        requireAuth: true,
      },
    );

    const payload = res.data?.data ?? res.data ?? {};
    return NextResponse.json(payload, { status: res.status });
  } catch (error: any) {
    console.error(`[vt-proxy PUT scene/${(await ctx.params).action}]`, error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed" },
      { status: error?.status || 500 },
    );
  }
}
