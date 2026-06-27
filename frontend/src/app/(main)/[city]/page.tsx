/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import Link from "next/link";
import { Metadata } from "next";
import { FilterSidebar } from "@/components/archive/filter-sidebar";
import { RestaurantGrid } from "@/components/archive/restaurant-grid";
import { ArchiveMapToggle } from "@/components/archive/archive-map-toggle";
import { MobileArchiveControls } from "@/components/archive/mobile-archive-controls";
import { apiClient } from "@/lib/api-client";
import { notFound } from "next/navigation";
import FaqSection from "@/components/ui/faq-section";
import { getPublicSiteSettings, withSiteName } from "@/lib/public-site-settings";

const INITIAL_PAGE_SIZE = 12;

// ISR: serve from cache, revalidate every 60 seconds in background
export const revalidate = 60;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams?: Promise<{ q?: string; page?: string | string[] }>;
}): Promise<Metadata> {
  const { city } = await params;
  const sp = (searchParams ? await searchParams : {}) as Record<
    string,
    string | string[] | undefined
  >;
  const cityName =
    decodeURIComponent(city).charAt(0).toUpperCase() +
    decodeURIComponent(city).slice(1);
  const settings = await getPublicSiteSettings(300);
  const siteName = settings.siteName || "Foodies Pakistan";

  const pageQuery = sp.page && Number(sp.page) > 1 ? `?page=${sp.page}` : "";
  const canonical = `https://foodiespakistan.pk/${city}${pageQuery}`;

  if (sp.q) {
    return {
      title: withSiteName(`"${sp.q}" - Search Results in ${cityName}`, siteName),
      description: `Search results for "${sp.q}" in ${cityName}. Find restaurants, deals, and book your table.`,
      robots: { index: false, follow: true },
    };
  }

  // Compute max discount dynamically from a lightweight, cached fetch
  let maxDiscount = 0;
  let isValidCity = false;
  try {
    const discountRes = await apiClient(
      `/restaurants?city=${decodeURIComponent(city).toLowerCase()}&limit=100&sort=-bookingSettings.maxDiscountCap&fields=deals,bookingSettings.maxDiscountCap`,
      { requireAuth: false, next: { revalidate: 300 } }
    );
    const docs = Array.isArray(discountRes.data?.data) ? discountRes.data.data : (discountRes.data?.data as any)?.docs || [];
    isValidCity = docs.length > 0;
    
    docs.forEach((r: any) => {
      const cap = r.bookingSettings?.maxDiscountCap || 0;
      const dealMax = (r.deals || []).reduce((m: number, d: any) => Math.max(m, d?.discountPercent || 0), 0);
      maxDiscount = Math.max(maxDiscount, cap, dealMax);
    });
  } catch { }

  if (!isValidCity) {
    notFound();
  }

  const discountStr = maxDiscount > 0 ? `up to ${maxDiscount}% off` : 'exclusive deals';

  return {
    title: `Best Restaurants in ${cityName} Deals, Bank Card Discounts & Table Booking`,
    description: `Discover the best restaurants in ${cityName}. Get ${discountStr} with bank card deals, exclusive discounts, and book your table instantly on ${siteName}.`,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title: `Best Restaurants in ${cityName} — Deals & Table Booking`,
      description: `Find top restaurants in ${cityName} with bank card deals, exclusive discounts, and instant table booking.`,
      siteName,
    },
    twitter: {
      card: "summary_large_image",
      title: `Best Restaurants in ${cityName} Deals, Bank Card Discounts & Table Booking`,
      description: `Discover the best restaurants in ${cityName} with deals ${discountStr}.`,
    },
  };
}
export default async function CityArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams?: Promise<{ q?: string; page?: string | string[] }>;
}) {
  const { city } = await params;
  const sp = (searchParams ? await searchParams : {}) as Record<
    string,
    string | string[] | undefined
  >;
  const searchQuery = sp.q as string | undefined;
  const decodedCity = decodeURIComponent(city).toLowerCase();
  const cityName = decodedCity.charAt(0).toUpperCase() + decodedCity.slice(1);
  const settings = await getPublicSiteSettings(300);
  const siteName = settings.siteName || "Foodies Pakistan";

  let restaurants: any[] = [];
  let totalCount = 0;
  let categories: any[] = [];
  let areas: any[] = [];
  let mapRestaurants: any[] = [];

  try {
    const query = new URLSearchParams();
    query.append("city", decodedCity);
    query.append("limit", String(INITIAL_PAGE_SIZE));
    query.append("sort", "-averageRating");
    if (searchQuery) query.append("q", searchQuery);

    const [restRes, mapRes, catRes, areaRes] = await Promise.all([
      apiClient(`/restaurants?${query.toString()}`, {
        requireAuth: false,
        next: { revalidate: 60 },
      }),
      apiClient(`/restaurants?city=${decodedCity}&limit=9999&fields=_id,name,slug,logo,coverImage,location,area,city,openingHours,averageRating,totalReviews,cuisines,deals,discountLabel,brandName,branchName`, {
        requireAuth: false,
        next: { revalidate: 60 },
      }),
      apiClient("/categories", { requireAuth: false }),
      apiClient(`/areas?citySlug=${encodeURIComponent(decodedCity)}`, {
        requireAuth: false,
      }),
    ]);

    restaurants = Array.isArray((restRes.data.data as any))
      ? (restRes.data.data as any)
      : (restRes.data.data as any)?.docs || [];

    // The second response is map data
    mapRestaurants = Array.isArray((mapRes.data.data as any))
      ? (mapRes.data.data as any)
      : (mapRes.data.data as any)?.docs || [];

    totalCount =
      (restRes.data as any).pagination?.total ||
      (restRes.data.data as any)?.totalDocs ||
      (restRes.data.data as any)?.total ||
      restaurants.length;

    categories = (catRes.data.data as any) || [];
    areas = (areaRes.data.data as any) || [];
  } catch (e) {
    console.error("Failed to fetch city page data:", e);
  }

  // ── Validate city: if no restaurants AND no areas, this is NOT a real city → 404. ──
  if (!searchQuery && restaurants.length === 0 && areas.length === 0) {
    notFound();
  }

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

  const pageUrl = `${SITE_URL}/${decodedCity}`;
  const pageTitle = searchQuery
    ? `Search Results for ${searchQuery} in ${cityName}`
    : `Best Restaurants in ${cityName}`;

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: pageTitle,
    description: searchQuery
      ? `Search results for "${searchQuery}" in ${cityName}. Find restaurants, deals, and book your table.`
      : `Discover the best restaurants in ${cityName}. Compare menus, reviews, locations, and live deals on ${siteName}.`,
    isPartOf: {
      "@id": `${SITE_URL}#website`,
    },
    about: {
      "@type": "Place",
      name: cityName,
    },
    inLanguage: "en-PK",
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${pageUrl}#itemlist`,
    name: pageTitle,
    mainEntityOfPage: {
      "@id": `${pageUrl}#webpage`,
    },
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: totalCount || restaurants.length,
    itemListElement: restaurants.map((r: any, i: number) => {
      const restaurantUrl = `${SITE_URL}/${decodedCity}/${r.slug}/`;
      return {
        "@type": "ListItem",
        position: i + 1,
        url: restaurantUrl,
        item: {
          "@type": "Restaurant",
          "@id": `${restaurantUrl}#restaurant`,
          name: r.name,
          url: restaurantUrl,
          image: [r.coverImage, ...(r.galleryImages || [])]
            .filter(Boolean)
            .map((url: string) => ({
              "@type": "ImageObject",
              url: url,
              width: 1200,
              height: 630,
            })),
          telephone: r.phone || undefined,
          servesCuisine: r.cuisines || [],
          priceRange: "$".repeat(r.priceRange || 2),
          currenciesAccepted: "PKR",
          address: {
            "@type": "PostalAddress",
            streetAddress: r.address || r.area,
            addressLocality: cityName,
            addressCountry: "PK",
          },
          ...(r.averageRating > 0
            ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: r.averageRating.toFixed(1),
                reviewCount: String(r.totalReviews || 1),
              },
            }
            : {}),
        },
      };
    }),
  };

  const visibleFaqs: { question: string; answer: string }[] = [];

  if (restaurants.length > 0 && !searchQuery) {
    const topNames = restaurants.slice(0, 3).map((r: any) => r.name).join(", ");
    const restaurantsWithDeals = restaurants.filter((r: any) => r.deals && r.deals.length > 0);
    const dealNames = restaurantsWithDeals.slice(0, 2).map((r: any) => r.name).join(" and ");

    visibleFaqs.push({
      question: `Best restaurants in ${cityName} right now?`,
      answer: `Based on verified reviews from real diners, some of the highest-rated restaurants in ${cityName} include ${topNames}. Browse all listings on ${siteName} to compare menus, ratings, and photos before you visit.`,
    });

    visibleFaqs.push({
      question: `How to get restaurant deals in ${cityName} with bank cards?`,
      answer: `Many restaurants in ${cityName} offer exclusive discounts of up to 50% off when you pay with partner bank cards like HBL, UBL, MCB, Meezan, and more.${dealNames ? ` For example, ${dealNames} currently have active bank card deals.` : ""} Check each restaurant's profile on ${siteName} to see which card discounts are available today.`,
    });

    visibleFaqs.push({
      question: `Can I book a table online in ${cityName}?`,
      answer: `Yes, you can reserve a table at top restaurants in ${cityName} directly through ${siteName}. Just select your preferred date, time, and party size — your booking is confirmed instantly without needing to call the restaurant.`,
    });

    visibleFaqs.push({
      question: `Best restaurants for family dining in ${cityName}?`,
      answer: `${cityName} has many family-friendly restaurants with spacious seating, kids menus, and dedicated family areas. Use the filters on ${siteName} to find restaurants that match your vibe — whether you're looking for a quiet family dinner or a lively weekend spot.`,
    });

    visibleFaqs.push({
      question: `${cityName} famous food — where to eat?`,
      answer: `${cityName} is known for its diverse food scene ranging from traditional Pakistani cuisine to international flavors. Explore the top-rated spots on ${siteName} to discover local favorites, hidden gems, and trending new openings across the city.`,
    });

    visibleFaqs.push({
      question: `Are there any cheap eats or budget restaurants in ${cityName}?`,
      answer: `Absolutely! ${cityName} has plenty of affordable dining options. On ${siteName}, you can filter by price range to find budget-friendly restaurants that still deliver great taste. Bank card deals can save you up to 50% off even at premium spots.`,
    });
  }

  const faqSchema: any =
    visibleFaqs.length > 0
      ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: visibleFaqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }
      : null;

  // ── Breadcrumb Schema ──
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://foodiespakistan.pk/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: cityName,
        item: `https://foodiespakistan.pk/${decodedCity}`,
      },
    ],
  };

  const schemasToInject = [webPageSchema, itemListSchema, breadcrumbSchema];
  if (faqSchema) {
    schemasToInject.push(faqSchema);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemasToInject).replace(/</g, '\\u003c') }}
      />
      <div className="bg-gray-50 min-h-screen pb-20">
        {/* ── Map Banner (desktop only) ── */}
        <ArchiveMapToggle
          restaurants={JSON.parse(JSON.stringify(mapRestaurants))}
          city={decodedCity}
        />

        {/* ── Title + Mobile Controls ── */}
        <div className="max-w-7xl mx-auto px-2.5 md:px-4 pt-4 pb-2">
          <nav className="text-[10px] text-gray-400 flex items-center gap-1 mb-1">
            <Link
              href="/"
              data-route-type="archive"
              className="hover:text-primary"
            >
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-600 font-medium capitalize">
              {cityName}
            </span>
          </nav>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
                {searchQuery
                  ? `"${searchQuery}" in ${cityName}`
                  : `Best Dining in ${cityName}`}
              </h1>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                {searchQuery ? `${totalCount} results` : `${totalCount} places`}
              </p>
            </div>
            <MobileArchiveControls
              city={decodedCity}
              categories={JSON.parse(JSON.stringify(categories))}
              areas={JSON.parse(JSON.stringify(areas))}
              restaurants={JSON.parse(JSON.stringify(mapRestaurants))}
            />
          </div>
        </div>

        {/* ── Content: Sidebar + Grid ── */}
        <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-3 flex gap-4">
          {/* Filter Sidebar (desktop) */}
          <aside className="w-[220px] hidden lg:block flex-shrink-0">
            <FilterSidebar
              city={decodedCity}
              categories={JSON.parse(JSON.stringify(categories))}
              areas={JSON.parse(JSON.stringify(areas))}
            />
          </aside>

          {/* Restaurant Grid */}
          <div className="flex-1 min-w-0">
            <RestaurantGrid
              initialRestaurants={JSON.parse(JSON.stringify(restaurants))}
              totalCount={totalCount}
              city={decodedCity}
              pageSize={INITIAL_PAGE_SIZE}
              searchQuery={searchQuery}
            />
          </div>
        </div>

        {!searchQuery && visibleFaqs.length > 0 && (
          <div className="max-w-7xl mx-auto px-2.5 md:px-4 pb-6">
            <FaqSection
              faqs={visibleFaqs}
              eyebrow="Common Questions"
              title={`People also ask about restaurants in ${cityName}`}
              description={`Quick answers to the most common questions about dining, deals, and booking in ${cityName}.`}
              className="mt-0"
            />
          </div>
        )}
      </div>
    </>
  );
}

