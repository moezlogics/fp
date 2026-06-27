import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const res = await apiClient(
      `/analytics/reservations${date ? `?date=${date}` : ""}`,
      { requireAuth: true },
    );
    // Return exactly as expected: { reservations: [...] }
    return NextResponse.json(res.data.data);
  } catch (err: any) {
    if (err.response?.data?.error) {
      return NextResponse.json(
        { error: err.response.data.error },
        { status: err.response.status },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
