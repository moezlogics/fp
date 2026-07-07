import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { apiClient } from "@/lib/api-client";
import { ArchiveMapToggle } from "@/components/archive/archive-map-toggle";
import { DealsFilterSidebar } from "@/components/archive/deals-filter-sidebar";
import { MobileDealsControls } from "@/components/archive/mobile-deals-controls";

import {
  buildDealsFilterQuery,
  buildBankDealCounts,
  filterAndSortDealGroups,
  getBankSlug,
  groupDealsByRestaurant,
  normalizeDealsSort,
  normalizeMinDiscount,
  restaurantsFromDealGroups,
  slugifyBankLabel,
} from "@/lib/deals-archive";
import { getPublicSiteSettings, withSiteName } from "@/lib/public-site-settings";

interface Props {
  params: Promise<{ city: string; bankSlug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

async function fetchBankCityDealsData(city: string, bankSlug: string) {
  try {
    const res = await apiClient(`/deals/city/${city}/bank/${bankSlug}`, {
      requireAuth: false,
      next: { revalidate: 60 },
    });
    return (res.data?.data as any) || null;
  } catch {
    return null;
  }
}

async function fetchCityDealsData(city: string) {
  try {
    const res = await apiClient(`/deals/city/${city}`, {
      requireAuth: false,
      next: { revalidate: 60 },
    });
    return (res.data?.data as any) || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, bankSlug } = await params;

  const [data, settings] = await Promise.all([
    (fetchBankCityDealsData(city, bankSlug) as any),
    getPublicSiteSettings(300),
  ]);

  const siteName = settings.siteName || "Foodies Pakistan";

  if (!data?.cityDoc || !data?.bankDoc) {
    return {
      title: withSiteName("Deals Not Found", siteName),
      robots: { index: false, follow: false },
    };
  }

  const citySlug = data.cityDoc.slug || city;
  const cityName = data.cityDoc.name;
  const bankName = data.bankDoc.name;
  const canonicalBankSlug = data.canonicalBankSlug || getBankSlug(data.bankDoc);
  const seoPage = data.seoPage;

  const deals = Array.isArray(data.deals) ? data.deals : [];
  if (deals.length === 0 && !seoPage) {
    return {
      title: `Best ${bankName} Card Deals & Discounts in ${cityName}`,
      description: `We are currently curating the best ${bankName} deals in ${cityName}. Check back soon for discounts.`,
      robots: { index: false, follow: false },
    };
  }

  const title =
    seoPage?.title && seoPage.isCustomized
      ? seoPage.title
      : `Best ${bankName} Card Deals & Discounts in ${cityName}`;

  const description =
    seoPage?.metaDescription && seoPage.isCustomized
      ? seoPage.metaDescription
      : `Explore ${bankName} bank deals in ${cityName}. Compare active restaurant discounts, filter offers, and discover the best bank promotions on Foodies Pakistan.`;

  const canonical = `${SITE_URL}/${citySlug}/deals/${canonicalBankSlug}/`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      ...(seoPage?.featuredImage
        ? {
          images: [
            {
              url: seoPage.featuredImage,
              width: 1200,
              height: 630,
              alt: title,
            },
          ],
        }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(seoPage?.featuredImage ? { images: [seoPage.featuredImage] } : {}),
    },
  };
}

export default async function BankCityDealsPage({ params, searchParams }: Props) {
  const { city, bankSlug } = await params;
  const sp = (searchParams ? await searchParams : {}) as Record<
    string,
    string | string[] | undefined
  >;
  const sort = normalizeDealsSort(
    Array.isArray(sp.sort) ? sp.sort[0] : sp.sort,
  );
  const minDiscount = normalizeMinDiscount(
    Array.isArray(sp.minDiscount) ? sp.minDiscount[0] : sp.minDiscount,
  );
  const filterQuery = buildDealsFilterQuery(sort, minDiscount);
  const hasActiveFilters = sort !== "discount" || minDiscount > 0;

  const [bankData, cityData] = await Promise.all([
    fetchBankCityDealsData(city, bankSlug),
    fetchCityDealsData(city),
  ]);

  if (!bankData?.cityDoc || !bankData?.bankDoc) notFound();

  const cityDoc = bankData.cityDoc;
  const citySlug = cityDoc.slug || city;
  const cityName = cityDoc.name;
  const bankDoc = bankData.bankDoc;
  const canonicalBankSlug =
    bankData.canonicalBankSlug || bankDoc.slug || slugifyBankLabel(bankDoc.name);

  if (canonicalBankSlug && bankSlug !== canonicalBankSlug) {
    redirect(`/${citySlug}/deals/${canonicalBankSlug}/${filterQuery}`);
  }

  const deals = Array.isArray(bankData.deals) ? bankData.deals : [];
  const cityRestaurants = Array.isArray(bankData.cityRestaurants)
    ? bankData.cityRestaurants
    : [];
  const seoPage = bankData.seoPage;

  const groupedDeals = filterAndSortDealGroups(
    groupDealsByRestaurant(cityRestaurants, deals),
    sort,
    minDiscount,
  );
  const mapRestaurants = restaurantsFromDealGroups(groupedDeals);

  const banks = Array.isArray(cityData?.banks) ? cityData!.banks : [];
  const allCityDeals = Array.isArray(cityData?.deals) ? cityData!.deals : deals;
  const bankDealCounts = buildBankDealCounts(allCityDeals);

  const pageUrl = `${SITE_URL}/${citySlug}/deals/${canonicalBankSlug}/`;
  const pageTitle = `Best ${bankDoc.name} Card Deals & Discounts in ${cityName}`;



  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: pageTitle,
    description: `Browse ${bankDoc.name} dining deals in ${cityName} with grouped offers by restaurant and discount.`,
    isPartOf: { "@id": `${SITE_URL}#website` },
    inLanguage: "en-PK",
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${pageUrl}#itemlist`,
    name: pageTitle,
    mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
    numberOfItems: groupedDeals.length,
    itemListElement: groupedDeals.slice(0, 24).map((entry: any, index: number) => {
      const restaurant = entry.restaurant;
      const restaurantUrl = `${SITE_URL}/${(restaurant?.city || citySlug).toLowerCase()}/${restaurant?.slug}/`;
      return {
        "@type": "ListItem",
        position: index + 1,
        url: restaurantUrl,
      };
    }),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: cityName,
        item: `${SITE_URL}/${citySlug}/`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Best Bank Deals",
        item: `${SITE_URL}/${citySlug}/deals/`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: bankDoc.name,
        item: pageUrl,
      },
    ],
  };

  const schemas: any[] = [collectionPageSchema, itemListSchema, breadcrumbSchema];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, '\\u003c') }}
      />

      <div className="bg-gray-50 min-h-screen pb-20">
        <ArchiveMapToggle
          restaurants={JSON.parse(JSON.stringify(mapRestaurants))}
          city={citySlug}
        />

        <div className="max-w-7xl mx-auto px-2.5 md:px-4 pt-4 pb-3">
          <nav className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 flex-wrap">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <span>/</span>
            <Link href={`/${citySlug}/`} className="hover:text-primary">
              {cityName}
            </Link>
            <span>/</span>
            <Link href={`/${citySlug}/deals/`} className="hover:text-primary">
              Best Bank Deals
            </Link>
            <span>/</span>
            <span className="text-gray-600 font-medium">{bankDoc.name}</span>
          </nav>

          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
                {bankDoc.name} Deals in {cityName}
              </h1>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                {groupedDeals.length} restaurants with active {bankDoc.name} offers
                {hasActiveFilters ? " after filters" : ""}
              </p>
            </div>
            <MobileDealsControls
              city={citySlug}
              restaurants={JSON.parse(JSON.stringify(mapRestaurants))}
              banks={JSON.parse(JSON.stringify(banks))}
              bankDealCounts={JSON.parse(JSON.stringify(bankDealCounts))}
              sort={sort}
              minDiscount={minDiscount}
              activeBankSlug={canonicalBankSlug}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/${citySlug}/deals/${filterQuery}`}
              className="text-[11px] font-bold px-3 py-1.5 rounded-full border bg-white text-gray-700 border-gray-200 hover:border-primary/40 hover:text-primary transition"
            >
              All Banks ({allCityDeals.length})
            </Link>

            {banks.map((bank: any) => {
              const slug = getBankSlug(bank);
              const count = bankDealCounts[String(bank?._id)] || 0;
              const isActive = slug === canonicalBankSlug;

              return (
                <Link
                  key={String(bank?._id)}
                  href={`/${citySlug}/deals/${slug}/${filterQuery}`}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition ${isActive
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-700 border-gray-200 hover:border-primary/40 hover:text-primary"
                    }`}
                >
                  {bank?.name || "Bank"} ({count})
                </Link>
              );
            })}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-3 flex gap-4">
          <aside className="w-[240px] hidden lg:block flex-shrink-0">
            <DealsFilterSidebar
              city={citySlug}
              banks={JSON.parse(JSON.stringify(banks))}
              bankDealCounts={JSON.parse(JSON.stringify(bankDealCounts))}
              activeBankSlug={canonicalBankSlug}
              sort={sort}
              minDiscount={minDiscount}
            />
          </aside>

          <div className="flex-1 min-w-0">
            {groupedDeals.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
                <p className="text-lg font-bold text-gray-900">
                  {hasActiveFilters
                    ? `No ${bankDoc.name} deals match your current filters in ${cityName}`
                    : `No active ${bankDoc.name} deals found in ${cityName}`}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {hasActiveFilters
                    ? "Try resetting sort or minimum discount to see all active offers for this bank."
                    : `This archive page stays live and updates as soon as partner restaurants publish new ${bankDoc.name} offers.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {groupedDeals.map((entry: any) => {
                  const restaurant = entry.restaurant;
                  const restaurantUrl = `/${(restaurant?.city || citySlug).toLowerCase()}/${restaurant?.slug}/`;

                  return (
                    <div
                      key={String(restaurant?._id)}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={restaurantUrl}
                            className="text-base font-bold text-gray-900 hover:text-primary transition"
                          >
                            {restaurant?.brandName || restaurant?.name}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {restaurant?.area || "City Center"}
                            {restaurant?.averageRating
                              ? ` - ${Number(restaurant.averageRating).toFixed(1)} rating`
                              : ""}
                          </p>
                        </div>

                        <span className="text-sm font-black text-green-600 whitespace-nowrap">
                          UP TO {entry.bestDiscount}% OFF
                        </span>
                      </div>

                      <div className="p-4 space-y-2">
                        {entry.deals.map((deal: any) => (
                          <div
                            key={String(deal?._id)}
                            className="rounded-lg border border-gray-100 p-3 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900">
                                {bankDoc.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {deal?.description || `${bankDoc.name} exclusive dining discount`}
                              </p>
                            </div>
                            <span className="text-xs font-black text-secondary whitespace-nowrap">
                              {Number(deal?.discountPercent || 0)}% OFF
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="px-4 pb-4">
                        <Link
                          href={restaurantUrl}
                          className="inline-flex text-xs font-bold text-primary hover:underline"
                        >
                          View Restaurant
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(seoPage?.featuredImage || seoPage?.content) && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-4">
                {seoPage?.featuredImage && (
                  <div className="relative w-full h-52 rounded-lg overflow-hidden mb-4 bg-gray-100">
                    <Image
                      src={seoPage.featuredImage}
                      alt={`${bankDoc.name} deals in ${cityName}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 1200px"
                    />
                  </div>
                )}

                {seoPage?.content && (
                  <article
                    className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(seoPage.content),
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


