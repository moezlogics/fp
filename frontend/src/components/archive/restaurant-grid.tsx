"use client";

import { useState, useCallback } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { RestaurantCard } from "@/components/ui/restaurant-card";

interface RestaurantGridProps {
    initialRestaurants: any[];
    totalCount: number;
    city: string;
    activeArea?: string;
    activeCategory?: string;
    pageSize?: number;
    searchQuery?: string;
}

export function RestaurantGrid({
    initialRestaurants,
    totalCount,
    city,
    activeArea,
    activeCategory,
    pageSize = 12,
    searchQuery,
}: RestaurantGridProps) {
    const [restaurants, setRestaurants] = useState<any[]>(initialRestaurants);
    const [page, setPage] = useState(2);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(initialRestaurants.length < totalCount);
    const [sort, setSort] = useState("");
    const [minRating, setMinRating] = useState(0);

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ city, page: String(page), limit: String(pageSize) });
            if (sort) params.set("sort", sort);
            if (minRating > 0) params.set("minRating", String(minRating));
            if (searchQuery) params.set("q", searchQuery);
            if (activeArea) params.set("area", activeArea);
            if (activeCategory) params.set("cuisine", activeCategory);

            const res = await fetch(`/api/restaurants/load-more?${params.toString()}`);
            const data = await res.json();
            if (data.docs && data.docs.length > 0) {
                setRestaurants(prev => [...prev, ...data.docs]);
                setPage(p => p + 1);
                setHasMore(data.hasMore);
            } else {
                setHasMore(false);
            }
        } catch { console.error("Load more failed"); }
        setLoading(false);
    }, [loading, hasMore, page, city, pageSize, sort, minRating]);

    const applyFilter = useCallback(
        async (newSort?: string, newRating?: number) => {
            const s = newSort !== undefined ? newSort : sort;
            const r = newRating !== undefined ? newRating : minRating;
            setSort(s);
            setMinRating(r);
            setLoading(true);
            try {
                const params = new URLSearchParams({ city, page: "1", limit: String(pageSize) });
                if (s) params.set("sort", s);
                if (r > 0) params.set("minRating", String(r));
                if (searchQuery) params.set("q", searchQuery);
                if (activeArea) params.set("area", activeArea);
                if (activeCategory) params.set("cuisine", activeCategory);

                const res = await fetch(`/api/restaurants/load-more?${params.toString()}`);
                const data = await res.json();
                setRestaurants(data.docs || []);
                setPage(2);
                setHasMore(data.hasMore || false);
            } catch { console.error("Filter apply failed"); }
            setLoading(false);
        },
        [city, pageSize, sort, minRating]
    );

    return (
        <div>
            {restaurants.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                    <p className="text-4xl mb-3">🍽️</p>
                    <h2 className="text-xl font-bold text-gray-700">No restaurants found</h2>
                    <p className="text-gray-500 mt-2">Try adjusting your filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {restaurants.map((r: any, index: number) => (
                        <RestaurantCard
                            key={r._id?.toString()}
                            restaurant={r}
                            userCitySlug={city}
                            priority={index === 0}
                        />
                    ))}
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center mt-6">
                    <button onClick={loadMore} disabled={loading}
                        className="bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm font-bold hover:border-primary hover:text-primary hover:shadow-lg hover:shadow-primary/10 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-wait flex items-center gap-2">
                        {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                        ) : (
                            <><ChevronDown className="w-4 h-4" /> Load More</>
                        )}
                    </button>
                </div>
            )}

            <p className="text-center text-xs text-gray-400 font-medium mt-3">
                Showing {restaurants.length} of {totalCount} restaurants
            </p>
        </div>
    );
}

export type FilterHandler = (filters: { sort?: string; rating?: string }) => void;
