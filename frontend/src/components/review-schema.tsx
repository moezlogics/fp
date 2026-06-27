import { apiClient } from "@/lib/api-client";
import { getPublicSiteSettings } from "@/lib/public-site-settings";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

/**
 * ReviewSchema â€” Server Component
 * Renders AggregateRating JSON-LD for Google Search rich results.
 * Appears on all public pages (homepage, city, category, area pages).
 * Single restaurant pages use their own restaurant-specific review schema.
 */
export async function ReviewSchema() {
    let stats = { averageRating: 4.8, totalReviews: 0 };
    const settings = await getPublicSiteSettings(300);
    const siteName = settings.siteName || "Foodies Pakistan";

    try {
        const res = await apiClient("/site-reviews/stats", {
            requireAuth: false,
            next: { revalidate: 300 },
        } as any);
        if (res.data?.data) {
            const data = res.data.data as any;
            stats = {
                averageRating: data.averageRating || 4.8,
                totalReviews: data.totalReviews || 0,
            };
        }
    } catch {
        // Use defaults
    }

    // Don't render schema if no reviews yet
    if (stats.totalReviews === 0) return null;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": siteName,
        "url": SITE_URL,
        "applicationCategory": "Food & Drink",
        "operatingSystem": "Web",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": stats.averageRating.toFixed(1),
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": stats.totalReviews.toString(),
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
    );
}

