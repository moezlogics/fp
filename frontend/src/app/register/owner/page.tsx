"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
    Building2, Phone, Mail, Lock, User, CreditCard, MapPin,
    CheckCircle2, Loader2, ArrowRight, ArrowLeft, Store, GitBranch, Building,
    Eye, EyeOff
} from "lucide-react";

type Step = "email" | "otp" | "details" | "restaurant" | "success";

export default function OwnerRegistrationPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("email");
    const [cities, setCities] = useState<any[]>([]);
    const [logoUrl, setLogoUrl] = useState("");

    // ── Step 1: Email ──
    const [email, setEmail] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState("");

    // ── Step 2: OTP ──
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState("");
    const [resendCooldown, setResendCooldown] = useState(60);
    const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

    // ── Step 3: Details ──
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [cnicNumber, setCnicNumber] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // ── Step 4: Restaurant ──
    const [businessName, setBusinessName] = useState("");
    const [city, setCity] = useState("");
    const [branchType, setBranchType] = useState<"single" | "multi">("single");

    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
    const [checkingName, setCheckingName] = useState(false);

    // Fetch cities
    useEffect(() => {
        fetch("/api/cities").then(r => r.json()).then(d => {
            setCities(Array.isArray(d) ? d : d?.data || []);
        }).catch(() => { });
    }, []);

    // Debounced name check
    useEffect(() => {
        if (step !== "restaurant" || !businessName.trim()) {
            setNameAvailable(null);
            return;
        }

        const timer = setTimeout(async () => {
            setCheckingName(true);
            try {
                const res = await fetch(`/api/restaurants/check-name?name=${encodeURIComponent(businessName.trim())}`);
                const data = await res.json();
                if (res.ok && data?.data) {
                    setNameAvailable(data.data.available);
                } else {
                    setNameAvailable(null);
                }
            } catch {
                setNameAvailable(null);
            } finally {
                setCheckingName(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [businessName, step]);

    // OTP cooldown timer
    useEffect(() => {
        if (resendCooldown > 0 && step === "otp") {
            const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [resendCooldown, step]);

    useEffect(() => {
        fetch("/api/settings/public").then(r => r.json()).then(d => {
            if (d?.logoUrl) setLogoUrl(d.logoUrl);
        }).catch(() => {});
    }, []);

    // ── Step 1: Send OTP ──
    const handleSendOTP = async () => {
        if (!email.trim()) { setEmailError("Email is required."); return; }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) { setEmailError("Please enter a valid email."); return; }

        setEmailLoading(true);
        setEmailError("");
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: "register" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send OTP");
            setStep("otp");
            setResendCooldown(60);
        } catch (err: any) {
            setEmailError(err.message);
        } finally {
            setEmailLoading(false);
        }
    };

    // ── Step 2: Verify OTP ──
    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) otpInputs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpInputs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newOtp = [...otp];
        paste.split("").forEach((char, i) => { newOtp[i] = char; });
        setOtp(newOtp);
        const focusIndex = Math.min(paste.length, 5);
        otpInputs.current[focusIndex]?.focus();
    };

    const handleVerifyOTP = async () => {
        const code = otp.join("");
        if (code.length !== 6) { setOtpError("Please enter the 6-digit code."); return; }

        setOtpLoading(true);
        setOtpError("");
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Invalid OTP");

            if (data.data?.isNewUser === false) {
                setOtpError("An account with this email already exists. Please login instead.");
                return;
            }

            setStep("details");
        } catch (err: any) {
            setOtpError(err.message);
        } finally {
            setOtpLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (resendCooldown > 0) return;
        setResendCooldown(60);
        await fetch("/api/auth/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: "register" }),
        });
    };

    // ── Step 3 → 4 ──
    const handleDetailsNext = () => {
        if (!name.trim()) { setSubmitError("Full name is required."); return; }
        if (!password || password.length < 8) { setSubmitError("Password must be at least 8 characters."); return; }
        if (!phone.trim()) { setSubmitError("Phone number is required."); return; }
        setSubmitError("");
        setStep("restaurant");
    };

    // ── Step 4: Submit Registration + Auto-Login ──
    const handleRegister = async () => {
        if (!businessName.trim()) { setSubmitError("Restaurant name is required."); return; }
        if (nameAvailable === false) { setSubmitError("This restaurant name is already taken."); return; }
        if (!city) { setSubmitError("Please select your city."); return; }

        setSubmitLoading(true);
        setSubmitError("");
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                    phone: phone.trim(),
                    businessName: businessName.trim(),
                    cnicNumber: cnicNumber.trim() || undefined,
                    city,
                    branchType,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.data?.error || "Registration failed");

            // Auto-login after successful registration
            try {
                const loginResult = await signIn("credentials", {
                    tokenData: JSON.stringify({
                        user: data.data.user,
                        tokens: data.data.tokens,
                    }),
                    redirect: false,
                });

                if (loginResult?.error) {
                    console.error("Auto-login failed:", loginResult.error);
                    setStep("success"); // Fallback to success message
                } else {
                    // Small delay to allow session cookie to propagate
                    await new Promise(resolve => setTimeout(resolve, 500));
                    window.location.href = "/owner";
                }
            } catch (loginErr) {
                console.error("Auto-login critical error:", loginErr);
                setStep("success");
            }
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSubmitLoading(false);
        }
    };

    const steps: Step[] = ["email", "otp", "details", "restaurant"];
    const currentStepIndex = steps.indexOf(step);
    const stepLabels = ["Email", "Verify", "Personal", "Business"];

    const inputCls = "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium bg-gray-50/60 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-300";
    const labelCls = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5";
    const btnCls = "w-full bg-primary text-white font-bold py-2.5 rounded-lg hover:brightness-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-[13px] shadow-sm shadow-primary/15 active:scale-[0.98]";

    if (step === "success") {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white py-8 px-6 shadow-sm border border-gray-100 rounded-2xl text-center space-y-4">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Application Submitted!</h1>
                    <p className="text-[12px] text-gray-500 leading-relaxed max-w-[280px] mx-auto">
                        Thank you for registering. Our team will review your application and contact you within <b>24-48 hours</b>.
                    </p>
                    <Link href="/owner" className={btnCls + " mt-4"}>
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-[400px]">
                {/* Header */}
                <div className="text-center mb-6">
                    <Link href="/" className="inline-block">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Foodies Pakistan" className="h-8 mx-auto -mt-1 object-contain" />
                        ) : (
                            <h1 className="text-xl font-black text-primary italic tracking-tight">Foodies Pakistan</h1>
                        )}
                    </Link>
                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mt-1">Partner Registration</p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-0 mb-6 px-4">
                    {stepLabels.map((label, i) => (
                        <div key={label} className="flex items-center flex-1 justify-center relative">
                            <div className="flex flex-col items-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 transition-all duration-300 ${i <= currentStepIndex
                                    ? "bg-primary text-white shadow-sm shadow-primary/20"
                                    : "bg-gray-100 text-gray-400"
                                    }`}>
                                    {i < currentStepIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                                </div>
                                <span className={`text-[9px] font-bold mt-1.5 uppercase tracking-wider absolute -bottom-5 whitespace-nowrap ${i <= currentStepIndex ? "text-gray-700" : "text-gray-300"}`}>{label}</span>
                            </div>
                            {i < 3 && <div className={`flex-1 h-0.5 absolute top-3 left-[50%] w-full -z-0 transition-all duration-300 ${i < currentStepIndex ? "bg-primary" : "bg-gray-100"}`} />}
                        </div>
                    ))}
                </div>

                <div className="bg-white py-6 px-6 mt-8 shadow-sm border border-gray-100 rounded-2xl">
                    {/* ═══ Step 1: Email ═══ */}
                    {step === "email" && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <h2 className="text-base font-bold text-gray-900 tracking-tight">Enter Your Email</h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">We&apos;ll verify your business identity</p>
                            </div>

                            {emailError && <div className="bg-red-50 text-red-600 text-[13px] px-3.5 py-2.5 rounded-lg border border-red-100 font-medium leading-snug">{emailError}</div>}

                            <div>
                                <label className={labelCls}>Business Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleSendOTP()}
                                    placeholder="restaurant@example.com"
                                    className={inputCls}
                                />
                            </div>

                            <button onClick={handleSendOTP} disabled={emailLoading} className={btnCls}>
                                {emailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                                {emailLoading ? "Sending Code..." : "Continue"}
                            </button>

                            <p className="text-center text-[11px] text-gray-400 mt-2">
                                Already registered? <Link href="/owner" className="text-primary font-bold hover:underline">Login</Link>
                            </p>
                        </div>
                    )}

                    {/* ═══ Step 2: OTP Verification ═══ */}
                    {step === "otp" && (
                        <div className="space-y-4">
                            <button type="button" onClick={() => { setStep("email"); setEmailError(""); }} className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider mb-2">
                                <ArrowLeft className="w-3 h-3" /> Back
                            </button>

                            <div className="text-center mb-4">
                                <h2 className="text-base font-bold text-gray-900 tracking-tight">Verify Email</h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    Code sent to <span className="text-gray-700 font-semibold">{email}</span>
                                </p>
                            </div>

                            {otpError && <div className="bg-red-50 text-red-600 text-[13px] px-3.5 py-2.5 rounded-lg border border-red-100 font-medium leading-snug">{otpError}</div>}

                            <div className="flex justify-center gap-1.5" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={el => { otpInputs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                        className={`w-10 h-11 text-center text-base font-bold border rounded-lg transition-all outline-none ${
                                            digit ? "border-primary bg-primary/5 text-primary" : "border-gray-200 bg-gray-50/60 text-gray-900 hover:border-gray-300"
                                        } focus:border-primary focus:ring-1 focus:ring-primary/20`}
                                    />
                                ))}
                            </div>

                            <button onClick={handleVerifyOTP} disabled={otpLoading || otp.join("").length !== 6} className={btnCls}>
                                {otpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                {otpLoading ? "Verifying..." : "Verify & Continue"}
                            </button>

                            <p className="text-center text-[11px] text-gray-400">
                                Didn&apos;t receive it?{" "}
                                {resendCooldown > 0 ? (
                                    <span className="text-gray-500 font-semibold">Resend in {resendCooldown}s</span>
                                ) : (
                                    <button type="button" onClick={handleResendOTP} disabled={otpLoading} className="text-primary font-bold hover:underline">Resend Code</button>
                                )}
                            </p>
                        </div>
                    )}

                    {/* ═══ Step 3: Personal Details ═══ */}
                    {step === "details" && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <h2 className="text-base font-bold text-gray-900 tracking-tight">Personal Details</h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">Tell us about yourself</p>
                            </div>

                            {submitError && <div className="bg-red-50 text-red-600 text-[13px] px-3.5 py-2.5 rounded-lg border border-red-100 font-medium leading-snug">{submitError}</div>}

                            <div>
                                <label className={labelCls}>Full Name *</label>
                                <input value={name} onChange={e => setName(e.target.value)} required placeholder="Ahmed Khan" className={inputCls} />
                            </div>

                            <div>
                                <label className={labelCls}>Password *</label>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 characters" minLength={8} className={inputCls + " pr-10"} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Phone *</label>
                                    <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="03299493973" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>CNIC</label>
                                    <input value={cnicNumber} onChange={e => setCnicNumber(e.target.value)} placeholder="Optional" className={inputCls} />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setStep("otp")} className="px-4 py-2.5 rounded-lg border border-gray-200 text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition flex items-center gap-1">
                                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                                </button>
                                <button onClick={handleDetailsNext} className={btnCls + " flex-1"}>
                                    Continue <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ Step 4: Restaurant Info ═══ */}
                    {step === "restaurant" && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <h2 className="text-base font-bold text-gray-900 tracking-tight">Restaurant Details</h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">This name will be your brand name</p>
                            </div>

                            {submitError && <div className="bg-red-50 text-red-600 text-[13px] px-3.5 py-2.5 rounded-lg border border-red-100 font-medium leading-snug">{submitError}</div>}

                            <div>
                                <label className={labelCls}>Restaurant / Brand Name *</label>
                                <div className="relative">
                                    <input value={businessName} onChange={e => setBusinessName(e.target.value)} required placeholder="e.g. Haveli"
                                        className={`${inputCls} pr-10 ${nameAvailable === false ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20" : ""}`} />
                                    {checkingName && <Loader2 className="w-4 h-4 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
                                </div>
                                <div className="flex justify-between items-start mt-1 px-1">
                                    <p className="text-[9px] text-gray-400">Cannot be changed later.</p>
                                    {businessName.trim() && !checkingName && nameAvailable !== null && (
                                        <span className={`text-[9px] font-bold ${nameAvailable ? "text-green-600" : "text-red-500"}`}>
                                            {nameAvailable ? "✓ Available" : "❌ Taken"}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>City *</label>
                                <select value={city} onChange={e => setCity(e.target.value)} required className={inputCls + " bg-white"}>
                                    <option value="">Select City</option>
                                    {cities.map((c: any) => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>Branch Type *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setBranchType("single")}
                                        className={`p-3 rounded-lg border transition-all text-left flex flex-col gap-1 ${branchType === "single"
                                            ? "border-primary bg-primary/5 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-gray-50/60"}`}>
                                        <Building className={`w-4 h-4 ${branchType === "single" ? "text-primary" : "text-gray-400"}`} />
                                        <span className={`font-bold text-[12px] ${branchType === "single" ? "text-primary" : "text-gray-700"}`}>Single Branch</span>
                                        <span className="text-[9px] text-gray-400 leading-tight">One location only</span>
                                    </button>
                                    <button type="button" onClick={() => setBranchType("multi")}
                                        className={`p-3 rounded-lg border transition-all text-left flex flex-col gap-1 ${branchType === "multi"
                                            ? "border-primary bg-primary/5 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-gray-50/60"}`}>
                                        <GitBranch className={`w-4 h-4 ${branchType === "multi" ? "text-primary" : "text-gray-400"}`} />
                                        <span className={`font-bold text-[12px] ${branchType === "multi" ? "text-primary" : "text-gray-700"}`}>Multi Branch</span>
                                        <span className="text-[9px] text-gray-400 leading-tight">Chain with many locations</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button onClick={() => { setSubmitError(""); setStep("details"); }} className="px-4 py-2.5 rounded-lg border border-gray-200 text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition flex items-center gap-1">
                                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                                </button>
                                <button onClick={handleRegister} disabled={submitLoading} className={btnCls + " flex-1"}>
                                    {submitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                    {submitLoading ? "Creating..." : "Create Account"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
