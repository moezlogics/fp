"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/* ── City center fallbacks ── */
const cityCoordinates: Record<string, [number, number]> = {
    lahore: [31.5204, 74.3587],
    karachi: [24.8607, 67.0011],
    islamabad: [33.6844, 73.0479],
    rawalpindi: [33.5973, 73.0479],
    faisalabad: [31.4504, 73.135],
    multan: [30.1575, 71.5249],
};

/* ── Map tile providers ── */
const MAP_TILES: Record<string, { url: string; attr: string; label: string; icon: string }> = {
    street: {
        url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        attr: '&copy; Google Maps',
        label: "Street", icon: "🗺️",
    },
    dark: {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attr: '&copy; OpenStreetMap contributors',
        label: "Dark", icon: "🌙",
    },
    satellite: {
        url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        attr: '&copy; Google Maps',
        label: "Satellite", icon: "🛰️",
    },
};

/* ── Utility: Haversine distance (km) ── */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Utility: Format distance ── */
function fmtDist(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
}

/* ── Utility: Estimate travel time ── */
function travelTime(km: number): { walk: string; drive: string } {
    const walkMin = Math.round(km / 0.08);
    const driveMin = Math.round(km / 0.5);
    return {
        walk: walkMin < 60 ? `${walkMin} min walk` : `${Math.round(walkMin / 60)}h ${walkMin % 60}m walk`,
        drive: driveMin < 1 ? "1 min drive" : driveMin < 60 ? `${driveMin} min drive` : `${Math.round(driveMin / 60)}h drive`,
    };
}

/* ── Utility: Is restaurant open right now? ── */
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function isOpenNow(openingHours?: any[]): { isOpen: boolean; label: string } {
    if (!openingHours || openingHours.length === 0) return { isOpen: true, label: "Hours N/A" };
    const now = new Date();
    const dayName = DAYS[now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const todayHours = openingHours.find((h: any) => h.day === dayName);
    if (!todayHours) return { isOpen: true, label: "Hours N/A" };
    if (todayHours.isClosed) return { isOpen: false, label: "Closed today" };
    if (currentTime >= todayHours.open && currentTime <= todayHours.close) {
        return { isOpen: true, label: `Open · Closes ${todayHours.close}` };
    }
    if (currentTime < todayHours.open) return { isOpen: false, label: `Opens ${todayHours.open}` };
    return { isOpen: false, label: `Closed · Opens tomorrow` };
}

/* ────────────────────────────────────────────────────────────
 * Custom Icons
 * ──────────────────────────────────────────────────────────── */

function createUserIcon(avatarUrl?: string): L.DivIcon {
    const hasImage = !!avatarUrl;
    return L.divIcon({
        className: "fp-user-pin",
        html: `<div style="position:relative;width:52px;height:62px;">
            <div style="width:48px;height:48px;border-radius:50%;border:3px solid #e8323b;
                box-shadow:0 4px 14px rgba(232, 50, 59,0.4),0 0 0 4px rgba(232, 50, 59,0.12);
                background:${hasImage ? `url('${avatarUrl}') center/cover no-repeat` : "linear-gradient(135deg,#e8323b,#cc2830)"};
                display:flex;align-items:center;justify-content:center;overflow:hidden;">
                ${!hasImage ? `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` : ""}
            </div>
            <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;
                border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #e8323b;"></div>
            <div style="position:absolute;top:0;right:0;width:14px;height:14px;background:#22c55e;
                border-radius:50%;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>
        </div>`,
        iconSize: [52, 62],
        iconAnchor: [26, 62],
        popupAnchor: [0, -54],
    });
}

function createRestaurantIcon(r: any, distKm: number | null, openStatus: { isOpen: boolean; label: string }): L.DivIcon {
    const logo = r.logo || r.coverImage;
    const hasLogo = !!logo;
    const distLabel = distKm !== null ? fmtDist(distKm) : "";
    const openDot = openStatus.isOpen
        ? `<div style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:#22c55e;border-radius:50%;border:2px solid white;box-shadow:0 0 4px #22c55e80;"></div>`
        : `<div style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:#ef4444;border-radius:50%;border:2px solid white;box-shadow:0 0 4px #ef444480;"></div>`;

    return L.divIcon({
        className: "fp-restaurant-pin",
        html: `<div style="position:relative;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;">
            <div style="position:relative;width:42px;height:42px;border-radius:50%;
                border:2.5px solid white;
                box-shadow:0 3px 16px rgba(0,0,0,0.18),0 1px 4px rgba(0,0,0,0.08);
                background:${hasLogo ? `url('${logo}') center/cover no-repeat` : "linear-gradient(135deg,#e8323b,#cc2830)"};
                overflow:hidden;transition:all 0.25s ease;">
                ${!hasLogo ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>
                </div>` : ""}
                ${openDot}
            </div>
            ${distLabel ? `<div style="background:white;border-radius:6px;padding:1px 6px;
                font-size:9px;font-weight:800;color:#374151;letter-spacing:-0.2px;
                box-shadow:0 1px 6px rgba(0,0,0,0.12);white-space:nowrap;
                border:1px solid rgba(0,0,0,0.06);">${distLabel}</div>` : ""}
            <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;
                border-top:6px solid white;margin-top:-2px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.1));"></div>
        </div>`,
        iconSize: [56, distLabel ? 68 : 52],
        iconAnchor: [28, distLabel ? 68 : 52],
        popupAnchor: [0, distLabel ? -60 : -44],
    });
}

/* ── Map Controls ── */
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => { map.setView(center, zoom); }, [center, zoom, map]);
    return null;
}

function RecenterButton({ userLat, userLng }: { userLat: number; userLng: number }) {
    const map = useMap();
    return (
        <button
            onClick={() => map.flyTo([userLat, userLng], 15, { duration: 1.2 })}
            className="absolute bottom-8 right-4 z-[1000] w-12 h-12 rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] flex items-center justify-center text-gray-900 hover:text-primary hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 border-2 border-gray-100"
            title="Recenter on my location"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></svg>
        </button>
    );
}

/* ────────────────────────────────────────────────────────────
 * Settings Panel Component
 * ──────────────────────────────────────────────────────────── */
interface SettingsPanelProps {
    mapStyle: string;
    setMapStyle: (s: any) => void;
    showOpenOnly: boolean;
    setShowOpenOnly: (v: boolean) => void;
    radiusKm: number;
    setRadiusKm: (v: number) => void;
    hasLocation: boolean;
    minRating: number;
    setMinRating: (v: number) => void;
    hasDeals: boolean;
    setHasDeals: (v: boolean) => void;
    cuisineFilter: string;
    setCuisineFilter: (v: string) => void;
    allCuisines: string[];
    onFindMe: () => void;
    onClose: () => void;
}

function SettingsPanel({
    mapStyle, setMapStyle, showOpenOnly, setShowOpenOnly,
    radiusKm, setRadiusKm, hasLocation,
    minRating, setMinRating, hasDeals, setHasDeals,
    cuisineFilter, setCuisineFilter, allCuisines,
    onFindMe, onClose,
}: SettingsPanelProps) {
    return (
        <div className="absolute top-4 left-4 z-[1001] w-[280px] max-h-[calc(100%-32px)] overflow-y-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/15 border border-gray-100 animate-in slide-in-from-left-2 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e8323b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                    </div>
                    <span className="text-sm font-black text-gray-900">Map Settings</span>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>

            <div className="p-4 space-y-4">
                {/* ── Map Style ── */}
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Map Style</p>
                    <div className="grid grid-cols-3 gap-1.5">
                        {(Object.keys(MAP_TILES) as string[]).map(key => (
                            <button key={key} onClick={() => setMapStyle(key)}
                                className={`px-2 py-2 rounded-xl text-[10px] font-bold transition-all text-center ${mapStyle === key ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                <span className="block text-sm mb-0.5">{MAP_TILES[key].icon}</span>
                                {MAP_TILES[key].label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Quick Filters ── */}
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Quick Filters</p>
                    <div className="space-y-2">
                        {/* Open Now */}
                        <button onClick={() => setShowOpenOnly(!showOpenOnly)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${showOpenOnly ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100'}`}>
                            <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${showOpenOnly ? 'bg-green-500' : 'bg-gray-300'}`} />
                                Open Now Only
                            </span>
                            {showOpenOnly && <span className="text-green-500 text-[10px]">✓</span>}
                        </button>

                        {/* Has Deals */}
                        <button onClick={() => setHasDeals(!hasDeals)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${hasDeals ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100'}`}>
                            <span className="flex items-center gap-2">
                                <span className="text-sm">🏷️</span>
                                With Deals Only
                            </span>
                            {hasDeals && <span className="text-amber-500 text-[10px]">✓</span>}
                        </button>
                    </div>
                </div>

                {/* ── Rating Filter ── */}
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Min Rating</p>
                    <div className="flex gap-1.5">
                        {[0, 3, 3.5, 4, 4.5].map(r => (
                            <button key={r} onClick={() => setMinRating(r)}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${minRating === r ? 'bg-primary text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                {r === 0 ? "All" : `${r}+`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Radius ── */}
                {hasLocation && (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nearby Radius</p>
                            <span className="text-[10px] font-bold text-primary">{radiusKm > 0 ? `${radiusKm} km` : "Off"}</span>
                        </div>
                        <input type="range" min={0} max={20} step={1} value={radiusKm}
                            onChange={e => setRadiusKm(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                        <div className="flex justify-between text-[8px] text-gray-400 font-medium mt-1">
                            <span>Off</span><span>5km</span><span>10km</span><span>20km</span>
                        </div>
                    </div>
                )}

                {/* ── Cuisine Filter ── */}
                {allCuisines.length > 0 && (
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Cuisine</p>
                        <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                            <button onClick={() => setCuisineFilter("")}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${!cuisineFilter ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                All
                            </button>
                            {allCuisines.slice(0, 12).map(c => (
                                <button key={c} onClick={() => setCuisineFilter(cuisineFilter === c ? "" : c)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${cuisineFilter === c ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Find Me Button ── */}
                {hasLocation && (
                    <button onClick={onFindMe}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black shadow-md transition active:scale-[0.98] mt-2 border border-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></svg>
                        Find My Location
                    </button>
                )}
            </div>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────
 * Main Component
 * ──────────────────────────────────────────────────────────── */
interface ArchiveMapProps {
    restaurants: any[];
    city: string;
    userLocation?: { lat: number; lng: number } | null;
    userAvatar?: string | null;
    userName?: string | null;
}

export function ArchiveMap({ restaurants, city, userLocation, userAvatar, userName }: ArchiveMapProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [livePos, setLivePos] = useState<{ lat: number; lng: number } | null>(userLocation || null);
    const [mapStyle, setMapStyle] = useState<"street" | "dark" | "satellite">("street");
    const [radiusKm, setRadiusKm] = useState<number>(0);
    const [showOpenOnly, setShowOpenOnly] = useState(false);
    const [selfAvatar, setSelfAvatar] = useState<string | null>(userAvatar || null);
    const [selfName, setSelfName] = useState<string | null>(userName || null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [minRating, setMinRating] = useState(0);
    const [hasDeals, setHasDeals] = useState(false);
    const [cuisineFilter, setCuisineFilter] = useState("");
    const watchRef = useRef<number | null>(null);
    const mapRef = useRef<any>(null);

    const cityCenter: [number, number] = cityCoordinates[city.toLowerCase()] || [31.5204, 74.3587];

    // Auto-fetch user profile picture
    useEffect(() => {
        if (userAvatar) return;
        const hasSession = document.cookie.includes("authjs.session-token") ||
            document.cookie.includes("__Secure-authjs.session-token") ||
            document.cookie.includes("next-auth.session-token") ||
            document.cookie.includes("__Secure-next-auth.session-token");
        if (!hasSession) return;

        fetch("/api/users/profile")
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.data?.profilePicture) setSelfAvatar(data.data.profilePicture);
                else if (data?.profilePicture) setSelfAvatar(data.profilePicture);
                if (data?.data?.name) setSelfName(data.data.name);
                else if (data?.name) setSelfName(data.name);
            })
            .catch(() => { });
    }, [userAvatar]);

    useEffect(() => {
        setIsMounted(true);
        if (!userLocation) {
            const lat = sessionStorage.getItem("fp_lat") || localStorage.getItem("fp_lat");
            const lng = sessionStorage.getItem("fp_lng") || localStorage.getItem("fp_lng");
            if (lat && lng) setLivePos({ lat: parseFloat(lat), lng: parseFloat(lng) });
        }
        if (navigator.geolocation) {
            watchRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setLivePos({ lat: latitude, lng: longitude });
                    sessionStorage.setItem("fp_lat", String(latitude));
                    sessionStorage.setItem("fp_lng", String(longitude));
                },
                () => { },
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
            );
        }
        return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); };
    }, [userLocation]);

    // Collect all cuisines for filter
    const allCuisines = useMemo(() => {
        const set = new Set<string>();
        restaurants.forEach(r => (r.cuisines || []).forEach((c: string) => set.add(c)));
        return Array.from(set).sort();
    }, [restaurants]);

    // Compute distances + open status + filter + sort
    const processedRestaurants = useMemo(() => {
        const withMeta = restaurants
            .filter(r => r.location?.coordinates?.length === 2)
            .map(r => {
                const rLat = r.location.coordinates[1];
                const rLng = r.location.coordinates[0];
                const dist = livePos ? haversineKm(livePos.lat, livePos.lng, rLat, rLng) : null;
                const openStatus = isOpenNow(r.openingHours);
                return { ...r, _dist: dist, _open: openStatus, _lat: rLat, _lng: rLng };
            });

        let filtered = withMeta;
        if (showOpenOnly) filtered = filtered.filter(r => r._open.isOpen);
        if (radiusKm > 0 && livePos) filtered = filtered.filter(r => r._dist !== null && r._dist <= radiusKm);
        if (minRating > 0) filtered = filtered.filter(r => (r.averageRating || 0) >= minRating);
        if (hasDeals) filtered = filtered.filter(r => r.discountLabel || r.maxDiscountPercent > 0 || (r.deals && r.deals.length > 0));
        if (cuisineFilter) filtered = filtered.filter(r => (r.cuisines || []).some((c: string) => c.toLowerCase() === cuisineFilter.toLowerCase()));

        if (livePos) filtered.sort((a, b) => (a._dist ?? 999) - (b._dist ?? 999));

        return filtered;
    }, [restaurants, livePos, showOpenOnly, radiusKm, minRating, hasDeals, cuisineFilter]);

    // Count active filters
    const activeFilterCount = [showOpenOnly, hasDeals, minRating > 0, cuisineFilter, radiusKm > 0].filter(Boolean).length;

    if (!isMounted) return <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center rounded-xl"><span className="text-gray-400 text-sm font-semibold">📍 Loading Map...</span></div>;

    const tile = MAP_TILES[mapStyle];
    const userIcon = createUserIcon(selfAvatar || userAvatar || undefined);

    const handleFindMe = () => {
        if (livePos && mapRef.current) {
            mapRef.current.flyTo([livePos.lat, livePos.lng], 15, { duration: 1.2 });
        }
        setSettingsOpen(false);
    };

    // Helper to get clean display name
    const getDisplayName = (r: any) => {
        const brand = r.brandName || r.name;
        const branch = r.branchName && r.branchName !== "Main Branch"
            ? r.branchName.replace(/\s*branch\s*/gi, "").trim()
            : "";
        return branch ? `${brand} — ${branch}` : brand;
    };

    return (
        <div className="w-full h-full relative z-0">
            {/* ── Global Leaflet Popup Styles ── */}
            <style>{`
                .fp-restaurant-pin,.fp-user-pin{background:none!important;border:none!important}
                .fp-restaurant-pin:hover>div>div:first-child{transform:scale(1.15);box-shadow:0 6px 24px rgba(0,0,0,0.25)!important}
                .leaflet-popup-content-wrapper{border-radius:20px!important;padding:0!important;overflow:hidden!important;box-shadow:0 10px 40px rgba(0,0,0,0.18)!important;border:1px solid rgba(0,0,0,0.06)!important}
                .leaflet-popup-content{margin:0!important;width:260px!important;max-width:calc(100vw - 80px)!important}
                .leaflet-popup-tip{display:none!important}
                .leaflet-popup-close-button{top:6px!important;right:6px!important;width:24px!important;height:24px!important;background:rgba(255,255,255,0.95)!important;backdrop-filter:blur(4px)!important;border-radius:50%!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:14px!important;color:#374151!important;box-shadow:0 2px 8px rgba(0,0,0,0.12)!important;z-index:10!important}
                @keyframes slideInFromLeft{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
                .animate-in{animation:slideInFromLeft 0.25s ease-out}
            `}</style>

            {/* ── Settings Toggle Button ── */}
            <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`absolute top-4 left-4 z-[1002] w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.18)] border-2 ${settingsOpen
                    ? 'bg-primary text-white border-primary/20 scale-95'
                    : 'bg-gray-900 text-white hover:bg-gray-800 border-gray-700/50 hover:scale-105'
                    }`}
                title="Map Settings"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" /><circle cx="12" cy="12" r="3" />
                </svg>
                {/* Active filter badge */}
                {activeFilterCount > 0 && !settingsOpen && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center border-2 border-gray-900 shadow-sm">
                        {activeFilterCount}
                    </div>
                )}
            </button>

            {/* ── Settings Panel ── */}
            {settingsOpen && (
                <SettingsPanel
                    mapStyle={mapStyle} setMapStyle={setMapStyle}
                    showOpenOnly={showOpenOnly} setShowOpenOnly={setShowOpenOnly}
                    radiusKm={radiusKm} setRadiusKm={setRadiusKm}
                    hasLocation={!!livePos}
                    minRating={minRating} setMinRating={setMinRating}
                    hasDeals={hasDeals} setHasDeals={setHasDeals}
                    cuisineFilter={cuisineFilter} setCuisineFilter={setCuisineFilter}
                    allCuisines={allCuisines}
                    onFindMe={handleFindMe}
                    onClose={() => setSettingsOpen(false)}
                />
            )}

            {/* ── Restaurant Count Badge ── */}
            <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl px-4 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.15)] border-2 border-gray-100/80 text-sm font-black text-gray-900 pointer-events-auto flex items-center gap-2 h-12">
                🍽️ {processedRestaurants.length} <span className="hidden sm:inline">Places</span>
            </div>

            {/* ── Leaflet Map ── */}
            <MapContainer center={cityCenter} zoom={12} className="w-full h-full" zoomControl={false}
                ref={mapRef as any}>
                <TileLayer attribution={tile.attr} url={tile.url} key={mapStyle} />
                <ChangeView center={cityCenter} zoom={12} />

                {livePos && <RecenterButton userLat={livePos.lat} userLng={livePos.lng} />}

                {/* Radius circle */}
                {livePos && radiusKm > 0 && (
                    <Circle
                        center={[livePos.lat, livePos.lng]}
                        radius={radiusKm * 1000}
                        pathOptions={{
                            color: "#e8323b", weight: 2, opacity: 0.4,
                            fillColor: "#e8323b", fillOpacity: 0.06,
                            dashArray: "8 6",
                        }}
                    />
                )}

                {/* ── User Pin ── */}
                {livePos && (
                    <Marker position={[livePos.lat, livePos.lng]} icon={userIcon} zIndexOffset={1000}>
                        <Popup>
                            <div style={{ padding: 16, textAlign: "center" }}>
                                <div style={{ fontSize: 24, marginBottom: 4 }}>📍</div>
                                <p style={{ fontWeight: 900, fontSize: 13, color: "#111827", margin: 0 }}>
                                    {selfName || userName || "You are here"}
                                </p>
                                <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                                    Live location · updates as you move
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* ── Restaurant Markers ── */}
                {processedRestaurants.map(r => {
                    const travel = r._dist !== null ? travelTime(r._dist) : null;
                    const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${r._lat},${r._lng}`;
                    const displayName = getDisplayName(r);

                    return (
                        <Marker
                            key={r._id}
                            position={[r._lat, r._lng] as [number, number]}
                            icon={createRestaurantIcon(r, r._dist, r._open)}
                        >
                            <Popup>
                                <div>
                                    {/* Cover Image */}
                                    <a href={`/${(r.city || 'pk').toLowerCase()}/${r.slug}/`} data-route-type="restaurant"
                                        style={{ display: "block", position: "relative", height: 130, overflow: "hidden" }}>
                                        <img src={r.coverImage || r.logo || "/placeholder.jpg"} alt={r.name}
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="eager" />
                                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.6),transparent 60%)" }} />

                                        {/* Rating badge */}
                                        {(r.averageRating || 0) > 0 && (
                                            <div style={{
                                                position: "absolute", top: 8, right: 8,
                                                background: r.averageRating >= 4 ? "#16a34a" : r.averageRating >= 3 ? "#e8323b" : "#f59e0b",
                                                color: "white", fontSize: 10, fontWeight: 900,
                                                padding: "3px 8px", borderRadius: 8,
                                                display: "flex", alignItems: "center", gap: 3,
                                            }}>
                                                ⭐ {r.averageRating?.toFixed(1)}
                                                {r.totalReviews > 0 && <span style={{ opacity: 0.8, fontSize: 9 }}>({r.totalReviews})</span>}
                                            </div>
                                        )}

                                        {/* Open/Closed badge */}
                                        <div style={{
                                            position: "absolute", bottom: 8, left: 8,
                                            background: r._open.isOpen ? "rgba(22,163,74,0.9)" : "rgba(220,38,38,0.9)",
                                            color: "white",
                                            fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 6,
                                            backdropFilter: "blur(4px)",
                                        }}>
                                            {r._open.isOpen ? "● Open" : "● Closed"} · {r._open.label.replace(/^(Open|Closed)\s*·?\s*/, "")}
                                        </div>

                                        {/* Discount badge */}
                                        {r.discountLabel && (
                                            <div style={{
                                                position: "absolute", top: 8, left: 8,
                                                background: "linear-gradient(135deg,#e8323b,#cc2830)",
                                                color: "white", fontSize: 9, fontWeight: 900,
                                                padding: "3px 8px", borderRadius: 6,
                                            }}>
                                                🏷️ {r.discountLabel} OFF
                                            </div>
                                        )}
                                    </a>

                                    {/* Card body */}
                                    <div style={{ padding: "10px 14px 6px" }}>
                                        <a href={`/${(r.city || 'pk').toLowerCase()}/${r.slug}/`} data-route-type="restaurant"
                                            style={{ textDecoration: "none", color: "inherit" }}>
                                            <h4 style={{
                                                fontWeight: 900, fontSize: 13, color: "#111827", margin: 0,
                                                letterSpacing: -0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                display: "flex", alignItems: "center", gap: 4,
                                            }}>
                                                {displayName}
                                                {(r.isVerifiedPartner || r.isFeatured) && (
                                                    <img
                                                        src="https://cdn.foodiespakistan.pk/uploads/upload-1775250025462-1775250025510.webp"
                                                        alt="Verified"
                                                        width={13}
                                                        height={13}
                                                        style={{ width: 13, height: 13, display: "inline-block", flexShrink: 0, objectFit: "contain" }}
                                                        draggable={false}
                                                    />
                                                )}
                                            </h4>
                                        </a>

                                        {/* Area + Cuisines */}
                                        <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {r.area}{r.city ? ` · ${r.city}` : ""}
                                            {r.cuisines?.[0] ? ` · ${r.cuisines[0]}` : ""}
                                        </p>

                                        {/* Distance + Travel Time */}
                                        {travel && (
                                            <div style={{
                                                display: "flex", gap: 6, marginTop: 8,
                                                fontSize: 10, fontWeight: 700, color: "#6b7280",
                                            }}>
                                                <span style={{ background: "#f3f4f6", padding: "3px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}>
                                                    🚶 {travel.walk}
                                                </span>
                                                <span style={{ background: "#f3f4f6", padding: "3px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}>
                                                    🚗 {travel.drive}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer: Navigate + View */}
                                    <div style={{
                                        display: "flex", borderTop: "1px solid #f3f4f6",
                                        marginTop: 4,
                                    }}>
                                        <a href={navUrl} target="_blank" rel="noopener noreferrer"
                                            style={{
                                                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                                                gap: 4, padding: "10px 0", textDecoration: "none",
                                                fontSize: 11, fontWeight: 800, color: "#2563eb",
                                                borderRight: "1px solid #f3f4f6",
                                                transition: "background 0.2s",
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
                                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                        >
                                            🧭 Navigate
                                        </a>
                                        <a href={`/${(r.city || 'pk').toLowerCase()}/${r.slug}/`} data-route-type="restaurant"
                                            style={{
                                                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                                                gap: 4, padding: "10px 0", textDecoration: "none",
                                                fontSize: 11, fontWeight: 800, color: "#e8323b",
                                                transition: "background 0.2s",
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = "#f0f8db")}
                                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                        >
                                            🍽️ View Deals
                                        </a>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
