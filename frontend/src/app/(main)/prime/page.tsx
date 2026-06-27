"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
    Crown, Check, Sparkles, Tag, Users, Shield, Zap,
    ChevronRight, CreditCard, Calendar, TrendingUp,
    MapPin, X, ArrowRight, Coins, BadgeCheck, RefreshCw,
    Loader2, Plus, MessageCircle, Clock, Star,
} from "lucide-react";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "923001234567";

/* ─── TYPES ─── */
interface PlanBenefit { type: string; value: number; label: string }
interface Plan {
    _id: string; name: string; slug: string; duration: string;
    price: number; currency: string; benefits: PlanBenefit[];
    isActive: boolean; displayOrder: number; highlightText?: string;
}
interface Subscription {
    _id: string; plan: string; validFrom: string; validTo: string;
    priceAtPurchase: number; autoRenew: boolean; status: string;
    daysRemaining: number; totalDays: number; progressPercent: number;
    planId?: { name: string; duration: string; benefits: PlanBenefit[] };
}
interface Redemption {
    _id: string; primeDiscountPaisa: number; originalBillPaisa: number;
    primeDiscountPercent: number; redeemedAt: string; verificationMethod: string;
    restaurantId?: { name: string; slug: string; coverImage?: string; area?: string; city?: string };
}
interface MeData {
    isPrime: boolean; subscription: Subscription | null;
    pendingSubscription?: Subscription | null;
    user: { name: string; phone: string; avatar?: string } | null;
    savings: { lifetimePaisa: number; thisMonthPaisa: number; thisMonthCount: number };
    recentRedemptions: Redemption[];
}
interface SavedCard {
    _id: string; cardNickname: string; maskedCardNumber: string;
    cardBrand: string; isDefault: boolean;
}

/* ─── PLAN CONFIG ─── */
const HARDCODED_PLANS = [
    { slug: "semiannual", name: "6 Months", duration: "SemiAnnual", price: 950, months: 6, perMonth: 158, popular: true, save: "7%" },
    { slug: "annual", name: "1 Year", duration: "Annual", price: 1699, months: 12, perMonth: 142, bestValue: true, save: "11%" },
];

const FEATURES = [
    { icon: Tag, title: "Extra 15% OFF", desc: "Stacks with yield & bank offers" },
    { icon: Zap, title: "Zero Booking Fees", desc: "Save on every reservation" },
    { icon: Users, title: "Priority Waitlist", desc: "Skip the queue at popular spots" },
    { icon: Crown, title: "Prime Restaurants", desc: "Exclusive partner access" },
    { icon: Sparkles, title: "2x Foodie Coins", desc: "Double coins on every meal" },
    { icon: Shield, title: "Free Cancellation", desc: "Cancel anytime, no penalty" },
];

const PERKS = ["Extra 15% OFF every meal", "Zero booking fees", "2x Foodie Coins", "Priority waitlist", "Free cancellation"];

/* ═══════════════════════════════════════════════════════ */
export default function PrimePage() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const sessionRole = (session?.user as any)?.role || "user";
    const redirectPath = sessionRole === "owner" ? "/owner" : "/moezlogin";
    const isRestrictedRole = sessionRole === "owner" || sessionRole === "admin";
    const [plans, setPlans] = useState<Plan[]>([]);
    const [meData, setMeData] = useState<MeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<typeof HARDCODED_PLANS[0] | null>(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [subscribing, setSubscribing] = useState(false);
    const [cancelConfirm, setCancelConfirm] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelStep, setCancelStep] = useState<"confirm" | "otp">("confirm");
    const [cancelOtp, setCancelOtp] = useState("");
    const [cancelError, setCancelError] = useState("");

    const [cards, setCards] = useState<SavedCard[]>([]);
    const [selectedCard, setSelectedCard] = useState<string | null>(null);
    const [payMethod, setPayMethod] = useState<"saved" | "new" | "whatsapp">("saved");
    const [loadingCards, setLoadingCards] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [redirectData, setRedirectData] = useState<{ redirectUrl: string; formData: Record<string, string> } | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [plansRes, subRes] = await Promise.all([
                fetch("/api/subscriptions/plans").then(r => r.json()),
                authStatus === "authenticated"
                    ? fetch("/api/subscriptions/me").then(r => r.json())
                    : null,
            ]);
            const plansData = Array.isArray(plansRes) ? plansRes : plansRes.plans || plansRes.data || [];
            setPlans(plansData);
            if (subRes) setMeData(subRes.data || subRes);
        } catch { /* silent */ }
        setLoading(false);
    }, [authStatus]);

    useEffect(() => { fetchData() }, [fetchData]);

    useEffect(() => {
        if (redirectData && formRef.current) formRef.current.submit();
    }, [redirectData]);

    useEffect(() => {
        if (authStatus === "authenticated" && isRestrictedRole) router.replace(redirectPath);
    }, [authStatus, isRestrictedRole, redirectPath, router]);

    useEffect(() => {
        if (authStatus === "authenticated" && window.location.search.includes("checkout=")) {
            const params = new URLSearchParams(window.location.search);
            const checkoutSlug = params.get("checkout");
            if (checkoutSlug) {
                const plan = HARDCODED_PLANS.find(p => p.slug === checkoutSlug);
                if (plan) {
                    setTimeout(() => openCheckout(plan), 100);
                    window.history.replaceState({}, '', '/prime');
                }
            }
        }
    }, [authStatus]);

    const fetchCards = async () => {
        setLoadingCards(true);
        try {
            const res = await fetch("/api/payment-methods/me");
            const data = await res.json();
            const list = data.data || data || [];
            setCards(list);
            const defaultCard = list.find((c: SavedCard) => c.isDefault);
            if (defaultCard) setSelectedCard(defaultCard._id);
            setPayMethod(list.length > 0 ? "saved" : "new");
        } catch { /* silent */ }
        setLoadingCards(false);
    };

    const openCheckout = (plan: typeof HARDCODED_PLANS[0]) => {
        if (authStatus !== "authenticated") { router.push("/account?redirect=/prime"); return; }
        if (isRestrictedRole) { router.replace(redirectPath); return; }
        setSelectedPlan(plan);
        setShowCheckout(true);
        fetchCards();
    };

    const buildWhatsAppUrl = (plan: typeof HARDCODED_PLANS[0]) => {
        const phone = meData?.user?.phone || (session?.user as any)?.phone || "";
        const email = (session?.user as any)?.email || "";
        const msg = `Hi, I want to buy Foodies Prime *${plan.name}* (Rs. ${plan.price.toLocaleString()}).\nMy phone: ${phone}\nMy email: ${email}`;
        return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    };

    const subscribe = async () => {
        if (!selectedPlan) return;
        if (isRestrictedRole) { router.replace(redirectPath); return; }

        if (payMethod === "whatsapp") {
            window.open(buildWhatsAppUrl(selectedPlan), "_blank");
            setShowCheckout(false);
            return;
        }

        setSubscribing(true);
        try {
            const matchedPlan = plans.find(p => p.slug === selectedPlan.slug || p.duration === selectedPlan.duration);
            const body: any = { planSlug: matchedPlan?.slug || selectedPlan.slug };
            if (payMethod === "saved" && selectedCard) body.paymentMethodId = selectedCard;

            const res = await fetch("/api/subscriptions/me", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                if (data?.payment?.redirectUrl) {
                    setShowCheckout(false);
                    setRedirectData({ redirectUrl: data.payment.redirectUrl, formData: data.payment.formData || {} });
                    return;
                }
                setShowCheckout(false);
                await fetchData();
                if (!data?.pending) {
                    router.push(`/payment/success?kind=prime&ref=${encodeURIComponent(data?.payment?.txnRefNo || "")}`);
                }
            } else {
                alert(data.error || "Subscription failed.");
            }
        } catch {
            alert("Network error. Try again.");
        }
        setSubscribing(false);
    };

    const requestCancelOtp = async () => {
        setCancelling(true);
        setCancelError("");
        try {
            const res = await fetch("/api/subscriptions/me/cancel/otp", { method: "POST", headers: { "Content-Type": "application/json" } });
            const data = await res.json();
            if (res.ok) {
                setCancelStep("otp");
            } else {
                setCancelError(data.error || "Failed to send OTP.");
            }
        } catch {
            setCancelError("Network error. Try again.");
        }
        setCancelling(false);
    };

    const cancelSubscription = async () => {
        if (!cancelOtp || cancelOtp.length < 4) {
            setCancelError("Please enter a valid OTP.");
            return;
        }
        setCancelling(true);
        setCancelError("");
        try {
            const res = await fetch("/api/subscriptions/me/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otp: cancelOtp, reason: "User cancelled" })
            });
            const data = await res.json();
            if (res.ok) {
                setCancelConfirm(false);
                setCancelStep("confirm");
                setCancelOtp("");
                await fetchData();
            } else {
                setCancelError(data.error || "Failed to cancel subscription.");
            }
        } catch {
            setCancelError("Network error. Try again.");
        }
        setCancelling(false);
    };

    const isPrime = meData?.isPrime;
    const sub = meData?.subscription;

    if (authStatus === "authenticated" && isRestrictedRole) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-sm text-zinc-400">Redirecting…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">

            {/* ═══ MINIMAL HERO ═══ */}
            <section className="pt-12 pb-6 md:pt-16 md:pb-8 text-center px-4">
                <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/15 rounded-full px-3 py-1 mb-4">
                    <Crown className="w-3 h-3 text-primary" />
                    <span className="text-[10px] text-primary font-bold tracking-widest uppercase">
                        {isPrime ? "You're Prime" : "Prime"}
                    </span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight mb-2">
                    Foodies <span className="text-primary">Prime</span>
                </h1>
                <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                    Save 15% on every meal across Pakistan
                </p>
            </section>

            <div className="max-w-3xl mx-auto px-4">

                {/* ═══ PRICING CARDS ═══ */}
                <section className="mb-12 md:mb-16">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {HARDCODED_PLANS.map((plan) => {
                            const isActive = isPrime && sub?.planId?.duration === plan.duration;
                            const isHighlighted = plan.bestValue;
                            return (
                                <div
                                    key={plan.slug}
                                    className={`relative rounded-2xl border-2 p-5 sm:p-6 flex flex-col transition-all duration-200 ${isHighlighted
                                        ? "border-primary bg-primary/[0.03]"
                                        : "border-zinc-100 bg-white hover:border-zinc-200"
                                        }`}
                                >
                                    {/* Badge */}
                                    {(plan.popular || plan.bestValue) && (
                                        <span className={`absolute -top-2.5 left-5 text-[9px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full ${isHighlighted
                                            ? "bg-primary text-white"
                                            : "bg-zinc-900 text-white"
                                            }`}>
                                            {plan.bestValue ? "Best Value" : "Popular"}
                                        </span>
                                    )}

                                    <div className="mb-3">
                                        <p className="text-xs font-semibold text-zinc-500 mb-0.5">{plan.name}</p>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
                                                Rs. {plan.price.toLocaleString()}
                                            </span>
                                        </div>
                                        {plan.months > 1 && (
                                            <p className="text-xs text-zinc-400 mt-0.5">
                                                Rs. {plan.perMonth}/month
                                                {plan.save && <span className="ml-1.5 text-emerald-600 font-bold">Save {plan.save}</span>}
                                            </p>
                                        )}
                                    </div>

                                    {/* ─ Discount Highlight ─ */}
                                    <div className={`rounded-lg px-3 py-2 mb-4 text-center ${isHighlighted ? "bg-primary/10" : "bg-zinc-50"}`}>
                                        <p className={`text-lg font-extrabold ${isHighlighted ? "text-primary" : "text-zinc-700"}`}>15% OFF</p>
                                        <p className="text-[10px] text-zinc-400 font-medium">On every meal, stacks with other offers</p>
                                    </div>

                                    {/* ─ Perks ─ */}
                                    <ul className="space-y-2 mb-5 flex-1">
                                        {PERKS.map((f, i) => (
                                            <li key={i} className="flex items-center gap-2 text-xs text-zinc-600">
                                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* ─ CTA ─ */}
                                    {isActive ? (
                                        <div className="w-full py-2.5 rounded-xl text-center text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                            <BadgeCheck className="w-3.5 h-3.5 inline mr-1" />
                                            Current Plan
                                        </div>
                                    ) : meData?.pendingSubscription ? (
                                        <div className="w-full py-2.5 rounded-xl text-center text-xs font-bold bg-zinc-50 text-zinc-400 border border-zinc-100">
                                            <Clock className="w-3.5 h-3.5 inline mr-1" />
                                            Pending
                                        </div>
                                    ) : isPrime ? (
                                        <button onClick={() => openCheckout(plan)}
                                            className="w-full py-2.5 rounded-xl text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors">
                                            Switch to {plan.name}
                                        </button>
                                    ) : (
                                        <button onClick={() => openCheckout(plan)}
                                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${isHighlighted
                                                ? "bg-primary hover:bg-primary/90 text-white"
                                                : "bg-zinc-900 hover:bg-zinc-800 text-white"
                                                }`}>
                                            Get Started <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ═══ PENDING VERIFICATION ═══ */}
                {meData?.pendingSubscription && !isPrime && (
                    <section className="mb-12 max-w-md mx-auto">
                        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 text-center">
                            <Clock className="w-8 h-8 text-primary mx-auto mb-3 animate-pulse" />
                            <h3 className="text-sm font-bold text-zinc-900 mb-1">Payment Pending</h3>
                            <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
                                Your <strong>{meData.pendingSubscription?.planId?.name || meData.pendingSubscription?.plan}</strong> payment is awaiting confirmation.
                                Prime activates automatically once PayFast confirms.
                            </p>
                            <button onClick={fetchData}
                                className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 hover:bg-zinc-800">
                                <RefreshCw className="w-3.5 h-3.5" /> Refresh
                            </button>
                        </div>
                    </section>
                )}

                {/* ═══ PRIME DASHBOARD (Subscribed) ═══ */}
                {isPrime && sub && meData && (
                    <section className="mb-12">
                        {/* Membership Card */}
                        <div className="max-w-md mx-auto mb-6">
                            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 shadow-lg" style={{ aspectRatio: "1.7/1" }}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/15 to-transparent rounded-bl-full" />
                                <div className="relative h-full p-5 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-1.5">
                                            <Crown className="w-4 h-4 text-primary" />
                                            <span className="text-[9px] text-primary font-bold tracking-widest uppercase">Foodies Prime</span>
                                        </div>
                                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">{sub.planId?.name || sub.plan}</span>
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-base tracking-wide">{meData.user?.name || "Prime Member"}</p>
                                        <p className="text-zinc-400 text-[11px] font-mono">{meData.user?.phone || ""}</p>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest">Valid Until</p>
                                            <p className="text-primary font-semibold text-xs">{new Date(sub.validTo).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest">{sub.daysRemaining} days left</p>
                                            <div className="w-20 h-1 bg-zinc-700 rounded-full mt-1 overflow-hidden">
                                                <div className="h-full bg-primary rounded-full" style={{ width: `${100 - sub.progressPercent}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Savings */}
                        <div className="grid grid-cols-3 gap-2.5 mb-6">
                            {[
                                { label: "Lifetime Saved", value: `Rs. ${Math.round((meData.savings?.lifetimePaisa || 0) / 100).toLocaleString()}`, icon: TrendingUp },
                                { label: "This Month", value: `Rs. ${Math.round((meData.savings?.thisMonthPaisa || 0) / 100).toLocaleString()}`, icon: Coins },
                                { label: "Bookings", value: String(meData.savings?.thisMonthCount || 0), icon: Star },
                            ].map((s, i) => (
                                <div key={i} className="bg-zinc-50 rounded-xl p-3.5 text-center">
                                    <s.icon className="w-4 h-4 mx-auto mb-1.5 text-zinc-400" />
                                    <p className="text-sm font-extrabold text-zinc-900">{s.value}</p>
                                    <p className="text-[9px] text-zinc-400 font-medium mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Recent Savings */}
                        {meData.recentRedemptions?.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-bold text-xs text-zinc-900 mb-2.5">Recent Savings</h3>
                                <div className="space-y-1.5">
                                    {meData.recentRedemptions.slice(0, 5).map(r => (
                                        <div key={r._id} className="bg-zinc-50 rounded-xl p-3 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-zinc-900 truncate">{r.restaurantId?.name || "Restaurant"}</p>
                                                <p className="text-[9px] text-zinc-400">{r.restaurantId?.area}{r.restaurantId?.city ? `, ${r.restaurantId.city}` : ""}</p>
                                            </div>
                                            <p className="text-xs font-bold text-emerald-600">-Rs. {Math.round(r.primeDiscountPaisa / 100)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Manage */}
                        <div className="bg-zinc-50 rounded-xl p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                                <div>
                                    <p className="text-xs font-bold text-zinc-900">Auto-Renew</p>
                                    <p className="text-[9px] text-zinc-400">{sub.autoRenew ? "On — renews automatically" : "Off"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sub.autoRenew ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                                    {sub.autoRenew ? "On" : "Off"}
                                </span>
                                {sub.status !== "Cancelled" && (
                                    <button onClick={() => setCancelConfirm(true)} className="text-[10px] text-red-500 font-bold hover:text-red-700 px-2 py-1">Cancel</button>
                                )}
                            </div>
                        </div>
                        {sub.status === "Cancelled" && (
                            <p className="text-[10px] text-red-500 font-medium mt-2 text-center">
                                ⚠️ Cancelled — Benefits active until {new Date(sub.validTo).toLocaleDateString("en-PK")}
                            </p>
                        )}
                    </section>
                )}

                {/* ═══ HOW IT WORKS ═══ */}
                <section className="mb-12 md:mb-16">
                    <h2 className="text-base font-bold text-center text-zinc-900 mb-5">
                        How It Works
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { step: "1", icon: CreditCard, title: "Subscribe", desc: "Choose a plan, pay securely." },
                            { step: "2", icon: Calendar, title: "Book", desc: "Book at any Prime Partner." },
                            { step: "3", icon: Sparkles, title: "Save", desc: "Discount applied instantly." },
                        ].map((s, i) => (
                            <div key={i} className="text-center p-4">
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center mx-auto mb-2">
                                    {s.step}
                                </div>
                                <h3 className="font-bold text-xs text-zinc-900 mb-0.5">{s.title}</h3>
                                <p className="text-[10px] text-zinc-400 leading-snug">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ═══ BENEFITS ═══ */}
                <section className="mb-12 md:mb-16">
                    <h2 className="text-base font-bold text-center text-zinc-900 mb-1.5">
                        {isPrime ? "Your Benefits" : "What You Get"}
                    </h2>
                    <p className="text-[11px] text-zinc-400 text-center mb-5">Every perk designed to save you money</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="bg-zinc-50 rounded-xl p-4 group hover:bg-primary/5 transition-colors">
                                <f.icon className="w-4 h-4 text-zinc-400 mb-2 group-hover:text-primary transition-colors" />
                                <h3 className="font-bold text-xs text-zinc-900 mb-0.5">{f.title}</h3>
                                <p className="text-[10px] text-zinc-400 leading-snug">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ═══ FAQ ═══ */}
                <section className="mb-16 max-w-xl mx-auto">
                    <h2 className="text-base font-bold text-center text-zinc-900 mb-4">FAQs</h2>
                    <div className="space-y-1.5">
                        {[
                            { q: "How does the 15% discount work?", a: "Your Prime discount stacks on top of restaurant yield discounts and bank deals. It's applied automatically when you book or verified via a 4-digit email OTP at walk-in." },
                            { q: "Can I cancel anytime?", a: "Yes. Benefits remain until end of billing cycle. No penalties." },
                            { q: "How do I earn 2x coins?", a: "All Foodie Coins from dining are automatically doubled as a Prime member." },
                            { q: "What about walk-ins?", a: "The owner can check your customer ID, phone number, or email. A 4-digit OTP goes to your account email, and once it matches your Prime discount is verified." },
                            { q: "Is there a minimum bill?", a: "Each restaurant sets their own threshold. It's displayed during booking." },
                        ].map((faq, i) => (
                            <details key={i} className="bg-zinc-50 rounded-xl group">
                                <summary className="px-4 py-3 text-xs font-bold text-zinc-900 cursor-pointer flex justify-between items-center list-none">
                                    {faq.q}
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-open:rotate-90 transition-transform shrink-0 ml-2" />
                                </summary>
                                <p className="px-4 pb-3 text-[11px] text-zinc-500 leading-relaxed">{faq.a}</p>
                            </details>
                        ))}
                    </div>
                </section>
            </div>

            {/* ═══ CHECKOUT MODAL ═══ */}
            {showCheckout && selectedPlan && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center"
                    onClick={() => setShowCheckout(false)}>
                    <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}>

                        <div className="sticky top-0 bg-white border-b border-zinc-50 px-5 py-3.5 flex items-center justify-between z-10">
                            <div className="flex items-center gap-2">
                                <Crown className="w-4 h-4 text-primary" />
                                <h3 className="font-bold text-sm text-zinc-900">Subscribe</h3>
                            </div>
                            <button onClick={() => setShowCheckout(false)} className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors">
                                <X className="w-3.5 h-3.5 text-zinc-500" />
                            </button>
                        </div>

                        <div className="p-5">
                            {/* Order Summary */}
                            <div className="bg-zinc-50 rounded-xl p-4 mb-4">
                                <div className="flex justify-between items-center text-xs mb-1.5">
                                    <span className="text-zinc-500">Plan</span>
                                    <span className="font-bold text-zinc-900">{selectedPlan.name}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs mb-1.5">
                                    <span className="text-zinc-500">Duration</span>
                                    <span className="font-bold text-zinc-900">{selectedPlan.months} {selectedPlan.months === 1 ? "month" : "months"}</span>
                                </div>
                                <div className="border-t border-zinc-200 mt-2.5 pt-2.5 flex justify-between items-center">
                                    <span className="text-xs font-bold text-zinc-900">Total</span>
                                    <span className="text-lg font-extrabold text-zinc-900">Rs. {selectedPlan.price.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <h4 className="font-bold text-xs text-zinc-900 mb-2.5">Payment Method</h4>
                            {loadingCards ? (
                                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-zinc-300 animate-spin" /></div>
                            ) : (
                                <>
                                    {cards.length > 0 && (
                                        <div className="space-y-1.5 mb-2.5">
                                            {cards.map(card => (
                                                <label key={card._id}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedCard === card._id && payMethod === "saved" ? "border-primary bg-primary/5" : "border-zinc-100 hover:border-zinc-200"}`}>
                                                    <input type="radio" name="payMethod" checked={selectedCard === card._id && payMethod === "saved"}
                                                        onChange={() => { setSelectedCard(card._id); setPayMethod("saved"); }} className="accent-primary" />
                                                    <CreditCard className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-zinc-900 truncate">{card.cardNickname}</p>
                                                        <p className="text-[9px] text-zinc-400">{card.maskedCardNumber}</p>
                                                    </div>
                                                    {card.isDefault && <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Default</span>}
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${payMethod === "new" ? "border-primary bg-primary/5" : "border-zinc-100 hover:border-zinc-200"}`}>
                                        <input type="radio" name="payMethod" checked={payMethod === "new"} onChange={() => setPayMethod("new")} className="accent-primary" />
                                        <Plus className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900">Pay with New Card</p>
                                            <p className="text-[9px] text-zinc-400">Redirected to secure payment page</p>
                                        </div>
                                    </label>

                                    <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all mt-1.5 ${payMethod === "whatsapp" ? "border-emerald-400 bg-emerald-50/50" : "border-zinc-100 hover:border-zinc-200"}`}>
                                        <input type="radio" name="payMethod" checked={payMethod === "whatsapp"} onChange={() => setPayMethod("whatsapp")} className="accent-emerald-500" />
                                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900">Order on WhatsApp</p>
                                            <p className="text-[9px] text-zinc-400">Pay via bank/Easypaisa/JazzCash</p>
                                        </div>
                                    </label>
                                </>
                            )}

                            <button onClick={subscribe}
                                disabled={subscribing || (payMethod === "saved" && !selectedCard)}
                                className="w-full mt-4 py-3 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {subscribing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <>Subscribe — Rs. {selectedPlan.price.toLocaleString()} <ArrowRight className="w-3.5 h-3.5" /></>}
                            </button>

                            <div className="flex items-start gap-1.5 mt-3 text-[9px] text-zinc-400">
                                <Shield className="w-3 h-3 shrink-0 mt-0.5" />
                                <p>256-bit encryption. Cancel anytime. By subscribing you agree to our Terms.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ CANCEL MODAL ═══ */}
            {cancelConfirm && sub && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl text-center">
                        <Crown className="w-8 h-8 text-red-400 mx-auto mb-3" />
                        <h3 className="font-bold text-sm text-zinc-900 mb-1.5">Cancel Prime?</h3>
                        
                        {cancelStep === "confirm" ? (
                            <>
                                <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">
                                    Benefits stay active until {new Date(sub.validTo).toLocaleDateString("en-PK", { month: "long", day: "numeric", year: "numeric" })}.
                                </p>
                                {cancelError && <p className="text-[10px] text-red-500 px-2 mb-3">{cancelError}</p>}
                                <div className="flex gap-2.5">
                                    <button onClick={() => { setCancelConfirm(false); setCancelError(""); }}
                                        className="flex-1 bg-zinc-100 text-zinc-900 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors">
                                        Keep Prime
                                    </button>
                                    <button onClick={requestCancelOtp} disabled={cancelling}
                                        className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                                        {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        Yes, Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">
                                    We sent a code to your email. Enter it below to confirm cancellation.
                                </p>
                                <input
                                    type="text"
                                    value={cancelOtp}
                                    onChange={e => setCancelOtp(e.target.value)}
                                    placeholder="Enter OTP"
                                    className="w-full text-center tracking-widest bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                    maxLength={6}
                                />
                                {cancelError && <p className="text-[10px] text-red-500 px-2 mb-3">{cancelError}</p>}
                                <div className="flex gap-2.5">
                                    <button onClick={() => { setCancelStep("confirm"); setCancelError(""); setCancelOtp(""); }}
                                        className="flex-1 bg-zinc-100 text-zinc-900 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors">
                                        Back
                                    </button>
                                    <button onClick={cancelSubscription} disabled={cancelling || cancelOtp.length < 4}
                                        className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                                        {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        Confirm
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ WHATSAPP FAB ═══ */}
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in Foodies Prime membership.")}`}
                target="_blank" rel="noopener noreferrer"
                className="fixed bottom-5 right-5 z-40 bg-[#25D366] hover:bg-[#1ebe57] text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold transition-all active:scale-95">
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
            </a>

            {redirectData && (
                <form ref={formRef} method="POST" action={redirectData.redirectUrl} className="hidden">
                    {Object.entries(redirectData.formData).map(([key, value]) => (
                        <input key={key} type="hidden" name={key} value={value} />
                    ))}
                </form>
            )}
        </div>
    );
}
