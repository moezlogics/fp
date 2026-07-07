"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const RestaurantTabs = dynamic(
  () =>
    import("@/components/restaurant/restaurant-detail-client").then((m) => ({
      default: m.RestaurantTabs,
    })),
  { ssr: true, loading: () => <div className="h-40 animate-pulse bg-gray-100 rounded-xl" /> },
);

export function RestaurantTabsIsland(props: ComponentProps<typeof RestaurantTabs>) {
  return <RestaurantTabs {...props} />;
}
