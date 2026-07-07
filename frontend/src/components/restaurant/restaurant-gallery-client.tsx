"use client";

import dynamic from "next/dynamic";

const RestaurantGallery = dynamic(
  () =>
    import("@/components/restaurant/restaurant-gallery").then((mod) => ({
      default: mod.RestaurantGallery,
    })),
  { ssr: false },
);

export function RestaurantGalleryClient(
  props: React.ComponentProps<typeof RestaurantGallery>,
) {
  return <RestaurantGallery {...props} coverPriority={false} />;
}
