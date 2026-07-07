"use client";

type RestaurantLcpCoverProps = {
  coverImage: string;
  coverImageAlt?: string;
  restaurantName: string;
};

/**
 * Server-rendered LCP hero — paints before client gallery/lightbox JS loads.
 */
export default function RestaurantLcpCover({
  coverImage,
  coverImageAlt,
  restaurantName,
}: RestaurantLcpCoverProps) {
  const alt = coverImageAlt || `${restaurantName} - Main Entrance`;

  return (
    <div id="restaurant-lcp-cover" className="relative group/gallery">
      {/* Desktop — cover cell (2×2) */}
      <div className="hidden md:grid grid-cols-4 gap-[3px] h-[420px] rounded-2xl overflow-hidden shadow-sm lg:shadow-md border border-gray-100">
        <div className="col-span-2 row-span-2 relative overflow-hidden border-r-[1.5px] border-gray-100 bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImage}
            alt={alt}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-50 animate-pulse" />
        ))}
      </div>

      {/* Mobile — cover cell (2×2) */}
      <div
        className="md:hidden grid grid-cols-3 grid-rows-2 gap-0.5 bg-gray-100"
        style={{ height: "clamp(200px, 50vw, 280px)" }}
      >
        <div className="col-span-2 row-span-2 relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImage}
            alt={alt}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>
        <div className="bg-gray-50 animate-pulse" />
        <div className="bg-gray-50 animate-pulse" />
      </div>
    </div>
  );
}
