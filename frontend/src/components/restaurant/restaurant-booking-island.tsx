"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const BookingWidget = dynamic(
  () =>
    import("@/components/restaurant/restaurant-detail-client").then((m) => ({
      default: m.BookingWidget,
    })),
  { ssr: false },
);

export function RestaurantBookingIsland(props: ComponentProps<typeof BookingWidget>) {
  return <BookingWidget {...props} />;
}
