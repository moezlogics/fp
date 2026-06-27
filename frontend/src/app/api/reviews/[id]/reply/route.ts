import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * POST /api/reviews/[id]/reply
 * Threaded reply on a review. Both auth and guest supported.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        const body = await req.json();

        const res = await apiClient(`/reviews/${id}/reply`, {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: !!session?.user,
        });

        const data = res.data?.data || res.data;
        return NextResponse.json(data);
    } catch (error: any) {
        const errMsg = error?.message || "Failed to post reply.";
        return NextResponse.json({ error: errMsg }, { status: error?.status || 500 });
    }
}
