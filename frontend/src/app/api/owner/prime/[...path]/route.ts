import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { requireOwnerOrAdmin } from "@/lib/api-route-guards";

function resolveSubPath(url: string) {
  const pathname = new URL(url).pathname;
  const parts = pathname.split("/api/owner/prime/");
  return parts[1] || "plans";
}

export async function GET(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const subPath = resolveSubPath(req.url);
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    const suffix = restaurantId
      ? `?restaurantId=${encodeURIComponent(restaurantId)}`
      : "";

    const res = await apiClient(
      `/restaurant-subscriptions/${subPath}${suffix}`,
      {
        requireAuth: true,
      },
    );

    return NextResponse.json(res.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch branch prime data" },
      { status: error?.status || 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const subPath = resolveSubPath(req.url);
    const body = await req.json();

    const res = await apiClient(`/restaurant-subscriptions/${subPath}`, {
      method: "POST",
      body: JSON.stringify(body),
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to process branch prime request" },
      { status: error?.status || 500 },
    );
  }
}
