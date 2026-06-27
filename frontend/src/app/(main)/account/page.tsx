"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    User, Mail, Phone, MapPin, Star, Coins, Calendar, Heart,
    LogOut, ChevronRight, Loader2, Edit2, Save, X,
    Lock, CheckCircle2, AlertCircle, Camera, CreditCard, Crown,
    TrendingUp, Sparkles, Tag, Shield, Zap, UtensilsCrossed, Globe, Instagram, Link as LinkIcon
} from "lucide-react";
import { LoginForm } from "./login-form";

/* ─── Types ─── */
interface UserProfile {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    city?: string;
    avatar?: string;
    role: string;
    profileCompleted: boolean;
    savedRestaurants?: string[];
    createdAt?: string;
    username?: string;
    bio?: string;
    socialLinks?: {
        instagram?: string;
        tiktok?: string;
        website?: string;
    };
    isPublicProfile?: boolean;
    dietaryPreferences?: string[];
    favoriteCuisines?: string[];
    themePreference?: "light" | "dark" | "system";
}

interface PlanBenefit { type: string; value: number; label: string }
interface Subscription {
    _id: string; plan: string; validFrom: string; validTo: string;
    priceAtPurchase: number; autoRenew: boolean; status: string;
    daysRemaining: number; totalDays: number; progressPercent: number;
    planId?: { name: string; duration: string; benefits: PlanBenefit[] };
    name: string; duration: string; benefits: PlanBenefit[];
}
interface Redemption {
    _id: string; primeDiscountPaisa: number; originalBillPaisa: number;
    primeDiscountPercent: number; redeemedAt: string; verificationMethod: string;
    restaurantId?: { name: string; slug: string; coverImage?: string; area?: string; city?: string };
}
interface MeData {
    isPrime: boolean; subscription: Subscription | null;
    user: { name: string; phone: string; avatar?: string } | null;
    savings: { lifetimePaisa: number; thisMonthPaisa: number; thisMonthCount: number };
    recentRedemptions: Redemption[];
}

/* ─── Prime Features for Non-Prime CTA ─── */
const PRIME_HIGHLIGHTS = [
    { icon: Tag, text: "Extra 15% OFF" },
    { icon: Zap, text: "Zero Booking Fees" },
    { icon: Sparkles, text: "2x Foodie Coins" },
];

export default function AccountPage() {
    const { data: session, status, update: updateSession } = useSession();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", phone: "", city: "", username: "", bio: "", isPublicProfile: false, instagram: "", tiktok: "", website: "", dietaryPreferences: "", favoriteCuisines: "", themePreference: "system" });
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [cities, setCities] = useState<any[]>([]);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<{ available: boolean; message: string } | null>(null);

    /* ─── Prime / Subscription state ─── */
    const [meData, setMeData] = useState<MeData | null>(null);
    const [primeLoading, setPrimeLoading] = useState(true);

    /* ─── Foodie Coins balance ─── */
    const [coinBalance, setCoinBalance] = useState<{ balance: number; totalEarned: number; totalRedeemed: number; expiringCoins: number } | null>(null);

    // Stable session profile (memoized to prevent infinite re-renders)
    const sessionProfile = useMemo<UserProfile | null>(() => {
        if (!session?.user) return null;
        const u = session.user as any;
        return {
            _id: u.id || "",
            name: u.name || "",
            email: u.email || "",
            phone: u.phone || "",
            city: u.city || "",
            avatar: u.avatar || "",
            role: u.role || "user",
            profileCompleted: u.profileCompleted || false,
            username: u.username || "",
            bio: u.bio || "",
            isPublicProfile: u.isPublicProfile || false,
            socialLinks: u.socialLinks || {},
            dietaryPreferences: u.dietaryPreferences || [],
            favoriteCuisines: u.favoriteCuisines || [],
            themePreference: u.themePreference || "system",
        };
    }, [session]);

    useEffect(() => {
        if (!session?.user) {
            if (status !== "loading") setLoading(false);
            return;
        }

        let cancelled = false;

        const load = async () => {
            try {
                const res = await fetch("/api/users/profile");
                if (res.ok) {
                    const data = await res.json();
                    const user = data?.data || data;
                    if (!cancelled) {
                        setProfile(user);
                        setEditForm({ 
                            name: user.name || "", 
                            phone: user.phone || "", 
                            city: user.city || "",
                            username: user.username || "",
                            bio: user.bio || "",
                            isPublicProfile: user.isPublicProfile ?? false,
                            instagram: user.socialLinks?.instagram || "",
                            tiktok: user.socialLinks?.tiktok || "",
                            website: user.socialLinks?.website || "",
                            dietaryPreferences: user.dietaryPreferences?.join(", ") || "",
                            favoriteCuisines: user.favoriteCuisines?.join(", ") || "",
                            themePreference: user.themePreference || "system",
                        });
                        if (user.city) {
                            const citySlug = user.city.toLowerCase().replace(/\s+/g, "-");
                            document.cookie = `foodies_city=${citySlug};path=/;max-age=${365 * 24 * 60 * 60}`;
                            document.cookie = `foodies_city_name=${encodeURIComponent(user.city)};path=/;max-age=${365 * 24 * 60 * 60}`;
                        }
                        return;
                    }
                }
            } catch { /* silent */ }

            if (!cancelled && sessionProfile) {
                setProfile(sessionProfile);
                setEditForm({ 
                    name: sessionProfile.name || "", 
                    phone: sessionProfile.phone || "", 
                    city: sessionProfile.city || "",
                    username: sessionProfile.username || "",
                    bio: sessionProfile.bio || "",
                    isPublicProfile: sessionProfile.isPublicProfile ?? false,
                    instagram: sessionProfile.socialLinks?.instagram || "",
                    tiktok: sessionProfile.socialLinks?.tiktok || "",
                    website: sessionProfile.socialLinks?.website || "",
                    dietaryPreferences: sessionProfile.dietaryPreferences?.join(", ") || "",
                    favoriteCuisines: sessionProfile.favoriteCuisines?.join(", ") || "",
                    themePreference: sessionProfile.themePreference || "system",
                });
            }
        };

        load().finally(() => { if (!cancelled) setLoading(false); });

        fetch("/api/cities")
            .then(r => r.json())
            .then(data => { if (!cancelled && Array.isArray(data)) setCities(data); })
            .catch(() => { });

        /* Fetch Prime / Subscription data */
        fetch("/api/subscriptions/me")
            .then(r => r.json())
            .then(data => { if (!cancelled) setMeData(data.data || data); })
            .catch(() => { })
            .finally(() => { if (!cancelled) setPrimeLoading(false); });

        /* Fetch Foodie Coins balance */
        fetch("/api/wallet/balance")
            .then(r => r.json())
            .then(data => { if (!cancelled) setCoinBalance(data); })
            .catch(() => { });

        return () => { cancelled = true; };
    }, [session, status, sessionProfile]);

    // ── Debounced Username Check ──
    useEffect(() => {
        if (!editing || !editForm.username || editForm.username === profile?.username) {
            setUsernameStatus(null);
            setIsCheckingUsername(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingUsername(true);
            try {
                const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(editForm.username)}`);
                const data = await res.json();
                setUsernameStatus({ 
                    available: data.available, 
                    message: data.available ? "Username is available!" : "This username is already taken" 
                });
            } catch (err) {
                setUsernameStatus({ available: false, message: "Error checking username" });
            } finally {
                setIsCheckingUsername(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [editForm.username, editing, profile?.username]);

    // ── Avatar Upload Handler ──
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setSaveMessage({ type: "error", text: "Only image files are allowed." });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setSaveMessage({ type: "error", text: "Image must be under 5MB." });
            return;
        }

        setAvatarUploading(true);
        setSaveMessage(null);

        try {
            const formData = new FormData();
            formData.append("image", file);

            const res = await fetch("/api/users/profile-picture", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (res.ok && data?.data?.avatarUrl) {
                setProfile(prev => prev ? { ...prev, avatar: data.data.avatarUrl } : prev);
                await updateSession({ avatar: data.data.avatarUrl });
                setSaveMessage({ type: "success", text: "Profile picture updated!" });
                setTimeout(() => setSaveMessage(null), 3000);
            } else {
                setSaveMessage({ type: "error", text: data?.error || "Failed to upload picture." });
            }
        } catch {
            setSaveMessage({ type: "error", text: "Network error. Please try again." });
        } finally {
            setAvatarUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSave = async () => {
        if (usernameStatus && !usernameStatus.available) {
            setSaveMessage({ type: "error", text: "Please choose an available username." });
            return;
        }
        setSaving(true);
        setSaveMessage(null);
        try {
            const payload = {
                ...editForm,
                socialLinks: {
                    instagram: editForm.instagram,
                    tiktok: editForm.tiktok,
                    website: editForm.website
                },
                dietaryPreferences: editForm.dietaryPreferences.split(",").map(s => s.trim()).filter(Boolean),
                favoriteCuisines: editForm.favoriteCuisines.split(",").map(s => s.trim()).filter(Boolean),
                themePreference: editForm.themePreference
            };
            const res = await fetch("/api/users/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok) {
                const updated = data?.data || data;
                setProfile(prev => prev ? { ...prev, ...updated } : prev);
                setEditing(false);
                setSaveMessage({ type: "success", text: "Profile updated successfully!" });
                if (editForm.city) {
                    const citySlug = editForm.city.toLowerCase().replace(/\s+/g, "-");
                    document.cookie = `foodies_city=${citySlug};path=/;max-age=${365 * 24 * 60 * 60}`;
                    document.cookie = `foodies_city_name=${encodeURIComponent(editForm.city)};path=/;max-age=${365 * 24 * 60 * 60}`;
                }
                await updateSession({ name: editForm.name, phone: editForm.phone, city: editForm.city, username: editForm.username });
                setTimeout(() => setSaveMessage(null), 3000);
            } else {
                setSaveMessage({ type: "error", text: data?.error || "Failed to update profile." });
            }
        } catch {
            setSaveMessage({ type: "error", text: "Network error. Please try again." });
        } finally {
            setSaving(false);
        }
    };

    // ── Loading State ──
    if (status === "loading" || (status === "authenticated" && loading)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#e8323b" }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#ADB5BD" }}>Loading...</span>
                </div>
            </div>
        );
    }

    // ── Role Gate ──
    if (status === "authenticated" && session?.user) {
        const role = (session.user as any).role;
        if (role === "owner") { router.replace("/owner"); return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#e8323b" }} /></div>; }
        if (role === "admin") { router.replace("/moezlogin"); return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#e8323b" }} /></div>; }
    }

    // ── Unauthenticated ──
    if (status === "unauthenticated") {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 pb-24" style={{ backgroundColor: "#FAFAFA" }}>
                <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-3xl" style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
                    <div className="text-center">
                        <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-5" style={{ backgroundColor: "#e8323b", boxShadow: "0 8px 24px rgba(232, 50, 59,0.25)" }}>
                            <User className="w-7 h-7" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Welcome Back</h2>
                        <span className="mt-2 text-sm font-medium block" style={{ color: "#ADB5BD" }}>
                            Sign in to your Foodies Pakistan account
                        </span>
                    </div>
                    <LoginForm />
                </div>
            </div>
        );
    }

    if (!profile) return null;

    const initials = profile.name
        ?.split(" ")
        .map(w => w.charAt(0))
        .join("")
        .substring(0, 2)
        .toUpperCase() || "U";

    const memberSince = profile.createdAt
        ? new Date(profile.createdAt).toLocaleDateString("en-PK", { month: "long", year: "numeric" })
        : "";

    const isPrime = meData?.isPrime;
    const sub = meData?.subscription;

    const quickActions = [
        { label: "My Bookings", href: "/my-bookings", icon: Calendar, color: "#e8323b", bg: "#FFF7ED" },
        { label: "Wallet & Coins", href: "/wallet", icon: Coins, color: "#D4AF37", bg: "#FFFBEB" },
        { label: "Payment Methods", href: "/account/payment-methods", icon: CreditCard, color: "#6366F1", bg: "#EEF2FF" },
        { label: "Saved Places", href: "/saved", icon: Heart, color: "#EF4444", bg: "#FEF2F2" },
        { label: "My Reviews", href: "/my-reviews", icon: Star, color: "#2D6A4F", bg: "#ECFDF5" },
        { label: isPrime ? "Prime Benefits" : "Get Prime", href: "/prime", icon: Crown, color: "#B45309", bg: "#FFFBEB" },
    ];

    const profileFields = [
        { label: "Public Profile", icon: Globe, value: profile.isPublicProfile ? "Yes" : "No", editKey: "isPublicProfile", editable: true, type: "toggle" as const, color: "#2D6A4F" },
        { label: "Community Username", icon: Tag, value: profile.username || "Not set", editKey: "username", editable: true, color: "#e8323b", placeholder: "foodieguy99" },
        { label: "Bio", icon: Edit2, value: profile.bio || "No bio yet", editKey: "bio", editable: true, type: "textarea" as const, color: "#6366F1", placeholder: "Tell people about your food taste..." },
        { label: "Full Name", icon: User, value: profile.name, editKey: "name", editable: true, color: "#e8323b" },
        { label: "Email Address", icon: Mail, value: profile.email, editKey: null, editable: false, color: "#2D6A4F" },
        { label: "Phone Number", icon: Phone, value: profile.phone, editKey: "phone", editable: true, placeholder: "03001234567", color: "#6366F1" },
        { label: "City", icon: MapPin, value: profile.city, editKey: "city", editable: true, type: "select" as const, color: "#D4AF37", options: [{label: "Select city...", value: ""}, ...cities.map(c => ({label: c.name, value: c.name})), {label: "Lahore", value: "Lahore"}, {label: "Karachi", value: "Karachi"}, {label: "Islamabad", value: "Islamabad"}, {label: "Rawalpindi", value: "Rawalpindi"}] },
        { label: "Theme Preference", icon: Sparkles, value: profile.themePreference, editKey: "themePreference", editable: true, type: "select" as const, color: "#6366F1", options: [{label: "System", value: "system"}, {label: "Light", value: "light"}, {label: "Dark", value: "dark"}] },
        { label: "Instagram", icon: Instagram, value: profile.socialLinks?.instagram, editKey: "instagram", editable: true, color: "#E1306C", placeholder: "instagram_handle" },
        { label: "TikTok", icon: Tag, value: profile.socialLinks?.tiktok, editKey: "tiktok", editable: true, color: "#000000", placeholder: "tiktok_handle" },
        { label: "Website", icon: LinkIcon, value: profile.socialLinks?.website, editKey: "website", editable: true, color: "#6366F1", placeholder: "https://example.com" }
    ];

    return (
        <div className="min-h-screen pb-24 md:pb-8" style={{ backgroundColor: "#fafafa" }}>

            {/* Hidden file input for avatar upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
            />

            <div className="max-w-lg mx-auto px-4 pt-6 md:pt-10 space-y-5">

                {/* ═══ ANIMATED CARD STYLES ═══ */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes primeShimmer {
                        0% { transform: translateX(-100%) rotate(15deg); }
                        100% { transform: translateX(200%) rotate(15deg); }
                    }
                    @keyframes primeGlow {
                        0%, 100% { opacity: 0.15; transform: scale(1); }
                        50% { opacity: 0.35; transform: scale(1.2); }
                    }
                    @keyframes primeGlow2 {
                        0%, 100% { opacity: 0.08; transform: scale(1) translate(0, 0); }
                        50% { opacity: 0.2; transform: scale(1.12) translate(5px, -5px); }
                    }
                    @keyframes primeOrb1 {
                        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.35; }
                        33% { transform: translate(15px, -10px) scale(1.3); opacity: 0.6; }
                        66% { transform: translate(-5px, 8px) scale(0.9); opacity: 0.3; }
                    }
                    @keyframes primeOrb2 {
                        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
                        40% { transform: translate(-12px, 6px) scale(1.2); opacity: 0.45; }
                        80% { transform: translate(8px, -12px) scale(0.85); opacity: 0.2; }
                    }
                    @keyframes primeOrb3 {
                        0%, 100% { transform: translate(0, 0); opacity: 0.2; }
                        50% { transform: translate(6px, -8px); opacity: 0.4; }
                    }
                    @keyframes progressGlow {
                        0%, 100% { box-shadow: 0 0 6px rgba(232, 50, 59,0.4), 0 0 12px rgba(232, 50, 59,0.15); }
                        50% { box-shadow: 0 0 10px rgba(232, 50, 59,0.6), 0 0 20px rgba(232, 50, 59,0.25); }
                    }
                    @keyframes statusPulse {
                        0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
                        50% { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
                    }
                    @keyframes borderRotate {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                    @keyframes ctaPulse {
                        0%, 100% { box-shadow: 0 4px 20px rgba(232, 50, 59,0.35); }
                        50% { box-shadow: 0 8px 32px rgba(232, 50, 59,0.55); }
                    }
                    @keyframes floatUp {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-4px); }
                    }
                    .prime-card-border {
                        background: linear-gradient(270deg, #e8323b, #cc2830, #cc2830, #e8323b, #e8323b);
                        background-size: 400% 400%;
                        animation: borderRotate 5s ease infinite;
                    }
                ` }} />


                {/* ═══ PRIME MEMBERSHIP CARD / UPGRADE CTA ═══ */}
                {!primeLoading && (
                    isPrime && sub ? (
                        <Link href="/prime" className="block group">
                            <div className="mx-auto max-w-sm">
                                <div
                                    className="relative overflow-hidden rounded-[24px] border border-primary/30 p-[1px] shadow-[0_16px_40px_rgba(45,106,79,0.2)] transition-transform duration-300 group-hover:-translate-y-0.5"
                                    style={{ background: "linear-gradient(135deg, rgba(232, 50, 59,0.95), rgba(232, 50, 59,0.9), rgba(45,106,79,0.95))" }}
                                >
                                    <div
                                        className="relative aspect-[1.58/1] overflow-hidden rounded-[23px] px-5 py-4 text-white"
                                        style={{ background: "linear-gradient(155deg, #191411 0%, #2b211b 50%, #111827 100%)" }}
                                    >
                                        <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 85% 15%, rgba(232, 50, 59,0.22), transparent 30%), radial-gradient(circle at 15% 85%, rgba(232, 50, 59,0.2), transparent 26%)" }} />
                                        <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                                        <div className="absolute -bottom-8 left-8 h-16 w-16 rounded-full bg-primary/10 blur-2xl" />

                                        <div className="absolute right-4 top-4 flex items-center gap-2 text-white/18">
                                            <UtensilsCrossed className="h-4 w-4" />
                                            <Sparkles className="h-3.5 w-3.5" />
                                        </div>

                                        <div className="relative z-10 flex h-full flex-col">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm">
                                                        <Crown className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-primary">Foodies Prime</p>
                                                        <p className="mt-1 text-[13px] font-black leading-none text-white">
                                                            {sub.planId?.name || sub.plan || "Membership"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">
                                                    Active
                                                </div>
                                            </div>

                                            <div className="mt-6">
                                                <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/40">Cardholder</p>
                                                <p className="mt-1 text-lg font-black tracking-[0.04em] text-white">{profile.name}</p>
                                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45">
                                                    MEMBER ID {sub._id.slice(-8).toUpperCase()}
                                                </p>
                                            </div>

                                            <div className="mt-auto">
                                                <div className="mb-2 flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.22em] text-white/40">
                                                    <span>Valid Till</span>
                                                    <span>{sub.daysRemaining} Days Left</span>
                                                </div>
                                                <div className="flex items-end justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-black text-primary">
                                                            {new Date(sub.validTo).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}
                                                        </p>
                                                        <p className="mt-1 text-[10px] font-medium text-white/55">
                                                            Rs. {sub.priceAtPurchase.toLocaleString()} • {sub.planId?.duration || sub.plan}
                                                        </p>
                                                    </div>

                                                    <div className="w-28">
                                                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${Math.max(8, 100 - (sub.progressPercent || 0))}%`,
                                                                    background: "linear-gradient(90deg, #e8323b 0%, #cc2830 50%, #e8323b 100%)",
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="mt-2 flex justify-end gap-1.5">
                                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-white/65">Dining</span>
                                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-white/65">Savings</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute inset-0 pointer-events-none" style={{
                                            backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 54px, rgba(255,255,255,0.014) 54px, rgba(255,255,255,0.014) 55px)",
                                        }} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ) : (
                        <Link href="/prime" className="block group">
                            <div className="relative overflow-hidden rounded-[28px] border border-primary/10 bg-white p-6 shadow-[0_14px_40px_rgba(232, 50, 59,0.08)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-primary/20 group-hover:shadow-[0_18px_46px_rgba(232, 50, 59,0.14)]">
                                <div className="absolute right-0 top-0 h-36 w-36 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
                                <div className="absolute bottom-0 left-0 h-28 w-28 -translate-x-1/3 translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />

                                <div className="relative z-10 flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/50 via-primary to-primary shadow-lg shadow-primary/25">
                                            <Crown className="h-7 w-7 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Foodies Prime</p>
                                            <h3 className="mt-2 text-2xl font-black leading-tight text-zinc-900">Real subscription card. Real member pricing.</h3>
                                            <p className="mt-2 max-w-sm text-sm font-medium leading-relaxed text-zinc-500">
                                                Unlock a proper dining membership with stackable savings, faster checkout, and member-only perks.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-full bg-primary/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                                        Starting Rs. 299
                                    </div>
                                </div>

                                <div className="relative z-10 mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    {PRIME_HIGHLIGHTS.map((f, i) => (
                                        <div key={i} className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-3.5">
                                            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white">
                                                <f.icon className="h-4 w-4 text-primary" />
                                            </div>
                                            <p className="text-[12px] font-black text-zinc-900">{f.text}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="relative z-10 mt-6 flex items-center justify-between border-t border-zinc-100 pt-5">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Membership Benefits</p>
                                        <p className="mt-1 text-sm font-bold text-zinc-900">Prime discounts, zero booking fee, coins multiplier</p>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 rounded-2xl bg-primary/50 px-5 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-primary/20 transition-colors group-hover:bg-primary-dark">
                                        Explore Prime
                                        <ChevronRight className="h-4 w-4" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    )
                )}

                {/* Prime loading skeleton */}
                {primeLoading && (
                    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ backgroundColor: "#18181b", height: "200px" }} />
                )}

                {/* ═══ QUICK STATS (Prime Only) ═══ */}
                {isPrime && meData && (
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: "Lifetime Saved", value: `Rs. ${Math.round((meData.savings?.lifetimePaisa || 0) / 100).toLocaleString()}`, icon: TrendingUp, iconColor: "#22c55e", iconBg: "#f0fdf4" },
                            { label: "This Month", value: `Rs. ${Math.round((meData.savings?.thisMonthPaisa || 0) / 100).toLocaleString()}`, icon: Coins, iconColor: "#e8323b", iconBg: "#f8fce8" },
                            { label: "Bookings", value: String(meData.savings?.thisMonthCount || 0), icon: Calendar, iconColor: "#6366f1", iconBg: "#eef2ff" },
                        ].map((s, i) => (
                            <div key={i} className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #f0f0f0" }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2.5" style={{ backgroundColor: s.iconBg }}>
                                    <s.icon className="w-4 h-4" style={{ color: s.iconColor }} />
                                </div>
                                <p className="text-base font-extrabold text-zinc-900 leading-tight">{s.value}</p>
                                <p className="text-[10px] text-zinc-400 font-medium mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* ═══ FOODIE COINS BALANCE WIDGET (COMPACT) ═══ */}
                {coinBalance && (
                    <Link href="/wallet" className="block">
                        <div className="bg-white rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] border shadow-sm hover:border-primary/20 hover:shadow-md group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <Coins className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Foodie Coins</p>
                                    <p className="text-xl font-black text-gray-900 leading-none mt-0.5">
                                        {(coinBalance?.balance || 0).toLocaleString()} <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest align-middle">Coins</span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all">
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </div>
                    </Link>
                )}

                {/* ═══ INCOMPLETE PROFILE BANNER ═══ */}
                {!profile.profileCompleted && (
                    <div className="bg-white rounded-2xl p-4 flex items-start gap-3.5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid rgba(212,175,55,0.2)" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(212,175,55,0.08)" }}>
                            <AlertCircle className="w-5 h-5" style={{ color: "#D4AF37" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-zinc-900">Complete Your Profile</h4>
                            <span className="text-[11px] mt-0.5 leading-relaxed block" style={{ color: "#9ca3af" }}>
                                Add phone & city to unlock bookings and rewards.
                            </span>
                        </div>
                        <button
                            onClick={() => setEditing(true)}
                            className="text-[10px] text-white font-bold px-3.5 py-2 rounded-xl transition-all active:scale-95 uppercase tracking-wider shrink-0"
                            style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}
                        >
                            Complete
                        </button>
                    </div>
                )}

                {/* ═══ SUCCESS/ERROR MESSAGE ═══ */}
                {saveMessage && (
                    <div className="rounded-2xl p-4 flex items-center gap-3 text-sm font-bold" style={{
                        backgroundColor: saveMessage.type === "success" ? "rgba(45,106,79,0.06)" : "#FEF2F2",
                        color: saveMessage.type === "success" ? "#2D6A4F" : "#DC2626",
                        border: `1px solid ${saveMessage.type === "success" ? "rgba(45,106,79,0.2)" : "#FEE2E2"}`
                    }}>
                        {saveMessage.type === "success"
                            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                            : <AlertCircle className="w-4 h-4 shrink-0" />
                        }
                        {saveMessage.text}
                    </div>
                )}

                {/* ═══ PROFILE CARD ═══ */}
                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #f0f0f0" }}>
                    {/* Profile Header */}
                    <div className="px-5 pt-5 pb-4 flex items-center gap-4" style={{ borderBottom: "1px solid #f5f5f5" }}>
                        {/* Avatar */}
                        <button
                            onClick={() => !avatarUploading && fileInputRef.current?.click()}
                            disabled={avatarUploading}
                            className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 group cursor-pointer focus:outline-none disabled:cursor-wait"
                            style={{ border: "2.5px solid #e8323b", boxShadow: "0 4px 16px rgba(232, 50, 59,0.2)" }}
                            title="Change profile picture"
                        >
                            {profile.avatar ? (
                                <Image
                                    src={profile.avatar}
                                    alt={profile.name || "Profile"}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg font-black text-white" style={{ backgroundColor: "#e8323b" }}>
                                    {initials}
                                </div>
                            )}

                            {/* Upload overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                                {avatarUploading ? (
                                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                                ) : (
                                    <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </div>
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-extrabold text-zinc-900 truncate">{profile.name}</h2>
                                {profile.profileCompleted && (
                                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#2D6A4F" }} />
                                )}
                            </div>
                            <p className="text-xs text-zinc-400 truncate">{profile.email}</p>
                            <div className="flex items-center gap-3 mt-1">
                                {profile.phone && (
                                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                        <Phone className="w-2.5 h-2.5" /> {profile.phone}
                                    </span>
                                )}
                                {profile.city && (
                                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                        <MapPin className="w-2.5 h-2.5" /> {profile.city}
                                    </span>
                                )}
                            </div>
                            {profile.username && (
                                <Link 
                                    href={`/profile/${profile.username}`}
                                    className="flex items-center gap-1 mt-1.5 text-[10px] font-bold transition-colors hover:opacity-75"
                                    style={{ color: "#e8323b" }}
                                >
                                    <Globe className="w-2.5 h-2.5" />
                                    @{profile.username} · View Public Profile
                                </Link>
                            )}
                        </div>

                        {/* Edit toggle */}
                        {!editing ? (
                            <button
                                onClick={() => setEditing(true)}
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0"
                                style={{ backgroundColor: "rgba(232, 50, 59,0.06)" }}
                            >
                                <Edit2 className="w-3.5 h-3.5" style={{ color: "#e8323b" }} />
                            </button>
                        ) : (
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => {
                                        setEditing(false);
                                        setEditForm({ 
                                            name: profile.name || "", 
                                            phone: profile.phone || "", 
                                            city: profile.city || "",
                                            username: profile.username || "",
                                            bio: profile.bio || "",
                                            isPublicProfile: profile.isPublicProfile ?? false,
                                            instagram: profile.socialLinks?.instagram || "",
                                            tiktok: profile.socialLinks?.tiktok || "",
                                            website: profile.socialLinks?.website || "",
                                            dietaryPreferences: profile.dietaryPreferences?.join(", ") || "",
                                            favoriteCuisines: profile.favoriteCuisines?.join(", ") || "",
                                            themePreference: profile.themePreference || "system",
                                        });
                                    }}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: "#f5f5f5" }}
                                >
                                    <X className="w-3.5 h-3.5 text-zinc-400" />
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-50"
                                    style={{ backgroundColor: "#2D6A4F" }}
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Profile Fields (visible when editing) */}
                    {editing && (
                        <div className="px-5 py-4 space-y-3" style={{ backgroundColor: "#fafafa" }}>
                            {profileFields.map((field) => (
                                <div key={field.label}>
                                    <label className="text-[10px] uppercase tracking-wider font-bold block mb-1" style={{ color: "#9ca3af" }}>{field.label}</label>
                                    {field.editable && field.editKey ? (
                                        field.type === "select" ? (
                                            <select
                                                value={(editForm as any)[field.editKey]}
                                                onChange={e => setEditForm({ ...editForm, [field.editKey!]: e.target.value })}
                                                className="w-full rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition-all bg-white"
                                                style={{ border: "1.5px solid #e5e5e5" }}
                                            >
                                                {field.options ? field.options.map((opt: any) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                )) : (
                                                    <>
                                                        <option value="">Select city...</option>
                                                        {cities.length > 0
                                                            ? cities.map(c => <option key={c._id || c.slug} value={c.name}>{c.name}</option>)
                                                            : <>
                                                                <option value="Lahore">Lahore</option>
                                                                <option value="Karachi">Karachi</option>
                                                                <option value="Islamabad">Islamabad</option>
                                                                <option value="Rawalpindi">Rawalpindi</option>
                                                                <option value="Faisalabad">Faisalabad</option>
                                                                <option value="Multan">Multan</option>
                                                                <option value="Peshawar">Peshawar</option>
                                                            </>
                                                        }
                                                    </>
                                                )}
                                            </select>
                                        ) : field.type === "textarea" ? (
                                            <textarea
                                                value={(editForm as any)[field.editKey]}
                                                onChange={e => setEditForm({ ...editForm, [field.editKey!]: e.target.value })}
                                                placeholder={field.placeholder || ""}
                                                rows={3}
                                                className="w-full rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition-all bg-white resize-none"
                                                style={{ border: "1.5px solid #e5e5e5" }}
                                            />
                                        ) : field.type === "toggle" ? (
                                            <div className="flex items-center gap-3 py-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm({ ...editForm, [field.editKey!]: !(editForm as any)[field.editKey] })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                        (editForm as any)[field.editKey] ? "bg-emerald-500" : "bg-gray-200"
                                                    }`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        (editForm as any)[field.editKey] ? "translate-x-6" : "translate-x-1"
                                                    }`} />
                                                </button>
                                                <span className="text-xs font-semibold text-zinc-500">
                                                    {(editForm as any)[field.editKey] ? "Visible to everyone" : "Hidden from public"}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    value={(editForm as any)[field.editKey]}
                                                    onChange={e => setEditForm({ ...editForm, [field.editKey!]: e.target.value })}
                                                    placeholder={field.placeholder || ""}
                                                    className={`w-full rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition-all bg-white ${
                                                        field.editKey === "username" && usernameStatus 
                                                            ? (usernameStatus.available ? "border-emerald-500" : "border-red-500") 
                                                            : ""
                                                    }`}
                                                    style={{ border: "1.5px solid #e5e5e5" }}
                                                />
                                                {field.editKey === "username" && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                                        {isCheckingUsername && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                                                        {!isCheckingUsername && usernameStatus && (
                                                            usernameStatus.available 
                                                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                                : <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                                        )}
                                                    </div>
                                                )}
                                                {field.editKey === "username" && usernameStatus && (
                                                    <p className={`text-[9px] font-bold mt-1 ml-1 uppercase tracking-wider ${
                                                        usernameStatus.available ? "text-emerald-600" : "text-red-500"
                                                    }`}>
                                                        {usernameStatus.message}
                                                    </p>
                                                )}
                                            </div>
                                        )
                                    ) : (
                                        <div className="px-3.5 py-2.5 text-sm font-medium rounded-xl bg-zinc-100 text-zinc-500 break-words">
                                            {field.value || "Not set"}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Member since footer */}
                    {memberSince && !editing && (
                        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #f5f5f5" }}>
                            <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "#d1d5db" }}>
                                Member since {memberSince}
                            </span>
                            {isPrime && (
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full"
                                    style={{ color: "#B45309", backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
                                    <Crown className="w-3 h-3" /> Prime
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ═══ QUICK ACTIONS (2×3 Grid) ═══ */}
                <div>
                    <h3 className="px-1 text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#e8323b" }}>Quick Actions</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {quickActions.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2.5 transition-all active:scale-95 group"
                                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #f0f0f0" }}
                            >
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                                    style={{ backgroundColor: item.bg }}
                                >
                                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                                </div>
                                <span className="text-[11px] font-bold text-zinc-700 text-center leading-tight">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ═══ RECENT SAVINGS (Prime Only) ═══ */}
                {isPrime && meData?.recentRedemptions && meData.recentRedemptions.length > 0 && (
                    <div>
                        <h3 className="px-1 text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#22c55e" }}>Recent Savings</h3>
                        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #f0f0f0" }}>
                            {meData.recentRedemptions.slice(0, 4).map((r, idx) => (
                                <div
                                    key={r._id}
                                    className="flex items-center gap-3.5 px-4 py-3.5"
                                    style={{ borderBottom: idx < Math.min(meData.recentRedemptions.length, 4) - 1 ? "1px solid #f5f5f5" : "none" }}
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#f8fce8" }}>
                                        <MapPin className="w-4 h-4" style={{ color: "#e8323b" }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-zinc-900 truncate">{r.restaurantId?.name || "Restaurant"}</p>
                                        <p className="text-[10px] text-zinc-400 truncate">
                                            {r.restaurantId?.area}{r.restaurantId?.city ? `, ${r.restaurantId.city}` : ""}
                                            {" · "}
                                            {new Date(r.redeemedAt).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}
                                        </p>
                                    </div>
                                    <span className="text-xs font-bold shrink-0" style={{ color: "#22c55e" }}>
                                        -Rs. {Math.round(r.primeDiscountPaisa / 100).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══ PRIME BENEFITS SUMMARY (Prime Only) ═══ */}
                {isPrime && sub && (
                    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #f0f0f0" }}>
                        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f5f5f5" }}>
                            <h3 className="text-xs font-bold text-zinc-900">Subscription</h3>
                            <Link href="/prime" className="text-[10px] font-bold flex items-center gap-1" style={{ color: "#e8323b" }}>
                                Manage <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="px-5 py-4 flex items-center gap-4">
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-400">Plan</span>
                                    <span className="font-bold text-zinc-900">{sub.planId?.name || sub.plan}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-400">Auto-Renew</span>
                                    <span className={`font-bold ${sub.autoRenew ? "text-emerald-600" : "text-zinc-400"}`}>
                                        {sub.autoRenew ? "On" : "Off"}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-400">Status</span>
                                    <span className={`font-bold ${sub.status === "Cancelled" ? "text-red-500" : "text-emerald-600"}`}>
                                        {sub.status || "Active"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ SETTINGS ═══ */}
                <div>
                    <h3 className="px-1 text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#6366f1" }}>Settings</h3>
                    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #f0f0f0" }}>
                        <Link href="/forgot-password" className="flex items-center gap-3.5 px-5 py-4 transition-colors group">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef2ff" }}>
                                <Lock className="w-4 h-4" style={{ color: "#6366f1" }} />
                            </div>
                            <div className="flex-1">
                                <span className="text-sm font-bold text-zinc-900 block">Reset Password</span>
                                <span className="text-[11px] font-medium" style={{ color: "#9ca3af" }}>Change your password via email OTP</span>
                            </div>
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: "#d1d5db" }} />
                        </Link>
                    </div>
                </div>

                {/* ═══ LOGOUT ═══ */}
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full bg-white rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-[0.98] mb-4"
                    style={{ border: "1px solid #FEE2E2", color: "#EF4444", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}
                >
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>

            </div>
        </div>
    );
}
