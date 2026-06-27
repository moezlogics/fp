"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    CreditCard, Plus, Trash2, Shield, Star, Loader2, X, CheckCircle2, ArrowLeft
} from "lucide-react";

const CARD_BRANDS: Record<string, { color: string; gradient: string; icon: string }> = {
    visa: { color: "#1A1F71", gradient: "linear-gradient(135deg, #1A1F71, #2D3FBF)", icon: "💳" },
    mastercard: { color: "#EB001B", gradient: "linear-gradient(135deg, #EB001B, #F79E1B)", icon: "💳" },
    paypak: { color: "#006B3F", gradient: "linear-gradient(135deg, #006B3F, #00A86B)", icon: "🏛️" },
    unionpay: { color: "#034694", gradient: "linear-gradient(135deg, #034694, #E21836)", icon: "💳" },
    amex: { color: "#2E77BB", gradient: "linear-gradient(135deg, #2E77BB, #1E5799)", icon: "💳" },
    other: { color: "#666", gradient: "linear-gradient(135deg, #666, #999)", icon: "💳" },
};

interface SavedCard {
    _id: string;
    cardNickname: string;
    maskedCardNumber: string;
    cardBrand: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
    isVerified: boolean;
    createdAt: string;
}

export default function PaymentMethodsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [cards, setCards] = useState<SavedCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [nickname, setNickname] = useState("");
    const [initiating, setInitiating] = useState(false);
    const [msg, setMsg] = useState({ text: "", type: "" as "success" | "error" | "" });
    const formRef = useRef<HTMLFormElement>(null);
    const [redirectData, setRedirectData] = useState<{ redirectUrl: string; formData: Record<string, string> } | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/account");
    }, [status, router]);

    useEffect(() => {
        if (session?.user) fetchCards();
    }, [session]);

    useEffect(() => {
        if (redirectData && formRef.current) formRef.current.submit();
    }, [redirectData]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("saved") === "1") {
            setMsg({ text: "Card saved successfully. You can now use it for faster checkout.", type: "success" });
            fetchCards();
        } else if (params.get("failed") === "1") {
            setMsg({ text: params.get("reason") || "Card verification failed. Please try again.", type: "error" });
        }
    }, []);

    const fetchCards = async () => {
        try {
            const res = await fetch("/api/payment-methods/me");
            const data = await res.json();
            if (data.data) setCards(data.data);
        } catch (err) {
            console.error("Failed to fetch cards:", err);
        }
        setLoading(false);
    };

    const initiateAddCard = async () => {
        if (!nickname.trim()) {
            setMsg({ text: "Please enter a card nickname", type: "error" });
            return;
        }
        setInitiating(true);
        setMsg({ text: "", type: "" });
        try {
            const res = await fetch("/api/payment-methods/me/initiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname: nickname.trim() }),
            });
            const data = await res.json();
            if (data.data?.redirectUrl) {
                sessionStorage.setItem("cardNickname", nickname.trim());
                setRedirectData({ redirectUrl: data.data.redirectUrl, formData: data.data.formData || {} });
            } else {
                setMsg({ text: data.error || "Failed to initiate card verification", type: "error" });
            }
        } catch {
            setMsg({ text: "Network error. Please try again.", type: "error" });
        }
        setInitiating(false);
    };

    const deleteCard = async (cardId: string) => {
        if (!confirm("Remove this card? This action cannot be undone.")) return;
        try {
            const res = await fetch(`/api/payment-methods/me/${cardId}`, { method: "DELETE" });
            const data = await res.json();
            if (res.ok) {
                setCards((prev) => prev.filter((c) => c._id !== cardId));
                setMsg({ text: "Card removed successfully", type: "success" });
            } else {
                setMsg({ text: data.error || "Failed to remove card", type: "error" });
            }
        } catch {
            setMsg({ text: "Network error", type: "error" });
        }
    };

    const setDefault = async (cardId: string) => {
        try {
            const res = await fetch(`/api/payment-methods/me/${cardId}/default`, { method: "PATCH" });
            if (res.ok) {
                setCards((prev) => prev.map((c) => ({ ...c, isDefault: c._id === cardId })));
                setMsg({ text: "Default card updated", type: "success" });
            }
        } catch {
            setMsg({ text: "Failed to set default", type: "error" });
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] pb-24 md:pb-8">
            {/* ═══ Compact App Header ═══ */}
            <div className="sticky top-0 z-50 border-b border-stone-100 bg-white/90 shadow-sm backdrop-blur-lg">
                <div className="mx-auto flex h-12 max-w-lg items-center gap-3 px-4">
                    <Link href="/account" className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <h1 className="text-sm font-black tracking-tight text-stone-900">Payment Methods</h1>
                </div>
            </div>

            <div className="mx-auto max-w-lg space-y-4 px-4 pt-5">
                <p className="text-[11px] leading-relaxed text-stone-400">
                    Securely save your debit/credit cards for faster checkout without entering details every time.
                </p>

                {/* Messages */}
                {msg.text && (
                    <div className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-[12px] font-medium ${msg.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-600"
                        }`}>
                        <span>{msg.text}</span>
                        <button onClick={() => setMsg({ text: "", type: "" })} className="ml-2 rounded p-0.5 transition hover:bg-black/5">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}

                {/* Saved Cards */}
                {cards.length > 0 ? (
                    <div className="space-y-3">
                        {cards.map((card) => {
                            const brandInfo = CARD_BRANDS[card.cardBrand] || CARD_BRANDS.other;
                            return (
                                <div
                                    key={card._id}
                                    className="overflow-hidden rounded-[18px] bg-white transition-all"
                                    style={{ border: card.isDefault ? "2px solid #10b981" : "1px solid #f0f0f0" }}
                                >
                                    {/* Card Visual — compact */}
                                    <div style={{ background: brandInfo.gradient }} className="relative px-4 py-4 text-white">
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-60 mix-blend-overlay" />
                                        <div className="relative z-10 flex items-start justify-between">
                                            <div>
                                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-75">{card.cardBrand}</div>
                                                <div className="mt-1 font-mono text-base tracking-[0.15em]" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
                                                    {card.maskedCardNumber.replace(/X/g, '• ')}
                                                </div>
                                            </div>
                                            <span className="text-xl drop-shadow">{brandInfo.icon}</span>
                                        </div>
                                        <div className="relative z-10 mt-3 flex items-end justify-between">
                                            <span className="text-[12px] font-medium tracking-wide drop-shadow">{card.cardNickname}</span>
                                            <span className="font-mono text-[10px] tracking-wider opacity-85">
                                                {String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}
                                            </span>
                                        </div>
                                        {card.isDefault && (
                                            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-white/20 bg-white/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider backdrop-blur-sm">
                                                <Star className="h-2.5 w-2.5" fill="#fff" /> DEFAULT
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions — compact */}
                                    <div className="flex items-center justify-between bg-white px-4 py-2.5">
                                        <div className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
                                            <CheckCircle2 className="h-3 w-3" /> Verified
                                        </div>
                                        <div className="flex gap-1.5">
                                            {!card.isDefault && (
                                                <button onClick={() => setDefault(card._id)} className="flex items-center gap-1 rounded-lg bg-stone-50 px-2.5 py-1.5 text-[10px] font-bold text-stone-500 transition hover:bg-stone-100">
                                                    <Star className="h-3 w-3" /> Default
                                                </button>
                                            )}
                                            <button onClick={() => deleteCard(card._id)} className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-500 transition hover:bg-red-100">
                                                <Trash2 className="h-3 w-3" /> Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center rounded-[20px] border border-stone-100 bg-white px-6 py-8 text-center shadow-sm">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-50">
                            <CreditCard className="h-6 w-6 text-stone-300" />
                        </div>
                        <h3 className="text-sm font-bold text-stone-900">No saved cards</h3>
                        <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-stone-400">
                            Add a debit or credit card for faster, 1-click checkout experiences.
                        </p>
                    </div>
                )}

                {/* Add Card */}
                {cards.length < 5 && (
                    <>
                        {!showAdd ? (
                            <button
                                onClick={() => setShowAdd(true)}
                                className="flex w-full flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed border-primary/40 p-4 font-bold text-primary transition hover:border-primary hover:bg-primary/[0.03]"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                                    <Plus className="h-4 w-4 text-primary" />
                                </div>
                                <span className="text-[12px]">Add Debit / Credit Card</span>
                            </button>
                        ) : (
                            <div className="space-y-3 rounded-[18px] border border-stone-100 bg-white p-4 shadow-sm" style={{ animation: "rmFadeIn 0.25s ease" }}>
                                <style dangerouslySetInnerHTML={{ __html: `@keyframes rmFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }` }} />

                                <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <CreditCard className="h-3.5 w-3.5" />
                                    </div>
                                    Add New Card
                                </h3>

                                <p className="rounded-xl border border-stone-100 bg-stone-50 p-2.5 text-[11px] leading-relaxed text-stone-500">
                                    You'll be redirected to a secure page to enter card details. A Rs. 1.00 verification charge will be reversed immediately.
                                </p>

                                <div>
                                    <label className="mb-1 block text-[11px] font-bold text-stone-500">Card Nickname</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., My HBL Visa, Meezan Debit"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        maxLength={50}
                                        className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-[13px] outline-none transition focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                                    />
                                    <p className="ml-0.5 mt-1 text-[10px] text-stone-300">A friendly name to identify this card</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-stone-100 bg-stone-50 p-2.5">
                                    <span className="mr-1 text-[9px] font-bold uppercase tracking-wider text-stone-300">Supported</span>
                                    {["VISA", "Mastercard", "PayPak", "UnionPay"].map((brand) => (
                                        <span key={brand} className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-500 shadow-sm">
                                            {brand}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => { setShowAdd(false); setNickname(""); }}
                                        className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[12px] font-bold text-stone-500 transition hover:bg-stone-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={initiateAddCard}
                                        disabled={initiating}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[12px] font-bold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60"
                                    >
                                        {initiating ? (
                                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...</>
                                        ) : (
                                            <><Shield className="h-3.5 w-3.5" /> Add Card Securely</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Security Notice */}
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-100/50 bg-emerald-50/40 p-3 text-[10px] leading-relaxed text-emerald-700">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <div>
                        <strong className="font-bold">256-bit Secure Encryption.</strong> Card details are entered on PCI-DSS compliant secure servers. We never see or store your full card number — only an encrypted token is saved.
                    </div>
                </div>
            </div>

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
