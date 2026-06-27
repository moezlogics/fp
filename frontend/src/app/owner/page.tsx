"use client";

import { useState, useEffect } from "react";
import { useBranch } from "./owner-shell";
import {
    BarChart3, Eye, CalendarCheck, Users, Star, XCircle,
    AlertTriangle, MapPin, TrendingUp, Clock, ArrowUpRight, Zap, Crown, BadgeCheck
} from "lucide-react";
import Link from "next/link";

interface AnalyticsData {
    totalBookings: number;
    confirmedBookings: number;
    completedBookings: number;
    noShowBookings: number;
    cancelledBookings: number;
    last30Bookings: number;
    last7Bookings: number;
    totalReviews: number;
    averageRating: number;
    totalGuests: number;
}

export default function OwnerDashboard() {
    const { branch, branches } = useBranch();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [branchPrime, setBranchPrime] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!branch?._id) return;
        setLoading(true);
        Promise.all([
            fetch(`/api/owner/analytics/${branch._id}`).then(r => r.json()),
            fetch(`/api/owner/prime/me?restaurantId=${branch._id}`).then(r => r.json()).catch(() => null),
        ])
            .then(([analyticsData, primeData]) => {
                if (analyticsData?.success === false) {
                    console.error("[Dashboard] Analytics fetch failed:", analyticsData.message || analyticsData.error);
                    setAnalytics(null);
                } else {
                    setAnalytics(analyticsData);
                }
                setBranchPrime(primeData?.data || primeData || null);
            })
            .catch(() => {
                setAnalytics(null);
                setBranchPrime(null);
            })
            .finally(() => setLoading(false));
    }, [branch?._id]);

    if (!branch) return null;

    const heroStats = analytics ? [
        { label: "This Week", value: analytics.last7Bookings, suffix: "bookings", icon: Zap, gradient: "from-primary/50 to-primary" },
        { label: "This Month", value: analytics.last30Bookings, suffix: "bookings", icon: TrendingUp, gradient: "from-violet-500 to-purple-600" },
        { label: "Avg Rating", value: analytics.averageRating?.toFixed(1) || "0.0", suffix: `(${analytics.totalReviews} reviews)`, icon: Star, gradient: "from-primary/50 to-yellow-500" },
    ] : [];

    const detailStats = analytics ? [
        { label: "Total Bookings", value: analytics.totalBookings, icon: CalendarCheck, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
        { label: "Completed", value: analytics.completedBookings, icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
        { label: "Total Guests", value: analytics.totalGuests, icon: Users, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100" },
        { label: "Confirmed", value: analytics.confirmedBookings, icon: Eye, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
        { label: "No-Shows", value: analytics.noShowBookings, icon: XCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
        { label: "Cancelled", value: analytics.cancelledBookings, icon: AlertTriangle, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-100" },
    ] : [];

    return (
        <div className="space-y-6">
            {/* ═══ WELCOME HEADER ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900">
                        {branch.brandName}
                        {branch.branchName && branch.branchName.toLowerCase() !== "main branch" && (
                            <span className="text-gray-400 font-bold text-lg ml-2">— {branch.branchName}</span>
                        )}
                    </h1>
                    <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                            <span className="text-[13px] font-bold text-gray-700">
                                {analytics?.averageRating?.toFixed(1) || branch.averageRating?.toFixed(1) || "0.0"}
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium">
                                ({analytics?.totalReviews || branch.totalReviews || 0} reviews)
                            </span>
                        </div>
                        {branch.area && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {branch.area}, {branch.city}
                            </span>
                        )}
                    </div>
                </div>
                {branch.city && branch.slug && (
                    <a
                        href={`/${branch.city.toLowerCase()}/${branch.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-[13px] font-bold hover:bg-gray-50 hover:border-gray-300 transition-all shrink-0 shadow-sm active:scale-95"
                    >
                        <Eye className="w-4 h-4" />
                        Preview Branch
                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                    </a>
                )}
            </div>

            {/* ═══ APPROVAL BANNER ═══ */}
            {!branch.isApproved && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-2xl">⏳</span>
                    </div>
                    <div>
                        <p className="font-bold text-[14px] text-primary-dark">Under Review</p>
                        <p className="text-[12px] text-primary leading-relaxed">This branch is pending admin approval. Your listing will go live once approved.</p>
                    </div>
                </div>
            )}

            {/* ═══ HERO STATS ═══ */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="rounded-2xl h-[120px] animate-pulse bg-gray-100" />
                    ))}
                </div>
            ) : heroStats.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {heroStats.map(s => (
                        <div key={s.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${s.gradient} p-5 text-white group`}>
                            {/* Background decorative circles */}
                            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                            <div className="absolute -bottom-8 -left-4 w-20 h-20 bg-white/5 rounded-full" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">{s.label}</span>
                                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
                                        <s.icon className="w-4 h-4" />
                                    </div>
                                </div>
                                <p className="text-3xl font-black tracking-tight">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                                <p className="text-[11px] text-white/70 font-medium mt-0.5">{s.suffix}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ DETAIL STATS GRID ═══ */}
            <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-white via-primary/5 to-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                            <Crown className="w-3.5 h-3.5" />
                            Branch Prime
                        </div>
                        <h2 className="mt-3 text-lg font-black text-gray-900">
                            {branchPrime?.activeSubscription ? branchPrime.activeSubscription.planName : "Unlock branch growth features"}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-gray-600">
                            {branchPrime?.activeSubscription
                                ? `This branch plan stays active until ${new Date(branchPrime.activeSubscription.validTo).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}.`
                                : "Buy a monthly branch plan for zero platform commission, crown badge, stronger visibility, and optional featured ranking."}
                        </p>
                    </div>
                    <Link href="/owner/prime" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary/50 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-primary-dark active:scale-[0.98]">
                        {branchPrime?.activeSubscription?.planSlug === "featured" ? <BadgeCheck className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
                        {branchPrime?.activeSubscription ? "Manage Branch Plan" : "View Branch Plans"}
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                            <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
                            <div className="h-8 bg-gray-100 rounded w-16" />
                        </div>
                    ))}
                </div>
            ) : detailStats.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {detailStats.map(s => (
                        <div key={s.label} className={`bg-white rounded-2xl border ${s.border} p-5 hover:shadow-sm transition-all group`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</span>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg} transition-transform group-hover:scale-110`}>
                                    <s.icon className={`w-4 h-4 ${s.color}`} />
                                </div>
                            </div>
                            <p className="text-3xl font-black text-gray-900 tracking-tight">{(s.value ?? 0).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ QUICK ACTIONS ═══ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "View Bookings", href: "/owner/bookings", icon: CalendarCheck, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Branch Prime", href: "/owner/prime", icon: Crown, color: "text-primary", bg: "bg-primary/5" },
                    { label: "Prime Verify", href: "/owner/prime-verify", icon: Star, color: "text-primary", bg: "bg-primary/5" },
                    { label: "Settlements", href: "/owner/settlements", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Manage Deals", href: "/owner/deals", icon: Zap, color: "text-purple-600", bg: "bg-purple-50" },
                ].map(a => (
                    <Link key={a.href} href={a.href} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:shadow-md hover:border-gray-200 transition-all group active:scale-[0.98]">
                        <div className={`w-11 h-11 rounded-xl ${a.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                            <a.icon className={`w-5 h-5 ${a.color}`} />
                        </div>
                        <span className="text-[12px] font-bold text-gray-700">{a.label}</span>
                    </Link>
                ))}
            </div>

            {/* ═══ MULTI-BRANCH SUMMARY ═══ */}
            {branches.length > 1 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                    <h2 className="font-bold text-[14px] text-gray-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        All Branches ({branches.length})
                    </h2>
                    <div className="space-y-1">
                        {branches.map(b => (
                            <div key={b._id} className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center text-[13px] font-black text-primary">
                                        {b.branchName?.charAt(0) || "B"}
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-gray-900">{b.branchName}</p>
                                        <p className="text-[11px] text-gray-400 font-medium">{b.area}, {b.city}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${b.isApproved ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-primary/5 text-primary border border-primary/10"}`}>
                                    {b.isApproved ? "Live" : "Pending"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
