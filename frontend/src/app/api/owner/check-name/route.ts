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
    const brandName = searchParams.get("brandName") || "";
    const city = searchParams.get("city") || "";
    const ownerId = searchParams.get("ownerId") || "";
    const res = await apiClient(
      `/restaurants/check-name?brandName=${encodeURIComponent(brandName)}&city=${encodeURIComponent(city)}&ownerId=${encodeURIComponent(ownerId)}`,
    );
    const payload = res.data?.data ?? res.data ?? { available: true };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ available: true });
  }
}
