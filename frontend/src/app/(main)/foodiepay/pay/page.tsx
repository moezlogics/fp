"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Receipt, Loader2, ArrowRight, Search, CheckCircle, AlertCircle, CreditCard, Coins } from "lucide-react";

export default function FoodiePayPage() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();

    const [restaurantQuery, setRestaurantQuery] = useState("");
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
    const [billAmount, setBillAmount] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [applyCoins, setApplyCoins] = useState(false);

    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [calculating, setCalculating] = useState(false);

    const [liveBreakdown, setLiveBreakdown] = useState<any>(null);
    const [finalBreakdown, setFinalBreakdown] = useState<any>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (authStatus === "unauthenticated") router.push("/login");
    }, [authStatus, router]);

    // ── Search restaurants ──
    useEffect(() => {
        if (restaurantQuery.length < 2) {
            setRestaurants([]);
            return;
        }
        setSearching(true);
        const timeout = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(restaurantQuery)}&limit=5`);
                const data = await res.json();
                setRestaurants(Array.isArray(data) ? data : data.results || []);
            } catch { }
            setSearching(false);
        }, 300);
        return () => clearTimeout(timeout);
    }, [restaurantQuery]);

    // ── Realtime Bill Calculation (Debounced) ──
    useEffect(() => {
        const amountPKR = parseFloat(billAmount);
        if (!selectedRestaurant || isNaN(amountPKR) || amountPKR < 1) {
            setLiveBreakdown(null);
            return;
        }

        const timeout = setTimeout(async () => {
            setCalculating(true);
            try {
                const bin = cardNumber.replace(/\D/g, "").slice(0, 6);
                const res = await fetch("/api/escrow/calculate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        restaurantId: selectedRestaurant._id,
                        originalBillPaisa: Math.round(amountPKR * 100),
                        cardBin: bin.length >= 6 ? bin : undefined,
                        applyCoins,
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.breakdown) {
                        setLiveBreakdown(data.breakdown);
                        setError("");
                    }
                }
            } catch (err) {
                console.error("Live calculation failed", err);
            } finally {
                setCalculating(false);
            }
        }, 500);

        return () => clearTimeout(timeout);
    }, [selectedRestaurant, billAmount, cardNumber, applyCoins]);

    // ── Lock in and Pay ──
    async function handleInitiate(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (!selectedRestaurant) {
            setError("Please select a restaurant.");
            return;
        }

        const amountPKR = parseFloat(billAmount);
        if (!amountPKR || amountPKR < 1) {
            setError("Please enter a valid bill amount.");
            return;
        }

        setLoading(true);
        try {
            const bin = cardNumber.replace(/\D/g, "").slice(0, 6);
            const res = await fetch("/api/escrow/initiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    restaurantId: selectedRestaurant._id,
                    billAmountPaisa: Math.round(amountPKR * 100),
                    cardBin: bin.length >= 6 ? bin : undefined,
                    applyCoins,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to initiate payment.");
            } else {
                setFinalBreakdown(data);
            }
        } catch {
            setError("Network error. Please try again.");
        }
        setLoading(false);
    }

    function proceedToPayment() {
        const redirectUrl = finalBreakdown?.payment?.redirectUrl || finalBreakdown?.payment?.actionUrl;
        if (!redirectUrl) return;

        // Auto-submit form to PayFast
        const form = document.createElement("form");
        form.method = "POST";
        form.action = redirectUrl;

        for (const [key, value] of Object.entries(finalBreakdown.payment.formData)) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = value as string;
            form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
    }

    if (authStatus === "loading") {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-16">
            <div className="max-w-lg mx-auto px-4 py-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 flex-shrink-0 bg-teal-50 rounded-xl flex items-center justify-center">
                        <Receipt className="w-6 h-6 text-teal-700" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">FoodiePay</h1>
                        <p className="text-sm text-gray-500">Earn & Burn Coins instantly</p>
                    </div>
                </div>

                {!finalBreakdown ? (
                    <form onSubmit={handleInitiate} className="bg-white rounded-2xl border p-6 space-y-6 shadow-sm">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
                            </div>
                        )}

                        {/* 1. Restaurant Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">1. Select Restaurant</label>
                            {selectedRestaurant ? (
                                <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
                                    <div>
                                        <p className="font-bold text-sm text-teal-900">{selectedRestaurant.name || selectedRestaurant.brandName}</p>
                                        <p className="text-xs text-teal-700">{selectedRestaurant.area}, {selectedRestaurant.city}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedRestaurant(null); setRestaurantQuery(""); setLiveBreakdown(null); }}
                                        className="text-xs text-teal-700 font-bold hover:underline"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        value={restaurantQuery}
                                        onChange={(e) => setRestaurantQuery(e.target.value)}
                                        placeholder="Search restaurant..."
                                        className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition"
                                    />
                                    {restaurants.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg z-10 overflow-hidden max-h-60 overflow-y-auto">
                                            {restaurants.map((r: any) => (
                                                <button
                                                    key={r._id}
                                                    type="button"
                                                    onClick={() => { setSelectedRestaurant(r); setRestaurants([]); setRestaurantQuery(""); }}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition border-b last:border-b-0"
                                                >
                                                    <p className="font-bold text-sm">{r.name || r.brandName}</p>
                                                    <p className="text-xs text-gray-500">{r.area}, {r.city}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 2. Bill Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">2. Bill Amount (PKR)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rs.</span>
                                <input
                                    value={billAmount}
                                    onChange={(e) => setBillAmount(e.target.value.replace(/[^\d.]/g, ""))}
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    className="w-full pl-12 pr-4 py-4 border rounded-xl text-xl font-bold focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition"
                                />
                            </div>
                        </div>

                        {/* 3. Bank Offer Detect (BIN) */}
                        <div className="space-y-2 pt-2 border-t">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
                                <span>3. Card Offers</span>
                                {liveBreakdown?.bankDiscountPaisa > 0 && (
                                    <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md text-[10px] animate-pulse">Offer Applied 🎉</span>
                                )}
                            </label>
                            <div className="relative">
                                <CreditCard className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${liveBreakdown?.bankDiscountPaisa > 0 ? "text-teal-600" : "text-gray-400"}`} />
                                <input
                                    value={cardNumber}
                                    onChange={(e) => {
                                        // only allow digits, max 16 mapping to standard CCs, but we only really need 6 to calculate
                                        let val = e.target.value.replace(/\D/g, "");
                                        if (val.length > 16) val = val.slice(0, 16);
                                        // Format as standard 4-4-4-4 for UX
                                        setCardNumber(val.replace(/(\d{4})(?=\d)/g, '$1 '));
                                    }}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Card Number (For Bank Discounts)"
                                    className={`w-full pl-12 pr-4 py-3 border rounded-xl text-sm font-medium transition focus:ring-2 focus:outline-none ${liveBreakdown?.bankDiscountPaisa > 0
                                            ? "border-teal-500 ring-2 ring-teal-100 placeholder-teal-300 text-teal-900 bg-teal-50/30"
                                            : "focus:border-teal-500 focus:ring-teal-300"
                                        }`}
                                />
                                {liveBreakdown?.bankDiscountPaisa > 0 && (
                                    <div className="absolute top-full mt-1.5 left-0 text-xs text-teal-700 font-bold">
                                        ✨ {liveBreakdown.bankName} {liveBreakdown.bankDiscountPercent}% off applied!
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. Foodies Coins */}
                        <div className="space-y-2 pt-6">
                            <label className="flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center">
                                        <Coins className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Use Foodies Coins</p>
                                        <p className="text-xs text-gray-500">Max 25% of final bill</p>
                                    </div>
                                </div>
                                <div className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in">
                                    <input
                                        type="checkbox"
                                        name="toggle"
                                        id="toggle1"
                                        checked={applyCoins}
                                        onChange={(e) => setApplyCoins(e.target.checked)}
                                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:border-teal-500 checked:right-0 right-6 checked:bg-teal-500"
                                    />
                                    <label htmlFor="toggle1" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                                </div>
                            </label>
                        </div>

                        {/* Live Calculation Preview UI */}
                        {liveBreakdown && (
                            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border relative overflow-hidden">
                                {calculating && (
                                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                                        <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Subtotal</span>
                                    <span className="font-medium text-gray-900">Rs. {(liveBreakdown.originalBillPaisa / 100).toLocaleString()}</span>
                                </div>

                                {liveBreakdown.tableDealDiscountPaisa > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Yield Deal ({liveBreakdown.yieldDiscountPercent}%)</span>
                                        <span>- Rs. {(liveBreakdown.tableDealDiscountPaisa / 100).toLocaleString()}</span>
                                    </div>
                                )}
                                {liveBreakdown.subscriptionDiscountPaisa > 0 && (
                                    <div className="flex justify-between text-sm text-purple-600">
                                        <span>Prime Membership ({liveBreakdown.subscriptionDiscountPercent}%)</span>
                                        <span>- Rs. {(liveBreakdown.subscriptionDiscountPaisa / 100).toLocaleString()}</span>
                                    </div>
                                )}
                                {liveBreakdown.bankDiscountPaisa > 0 && (
                                    <div className="flex justify-between text-sm text-teal-600">
                                        <span>{liveBreakdown.bankName} Offer</span>
                                        <span>- Rs. {(liveBreakdown.bankDiscountPaisa / 100).toLocaleString()}</span>
                                    </div>
                                )}
                                {liveBreakdown.coinDiscountPaisa > 0 && (
                                    <div className="flex justify-between text-sm text-primary">
                                        <span>Coins Redeemed ({liveBreakdown.coinsRedeemed})</span>
                                        <span>- Rs. {(liveBreakdown.coinDiscountPaisa / 100).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="border-t pt-2 mt-2 flex justify-between items-center">
                                    <span className="font-bold text-gray-800">Final Total</span>
                                    <span className="font-bold text-xl text-teal-700">
                                        Rs. {(liveBreakdown.amountToPayPaisa / 100).toLocaleString()}
                                    </span>
                                </div>
                                {liveBreakdown.coinsToEarn > 0 && (
                                    <p className="text-xs text-primary font-medium text-right flex items-center justify-end gap-1">
                                        You'll earn {liveBreakdown.coinsToEarn} <Coins className="w-3 h-3" />
                                    </p>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || calculating || !selectedRestaurant || !billAmount || parseFloat(billAmount) < 1}
                            className="w-full bg-teal-700 text-white py-4 rounded-xl font-bold hover:bg-teal-800 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                            {loading ? "Locking Deal..." : "Confirm & Proceed to Pay"}
                        </button>
                    </form>
                ) : (
                    /* Lock-in Confirmed: Proceed to Gateway */
                    <div className="bg-white rounded-2xl border p-6 space-y-6 shadow-sm">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Deal Locked!</h2>
                            <p className="text-sm text-gray-500">Your total savings and final bill are secured.</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm border">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Original Bill</span>
                                <span className="font-bold">Rs. {finalBreakdown.billBreakdown.originalBill.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-teal-600 font-medium">
                                <span>Total Savings</span>
                                <span>- Rs. {finalBreakdown.billBreakdown.totalDiscount.toLocaleString()}</span>
                            </div>
                            <div className="border-t border-dashed pt-3 flex justify-between items-center mt-2">
                                <span className="font-bold text-gray-600">Amount to Pay</span>
                                <span className="font-bold text-2xl text-gray-900">
                                    Rs. {finalBreakdown.billBreakdown.amountToPay.toLocaleString()}
                                </span>
                            </div>
                            {finalBreakdown.billBreakdown.coinsToEarn > 0 && (
                                <div className="bg-primary/5 text-primary-dark p-2 text-center rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 mt-2">
                                    <Coins className="w-4 h-4" />
                                    Earn {finalBreakdown.billBreakdown.coinsToEarn} Coins on successful payment
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={proceedToPayment}
                                className="w-full bg-teal-700 text-white py-4 rounded-xl font-bold hover:bg-teal-800 transition flex items-center justify-center gap-2"
                            >
                                Pay Securely via PayFast <ArrowRight className="w-5 h-5" />
                            </button>

                            <button
                                onClick={() => { setFinalBreakdown(null); setError(""); }}
                                className="w-full text-sm font-medium text-gray-500 hover:text-gray-800 transition py-2"
                            >
                                Cancel & Modify Details
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* simple inline style for Tailwind toggle checkbox fallback */}
            <style jsx>{`
                .toggle-checkbox:checked {
                    right: 0;
                    border-color: #14b8a6;
                }
                .toggle-checkbox:checked + .toggle-label {
                    background-color: #14b8a6;
                }
            `}</style>
        </div>
    );
}
