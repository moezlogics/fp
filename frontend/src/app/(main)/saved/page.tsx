"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MapPin, Star, Loader2, Trash2, UtensilsCrossed, ArrowLeft } from "lucide-react";

export default function SavedPage() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState<string | null>(null);

    useEffect(() => {
        if (authStatus === "unauthenticated") {
            router.push("/login");
            return;
        }
        if (authStatus !== "authenticated") return;

        fetch("/api/users/saved")
            .then((r) => r.json())
            .then((data) => setRestaurants(Array.isArray(data) ? data : []))
            .catch(() => setRestaurants([]))
            .finally(() => setLoading(false));
    }, [authStatus, router]);

    async function unsave(restaurantId: string) {
        setRemoving(restaurantId);
        try {
            await fetch("/api/users/saved", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ restaurantId }),
            });
            setRestaurants((prev) => prev.filter((r) => r._id !== restaurantId));
        } catch { }
        setRemoving(null);
    }

    if (authStatus === "loading" || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 md:pb-8" style={{ backgroundColor: "#fafafa" }}>
            {/* ═══ APP HEADER ═══ */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/account" className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors active:scale-95">
                            <ArrowLeft className="w-5 h-5 text-gray-700" />
                        </Link>
                        <h1 className="font-bold text-lg tracking-tight text-gray-900">Saved Places</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
                {restaurants.length === 0 ? (
                    <div className="bg-white rounded-[24px] border border-gray-100 p-10 text-center flex flex-col items-center justify-center mt-4" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.03)", minHeight: 300 }}>
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "#fef2f2" }}>
                            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">No saved restaurants</h3>
                        <p className="text-[13px] text-gray-500 max-w-[250px] leading-relaxed mb-6">
                            Tap the heart icon on any restaurant to save it for later to easily find your favorites.
                        </p>
                        <Link href="/" className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95" style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                            Explore Restaurants
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {restaurants.map((r: any) => (
                            <div key={r._id} className="bg-white rounded-[20px] overflow-hidden group relative" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
                                <Link href={`/${(r.city || 'pk').toLowerCase()}/${r.slug}/`} className="block relative h-48 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent z-10"></div>
                                    <img
                                        src={r.coverImage || "https://lh3.googleusercontent.com/aida-public/AB6AXuB0qo6p6QrbI4xKffQLbJrhHUFKnpuoiUze3g15oJsQra_hL6L8L_h8ZoLGWeG3Q9TFyN1ZJ0wa7cjJ9v2g33xqpfQVRaDNpyQqv42OKJDroJY6MLHEz6arZdJR2q0GMzlCwdLLoz96XWbD439YxIYk_Lro1kwMSMLc_YvCwCoOl2xln7DxOhehSv6-jAgNS8C4MaUA0EoVU1gvp6BV9ccUUS2U8zngBQlU726mLJsXu9tqhuOe-_zioUQD_1qJ25mc2AX3ClPgnFU"}
                                        alt={r.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    {r.averageRating > 0 && (
                                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-xs font-bold px-2 py-1 rounded-lg shadow-sm text-gray-900 flex items-center gap-1 z-20">
                                            <Star className="w-3.5 h-3.5 text-primary fill-[#e8323b]" />
                                            {r.averageRating.toFixed(1)}
                                        </div>
                                    )}
                                    <button
                                        onClick={(e) => { e.preventDefault(); unsave(r._id); }}
                                        disabled={removing === r._id}
                                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm shadow-sm flex items-center justify-center z-20 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                                    >
                                        {removing === r._id ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                        ) : (
                                            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                                        )}
                                    </button>

                                    {/* Bottom Info overlaying the image slightly */}
                                    <div className="absolute bottom-3 left-4 right-4 z-20 pointer-events-none">
                                        <h3 className="font-bold text-lg text-white drop-shadow-md mb-0.5">{r.name}</h3>
                                        <p className="text-[11px] text-white/90 drop-shadow flex items-center gap-1 font-medium">
                                            <MapPin className="w-3 h-3" /> {r.area}, {r.city}
                                        </p>
                                    </div>
                                </Link>

                                <div className="p-4 bg-white">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            {r.cuisines?.slice(0, 3).map((c: string) => (
                                                <span key={c} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                                    {c}
                                                </span>
                                            ))}
                                            {r.cuisines?.length > 3 && (
                                                <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                                    +{r.cuisines.length - 3}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[12px] font-bold text-gray-400 tracking-widest">
                                            <span style={{ color: "#e8323b" }}>{"$".repeat(r.priceRange || 2)}</span>
                                            <span className="opacity-30">{"$".repeat(4 - (r.priceRange || 2))}</span>
                                        </span>
                                    </div>

                                    <Link href={`/${(r.city || 'pk').toLowerCase()}/${r.slug}/`}
                                        className="block w-full py-2.5 rounded-xl border border-gray-100 text-center text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                                        View Details
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
