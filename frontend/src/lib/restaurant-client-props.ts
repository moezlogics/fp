/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildRestaurantFaqs } from "@/lib/restaurant-faqs";

/** One-pass plain serialization for RSC → client props (replaces triple JSON.parse). */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function buildRestaurantClientProps({
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
    similarRestaurants,
    menuItems,
  } = payload;

  const menuItemsRaw = Array.isArray(menuItems)
    ? menuItems
    : menuItems?.menu
      ? Object.values(menuItems.menu).flat()
      : [];

  const hasMenu =
    (r.menuImages?.filter(
      (img: any) => img && typeof img === "string" && img.trim() !== "",
    ).length || 0) > 0 || (menuItemsRaw?.length || 0) > 0;

  const faqs = buildRestaurantFaqs({
    restaurant: r,
    deals: deals || [],
    otherBranches: otherBranches || [],
  });

  const currentDayStr = new Date()
    .toLocaleString("en-US", { weekday: "long", timeZone: "Asia/Karachi" })
    .toLowerCase();
  const todayTiming = (r.openingHours || []).find(
    (h: any) => h.day?.toLowerCase() === currentDayStr,
  );

  return {
    city,
    slug,
    restaurantId: String(r._id),
    restaurant: toPlain(r),
    deals: toPlain(deals || []),
    reviews: toPlain(reviews || []),
    otherBranches: toPlain(otherBranches || []),
    similarRestaurants: toPlain(similarRestaurants || []),
    faqs: toPlain(faqs),
    menuData: toPlain(menuItems),
    hasMenu,
    todayTiming: todayTiming ? toPlain(todayTiming) : null,
    hasVirtualTour:
      (r.virtualTour?.scenes?.length || 0) > 0 && r.virtualTour?.status === "published",
  };
}

export type RestaurantClientProps = ReturnType<typeof buildRestaurantClientProps>;
