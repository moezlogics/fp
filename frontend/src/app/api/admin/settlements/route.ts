import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== "admin")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const res = await apiClient(
      `/settlements${status ? `?status=${status}` : ""}`,
      { requireAuth: true },
    );
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

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== "admin")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const res = await apiClient("/settlements", {
      method: "POST",
      requireAuth: true,
    });

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

export async function PUT(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== "admin")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const res = await apiClient("/settlements", {
      method: "PUT",
      body: JSON.stringify(body),
      requireAuth: true,
    });

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
