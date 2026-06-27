import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

async function requireOwnerOrAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!["owner", "admin"].includes(role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Owner or admin access required" },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const, session };
}

/* GET — fetch owner's restaurants (all branches) */
export async function GET(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const { session } = guard;
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get("ownerId") || session.user.id;
    const branchId = searchParams.get("branchId");

    if (branchId) {
      // Fetch specific branch
      const res = await apiClient(`/restaurants/id/${branchId}`, {
        requireAuth: true,
      });
      // apiClient wraps as { data: { success, data } }
      return NextResponse.json(res.data?.data || res.data);
    }

    // Fetch all branches for this owner
    const res = await apiClient(`/restaurants/owner/my?ownerId=${ownerId}`, {
      requireAuth: true,
    });
    // apiClient wraps as { data: { success, data: [...] } }
    const branches = res.data?.data || res.data;
    return NextResponse.json(Array.isArray(branches) ? branches : []);
  } catch (error: any) {
    console.error("Fetch owner restaurants error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch" },
      { status: 500 },
    );
  }
}

/* POST — create new branch */
export async function POST(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const body = await req.json();

    const res = await apiClient("/restaurants", {
      method: "POST",
      body: JSON.stringify(body),
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    console.error("Create owner restaurant error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to create restaurant" },
      { status: 500 },
    );
  }
}

/* PUT — update branch details */
export async function PUT(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const res = await apiClient(`/restaurants/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
      requireAuth: true,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error: any) {
    console.error("Update owner restaurant error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to update restaurant" },
      { status: 500 },
    );
  }
}

/* DELETE — remove a branch */
export async function DELETE(req: Request) {
  try {
    const guard = await requireOwnerOrAdmin();
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const res = await apiClient(`/restaurants/${id}`, {
      method: "DELETE",
      requireAuth: true,
    });

    return NextResponse.json({ success: true }, { status: res.status });
  } catch (error: any) {
    console.error("Delete owner restaurant error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete restaurant" },
      { status: 500 },
    );
  }
}
