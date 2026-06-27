import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        console.log(`[API Proxy] GET menu-items for restaurant ID: ${id}`);
        
        const res = await apiClient(`/menu-items/restaurant/${id}`, { requireAuth: true });
        console.log(`[API Proxy] Backend returned status: ${res.status}`);
        
        return NextResponse.json(res.data, { status: res.status });
    } catch (err: any) {
        console.error(`[API Proxy] Error fetching items for ${id || 'unknown'}:`, err.message);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: err.response?.status || err.status || 500 }
        );
    }
}
