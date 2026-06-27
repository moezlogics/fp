"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Send, CheckCircle2, ChevronRight, MessageSquare, ShieldCheck, Heart } from "lucide-react";
import { getDeviceId } from "@/lib/utils";

const EMOJIS = [
    { emoji: "😞", label: "Poor", rating: 1, color: "#ef4444" },
    { emoji: "😕", label: "Meh", rating: 2, color: "#f97316" },
    { emoji: "😐", label: "Okay", rating: 3, color: "#eab308" },
    { emoji: "🙂", label: "Good", rating: 4, color: "#22c55e" },
    { emoji: "😍", label: "Love it!", rating: 5, color: "#e8323b" },
];

const COOKIE_DISMISSED = "fpk_review_dismissed";
const COOKIE_DONE = "fpk_review_done";
const SHOW_DELAY_MS = 60000; // 1 min for testing, usually 5 min
const LS_REVIEW_DONE = "fpk_site_review_done";

function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match ? match[2] : null;
}

function setCookie(name: string, value: string, days: number) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function isReviewDone(): boolean {
    if (typeof window === "undefined") return true;
    if (getCookie(COOKIE_DONE)) return true;
    try { return localStorage.getItem(LS_REVIEW_DONE) === "1"; } catch { return false; }
}

function markReviewDone() {
    setCookie(COOKIE_DONE, "1", 365);
    try { localStorage.setItem(LS_REVIEW_DONE, "1"); } catch { }
}

export function ReviewPopup() {
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState<"emojis" | "form" | "done">("emojis");
    const [selectedRating, setSelectedRating] = useState(0);
    const [clickedIdx, setClickedIdx] = useState(-1);
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [celebrate, setCelebrate] = useState(false);

    useEffect(() => {
        if (isReviewDone() || getCookie(COOKIE_DISMISSED)) return;
        
        let mounted = true;
        let timer: NodeJS.Timeout;

        (async () => {
            try {
                const res = await fetch("/api/site-reviews/me");
                const data = await res.json();
                if (data?.hasReviewed) { 
                    markReviewDone(); 
                    return; 
                }
            } catch { /* fallback */ }
            
            if (mounted) {
                timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
            }
        })();

        return () => { 
            mounted = false; 
            if (timer) clearTimeout(timer); 
        };
    }, []);

    const handleDismiss = () => {
        setVisible(false);
        setCookie(COOKIE_DISMISSED, "1", 1);
    };

    const handleEmojiClick = useCallback(async (rating: number, index: number) => {
        setSelectedRating(rating);
        setClickedIdx(index);
        
        if (rating >= 4) setCelebrate(true);

        // Silent submit for the rating part
        const deviceId = getDeviceId();
        try {
            await fetch("/api/site-reviews", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-device-id": deviceId
                },
                body: JSON.stringify({ rating, phone: "", message: "" }),
            });
            markReviewDone();
        } catch (err) {
            console.error("[ReviewPopup] Auto-submit failed:", err);
        }

        setTimeout(() => { 
            setStep("form"); 
            setCelebrate(false); 
        }, 1100);
    }, []);

    const handleFormSubmit = async () => {
        setSubmitting(true);
        const deviceId = getDeviceId();
        try {
            await fetch("/api/site-reviews", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-device-id": deviceId
                },
                body: JSON.stringify({ rating: selectedRating, phone, message }),
            });
            setStep("done");
            setTimeout(() => setVisible(false), 3000);
        } catch {
            setStep("done");
            setTimeout(() => setVisible(false), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    if (!visible) return null;

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes srvSlideIn {
                    0% { transform: translate(-50%, 100%); opacity: 0; }
                    100% { transform: translate(-50%, 0); opacity: 1; }
                }
                @keyframes srvScaleIn {
                    0% { transform: scale(0.9); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes srvPop {
                    0% { transform: scale(0.5); opacity: 0; }
                    70% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes srvFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                @keyframes srvPulse {
                    0% { box-shadow: 0 0 0 0 rgba(232, 50, 59, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(232, 50, 59, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(232, 50, 59, 0); }
                }
                @keyframes srvParticle {
                    0% { transform: translate(0,0) scale(1); opacity: 1; }
                    100% { transform: translate(var(--x), var(--y)) scale(0); opacity: 0; }
                }
                @keyframes srvProgressLine {
                    0% { width: 0%; }
                    100% { width: var(--p); }
                }
            `}} />

            <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px] lg:hidden" onClick={handleDismiss} />

            <div 
                style={{ animation: "srvSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
                className="fixed bottom-0 left-1/2 z-[9999] w-full max-w-[440px] -translate-x-1/2 p-3 lg:bottom-10"
            >
                <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-white/90 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
                    
                    {/* Animated Progress bar */}
                    <div 
                        style={{ 
                            "--p": step === "emojis" ? "33%" : step === "form" ? "66%" : "100%",
                            animation: "srvProgressLine 1s ease forwards" 
                        } as any}
                        className="absolute top-0 left-0 h-1 bg-[#e8323b] transition-all duration-700" 
                    />

                    {/* Header Content */}
                    <div className="p-6 pb-0 flex justify-between items-start">
                        <div className="flex gap-2 items-center">
                            <div className="h-2 w-2 rounded-full bg-[#e8323b] animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Feedback</span>
                        </div>
                        <button 
                            onClick={handleDismiss}
                            className="p-1.5 rounded-full bg-stone-100 text-stone-400 transition-all hover:bg-stone-200 hover:text-stone-600 active:scale-90"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {step === "emojis" && (
                        <div className="p-6 pt-2 text-center">
                            <h3 className="text-xl font-black tracking-tight text-stone-900 mb-1">How&apos;s your experience?</h3>
                            <p className="text-sm text-stone-500 mb-8 font-medium">Your feedback helps us make Foodies Pakistan better.</p>
                            
                            <div className="flex justify-between gap-2 px-2">
                                {EMOJIS.map((e, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleEmojiClick(e.rating, i)}
                                        className="relative group outline-none"
                                        style={{ animation: `srvPop 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) ${i * 0.08}s both` }}
                                    >
                                        <div 
                                            className={`text-4xl transition-all duration-300 ${clickedIdx === i ? 'scale-125' : (clickedIdx !== -1 ? 'scale-75 grayscale opacity-30' : 'hover:scale-125 group-hover:drop-shadow-xl')}`}
                                            style={{ 
                                                filter: clickedIdx === i ? `drop-shadow(0 0 12px ${e.color}40)` : ''
                                            }}
                                        >
                                            {e.emoji}
                                        </div>
                                        <div 
                                            className={`text-[9px] font-black uppercase tracking-tighter mt-2 transition-all duration-500 ${clickedIdx === i ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-50'}`}
                                            style={{ color: e.color }}
                                        >
                                            {e.label}
                                        </div>

                                        {/* Particle burst on selection */}
                                        {clickedIdx === i && (
                                            <div className="absolute inset-0 pointer-events-none">
                                                {[...Array(8)].map((_, pi) => {
                                                    const angle = (pi / 8) * (Math.PI * 2);
                                                    const x = Math.cos(angle) * 40;
                                                    const y = Math.sin(angle) * 40;
                                                    return (
                                                        <div 
                                                            key={pi}
                                                            className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full"
                                                            style={{ 
                                                                "--x": `${x}px`, "--y": `${y}px`,
                                                                backgroundColor: e.color,
                                                                animation: "srvParticle 0.6s ease-out forwards"
                                                            } as any}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === "form" && (
                        <div className="p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="flex items-center gap-4 mb-6 p-4 rounded-[22px] bg-[#e8323b]/5 border border-[#e8323b]/10">
                                <div className="text-4xl animate-bounce" style={{ animationDuration: '2s' }}>
                                    {EMOJIS[selectedRating-1].emoji}
                                </div>
                                <div>
                                    <h4 className="font-black text-stone-900 leading-tight">
                                        {selectedRating >= 4 ? "That's amazing! 💚" : "Thanks for sharing."}
                                    </h4>
                                    <p className="text-xs text-stone-500">Briefly share your thoughts (Optional)</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="relative group">
                                    <input 
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="Phone Number (Optional)"
                                        className="w-full h-12 rounded-2xl border border-stone-100 bg-stone-50/50 px-4 text-sm font-medium outline-none transition-all group-focus-within:border-[#e8323b] group-focus-within:bg-white group-focus-within:ring-4 group-focus-within:ring-[#e8323b]/10"
                                    />
                                </div>
                                <div className="relative group">
                                    <textarea 
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        placeholder="Tell us what we can improve..."
                                        rows={3}
                                        className="w-full resize-none rounded-2xl border border-stone-100 bg-stone-50/50 p-4 text-sm font-medium outline-none transition-all group-focus-within:border-[#e8323b] group-focus-within:bg-white group-focus-within:ring-4 group-focus-within:ring-[#e8323b]/10"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleFormSubmit}
                                disabled={submitting}
                                className="mt-6 flex w-full h-12 items-center justify-center gap-2 rounded-2xl bg-[#e8323b] font-black text-white shadow-[0_8px_24px_-4px_rgba(232, 50, 59,0.4)] transition-all hover:brightness-105 active:scale-95 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                ) : (
                                    <>
                                        <span>Submit Feedback</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {step === "done" && (
                        <div className="p-8 pb-10 text-center animate-in zoom-in-95 duration-500">
                            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-emerald-50 text-[#e8323b] border-4 border-white shadow-xl">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <h3 className="text-2xl font-black tracking-tight text-stone-900 mb-2">Shukriya!</h3>
                            <p className="text-sm text-stone-500 px-4 leading-relaxed font-medium">
                                Your feedback has been received. We&apos;re committed to making your experience unforgettable.
                            </p>
                            
                            <div className="mt-8 flex justify-center gap-4">
                                <div className="p-3 bg-stone-50 rounded-2xl flex items-center gap-2 border border-stone-100 shadow-sm">
                                    <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
                                    <span className="text-[10px] font-black uppercase text-stone-400">Team Foodies Pak</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bottom safety bar */}
                    <div className="h-2 bg-stone-50/50" />
                </div>
            </div>
        </>
    );
}
