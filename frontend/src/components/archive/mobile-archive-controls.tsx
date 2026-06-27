"use client";

import { useState } from "react";
import { Filter, MapPin, X } from "lucide-react";
import { FilterSidebar } from "./filter-sidebar";
import { ArchiveMap } from "./archive-map";

interface MobileArchiveControlsProps {
    city: string;
    categories: any[];
    areas: any[];
    restaurants: any[];
    activeCategory?: string;
    activeArea?: string;
}

export function MobileArchiveControls({
    city,
    categories,
    areas,
    restaurants,
    activeCategory,
    activeArea,
}: MobileArchiveControlsProps) {
    const [showFilters, setShowFilters] = useState(false);
    const [showMap, setShowMap] = useState(false);

    return (
        <>
            {/* Mobile Buttons */}
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

            {/* ── Mobile Filter Drawer (slide-up from bottom) ── */}
            {showFilters && (
                <div className="fixed inset-0 z-[60] lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowFilters(false)}
                    />
                    {/* Drawer */}
                    <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up shadow-2xl">
                        {/* Drag Handle + Header */}
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
                        {/* Filter Content */}
                        <div className="p-4">
                            <FilterSidebar
                                city={city}
                                categories={categories}
                                areas={areas}
                                activeCategory={activeCategory}
                                activeArea={activeArea}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Mobile Map Sheet (slide-up full screen) ── */}
            {showMap && (
                <div className="fixed inset-0 z-[60] lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowMap(false)}
                    />
                    {/* Map Sheet */}
                    <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl h-[85vh] overflow-hidden animate-slide-up shadow-2xl flex flex-col">
                        {/* Header */}
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
                        {/* Map Content */}
                        <div className="flex-1 min-h-0">
                            <ArchiveMap restaurants={restaurants} city={city} />
                        </div>
                    </div>
                </div>
            )}

            {/* CSS Animation */}
            <style jsx global>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </>
    );
}
