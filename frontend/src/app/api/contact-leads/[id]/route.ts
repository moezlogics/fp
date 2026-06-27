import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

/**
 * GET /api/contact-leads/[id] — Admin: Get single lead detail
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const res = await apiClient(`/contact-leads/${id}`, {
            requireAuth: true,
        });
        const payload = res.data?.data ?? res.data ?? {};
        return NextResponse.json(payload);
    } catch (error: any) {
        console.error("[contact-leads/:id GET] Error:", error?.message);
        return NextResponse.json(
            { error: error?.message || "Failed to fetch lead" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/contact-leads/[id] — Admin: Update status or notes
 * Body: { status?: string, adminNotes?: string }
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await req.json();

        // Determine which backend endpoint to call
        let apiPath: string;
        let apiBody: string;

        if (body.status !== undefined) {
            apiPath = `/contact-leads/${id}/status`;
            apiBody = JSON.stringify({ status: body.status });
        } else if (body.adminNotes !== undefined) {
            apiPath = `/contact-leads/${id}/notes`;
            apiBody = JSON.stringify({ adminNotes: body.adminNotes });
        } else {
            return NextResponse.json(
                { error: "Must provide status or adminNotes" },
                { status: 400 }
            );
        }

        const res = await apiClient(apiPath, {
            method: "PATCH",
            body: apiBody,
            requireAuth: true,
        });
        const payload = res.data?.data ?? res.data ?? {};
        return NextResponse.json(payload);
    } catch (error: any) {
        console.error("[contact-leads/:id PATCH] Error:", error?.message);
        return NextResponse.json(
            { error: error?.message || "Failed to update lead" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/contact-leads/[id] — Admin: Delete lead
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;
        await apiClient(`/contact-leads/${id}`, {
            method: "DELETE",
            requireAuth: true,
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[contact-leads/:id DELETE] Error:", error?.message);
        return NextResponse.json(
            { error: error?.message || "Failed to delete lead" },
            { status: 500 }
        );
    }
}
