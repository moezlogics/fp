import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * GET /api/owner/vouchers?restaurantId=xxx — List owner's vouchers.
 * POST /api/owner/vouchers — Create a new voucher.
 * Proxies to the Core API.
 */
async function requireOwnerOrAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!["owner", "admin"].includes(role)) {
    return {
      error: NextResponse.json(
        { error: "Owner or admin access required" },
        { status: 403 },
      ),
    };
  }

  return { session };
}

export async function GET(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (guard.error) return guard.error;

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    if (!restaurantId)
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 },
      );

    const res = await apiClient(`/vouchers/restaurant/${restaurantId}`, {
      requireAuth: true,
    });

    return NextResponse.json(res.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch vouchers" },
      { status: error.response?.status || 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (guard.error) return guard.error;

    const body = await req.json();

    const res = await apiClient("/vouchers", {
      method: "POST",
      body: JSON.stringify(body),
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (err: any) {
    console.error("Voucher creation proxy error:", err);
    return NextResponse.json(
      { error: "Failed to create voucher" },
      { status: err.response?.status || 500 },
    );
  }
}
