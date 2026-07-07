/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildRestaurantSeoTitle } from "@/lib/restaurant-seo";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

function stripHtml(html: string) {
  if (!html) return "";
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
}

function getPriceRange(priceRange?: number) {
  if (priceRange === 1) return "500 - 1500 PKR";
  if (priceRange === 2) return "1500 - 3000 PKR";
  if (priceRange === 3) return "3000 - 6000 PKR";
  if (priceRange === 4) return "6000+ PKR";
  return "1500 - 3000 PKR";
}

export function buildRestaurantJsonLd({
  city,
  slug,
  payload,
}: {
  city: string;
  slug: string;
  payload: any;
}) {
  const {
    restaurant: r,
    reviews,
    deals,
    otherBranches,
  } = payload;

  const restaurantUrl = `${SITE_URL}/${city}/${slug}/`;

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
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: rev.text || undefined,
  }));



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
      validFrom: override.date,
      validThrough: override.date,
      ...(override.isClosed
        ? { opens: "00:00", closes: "00:00" }
        : { opens: override.open, closes: override.close }),
    }));

  const dynamicOffers = (deals || [])
    .filter((d: any) => d?.discountPercent > 0)
    .map((d: any, index: number) => ({
      "@type": "Offer",
      "@id": `${restaurantUrl}#offer-${index + 1}`,
      name: d.bankId?.name
        ? `${d.discountPercent}% off with ${d.bankId.name}`
        : `${d.discountPercent}% off at ${r.name}`,
      description:
        d.description ||
        (d.bankId?.name
          ? `Exclusive ${d.discountPercent}% dining discount for ${d.bankId.name} customers.`
          : `Exclusive ${d.discountPercent}% dining discount available at ${r.name}.`),
      availability: "https://schema.org/InStock",
      eligibleTransactionVolume:
        d.minSpendPaisa > 0
          ? {
              "@type": "PriceSpecification",
              priceCurrency: "PKR",
              minPrice: Number((d.minSpendPaisa / 100).toFixed(2)),
            }
          : undefined,
      validFrom: d.validFrom ? new Date(d.validFrom).toISOString() : undefined,
      validThrough: d.validTo ? new Date(d.validTo).toISOString() : undefined,
    }));

  const seoTitle = buildRestaurantSeoTitle(r, deals || []);

  const restaurantWebPageSchema = {
    "@type": "WebPage",
    "@id": `${restaurantUrl}#webpage`,
    url: restaurantUrl,
    name: seoTitle,
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
    alternateName:
      r.brandName && r.branchName ? `${r.brandName} ${r.branchName}` : undefined,
    image: r.coverImage ? [r.coverImage] : undefined,
    url: restaurantUrl,
    telephone: r.phone || undefined,
    email: r.email || undefined,
    sameAs: socialLinks.length > 0 ? socialLinks : undefined,
    servesCuisine: r.cuisines?.length > 0 ? r.cuisines : undefined,
    priceRange: getPriceRange(r.priceRange),
    currenciesAccepted: "PKR",
    paymentAccepted: "Cash, Credit Card, Debit Card",
    address: {
      "@type": "PostalAddress",
      streetAddress: r.address || r.area,
      addressLocality: r.city,
      addressCountry: "PK",
    },
    acceptsReservations: Boolean(r.bookingSettings?.isBookingEnabled),
    amenityFeature: amenityFeature.length > 0 ? amenityFeature : undefined,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: r.phone,
      contactType: "Reservations",
      areaServed: "PK",
      availableLanguage: ["English", "Urdu"],
    },
  };

  if (r.brandName) restaurantSchema.brand = { "@type": "Brand", name: r.brandName };
  if (r.branchName && r.branchName !== "Main Branch") {
    restaurantSchema.branchOf = { "@type": "Restaurant", name: r.brandName || r.name };
  }
  if (r.logo) restaurantSchema.logo = { "@type": "ImageObject", url: r.logo };
  if (r.location?.coordinates?.length === 2 && Number(r.location.coordinates[0]) !== 0) {
    restaurantSchema.geo = {
      "@type": "GeoCoordinates",
      latitude: Number(r.location.coordinates[1]),
      longitude: Number(r.location.coordinates[0]),
    };
    restaurantSchema.hasMap = `https://www.google.com/maps/search/?api=1&query=${r.location.coordinates[1]},${r.location.coordinates[0]}`;
  }
  if (openingHoursSpec.length > 0) restaurantSchema.openingHoursSpecification = openingHoursSpec;
  if (specialOpeningHoursSpecification.length > 0) {
    restaurantSchema.specialOpeningHoursSpecification = specialOpeningHoursSpecification;
  }
  if (r.averageRating > 0 && (r.totalReviews || 0) > 0) {
    restaurantSchema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(r.averageRating.toFixed(1)),
      bestRating: 5,
      worstRating: 1,
      reviewCount: Number(r.totalReviews),
    };
  }
  if (schemaReviews.length > 0) restaurantSchema.review = schemaReviews;
  if (dynamicOffers.length > 0) restaurantSchema.makesOffer = dynamicOffers;
  if (r.bookingSettings?.isBookingEnabled) {
    restaurantSchema.potentialAction = {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: restaurantUrl,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
      result: { "@type": "Reservation", name: `Table Reservation at ${r.name}` },
    };
  }

  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    "@id": `${restaurantUrl}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: r.city,
        item: `${SITE_URL}/${r.city?.toLowerCase()}/`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: r.brandName || r.name,
        item: restaurantUrl,
      },
    ],
  };

  const graph = [restaurantWebPageSchema, restaurantSchema, breadcrumbSchema];

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function serializeJsonLd(schema: Record<string, unknown>) {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
