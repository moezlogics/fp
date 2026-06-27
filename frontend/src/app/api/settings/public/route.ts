import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * GET /api/settings/public â€” Fetch public branding settings (no auth)
 * Cached for 5 minutes to reduce backend load.
 */
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const res = await fetch(`${API_URL}/api/v1/settings/public`, {
            next: { revalidate: 60 },
        });
        const json = await res.json();
        return NextResponse.json(json?.data || json);
    } catch {
        return NextResponse.json({
            siteName: "Foodies Pakistan",
            tagline: "Pakistan's #1 Restaurant Discovery & Booking Platform",
            logoUrl: "",
            logoWidthDesktop: 140,
            logoHeightDesktop: 40,
            logoWidthMobile: 100,
            logoHeightMobile: 32,
            defaultMetaTitle: "Best Restaurants in Pakistan - Foodies Pakistan",
            defaultMetaDescription: "Discover, book, and save at Pakistan's top restaurants. Exclusive bank deals, verified reviews, and instant reservations.",
            homepageTitle: "Foodies Pakistan - Best Restaurant Deals & Discovery",
            homepageMetaDescription: "Discover the best restaurants near you in Pakistan. Exclusive bank deals, menu photos, reviews, and directions.",
            homeContent: "",
        });
    }
}

