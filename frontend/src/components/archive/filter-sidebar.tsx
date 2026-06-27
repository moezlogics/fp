"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Star, Utensils, MapPin } from "lucide-react";

interface FilterSidebarProps {
    city: string;
    categories?: { _id: string; name: string; slug: string; icon?: string }[];
    areas?: { _id: string; name: string; slug: string }[];
    activeCategory?: string;
    activeArea?: string;
    onFilterChange?: (filters: { sort?: string; rating?: string }) => void;
}

export function FilterSidebar({ city, categories = [], areas = [], activeCategory, activeArea, onFilterChange }: FilterSidebarProps) {
    const [selectedSort, setSelectedSort] = useState("");
    const [selectedRating, setSelectedRating] = useState("");

    const handleApply = useCallback(() => {
        if (!onFilterChange) return;
        onFilterChange({ sort: selectedSort || undefined, rating: selectedRating || undefined });
    }, [selectedSort, selectedRating, onFilterChange]);

    const getCategoryLink = (catSlug: string) => {
        if (activeArea) return `/${city}/${activeArea}/${catSlug}/`;
        return `/${city}/${catSlug}/`;
    };

    const getAreaLink = (areaSlug: string) => {
        if (activeCategory) return `/${city}/${areaSlug}/${activeCategory}/`;
        return `/${city}/${areaSlug}/`;
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm sticky top-20 space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                <span className="text-xs font-bold text-gray-700">Filters</span>
                {(selectedSort || selectedRating || activeCategory || activeArea) && (
                    <Link href={`/${city}`} data-route-type="archive" className="text-[10px] font-bold text-primary hover:underline">Reset</Link>
                )}
            </div>

            {/* Cuisines */}
            {categories.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-bold text-gray-500 mb-2 flex items-center gap-1.5">
                        <Utensils className="w-3 h-3 text-primary" /> Cuisines
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                        <Link href={activeArea ? `/${city}/${activeArea}` : `/${city}`} data-route-type="archive"
                            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${!activeCategory
                                ? "bg-primary text-white border-primary"
                                : "bg-gray-50 text-gray-500 border-gray-200 hover:border-primary/50 hover:text-primary"
                                }`}>
                            All
                        </Link>
                        {categories.map((c) => (
                            <Link key={c._id} href={getCategoryLink(c.slug)} data-route-type="archive"
                                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${activeCategory === c.slug
                                    ? "bg-primary text-white border-primary"
                                    : "bg-gray-50 text-gray-500 border-gray-200 hover:border-primary/50 hover:text-primary"
                                    }`}>
                                {c.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Areas */}
            {areas.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-bold text-gray-500 mb-2 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-primary" /> Areas
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                        <Link href={activeCategory ? `/${city}/${activeCategory}` : `/${city}`} data-route-type="archive"
                            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${!activeArea
                                ? "bg-primary text-white border-primary"
                                : "bg-gray-50 text-gray-500 border-gray-200 hover:border-primary/50 hover:text-primary"
                                }`}>
                            All
                        </Link>
                        {areas.map((a) => (
                            <Link key={a._id} href={getAreaLink(a.slug)} data-route-type="archive"
                                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${activeArea === a.slug
                                    ? "bg-primary text-white border-primary"
                                    : "bg-gray-50 text-gray-500 border-gray-200 hover:border-primary/50 hover:text-primary"
                                    }`}>
                                {a.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Sort */}
            <div>
                <h4 className="text-[11px] font-bold text-gray-500 mb-2">Sort By</h4>
                <div className="space-y-1.5">
                    {["rating", "name", "discount"].map((s) => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer group">
                            <input type="radio" name="sort" value={s} checked={selectedSort === s}
                                onChange={(e) => setSelectedSort(e.target.value)}
                                className="w-3.5 h-3.5 text-primary accent-primary" />
                            <span className={`text-[11px] font-medium capitalize ${selectedSort === s ? "text-gray-900" : "text-gray-400"}`}>{s}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Rating */}
            <div>
                <h4 className="text-[11px] font-bold text-gray-500 mb-2 flex items-center gap-1">
                    <Star className="w-3 h-3 text-primary" /> Min Rating
                </h4>
                <div className="flex gap-1.5">
                    {[4, 3, 2].map((r) => (
                        <button key={r}
                            onClick={() => setSelectedRating(selectedRating === r.toString() ? "" : r.toString())}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${selectedRating === r.toString()
                                ? "bg-primary/5 text-primary-dark border-primary/20"
                                : "bg-gray-50 text-gray-400 border-gray-200 hover:border-primary/30"
                                }`}>
                            {r}+
                        </button>
                    ))}
                </div>
            </div>

            {/* Apply */}
            <button onClick={handleApply}
                className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-gray-800 active:scale-[0.98] transition-all">
                Apply
            </button>
        </div>
    );
}
