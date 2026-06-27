import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

async function requireOwnerOrAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!["owner", "admin"].includes(role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Owner or admin access required" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    session,
  };
}

/**
 * GET /api/owner/booking-settings?restaurantId=xxx
 * Proxy to backend: GET /api/v1/booking-settings/restaurant/:restaurantId
 */
export async function GET(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) {
      return guard.response;
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 },
      );
    }

    const res = await apiClient(
      `/booking-settings/restaurant/${restaurantId}`,
      {
        requireAuth: true,
      },
    );

    return NextResponse.json(res.data);
  } catch (error: any) {
    console.error("[booking-settings GET]", error?.message);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch booking settings" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/owner/booking-settings?restaurantId=xxx
 * Proxy to backend: PUT /api/v1/booking-settings/restaurant/:restaurantId
 */
export async function PUT(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) {
      return guard.response;
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 },
      );
    }

    const body = await req.json();

    const res = await apiClient(
      `/booking-settings/restaurant/${restaurantId}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
        requireAuth: true,
      },
    );

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    console.error("[booking-settings PUT]", error?.message);
    return NextResponse.json(
      { error: error?.message || "Failed to save booking settings" },
      { status: 500 },
    );
  }
}
