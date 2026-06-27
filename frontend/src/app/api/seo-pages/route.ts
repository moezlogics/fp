import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "";
        const citySlug = searchParams.get("citySlug") || "";
        const page = searchParams.get("page") || "1";
        const limit = searchParams.get("limit") || "50";

        const qs = new URLSearchParams();
        if (type) qs.set("type", type);
        if (citySlug) qs.set("citySlug", citySlug);
        qs.set("page", page);
        qs.set("limit", limit);

        const res = await apiClient(`/seo-pages?${qs.toString()}`, { requireAuth: false });
        return NextResponse.json(res.data.data);
    } catch (error) {
        return NextResponse.json({ docs: [], total: 0 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const res = await apiClient("/seo-pages/regenerate", {
            method: "POST",
            requireAuth: true,
        });

        return NextResponse.json(res.data.data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to regenerate" }, { status: 500 });
    }
}

// PUT: Bulk touch - update all dates
export async function PUT(req: Request) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const res = await apiClient("/seo-pages/bulk-touch", {
            method: "POST",
            requireAuth: true,
        });

        return NextResponse.json(res.data.data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update dates" }, { status: 500 });
    }
}
