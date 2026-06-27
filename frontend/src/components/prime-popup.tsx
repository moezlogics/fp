"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Check, X, Crown, Sparkles, Loader2 } from "lucide-react";

const PLANS = [
    { slug: "semiannual", name: "6 Months", duration: "SemiAnnual", price: 950, months: 6, perMonth: 158, tag: "Popular", tagColor: "bg-primary/15 text-primary" },
    { slug: "annual", name: "1 Year", duration: "Annual", price: 1699, months: 12, perMonth: 142, tag: "Best Value", tagColor: "bg-emerald-50 text-emerald-700" },
];

export function PrimePopup() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);
    const [selected, setSelected] = useState(PLANS[1]);
    const [ready, setReady] = useState(false);

    /* ── Swipe-to-dismiss state ── */
    const sheetRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const currentY = useRef(0);
    const isDragging = useRef(false);

    const checkShouldShow = useCallback(async () => {
        const blocked = ["/prime", "/login", "/register", "/account", "/owner", "/admin", "/moezlogin"];
        if (blocked.some(p => pathname?.startsWith(p))) { setReady(true); return; }

        const lastShown = localStorage.getItem("primePopupLastShown");
        if (lastShown) {
            const d = new Date(parseInt(lastShown));
            const now = new Date();
            if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
                setReady(true); return;
            }
        }

        if (authStatus === "authenticated") {
            try {
                const res = await fetch("/api/subscriptions/me");
                const data = await res.json();
                if (data?.data?.isPrime || data?.isPrime) { setReady(true); return; }
            } catch { /* ignore */ }
        }

        setTimeout(() => {
            setVisible(true);
            localStorage.setItem("primePopupLastShown", Date.now().toString());
        }, 2500);
        setReady(true);
    }, [authStatus, pathname]);

    useEffect(() => { if (authStatus !== "loading") checkShouldShow(); }, [authStatus, checkShouldShow]);

    /* ── Touch handlers for native swipe-to-dismiss ── */
    const onTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        isDragging.current = true;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current || !sheetRef.current) return;
        const delta = e.touches[0].clientY - startY.current;
        currentY.current = Math.max(0, delta); // only allow downward drag
        sheetRef.current.style.transform = `translateY(${currentY.current}px)`;
        sheetRef.current.style.transition = "none";
    };

    const onTouchEnd = () => {
        isDragging.current = false;
        if (!sheetRef.current) return;
        if (currentY.current > 120) {
            dismiss(); // swiped far enough
        } else {
            sheetRef.current.style.transform = "translateY(0)";
            sheetRef.current.style.transition = "transform 0.3s cubic-bezier(.2,.9,.3,1)";
        }
        currentY.current = 0;
    };

    const dismiss = () => setVisible(false);

    const handleUpgrade = () => {
        dismiss();
        const dest = `/prime?checkout=${selected.slug}`;
        setTimeout(() => {
            router.push(authStatus === "authenticated" ? dest : `/account?redirect=${dest}`);
        }, 100);
    };

    if (!ready || !visible) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
            onClick={dismiss}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300" />

            {/* Bottom Sheet */}
            <div
                ref={sheetRef}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className="relative z-10 w-full md:max-w-[420px] bg-white md:rounded-2xl rounded-t-[1.75rem] shadow-2xl animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 fade-in duration-400 ease-out"
                style={{ transition: "transform 0.3s cubic-bezier(.2,.9,.3,1)" }}
            >
                {/* Drag Handle (mobile) */}
                <div className="flex justify-center pt-3 pb-1 md:hidden touch-none">
                    <div className="w-10 h-1 bg-zinc-200 rounded-full" />
                </div>

                {/* Close (desktop) */}
                <button
                    onClick={dismiss}
                    className="absolute top-3 right-3 hidden md:flex w-7 h-7 items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors"
                >
                    <X className="w-3.5 h-3.5 text-zinc-500" />
                </button>

                {/* Content */}
                <div className="px-5 pt-3 pb-5">
                    {/* Header */}
                    <div className="text-center mb-4">
                        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-full px-3 py-1 mb-2.5">
                            <Crown className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] font-bold text-amber-700 tracking-wide uppercase">Prime</span>
                        </div>
                        <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">
                            Unlock <span className="text-primary">Prime</span> Dining
                        </h2>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Save 15% on every meal across Pakistan</p>
                    </div>

                    {/* Plan Cards — Side by Side */}
                    <div className="grid grid-cols-2 gap-2.5 mb-4">
                        {PLANS.map((plan) => {
                            const active = selected.slug === plan.slug;
                            return (
                                <button
                                    key={plan.slug}
                                    onClick={() => setSelected(plan)}
                                    className={`relative text-left p-3 rounded-xl border-2 transition-all duration-200 ${active
                                        ? "border-primary bg-primary/5"
                                        : "border-zinc-100 bg-white hover:border-zinc-200"
                                        }`}
                                >
                                    {/* Tag */}
                                    <span className={`inline-block text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded mb-1.5 ${plan.tagColor}`}>
                                        {plan.tag}
                                    </span>

                                    <p className="text-[11px] font-semibold text-zinc-500">{plan.name}</p>
                                    <p className="text-base font-extrabold text-zinc-900 leading-tight">
                                        Rs. {plan.price.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5">
                                        Rs. {plan.perMonth}/mo
                                    </p>

                                    {/* Radio indicator */}
                                    <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? "border-primary bg-primary" : "border-zinc-200"
                                        }`}>
                                        {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Perks strip */}
                    <div className="flex items-center justify-center gap-3 text-[10px] text-zinc-400 font-medium mb-4">
                        <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" />15% OFF</span>
                        <span className="w-0.5 h-3 bg-zinc-100" />
                        <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" />Zero Fees</span>
                        <span className="w-0.5 h-3 bg-zinc-100" />
                        <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" />2x Coins</span>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={handleUpgrade}
                        className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                        Upgrade Now
                        <Sparkles className="w-4 h-4 text-white/80" />
                    </button>

                    <button
                        onClick={dismiss}
                        className="w-full pt-2.5 pb-0.5 text-zinc-400 font-semibold text-[11px] hover:text-zinc-600 transition-colors text-center"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}
