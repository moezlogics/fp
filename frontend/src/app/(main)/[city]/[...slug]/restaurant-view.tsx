"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import dynamic from "next/dynamic";
import Image from "next/image";
import { BadgeCheck, Clock, Maximize, MapPin, UtensilsCrossed, Star, Sparkles, Box, ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const StoryRing = dynamic(() => import("@/components/stories/StoryRing").then(mod => ({ default: mod.StoryRing })), { ssr: false });

import { CuisinesLink } from "@/components/restaurant/cuisines-link";
import { RestaurantGallery } from "@/components/restaurant/restaurant-gallery";
import { LocationButton, ReviewsButton } from "@/components/restaurant/location-button";
import { SimilarCard } from "@/components/restaurant/similar-card";
import { DynamicOpenBadge } from "@/components/restaurant/dynamic-open-badge";
import { FollowButton } from "@/components/restaurant/follow-button";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { buildRestaurantFaqs } from "@/lib/restaurant-faqs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

import { BookingWidget, RestaurantTabs } from "@/components/restaurant/restaurant-detail-client";

export default function RestaurantDetailView({
  city,
  slug,
  payload,
  siteName,
}: {
  city: string;
  slug: string;
  payload: any;
  siteName: string;
}) {
  const {
    restaurant: r,
    reviews,
    deals,
    otherBranches,
    similarRestaurants,
  } = payload;

  const priceLabel = ["", "Budget", "Mid-Range", "Premium", "Luxury"][
    r.priceRange || 2
  ];
  const restaurantUrl = `${SITE_URL}/${city}/${slug}/`;

  // ── OpeningHoursSpecification ──
  const dayMap: Record<string, string> = {
    monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
    thursday: "Thursday", friday: "Friday", saturday: "Saturday",
    sunday: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday",
    thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
  };

  const openingHoursSpec = (r.openingHours || [])
    .filter((h: any) => !h.isClosed && h.open && h.close)
    .map((h: any) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [dayMap[h.day?.toLowerCase()] || h.day],
      opens: h.open,
      closes: h.close,
    }));

  const schemaReviews = (reviews || []).slice(0, 10).map((rev: any) => ({
    "@type": "Review",
    author: { "@type": "Person", name: rev.userId?.name || "A Foodie" },
    datePublished: rev.createdAt
      ? new Date(rev.createdAt).toISOString().split("T")[0]
      : undefined,
    reviewRating: {
      "@type": "Rating",
      ratingValue: Number(rev.overallRating || 4),
      bestRating: 5, worstRating: 1,
    },
    reviewBody: rev.text || undefined,
  }));

  const currentDayStr = new Date()
    .toLocaleString("en-US", { weekday: "long", timeZone: "Asia/Karachi" })
    .toLowerCase();
  const todayTiming = (r.openingHours || []).find(
    (h: any) => h.day?.toLowerCase() === currentDayStr,
  );

  const stripHtml = (html: string) => {
    if (!html) return "";
    // Remove HTML tags, decode entities, normalize whitespace, and trim
    return html
      .replace(/<[^>]*>?/gm, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  };

  const to12h = (t: string) => {
    if (!t) return t;
    const [hStr, mStr] = t.split(":");
    let h = parseInt(hStr, 10);
    const suffix = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${mStr} ${suffix}`;
  };

  const getPriceRange = () => {
    if (r.priceRange === 1) return "500 - 1500 PKR";
    if (r.priceRange === 2) return "1500 - 3000 PKR";
    if (r.priceRange === 3) return "3000 - 6000 PKR";
    if (r.priceRange === 4) return "6000+ PKR";
    return "1500 - 3000 PKR";
  };

  const faqs = buildRestaurantFaqs({ restaurant: r, deals, otherBranches });

  const faqSchema: any = {
    "@type": "FAQPage",
    "@id": `${restaurantUrl}#faq`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: stripHtml(faq.question),
      acceptedAnswer: { "@type": "Answer", text: stripHtml(faq.answer) },
    })),
  };

  const amenityFeature = (r.facilities || [])
    .filter(Boolean)
    .map((facility: string) => ({
      "@type": "LocationFeatureSpecification",
      name: facility.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: true,
    }));

  const specialOpeningHoursSpecification = (r.specialOverrides || [])
    .filter((override: any) => override?.date && (override.isClosed || (override.open && override.close)))
    .map((override: any) => ({
      "@type": "OpeningHoursSpecification",
      validFrom: override.date, validThrough: override.date,
      ...(override.isClosed ? { opens: "00:00", closes: "00:00" } : { opens: override.open, closes: override.close }),
    }));

  const dynamicOffers = (deals || [])
    .filter((d: any) => d?.discountPercent > 0)
    .map((d: any, index: number) => ({
      "@type": "Offer",
      "@id": `${restaurantUrl}#offer-${index + 1}`,
      name: d.bankId?.name
        ? `${d.discountPercent}% off with ${d.bankId.name}`
        : `${d.discountPercent}% off at ${r.name}`,
      description: d.description ||
        (d.bankId?.name
          ? `Exclusive ${d.discountPercent}% dining discount for ${d.bankId.name} customers.`
          : `Exclusive ${d.discountPercent}% dining discount available at ${r.name}.`),
      availability: "https://schema.org/InStock",
      eligibleTransactionVolume: d.minSpendPaisa > 0 ? {
        "@type": "PriceSpecification", priceCurrency: "PKR", minPrice: Number((d.minSpendPaisa / 100).toFixed(2)),
      } : undefined,
      validFrom: d.validFrom ? new Date(d.validFrom).toISOString() : undefined,
      validThrough: d.validTo ? new Date(d.validTo).toISOString() : undefined,
    }));

  const maxBankDeal = (deals || []).reduce((max: number, d: any) => Math.max(max, d?.discountPercent || 0), 0);
  const maxCap = r.bookingSettings?.maxDiscountCap || 0;
  const maxDiscount = Math.max(maxBankDeal, maxCap);
  const hasMultipleBranches = Boolean(r.parentBrandId || (r.isHeadOffice && r.branchName && r.branchName !== "Main Branch"));
  const cleanBranch = (r.branchName || "").replace(/\s*branch\s*/gi, "").trim();
  const nameForTitle = hasMultipleBranches && cleanBranch ? `${r.brandName} ${cleanBranch}` : `${r.brandName || r.name} ${r.city}`;
  const discountTag = maxDiscount > 0 ? ` Get ${maxDiscount}% OFF` : "";

  // ── Construct Advanced Menu Schema ──
  const menuData = payload.menuItems;
  const categoriesMap = new Map();

  if (Array.isArray(menuData)) {
    menuData.forEach((item: any) => {
      const catName = item.categoryId?.name || item.category || "Other";
      if (!categoriesMap.has(catName)) categoriesMap.set(catName, []);
      categoriesMap.get(catName).push(item);
    });
  } else if (menuData?.menu) {
    Object.entries(menuData.menu).forEach(([catName, items]) => {
      categoriesMap.set(catName, items);
    });
  }

  const menuItemsRaw = Array.isArray(menuData) ? menuData : (menuData?.menu ? Object.values(menuData.menu).flat() : []);

  const menuSchema: any = {
    "@type": "Menu",
    "@id": `${restaurantUrl}#menu`,
    "name": `${r.name} Digital Menu`,
    "mainEntityOfPage": restaurantUrl,
    "inLanguage": "en-PK",
    "hasMenuSection": Array.from(categoriesMap.entries()).map(([catName, items]) => ({
      "@type": "MenuSection",
      "name": catName,
      "hasMenuItem": items.map((item: any) => ({
        "@type": "MenuItem",
        "name": item.name,
        "description": stripHtml(item.description || `${item.name} served at ${r.name}`),
        "image": item.image || undefined,
        "offers": {
          "@type": "Offer",
          "price": Number(item.price || 0),
          "priceCurrency": "PKR"
        }
      }))
    }))
  };

  const restaurantWebPageSchema = {
    "@type": "WebPage",
    "@id": `${restaurantUrl}#webpage`,
    url: restaurantUrl,
    name: `${nameForTitle} Menu, Reviews, Bank Card Deals & Discounts${discountTag}`,
    description: stripHtml(r.metaDescription || r.description || `${r.name} — dine-in restaurant in ${r.area}, ${r.city}`),
    isPartOf: { "@id": `${SITE_URL}#website` },
    mainEntity: { "@id": `${restaurantUrl}#restaurant` },
    inLanguage: "en-PK",
  };

  const socialLinks = [r.website, r.instagram, r.facebook]
    .filter((link) => link && typeof link === "string" && link.trim() !== "" && link !== "#")
    .map((link) => (link.startsWith("http") ? link : `https://${link}`));

  const restaurantSchema: any = {
    "@type": "Restaurant",
    "@id": `${restaurantUrl}#restaurant`,
    mainEntityOfPage: { "@id": `${restaurantUrl}#webpage` },
    name: r.name,
    alternateName: r.brandName && r.branchName ? `${r.brandName} ${r.branchName}` : undefined,
    image: [r.coverImage, ...(r.galleryImages || [])].filter(Boolean).length > 0 ? [r.coverImage, ...(r.galleryImages || [])].filter(Boolean) : undefined,
    url: restaurantUrl,
    description: stripHtml(r.metaDescription || r.description || `${r.name} — dine-in restaurant in ${r.area}, ${r.city}`),
    telephone: r.phone || undefined,
    email: r.email || undefined,
    sameAs: socialLinks.length > 0 ? socialLinks : undefined,
    servesCuisine: r.cuisines?.length > 0 ? r.cuisines : undefined,
    priceRange: getPriceRange(),
    currenciesAccepted: "PKR",
    paymentAccepted: "Cash, Credit Card, Debit Card",
    address: { "@type": "PostalAddress", streetAddress: r.address || r.area, addressLocality: r.city, addressCountry: "PK" },
    acceptsReservations: Boolean(r.bookingSettings?.isBookingEnabled),
    hasMenu: { "@id": `${restaurantUrl}#menu` },
    amenityFeature: amenityFeature.length > 0 ? amenityFeature : undefined,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: r.phone,
      contactType: "Reservations",
      areaServed: "PK",
      availableLanguage: ["English", "Urdu"]
    }
  };

  if (r.brandName) restaurantSchema.brand = { "@type": "Brand", name: r.brandName };
  if (r.branchName && r.branchName !== "Main Branch") restaurantSchema.branchOf = { "@type": "Restaurant", name: r.brandName || r.name };
  if (r.logo) restaurantSchema.logo = { "@type": "ImageObject", url: r.logo };
  if (r.location?.coordinates?.length === 2 && Number(r.location.coordinates[0]) !== 0) {
    restaurantSchema.geo = { "@type": "GeoCoordinates", latitude: Number(r.location.coordinates[1]), longitude: Number(r.location.coordinates[0]) };
    restaurantSchema.hasMap = `https://www.google.com/maps/search/?api=1&query=${r.location.coordinates[1]},${r.location.coordinates[0]}`;
  }
  if (openingHoursSpec.length > 0) restaurantSchema.openingHoursSpecification = openingHoursSpec;
  if (specialOpeningHoursSpecification.length > 0) restaurantSchema.specialOpeningHoursSpecification = specialOpeningHoursSpecification;
  if (r.averageRating > 0 && (r.totalReviews || 0) > 0) {
    restaurantSchema.aggregateRating = { "@type": "AggregateRating", ratingValue: Number(r.averageRating.toFixed(1)), bestRating: 5, worstRating: 1, reviewCount: Number(r.totalReviews) };
  }
  if (schemaReviews.length > 0) restaurantSchema.review = schemaReviews;
  if (dynamicOffers.length > 0) restaurantSchema.makesOffer = dynamicOffers;
  if (r.bookingSettings?.isBookingEnabled) {
    restaurantSchema.potentialAction = {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint", urlTemplate: restaurantUrl,
        actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"],
      },
      result: { "@type": "Reservation", name: `Table Reservation at ${r.name}` },
    };
  }

  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    "@id": `${restaurantUrl}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: r.city, item: `${SITE_URL}/${r.city?.toLowerCase()}/` },
      { "@type": "ListItem", position: 3, name: r.brandName || r.name, item: restaurantUrl },
    ],
  };

  const graph = [restaurantWebPageSchema, restaurantSchema, breadcrumbSchema, menuSchema];
  if (faqSchema.mainEntity.length > 0) graph.push(faqSchema);

  const schemasToInject = {
    "@context": "https://schema.org",
    "@graph": graph
  };

  const serializedRestaurant = JSON.parse(JSON.stringify(r));
  const serializedReviews = JSON.parse(JSON.stringify(reviews || []));
  const serializedDeals = JSON.parse(JSON.stringify(deals || []));
  const serializedOtherBranches = JSON.parse(JSON.stringify(otherBranches || []));
  const serializedSimilar = JSON.parse(JSON.stringify(similarRestaurants || []));
  const serializedFaqs = JSON.parse(JSON.stringify(faqs || []));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemasToInject).replace(/</g, '\\u003c') }} />
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-8">
        <div className="md:max-w-7xl md:mx-auto md:px-6 md:pt-6">
          <RestaurantGallery
            restaurantId={r._id.toString()}
            restaurantSlug={slug}
            restaurantName={r.name}
            coverImage={r.coverImage}
            coverImageAlt={r.coverImageAlt}
            galleryImages={r.galleryImages || []}
            videoUrl={r.videoUrl}
            discountLabel={r.discountLabel}
            isPrimePartner={r.bookingSettings?.isPrimePartner}
            isVerifiedPartner={r.isVerifiedPartner}
            isFeatured={r.isFeatured}
          />
        </div>

        <main className="max-w-7xl mx-auto px-0 sm:px-3 md:px-6">
          <div className="relative px-0 z-20 mb-4 md:mb-6">
            <div className="flex flex-col gap-2.5 md:gap-3.5 px-3 sm:px-0">

              {/* Row 1: Logo & Name */}
              <div className="flex items-start md:items-end gap-3 md:gap-5">
                {/* Logo Section with Story Ring */}
                <div className="-mt-8 md:-mt-12 z-50 shrink-0">
                  <StoryRing 
                    restaurantId={r._id.toString()} 
                    restaurantName={r.name} 
                    logoUrl={r.logo || ""} 
                    className="size-[72px] md:size-28"
                  />
                </div>

                <div className="flex-1 min-w-0 pb-1 md:pb-2 pt-0.5 md:pt-0 mt-0 md:-mt-6">
                  <div className="flex flex-col">
                    <h1 className="text-[21px] md:text-4xl font-black leading-tight text-gray-900 tracking-tight flex flex-wrap items-center">
                      <span className="mr-2">{r.brandName}{r.branchName && r.branchName !== "Main Branch" ? ` ${r.branchName}` : ""}</span>
                      <span className="inline-flex items-center gap-1.5 shrink-0 align-middle">
                        {(r.isVerifiedPartner || r.isFeatured) && (
                          <>
                            <span className="md:hidden"><VerifiedBadge size={14} /></span>
                            <span className="hidden md:inline-flex"><VerifiedBadge size={20} /></span>
                          </>
                        )}
                      </span>
                    </h1>

                    {/* Category & Open Status directly under name */}
                    <div className="mt-[-2px] md:mt-[-1px] flex items-center gap-2 md:gap-3 flex-wrap">
                      {r.cuisines?.length > 0 && (
                        <div className="text-[10px] md:text-[11px] font-bold text-gray-400">
                          <CuisinesLink cuisines={r.cuisines} />
                        </div>
                      )}
                      <div className="flex items-center">
                        <DynamicOpenBadge openingHours={r.openingHours || []} />
                      </div>
                    </div>

                    {/* Follow System Integration — Hidden per request, backend intact */}
                    {/* <div className="mt-3 md:mt-4">
                      <FollowButton 
                        restaurantId={r._id.toString()} 
                        initialFollowersCount={r.followersCount || 0} 
                      />
                    </div> */}
                  </div>
                </div>
              </div>

              {/* Info Block (Under the logo, aligned left) */}
              <div className="flex flex-col gap-2.5 px-0.5 mt-3">
                {/* 1. Address Row */}
                {(r.address || r.area) && (
                  <div className="flex">
                    <button onClick={() => window.dispatchEvent(new CustomEvent('scroll-to-location'))} className="inline-flex items-center gap-2.5 group cursor-pointer w-fit">
                      <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-gray-100 flex items-center justify-center text-black group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0 border border-gray-200">
                        <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </div>
                      <span className="text-[11px] md:text-[13px] font-black text-black group-hover:text-primary transition-colors truncate max-w-[220px] md:max-w-[360px]">
                        {r.address || r.area}
                      </span>
                    </button>
                  </div>
                )}

                {/* 2. Opening Hours Row */}
                {todayTiming && (
                  <div className="flex items-center gap-2.5 group cursor-default">
                    <div className={`w-6 h-6 md:w-7 md:h-7 rounded-lg ${todayTiming.isClosed ? 'bg-red-50 text-red-500 border-red-200' : 'bg-gray-100 text-black border-gray-200'} flex items-center justify-center transition-all shrink-0 border`}>
                      <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </div>
                    <span className={`text-[11px] md:text-[13px] font-black ${todayTiming.isClosed ? 'text-red-700' : 'text-zinc-950'}`}>
                      {todayTiming.isClosed ? (
                        "Today, Closed"
                      ) : (
                        <>Today Timing: <span className="text-black font-extrabold">{to12h(todayTiming.open)} - {to12h(todayTiming.close)}</span></>
                      )}
                    </span>
                  </div>
                )}

                {/* 3. Rating Row */}
                {r.averageRating > 0 && (
                  <div className="flex">
                    <button onClick={() => window.dispatchEvent(new Event("scroll-to-reviews"))} className="inline-flex items-center gap-2.5 group cursor-pointer w-fit">
                      <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-gray-100 flex items-center justify-center text-black group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-all shrink-0 border border-gray-200">
                        <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-yellow-500 text-yellow-500" />
                      </div>
                      <span className="text-[11px] md:text-[13px] font-black text-black group-hover:text-primary transition-colors">
                        {r.averageRating.toFixed(1)} ({r.totalReviews || 0} Reviews)
                      </span>
                    </button>
                  </div>
                )}

                {/* 4. Digital Menu Row - Strictly Dynamic */}
                {((r.menuImages?.filter((img: any) => img && typeof img === 'string' && img.trim() !== '').length || 0) > 0 || (menuItemsRaw?.length || 0) > 0) && (
                  <div className="flex">
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 'menu' }))}
                      className="inline-flex items-center gap-2.5 group w-fit"
                    >
                      <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-gray-100 flex items-center justify-center text-black group-hover:bg-orange-50 group-hover:text-orange-500 transition-all shrink-0 border border-gray-200">
                        <UtensilsCrossed className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </div>
                      <span className="text-[11px] md:text-[13px] font-black text-black group-hover:text-primary transition-colors">
                        View Complete Menu
                      </span>
                    </button>
                  </div>
                )}

                {/* 5. Virtual Tour Row */}
                {r.virtualTour?.scenes?.length > 0 && r.virtualTour?.status === 'published' && (
                  <Link
                    href={`/${city}/${slug}/virtual-tour/`}
                    rel="nofollow"
                    className="flex items-center gap-2.5 group no-underline"
                  >
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-gray-100 flex items-center justify-center text-black group-hover:bg-purple-50 group-hover:text-purple-500 transition-all shrink-0 border border-gray-200">
                      <Box className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </div>
                    <span className="text-[11px] md:text-[13px] font-black text-black group-hover:text-primary transition-colors">
                      360° Virtual Experience Tour
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <RestaurantTabs
                restaurant={serializedRestaurant}
                deals={serializedDeals}
                reviews={serializedReviews}
                otherBranches={serializedOtherBranches}
                faqs={serializedFaqs}
                hasMenu={((r.menuImages?.filter((img: any) => img && typeof img === 'string' && img.trim() !== '').length || 0) > 0 || (menuItemsRaw?.length || 0) > 0)}
                menuData={payload.menuItems}
              />

              <div id="booking-mobile" className="block lg:hidden pt-4 pb-2">
                <BookingWidget restaurantId={r._id.toString()} restaurantSlug={slug} restaurantName={r.name} deals={serializedDeals} />
              </div>

              {serializedSimilar.length > 0 && (
                <div className="space-y-3">
                  <h2 className="font-bold text-base text-gray-800">Similar Restaurants</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {serializedSimilar.slice(0, 6).map((sr: any) => (
                      <SimilarCard key={sr._id} restaurant={sr} fallbackCity={r.city} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-20">
                <BookingWidget restaurantId={r._id.toString()} restaurantSlug={slug} restaurantName={r.name} deals={serializedDeals} />
              </div>
            </div>
          </div>
        </main>

        {/* Floating Mobile Booking Button */}
        <AnimatePresence>
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 120, delay: 0.1 }}
            className="fixed bottom-4 left-0 right-0 z-50 lg:hidden flex justify-center pointer-events-none px-4"
          >
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-booking-drawer"))}
              className="pointer-events-auto group relative flex items-center justify-center gap-1.5 w-full max-w-[180px] bg-primary text-white font-bold text-[13px] py-2.5 rounded-full shadow-lg shadow-primary/30 active:scale-[0.96] transition-transform cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-white/90" />
              <span className="tracking-wide">Book a Table</span>
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center ml-1 group-hover:bg-white/30 transition-colors">
                <ArrowRight className="w-2.5 h-2.5 text-white" />
              </div>
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
