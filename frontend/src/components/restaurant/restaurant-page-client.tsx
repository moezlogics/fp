"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Clock, MapPin, UtensilsCrossed, Star, Box, ArrowRight, Calendar } from "lucide-react";
import { CuisinesLink } from "@/components/restaurant/cuisines-link";
import { DynamicOpenBadge } from "@/components/restaurant/dynamic-open-badge";
import { SimilarCard } from "@/components/restaurant/similar-card";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { RestaurantGalleryIsland } from "@/components/restaurant/restaurant-gallery-island";
import { RestaurantTabsIsland } from "@/components/restaurant/restaurant-tabs-island";
import { RestaurantBookingIsland } from "@/components/restaurant/restaurant-booking-island";
import type { ReactNode } from "react";
import type { RestaurantPageClientProps } from "@/lib/restaurant-client-props";

const StoryRing = dynamic(
  () => import("@/components/stories/StoryRing").then((m) => ({ default: m.StoryRing })),
  { ssr: false },
);

function to12h(t: string) {
  if (!t) return t;
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${suffix}`;
}

type Props = RestaurantPageClientProps & {
  aboutSlot?: ReactNode;
};

export default function RestaurantPageClient({
  city,
  slug,
  restaurantId,
  header,
  tabRestaurant,
  deals,
  otherBranches,
  similarRestaurants,
  galleryImages,
  hasMenu,
  todayTiming,
  hasVirtualTour,
  aboutSlot,
}: Props) {
  const r = header;
  const fullName =
    r.brandName + (r.branchName && r.branchName !== "Main Branch" ? ` ${r.branchName}` : "");
  const isLongName = fullName.length >= 18;

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-8">
      <div className="md:max-w-7xl md:mx-auto md:px-6 md:pt-6">
        <RestaurantGalleryIsland
          restaurantId={restaurantId}
          restaurantSlug={slug}
          restaurantName={r.name}
          coverImage={r.coverImage}
          coverImageAlt={r.coverImageAlt}
          galleryImages={galleryImages}
          videoUrl={r.videoUrl}
          discountLabel={r.discountLabel}
          isPrimePartner={r.isPrimePartner}
          isVerifiedPartner={r.isVerifiedPartner}
          isFeatured={r.isFeatured}
        />
      </div>

      <main className="max-w-7xl mx-auto px-0 sm:px-3 md:px-6">
        <div className="relative px-0 z-20 mb-0">
          <div className="flex flex-col gap-1 md:gap-2 px-3 sm:px-0">
            <div className="flex items-start md:items-end gap-2 md:gap-3.5">
              <div className="-mt-8 md:-mt-12 z-50 shrink-0">
                <StoryRing
                  restaurantId={restaurantId}
                  restaurantName={r.name}
                  logoUrl={r.logo || ""}
                  className="w-[72px] h-[72px] md:w-28 md:h-28"
                />
              </div>
              <div className="flex-1 min-w-0 pb-1 md:pb-2 pt-0.5 md:pt-0 mt-0 md:-mt-6">
                <div className="block md:flex md:flex-col">
                  <h1 className="text-2xl md:text-4xl font-extrabold leading-[1.1] md:leading-tight text-black tracking-tight inline md:block">
                    <span>
                      {r.brandName}
                      {r.branchName && r.branchName !== "Main Branch" ? ` ${r.branchName}` : ""}
                    </span>
                    {(r.isVerifiedPartner || r.isFeatured) && (
                      <span className="inline-flex items-center shrink-0 align-middle ml-1.5">
                        <span className="md:hidden"><VerifiedBadge size={16} /></span>
                        <span className="hidden md:inline-flex"><VerifiedBadge size={22} /></span>
                      </span>
                    )}
                  </h1>
                  <div
                    className={`${isLongName ? "inline" : "flex w-full -mt-1"} md:flex items-center gap-2 md:gap-3 flex-wrap md:mt-0.5 ${isLongName ? "ml-2" : "ml-0"} md:ml-0 align-middle`}
                  >
                    {r.cuisines?.length > 0 && (
                      <div className="text-[10px] md:text-[11px] font-semibold text-zinc-500 uppercase tracking-wider inline-block align-middle">
                        <CuisinesLink cuisines={r.cuisines} />
                      </div>
                    )}
                    <div className="inline-flex items-center align-middle">
                      <DynamicOpenBadge openingHours={r.openingHours || []} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-0.5 md:gap-1 px-0.5 mt-0.5 md:mt-1">
              {(r.address || r.area) && (
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("scroll-to-location"))}
                    className="inline-flex items-center gap-2.5 group cursor-pointer w-fit"
                  >
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-gray-100 flex items-center justify-center text-black group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0 border border-gray-200">
                      <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </div>
                    <span className="text-[11px] md:text-[13px] font-bold text-zinc-900 group-hover:text-primary transition-colors truncate max-w-[220px] md:max-w-[360px]">
                      {r.address || r.area}
                    </span>
                  </button>
                </div>
              )}
              {todayTiming && (
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 md:w-7 md:h-7 rounded-lg ${todayTiming.isClosed ? "bg-red-50 text-red-500 border-red-200" : "bg-gray-100 text-black border-gray-200"} flex items-center justify-center shrink-0 border`}>
                    <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className={`text-[11px] md:text-[13px] font-bold ${todayTiming.isClosed ? "text-red-700" : "text-zinc-900"}`}>
                    {todayTiming.isClosed ? (
                      "Today, Closed"
                    ) : (
                      <>Today Timing: <span className="text-black font-extrabold">{to12h(todayTiming.open)} - {to12h(todayTiming.close)}</span></>
                    )}
                  </span>
                </div>
              )}
              {r.averageRating > 0 && (
                <div className="flex">
                  <button type="button" onClick={() => window.dispatchEvent(new Event("scroll-to-reviews"))} className="inline-flex items-center gap-2.5 group cursor-pointer w-fit">
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-gray-100 flex items-center justify-center text-black group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-all shrink-0 border border-gray-200">
                      <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-yellow-500 text-yellow-500" />
                    </div>
                    <span className="text-[11px] md:text-[13px] font-bold text-zinc-900 group-hover:text-primary transition-colors">
                      {r.averageRating.toFixed(1)} ({r.totalReviews || 0} Reviews)
                    </span>
                  </button>
                </div>
              )}
              {hasMenu && (
                <div className="flex">
                  <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("switchTab", { detail: "menu" }))} className="inline-flex items-center gap-2.5 group w-fit">
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-gray-100 flex items-center justify-center text-black group-hover:bg-orange-50 group-hover:text-orange-500 transition-all shrink-0 border border-gray-200">
                      <UtensilsCrossed className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </div>
                    <span className="text-[11px] md:text-[13px] font-bold text-zinc-900 group-hover:text-primary transition-colors">View Complete Menu</span>
                  </button>
                </div>
              )}
              {hasVirtualTour && (
                <Link href={`/${city}/${slug}/virtual-tour/`} rel="nofollow" className="flex items-center gap-2.5 group no-underline">
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-gray-100 flex items-center justify-center text-black group-hover:bg-purple-50 group-hover:text-purple-500 transition-all shrink-0 border border-gray-200">
                    <Box className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className="text-[11px] md:text-[13px] font-bold text-zinc-900 group-hover:text-primary transition-colors">360° Virtual Experience Tour</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 -mt-3 md:mt-0">
          <div className="lg:col-span-2 space-y-3 md:space-y-5 min-w-0 w-full overflow-hidden">
            <RestaurantTabsIsland
              restaurant={tabRestaurant}
              aboutSlot={aboutSlot}
              deals={deals}
              otherBranches={otherBranches}
              hasMenu={hasMenu}
              restaurantId={restaurantId}
            />
            <div id="booking-mobile" className="block lg:hidden pt-4 pb-2">
              <RestaurantBookingIsland restaurantId={restaurantId} restaurantSlug={slug} restaurantName={r.name} deals={deals} />
            </div>
            {similarRestaurants.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-bold text-base text-gray-800">Similar Restaurants</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {similarRestaurants.slice(0, 6).map((sr: any) => (
                    <SimilarCard key={sr._id} restaurant={sr} fallbackCity={r.city} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <RestaurantBookingIsland restaurantId={restaurantId} restaurantSlug={slug} restaurantName={r.name} deals={deals} />
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-4 left-0 right-0 z-50 lg:hidden flex justify-center pointer-events-none px-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-booking-drawer"))}
          className="pointer-events-auto group relative flex items-center justify-center gap-1.5 w-full max-w-[180px] bg-primary text-white font-bold text-[13px] py-2.5 rounded-full shadow-lg shadow-primary/30 active:scale-[0.96] transition-transform cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-white/90" />
          <span className="tracking-wide">Book a Table</span>
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center ml-1 group-hover:bg-white/30 transition-colors">
            <ArrowRight className="w-2.5 h-2.5 text-white" />
          </div>
        </button>
      </div>
    </div>
  );
}
