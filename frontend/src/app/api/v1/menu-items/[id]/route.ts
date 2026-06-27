import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const res = await apiClient(`/menu-items/${id}`, { requireAuth: false });
        return NextResponse.json(res.data, { status: res.status });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: err.response?.status || err.status || 500 }
        );
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const res = await apiClient(`/menu-items/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
            requireAuth: true
        });
        return NextResponse.json(res.data, { status: res.status });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: err.response?.status || err.status || 500 }
        );
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const res = await apiClient(`/menu-items/${id}`, {
            method: "DELETE",
            requireAuth: true
        });
        return NextResponse.json(res.data, { status: res.status });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: err.response?.status || err.status || 500 }
        );
    }
}
