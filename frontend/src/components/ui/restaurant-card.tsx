"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star, Crown, Tag } from "lucide-react";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useSession } from "next-auth/react";
import { getOpenStatus } from "@/lib/get-open-status";
import { useAuthModal } from "@/components/auth/auth-modal";
import { blurDataUrl } from "@/lib/blur-data-url";

// ── Haversine distance (km) ──
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface RestaurantCardProps {
    restaurant: any;
    /** Compact mode for similar restaurants sections */
    compact?: boolean;
    /** User's city slug to compare for distance display */
    userCitySlug?: string;
    /** Whether this image is above the fold and should load immediately */
    priority?: boolean;
}

export function RestaurantCard({ restaurant: r, compact = false, userCitySlug, priority = false }: RestaurantCardProps) {
    const { data: session } = useSession();
    const { openAuthModal } = useAuthModal();
    const [saved, setSaved] = useState(false);
    const [distance, setDistance] = useState<string | null>(null);

    const citySlug = (r.city || "pk").toLowerCase();
    const cardUrl = `/${citySlug}/${r.slug}/`;
    const discountBadgeText = typeof r.discountLabel === "string" ? r.discountLabel : "";

    // ── Check saved status on mount ──
    useEffect(() => {
        if (!session?.user) return;
        const savedStr = localStorage.getItem("fp_saved") || "[]";
        try {
            const arr = JSON.parse(savedStr);
            if (arr.includes(r._id)) setSaved(true);
        } catch { }
    }, [session, r._id]);

    // ── Calculate distance ──
    useEffect(() => {
        const userLat = parseFloat(localStorage.getItem("fp_lat") || sessionStorage.getItem("fp_lat") || "");
        const userLng = parseFloat(localStorage.getItem("fp_lng") || sessionStorage.getItem("fp_lng") || "");

        if (!userLat || !userLng) return;
        if (!r.location?.coordinates || r.location.coordinates.length < 2) return;

        const restLng = r.location.coordinates[0];
        const restLat = r.location.coordinates[1];
        const km = haversineKm(userLat, userLng, restLat, restLng);

        if (km < 1) setDistance(`${Math.round(km * 1000)} m`);
        else if (km < 100) setDistance(`${km.toFixed(1)} km`);
    }, [r.location, citySlug, userCitySlug]);

    // ── Open/Closed status ──
    const openStatus = getOpenStatus(r.openingHours);

    // ── Perform the save API call ──
    const performSave = useCallback(async () => {
        try {
            const res = await fetch("/api/users/saved", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ restaurantId: r._id }),
            });
            if (res.ok) {
                setSaved(true);
                const arr = JSON.parse(localStorage.getItem("fp_saved") || "[]");
                if (!arr.includes(r._id)) arr.push(r._id);
                localStorage.setItem("fp_saved", JSON.stringify(arr));
            }
        } catch { }
    }, [r._id]);

    // ── Toggle save ──
    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!session?.user) {
            // Open the auth modal — after login, auto-save the restaurant
            openAuthModal(() => performSave());
            return;
        }

        if (saved) {
            // Unsave
            try {
                const res = await fetch("/api/users/saved", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ restaurantId: r._id }),
                });
                if (res.ok) {
                    setSaved(false);
                    const arr = JSON.parse(localStorage.getItem("fp_saved") || "[]");
                    const idx = arr.indexOf(r._id);
                    if (idx >= 0) arr.splice(idx, 1);
                    localStorage.setItem("fp_saved", JSON.stringify(arr));
                }
            } catch { }
        } else {
            await performSave();
        }
    };

    const imgHeight = compact ? "h-24 sm:h-28" : "h-28 sm:h-32";

    return (
        <div className="relative">
            <Link
                href={cardUrl}
                data-route-type="restaurant"
                className="group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-150 flex flex-col h-full"
            >
                {/* ── Cover Image ── */}
                <div className={`relative ${imgHeight} w-full overflow-hidden shrink-0 bg-gray-100`} style={{ position: 'relative' }}>
                    <Image
                        src={r.coverImage || "/placeholder.jpg"}
                        alt={r.name}
                        fill
                        quality={85}
                        placeholder="blur"
                        blurDataURL={blurDataUrl}
                        priority={priority}
                        loading={priority ? "eager" : "lazy"}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 250px"
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-0" />

                    {/* Featured / Promoted / Prime badges */}
                    <div className="absolute top-2.5 left-2.5 flex max-w-[70%] flex-nowrap gap-1.5 z-[1]">
                    </div>

                    {/* Discount Tag */}
                    {discountBadgeText && (
                        <div className="absolute bottom-2 left-2.5 right-2.5 z-[1]">
                            <div className="inline-flex max-w-full items-center gap-1 rounded-full bg-black/85 px-3 py-1.5 text-[10px] sm:text-[11px] font-black tracking-wide text-white backdrop-blur-sm shadow-lg">
                                <Tag className="w-3 h-3 shrink-0 text-primary" />
                                <span className="block truncate whitespace-nowrap">{discountBadgeText}</span>
                            </div>
                        </div>
                    )}

                    {/* Heart / Save Button */}
                    <button
                        onClick={handleSave}
                        className={`absolute top-2.5 right-2.5 backdrop-blur-md rounded-full p-1.5 transition-all z-10 ${saved
                            ? "bg-primary text-white"
                            : "bg-white/20 hover:bg-white/40 text-white"
                            }`}
                    >
                        <Heart className={`w-4 h-4 ${saved ? "fill-white" : ""}`} />
                    </button>
                </div>

                {/* ── Card Body ── */}
                <div className="relative px-3 pb-2 pt-5 flex flex-col flex-1">
                    {/* Overlapping round logo */}
                    <div className="absolute -top-5 left-3 w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-white shadow-md z-10">
                        <Image
                            alt={r.name}
                            className="object-cover"
                            fill
                            quality={85}
                            placeholder="blur"
                            blurDataURL={blurDataUrl}
                            sizes="40px"
                            src={r.logo || r.coverImage || "/placeholder.jpg"}
                        />
                    </div>

                    {/* Name + Rating */}
                    <div className="flex flex-col gap-0.5 mb-0.5">
                        <div className="flex justify-between items-start w-full">
                            <div className="flex min-w-0 items-center gap-1.5 pr-2">
                                <h3 className="truncate text-sm font-black leading-tight text-black">
                                    {r.brandName || r.name}
                                    {r.branchName && r.branchName !== "Main Branch" && (
                                        <span className="text-zinc-500 font-bold text-[11px] ml-1">— {r.branchName.replace(/\s*branch\s*/gi, "").trim()}</span>
                                    )}
                                </h3>
                                {(r.isVerifiedPartner || r.isFeatured) && (
                                    <VerifiedBadge size={14} />
                                )}
                            </div>
                            {r.averageRating > 0 && (
                                <div className="flex items-center gap-0.5 text-black font-black text-xs shrink-0">
                                    <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                                    <span>{r.averageRating.toFixed(1)}</span>
                                    {r.totalReviews > 0 && (
                                        <span className="text-zinc-500 font-bold text-[10px]">({r.totalReviews})</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Cuisine + Distance */}
                        <div className="flex items-center gap-1.5 text-zinc-950 text-[11px] font-extrabold">
                            <span className="truncate">{r.cuisines?.[0] || r.area}</span>
                            {distance && (
                                <>
                                    <span className="text-zinc-400 font-normal">•</span>
                                    <span className="whitespace-nowrap">{distance}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Bottom bar: Open/Closed + Book */}
                    <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-[11px]">
                            {openStatus.label && (
                                <span className={`font-black ${openStatus.isOpen ? "text-emerald-700" : "text-zinc-500"}`}>
                                    {openStatus.label}
                                </span>
                            )}
                        </div>
                        <span className="bg-primary hover:bg-primary-dark text-white px-3 py-1 rounded-md text-[10px] font-black tracking-wide uppercase transition-all">
                            Book
                        </span>
                    </div>
                </div>
            </Link>
        </div>
    );
}
