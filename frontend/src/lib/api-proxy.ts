import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * Generic authenticated proxy for Split Bill, Gift Cards, Menu Items, and Table Orders.
 * Pattern: /api/[feature]/[...path] → Core API /api/v1/[feature]/[...path]
 */

async function proxy(req: Request, apiPath: string, requireAuth = true) {
    try {
        const session = await auth();
        if (requireAuth && !session?.accessToken) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const options: any = {
            method: req.method,
            requireAuth,
        };

        if (req.method === "POST" || req.method === "PATCH" || req.method === "PUT") {
            options.body = JSON.stringify(await req.json().catch(() => ({})));
        }

        // apiClient returns { data: parsedJSON, status: number }
        // data is already the full backend response object { success, data, error }
        const res = await apiClient(apiPath, options);
        return NextResponse.json(res.data, { status: res.status });
    } catch (error: any) {
        console.error(`[Proxy] ${apiPath} Error:`, error?.message);
        return NextResponse.json({ success: false, error: error?.message || "Internal Server Error" }, { status: 500 });
    }
}

// ──────────────────────────────
// SPLIT BILL
// ──────────────────────────────

export { proxy };

