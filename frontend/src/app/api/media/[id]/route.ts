import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/media/[id] — Delete a media item via the backend API.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || (session.user as any)?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const internalSecret = process.env.INTERNAL_SECRET || "foodies_internal_bypass_secure_key_2024";

        const response = await fetch(`${apiUrl}/api/v1/media/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "x-internal-secret": internalSecret,
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("[Next.js] Proxy Media Delete error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
