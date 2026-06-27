import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderCode: string }> }
) {
  try {
    const { orderCode } = await params;

    if (!orderCode) {
      return NextResponse.json(
        { success: false, error: "orderCode required" },
        { status: 400 }
      );
    }

    const res = await apiClient(`/table-orders/${orderCode}`, {
      requireAuth: false,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch order" },
      { status: error?.status || 500 }
    );
  }
}
