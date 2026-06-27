import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { apiClient } from "@/lib/api-client";
import { ArchiveMapToggle } from "@/components/archive/archive-map-toggle";
import { DealsFilterSidebar } from "@/components/archive/deals-filter-sidebar";
import { MobileDealsControls } from "@/components/archive/mobile-deals-controls";
import FaqSection from "@/components/ui/faq-section";
import {
  buildDealsFilterQuery,
  buildBankDealCounts,
  filterAndSortDealGroups,
  getBankSlug,
  groupDealsByRestaurant,
  normalizeDealsSort,
  normalizeMinDiscount,
  restaurantsFromDealGroups,
} from "@/lib/deals-archive";
import { getPublicSiteSettings, withSiteName } from "@/lib/public-site-settings";

interface Props {
  params: Promise<{ city: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

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

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { city } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const hasFilterParams = !!(resolvedSearchParams.sort || resolvedSearchParams.minDiscount);
  const [data, settings] = await Promise.all([
    (fetchCityDealsData(city) as any),
    getPublicSiteSettings(300),
  ]);

  const siteName = settings.siteName || "Foodies Pakistan";
  if (!data?.cityDoc) {
    return {
      title: withSiteName("Deals Not Found", siteName),
      robots: { index: false, follow: false },
    };
  }

  const citySlug = data.cityDoc.slug || city;
  const cityName = data.cityDoc.name;
  const seoPage = data.seoPage;

  const deals = Array.isArray(data.deals) ? data.deals : [];
  if (deals.length === 0 && !seoPage) {
    return {
      title: `Best Bank Card Deals & Discounts in ${cityName}`,
      description: `We are currently curating the best bank deals in ${cityName}. Check back soon for discounts.`,
      robots: { index: false, follow: false },
    };
  }

  const title =
    seoPage?.title && seoPage.isCustomized
      ? seoPage.title
      : `Best Bank Card Deals & Discounts in ${cityName}`;

  const description =
    seoPage?.metaDescription && seoPage.isCustomized
      ? seoPage.metaDescription
      : `Discover the best bank deals in ${cityName}. Compare live restaurant discounts by bank, filter offers, and save more on Foodies Pakistan.`;

  const canonical = `${SITE_URL}/${citySlug}/deals/`;

  return {
    title,
    description,
    robots: { index: !hasFilterParams, follow: true },
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

export default async function CityDealsPage({ params, searchParams }: Props) {
  const { city } = await params;
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
  const data = await fetchCityDealsData(city);

  if (!data?.cityDoc) notFound();

  const cityDoc = data.cityDoc;
  const citySlug = cityDoc.slug || city;
  const cityName = cityDoc.name;
  const banks = Array.isArray(data.banks) ? data.banks : [];
  const cityRestaurants = Array.isArray(data.cityRestaurants)
    ? data.cityRestaurants
    : [];
  const deals = Array.isArray(data.deals) ? data.deals : [];
  const seoPage = data.seoPage;

  const groupedDeals = filterAndSortDealGroups(
    groupDealsByRestaurant(cityRestaurants, deals),
    sort,
    minDiscount,
  );
  const mapRestaurants = restaurantsFromDealGroups(groupedDeals);
  const bankDealCounts = buildBankDealCounts(deals);
  const filterQuery = buildDealsFilterQuery(sort, minDiscount);
  const hasActiveFilters = sort !== "discount" || minDiscount > 0;

  const pageUrl = `${SITE_URL}/${citySlug}/deals/`;
  const pageTitle = `Best Bank Card Deals & Discounts in ${cityName}`;

  const faqs: { question: string; answer: string }[] = [];
  if (groupedDeals.length > 0) {
    const topRestaurants = groupedDeals
      .slice(0, 3)
      .map((entry) => entry.restaurant?.brandName || entry.restaurant?.name)
      .filter(Boolean);
    const activeBanks = banks
      .filter((bank: any) => (bankDealCounts[String(bank?._id)] || 0) > 0)
      .slice(0, 4)
      .map((bank: any) => bank.name)
      .filter(Boolean);

    faqs.push({
      question: `Which restaurants have the best bank card deals in ${cityName}?`,
      answer: topRestaurants.length > 0
        ? `Currently, some of the top-rated restaurants offering bank card deals in ${cityName} include ${topRestaurants.join(", ")}. You can get up to 50% flat discount on dine-in.`
        : `Various premium restaurants in ${cityName} offer up to 50% discount on partner bank cards. Check our live directory to see today's active offers.`,
    });

    faqs.push({
      question: `Which banks offer dining discounts in ${cityName}?`,
      answer: activeBanks.length > 0
        ? `Major banks including ${activeBanks.join(", ")} offer exclusive dining discounts across ${cityName}. These deals apply to debit and credit cards depending on your card tier.`
        : `Most major banks like HBL, Meezan, UBL, and Alfalah offer dining discounts in ${cityName}. Deals usually range from 15% to 50% off on credit and debit cards.`,
    });

    faqs.push({
      question: `How do I claim a restaurant bank discount in ${cityName}?`,
      answer: `To claim a bank discount, simply visit the restaurant, let them know you will be paying with your partner bank card, and the discount (e.g., 20% or 40% OFF) will be applied directly to your final bill.`,
    });

    faqs.push({
      question: `Do I need to book a table to get bank bank deals?`,
      answer: `While walk-ins are accepted, we highly recommend booking your table online through Foodies Pakistan, especially for popular spots in ${cityName}. Booking secures your table and guarantees your bank discount eligibility without waiting in line.`,
    });

    faqs.push({
      question: `Can I stack multiple discounts at ${cityName} restaurants?`,
      answer: `Generally, bank card deals cannot be stacked with other ongoing restaurant promotions or Prime subscriptions. The restaurant will apply the single highest discount available to you at checkout.`,
    });
  }

  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: pageTitle,
    description: `Discover active bank deals in ${cityName}. Compare discounts by bank and restaurant on Foodies Pakistan.`,
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
        item: pageUrl,
      },
    ],
  };

  const faqSchema =
    faqs.length > 0
      ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }
      : null;

  const schemas: any[] = [collectionPageSchema, itemListSchema, breadcrumbSchema];
  if (faqSchema) schemas.push(faqSchema);

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
            <span className="text-gray-600 font-medium">Best Bank Deals</span>
          </nav>

          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
                Best Bank Deals in {cityName}
              </h1>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                {groupedDeals.length} restaurants with active offers
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
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/${citySlug}/deals/${filterQuery}`}
              className="text-[11px] font-bold px-3 py-1.5 rounded-full border bg-primary text-white border-primary"
            >
              All Banks ({deals.length})
            </Link>

            {banks.map((bank: any) => {
              const bankSlug = getBankSlug(bank);
              const count = bankDealCounts[String(bank?._id)] || 0;
              return (
                <Link
                  key={String(bank?._id)}
                  href={`/${citySlug}/deals/${bankSlug}/${filterQuery}`}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-full border bg-white text-gray-700 border-gray-200 hover:border-primary/40 hover:text-primary transition"
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
              sort={sort}
              minDiscount={minDiscount}
            />
          </aside>

          <div className="flex-1 min-w-0">
            {groupedDeals.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
                <p className="text-lg font-bold text-gray-900">
                  {hasActiveFilters
                    ? `No deals match your current filters in ${cityName}`
                    : `No active bank deals found in ${cityName}`}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {hasActiveFilters
                    ? "Try resetting sort or minimum discount to see all active offers."
                    : "This archive stays live and updates automatically when partner offers are published."}
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
                        {entry.deals.map((deal: any) => {
                          const bank = deal?.bankId || {};
                          const bankSlug = getBankSlug(bank);

                          return (
                            <div
                              key={String(deal?._id)}
                              className="rounded-lg border border-gray-100 p-3 flex items-start justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <Link
                                  href={`/${citySlug}/deals/${bankSlug}/${filterQuery}`}
                                  className="text-xs font-bold text-gray-900 hover:text-primary transition"
                                >
                                  {bank?.name || "Bank Offer"}
                                </Link>
                                <p className="text-xs text-gray-500 mt-1">
                                  {deal?.description || "Exclusive dining discount"}
                                </p>
                              </div>
                              <span className="text-xs font-black text-secondary whitespace-nowrap">
                                {Number(deal?.discountPercent || 0)}% OFF
                              </span>
                            </div>
                          );
                        })}
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
                      alt={`Best bank deals in ${cityName}`}
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

        {faqs.length > 0 && (
          <div className="max-w-7xl mx-auto px-2.5 md:px-4 pb-6">
            <FaqSection
              faqs={faqs}
              eyebrow="Common Questions"
              title={`People also ask about bank deals in ${cityName}`}
              description={`Quick answers to the most common questions about credit and debit card dining discounts in ${cityName}.`}
              className="mt-0"
            />
          </div>
        )}
      </div>
    </>
  );
}


