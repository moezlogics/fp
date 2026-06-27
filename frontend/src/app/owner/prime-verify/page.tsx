"use client";

import { useState, useRef, useEffect } from "react";
import { Crown, Search, Send, CheckCircle2, XCircle, Clock, User, Shield, Mail, AlertTriangle, Loader2 } from "lucide-react";
import { useBranch } from "../owner-shell";

// ══════════════════════════════════════════════════
// ── TYPES ──
// ══════════════════════════════════════════════════
interface VerifyResult {
    isPrime: boolean;
    user?: {
        id: string;
        name: string;
        phone: string;
        emailMasked?: string;
        avatar?: string;
    };
    subscription?: {
        planName: string;
        duration: string;
        validTo: string;
        daysRemaining: number;
    };
    message: string;
}

interface OTPConfirmResult {
    verified: boolean;
    message: string;
    user?: {
        id: string;
        name: string;
        phone: string;
    };
    discount?: {
        percent: number;
        subscriptionId: string;
    };
}

type Step = "idle" | "checking" | "found" | "not-found" | "sending-otp" | "otp-sent" | "verifying" | "verified" | "failed";

// ══════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ══════════════════════════════════════════════════
export default function PrimeVerifyPage() {
    const { branch } = useBranch();
    const [lookup, setLookup] = useState("");
    const [billAmount, setBillAmount] = useState("");
    const [step, setStep] = useState<Step>("idle");
    const [result, setResult] = useState<VerifyResult | null>(null);
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [otpConfirm, setOtpConfirm] = useState<OTPConfirmResult | null>(null);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [otpDestination, setOtpDestination] = useState("");
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer for OTP resend
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown((prev: number) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    // ── Step 1: Check if customer has Prime
    async function checkPhone() {
        if (lookup.trim().length < 3) {
            setError("Enter customer ID, phone number, or email.");
            return;
        }
        setError("");
        setStep("checking");
        try {
            const res = await fetch("/api/subscriptions/verify-walkin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "check", query: lookup }),
            });
            const data = await res.json();
            if (res.ok) {
                if (data.isPrime) {
                    setResult(data);
                    setStep("found");
                } else {
                    setResult(data);
                    setStep("not-found");
                }
            } else {
                setError(data.error || "Failed to check.");
                setStep("not-found");
            }
        } catch {
            setError("Network error. Please try again.");
            setStep("idle");
        }
    }

    // ── Step 2: Send OTP
    async function sendOTP() {
        setError("");
        if (!branch?._id) {
            setError("Select a branch first before verifying Prime.");
            return;
        }
        setStep("sending-otp");
        try {
            const res = await fetch("/api/subscriptions/verify-walkin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // restaurantId is required so the 12h anti-abuse cooldown is armed.
                body: JSON.stringify({ action: "otp", userId: result?.user?.id, restaurantId: branch._id }),
            });
            const data = await res.json();
            if (res.ok) {
                setOtpDestination(data.destination || result?.user?.emailMasked || "");
                setStep("otp-sent");
                setCountdown(120);
                setTimeout(() => otpRefs.current[0]?.focus(), 100);
            } else {
                setError(data.error || "Failed to send OTP.");
                setStep("found");
            }
        } catch {
            setError("Network error. Please try again.");
            setStep("found");
        }
    }

    // ── Step 3: Verify OTP
    async function verifyOTP() {
        const code = otp.join("");
        if (code.length !== 4) {
            setError("Please enter the full 4-digit code.");
            return;
        }
        setError("");
        setStep("verifying");
        try {
            const billAmountPaisa = billAmount ? Math.round(parseFloat(billAmount) * 100) : undefined;
            const res = await fetch("/api/subscriptions/verify-walkin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // restaurantId arms the cooldown; billAmountPaisa lets the backend
                // record real Prime savings in the redemption ledger.
                body: JSON.stringify({ action: "confirm", userId: result?.user?.id, otp: code, restaurantId: branch?._id, billAmountPaisa }),
            });
            const data = await res.json();
            if (res.ok && data.verified) {
                setOtpConfirm(data);
                setStep("verified");
            } else {
                setError(data.error || "Invalid OTP.");
                setStep("otp-sent");
            }
        } catch {
            setError("Network error. Please try again.");
            setStep("otp-sent");
        }
    }

    // OTP input handler
    function handleOtpChange(index: number, value: string) {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 3) {
            otpRefs.current[index + 1]?.focus();
        }
    }

    function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    }

    // Reset
    function reset() {
        setLookup("");
        setStep("idle");
        setResult(null);
        setOtp(["", "", "", ""]);
        setOtpConfirm(null);
        setError("");
        setCountdown(0);
        setOtpDestination("");
        setBillAmount("");
    }

    return (
        <div className="max-w-lg mx-auto">
            {/* ── Header ── */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/10 flex items-center justify-center border border-primary/20">
                        <Crown className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">
                            Prime Walk-in Verification
                        </h1>
                        <p className="text-xs text-gray-400 font-bold">
                            Verify a walk-in guest&apos;s Prime membership
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Customer Lookup ── */}
            {(step === "idle" || step === "checking" || step === "not-found") && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">
                        Customer ID, Phone, or Email
                    </label>
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input
                                type="text"
                                value={lookup}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setLookup(e.target.value);
                                    setError("");
                                    if (step === "not-found") setStep("idle");
                                }}
                                onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && checkPhone()}
                                placeholder="User ID, 0300-1234567, or user@email.com"
                                className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={checkPhone}
                            disabled={step === "checking"}
                            className="bg-zinc-900 text-white px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                        >
                            {step === "checking" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Search className="w-4 h-4" />
                            )}
                            Check
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 px-4 py-3 rounded-xl">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {step === "not-found" && (
                        <div className="mt-4 flex items-center gap-3 bg-gray-50 px-4 py-4 rounded-xl border border-gray-100">
                            <XCircle className="w-5 h-5 text-gray-400 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-gray-900">Not a Prime Member</p>
                                <p className="text-xs text-gray-400">
                                    {result?.message || "No active Prime membership was found for this customer."}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Prime Member Found + Send OTP ── */}
            {(step === "found" || step === "sending-otp") && result?.isPrime && (
                <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 shadow-sm">
                    {/* User info */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center border-2 border-primary/30 overflow-hidden">
                            {result.user?.avatar ? (
                                <img src={result.user.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-7 h-7 text-primary" />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="font-black text-lg text-gray-900">{result.user?.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{result.user?.phone}</p>
                            {result.user?.emailMasked && (
                                <p className="text-[11px] text-gray-400 font-medium mt-1">OTP email: {result.user.emailMasked}</p>
                            )}
                        </div>
                        <div className="bg-primary/10 text-primary-dark px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Crown className="w-3 h-3" /> Prime
                        </div>
                    </div>

                    {/* Subscription details */}
                    <div className="bg-primary/5 rounded-xl p-4 mb-6 space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-bold">Plan</span>
                            <span className="font-black text-gray-900">{result.subscription?.planName}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-bold">Valid Until</span>
                            <span className="font-black text-gray-900">
                                {result.subscription?.validTo
                                    ? new Date(result.subscription.validTo).toLocaleDateString("en-PK", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                    })
                                    : "-"}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-bold">Days Left</span>
                            <span className="font-black text-green-600">{result.subscription?.daysRemaining} days</span>
                        </div>
                    </div>

                    {/* Optional bill amount — used to record real Prime savings */}
                    <div className="mb-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">
                            Bill Amount (optional, for savings record)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Rs.</span>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={billAmount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBillAmount(e.target.value)}
                                placeholder="e.g. 5000"
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                    </div>

                    {/* Visual ID check reminder */}
                    <div className="flex items-center gap-3 bg-blue-50 px-4 py-3 rounded-xl mb-6 border border-blue-100">
                        <Shield className="w-4 h-4 text-blue-500 shrink-0" />
                        <p className="text-[11px] text-blue-700 font-medium">
                            <span className="font-bold">Visual check:</span> Does the person match the name above?
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 px-4 py-3 rounded-xl">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={reset}
                            className="bg-gray-100 text-gray-700 px-5 py-4 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={sendOTP}
                            disabled={step === "sending-otp"}
                            className="flex-1 bg-gradient-to-r from-primary/50 to-primary-dark text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:from-primary-dark hover:to-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {step === "sending-otp" ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" /> Send OTP to Email
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* ── OTP Input ── */}
            {(step === "otp-sent" || step === "verifying") && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4">
                            <Send className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-black text-lg text-gray-900 mb-1">OTP Sent!</h3>
                        <p className="text-xs text-gray-400 font-medium">
                            {otpDestination
                                ? `Ask the customer to read the 4-digit code from ${otpDestination}`
                                : "Ask the customer to read the 4-digit code from their email"}
                        </p>
                    </div>

                    {/* OTP input boxes */}
                    <div className="flex justify-center gap-3 mb-6">
                        {otp.map((digit, i) => (
                            <input
                                key={i}
                                ref={(el) => { otpRefs.current[i] = el; }}
                                type="text"
                                inputMode="numeric"
                                value={digit}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOtpChange(i, e.target.value)}
                                onKeyDown={(e: React.KeyboardEvent) => handleOtpKeyDown(i, e)}
                                className="w-16 h-16 text-center text-2xl font-black bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                                maxLength={1}
                            />
                        ))}
                    </div>

                    {/* Countdown */}
                    <div className="text-center mb-6">
                        {countdown > 0 ? (
                            <p className="text-xs text-gray-400 font-bold flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3" />
                                Code expires in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}
                            </p>
                        ) : (
                            <button
                                onClick={sendOTP}
                                className="text-xs text-primary font-bold hover:underline"
                            >
                                Resend OTP
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="mb-4 flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 px-4 py-3 rounded-xl">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={reset}
                            className="bg-gray-100 text-gray-700 px-5 py-4 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={verifyOTP}
                            disabled={step === "verifying" || otp.join("").length !== 4}
                            className="flex-1 bg-zinc-900 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {step === "verifying" ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" /> Verify OTP
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Verified Success ── */}
            {step === "verified" && otpConfirm && (
                <div className="bg-white rounded-2xl border-2 border-green-200 p-8 shadow-sm text-center">
                    <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="font-black text-2xl text-gray-900 mb-2">
                        Prime Verified! ✅
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">{otpConfirm.message}</p>

                    {otpConfirm.discount && (
                        <div className="bg-green-50 rounded-2xl p-5 mb-6 inline-block">
                            <p className="text-4xl font-black text-green-600 tracking-tighter">
                                {otpConfirm.discount.percent}% OFF
                            </p>
                            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-1">
                                Prime Discount Applied
                            </p>
                        </div>
                    )}

                    <button
                        onClick={reset}
                        className="w-full bg-zinc-900 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-800 transition-colors"
                    >
                        Verify Another Guest
                    </button>
                </div>
            )}

            {/* ── Help Info ── */}
            <div className="mt-8 bg-primary/5 rounded-2xl border border-primary/10 p-5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-dark mb-3">
                    How Walk-in Verification Works
                </h4>
                <ul className="space-y-2 text-xs text-primary-dark/80 font-medium">
                    <li className="flex items-start gap-2">
                        <span className="font-black text-primary shrink-0">1.</span>
                        Enter the customer&apos;s ID, phone number, or email to check Prime status
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-black text-primary shrink-0">2.</span>
                        If Prime, send a 4-digit OTP to the account email for identity verification
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-black text-primary shrink-0">3.</span>
                        Customer reads the 4-digit email code and you enter it here
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-black text-primary shrink-0">4.</span>
                        Prime discount is applied to their bill
                    </li>
                </ul>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-primary font-bold">
                    <Shield className="w-3 h-3" />
                    Each member can only use Prime once per 12 hours at your restaurant
                </div>
            </div>
        </div>
    );
}
