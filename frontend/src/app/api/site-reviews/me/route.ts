import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ hasReviewed: false }); // Guests handled by local storage and IP rate limit
        }

        const res = await apiClient("/site-reviews/me", { requireAuth: true });
        const payload = res.data?.data ?? res.data ?? { hasReviewed: false };
        return NextResponse.json(payload);
    } catch (error: any) {
        console.error("[site-reviews/me GET] Error:", error?.message);
        return NextResponse.json({ hasReviewed: false }); // Fail open, let backend reject if needed
    }
}
