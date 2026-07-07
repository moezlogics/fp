/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildRestaurantFaqs } from "@/lib/restaurant-faqs";

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
    menuItems: menuData,
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

  const maxBankDeal = (deals || []).reduce(
    (max: number, d: any) => Math.max(max, d?.discountPercent || 0),
    0,
  );
  const maxCap = r.bookingSettings?.maxDiscountCap || 0;
  const maxDiscount = Math.max(maxBankDeal, maxCap);
  const hasMultipleBranches = Boolean(
    r.parentBrandId || (r.isHeadOffice && r.branchName && r.branchName !== "Main Branch"),
  );
  const cleanBranch = (r.branchName || "").replace(/\s*branch\s*/gi, "").trim();
  const nameForTitle =
    hasMultipleBranches && cleanBranch
      ? `${r.brandName} ${cleanBranch}`
      : `${r.brandName || r.name} ${r.city}`;
  const discountTag = maxDiscount > 0 ? ` Get ${maxDiscount}% OFF` : "";

  const categoriesMap = new Map<string, any[]>();

  if (Array.isArray(menuData)) {
    menuData.forEach((item: any) => {
      const catName = item.categoryId?.name || item.category || "Other";
      if (!categoriesMap.has(catName)) categoriesMap.set(catName, []);
      categoriesMap.get(catName)!.push(item);
    });
  } else if (menuData?.menu) {
    Object.entries(menuData.menu).forEach(([catName, items]) => {
      categoriesMap.set(catName, items as any[]);
    });
  }

  const menuSchema: any = {
    "@type": "Menu",
    "@id": `${restaurantUrl}#menu`,
    name: `${r.name} Digital Menu`,
    mainEntityOfPage: restaurantUrl,
    inLanguage: "en-PK",
    hasMenuSection: Array.from(categoriesMap.entries())
      .slice(0, 12)
      .map(([catName, items]) => ({
        "@type": "MenuSection",
        name: catName,
        hasMenuItem: items.slice(0, 8).map((item: any) => ({
          "@type": "MenuItem",
          name: item.name,
          ...(item.description
            ? { description: stripHtml(item.description).slice(0, 160) }
            : {}),
          ...(item.image ? { image: item.image } : {}),
          offers: {
            "@type": "Offer",
            price: Number(item.price || 0),
            priceCurrency: "PKR",
          },
        })),
      })),
  };

  const restaurantWebPageSchema = {
    "@type": "WebPage",
    "@id": `${restaurantUrl}#webpage`,
    url: restaurantUrl,
    name: `${nameForTitle} Menu, Reviews, Bank Card Deals & Discounts${discountTag}`,
    description: stripHtml(
      r.metaDescription ||
        r.description ||
        `${r.name} — dine-in restaurant in ${r.area}, ${r.city}`,
    ),
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
    image:
      [r.coverImage, ...(r.galleryImages || [])].filter(Boolean).length > 0
        ? [r.coverImage, ...(r.galleryImages || [])].filter(Boolean)
        : undefined,
    url: restaurantUrl,
    description: stripHtml(
      r.metaDescription ||
        r.description ||
        `${r.name} — dine-in restaurant in ${r.area}, ${r.city}`,
    ),
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
    hasMenu: { "@id": `${restaurantUrl}#menu` },
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

  const graph = [restaurantWebPageSchema, restaurantSchema, breadcrumbSchema, menuSchema];
  if (faqSchema.mainEntity.length > 0) graph.push(faqSchema);

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function serializeJsonLd(schema: Record<string, unknown>) {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
