/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Single source of truth for restaurant SEO description snippet.
 * Used ONLY in <meta> tags and JSON-LD WebPage — never the full owner HTML description.
 */
export function buildRestaurantSeoDescription(
  r: any,
  deals: any[] = [],
  siteName = "Foodies Pakistan",
): string {
  if (r.metaDescription?.trim()) {
    return r.metaDescription.trim();
  }

  const cuisineStr = r.cuisines?.slice(0, 3).join(", ") || "multi-cuisine";
  const ratingStr =
    r.averageRating > 0
      ? ` Rated ${r.averageRating.toFixed(1)}/5 by ${r.totalReviews || 0} diners.`
      : "";

  return `Serving ${cuisineStr} in ${r.area}, ${r.city}.${ratingStr} Find ${r.name} menu, deals & discounts, reviews and book a table instantly on ${siteName}.`;
}

export function buildRestaurantSeoTitle(
  r: any,
  deals: any[] = [],
): string {
  const hasMultipleBranches = Boolean(
    r.parentBrandId || (r.isHeadOffice && r.branchName && r.branchName !== "Main Branch"),
  );
  const cleanBranch = (r.branchName || "").replace(/\s*branch\s*/gi, "").trim();
  const nameForTitle =
    hasMultipleBranches && cleanBranch
      ? `${r.brandName} ${cleanBranch}`
      : `${r.brandName || r.name}${r.city ? ` ${r.city}` : ""}`;

  const maxBankDeal = deals.reduce(
    (max: number, d: any) => Math.max(max, d?.discountPercent || 0),
    0,
  );
  const maxCap = r.bookingSettings?.maxDiscountCap || 0;
  const maxDiscount = Math.max(maxBankDeal, maxCap);
  const discountTag = maxDiscount > 0 ? ` Get ${maxDiscount}% OFF` : "";

  return `${nameForTitle} Menu, Reviews, Bank Card Deals & Discounts${discountTag}`;
}
