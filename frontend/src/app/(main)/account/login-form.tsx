"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Loader2, Eye, EyeOff, ShieldAlert, RefreshCw, ArrowRight } from "lucide-react";
import { useLoginGuard } from "@/hooks/use-login-guard";
import { executeRedirectIntent } from "@/lib/auth-redirect";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isSessionExpired = searchParams.get("sessionExpired") === "true";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const guard = useLoginGuard("user");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!guard.validateCaptcha()) return;

        setLoading(true);
        try {
            const result = await signIn("credentials", {
                email,
                password,
                loginType: "user",
                redirect: false,
            });

            if (result?.error) {
                setError(result.error || "Invalid email or password. Please try again.");
                await guard.recordFailure();
            } else {
                await guard.recordSuccess();
                const hadIntent = await executeRedirectIntent(router);
                if (!hadIntent) {
                    router.push("/account");
                }
                router.refresh();
            }
        } catch {
            setError("Something went wrong. Please try again.");
            await guard.recordFailure();
        } finally {
            setLoading(false);
        }
    };

    // ── Blocked Screen ──
    if (guard.loaded && guard.blocked) {
        return (
            <div className="text-center space-y-4 py-6">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-6 h-6 text-red-500" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-gray-900">Access Temporarily Blocked</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-[280px] mx-auto">
                        Too many failed attempts. Your IP is blocked for 24 hours.
                    </p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 text-left">
                    <p className="text-[11px] text-amber-700 font-medium">Need help getting in? Contact our support team.</p>
                </div>
                <Link
                    href="/contact-us"
                    className="inline-flex items-center gap-1.5 text-primary text-xs font-bold hover:underline"
                >
                    Contact Support →
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Session Expired Banner */}
            {isSessionExpired && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-[13px] font-medium flex items-start gap-2.5 mb-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="leading-snug">
                        Your session has expired for security reasons. Please sign in again to continue.
                    </p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 text-red-600 text-[13px] px-3.5 py-2.5 rounded-lg border border-red-100 font-medium leading-snug">
                    {error}
                </div>
            )}

            {/* Attempts Warning */}
            {guard.warningMessage && (
                <div className="bg-amber-50 border border-amber-100 text-amber-700 px-3.5 py-2.5 rounded-lg text-[13px] font-medium flex items-start gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="leading-snug">{guard.warningMessage}</p>
                        <Link href="/contact-us" className="text-[11px] text-primary font-bold hover:underline mt-1 inline-block">
                            Need help? Contact Support →
                        </Link>
                    </div>
                </div>
            )}

            {/* Email */}
            <div>
                <label className="block text-[11px] font-black text-black uppercase tracking-wider mb-1.5">Email</label>
                <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full border border-gray-350 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold bg-white focus:border-primary focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-400 text-black"
                />
            </div>

            {/* Password */}
            <div>
                <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-black text-black uppercase tracking-wider">Password</label>
                    <Link href="/forgot-password" className="text-[10px] font-black text-primary hover:underline uppercase tracking-wider">
                        Forgot?
                    </Link>
                </div>
                <div className="relative">
                    <input
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="w-full border border-gray-350 rounded-lg px-3.5 py-2.5 pr-10 text-[13px] font-semibold bg-white focus:border-primary focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-400 text-black"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Math CAPTCHA — compact inline */}
            <div>
                <label className="block text-[11px] font-black text-black uppercase tracking-wider mb-1.5">Security Check</label>
                <div className="flex items-center gap-2">
                    <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-mono font-black text-black select-none tracking-wider whitespace-nowrap">
                        {guard.mathQuestion} = ?
                    </div>
                    <input
                        value={guard.captchaInput}
                        onChange={e => guard.setCaptchaInput(e.target.value.replace(/\D/g, ""))}
                        type="text"
                        inputMode="numeric"
                        required
                        placeholder="?"
                        maxLength={4}
                        className="w-16 border border-gray-350 rounded-lg px-2.5 py-2 text-[13px] text-center font-black bg-white focus:border-primary focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-400 text-black"
                    />
                    <button
                        type="button"
                        onClick={guard.regenerateCaptcha}
                        className="text-gray-400 hover:text-primary transition-colors p-1 flex-shrink-0"
                        title="New question"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
                {guard.captchaError && (
                    <p className="text-[11px] text-red-600 font-bold mt-1">{guard.captchaError}</p>
                )}
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-black py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-[13px] shadow-sm active:scale-[0.98] uppercase tracking-wider"
            >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                {loading ? "Signing in..." : "Sign In"}
            </button>

            {/* Register link */}
            <p className="text-center text-[12px] text-zinc-950 font-bold">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary font-black hover:underline">Register here</Link>
            </p>
        </form>
    );
}
