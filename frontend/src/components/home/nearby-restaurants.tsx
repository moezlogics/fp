"use client";

import { useState, useEffect } from "react";
import { RestaurantCard } from "@/components/ui/restaurant-card";

/**
 * City center coordinates fallback map.
 * Used when browser geolocation is denied — fetches restaurants near the city center.
 */
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
    lahore: { lat: 31.5204, lng: 74.3587 },
    karachi: { lat: 24.8607, lng: 67.0011 },
    islamabad: { lat: 33.6844, lng: 73.0479 },
    rawalpindi: { lat: 33.5651, lng: 73.0169 },
    faisalabad: { lat: 31.4504, lng: 73.135 },
    multan: { lat: 30.1575, lng: 71.5249 },
    peshawar: { lat: 34.012, lng: 71.5785 },
    quetta: { lat: 30.1798, lng: 66.975 },
    sialkot: { lat: 32.4945, lng: 74.5229 },
    gujranwala: { lat: 32.1877, lng: 74.1945 },
};

type NearbyMode = "exact" | "city-center" | "fallback-lahore";

export function NearbyRestaurants() {
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<NearbyMode>("exact");
    const [fallbackCityName, setFallbackCityName] = useState("Lahore");

    useEffect(() => {
        // 1. Try cached coords first (from previous geolocation grant)
        const cachedLat = sessionStorage.getItem("fp_lat");
        const cachedLng = sessionStorage.getItem("fp_lng");
        if (cachedLat && cachedLng) {
            setMode("exact");
            fetchNearby(parseFloat(cachedLat), parseFloat(cachedLng));
            return;
        }

        // 2. Try browser geolocation
        if (!navigator.geolocation) {
            fallbackToCityCenter();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                sessionStorage.setItem("fp_lat", String(latitude));
                sessionStorage.setItem("fp_lng", String(longitude));
                localStorage.setItem("fp_lat", String(latitude));
                localStorage.setItem("fp_lng", String(longitude));
                setMode("exact");
                fetchNearby(latitude, longitude);
                detectCity(latitude, longitude);
            },
            () => {
                // Geolocation denied → use city center fallback
                fallbackToCityCenter();
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
        );
    }, []);

    const fallbackToCityCenter = () => {
        const match = document.cookie.match(/foodies_city=([^;]+)/);
        const nameMatch = document.cookie.match(/foodies_city_name=([^;]+)/);
        const citySlug = match ? match[1] : "lahore";
        const cityName = nameMatch ? decodeURIComponent(nameMatch[1]) : "Lahore";

        // Check if this city is in our CITY_CENTERS map
        if (CITY_CENTERS[citySlug]) {
            // Known city — show restaurants around city center
            setMode("city-center");
            setFallbackCityName(cityName);
            fetchNearby(CITY_CENTERS[citySlug].lat, CITY_CENTERS[citySlug].lng, 50);
        } else {
            // Unknown city — fallback to Lahore, show "Restaurants in Lahore" (broader radius)
            setMode("fallback-lahore");
            setFallbackCityName("Lahore");
            fetchNearby(CITY_CENTERS.lahore.lat, CITY_CENTERS.lahore.lng, 100);
        }
    };

    const fetchNearby = (lat: number, lng: number, radiusKm?: number) => {
        setLoading(true);
        const url = `/api/restaurants/nearby?lat=${lat}&lng=${lng}&limit=10${radiusKm ? `&radius=${radiusKm}` : ""}`;
        fetch(url)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => { setRestaurants(Array.isArray(data) ? data : []); setError(null); })
            .catch(() => setError("Could not load"))
            .finally(() => setLoading(false));
    };

    const detectCity = async (lat: number, lng: number) => {
        try {
            const res = await fetch(`/api/cities/detect?lat=${lat}&lng=${lng}`);
            const data = await res.json();
            if (data?.slug) {
                document.cookie = `foodies_city=${data.slug};path=/;max-age=${365 * 24 * 60 * 60}`;
                document.cookie = `foodies_city_name=${encodeURIComponent(data.name)};path=/;max-age=${365 * 24 * 60 * 60}`;
            }
        } catch { }
    };

    // ── Section heading based on mode ──
    const getHeading = () => {
        switch (mode) {
            case "exact":
                return { tag: "Near You", title: "Nearby Restaurants" };
            case "city-center":
                return { tag: `Popular in ${fallbackCityName}`, title: `Restaurants in ${fallbackCityName}` };
            case "fallback-lahore":
                return { tag: "Explore", title: `Top Restaurants in ${fallbackCityName}` };
        }
    };

    if (loading) {
        return (
            <section>
                <div className="flex justify-between items-center mb-4">
                    <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
                </div>
                <div className="flex gap-3 overflow-hidden">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="min-w-[200px] rounded-xl overflow-hidden border border-gray-100 bg-white shrink-0 animate-pulse">
                            <div className="h-28 sm:h-32 bg-gray-200" />
                            <div className="p-3 pt-6 space-y-2">
                                <div className="h-3 bg-gray-200 rounded w-3/4" />
                                <div className="h-2 bg-gray-100 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (error || restaurants.length === 0) return null;

    const heading = getHeading();

    return (
        <section>
            <div className="flex justify-between items-end mb-4">
                <div>
                    <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em] mb-1">
                        {heading.tag}
                    </p>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                        {heading.title}
                    </h2>
                </div>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar snap-x snap-mandatory">
                {restaurants.map((r) => (
                    <div key={r._id} className="w-[200px] min-w-[200px] md:w-[240px] md:min-w-[240px] shrink-0 snap-start flex flex-col overflow-hidden">
                        <RestaurantCard restaurant={r} />
                    </div>
                ))}
            </div>
        </section>
    );
}
