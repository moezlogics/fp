"use client";

import { MapPin, Star } from "lucide-react";

export function LocationButton() {
    return (
        <button
            onClick={() => window.dispatchEvent(new Event("scroll-to-location"))}
            aria-label="View location"
            className="size-6 md:size-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 flex items-center justify-center transition-colors shrink-0 ml-auto"
        >
            <MapPin className="w-3 h-3 md:w-4 md:h-4" />
        </button>
    );
}

export function ReviewsButton({ rating, count }: { rating: number; count: number }) {
    return (
        <button
            onClick={() => window.dispatchEvent(new Event("scroll-to-reviews"))}
            className="flex items-center gap-1 hover:text-yellow-600 transition-colors"
        >
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            {rating.toFixed(1)} ({count})
        </button>
    );
}
