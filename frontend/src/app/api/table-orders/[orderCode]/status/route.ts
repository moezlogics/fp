import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderCode: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["owner", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Owner or admin access required" },
        { status: 403 }
      );
    }

    const { orderCode } = await params;
    if (!orderCode) {
      return NextResponse.json(
        { error: "orderCode required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status } = body || {};

    if (!status || typeof status !== "string") {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    const res = await apiClient(`/table-orders/${orderCode}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update table order status" },
      { status: error?.status || 500 }
    );
  }
}
