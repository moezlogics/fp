/* eslint-disable @typescript-eslint/no-explicit-any */

export function slimRestaurantForHeader(r: any) {
  return {
    _id: r._id,
    name: r.name,
    brandName: r.brandName,
    branchName: r.branchName,
    city: r.city,
    area: r.area,
    address: r.address,
    cuisines: r.cuisines,
    openingHours: r.openingHours,
    averageRating: r.averageRating,
    totalReviews: r.totalReviews,
    isVerifiedPartner: r.isVerifiedPartner,
    isFeatured: r.isFeatured,
    coverImage: r.coverImage,
    coverImageAlt: r.coverImageAlt,
    videoUrl: r.videoUrl,
    discountLabel: r.discountLabel,
    logo: r.logo,
    isPrimePartner: r.bookingSettings?.isPrimePartner,
  };
}

export function slimRestaurantForTabs(r: any) {
  return {
    _id: r._id,
    name: r.name,
    brandName: r.brandName,
    branchName: r.branchName,
    city: r.city,
    area: r.area,
    address: r.address,
    phone: r.phone,
    website: r.website,
    cuisines: r.cuisines,
    menuImages: r.menuImages,
    openingHours: r.openingHours,
    location: r.location,
    logo: r.logo,
    coverImage: r.coverImage,
    facilities: r.facilities,
    vibes: r.vibes,
    restaurantType: r.restaurantType,
    category: r.category,
    virtualTour: r.virtualTour
      ? {
          status: r.virtualTour.status,
          sceneCount: r.virtualTour.scenes?.length || 0,
        }
      : undefined,
  };
}

export function slimDealsForClient(deals: any[] = []) {
  return deals.map((d) => ({
    _id: d._id,
    discountPercent: d.discountPercent,
    minSpend: d.minSpend,
    cardType: d.cardType,
    daysValid: d.daysValid,
    maxDiscountCap: d.maxDiscountCap,
    bankId: d.bankId
      ? { name: d.bankId.name, logo: d.bankId.logo, color: d.bankId.color }
      : undefined,
  }));
}

export function slimBranchesForClient(branches: any[] = []) {
  return branches.map((b) => ({
    _id: b._id,
    name: b.name,
    brandName: b.brandName,
    slug: b.slug,
    city: b.city,
    area: b.area,
    coverImage: b.coverImage,
    averageRating: b.averageRating,
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
