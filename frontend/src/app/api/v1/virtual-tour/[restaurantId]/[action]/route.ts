import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { requireOwnerOrAdmin } from "@/lib/api-route-guards";

/**
 * Catch-all proxy for /api/v1/virtual-tour/:restaurantId/:action
 *
 * Maps owner-facing VT API calls to the Node.js backend:
 *   GET  /api/v1/virtual-tour/:id/status      → GET  /virtual-tour/:id/status
 *   GET  /api/v1/virtual-tour/:id/tour-data    → GET  /virtual-tour/:id/tour-data
 *   POST /api/v1/virtual-tour/:id/create-session → POST /virtual-tour/:id/create-session
 *   PUT  /api/v1/virtual-tour/:id/publish       → PUT  /virtual-tour/:id/publish
 */

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; action: string }> };

// ── GET handler (status, tour-data) ──
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { restaurantId, action } = await ctx.params;

    // status is public-readable on the backend, but we still gate it for owner dashboard
    const res = await apiClient(`/virtual-tour/${restaurantId}/${action}`, {
      requireAuth: false,
    });

    const payload = res.data?.data ?? res.data ?? {};
    return NextResponse.json(payload, { status: res.status });
  } catch (error: any) {
    console.error("[vt-proxy GET]", error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed" },
      { status: error?.status || 500 },
    );
  }
}

// ── POST handler (create-session) ──
export async function POST(req: Request, ctx: RouteContext) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const { restaurantId, action } = await ctx.params;
    const body = await req.text();

    const res = await apiClient(`/virtual-tour/${restaurantId}/${action}`, {
      method: "POST",
      body,
      requireAuth: true,
    });

    const payload = res.data?.data ?? res.data ?? {};
    return NextResponse.json(payload, { status: res.status });
  } catch (error: any) {
    console.error("[vt-proxy POST]", error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed" },
      { status: error?.status || 500 },
    );
  }
}

// ── PUT handler (publish/unpublish) ──
export async function PUT(req: Request, ctx: RouteContext) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const { restaurantId, action } = await ctx.params;
    const body = await req.text();

    const res = await apiClient(`/virtual-tour/${restaurantId}/${action}`, {
      method: "PUT",
      body,
      requireAuth: true,
    });

    const payload = res.data?.data ?? res.data ?? {};
    return NextResponse.json(payload, { status: res.status });
  } catch (error: any) {
    console.error("[vt-proxy PUT]", error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed" },
      { status: error?.status || 500 },
    );
  }
}
