"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    ChevronRight,
    Coins,
    CreditCard,
    Crown,
    Loader2,
    Plus,
    Shield,
    Tag,
} from "lucide-react";

interface BillData {
    _id: string;
    reservationId: string;
    restaurantId: string | { _id: string; name?: string; brandName?: string };
    paymentMode: string;
    originalBillPaisa: number;
    yieldDiscountPaisa: number;
    primeDiscountPaisa: number;
    bankDiscountPaisa: number;
    coinsDiscountPaisa: number;
    totalDiscountPaisa: number;
    finalAmountPaisa: number;
    platformFeePaisa?: number;
    status: string;
    expiresAt?: string | null;
}

interface SavedCard {
    _id: string;
    cardNickname: string;
    maskedCardNumber: string;
    cardBrand: string;
    isDefault: boolean;
}

interface BillBreakdown {
    originalBillPaisa: number;
    yieldDiscountPaisa: number;
    subscriptionDiscountPaisa: number;
    bankDiscountPaisa: number;
    coinDiscountPaisa: number;
    totalDiscountPaisa: number;
    amountToPayPaisa: number;
    coinsToEarn: number;
    platformFeeRate?: number;
    effectivePlatformFeePaisa?: number;
    isPrimePartner?: boolean;
}

const CARD_BRANDS: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    paypak: "PayPak",
    unionpay: "UnionPay",
    amex: "Amex",
};

function formatRs(paisa: number) {
    return `Rs. ${(paisa / 100).toLocaleString("en-PK", { minimumFractionDigits: 0 })}`;
}

export default function FoodiePayCheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const billId = searchParams.get("billId");
    const reservationId = searchParams.get("reservation");
    const formRef = useRef<HTMLFormElement>(null);

    const [bill, setBill] = useState<BillData | null>(null);
    const [breakdown, setBreakdown] = useState<BillBreakdown | null>(null);
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [payMethod, setPayMethod] = useState<"saved" | "new">("new");
    const [selectedCard, setSelectedCard] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [applyCoins, setApplyCoins] = useState(false);
    const [loading, setLoading] = useState(true);
    const [recalculating, setRecalculating] = useState(false);
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState("");
    const [redirectData, setRedirectData] = useState<{
        redirectUrl: string;
        formData: Record<string, string>;
    } | null>(null);

    const cardBin = cardNumber.replace(/\D/g, "").slice(0, 6);
    const effectiveRestaurantName =
        typeof bill?.restaurantId === "string"
            ? "Restaurant"
            : bill?.restaurantId?.name || bill?.restaurantId?.brandName || "Restaurant";

    useEffect(() => {
        if (redirectData && formRef.current) {
            formRef.current.submit();
        }
    }, [redirectData]);

    useEffect(() => {
        let cancelled = false;

        async function bootstrap() {
            try {
                setLoading(true);
                setError("");

                const [billResponse, cardsResponse] = await Promise.all([
                    resolveBill(),
                    fetch("/api/payment-methods/me"),
                ]);

                if (cancelled) return;

                if (!billResponse.ok) {
                    const billError = await billResponse.json().catch(() => ({}));
                    setError(billError.error || "Bill not found or expired.");
                    return;
                }

                const billData = await billResponse.json();
                const normalizedBill = billData?.bill || billData;
                setBill(normalizedBill);
                setBreakdown({
                    originalBillPaisa: normalizedBill.originalBillPaisa,
                    yieldDiscountPaisa: normalizedBill.yieldDiscountPaisa || 0,
                    subscriptionDiscountPaisa: normalizedBill.primeDiscountPaisa || 0,
                    bankDiscountPaisa: normalizedBill.bankDiscountPaisa || 0,
                    coinDiscountPaisa: normalizedBill.coinsDiscountPaisa || 0,
                    totalDiscountPaisa: normalizedBill.totalDiscountPaisa || 0,
                    amountToPayPaisa: normalizedBill.finalAmountPaisa || normalizedBill.originalBillPaisa,
                    coinsToEarn: 0,
                    effectivePlatformFeePaisa: normalizedBill.platformFeePaisa || 0,
                    platformFeeRate: normalizedBill.platformFeePaisa ? ((normalizedBill.platformFeePaisa / normalizedBill.originalBillPaisa) * 100) : 0,
                    isPrimePartner: false,
                });

                if (cardsResponse.ok) {
                    const cardsData = await cardsResponse.json();
                    const cards = cardsData?.data || cardsData || [];
                    setSavedCards(cards);
                    const defaultCard = cards.find((card: SavedCard) => card.isDefault);
                    if (defaultCard) {
                        setSelectedCard(defaultCard._id);
                        setPayMethod("saved");
                    }
                }
            } catch {
                if (!cancelled) {
                    setError("Unable to load checkout right now.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        bootstrap();
        return () => {
            cancelled = true;
        };
    }, [billId, reservationId]);

    useEffect(() => {
        if (!bill?._id) return;

        const timeout = window.setTimeout(async () => {
            try {
                setRecalculating(true);
                const res = await fetch("/api/escrow/calculate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        billId: bill._id,
                        cardBin: payMethod === "new" && cardBin.length === 6 ? cardBin : undefined,
                        applyCoins,
                    }),
                });

                const data = await res.json();
                if (!res.ok) {
                    setError(data.error || "Unable to refresh totals.");
                    return;
                }

                setBreakdown(data.breakdown);
                setError("");
            } catch {
                setError("Unable to refresh totals.");
            } finally {
                setRecalculating(false);
            }
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [applyCoins, bill?._id, cardBin, payMethod]);

    async function resolveBill() {
        if (billId) {
            return fetch(`/api/bills/${billId}`);
        }

        if (reservationId) {
            return fetch(`/api/user/reservations/${reservationId}/bill`);
        }

        return new Response(JSON.stringify({ error: "Bill reference missing." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    async function handlePay() {
        if (!bill || !breakdown) return;

        try {
            setPaying(true);
            setError("");

            const res = await fetch("/api/escrow/initiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    billId: bill._id,
                    applyCoins,
                    cardBin: payMethod === "new" && cardBin.length === 6 ? cardBin : undefined,
                    savedCardId: payMethod === "saved" ? selectedCard : undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Payment initiation failed.");
                return;
            }

            if (data.payment?.redirectUrl) {
                setRedirectData({
                    redirectUrl: data.payment.redirectUrl,
                    formData: data.payment.formData || {},
                });
                return;
            }

            router.push(`/payment/success?ref=${encodeURIComponent(data.payment?.txnRefNo || "")}&kind=foodiepay`);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setPaying(false);
        }
    }

    const activeBreakdown = breakdown || {
        originalBillPaisa: bill?.originalBillPaisa || 0,
        yieldDiscountPaisa: bill?.yieldDiscountPaisa || 0,
        subscriptionDiscountPaisa: bill?.primeDiscountPaisa || 0,
        bankDiscountPaisa: bill?.bankDiscountPaisa || 0,
        coinDiscountPaisa: bill?.coinsDiscountPaisa || 0,
        totalDiscountPaisa: bill?.totalDiscountPaisa || 0,
        amountToPayPaisa: bill?.finalAmountPaisa || 0,
        coinsToEarn: 0,
        effectivePlatformFeePaisa: bill?.platformFeePaisa || 0,
        platformFeeRate: bill?.platformFeePaisa ? ((bill.platformFeePaisa / bill.originalBillPaisa) * 100) : 0,
        isPrimePartner: false,
    };

    const bankEligibilityMessage =
        payMethod === "saved"
            ? "Saved cards are charged securely. Restaurant bank offers are pre-validated on new-card checkout."
            : cardBin.length < 6
                ? "Enter the first 6 digits of your card to check restaurant bank deals."
                : activeBreakdown.bankDiscountPaisa > 0
                    ? `Eligible bank offer applied. You save ${formatRs(activeBreakdown.bankDiscountPaisa)}.`
                    : "This card is not eligible for a restaurant bank offer on this bill.";

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-gray-500">Loading FoodiePay checkout...</p>
                </div>
            </div>
        );
    }

    if (!bill) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">
                <div className="max-w-md rounded-[24px] border border-red-100 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                        <AlertTriangle className="h-8 w-8 text-red-400" />
                    </div>
                    <h1 className="text-lg font-bold text-gray-900">Checkout unavailable</h1>
                    <p className="mt-2 text-sm text-gray-500">{error || "This bill is not available for payment."}</p>
                    <button
                        onClick={() => router.push("/my-bookings")}
                        className="mt-6 rounded-xl bg-primary/50 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark"
                    >
                        Go to My Bookings
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] pb-24 md:pb-8">
            <div className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 shadow-sm backdrop-blur-md">
                <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
                    <button
                        onClick={() => router.push("/my-bookings")}
                        className="rounded-full p-2 -ml-2 transition-colors hover:bg-gray-50 active:scale-95"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-700" />
                    </button>
                    <h1 className="text-lg font-bold tracking-tight text-gray-900">FoodiePay Checkout</h1>
                </div>
            </div>

            <div className="mx-auto max-w-lg space-y-5 px-4 pt-6">
                {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-[13px] font-medium text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {bill.status !== "Pending" && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-[13px] font-medium text-primary">
                        This bill is currently marked as <strong>{bill.status}</strong>. You can only pay pending bills.
                    </div>
                )}

                <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">Dining at</p>
                    <h2 className="text-lg font-bold text-gray-900">{effectiveRestaurantName}</h2>
                    <p className="mt-1 text-xs text-gray-400">
                        Bill reference #{bill._id.slice(-8).toUpperCase()}
                        {bill.expiresAt ? ` · Expires ${new Date(bill.expiresAt).toLocaleString("en-PK")}` : ""}
                    </p>
                </div>

                <div
                    className="relative overflow-hidden rounded-[22px] p-6 text-white shadow-lg"
                    style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 55%, #1d4ed8 100%)" }}
                >
                    <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/3 -translate-y-1/2 rounded-full bg-blue-400/20 blur-3xl" />
                    <p className="relative z-10 mb-4 text-[11px] font-bold uppercase tracking-widest text-white/50">Bill Summary</p>
                    <div className="relative z-10 flex items-center justify-between text-sm text-white/70">
                        <span>Restaurant Bill</span>
                        <span className="text-xl font-bold text-white">{formatRs(activeBreakdown.originalBillPaisa)}</span>
                    </div>

                    <div className="relative z-10 mt-4 space-y-2 border-t border-white/10 pt-3">
                        <DiscountRow icon={<Tag className="h-3.5 w-3.5" />} label="Table Deal" amount={activeBreakdown.yieldDiscountPaisa} color="#4ade80" />
                        <DiscountRow icon={<Crown className="h-3.5 w-3.5" />} label="Prime" amount={activeBreakdown.subscriptionDiscountPaisa} color="#fbbf24" />
                        <DiscountRow icon={<Building2 className="h-3.5 w-3.5" />} label="Bank" amount={activeBreakdown.bankDiscountPaisa} color="#60a5fa" />
                        <DiscountRow icon={<Coins className="h-3.5 w-3.5" />} label="Foodie Coins" amount={activeBreakdown.coinDiscountPaisa} color="#c084fc" />
                    </div>

                    <div className="relative z-10 mt-5 flex items-center justify-between border-t-2 border-emerald-500/50 pt-4">
                        <span className="text-sm font-bold uppercase tracking-wide text-emerald-400">You Pay</span>
                        <span className="text-3xl font-black text-emerald-400">{formatRs(activeBreakdown.amountToPayPaisa)}</span>
                    </div>
                    <div className="relative z-10 mt-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 text-[11px] text-white/72">
                        <div className="flex items-center justify-between gap-3">
                            <span>Restaurant platform commission</span>
                            <span className="font-bold text-white">
                                {activeBreakdown.isPrimePartner
                                    ? "Waived"
                                    : formatRs(activeBreakdown.effectivePlatformFeePaisa || 0)}
                            </span>
                        </div>
                        <p className="mt-1 text-[10px] text-white/55">
                            This fee is deducted from merchant settlement and is not added on top of your bill total.
                        </p>
                    </div>

                    {recalculating && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 backdrop-blur-[1px]">
                            <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                    )}
                </div>

                <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">Eligibility</p>
                    <div className="space-y-3 text-[13px]">
                        <div className="flex items-start gap-3">
                            <Tag className="mt-0.5 h-4 w-4 text-emerald-500" />
                            <span className={activeBreakdown.yieldDiscountPaisa > 0 ? "text-emerald-700" : "text-gray-500"}>
                                {activeBreakdown.yieldDiscountPaisa > 0
                                    ? `Table deal applied: ${formatRs(activeBreakdown.yieldDiscountPaisa)} saved.`
                                    : "No table-deal discount is active on this bill."}
                            </span>
                        </div>
                        <div className="flex items-start gap-3">
                            <Crown className="mt-0.5 h-4 w-4 text-primary" />
                            <span className={activeBreakdown.subscriptionDiscountPaisa > 0 ? "text-primary-dark" : "text-gray-500"}>
                                {activeBreakdown.subscriptionDiscountPaisa > 0
                                    ? `Prime applied: ${formatRs(activeBreakdown.subscriptionDiscountPaisa)} saved.`
                                    : "Prime discount is not active for this bill."}
                            </span>
                        </div>
                        <div className="flex items-start gap-3">
                            <Building2 className="mt-0.5 h-4 w-4 text-blue-500" />
                            <span className={activeBreakdown.bankDiscountPaisa > 0 ? "text-blue-700" : "text-gray-500"}>
                                {bankEligibilityMessage}
                            </span>
                        </div>
                        <div className="flex items-start gap-3">
                            <Coins className="mt-0.5 h-4 w-4 text-violet-500" />
                            <span className={applyCoins && activeBreakdown.coinDiscountPaisa > 0 ? "text-violet-700" : "text-gray-500"}>
                                {applyCoins
                                    ? activeBreakdown.coinDiscountPaisa > 0
                                        ? `Coins applied: ${formatRs(activeBreakdown.coinDiscountPaisa)} saved.`
                                        : "Coins toggle is on, but no eligible coin balance could be applied."
                                    : "Foodie Coins are currently off for this payment."}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                                <Coins className="h-5 w-5 text-violet-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">Use Foodie Coins</p>
                                <p className="text-[11px] text-gray-400">Apply your eligible loyalty balance</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setApplyCoins((current) => !current)}
                            className="relative h-7 w-12 rounded-full transition-colors"
                            style={{ backgroundColor: applyCoins ? "#8b5cf6" : "#d1d5db" }}
                        >
                            <div
                                className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-md transition-all"
                                style={{ left: applyCoins ? 25 : 3 }}
                            />
                        </button>
                    </div>
                </div>

                <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">Payment Method</p>

                    {savedCards.length > 0 && (
                        <div className="mb-3 space-y-2.5">
                            {savedCards.map((card) => (
                                <label
                                    key={card._id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-all ${
                                        selectedCard === card._id && payMethod === "saved"
                                            ? "border-primary bg-primary/5"
                                            : "border-gray-100 hover:border-gray-200"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="payMethod"
                                        checked={selectedCard === card._id && payMethod === "saved"}
                                        onChange={() => {
                                            setSelectedCard(card._id);
                                            setPayMethod("saved");
                                        }}
                                        className="accent-primary"
                                    />
                                    <CreditCard className="h-4 w-4 shrink-0 text-gray-400" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-bold text-gray-900">
                                            {card.cardNickname} · {CARD_BRANDS[card.cardBrand] || "Card"}
                                        </p>
                                        <p className="text-[10px] text-gray-400">{card.maskedCardNumber}</p>
                                    </div>
                                    {card.isDefault && (
                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                                            Default
                                        </span>
                                    )}
                                </label>
                            ))}
                        </div>
                    )}

                    <label
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-all ${
                            payMethod === "new"
                                ? "border-primary bg-primary/5"
                                : "border-gray-100 hover:border-gray-200"
                        }`}
                    >
                        <input
                            type="radio"
                            name="payMethod"
                            checked={payMethod === "new"}
                            onChange={() => setPayMethod("new")}
                            className="accent-primary"
                        />
                        <Plus className="h-4 w-4 shrink-0 text-gray-400" />
                        <div>
                            <p className="text-xs font-bold text-gray-900">Pay with New Card</p>
                            <p className="text-[10px] text-gray-400">You will be redirected to secure hosted checkout</p>
                        </div>
                    </label>

                    {payMethod === "new" && (
                        <div className="mt-4 space-y-2">
                            <label className="block text-[12px] font-bold text-gray-700">Card Number Preview</label>
                            <input
                                value={cardNumber}
                                onChange={(event) => {
                                    let digits = event.target.value.replace(/\D/g, "");
                                    if (digits.length > 16) {
                                        digits = digits.slice(0, 16);
                                    }
                                    setCardNumber(digits.replace(/(\d{4})(?=\d)/g, "$1 "));
                                }}
                                inputMode="numeric"
                                placeholder="Enter card number to check bank offers"
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                            />
                            <p className="text-[11px] text-gray-400">
                                We only use the first 6 digits to check restaurant bank offers before secure checkout.
                            </p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handlePay}
                    disabled={bill.status !== "Pending" || paying || (payMethod === "saved" && !selectedCard)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                    style={{
                        background: paying ? "#9ca3af" : "linear-gradient(135deg, #16a34a, #15803d)",
                        boxShadow: paying ? "none" : "0 6px 24px rgba(34,197,94,0.3)",
                    }}
                >
                    {paying ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            Pay {formatRs(activeBreakdown.amountToPayPaisa)}
                            <ChevronRight className="h-4 w-4" />
                        </>
                    )}
                </button>

                <div className="flex items-start gap-2.5 pb-4 text-[11px] text-gray-400">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <p>
                        <strong className="text-gray-500">256-bit Secure Encryption.</strong> Your card is processed on PCI-compliant infrastructure. We only store payment tokens for saved cards.
                    </p>
                </div>
            </div>

            {redirectData && (
                <form ref={formRef} method="POST" action={redirectData.redirectUrl} style={{ display: "none" }}>
                    {Object.entries(redirectData.formData).map(([key, value]) => (
                        <input key={key} type="hidden" name={key} value={value} />
                    ))}
                </form>
            )}
        </div>
    );
}

function DiscountRow({
    amount,
    color,
    icon,
    label,
}: {
    amount: number;
    color: string;
    icon: ReactNode;
    label: string;
}) {
    if (amount <= 0) return null;

    return (
        <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-white/60">
                {icon} {label}
            </span>
            <span className="font-semibold" style={{ color }}>
                -{formatRs(amount)}
            </span>
        </div>
    );
}
