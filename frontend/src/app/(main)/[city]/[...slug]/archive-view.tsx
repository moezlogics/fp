/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import Link from "next/link";
import Image from "next/image";
import { FilterSidebar } from "@/components/archive/filter-sidebar";
import { RestaurantGrid } from "@/components/archive/restaurant-grid";
import { ArchiveMapToggle } from "@/components/archive/archive-map-toggle";
import { MobileArchiveControls } from "@/components/archive/mobile-archive-controls";
import DOMPurify from "isomorphic-dompurify";
import { notFound } from "next/navigation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";
const INITIAL_PAGE_SIZE = 12;

export default function ArchiveView({
  city,
  slug,
  result,
  siteName,
}: {
  city: string;
  slug: string[];
  result: any;
  siteName: string;
}) {
  const decodedCity = decodeURIComponent(city).toLowerCase();

  const { data, mode, categories } = result;
  const {
    cityDoc,
    category,
    area,
    restaurants: allRestaurants,
    total: totalCount,
    areas: cityAreas = [],
    seoPage,
  } = (data || {}) as any;

  if (!category && !area) notFound();

  const cityName = cityDoc.name;
  const restaurants = (allRestaurants || []).slice(0, INITIAL_PAGE_SIZE);

  const isCombo = mode === "combo" && category && area;
  const displayName = isCombo
    ? `${category.name} in ${area.name}`
    : category
      ? category.name
      : area.name;

  const archivePageUrl = isCombo
    ? `${SITE_URL}/${decodedCity}/${area.slug || slug[0]}/${category.slug || slug[1]}/`
    : `${SITE_URL}/${decodedCity}/${slug[0]}/`;

  const archivePageTitle = isCombo
    ? `Best ${category.name} Restaurants in ${area.name}, ${cityName}`
    : (!category && !!area)
      ? `Best Restaurants in ${displayName}, ${cityName}`
      : `Best ${displayName} Restaurants in ${cityName}`;

  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${archivePageUrl}#webpage`,
    url: archivePageUrl,
    name: archivePageTitle,
    description: isCombo
      ? `Discover the best ${category.name.toLowerCase()} restaurants in ${area.name}, ${cityName}. Compare menus, reviews, and live deals on ${siteName}.`
      : `Discover the best ${displayName.toLowerCase()} restaurants in ${cityName}. Compare menus, reviews, and live deals on ${siteName}.`,
    isPartOf: { "@id": `${SITE_URL}#website` },
    inLanguage: "en-PK",
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${archivePageUrl}#itemlist`,
    name: archivePageTitle,
    mainEntityOfPage: { "@id": `${archivePageUrl}#webpage` },
    numberOfItems: totalCount || restaurants.length,
    itemListElement: restaurants.map((r: any, i: number) => {
      const restaurantUrl = `${SITE_URL}/${decodedCity}/${r.slug}/`;
      return {
        "@type": "ListItem",
        position: i + 1,
        url: restaurantUrl,
      };
    }),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${archivePageUrl}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: cityName, item: `${SITE_URL}/${decodedCity}/` },
      ...(isCombo ? [
        { "@type": "ListItem", position: 3, name: area.name, item: `${SITE_URL}/${decodedCity}/${area.slug || slug[0]}/` },
        { "@type": "ListItem", position: 4, name: category.name, item: archivePageUrl },
      ] : [
        { "@type": "ListItem", position: 3, name: displayName, item: archivePageUrl },
      ]),
    ],
  };

  const schemasToInject = [collectionPageSchema, itemListSchema, breadcrumbSchema];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemasToInject).replace(/</g, '\\u003c') }} />

      <div className="bg-gray-50 min-h-screen pb-20">
        <ArchiveMapToggle restaurants={JSON.parse(JSON.stringify(allRestaurants || []))} city={decodedCity} />

        <div className="max-w-7xl mx-auto px-2.5 md:px-4 pt-4 pb-2">
          <nav className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 flex-wrap">
            <Link href="/" className="hover:text-primary">Home</Link><span>/</span>
            <Link href={`/${city}/`} data-route-type="archive" className="hover:text-primary capitalize">{cityName}</Link>
            {isCombo ? (
              <>
                <span>/</span><Link href={`/${city}/${slug[0]}/`} data-route-type="archive" className="hover:text-primary">{area.name}</Link>
                <span>/</span><span className="text-gray-600 font-medium">{category.name}</span>
              </>
            ) : (
              <><span>/</span><span className="text-gray-600 font-medium">{displayName}</span></>
            )}
          </nav>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
                Best {displayName} {!isCombo ? ` in ${cityName}` : `, ${cityName}`}
              </h1>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">{totalCount || restaurants.length} places</p>
            </div>
            <MobileArchiveControls
              city={decodedCity} categories={JSON.parse(JSON.stringify(categories))}
              areas={JSON.parse(JSON.stringify(cityAreas))} restaurants={JSON.parse(JSON.stringify(allRestaurants || []))}
              activeCategory={category ? category.slug : undefined} activeArea={area ? area.slug : undefined}
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-3 flex gap-4">
          <aside className="w-[220px] hidden lg:block flex-shrink-0">
            <FilterSidebar
              city={decodedCity} categories={JSON.parse(JSON.stringify(categories))}
              areas={JSON.parse(JSON.stringify(cityAreas))} activeCategory={category?.slug} activeArea={area?.slug}
            />
          </aside>

          <div className="flex-1 min-w-0">
            <RestaurantGrid
              initialRestaurants={JSON.parse(JSON.stringify(restaurants))} totalCount={totalCount || allRestaurants.length}
              city={decodedCity} activeArea={area?.name} activeCategory={category?.name} pageSize={INITIAL_PAGE_SIZE}
            />

            {(seoPage?.featuredImage || seoPage?.content) && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-4">
                {seoPage.featuredImage && (
                  <div className="mb-4 rounded-lg overflow-hidden relative h-48 md:h-64 w-full">
                    <Image src={seoPage.featuredImage} alt={`Best ${displayName} in ${cityName}`} fill sizes="100vw" className="object-cover" />
                  </div>
                )}
                {seoPage.content && (
                  <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-primary"
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(seoPage.content || "")
                            .replace(/<h1/g, "<h2")
                            .replace(/<\/h1>/g, "</h2>")
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
