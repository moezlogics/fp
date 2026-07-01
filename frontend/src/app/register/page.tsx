"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
    Mail, Lock, User, Phone, MapPin, Loader2,
    ArrowLeft, CheckCircle2, ShieldCheck, Eye, EyeOff,
    Sparkles, ArrowRight, AlertCircle
} from "lucide-react";
import { executeRedirectIntent } from "@/lib/auth-redirect";

type Step = "form" | "otp" | "profile" | "done";

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("form");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Form data
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
    const [phone, setPhone] = useState("");
    const [city, setCity] = useState("");
    const [username, setUsername] = useState("");
    const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
    const [usernameError, setUsernameError] = useState("");
    const [resendTimer, setResendTimer] = useState(0);
    const [logoUrl, setLogoUrl] = useState("");

    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Debounced username check
    useEffect(() => {
        if (!username || username.length < 3) {
            setUsernameStatus("idle");
            setUsernameError("");
            return;
        }

        const timer = setTimeout(async () => {
            setUsernameStatus("checking");
            setUsernameError("");
            try {
                const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
                const data = await res.json();
                if (data.available) {
                    setUsernameStatus("available");
                } else {
                    setUsernameStatus("unavailable");
                    setUsernameError(data.message || (data.reason === "reserved" ? "This username is reserved." : "This username is already taken."));
                }
            } catch (err) {
                setUsernameStatus("idle");
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username]);

    useEffect(() => {
        if (resendTimer > 0) {
            const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [resendTimer]);

    useEffect(() => {
        fetch("/api/settings/public").then(r => r.json()).then(d => {
            if (d?.logoUrl) setLogoUrl(d.logoUrl);
        }).catch(() => {});
    }, []);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const otpRes = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, purpose: "register" }),
            });
            const otpData = await otpRes.json();
            if (!otpRes.ok) throw new Error(otpData.error || "Failed to send OTP");

            setStep("otp");
            setResendTimer(60);
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newDigits = [...otpDigits];
        newDigits[index] = value.slice(-1);
        setOtpDigits(newDigits);

        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newDigits = [...otpDigits];
        paste.split("").forEach((char, i) => { newDigits[i] = char; });
        setOtpDigits(newDigits);
        const focusIndex = Math.min(paste.length, 5);
        otpRefs.current[focusIndex]?.focus();
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otpDigits.join("");
        if (code.length !== 6) return;

        setLoading(true);
        setError("");

        try {
            const verifyRes = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Invalid OTP");

            if (verifyData.data?.isNewUser || verifyData.isNewUser) {
                const regRes = await fetch("/api/auth/register-user", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password }),
                });
                const regData = await regRes.json();
                if (!regRes.ok) throw new Error(regData.error || "Registration failed");

                const userData = regData.data || regData;

                const loginResult = await signIn("credentials", {
                    tokenData: JSON.stringify({
                        user: userData.user,
                        tokens: userData.tokens,
                    }),
                    redirect: false,
                });

                if (loginResult?.error) {
                    throw new Error("Session creation failed. Please try logging in.");
                }
            } else {
                const loginResult = await signIn("credentials", {
                    email,
                    password,
                    redirect: false,
                });
                if (loginResult?.error) {
                    throw new Error("Login failed. Please try again.");
                }
            }

            setStep("profile");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/complete-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, city, username: username || undefined }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save profile");

            setStep("done");
            setTimeout(async () => {
                const hadIntent = await executeRedirectIntent(router);
                if (!hadIntent) router.push("/");
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, purpose: "register" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to resend");
            setResendTimer(60);
            setOtpDigits(["", "", "", "", "", ""]);
            otpRefs.current[0]?.focus();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const stepIndex = ["form", "otp", "profile", "done"].indexOf(step);
    const stepLabels = ["Account", "Verify", "Profile"];

    const inputCls = "w-full border border-gray-350 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold bg-white focus:border-primary focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-450 text-black";
    const labelCls = "block text-[11px] font-black text-black uppercase tracking-wider mb-1.5";
    const btnCls = "w-full bg-primary hover:bg-primary-dark text-white font-black py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-[13px] shadow-sm active:scale-[0.98] uppercase tracking-wider";

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-[380px] w-full">
                {/* Logo */}
                <div className="text-center mb-6">
                    <Link href="/" className="inline-block">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Foodies Pakistan" className="h-8 mx-auto -mt-1 object-contain" />
                        ) : (
                            <h1 className="text-xl font-black text-primary italic tracking-tight">Foodies Pakistan</h1>
                        )}
                    </Link>
                    <p className="text-[11px] text-zinc-950 font-black uppercase tracking-widest mt-1">Create Account</p>
                </div>

                {/* Progress Steps */}
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 flex items-center justify-between mb-6 shadow-sm">
                    <span className="text-[11px] font-black text-zinc-950 uppercase tracking-wider">Step {stepIndex + 1} of 3</span>
                    <span className="text-[11px] font-black text-primary uppercase tracking-wider">{stepLabels[stepIndex] || "Complete"}</span>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Step 1: Account Details */}
                    {step === "form" && (
                        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                            <div className="text-center mb-2">
                                <h2 className="text-base font-black text-black tracking-tight">Join Foodies Pakistan</h2>
                                <p className="text-[11px] text-zinc-950 font-bold mt-0.5">Discover the best dining across Pakistan</p>
                            </div>

                            {error && <div className="bg-red-50 text-red-600 text-[13px] px-3.5 py-2.5 rounded-lg border border-red-100 font-medium leading-snug">{error}</div>}

                            <div>
                                <label className={labelCls}>Full Name</label>
                                <input value={name} onChange={e => setName(e.target.value)} required placeholder="Ahmed Khan" className={inputCls} />
                            </div>

                            <div>
                                <label className={labelCls}>Email Address</label>
                                <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="you@example.com" className={inputCls} />
                            </div>

                            <div>
                                <label className={labelCls}>Password</label>
                                <div className="relative">
                                    <input value={password} onChange={e => setPassword(e.target.value)} required type={showPassword ? "text" : "password"} placeholder="Min 8 characters" minLength={8} className={inputCls + " pr-10"} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className={btnCls}>
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                                {loading ? "Sending code..." : "Continue"}
                            </button>

                            <p className="text-center text-[12px] text-gray-400 pt-1">
                                Already have an account?{" "}
                                <Link href="/account" className="text-primary font-bold hover:underline">Sign in</Link>
                            </p>
                        </form>
                    )}

                    {/* Step 2: OTP Verification */}
                    {step === "otp" && (
                        <form onSubmit={handleOtpSubmit} className="p-6 space-y-4">
                            <button type="button" onClick={() => { setStep("form"); setError(""); }} className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors mb-2">
                                <ArrowLeft className="w-3 h-3" /> Back
                            </button>

                            <div className="text-center mb-2">
                                <h2 className="text-base font-bold text-gray-900 tracking-tight">Verify Your Email</h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    Code sent to <span className="text-gray-700 font-semibold">{email}</span>
                                </p>
                            </div>

                            {error && <div className="bg-red-50 text-red-600 text-[13px] px-3.5 py-2.5 rounded-lg border border-red-100 font-medium leading-snug">{error}</div>}

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
                                        className={`w-10 h-11 text-center text-base font-black border rounded-lg transition-all outline-none ${
                                            digit ? "border-primary bg-primary/5 text-primary" : "border-gray-300 bg-white text-black hover:border-gray-400"
                                        } focus:border-primary focus:ring-1 focus:ring-primary/10`}
                                    />
                                ))}
                             </div>

                             <button type="submit" disabled={loading || otpDigits.join("").length !== 6} className={btnCls}>
                                 {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                 {loading ? "Verifying..." : "Verify & Create Account"}
                             </button>

                             <p className="text-center text-[12px] text-zinc-950 font-bold">
                                 Didn&apos;t receive it?{" "}
                                 {resendTimer > 0 ? (
                                     <span className="text-zinc-500 font-bold">Resend in {resendTimer}s</span>
                                 ) : (
                                     <button type="button" onClick={handleResendOtp} disabled={loading} className="text-primary font-black hover:underline">Resend Code</button>
                                 )}
                             </p>
                         </form>
                     )}

                     {/* Step 3: Profile completion */}
                     {step === "profile" && (
                         <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
                             <div className="text-center mb-2">
                                 <h2 className="text-base font-black text-black tracking-tight">Almost Done!</h2>
                                 <p className="text-[11px] text-zinc-950 font-bold mt-0.5">Complete your profile for seamless bookings</p>
                             </div>

                             {error && <div className="bg-red-50 text-red-600 text-[13px] px-3.5 py-2.5 rounded-lg border border-red-100 font-medium leading-snug">{error}</div>}

                             <div>
                                 <label className={labelCls}>Phone Number *</label>
                                 <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="03299493973" className={inputCls} />
                                 <p className="text-[10px] text-zinc-500 font-bold mt-1">Needed for booking confirmations.</p>
                             </div>

                             <div>
                                 <label className={labelCls}>City (Optional)</label>
                                 <select value={city} onChange={e => setCity(e.target.value)} className={inputCls}>
                                     <option value="">Select your city</option>
                                     <option value="Lahore">Lahore</option>
                                     <option value="Karachi">Karachi</option>
                                     <option value="Islamabad">Islamabad</option>
                                     <option value="Rawalpindi">Rawalpindi</option>
                                     <option value="Faisalabad">Faisalabad</option>
                                     <option value="Multan">Multan</option>
                                     <option value="Peshawar">Peshawar</option>
                                     <option value="Quetta">Quetta</option>
                                 </select>
                             </div>

                             <div>
                                 <label className={labelCls}>Choose a Username (Optional)</label>
                                 <div className="relative">
                                     <input 
                                         value={username} 
                                         onChange={e => setUsername(e.target.value)} 
                                         placeholder="your_cool_name" 
                                         maxLength={20}
                                         className={`${inputCls} pr-10 ${usernameStatus === 'unavailable' ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : usernameStatus === 'available' ? 'border-green-300 focus:border-green-400 focus:ring-green-500/20' : ''}`} 
                                     />
                                     <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                         {usernameStatus === "checking" && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                                         {usernameStatus === "available" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                         {usernameStatus === "unavailable" && <AlertCircle className="w-4 h-4 text-red-500" />}
                                     </div>
                                 </div>
                                 {usernameError ? (
                                     <p className="text-[11px] text-red-500 mt-1.5 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {usernameError}</p>
                                 ) : (
                                     <p className="text-[11px] text-zinc-500 font-bold mt-1.5">You can leave this blank to let us generate one for you.</p>
                                 )}
                             </div>

                             <button type="submit" disabled={loading || usernameStatus === "checking" || usernameStatus === "unavailable"} className={btnCls}>
                                 {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                 {loading ? "Saving..." : "Complete Profile"}
                             </button>
                         </form>
                     )}

                     {/* Step 4: Done */}
                     {step === "done" && (
                         <div className="p-8 text-center space-y-3">
                             <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                                 <CheckCircle2 className="w-6 h-6 text-primary" />
                             </div>
                             <h2 className="text-base font-black text-black tracking-tight">Welcome! 🎉</h2>
                             <p className="text-[11px] text-zinc-950 font-bold">Redirecting you...</p>
                             <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" />
                         </div>
                     )}
                 </div>

                 {/* Footer */}
                 <p className="text-center text-[10px] text-zinc-500 font-bold mt-6">
                     By creating an account, you agree to our Terms & Privacy Policy.
                 </p>
            </div>
        </div>
    );
}
