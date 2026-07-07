/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { HeroSlider } from "@/components/ui/hero-slider";
import { apiClient } from "@/lib/api-client";
import { HomepageCards } from "@/components/home/homepage-cards";
import { HomeContent } from "@/components/home/home-content";
import { getPublicSiteSettings } from "@/lib/public-site-settings";
import { StoryFeed } from "@/components/stories/StoryFeed";

// ISR: serve from cache, revalidate every 60 seconds in background
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings(300);
  const title = settings.homepageTitle || settings.defaultMetaTitle;
  const description = settings.homepageMetaDescription || settings.defaultMetaDescription;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: "https://foodiespakistan.pk/" },
  };
}

export default async function HomePage() {
  // Static default for ISR — AppHeader hydrates the user's city from cookies
  // client-side; home shell uses Lahore until the user changes city + refreshes.
  const userCitySlug = "lahore";
  const siteSettings = await getPublicSiteSettings(60);

  let city: any = null,
    banners: any[] = [],
    categories: any[] = [],
    areas: any[] = [],
    articles: any[] = [],
    bankDeals: any[] = [],
    featuredRestaurants: any[] = [],
    topRatedRestaurants: any[] = [];

  const homeContentHtml = siteSettings.homeContent || "";

  try {
    const response = await apiClient(`/home?city=${userCitySlug}`, {
      requireAuth: false,
      next: { revalidate: 60 },
    });
    ({
      city,
      banners =[],
      categories =[],
      areas =[],
      articles =[],
      bankDeals =[],
      featuredRestaurants =[],
      topRatedRestaurants =[],
    } = (response.data.data || {}) as any);
  } catch (err: any) {
    console.error("[HomePage] API fetch failed:", err.message);
  }


  const cityName = city?.name || "Lahore";
  const siteUrl = "https://foodiespakistan.pk";
  const siteName = siteSettings.siteName || "Foodies Pakistan";
  const homepageTitle = siteSettings.homepageTitle || siteSettings.defaultMetaTitle || siteName;
  const homepageDescription =
    siteSettings.homepageMetaDescription || siteSettings.defaultMetaDescription;

  // 1. Core homepage schema
  const homePageUrl = `${siteUrl}/`;
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${homePageUrl}#webpage`,
    url: homePageUrl,
    name: homepageTitle,
    description: homepageDescription,
    isPartOf: {
      "@id": `${siteUrl}#website`,
    },
    about: {
      "@id": `${siteUrl}#organization`,
    },
    inLanguage: "en-PK",
  };

  // Helper to construct robust ItemList schemas from restaurant arrays
  const buildRestaurantItemListSchema = (listName: string, elements: any[]) => {
    if (!elements || elements.length === 0) return null;
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: listName,
      itemListElement: elements.map((r: any, i: number) => {
        const restaurantUrl = `${siteUrl}/${userCitySlug}/${r.slug}/`;
        return {
          "@type": "ListItem",
          position: i + 1,
          url: restaurantUrl,
        };
      }),
    };
  };

  // 2. Featured & Top Rated ItemLists
  const featuredListSchema = buildRestaurantItemListSchema(
    `Featured Restaurants in ${cityName}`,
    featuredRestaurants,
  );
  const bestOfListSchema = buildRestaurantItemListSchema(
    `Best Restaurants in ${cityName}`,
    topRatedRestaurants,
  );

  // 3. Visible homepage FAQ content + matching schema
  const popularCuisines = categories
    .slice(0, 5)
    .map((c: any) => c.name)
    .join(", ");
  const popularAreas = areas
    .slice(0, 4)
    .map((a: any) => a.name)
    .join(", ");
  const activeBanks = bankDeals
    .filter((b: any) => b.maxDiscount > 0)
    .slice(0, 4)
    .map((b: any) => b.name)
    .join(", ");
  const maxDiscountValue = Math.max(
    0,
    ...bankDeals.map((b: any) => b.maxDiscount || 0),
  );
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: homePageUrl,
      },
    ],
  };

  const schemasToInject = [
    webPageJsonLd,
    breadcrumbSchema,
    ...(featuredListSchema ? [featuredListSchema] : []),
    ...(bestOfListSchema ? [bestOfListSchema] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto px-2.5 md:px-4 pt-2 pb-24 md:pb-12 space-y-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemasToInject).replace(/</g, '\\u003c') }}
      />

      {/* â”€â”€ Hero Banner â”€â”€ */}
      <section className="rounded-xl overflow-hidden shadow-md">
        <HeroSlider banners={JSON.parse(JSON.stringify(banners))} />
      </section>

      {/* ── Story Feed (followed restaurants) ── */}
      <StoryFeed />

      {/* ——— Quick Category Icons (Transparent, Modern) ——— */}
      <section>
        <div className="flex overflow-x-auto gap-2.5 md:gap-4 pb-1 hide-scrollbar snap-x snap-mandatory md:flex-wrap md:justify-center">
          {[
            ...categories.slice(0, 8).map((c: any) => ({
              label: c.name,
              image: c.image,
              href: `/${userCitySlug}/${c.slug}/`,
            })),
            {
              label: "Near Me",
              image: null,
              emoji: "📍",
              href: "/near-me",
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              data-route-type="archive"
              className="flex flex-col items-center gap-1.5 group shrink-0 snap-start w-14 md:w-18"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center group-hover:-translate-y-0.5 transition-all duration-300">
                {(item as any).image ? (
                  <div className="relative w-10 h-10 md:w-12 md:h-12">
                    <Image
                      src={(item as any).image}
                      alt={item.label}
                      fill
                      quality={75}
                      className="object-contain"
                      sizes="(max-width: 768px) 40px, 48px"
                    />
                  </div>
                ) : (
                  <span className="text-2xl">{(item as any).emoji || "🍽️"}</span>
                )}
              </div>
              <span className="font-bold text-[9px] text-gray-500 group-hover:text-primary transition-colors text-center leading-tight truncate w-full">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* â”€â”€ Featured Restaurants (Server-Rendered from City) â”€â”€ */}
      {featuredRestaurants.length > 0 && (
        <section>
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mb-0.5">
                Popular in {cityName}
              </p>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                Featured Restaurants
              </h2>
            </div>
            <Link
              className="text-xs font-bold text-primary hover:underline"
              href={`/${userCitySlug}/`}
              data-route-type="archive"
            >
              See All
            </Link>
          </div>
          <HomepageCards
            restaurants={JSON.parse(
              JSON.stringify(
                featuredRestaurants
                  .slice(0, 10)
                  .map((r: any) => ({ ...r, badge: "Featured" })),
              ),
            )}
            userCitySlug={userCitySlug}
            layout="scroll"
            sortByNearby
          />
        </section>
      )}

      {/* â”€â”€ Best of City â”€â”€ */}
      {topRatedRestaurants.length > 0 && (
        <section>
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mb-0.5">
                Curated
              </p>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                Best of {cityName}
              </h2>
            </div>
            <Link
              className="text-xs font-bold text-primary hover:underline"
              href={`/${userCitySlug}/`}
              data-route-type="archive"
            >
              See All
            </Link>
          </div>
          <HomepageCards
            restaurants={JSON.parse(JSON.stringify(topRatedRestaurants))}
            userCitySlug={userCitySlug}
            sortByNearby
          />
        </section>
      )}

      {/* â”€â”€ Bank Deals â”€â”€ */}
      {bankDeals.filter((b: any) => b.maxDiscount > 0).length > 0 && (
        <section className="bg-gray-950 rounded-xl p-5 md:p-8 shadow-xl relative overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-primary/10 rounded-full blur-[80px]" />

          <div className="flex justify-between items-end mb-4 relative z-10">
            <div>
              <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mb-0.5">
                Exclusive
              </p>
              <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">
                Bank Deals
              </h2>
            </div>
            <Link
              href={`/${userCitySlug}/deals`}
              className="text-xs font-bold text-primary hover:underline"
            >
              All Deals â†’
            </Link>
          </div>

          <div className="flex overflow-x-auto gap-3 pb-1 hide-scrollbar snap-x">
                {bankDeals
              .filter((b: any) => b.maxDiscount > 0)
              .map((b: any) => (
                <Link
                  key={b._id}
                  href={`/${userCitySlug}/deals/${b.slug || b.name?.toLowerCase().replace(/\s+/g, "-")}`}
                  className="min-w-[200px] md:min-w-[240px] rounded-xl p-5 bg-white/5 border border-white/10 backdrop-blur-sm hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300 snap-start shrink-0 group"
                >
                  <div className="w-12 h-12 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform relative">
                    {b.logoUrl ? (
                      <Image
                        src={b.logoUrl}
                        alt={b.name}
                        fill
                        className="object-contain"
                        sizes="48px"
                      />
                    ) : (
                      <span className="text-gray-900 font-bold text-xs">
                        {b.name?.substring(0, 3)}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {b.maxDiscount}% OFF
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium mt-2">
                    {b.name}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* â”€â”€ Articles â”€â”€ */}
      {articles.length > 0 && (
        <section>
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-lg font-bold text-gray-900">Food Trends</h2>
            <Link
              className="text-xs font-bold text-primary hover:underline"
              href="/articles"
            >
              See all
            </Link>
          </div>
          <div className="flex overflow-x-auto gap-3 pb-1 hide-scrollbar snap-x">
            {articles.map((t: any) => (
              <Link
                key={t._id}
                href={`/articles/${t.slug}`}
                className="w-56 md:w-64 shrink-0 group snap-start rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
              >
                <div className="relative h-32 overflow-hidden bg-gray-100">
                  <Image
                    alt={t.title}
                    fill
                    sizes="(max-width: 768px) 224px, 256px"
                    quality={75}
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    src={t.coverImage || "/placeholder.jpg"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                <div className="p-2.5 flex flex-col flex-1">
                  <h3 className="text-xs font-bold leading-snug line-clamp-2 text-gray-900 group-hover:text-primary transition-colors">
                    {t.title}
                  </h3>
                  <div className="mt-auto pt-1.5 flex items-center justify-between text-[10px] font-medium text-gray-400">
                    <span>{t.author}</span>
                    <span>
                      {t.publishedAt
                        ? new Date(t.publishedAt).toLocaleDateString("en-PK", {
                          month: "short",
                          day: "numeric",
                        })
                        : ""}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* â”€â”€ Admin Content Section â”€â”€ */}
      {homeContentHtml && (
        <HomeContent
          html={homeContentHtml
            .replace(/<h1/g, "<h2")
            .replace(/<\/h1>/g, "</h2>")}
        />
      )}
    </div>
  );
}

