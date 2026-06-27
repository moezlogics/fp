import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ restaurantId: string }> }
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

    const { restaurantId } = await params;
    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 }
      );
    }

    const res = await apiClient(`/table-orders/restaurant/${restaurantId}/live`, {
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch live table orders" },
      { status: error?.status || 500 }
    );
  }
}
