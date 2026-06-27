import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const restaurantId = searchParams.get("restaurantId");

        if (!restaurantId) {
            return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
        }

        const res = await apiClient(`/vouchers?restaurantId=${restaurantId}&status=active`, {
            requireAuth: false,
        });

        return NextResponse.json({
            data: res.data.data || res.data.vouchers || res.data || [],
        });
    } catch (error: any) {
        // Return empty array on failure so the UI doesn't break
        return NextResponse.json({ data: [] });
    }
}
