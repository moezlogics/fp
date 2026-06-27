import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { requireOwnerOrAdmin } from "@/lib/api-route-guards";

export async function GET(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    if (!restaurantId)
      return NextResponse.json(
        { error: "Missing restaurantId" },
        { status: 400 },
      );

    const res = await apiClient(`/deals/restaurant/${restaurantId}`, {
      requireAuth: true,
    });

    return NextResponse.json(res.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch deals" },
      { status: error.status || 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const body = await req.json();

    const res = await apiClient("/deals", {
      method: "POST",
      body: JSON.stringify(body),
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create deal" },
      { status: error.status || 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get("dealId");
    if (!dealId)
      return NextResponse.json({ error: "Missing dealId" }, { status: 400 });

    const body = await req.json();

    const res = await apiClient(`/deals/${dealId}`, {
      method: "PUT",
      body: JSON.stringify(body),
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update deal" },
      { status: error.status || 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get("dealId");
    if (!dealId)
      return NextResponse.json({ error: "Missing dealId" }, { status: 400 });

    const res = await apiClient(`/deals/${dealId}`, {
      method: "DELETE",
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete deal" },
      { status: error.status || 500 },
    );
  }
}
