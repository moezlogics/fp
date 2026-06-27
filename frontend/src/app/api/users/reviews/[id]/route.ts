import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiClient } from "@/lib/api-client";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Pass to backend API (auth token attached via apiClient)
        const res = await apiClient(`/users/reviews/${id}`, {
            method: "PUT",
            requireAuth: true,
            body: JSON.stringify(body),
        });

        return NextResponse.json(res.data);
    } catch (error: any) {
        console.error("[USER_REVIEW_EDIT_PROXY_ERROR]", error);
        return NextResponse.json({ error: error.response?.data?.error || "Internal server error" }, { status: error.response?.status || 500 });
    }
}
