"use client";

import { useState, useEffect, useMemo } from "react";
import { RestaurantCard } from "@/components/ui/restaurant-card";
import { ArchiveMapToggle } from "@/components/archive/archive-map-toggle";
import { FilterSidebar } from "@/components/archive/filter-sidebar";
import { MobileArchiveControls } from "@/components/archive/mobile-archive-controls";
import {
    MapPin,
    Navigation,
    AlertCircle,
    Loader2,
    RefreshCw,
    ChevronDown,
    Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Status = "requesting" | "fetching" | "success" | "error" | "denied";

interface NearbyFilters {
    sort?: string;
    rating?: string;
    cuisine?: string;
}

export function NearbyPageContent() {
    const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<Status>("requesting");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [filters, setFilters] = useState<NearbyFilters>({});
    const [visibleCount, setVisibleCount] = useState(12);
    const [userCity, setUserCity] = useState("nearby");

    // ── Geolocation ──
    const getPosition = () => {
        setStatus("requesting");
        setErrorMsg(null);

        if (!navigator.geolocation) {
            setStatus("error");
            setErrorMsg("Geolocation is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                sessionStorage.setItem("fp_lat", String(latitude));
                sessionStorage.setItem("fp_lng", String(longitude));
                fetchData(latitude, longitude);
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                    setStatus("denied");
                } else {
                    setStatus("error");
                    setErrorMsg(
                        "We couldn't determine your location. Please try again."
                    );
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // ── Fetch nearby restaurants + categories in parallel ──
    const fetchData = async (lat: number, lng: number) => {
        setStatus("fetching");
        setLoading(true);
        try {
            const [restaurantRes, catRes] = await Promise.all([
                fetch(
                    `/api/restaurants/nearby?lat=${lat}&lng=${lng}&limit=50&maxDistance=15000`
                ),
                fetch("/api/categories"),
            ]);

            if (!restaurantRes.ok) throw new Error("Failed to fetch restaurants");

            const restaurantData = await restaurantRes.json();
            const catData = await catRes.json();

            const restaurants = Array.isArray(restaurantData)
                ? restaurantData
                : restaurantData?.data || [];

            setAllRestaurants(restaurants);
            setCategories(
                Array.isArray(catData?.data) ? catData.data : Array.isArray(catData) ? catData : []
            );

            // Try to detect city from first restaurant
            if (restaurants.length > 0) {
                const firstCity = restaurants[0]?.city || restaurants[0]?.citySlug;
                if (firstCity) setUserCity(firstCity.toLowerCase());
            }

            setStatus("success");
        } catch {
            setStatus("error");
            setErrorMsg(
                "Failed to load nearby restaurants. Please check your connection."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getPosition();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Client-side filtering & sorting ──
    const filteredRestaurants = useMemo(() => {
        let result = [...allRestaurants];

        // Filter by cuisine/category
        if (filters.cuisine) {
            result = result.filter((r) => {
                const cuisines: string[] = r.cuisines || [];
                const catSlug = r.categorySlug || r.category?.slug || "";
                return (
                    cuisines.some(
                        (c) => c.toLowerCase() === filters.cuisine!.toLowerCase()
                    ) || catSlug === filters.cuisine
                );
            });
        }

        // Filter by minimum rating
        if (filters.rating) {
            const minRating = parseFloat(filters.rating);
            result = result.filter(
                (r) => (r.averageRating || 0) >= minRating
            );
        }

        // Sort
        if (filters.sort === "rating") {
            result.sort(
                (a, b) => (b.averageRating || 0) - (a.averageRating || 0)
            );
        } else if (filters.sort === "name") {
            result.sort((a, b) =>
                (a.name || "").localeCompare(b.name || "")
            );
        } else if (filters.sort === "discount") {
            result.sort(
                (a, b) =>
                    (b.bookingSettings?.maxDiscountCap || 0) -
                    (a.bookingSettings?.maxDiscountCap || 0)
            );
        }
        // Default: keep distance-based order from API

        return result;
    }, [allRestaurants, filters]);

    const visibleRestaurants = filteredRestaurants.slice(0, visibleCount);
    const hasMore = visibleCount < filteredRestaurants.length;

    const handleFilterChange = (newFilters: {
        sort?: string;
        rating?: string;
    }) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setVisibleCount(12);
    };

    // ── Pre-success states (requesting, denied, error) ──
    if (status === "requesting") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                    <MapPin className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">
                    Finding your location...
                </h1>
                <p className="text-muted-foreground max-w-sm">
                    Please allow location access to find the best restaurants
                    near you.
                </p>
            </div>
        );
    }

    if (status === "denied") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">
                        Location Access Denied
                    </h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        We need your location to show restaurants near you.
                        Please enable location permissions in your browser
                        settings or select a city manually.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button
                        onClick={getPosition}
                        variant="outline"
                        className="font-bold"
                    >
                        Try Again
                    </Button>
                    <Link href="/">
                        <Button className="font-bold">Go to Homepage</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center">
                    <Info className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">
                        Something went wrong
                    </h1>
                    <p className="text-muted-foreground">{errorMsg}</p>
                </div>
                <Button onClick={getPosition} className="font-bold">
                    Retry
                </Button>
            </div>
        );
    }

    // ── Fetching state (skeleton) ──
    if (status === "fetching") {
        return (
            <div className="bg-gray-50 min-h-screen pb-20">
                {/* Skeleton Map */}
                <div className="w-full h-[180px] md:h-[220px] bg-gray-200 animate-pulse hidden lg:block" />

                <div className="max-w-7xl mx-auto px-2.5 md:px-4 pt-4 pb-2">
                    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse mb-1" />
                    <div className="h-4 bg-gray-100 rounded w-32 animate-pulse" />
                </div>

                <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-3 flex gap-4">
                    {/* Skeleton Sidebar */}
                    <aside className="w-[220px] hidden lg:block flex-shrink-0">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-6 bg-gray-100 rounded animate-pulse"
                                />
                            ))}
                        </div>
                    </aside>

                    {/* Skeleton Grid */}
                    <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl border bg-card overflow-hidden animate-pulse"
                                >
                                    <div className="aspect-[4/3] bg-gray-200" />
                                    <div className="p-4 space-y-3">
                                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Success: Full Archive Layout ──
    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* ── Map Banner (full-width at top) ── */}
            <ArchiveMapToggle
                restaurants={JSON.parse(JSON.stringify(visibleRestaurants))}
                city={userCity}
            />

            {/* ── Title + Mobile Controls ── */}
            <div className="max-w-7xl mx-auto px-2.5 md:px-4 pt-4 pb-2">
                <nav className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 flex-wrap">
                    <Link href="/" className="hover:text-primary">
                        Home
                    </Link>
                    <span>/</span>
                    <span className="text-gray-600 font-medium">Near Me</span>
                </nav>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-primary fill-primary" />
                            Restaurants Near You
                        </h1>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                            {filteredRestaurants.length} places found
                            {filters.cuisine || filters.rating
                                ? " after filters"
                                : ""}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={getPosition}
                            variant="ghost"
                            size="sm"
                            className="text-primary font-bold hover:bg-primary/5 gap-1.5 text-xs"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <RefreshCw className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>
                        <MobileArchiveControls
                            city={userCity}
                            categories={JSON.parse(
                                JSON.stringify(categories)
                            )}
                            areas={[]}
                            restaurants={JSON.parse(
                                JSON.stringify(visibleRestaurants)
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* ── Content: Sidebar + Grid ── */}
            <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-3 flex gap-4">
                {/* Filter Sidebar (desktop) */}
                <aside className="w-[220px] hidden lg:block flex-shrink-0">
                    <FilterSidebar
                        city={userCity}
                        categories={JSON.parse(JSON.stringify(categories))}
                        areas={[]}
                        onFilterChange={handleFilterChange}
                    />

                    {/* Distance Info */}
                    <div className="mt-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[11px] font-bold text-gray-700">
                                Search Radius
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            Showing restaurants within 15km of your current
                            location, sorted by distance.
                        </p>
                    </div>
                </aside>

                {/* Restaurant Grid */}
                <div className="flex-1 min-w-0">
                    {filteredRestaurants.length === 0 ? (
                        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                            <p className="text-4xl mb-3">🍽️</p>
                            <h2 className="text-xl font-bold text-gray-700">
                                {filters.cuisine || filters.rating
                                    ? "No restaurants match your filters"
                                    : "No restaurants found nearby"}
                            </h2>
                            <p className="text-gray-500 mt-2">
                                {filters.cuisine || filters.rating
                                    ? "Try adjusting your filters to see more results."
                                    : "We haven't launched in this neighborhood yet. Try a major city!"}
                            </p>
                            {(filters.cuisine || filters.rating) && (
                                <Button
                                    onClick={() => {
                                        setFilters({});
                                        setVisibleCount(12);
                                    }}
                                    variant="outline"
                                    className="mt-4 font-bold"
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                            {visibleRestaurants.map((r: any) => (
                                <RestaurantCard
                                    key={r._id?.toString()}
                                    restaurant={r}
                                    userCitySlug={
                                        r.citySlug ||
                                        r.city?.toLowerCase() ||
                                        userCity
                                    }
                                />
                            ))}
                        </div>
                    )}

                    {/* Load More */}
                    {hasMore && (
                        <div className="flex justify-center mt-6">
                            <button
                                onClick={() =>
                                    setVisibleCount((prev) => prev + 12)
                                }
                                className="bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm font-bold hover:border-primary hover:text-primary hover:shadow-lg hover:shadow-primary/10 active:scale-[0.97] transition-all flex items-center gap-2"
                            >
                                <ChevronDown className="w-4 h-4" /> Load More
                            </button>
                        </div>
                    )}

                    <p className="text-center text-xs text-gray-400 font-medium mt-3">
                        Showing {visibleRestaurants.length} of{" "}
                        {filteredRestaurants.length} restaurants
                    </p>
                </div>
            </div>
        </div>
    );
}
