import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * POST /api/contact-leads — Submit a contact form (public, no auth)
 * Forwards the user's real IP via x-forwarded-for for rate-limiting.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, subject, message } = body;

        // Quick validation on proxy side
        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        // Forward the real client IP
        const clientIp =
            req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            req.headers.get("x-real-ip") ||
            "unknown";

        const res = await apiClient("/contact-leads", {
            method: "POST",
            headers: { "x-forwarded-for": clientIp },
            body: JSON.stringify({
                name: name.trim().substring(0, 100),
                email: email.trim().substring(0, 200),
                subject,
                message: message.trim().substring(0, 2000),
            }),
            requireAuth: false,
        });

        const payload = res.data?.data ?? res.data ?? {};
        return NextResponse.json(payload, { status: res.status || 201 });
    } catch (error: any) {
        const msg = error?.message || "Failed to submit message";
        console.error("[contact-leads POST] Error:", msg);

        const isRateLimit =
            msg.toLowerCase().includes("already submitted") ||
            msg.toLowerCase().includes("recently") ||
            msg.toLowerCase().includes("too many");

        return NextResponse.json(
            { error: msg },
            { status: isRateLimit ? 429 : 500 }
        );
    }
}

/**
 * GET /api/contact-leads — Admin: list leads OR get stats
 * Use ?stats=true for aggregate stats.
 */
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);

        // ── Stats endpoint ──
        if (searchParams.get("stats") === "true") {
            const res = await apiClient("/contact-leads/stats", {
                requireAuth: true,
            });
            const payload = res.data?.data ?? res.data ?? {};
            return NextResponse.json(payload);
        }

        // ── Paginated list with filters ──
        const page = searchParams.get("page") || "1";
        const limit = searchParams.get("limit") || "30";
        const status = searchParams.get("status") || "";
        const search = searchParams.get("search") || "";

        let apiPath = `/contact-leads?page=${page}&limit=${limit}`;
        if (status) apiPath += `&status=${status}`;
        if (search) apiPath += `&search=${encodeURIComponent(search)}`;

        const res = await apiClient(apiPath, { requireAuth: true });
        const payload = res.data?.data ?? res.data ?? {};
        return NextResponse.json(payload);
    } catch (error: any) {
        console.error("[contact-leads GET] Error:", error?.message);
        return NextResponse.json({ docs: [], total: 0 });
    }
}
