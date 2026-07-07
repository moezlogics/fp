"use client";

import { useState, useEffect, useRef, createContext, useContext, useCallback, Suspense } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
    X, Loader2,
    ArrowLeft, ShieldCheck, ShieldAlert, CheckCircle2, Eye, EyeOff,
    KeyRound, ArrowRight, RefreshCw, MessageCircle, AlertTriangle
} from "lucide-react";
import { useLoginGuard } from "@/hooks/use-login-guard";

type AuthStep = "login" | "otp" | "register" | "forgot" | "forgot-otp" | "reset" | "profile" | "done";

interface AuthModalContextType {
    openAuthModal: (onSuccess?: () => void) => void;
    closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType>({
    openAuthModal: () => { },
    closeAuthModal: () => { },
});

export const useAuthModal = () => useContext(AuthModalContext);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={null}>
            <AuthModalProviderInner>{children}</AuthModalProviderInner>
        </Suspense>
    );
}

function AuthModalProviderInner({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null);
    const [sessionExpired, setSessionExpired] = useState(false);
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    // Auto-detect ?sessionExpired=true and show inline re-login modal
    useEffect(() => {
        if (searchParams.get("sessionExpired") === "true") {
            setSessionExpired(true);
            setIsOpen(true);
            const cleanUrl = pathname + (searchParams.toString().replace(/sessionExpired=true&?/, "").replace(/[?&]$/, "") || "");
            window.history.replaceState({}, "", cleanUrl || pathname);
        }
    }, [searchParams, pathname]);

    const openAuthModal = useCallback((onSuccess?: () => void) => {
        setSessionExpired(false);
        setOnSuccessCallback(() => onSuccess || null);
        setIsOpen(true);
    }, []);

    const closeAuthModal = useCallback(() => {
        setIsOpen(false);
        setOnSuccessCallback(null);
        setSessionExpired(false);
    }, []);

    const handleSuccess = useCallback(() => {
        if (sessionExpired) {
            router.refresh();
        }
        if (onSuccessCallback) onSuccessCallback();
        closeAuthModal();
    }, [onSuccessCallback, sessionExpired, closeAuthModal, router]);

    return (
        <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal }}>
            {children}
            {isOpen && <AuthModal onClose={closeAuthModal} onSuccess={handleSuccess} sessionExpired={sessionExpired} />}
        </AuthModalContext.Provider>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Auth Modal — Modern Minimal Design
 * Bottom-sheet on mobile, centered card on desktop
 * ───────────────────────────────────────────────────────────────────────────── */

function AuthModal({ onClose, onSuccess, sessionExpired = false }: { onClose: () => void; onSuccess: () => void; sessionExpired?: boolean }) {
    const { data: session, update } = useSession();
    const [step, setStep] = useState<AuthStep>("login");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
    const [phone, setPhone] = useState("");
    const [city, setCity] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [resendTimer, setResendTimer] = useState(0);
    const [logoUrl, setLogoUrl] = useState("");

    const guard = useLoginGuard("user");
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const modalRef = useRef<HTMLDivElement>(null);

    // ── Touch-to-dismiss for mobile bottom sheet ──
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        const el = modalRef.current;
        if (el && el.scrollTop <= 0) setTouchStart(e.touches[0].clientY);
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStart === null) return;
        const diff = e.changedTouches[0].clientY - touchStart;
        if (diff > 100) onClose(); // Swipe down > 100px = close
        setTouchStart(null);
    };

    useEffect(() => {
        fetch("/api/settings/public").then(r => r.json()).then(d => {
            if (d && d.logoUrl) setLogoUrl(d.logoUrl);
        }).catch(() => {});
        
        // NOTE: We deliberately do NOT auto-signOut on sessionExpired.
        // Sessions should never expire automatically. Only user-initiated logout.
        if (session?.user) {
            if ((session.user as any).profileCompleted) {
                onSuccess();
            } else {
                setStep("profile");
            }
        }
    }, [session, onSuccess, sessionExpired]);

    useEffect(() => {
        if (resendTimer > 0) {
            const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [resendTimer]);

    // ── OTP handlers ──
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
    const resetOtp = () => { setOtpDigits(["", "", "", "", "", ""]); setTimeout(() => otpRefs.current[0]?.focus(), 100); };
    const otpCode = otpDigits.join("");

    // ── Login ──
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!guard.validateCaptcha()) return;
        setLoading(true);
        try {
            const result = await signIn("credentials", { email, password, loginType: "user", redirect: false });
            if (result?.error) {
                setError("Invalid email or password.");
                await guard.recordFailure();
            } else {
                await guard.recordSuccess();
                await update();
                setStep("profile");
            }
        } catch (err: any) {
            setError(err.message);
            await guard.recordFailure();
        } finally { setLoading(false); }
    };

    // ── Send OTP (register) ──
    const handleSendOtp = async () => {
        setLoading(true); setError("");
        try {
            const res = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, purpose: "register" }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send OTP");
            setStep("otp"); setResendTimer(60); resetOtp();
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    // ── Verify OTP ──
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otpCode.length !== 6) return;
        setLoading(true); setError("");
        try {
            const verifyRes = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: otpCode }) });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Invalid OTP");
            const isNew = verifyData.data?.isNewUser || verifyData.isNewUser;
            if (isNew) {
                const regRes = await fetch("/api/auth/register-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
                const regData = await regRes.json();
                if (!regRes.ok) throw new Error(regData.error || "Registration failed");
                const userData = regData.data || regData;
                const loginResult = await signIn("credentials", { tokenData: JSON.stringify({ user: userData.user, tokens: userData.tokens }), redirect: false });
                if (loginResult?.error) throw new Error("Session creation failed.");
            } else {
                const loginResult = await signIn("credentials", { email, password, loginType: "user", redirect: false });
                if (loginResult?.error) throw new Error("Invalid password.");
            }
            await update(); setStep("profile");
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    // ── Forgot Password ──
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError("");
        try {
            const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send reset code");
            setStep("forgot-otp"); setResendTimer(60); resetOtp();
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    const handleForgotOtpVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otpCode.length !== 6) return;
        setStep("reset"); setError("");
    };

    // ── Reset Password ──
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError("");
        try {
            const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp: otpCode, newPassword }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Reset failed");
            const loginResult = await signIn("credentials", { email, password: newPassword, loginType: "user", redirect: false });
            if (loginResult?.error) {
                setStep("login"); setPassword(newPassword);
                setError("Password reset successful! Please login.");
            } else { await update(); onSuccess(); }
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    // ── Profile Completion ──
    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError("");
        try {
            const res = await fetch("/api/auth/complete-profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, city }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Profile update failed");
            await update(); setStep("done"); setTimeout(onSuccess, 1500);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    // ── Resend OTP ──
    const handleResend = async () => {
        if (resendTimer > 0) return;
        setLoading(true);
        try {
            const endpoint = step === "forgot-otp" ? "/api/auth/forgot-password" : "/api/auth/send-otp";
            const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, ...(step === "otp" && { purpose: "register" }) }) });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            setResendTimer(60); resetOtp();
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    // ── Shared UI Components ──
    const inputCls = "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium bg-gray-50/60 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-300";
    const labelCls = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5";
    const btnPrimaryCls = "w-full bg-primary text-white font-bold py-2.5 rounded-lg hover:brightness-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-[13px] shadow-sm shadow-primary/15 active:scale-[0.98]";
    const btnSecondaryCls = "w-full bg-gray-50 text-gray-700 font-bold py-2.5 rounded-lg hover:bg-gray-100 transition-all text-[13px] border border-gray-100 active:scale-[0.98]";

    const OtpInputs = (
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
    );

    const ResendLink = (
        <p className="text-center text-[11px] text-gray-400 mt-2">
            Didn&apos;t receive it?{" "}
            {resendTimer > 0 ? (
                <span className="text-gray-500 font-semibold">Resend in {resendTimer}s</span>
            ) : (
                <button type="button" onClick={handleResend} disabled={loading} className="text-primary font-bold hover:underline">Resend Code</button>
            )}
        </p>
    );

    const ErrorBox = error ? (
        <div className="bg-red-50 text-red-600 text-[13px] px-3.5 py-2.5 rounded-lg border border-red-100 font-medium leading-snug">{error}</div>
    ) : null;

    const BackBtn = (target: AuthStep) => (
        <button type="button" onClick={() => { setStep(target); setError(""); }}
            className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back
        </button>
    );

    const StepHeader = ({ title, subtitle, icon }: { title: string; subtitle: string; icon?: React.ReactNode }) => (
        <div className="text-center">
            {icon && <div className="w-10 h-10 bg-primary/8 rounded-lg flex items-center justify-center mx-auto mb-2">{icon}</div>}
            <h2 className="text-base font-bold text-gray-900 tracking-tight">{title}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

            {/* Modal Card — bottom-sheet on mobile, centered card on desktop */}
            <div
                ref={modalRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="relative w-full sm:max-w-[380px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                {/* Close button */}
                <button onClick={onClose} className="absolute right-3 top-3 text-gray-300 hover:text-gray-500 z-10 transition-colors">
                    <X className="w-4 h-4" />
                </button>
                {/* Mobile drag handle */}
                <div className="sm:hidden flex justify-center pt-2.5 pb-0">
                    <div className="w-9 h-1 bg-gray-200 rounded-full" />
                </div>

                {/* ─── Login ─── */}
                {step === "login" && guard.loaded && guard.blocked && (
                    <div className="p-6 text-center space-y-4">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mx-auto">
                            <ShieldAlert className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Access Blocked</h3>
                            <p className="text-[11px] text-gray-500 mt-1">Too many failed attempts. Your IP is blocked for 24 hours.</p>
                        </div>
                        <Link href="/contact-us" onClick={onClose}
                            className="inline-flex items-center gap-1.5 bg-primary text-white font-bold py-2 px-4 rounded-lg text-[13px] hover:brightness-105 transition shadow-sm shadow-primary/15">
                            <MessageCircle className="w-3.5 h-3.5" /> Contact Support
                        </Link>
                    </div>
                )}

                {step === "login" && !(guard.loaded && guard.blocked) && (
                    <form onSubmit={handleLogin} className="p-6 space-y-4">
                        {/* Session Expired Banner */}
                        {sessionExpired && (
                            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 flex items-start gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[13px] font-bold text-amber-800">Session Expired</p>
                                    <p className="text-[11px] text-amber-600 mt-0.5">Sign in again to continue.</p>
                                </div>
                            </div>
                        )}

                        <div className="text-center">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Foodies Pakistan" className="h-8 mx-auto -mt-1 object-contain" />
                            ) : (
                                <h1 className="text-lg font-black text-primary italic tracking-tight">Foodies Pakistan</h1>
                            )}
                            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mt-1">
                                {sessionExpired ? "Sign In Again" : "Sign In to Continue"}
                            </p>
                        </div>

                        {ErrorBox}

                        {guard.warningMessage && (
                            <div className="bg-amber-50 border border-amber-100 text-amber-700 px-3 py-2.5 rounded-lg text-[13px] font-medium flex items-start gap-2">
                                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="leading-snug">{guard.warningMessage}</p>
                                    <Link href="/contact-us" onClick={onClose} className="text-[11px] text-primary font-bold hover:underline mt-1 inline-block">Contact Support →</Link>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className={labelCls}>Email</label>
                            <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="you@example.com" autoFocus className={inputCls} />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Password</label>
                                <button type="button" onClick={() => { setStep("forgot"); setError(""); }}
                                    className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">Forgot?</button>
                            </div>
                            <div className="relative">
                                <input value={password} onChange={e => setPassword(e.target.value)} required type={showPassword ? "text" : "password"} placeholder="••••••••" className={inputCls + " pr-10"} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Compact CAPTCHA */}
                        <div>
                            <label className={labelCls}>Security Check</label>
                            <div className="flex items-center gap-2">
                                <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-mono font-bold text-gray-700 select-none tracking-wider whitespace-nowrap">
                                    {guard.mathQuestion} = ?
                                </div>
                                <input value={guard.captchaInput} onChange={e => guard.setCaptchaInput(e.target.value.replace(/\D/g, ""))}
                                    type="text" inputMode="numeric" required placeholder="?" maxLength={4}
                                    className="w-14 border border-gray-200 rounded-lg px-2 py-2 text-[13px] text-center font-bold bg-gray-50/60 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-300" />
                                <button type="button" onClick={guard.regenerateCaptcha} className="text-gray-300 hover:text-primary transition-colors p-1" title="New question">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {guard.captchaError && <p className="text-[11px] text-red-500 font-medium mt-1">{guard.captchaError}</p>}
                        </div>

                        <button type="submit" disabled={loading} className={btnPrimaryCls}>
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                            {loading ? "Signing in..." : "Sign In"}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                            <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] font-bold text-gray-300 uppercase tracking-widest">or</span></div>
                        </div>

                        <button type="button" onClick={() => { setStep("register"); setError(""); }} className={btnSecondaryCls}>
                            Create New Account
                        </button>
                    </form>
                )}

                {/* ─── Register ─── */}
                {step === "register" && (
                    <form onSubmit={async (e) => { e.preventDefault(); await handleSendOtp(); }} className="p-6 space-y-4">
                        {BackBtn("login")}
                        <StepHeader title="Create Your Account" subtitle="We'll send an OTP to verify your email" />
                        {ErrorBox}
                        <div>
                            <label className={labelCls}>Full Name</label>
                            <input value={name} onChange={e => setName(e.target.value)} required placeholder="Ahmed Khan" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Email</label>
                            <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="you@example.com" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Password</label>
                            <input value={password} onChange={e => setPassword(e.target.value)} required type="password" placeholder="Min 8 characters" minLength={8} className={inputCls} />
                        </div>
                        <button type="submit" disabled={loading} className={btnPrimaryCls}>
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                            {loading ? "Sending code..." : "Send Verification Code"}
                        </button>
                    </form>
                )}

                {/* ─── OTP Verification (Registration) ─── */}
                {step === "otp" && (
                    <form onSubmit={handleVerifyOtp} className="p-6 space-y-4">
                        {BackBtn("register")}
                        <StepHeader title="Verify Email" subtitle={`Code sent to ${email}`} icon={<ShieldCheck className="w-5 h-5 text-primary" />} />
                        {ErrorBox}
                        {OtpInputs}
                        <button type="submit" disabled={loading || otpCode.length !== 6} className={btnPrimaryCls}>
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            {loading ? "Verifying..." : "Verify & Create Account"}
                        </button>
                        {ResendLink}
                    </form>
                )}

                {/* ─── Forgot Password (Email) ─── */}
                {step === "forgot" && (
                    <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
                        {BackBtn("login")}
                        <StepHeader title="Forgot Password?" subtitle="We'll send a code to reset it" icon={<KeyRound className="w-5 h-5 text-gray-500" />} />
                        {ErrorBox}
                        <div>
                            <label className={labelCls}>Email Address</label>
                            <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="you@example.com" autoFocus className={inputCls} />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white font-bold py-2.5 rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-[13px] shadow-sm active:scale-[0.98]">
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                            {loading ? "Checking..." : "Send Reset Code"}
                        </button>
                    </form>
                )}

                {/* ─── Forgot Password OTP ─── */}
                {step === "forgot-otp" && (
                    <form onSubmit={handleForgotOtpVerify} className="p-6 space-y-4">
                        {BackBtn("forgot")}
                        <StepHeader title="Enter Reset Code" subtitle={`Code sent to ${email}`} icon={<ShieldCheck className="w-5 h-5 text-gray-500" />} />
                        {ErrorBox}
                        {OtpInputs}
                        <button type="submit" disabled={otpCode.length !== 6}
                            className="w-full bg-gray-900 text-white font-bold py-2.5 rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-[13px] shadow-sm active:scale-[0.98]">
                            <ArrowRight className="w-3.5 h-3.5" /> Continue
                        </button>
                        {ResendLink}
                    </form>
                )}

                {/* ─── Reset Password ─── */}
                {step === "reset" && (
                    <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                        {BackBtn("forgot-otp")}
                        <StepHeader title="Set New Password" subtitle="Must be at least 8 characters" icon={<KeyRound className="w-5 h-5 text-primary" />} />
                        {ErrorBox}
                        <div>
                            <label className={labelCls}>New Password</label>
                            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} required type="password" placeholder="Min 8 characters" minLength={8} autoFocus className={inputCls} />
                        </div>
                        <button type="submit" disabled={loading} className={btnPrimaryCls}>
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            {loading ? "Resetting..." : "Reset Password & Login"}
                        </button>
                    </form>
                )}

                {/* ─── Profile Completion ─── */}
                {step === "profile" && (
                    <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
                        <StepHeader title="Complete Your Profile" subtitle="Phone is needed for booking confirmations" icon={<CheckCircle2 className="w-5 h-5 text-primary" />} />
                        {ErrorBox}
                        <div>
                            <label className={labelCls}>Phone *</label>
                            <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="03299493973" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>City</label>
                            <select value={city} onChange={e => setCity(e.target.value)} className={inputCls}>
                                <option value="">Select city</option>
                                <option value="Lahore">Lahore</option>
                                <option value="Karachi">Karachi</option>
                                <option value="Islamabad">Islamabad</option>
                                <option value="Rawalpindi">Rawalpindi</option>
                                <option value="Faisalabad">Faisalabad</option>
                                <option value="Multan">Multan</option>
                                <option value="Peshawar">Peshawar</option>
                            </select>
                        </div>
                        <button type="submit" disabled={loading} className={btnPrimaryCls}>
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            {loading ? "Saving..." : "Complete Profile"}
                        </button>
                        <button type="button" onClick={onSuccess} className="w-full text-gray-400 text-[11px] font-bold uppercase tracking-wider hover:text-gray-600 transition-colors py-0.5">
                            Skip for now
                        </button>
                    </form>
                )}

                {/* ─── Done ─── */}
                {step === "done" && (
                    <div className="p-8 text-center space-y-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-6 h-6 text-primary" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900 tracking-tight">All Set! 🎉</h2>
                        <p className="text-[11px] text-gray-400">Continuing...</p>
                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" />
                    </div>
                )}
            </div>
        </div>
    );
}
