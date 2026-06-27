import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

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

    const res = await apiClient(`/yield-rules/restaurant/${restaurantId}`, {
      requireAuth: true,
    });

    return NextResponse.json(res.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch yield rules" },
      { status: error.status || 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (guard.error) return guard.error;

    const body = await req.json();

    const res = await apiClient("/yield-rules", {
      method: "POST",
      body: JSON.stringify(body),
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to create yield rule" },
      { status: error.status || 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (guard.error) return guard.error;

    const { searchParams } = new URL(req.url);
    const ruleId = searchParams.get("ruleId");
    if (!ruleId)
      return NextResponse.json({ error: "ruleId required" }, { status: 400 });

    const body = await req.json();

    const res = await apiClient(`/yield-rules/${ruleId}`, {
      method: "PUT",
      body: JSON.stringify(body),
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update yield rule" },
      { status: error.status || 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (guard.error) return guard.error;

    const { searchParams } = new URL(req.url);
    const ruleId = searchParams.get("ruleId");
    if (!ruleId)
      return NextResponse.json({ error: "ruleId required" }, { status: 400 });

    const res = await apiClient(`/yield-rules/${ruleId}`, {
      method: "DELETE",
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to delete yield rule" },
      { status: error.status || 500 },
    );
  }
}
