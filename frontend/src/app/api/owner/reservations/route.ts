import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";
import { requireOwnerOrAdmin } from "@/lib/api-route-guards";

/**
 * GET /api/owner/reservations?restaurantId=xxx&date=2026-03-15&status=Confirmed
 * Proxies the Owner reservations fetch request to the Core API.
 */
export async function GET(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    const date = searchParams.get("date");
    const status = searchParams.get("status");

    if (!restaurantId)
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 },
      );

    // Build the query string dynamically
    const queryParams = new URLSearchParams();
    if (date) queryParams.set("date", date);
    if (status) queryParams.set("status", status);

    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : "";

    // Proxy to the Core API
    const res = await apiClient(
      `/reservations/restaurant/${restaurantId}${queryString}`,
      {
        requireAuth: true,
      },
    );

    return NextResponse.json({ reservations: res.data?.data || [] });
  } catch (error: any) {
    console.error("Fetch owner reservations proxy error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}
