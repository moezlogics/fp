import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/media — List all media from the backend Media collection.
 * Supports pagination, search, and type filtering.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        // Secure the route: Admin only
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = searchParams.get("page") || "1";
        const limit = searchParams.get("limit") || "40";
        const search = searchParams.get("search") || "";
        const type = searchParams.get("type") || "";

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const internalSecret = process.env.INTERNAL_SECRET || "foodies_internal_bypass_secure_key_2024";

        const queryParams = new URLSearchParams({ page, limit });
        if (search) queryParams.set("search", search);
        if (type) queryParams.set("type", type);

        const response = await fetch(`${apiUrl}/api/v1/media?${queryParams}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-internal-secret": internalSecret,
            },
            cache: "no-store",
        });

        if (!response.ok) {
            // Fallback to CDN list if backend doesn't have data yet
            const cdnUrl = process.env.CDN_BASE_URL || "http://localhost:3001";
            const cdnKey = process.env.CDN_API_KEY || "fpk-cdn-secret-key-change-in-production";

            const cdnResponse = await fetch(`${cdnUrl}/api/media/list?page=${page}&limit=${limit}`, {
                method: "GET",
                headers: { "x-cdn-key": cdnKey },
                cache: "no-store",
            });

            if (!cdnResponse.ok) {
                return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
            }

            const cdnData = await cdnResponse.json();
            return NextResponse.json(cdnData);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("[Next.js] Proxy Media List error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
