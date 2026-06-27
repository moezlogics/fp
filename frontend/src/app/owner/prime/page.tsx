"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    BadgeCheck,
    Crown,
    ExternalLink,
    Loader2,
    ShieldCheck,
    Sparkles,
    Star,
    TrendingUp,
} from "lucide-react";
import { useBranch } from "../owner-shell";

interface BranchPlan {
    slug: "prime" | "featured";
    name: string;
    description: string;
    pricePaisa: number;
    priceRs: number;
    durationMonths: number;
    billingCycle: string;
    features: {
        zeroPlatformFee: boolean;
        primeBadge: boolean;
        featuredPlacement: boolean;
        verifiedBadge: boolean;
        leadBoost: boolean;
    };
}

interface BranchSubscription {
    _id: string;
    planSlug: "prime" | "featured";
    planName: string;
    status: "Pending" | "Active" | "Failed" | "Cancelled" | "Expired";
    validFrom: string;
    validTo: string;
    amountPaisa: number;
}

const featureCopy: Record<string, { icon: any; label: string; detail: string }> = {
    zeroPlatformFee: { icon: TrendingUp, label: "0% platform commission", detail: "FoodiePay fee is waived on this branch." },
    primeBadge: { icon: Crown, label: "Prime crown badge", detail: "Shows crown badge across branch surfaces." },
    featuredPlacement: { icon: Star, label: "Featured placement", detail: "Branch is pushed higher in city and area listings." },
    verifiedBadge: { icon: BadgeCheck, label: "Blue verified tick", detail: "Adds a verified trust signal on public branch cards." },
    leadBoost: { icon: Sparkles, label: "More leads", detail: "Priority exposure improves discovery for this branch." },
};

function formatMoney(paisa: number) {
    return `Rs. ${(paisa / 100).toLocaleString("en-PK")}`;
}

export default function OwnerPrimePage() {
    const { branch } = useBranch();
    const searchParams = useSearchParams();
    const formRef = useRef<HTMLFormElement>(null);
    const [plans, setPlans] = useState<BranchPlan[]>([]);
    const [activeSubscription, setActiveSubscription] = useState<BranchSubscription | null>(null);
    const [recentSubscriptions, setRecentSubscriptions] = useState<BranchSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [submittingPlan, setSubmittingPlan] = useState<string>("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [redirectData, setRedirectData] = useState<{ redirectUrl: string; formData: Record<string, string> } | null>(null);

    const status = searchParams.get("status");

    useEffect(() => {
        if (!redirectData || !formRef.current) return;
        formRef.current.submit();
    }, [redirectData]);

    useEffect(() => {
        if (status === "success") {
            setMessage("Branch plan payment received. Benefits are now active on this branch.");
        } else if (status === "failed") {
            setError(searchParams.get("reason") || "Branch plan payment did not complete.");
        }
    }, [searchParams, status]);

    useEffect(() => {
        if (!branch?._id) return;

        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                const [plansRes, meRes] = await Promise.all([
                    fetch("/api/owner/prime/plans"),
                    fetch(`/api/owner/prime/me?restaurantId=${branch._id}`),
                ]);

                const plansData = await plansRes.json();
                const meData = await meRes.json();

                if (cancelled) return;

                setPlans(plansData?.data || plansData || []);
                const payload = meData?.data || meData || {};
                setActiveSubscription(payload.activeSubscription || null);
                setRecentSubscriptions(payload.recentSubscriptions || []);
            } catch {
                if (!cancelled) {
                    setError("Unable to load branch Prime plans right now.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [branch?._id]);

    const branchName = useMemo(() => {
        if (!branch) return "your branch";
        return [branch.brandName, branch.branchName].filter(Boolean).join(" - ");
    }, [branch]);

    async function handleBuy(planSlug: string) {
        if (!branch?._id) return;
        try {
            setSubmittingPlan(planSlug);
            setError("");
            setMessage("");

            const res = await fetch("/api/owner/prime/me", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ restaurantId: branch._id, planSlug }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Unable to start branch plan checkout.");
                return;
            }

            if (data?.data?.payment?.redirectUrl) {
                setRedirectData({
                    redirectUrl: data.data.payment.redirectUrl,
                    formData: data.data.payment.formData || {},
                });
                return;
            }

            setMessage("Branch plan activated.");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSubmittingPlan("");
        }
    }

    async function handleCancel() {
        if (!branch?._id) return;
        try {
            const res = await fetch("/api/owner/prime/me/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ restaurantId: branch._id }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Unable to cancel branch plan.");
                return;
            }

            setMessage(data?.data?.message || "Branch plan cancelled.");
            setActiveSubscription((current) => current ? { ...current, status: "Cancelled" } : current);
        } catch {
            setError("Network error. Please try again.");
        }
    }

    if (!branch) return null;

    return (
        <div className="mx-auto max-w-5xl space-y-5">
            <form ref={formRef} method="POST" action={redirectData?.redirectUrl || ""} className="hidden">
                {redirectData &&
                    Object.entries(redirectData.formData).map(([key, value]) => (
                        <input key={key} type="hidden" name={key} value={value} />
                    ))}
            </form>

            <div className="rounded-[28px] border border-primary/10 bg-white p-5 shadow-[0_20px_50px_rgba(232, 50, 59,0.08)] md:p-7">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                            <Crown className="h-3.5 w-3.5" />
                            Branch Prime
                        </div>
                        <h1 className="mt-3 text-2xl font-black tracking-tight text-zinc-950 md:text-3xl">
                            Grow one branch at a time
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-zinc-600">
                            Branch plans are private to the owner portal. Each branch buys and keeps its own visibility,
                            commission, featured ranking, and trust badges.
                        </p>
                        <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700">
                            Active branch: <span className="text-zinc-950">{branchName}</span>
                        </div>
                    </div>

                    <div className="min-w-[260px] rounded-[24px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-secondary p-5 text-white shadow-xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">Current branch state</p>
                        <div className="mt-4 flex items-center gap-3">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${activeSubscription ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/70"}`}>
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-lg font-black">{activeSubscription ? activeSubscription.planName : "No active branch plan"}</p>
                                <p className="text-xs text-white/60">
                                    {activeSubscription
                                        ? `Valid until ${new Date(activeSubscription.validTo).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}`
                                        : "Buy a plan to unlock branch-only growth features."}
                                </p>
                            </div>
                        </div>
                        {activeSubscription && (
                            <button
                                onClick={handleCancel}
                                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/15"
                                type="button"
                            >
                                Cancel after current cycle
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {message && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
            {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {plans.map((plan) => {
                        const featured = plan.slug === "featured";
                        const isCurrent = activeSubscription?.planSlug === plan.slug && activeSubscription?.status === "Active";

                        return (
                            <div
                                key={plan.slug}
                                className={`relative overflow-hidden rounded-[28px] border p-5 shadow-sm transition ${featured ? "border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50" : "border-primary/10 bg-gradient-to-br from-white via-primary/5 to-white"}`}
                            >
                                {featured && (
                                    <div className="absolute right-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                        Top Pick
                                    </div>
                                )}

                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">{plan.billingCycle}</p>
                                        <h2 className="mt-2 text-2xl font-black text-zinc-950">{plan.name}</h2>
                                        <p className="mt-2 text-sm leading-6 text-zinc-600">{plan.description}</p>
                                    </div>
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${featured ? "bg-blue-600 text-white" : "bg-primary/50 text-white"}`}>
                                        {featured ? <BadgeCheck className="h-6 w-6" /> : <Crown className="h-6 w-6" />}
                                    </div>
                                </div>

                                <div className="mt-6 flex items-end justify-between gap-4">
                                    <div>
                                        <p className="text-3xl font-black tracking-tight text-zinc-950">Rs. {plan.priceRs.toLocaleString("en-PK")}</p>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Per branch / month</p>
                                    </div>
                                    {isCurrent && (
                                        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                                            Active
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 space-y-3">
                                    {Object.entries(plan.features)
                                        .filter(([, enabled]) => enabled)
                                        .map(([featureKey]) => {
                                            const feature = featureCopy[featureKey];
                                            if (!feature) return null;
                                            const Icon = feature.icon;
                                            return (
                                                <div key={featureKey} className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/80 px-3.5 py-3 shadow-sm">
                                                    <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${featured ? "bg-blue-50 text-blue-600" : "bg-primary/5 text-primary"}`}>
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-zinc-900">{feature.label}</p>
                                                        <p className="text-xs leading-5 text-zinc-500">{feature.detail}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>

                                <button
                                    type="button"
                                    disabled={Boolean(activeSubscription && activeSubscription.status === "Active") || submittingPlan === plan.slug}
                                    onClick={() => handleBuy(plan.slug)}
                                    className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition ${featured ? "bg-blue-600 hover:bg-blue-700" : "bg-primary/50 hover:bg-primary-dark"} disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                    {submittingPlan === plan.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                                    {isCurrent ? "Current Plan" : "Buy for This Branch"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="rounded-[24px] border border-zinc-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500">Recent branch plan activity</h3>
                <div className="mt-4 space-y-3">
                    {recentSubscriptions.length === 0 ? (
                        <p className="text-sm text-zinc-500">No branch plan activity yet.</p>
                    ) : (
                        recentSubscriptions.map((subscription) => (
                            <div key={subscription._id} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 px-4 py-3">
                                <div>
                                    <p className="text-sm font-black text-zinc-900">{subscription.planName}</p>
                                    <p className="text-xs text-zinc-500">
                                        {formatMoney(subscription.amountPaisa)} • {new Date(subscription.validFrom).toLocaleDateString("en-PK")} to {new Date(subscription.validTo).toLocaleDateString("en-PK")}
                                    </p>
                                </div>
                                <div className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-700">
                                    {subscription.status}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <p className="mt-4 text-xs leading-5 text-zinc-500">
                    Each branch subscription is isolated. Buying a plan for one branch does not affect other branches in the same brand.
                    FoodiePay customer checkout still shows restaurant commission context, but branch commission waiver is deducted from merchant settlement, not added to the diner total.
                </p>
                <Link href="/owner/settlements" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-primary">
                    View wallet and settlement impact
                    <ExternalLink className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}
