import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * POST /api/site-reviews — Submit a site review (public, no auth)
 * Forwards the user's real IP via x-forwarded-for for rate-limiting.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { rating, phone, message } = body;

        // Validate rating on proxy side to avoid unnecessary backend calls
        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: "Rating must be between 1 and 5" },
                { status: 400 }
            );
        }

        // Get the secure server-side session ID if user is logged in
        const session = await auth();
        const userId = session?.user?.id;

        // Forward the real client IP via header so backend rate-limiting works
        const clientIp =
            req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            req.headers.get("x-real-ip") ||
            "unknown";

        console.log("[site-reviews POST] Submitting:", { rating, phone: phone?.substring(0, 5), ip: clientIp, userId });

        const res = await apiClient("/site-reviews", {
            method: "POST",
            headers: { "x-forwarded-for": clientIp },
            body: JSON.stringify({
                rating,
                phone: (phone || "").substring(0, 20),
                message: (message || "").substring(0, 500),
                userId,
            }),
            requireAuth: false,
        });

        // Safely unwrap: apiClient returns { data: { success, data } }
        const payload = res.data?.data ?? res.data ?? {};
        console.log("[site-reviews POST] Success:", payload);
        return NextResponse.json(payload, { status: res.status || 201 });
    } catch (error: any) {
        const msg = error?.message || "Failed to submit review";
        console.error("[site-reviews POST] Error:", msg, error?.stack?.split("\n")[1]);

        // Detect rate-limit from backend error message
        const isRateLimit =
            msg.toLowerCase().includes("already submitted") ||
            msg.toLowerCase().includes("rate") ||
            msg.toLowerCase().includes("too many");

        return NextResponse.json(
            { error: msg },
            { status: isRateLimit ? 429 : 500 }
        );
    }
}

/**
 * GET /api/site-reviews — Admin list OR public stats
 * Use ?stats=true for public aggregate stats (JSON-LD schema).
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        // ── Public: stats for JSON-LD ──
        if (searchParams.get("stats") === "true") {
            const res = await apiClient("/site-reviews/stats", { requireAuth: false });
            const payload = res.data?.data ?? res.data ?? {};
            return NextResponse.json(payload);
        }

        // ── Admin: paginated list ──
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const page = searchParams.get("page") || "1";
        const limit = searchParams.get("limit") || "30";
        const res = await apiClient(`/site-reviews?page=${page}&limit=${limit}`, {
            requireAuth: true,
        });
        const payload = res.data?.data ?? res.data ?? {};
        return NextResponse.json(payload);
    } catch (error: any) {
        console.error("[site-reviews GET] Error:", error?.message);
        return NextResponse.json({ docs: [], total: 0 });
    }
}
