import { preload } from "react-dom";
import { buildRestaurantJsonLd, serializeJsonLd } from "@/lib/restaurant-schema";
import { buildRestaurantClientProps } from "@/lib/restaurant-client-props";
import RestaurantAboutDescription from "@/components/restaurant/restaurant-about-description";
import RestaurantPageClient from "@/components/restaurant/restaurant-page-client";

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

  const aboutSlot = r.description ? (
    <RestaurantAboutDescription
      html={r.description}
      brandName={r.brandName}
      name={r.name}
    />
  ) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <RestaurantPageClient
        {...clientProps}
        aboutSlot={aboutSlot}
      />
    </>
  );
}
