/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Metadata } from "next";
import { apiClient } from "@/lib/api-client";
import { withRedisCache } from "@/lib/redis-cache";
import { notFound } from "next/navigation";
import { getPublicSiteSettings } from "@/lib/public-site-settings";
import RestaurantDetailView from "./restaurant-view";
import ArchiveView from "./archive-view";
import VirtualTourView from "./virtual-tour-view";

interface Props {
  params: Promise<{ city: string; slug: string[] }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

// ISR: serve from cache, revalidate every 60 seconds in background
export const revalidate = 60;

async function fetchRestaurantData(slug: string) {
  return withRedisCache(
    `restaurantData:${slug}`,
    async () => {
      try {
        const res = await apiClient(`/restaurants/${slug}`, {
          requireAuth: false,
          next: { revalidate: 60 },
        });
        return (res.data.data as any) || null;
      } catch {
        return null;
      }
    },
    3600
  );
}

async function fetchMenuData(restaurantId: string) {
  return withRedisCache(
    `menuData:${restaurantId}`,
    async () => {
      try {
        const res = await apiClient(`/menu-items/${restaurantId}`, {
          requireAuth: false,
          next: { revalidate: 3600 },
        });
        return (res.data.data as any) || null;
      } catch {
        return [];
      }
    },
    300 // Short cache for menu frequently 
  );
}

async function fetchArchiveData(city: string, slug: string[]) {
  const cacheKey = `archiveData:${city}:${slug.join("-")}`;

  return withRedisCache(
    cacheKey,
    async () => {
      if (slug.length === 1) {
        const tag = slug[0];
        const [searchRes, catRes] = await Promise.all([
          apiClient(`/search/city/${city}/tag/${tag}`, { requireAuth: false }),
          apiClient("/categories", { requireAuth: false }),
        ]);
        return {
          mode: "tag" as const,
          tag,
          data: (searchRes.data.data as any),
          categories: (catRes.data.data as any) || [],
        };
      }

      if (slug.length === 2) {
        const [area, category] = slug;
        const res = await apiClient(
          `/search/city/${city}/area/${area}/category/${category}`,
          { requireAuth: false },
        );
        return {
          mode: "combo" as const,
          area,
          category,
          data: (res.data.data as any),
          categories: (res.data.data as any)?.categories || [],
        };
      }

      return null;
    },
    3600
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { city, slug } = await params;
  const sp = (searchParams ? await searchParams : {}) as Record<
    string,
    string | string[] | undefined
  >;
  const pageQuery = sp.page && Number(sp.page) > 1 ? `?page=${sp.page}` : "";
  const settings = await getPublicSiteSettings(300);
  const siteName = settings.siteName || "Foodies Pakistan";

  if (slug.length === 1) {
    const restaurantPayload = (await fetchRestaurantData(slug[0])) as any;
    if (restaurantPayload?.restaurant) {
      const r = restaurantPayload.restaurant;
      const deals = restaurantPayload.deals || [];
      const cuisineStr = r.cuisines?.slice(0, 3).join(", ") || "";
      const ratingStr =
        r.averageRating > 0
          ? ` ${r.averageRating.toFixed(1)} (${r.totalReviews || 0} reviews)`
          : "";
      const description =
        r.metaDescription ||
        `Serving ${cuisineStr || "multi-cuisine"} in ${r.area}, ${r.city}.${ratingStr ? ` Rated ${r.averageRating.toFixed(1)}/5 by ${r.totalReviews || 0} diners.` : ""} Find ${r.name} menu, deals & discounts, reviews and book a table instantly on ${siteName}.`;
      
      const hasMultipleBranches = Boolean(r.parentBrandId || (r.isHeadOffice && r.branchName && r.branchName !== "Main Branch"));
      const cleanBranch = (r.branchName || "").replace(/\s*branch\s*/gi, "").trim();
      const nameForTitle = hasMultipleBranches && cleanBranch
        ? `${r.brandName} ${cleanBranch}`
        : `${r.brandName || r.name}${r.city ? ` ${r.city}` : ""}`;

      const maxBankDeal = deals.reduce((max: number, d: any) => Math.max(max, d?.discountPercent || 0), 0);
      const maxCap = r.bookingSettings?.maxDiscountCap || 0;
      const maxDiscount = Math.max(maxBankDeal, maxCap);
      const discountTag = maxDiscount > 0 ? ` Get ${maxDiscount}% OFF` : "";

      const title = `${nameForTitle} Menu, Reviews, Bank Card Deals & Discounts${discountTag}`;
      const pageUrl = `${SITE_URL}/${city}/${slug[0]}/`;
      const images = r.coverImage
        ? [{ url: r.coverImage, width: 1200, height: 630, alt: r.name }]
        : [];

      const lastModDate = r.updatedAt ? new Date(r.updatedAt).toUTCString() : undefined;

      return {
        title,
        description,
        alternates: { canonical: pageUrl },
        robots: { index: true, follow: true },
        ...(lastModDate ? { other: { "last-modified": lastModDate } } : {}),
        openGraph: {
          title: `${nameForTitle} Menu, Reviews, Deals & Discounts${discountTag}`,
          description,
          url: pageUrl,
          siteName,
          type: "website",
          locale: "en_PK",
          images,
        },
        twitter: {
          card: "summary_large_image",
          title: `${nameForTitle} Menu, Reviews, Deals & Discounts${discountTag}`,
          description,
          images: r.coverImage ? [r.coverImage] : [],
        },
      };
    }
  }

  // ── Virtual Tour Sub-Route Metadata ──
  if (slug.length === 2 && slug[1] === "virtual-tour") {
    const restaurantPayload = (await fetchRestaurantData(slug[0])) as any;
    if (restaurantPayload?.restaurant) {
      const r = restaurantPayload.restaurant;
      const nameForTitle = r.brandName || r.name;

      return {
        title: `${nameForTitle} - 3D Virtual Tour | Foodies Pakistan`,
        // SEO: keep noindex (don't want tour sub-route ranking), but follow=true
        // preserves link equity back to the main restaurant page.
        robots: { index: false, follow: true },
        // Canonical points to MAIN restaurant page so any inbound links consolidate there.
        alternates: { canonical: `${SITE_URL}/${city}/${slug[0]}/` },
      };
    }
  }

  try {
    const result = await fetchArchiveData(city, slug);
    if (!result || !result.data?.cityDoc) throw new Error("Not found");

    const { data, mode } = result;
    const { cityDoc, category, area, seoPage } = data;
    const cityName = cityDoc.name;

    if (mode === "combo" && category && area) {
      const canonical = `${SITE_URL}/${city}/${area.slug || slug[0]}/${category.slug || slug[1]}/${pageQuery}`;

      const archiveRestaurants = data.restaurants || data.docs || [];
      // SEO: prevent soft 404. If NO restaurants exist for this area+category combo,
      // return 404 regardless of whether a seoPage record exists — an empty page
      // with just editorial text is classified as soft 404 by Google.
      if (archiveRestaurants.length === 0) {
        notFound();
      }

      let archiveMaxDiscount = 0;
      archiveRestaurants.forEach((r: any) => {
        const cap = r.bookingSettings?.maxDiscountCap || 0;
        const dealMax = (r.deals || []).reduce((m: number, d: any) => Math.max(m, d?.discountPercent || 0), 0);
        archiveMaxDiscount = Math.max(archiveMaxDiscount, cap, dealMax);
      });
      const discountStr = archiveMaxDiscount > 0 ? `up to ${archiveMaxDiscount}% off` : 'exclusive deals';

      const title =
        seoPage?.title && seoPage.isCustomized
          ? seoPage.title
          : `Best ${category.name} Restaurants in ${area.name}, ${cityName} Bank Card Deals & Discounts`;
      const description =
        seoPage?.metaDescription && seoPage.isCustomized
          ? seoPage.metaDescription
          : `Discover the best ${category.name.toLowerCase()} restaurants in ${area.name}, ${cityName}. Compare menus, read reviews, get bank card deals ${discountStr}, and book a table instantly.`;

      return {
        title,
        description,
        robots: { index: true, follow: true },
        alternates: { canonical },
        openGraph: {
          title: `Best ${category.name} in ${area.name}, ${cityName} — Deals & Booking`,
          description,
          siteName,
        },
        twitter: {
          card: "summary_large_image",
          title: `Best ${category.name} Restaurants in ${area.name}, ${cityName} Bank Card Deals & Discounts`,
          description: `Find the best ${category.name.toLowerCase()} restaurants in ${area.name}, ${cityName} with bank card deals ${discountStr}.`,
        },
      };
    }

    const displayName = category ? category.name : area?.name || slug[0];
    const isAreaOnly = !category && !!area;
    const canonical = `${SITE_URL}/${city}/${slug[0]}/${pageQuery}`;

    const tagRestaurants = data.restaurants || data.docs || [];
    // SEO: prevent soft 404. Require at least 1 restaurant to render the page.
    // Area-only pages with zero listings = thin content → Google flags as soft 404.
    if (tagRestaurants.length === 0) {
        notFound();
    }

    let tagMaxDiscount = 0;
    tagRestaurants.forEach((r: any) => {
      const cap = r.bookingSettings?.maxDiscountCap || 0;
      const dealMax = (r.deals || []).reduce((m: number, d: any) => Math.max(m, d?.discountPercent || 0), 0);
      tagMaxDiscount = Math.max(tagMaxDiscount, cap, dealMax);
    });
    const discountStr = tagMaxDiscount > 0 ? `up to ${tagMaxDiscount}% off` : 'exclusive deals';

    const title =
      seoPage?.title && seoPage.isCustomized
        ? seoPage.title
        : isAreaOnly
          ? `Best Restaurants in ${displayName}, ${cityName} Bank Card Deals & Discounts`
          : `Best ${displayName} Restaurants in ${cityName} Bank Card Deals & Discounts`;
    
    const description =
      seoPage?.metaDescription && seoPage.isCustomized
        ? seoPage.metaDescription
        : `Discover the best ${displayName.toLowerCase()} restaurants in ${cityName}. Compare menus, read reviews, get bank card deals ${discountStr}, and book a table instantly.`;
    const ogImage = seoPage?.featuredImage || undefined;

    return {
      title,
      description,
      // SEO: Area-only pages ARE indexable (they show restaurants in that area).
      // Previously blanket noindex killed valuable local traffic (e.g. "restaurants in Gulberg").
      // Only deindex if the page has too few restaurants (thin content).
      robots: {
        index: tagRestaurants.length >= 3,
        follow: true,
      },
      alternates: { canonical },
      openGraph: {
        title: `Best Restaurants in ${displayName}, ${cityName} — Deals & Booking`,
        description,
        siteName,
        ...(ogImage
          ? { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] }
          : {}),
      },
      twitter: {
        card: "summary_large_image",
        title: `Best Restaurants in ${displayName}, ${cityName} Bank Card Deals & Discounts`,
        description: `Find the best ${displayName.toLowerCase()} restaurants in ${cityName} with bank card deals ${discountStr}.`,
      },
    };
  } catch {
    return {
      title: "Page Not Found | Foodies Pakistan",
      robots: { index: false, follow: false },
    };
  }
}

export default async function CitySlugPage({ params }: Props) {
  const { city, slug } = await params;
  const decodedCity = decodeURIComponent(city).toLowerCase();
  const settings = await getPublicSiteSettings(300);
  const siteName = settings.siteName || "Foodies Pakistan";

  if (slug.length === 1) {
    const restaurantPayload = (await fetchRestaurantData(slug[0])) as any;
    if (restaurantPayload?.restaurant) {
      const menuItems = await fetchMenuData(restaurantPayload.restaurant._id);
      return (
        <RestaurantDetailView
          city={city}
          slug={slug[0]}
          payload={{ ...restaurantPayload, menuItems }}
          siteName={siteName}
        />
      );
    }
  }

  // ── Virtual Tour Sub-Route Render ──
  if (slug.length === 2 && slug[1] === "virtual-tour") {
    const restaurantPayload = (await fetchRestaurantData(slug[0])) as any;
    if (restaurantPayload?.restaurant) {
      return (
        <VirtualTourView 
          restaurant={restaurantPayload.restaurant}
          city={city}
        />
      );
    }
  }

  let result: Awaited<ReturnType<typeof fetchArchiveData>> = null;
  try {
    result = await fetchArchiveData(city, slug);
  } catch {
    notFound();
  }

  if (!result || !result.data?.cityDoc) notFound();

  return (
    <ArchiveView
      city={city}
      slug={slug}
      result={result}
      siteName={siteName}
    />
  );
}