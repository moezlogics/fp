import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { requireOwnerOrAdmin } from "@/lib/api-route-guards";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const { restaurantId } = await params;
    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 },
      );
    }

    const res = await apiClient(`/analytics/owner/${restaurantId}`, {
      requireAuth: true,
    });

    const payload = res.data?.data ?? res.data ?? {};
    return NextResponse.json(payload, { status: res.status });
  } catch (error: any) {
    console.error("[owner/analytics] Error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch analytics" },
      { status: error?.status || 500 },
    );
  }
}
