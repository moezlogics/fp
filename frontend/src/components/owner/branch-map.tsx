"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface BranchMapProps {
    lat: number;
    lng: number;
    address: string;
    onLocationChange: (lat: number, lng: number, address?: string) => void;
}

// Fix Leaflet default marker icon
const defaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

export default function BranchMap({ lat, lng, address, onLocationChange }: BranchMapProps) {
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const prevAddressRef = useRef(address);
    const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ── Initialize Map ──
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: [lat, lng],
            zoom: 14,
            zoomControl: true,
        });

        L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
            attribution: '&copy; Google Maps',
            maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([lat, lng], {
            icon: defaultIcon,
            draggable: true,
        }).addTo(map);

        // ── Drag end → Reverse geocode ──
        marker.on("dragend", async () => {
            const pos = marker.getLatLng();
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json`
                );
                const data = await res.json();
                const addr = data.display_name || "";
                onLocationChange(pos.lat, pos.lng, addr);
            } catch {
                onLocationChange(pos.lat, pos.lng);
            }
        });

        // ── Click on map → Move pin ──
        map.on("click", async (e: L.LeafletMouseEvent) => {
            marker.setLatLng(e.latlng);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`
                );
                const data = await res.json();
                const addr = data.display_name || "";
                onLocationChange(e.latlng.lat, e.latlng.lng, addr);
            } catch {
                onLocationChange(e.latlng.lat, e.latlng.lng);
            }
        });

        mapRef.current = map;
        markerRef.current = marker;

        // Fix map rendering on resize
        setTimeout(() => map.invalidateSize(), 100);

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
    }, []);

    // ── Geocode address changes (debounced) ──
    useEffect(() => {
        if (!mapRef.current || !markerRef.current) return;
        if (address === prevAddressRef.current) return;
        prevAddressRef.current = address;

        if (!address || address.length < 10) return;

        if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);

        geocodeTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=pk`
                );
                const data = await res.json();
                if (data.length > 0) {
                    const newLat = parseFloat(data[0].lat);
                    const newLng = parseFloat(data[0].lon);
                    markerRef.current?.setLatLng([newLat, newLng]);
                    mapRef.current?.setView([newLat, newLng], 16);
                    onLocationChange(newLat, newLng);
                }
            } catch { }
        }, 1500);
    }, [address]);

    // ── Update marker when lat/lng change externally ──
    useEffect(() => {
        if (!markerRef.current || !mapRef.current) return;
        const currentPos = markerRef.current.getLatLng();
        if (Math.abs(currentPos.lat - lat) > 0.0001 || Math.abs(currentPos.lng - lng) > 0.0001) {
            markerRef.current.setLatLng([lat, lng]);
            mapRef.current.setView([lat, lng], mapRef.current.getZoom());
        }
    }, [lat, lng]);

    // ── Search ──
    const handleSearch = async () => {
        if (!searchQuery.trim() || !mapRef.current || !markerRef.current) return;
        setSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&countrycodes=pk`
            );
            const data = await res.json();
            if (data.length > 0) {
                const newLat = parseFloat(data[0].lat);
                const newLng = parseFloat(data[0].lon);
                markerRef.current.setLatLng([newLat, newLng]);
                mapRef.current.setView([newLat, newLng], 16);
                onLocationChange(newLat, newLng, data[0].display_name || searchQuery);
            }
        } catch { }
        setSearching(false);
    };

    return (
        <div className="relative w-full h-full">
            {/* Search bar overlay */}
            <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2">
                <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="Search location in Pakistan..."
                    className="flex-1 bg-white shadow-lg rounded-xl px-4 py-2.5 text-sm border border-gray-200 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching}
                    className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-primary-dark transition disabled:opacity-50 shrink-0"
                >
                    {searching ? "..." : "Search"}
                </button>
            </div>

            {/* Map Container */}
            <div ref={containerRef} className="w-full h-full" />

            {/* Coordinates Display */}
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[10px] font-mono text-gray-600 z-[1000] shadow">
                {lat.toFixed(6)}, {lng.toFixed(6)}
            </div>
        </div>
    );
}
