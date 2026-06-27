"use client";

import type { FC } from "react";
import { RestaurantCard } from "@/components/ui/restaurant-card";

/**
 * Client-side wrapper for RestaurantCard used in Similar Restaurants section.
 * Needed because the detail page is a server component.
 */
export const SimilarCard: FC<{ restaurant: any; fallbackCity: string }> = ({ restaurant, fallbackCity }) => {
    const r = { ...restaurant, city: restaurant.city || fallbackCity };
    return <RestaurantCard restaurant={r} compact />;
};
