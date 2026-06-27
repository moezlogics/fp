import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { requireOwnerOrAdmin } from "@/lib/api-route-guards";

/**
 * Merchant Wallet proxy routes — /api/owner/merchant-wallet/*
 * Proxies to Core API: /api/v1/merchant-wallet/*
 */

export async function GET(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 },
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/api/owner/merchant-wallet/");
    const subPath = pathParts[1] || "balance";

    const res = await apiClient(
      `/merchant-wallet/${subPath}?restaurantId=${encodeURIComponent(restaurantId)}`,
      {
        requireAuth: true,
      },
    );

    return NextResponse.json(res.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch" },
      { status: error.status || 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const body = await req.json();

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/api/owner/merchant-wallet/");
    const subPath = pathParts[1] || "bank-details";

    const res = await apiClient(`/merchant-wallet/${subPath}`, {
      method: "PUT",
      body: JSON.stringify(body),
      requireAuth: true,
    });

    return NextResponse.json(res.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update" },
      { status: error.status || 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const body = await req.json();

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/api/owner/merchant-wallet/");
    const subPath = pathParts[1] || "withdraw";

    const res = await apiClient(`/merchant-wallet/${subPath}`, {
      method: "POST",
      body: JSON.stringify(body),
      requireAuth: true,
    });

    return NextResponse.json(res.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process" },
      { status: error.status || 500 },
    );
  }
}
