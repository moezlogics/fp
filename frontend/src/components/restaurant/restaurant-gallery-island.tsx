"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const RestaurantGallery = dynamic(
  () =>
    import("@/components/restaurant/restaurant-gallery").then((m) => ({
      default: m.RestaurantGallery,
    })),
  { ssr: true },
);

export function RestaurantGalleryIsland(props: ComponentProps<typeof RestaurantGallery>) {
  return <RestaurantGallery {...props} />;
}
