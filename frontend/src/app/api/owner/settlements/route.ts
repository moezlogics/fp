import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["owner", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Owner or admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    if (!restaurantId)
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 },
      );

    const res = await apiClient(`/settlements/restaurant/${restaurantId}`, {
      requireAuth: true,
    });

    return NextResponse.json(res.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch settlements" },
      { status: error.response?.status || 500 },
    );
  }
}
