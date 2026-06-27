"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RestaurantCard } from "@/components/ui/restaurant-card";

// ── Haversine distance (km) ──
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface HomepageCardsProps {
    restaurants: any[];
    userCitySlug: string;
    /** "grid" for the standard grid, "scroll" for horizontal scroll */
    layout?: "grid" | "scroll";
    /** Sort restaurants by distance from user's stored lat/lng */
    sortByNearby?: boolean;
}

export function HomepageCards({ restaurants, userCitySlug, layout = "grid", sortByNearby = false }: HomepageCardsProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // ── Client-side nearby sorting ──
    const sortedRestaurants = useMemo(() => {
        if (!mounted || !sortByNearby || typeof window === "undefined") return restaurants;

        const userLat = parseFloat(localStorage.getItem("fp_lat") || sessionStorage.getItem("fp_lat") || "");
        const userLng = parseFloat(localStorage.getItem("fp_lng") || sessionStorage.getItem("fp_lng") || "");

        if (!userLat || !userLng) return restaurants;

        return [...restaurants].sort((a, b) => {
            const aCoords = a.location?.coordinates;
            const bCoords = b.location?.coordinates;
            const aDist = aCoords?.length >= 2 ? haversineKm(userLat, userLng, aCoords[1], aCoords[0]) : 9999;
            const bDist = bCoords?.length >= 2 ? haversineKm(userLat, userLng, bCoords[1], bCoords[0]) : 9999;
            return aDist - bDist;
        });
    }, [restaurants, sortByNearby, mounted]);

    // ── Scroll state detection ──
    const updateScrollState = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 8);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el || layout !== "scroll") return;
        updateScrollState();
        el.addEventListener("scroll", updateScrollState, { passive: true });
        return () => el.removeEventListener("scroll", updateScrollState);
    }, [layout, sortedRestaurants]);

    const scrollBy = (dir: "left" | "right") => {
        const el = scrollRef.current;
        if (!el) return;
        const cardWidth = el.querySelector<HTMLElement>(":scope > div")?.offsetWidth || 200;
        el.scrollBy({ left: dir === "left" ? -cardWidth * 2 : cardWidth * 2, behavior: "smooth" });
    };

    if (layout === "scroll") {
        return (
            <div className="relative group/slider">
                {/* Left arrow */}
                {canScrollLeft && (
                    <button
                        onClick={() => scrollBy("left")}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-white hover:text-primary transition-all opacity-0 group-hover/slider:opacity-100 -translate-x-1 group-hover/slider:translate-x-0"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}

                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar snap-x snap-mandatory stagger-children"
                >
                    {sortedRestaurants.map((r: any, i: number) => (
                        <div key={r._id} className="min-w-[calc(50vw-24px)] sm:min-w-[200px] md:min-w-[240px] shrink-0 snap-start">
                            <RestaurantCard
                                restaurant={r}
                                userCitySlug={userCitySlug}
                                priority={i < 4}
                            />
                        </div>
                    ))}
                </div>

                {/* Right arrow */}
                {canScrollRight && (
                    <button
                        onClick={() => scrollBy("right")}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-white hover:text-primary transition-all opacity-0 group-hover/slider:opacity-100 translate-x-1 group-hover/slider:translate-x-0"
                        aria-label="Scroll right"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}

                {/* Scroll indicator dots (mobile) */}
                <div className="flex justify-center gap-1 mt-2 sm:hidden">
                    <div className={`w-6 h-0.5 rounded-full transition-colors ${!canScrollLeft ? "bg-primary" : "bg-gray-200"}`} />
                    <div className={`w-6 h-0.5 rounded-full transition-colors ${canScrollLeft && canScrollRight ? "bg-primary" : "bg-gray-200"}`} />
                    <div className={`w-6 h-0.5 rounded-full transition-colors ${!canScrollRight ? "bg-primary" : "bg-gray-200"}`} />
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {sortedRestaurants.map((r: any, i: number) => (
                <RestaurantCard
                    key={r._id}
                    restaurant={r}
                    userCitySlug={userCitySlug}
                    priority={i < 4}
                />
            ))}
        </div>
    );
}
