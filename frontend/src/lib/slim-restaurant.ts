/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Strip heavy Mongo/API fields before passing restaurant data to client
 * components. Full objects were serialized 4–5× in RSC flight + HTML (same
 * issue as mobilestore.pk rich_description).
 */
export function slimRestaurantForClient(r: any) {
  if (!r) return r;

  const {
    description,
    metaDescription,
    galleryImages,
    menuItems,
    similarRestaurants,
    reviews,
    deals,
    otherBranches,
    specialOverrides,
    embedding,
    __v,
    createdAt,
    updatedAt,
    virtualTour,
    ...rest
  } = r;

  return {
    ...rest,
    virtualTour: virtualTour
      ? {
          status: virtualTour.status,
          sceneCount: virtualTour.scenes?.length || 0,
        }
      : undefined,
  };
}

export function slimDealsForClient(deals: any[] = []) {
  return deals.map((d) => ({
    _id: d._id,
    discountPercent: d.discountPercent,
    minSpend: d.minSpend,
    minSpendPaisa: d.minSpendPaisa,
    maxDiscountCap: d.maxDiscountCap,
    cardType: d.cardType,
    daysValid: d.daysValid,
    description: d.description,
    bankId: d.bankId
      ? {
          name: d.bankId.name,
          logo: d.bankId.logo,
          color: d.bankId.color,
        }
      : undefined,
  }));
}

export function slimBranchesForClient(branches: any[] = []) {
  return branches.map((b) => ({
    _id: b._id,
    name: b.name,
    brandName: b.brandName,
    branchName: b.branchName,
    slug: b.slug,
    city: b.city,
    area: b.area,
    address: b.address,
    coverImage: b.coverImage,
    averageRating: b.averageRating,
    totalReviews: b.totalReviews,
  }));
}

export function slimSimilarForClient(restaurants: any[] = []) {
  return restaurants.map((r) => ({
    _id: r._id,
    name: r.name,
    brandName: r.brandName,
    slug: r.slug,
    city: r.city,
    area: r.area,
    coverImage: r.coverImage,
    logo: r.logo,
    cuisines: r.cuisines,
    averageRating: r.averageRating,
    totalReviews: r.totalReviews,
    discountLabel: r.discountLabel,
    openingHours: r.openingHours,
    location: r.location,
    bookingSettings: r.bookingSettings
      ? { maxDiscountCap: r.bookingSettings.maxDiscountCap }
      : undefined,
    deals: Array.isArray(r.deals)
      ? r.deals.map((d: any) => ({ discountPercent: d.discountPercent }))
      : undefined,
  }));
}

export function slimGalleryImages(images: any[] = []) {
  return images.map((img) =>
    typeof img === "string"
      ? { url: img, category: "Food" as const }
      : { url: img.url, category: img.category || "Food", altText: img.altText },
  );
}
