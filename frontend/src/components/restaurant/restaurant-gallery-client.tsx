"use client";

import dynamic from "next/dynamic";
import type { RestaurantClientProps } from "@/lib/restaurant-client-props";

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
