"use client";

import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Tag, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AutocompleteResult {
    restaurants: any[];
    categories: any[];
    areas: any[];
}

/**
 * SearchDropdown — Fuse.js powered instant search
 * - Uses fuzzy autocomplete endpoint (typo-tolerant)
 * - Reads city from cookie for proper navigation
 * - Shows restaurant images for richer UX
 */
export function SearchDropdown() {
    const [query, setQuery] = useState("");
    const [data, setData] = useState<AutocompleteResult>({ restaurants: [], categories: [], areas: [] });
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const timer = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    // Get user's selected city from cookie
    function getUserCity(): string {
        if (typeof document === "undefined") return "lahore";
        const match = document.cookie.match(/foodies_city=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : "lahore";
    }

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleSearch = (q: string) => {
        setQuery(q);
        if (q.length < 2) { setData({ restaurants: [], categories: [], areas: [] }); setOpen(false); return; }
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(q)}`);
                const result = await res.json();
                setData(result);
                setOpen(true);
            } catch { }
            setLoading(false);
        }, 250);
    };

    const navigateTo = (path: string) => {
        setOpen(false);
        setQuery("");
        router.push(path);
    };

    const city = getUserCity();

    const hasResults = data.restaurants?.length > 0 || data.categories?.length > 0 || data.areas?.length > 0;

    return (
        <div ref={ref} className="relative w-full max-w-md">
            <form onSubmit={(e) => {
                e.preventDefault();
                if (query.trim().length >= 2) {
                    setOpen(false);
                    router.push(`/${city}?q=${encodeURIComponent(query.trim())}`);
                }
            }} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => hasResults && setOpen(true)}
                    placeholder="Search restaurants, cuisines, areas..."
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-100 border-0 rounded-full text-sm placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none transition"
                />
            </form>

            {open && hasResults && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border z-50 max-h-96 overflow-y-auto">
                    {/* Restaurants */}
                    {data.restaurants?.length > 0 && (
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
                                Restaurants
                            </div>
                            {data.restaurants.map((r: any) => (
                                <button
                                    key={r._id || r.slug}
                                    onClick={() => navigateTo(`/${(r.city || 'pk').toLowerCase()}/${r.slug}/`)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition"
                                >
                                    {/* Restaurant image */}
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                        {(r.coverImage || r.logo) ? (
                                            <img
                                                src={r.coverImage || r.logo}
                                                alt={r.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1">
                                            {r.name}
                                            {(r.isVerifiedPartner || r.isFeatured) && (
                                                <img
                                                    src="https://cdn.foodiespakistan.pk/uploads/upload-1775250025462-1775250025510.webp"
                                                    alt="Verified"
                                                    width={13}
                                                    height={13}
                                                    className="inline-block shrink-0 object-contain"
                                                    draggable={false}
                                                />
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {r.area}{r.city ? `, ${r.city}` : ""}
                                            {r.averageRating ? ` · ⭐ ${r.averageRating.toFixed(1)}` : ""}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Categories */}
                    {data.categories?.length > 0 && (
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
                                Cuisines
                            </div>
                            {data.categories.map((c: any) => (
                                <button
                                    key={c._id || c.slug}
                                    onClick={() => navigateTo(`/${city}/${c.slug}/`)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                                        <Tag className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{c.name}</p>
                                        <p className="text-xs text-gray-400">View in {city}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Areas */}
                    {data.areas?.length > 0 && (
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
                                Areas
                            </div>
                            {data.areas.map((a: any) => (
                                <button
                                    key={a._id || a.slug}
                                    onClick={() => navigateTo(`/${a.citySlug || city}/${a.slug}/`)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-secondary/5 flex items-center justify-center shrink-0">
                                        <MapPin className="w-4 h-4 text-secondary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{a.name}</p>
                                        <p className="text-xs text-gray-400">{a.citySlug || city}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {open && loading && !hasResults && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border z-50 p-4 text-center text-sm text-gray-400">
                    Searching...
                </div>
            )}

            {open && !loading && query.length >= 2 && !hasResults && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border z-50 p-4 text-center text-sm text-gray-400">
                    No results for &quot;{query}&quot;
                </div>
            )}
        </div>
    );
}
