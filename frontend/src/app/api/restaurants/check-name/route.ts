import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const name = searchParams.get("name");
        const city = searchParams.get("city");

        if (!name || !city) {
            return NextResponse.json({ error: "Name and city parameters are required" }, { status: 400 });
        }

        const res = await apiClient(`/profiles/check-restaurant-name?brandName=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`);

        return NextResponse.json(res);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to check name availability" }, { status: 500 });
    }
}
