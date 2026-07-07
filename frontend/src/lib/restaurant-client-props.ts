/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildRestaurantFaqs } from "@/lib/restaurant-faqs";
import {
  slimBranchesForClient,
  slimDealsForClient,
  slimGalleryImages,
  slimRestaurantForClient,
  slimSimilarForClient,
} from "@/lib/slim-restaurant";

export function buildRestaurantClientProps({
  city,
  slug,
  payload,
}: {
  city: string;
  slug: string;
  payload: any;
}) {
  const { restaurant: r, deals, otherBranches, similarRestaurants, menuItems } =
    payload;

  const menuItemsRaw = Array.isArray(menuItems)
    ? menuItems
    : menuItems?.menu
      ? Object.values(menuItems.menu).flat()
      : [];

  const hasMenu =
    (r.menuImages?.filter(
      (img: any) => img && typeof img === "string" && img.trim() !== "",
    ).length || 0) > 0 || (menuItemsRaw?.length || 0) > 0;

  const currentDayStr = new Date()
    .toLocaleString("en-US", { weekday: "long", timeZone: "Asia/Karachi" })
    .toLowerCase();
  const todayTiming = (r.openingHours || []).find(
    (h: any) => h.day?.toLowerCase() === currentDayStr,
  );

  const faqs = buildRestaurantFaqs({
    restaurant: r,
    deals: deals || [],
    otherBranches: otherBranches || [],
  });

  return {
    city,
    slug,
    restaurantId: String(r._id),
    restaurant: slimRestaurantForClient(r),
    deals: slimDealsForClient(deals || []),
    otherBranches: slimBranchesForClient(otherBranches || []),
    similarRestaurants: slimSimilarForClient(similarRestaurants || []),
    faqs,
    galleryImages: slimGalleryImages(r.galleryImages || []),
    hasMenu,
    todayTiming: todayTiming
      ? { day: todayTiming.day, open: todayTiming.open, close: todayTiming.close, isClosed: todayTiming.isClosed }
      : null,
    hasVirtualTour:
      (r.virtualTour?.scenes?.length || 0) > 0 && r.virtualTour?.status === "published",
  };
}

export type RestaurantClientProps = ReturnType<typeof buildRestaurantClientProps>;
