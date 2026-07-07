import { preload } from "react-dom";
import { buildRestaurantJsonLd, serializeJsonLd } from "@/lib/restaurant-schema";
import { buildRestaurantClientProps } from "@/lib/restaurant-client-props";
import RestaurantViewClient from "@/components/restaurant/restaurant-view-client";

export default function RestaurantDetailView({
  city,
  slug,
  payload,
}: {
  city: string;
  slug: string;
  payload: any;
  siteName?: string;
}) {
  const r = payload.restaurant;
  const jsonLd = buildRestaurantJsonLd({ city, slug, payload });
  const clientProps = buildRestaurantClientProps({ city, slug, payload });

  if (r.coverImage) {
    preload(r.coverImage, { as: "image", fetchPriority: "high" });
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <RestaurantViewClient {...clientProps} />
    </>
  );
}
