"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, ArrowLeft, Loader2, CheckCircle, ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";

type Step = "email" | "otp" | "password";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const otpCode = otpDigits.join("");

    // ── OTP handlers (individual digit inputs) ──
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const nd = [...otpDigits];
        nd[index] = value.slice(-1);
        setOtpDigits(nd);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };
    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
    };
    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const nd = [...otpDigits];
        paste.split("").forEach((c, i) => { nd[i] = c; });
        setOtpDigits(nd);
        otpRefs.current[Math.min(paste.length, 5)]?.focus();
    };

    // ── Resend timer ──
    const startResendTimer = () => {
        setResendTimer(60);
        const interval = setInterval(() => {
            setResendTimer(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    // ── Step 1: Send OTP ──
    async function handleSendOTP(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, purpose: "reset" }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to send OTP.");
            } else {
                setStep("otp");
                startResendTimer();
                setOtpDigits(["", "", "", "", "", ""]);
                setTimeout(() => otpRefs.current[0]?.focus(), 100);
            }
        } catch {
            setError("Network error. Please try again.");
        }
        setLoading(false);
    }

    // ── Step 2: Verify OTP ──
    async function handleVerifyOTP(e: React.FormEvent) {
        e.preventDefault();
        if (otpCode.length !== 6) {
            setError("Please enter the 6-digit code.");
            return;
        }
        setStep("password");
        setError("");
    }

    // ── Step 3: Reset Password ──
    async function handleResetPassword(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp: otpCode, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to reset password.");
            } else {
                setSuccess(true);
            }
        } catch {
            setError("Network error. Please try again.");
        }
        setLoading(false);
    }

    // Shared classes
    const inputCls = "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium bg-gray-50/60 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-300";
    const labelCls = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5";
    const btnCls = "w-full bg-primary text-white font-bold py-2.5 rounded-lg hover:brightness-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-[13px] shadow-sm shadow-primary/15 active:scale-[0.98]";

    // Password strength rules
    const rules = [
        { label: "8+ characters", met: newPassword.length >= 8 },
        { label: "Uppercase letter", met: /[A-Z]/.test(newPassword) },
        { label: "One number", met: /[0-9]/.test(newPassword) },
        { label: "Passwords match", met: newPassword.length > 0 && newPassword === confirmPassword },
    ];

    // ── Success State ──
    if (success) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-sm w-full text-center space-y-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                        <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-base font-bold text-gray-900">Password Reset!</h2>
                    <p className="text-[13px] text-gray-500 leading-relaxed">
                        Your password has been changed. You can now sign in.
                    </p>
                    <button
                        onClick={() => router.push("/account")}
                        className={btnCls}
                    >
                        Go to Account
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-sm w-full space-y-4">
                {/* Header */}
                <div className="text-center">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                        {step === "password" ? <KeyRound className="w-5 h-5 text-primary" /> : <ShieldCheck className="w-5 h-5 text-gray-500" />}
                    </div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">
                        {step === "email" && "Reset Password"}
                        {step === "otp" && "Enter Code"}
                        {step === "password" && "New Password"}
                    </h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        {step === "email" && "Enter your email to receive a verification code."}
                        {step === "otp" && `6-digit code sent to ${email}`}
                        {step === "password" && "Create your new secure password."}
                    </p>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-1 justify-center">
                    {(["email", "otp", "password"] as Step[]).map((s, i) => (
                        <div
                            key={s}
                            className={`h-1 rounded-full transition-all ${
                                i <= (["email", "otp", "password"] as Step[]).indexOf(step) ? "bg-primary w-10" : "bg-gray-200 w-6"
                            }`}
                        />
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 text-red-600 text-[13px] px-3.5 py-2.5 rounded-lg border border-red-100 font-medium leading-snug">
                        {error}
                    </div>
                )}

                {/* ── Step 1: Email ── */}
                {step === "email" && (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                        <div>
                            <label className={labelCls}>Email Address</label>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                required
                                autoFocus
                                placeholder="you@example.com"
                                className={inputCls}
                            />
                        </div>
                        <button type="submit" disabled={loading} className={btnCls}>
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                            {loading ? "Sending..." : "Send Verification Code"}
                        </button>
                    </form>
                )}

                {/* ── Step 2: Individual OTP Digits ── */}
                {step === "otp" && (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <div className="flex justify-center gap-1.5" onPaste={handleOtpPaste}>
                            {otpDigits.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={el => { otpRefs.current[i] = el; }}
                                    value={digit}
                                    onChange={e => handleOtpChange(i, e.target.value)}
                                    onKeyDown={e => handleOtpKeyDown(i, e)}
                                    maxLength={1}
                                    inputMode="numeric"
                                    className={`w-10 h-11 text-center text-base font-bold border rounded-lg transition-all outline-none ${
                                        digit ? "border-primary bg-primary/5 text-primary" : "border-gray-200 bg-gray-50/60 text-gray-900 hover:border-gray-300"
                                    } focus:border-primary focus:ring-1 focus:ring-primary/20`}
                                />
                            ))}
                        </div>
                        <button type="submit" disabled={otpCode.length !== 6} className={btnCls}>
                            <ArrowRight className="w-3.5 h-3.5" /> Verify Code
                        </button>
                        <p className="text-center text-[11px] text-gray-400">
                            Didn&apos;t receive it?{" "}
                            {resendTimer > 0 ? (
                                <span className="text-gray-500 font-semibold">Resend in {resendTimer}s</span>
                            ) : (
                                <button type="button" onClick={() => { setStep("email"); setOtpDigits(["", "", "", "", "", ""]); setError(""); }}
                                    className="text-primary font-bold hover:underline">Try again</button>
                            )}
                        </p>
                    </form>
                )}

                {/* ── Step 3: New Password ── */}
                {step === "password" && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className={labelCls}>New Password</label>
                            <div className="relative">
                                <input
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    type={showPassword ? "text" : "password"}
                                    required
                                    autoFocus
                                    placeholder="Min 8 characters"
                                    className={inputCls + " pr-10"}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Confirm Password</label>
                            <input
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                type="password"
                                required
                                placeholder="Re-enter password"
                                className={inputCls}
                            />
                        </div>
                        {/* Password strength hints — compact */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                            {rules.map((rule) => (
                                <div key={rule.label} className={`flex items-center gap-1 text-[10px] ${rule.met ? "text-primary" : "text-gray-300"}`}>
                                    <CheckCircle className={`w-2.5 h-2.5 ${rule.met ? "text-primary" : "text-gray-300"}`} />
                                    {rule.label}
                                </div>
                            ))}
                        </div>
                        <button type="submit" disabled={loading} className={btnCls}>
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </form>
                )}

                {/* Back to login */}
                <div className="text-center pt-1">
                    <Link href="/account" className="text-[11px] text-gray-400 hover:text-primary transition flex items-center justify-center gap-1 font-medium">
                        <ArrowLeft className="w-3 h-3" /> Back to Account
                    </Link>
                </div>
            </div>
        </div>
    );
}
