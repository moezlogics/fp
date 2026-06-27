import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * GET /api/owner/yield-calendar?restaurantId=xxx&month=2026-03
 *
 * Proxies to Core API to get the full month's slot inventory matrix for the owner's
 * Yield Calendar UI.
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["owner", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Owner or admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    const month = searchParams.get("month"); // "2026-03"

    if (!restaurantId || !month) {
      return NextResponse.json(
        { error: "restaurantId and month required" },
        { status: 400 },
      );
    }

    const res = await apiClient(
      `/yield-calendar/restaurant/${restaurantId}?month=${month}`,
      {
        requireAuth: true,
      },
    );

    return NextResponse.json(res.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch calendar" },
      { status: error.response?.status || 500 },
    );
  }
}

/**
 * PUT /api/owner/yield-calendar
 * Owner manually updates a specific slot's discount or blocks it.
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["owner", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Owner or admin access required" },
        { status: 403 },
      );
    }

    const body = await req.json();

    const res = await apiClient("/yield-calendar", {
      method: "PUT",
      body: JSON.stringify(body),
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update slot" },
      { status: error.response?.status || 500 },
    );
  }
}
