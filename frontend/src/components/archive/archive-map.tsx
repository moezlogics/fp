"use client";

import dynamic from "next/dynamic";

// Dynamically import the Leaflet map component with SSR disabled
const ArchiveMapInner = dynamic(
    () => import("./archive-map-inner").then((mod) => mod.ArchiveMap),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center rounded-xl">
                <div className="text-gray-400 text-sm font-semibold flex items-center gap-2">
                    📍 Loading Map...
                </div>
            </div>
        ),
    }
);

interface ArchiveMapProps {
    restaurants: any[];
    city: string;
    userLocation?: { lat: number; lng: number } | null;
    userAvatar?: string | null;
    userName?: string | null;
}

export function ArchiveMap({ restaurants, city, userLocation, userAvatar, userName }: ArchiveMapProps) {
    return (
        <ArchiveMapInner
            restaurants={restaurants}
            city={city}
            userLocation={userLocation}
            userAvatar={userAvatar}
            userName={userName}
        />
    );
}
