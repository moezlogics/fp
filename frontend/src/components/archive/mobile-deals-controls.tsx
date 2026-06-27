"use client";

import { useState } from "react";
import { Filter, MapPin, X } from "lucide-react";
import { DealsSortOption } from "@/lib/deals-archive";
import { DealsFilterSidebar } from "./deals-filter-sidebar";
import { ArchiveMap } from "./archive-map";

interface MobileDealsControlsProps {
  city: string;
  restaurants: any[];
  banks: any[];
  bankDealCounts: Record<string, number>;
  sort: DealsSortOption;
  minDiscount: number;
  activeBankSlug?: string;
}

export function MobileDealsControls({
  city,
  restaurants,
  banks,
  bankDealCounts,
  sort,
  minDiscount,
  activeBankSlug,
}: MobileDealsControlsProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);

  return (
    <>
      <div className="flex gap-3 lg:hidden">
        <button
          onClick={() => setShowFilters(true)}
          className="bg-gray-50 border border-gray-100 p-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-900 shadow-sm active:scale-95 transition-all"
        >
          <Filter className="w-4 h-4 text-primary" /> Filters
        </button>
        <button
          onClick={() => setShowMap(true)}
          className="bg-primary text-white p-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          <MapPin className="w-4 h-4" /> Map
        </button>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFilters(false)}
          />

          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up shadow-2xl">
            <div className="sticky top-0 bg-white rounded-t-3xl z-10 border-b">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" /> Filters
                </h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <DealsFilterSidebar
                city={city}
                banks={banks}
                bankDealCounts={bankDealCounts}
                activeBankSlug={activeBankSlug}
                sort={sort}
                minDiscount={minDiscount}
              />
            </div>
          </div>
        </div>
      )}

      {showMap && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMap(false)}
          />

          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl h-[85vh] overflow-hidden animate-slide-up shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2 mt-2">
                <MapPin className="w-4 h-4 text-primary" /> Nearby Restaurants
              </h3>
              <button
                onClick={() => setShowMap(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition mt-2"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 min-h-0">
              <ArchiveMap restaurants={restaurants} city={city} />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

