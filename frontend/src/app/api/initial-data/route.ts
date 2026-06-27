import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const [settingsRes, citiesRes] = await Promise.allSettled([
            fetch(`${API_URL}/api/v1/settings/public`, { next: { revalidate: 60 } }).then(r => r.json()),
            apiClient("/cities", { requireAuth: false })
        ]);

        const settings = settingsRes.status === "fulfilled" ? (settingsRes.value?.data || settingsRes.value) : {};
        const cities = citiesRes.status === "fulfilled" ? (citiesRes.value?.data?.data || citiesRes.value?.data || []) : [];

        // Fallback for settings
        const finalSettings = Object.keys(settings || {}).length ? settings : {
            siteName: "Foodies Pakistan",
            tagline: "Pakistan's #1 Restaurant Discovery & Booking Platform",
            logoWidthDesktop: 140,
            logoHeightDesktop: 40,
            logoWidthMobile: 100,
            logoHeightMobile: 32,
        };

        return NextResponse.json({ settings: finalSettings, cities });
    } catch (e) {
        return NextResponse.json({ settings: {}, cities: [] }, { status: 500 });
    }
}
