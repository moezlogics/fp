import { Metadata } from "next";
import { apiClient } from "@/lib/api-client";

export type PublicSiteSettings = {
    siteName: string;
    tagline: string;
    faviconUrl: string;
    logoUrl: string;
    logoWidthDesktop: number;
    logoHeightDesktop: number;
    logoWidthMobile: number;
    logoHeightMobile: number;
    homeContent: string;
    defaultMetaTitle: string;
    defaultMetaDescription: string;
    homepageTitle: string;
    homepageMetaDescription: string;
    contactEmail: string;
    contactPhone: string;
    whatsapp: string;
    facebookUrl: string;
    instagramUrl: string;
    tiktokUrl: string;
    youtubeUrl: string;
};

export const DEFAULT_PUBLIC_SITE_SETTINGS: PublicSiteSettings = {
    siteName: "Foodies Pakistan",
    tagline: "Pakistan's #1 Restaurant Discovery & Booking Platform",
    faviconUrl: "",
    logoUrl: "",
    logoWidthDesktop: 140,
    logoHeightDesktop: 40,
    logoWidthMobile: 100,
    logoHeightMobile: 32,
    homeContent: "",
    defaultMetaTitle: "Best Restaurants in Pakistan - Foodies Pakistan",
    defaultMetaDescription:
        "Discover, book, and save at Pakistan's top restaurants. Exclusive bank deals, verified reviews, and instant reservations.",
    homepageTitle: "Foodies Pakistan - Best Restaurant Deals & Discovery",
    homepageMetaDescription:
        "Discover the best restaurants near you in Pakistan. Exclusive bank deals, menu photos, reviews, and directions.",
    contactEmail: "",
    contactPhone: "",
    whatsapp: "",
    facebookUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
    youtubeUrl: "",
};

export async function getPublicSiteSettings(revalidateSeconds = 60): Promise<PublicSiteSettings> {
    try {
        const res = await apiClient("/settings/public", {
            requireAuth: false,
            next: { revalidate: revalidateSeconds },
        });
        const settings = res.data?.data || res.data || {};
        return {
            ...DEFAULT_PUBLIC_SITE_SETTINGS,
            ...settings,
        };
    } catch {
        return DEFAULT_PUBLIC_SITE_SETTINGS;
    }
}

export function withSiteName(title: string, siteName: string): string {
    if (!title) return siteName;
    return title.toLowerCase().includes(siteName.toLowerCase()) ? title : `${title} | ${siteName}`;
}

export async function buildPageMetadata(
    {
        title,
        description,
        index = true,
        follow = true,
        canonicalPath,
        ogType = "website",
    }: {
        title: string;
        description?: string;
        index?: boolean;
        follow?: boolean;
        /** e.g. "/about" — will be appended to SITE_URL for canonical + OG url */
        canonicalPath?: string;
        ogType?: "website" | "article";
    },
    revalidateSeconds = 300
): Promise<Metadata> {
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";
    const settings = await getPublicSiteSettings(revalidateSeconds);
    const siteName = settings.siteName || DEFAULT_PUBLIC_SITE_SETTINGS.siteName;
    const resolvedTitle = withSiteName(title, siteName);
    const resolvedDescription = description || settings.defaultMetaDescription;
    const rawCanonical = canonicalPath ? `${SITE_URL}${canonicalPath}` : undefined;
    const canonicalUrl = rawCanonical && !rawCanonical.endsWith('/') ? `${rawCanonical}/` : rawCanonical;

    return {
        title: resolvedTitle,
        description: resolvedDescription,
        robots: { index, follow },
        ...(canonicalUrl ? { alternates: { canonical: canonicalUrl } } : {}),
        openGraph: {
            siteName,
            title: resolvedTitle,
            description: resolvedDescription,
            type: ogType,
            ...(canonicalUrl ? { url: canonicalUrl } : {}),
        },
        twitter: {
            card: "summary_large_image",
            title: resolvedTitle,
            description: resolvedDescription,
        },
    };
}


