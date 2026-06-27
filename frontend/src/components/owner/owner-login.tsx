"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import {
  Loader2, Store, Lock, Eye, EyeOff, ShieldAlert, RefreshCw, MessageCircle, ArrowRight
} from "lucide-react";
import { useLoginGuard } from "@/hooks/use-login-guard";

export function OwnerLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const guard = useLoginGuard("owner");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!guard.validateCaptcha()) return;

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        loginType: "owner",
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || "Invalid owner credentials.");
        await guard.recordFailure();
      } else {
        await guard.recordSuccess();
        router.push("/owner");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
      await guard.recordFailure();
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] font-medium bg-gray-50/60 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-300";
  const labelCls = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5";
  const btnCls = "w-full bg-primary text-white font-bold py-2.5 rounded-lg hover:brightness-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-[13px] shadow-sm shadow-primary/15 active:scale-[0.98]";

  if (guard.loaded && guard.blocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-sm border border-gray-100 rounded-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Access Temporarily Blocked</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
                Too many failed login attempts. Your IP has been temporarily blocked for 24 hours.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-left">
              <p className="text-[11px] text-amber-700 font-medium">
                Need help accessing your restaurant dashboard? Contact support.
              </p>
            </div>
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-1.5 text-primary text-xs font-bold hover:underline"
            >
              Contact Support →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-100 rounded-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Restaurant Partner</h2>
            <p className="text-xs text-gray-500 mt-1">Sign in to manage your branches</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 text-[13px] px-3.5 py-2.5 rounded-lg border border-red-100 font-medium leading-snug">
                {error}
              </div>
            )}

            {guard.warningMessage && (
              <div className="bg-amber-50 border border-amber-100 text-amber-700 px-3.5 py-2.5 rounded-lg text-[13px] font-medium flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="leading-snug">{guard.warningMessage}</p>
                  <Link href="/contact-us" className="text-[11px] text-primary font-bold hover:underline mt-1 inline-block">Need help? Contact support →</Link>
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>Business Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="restaurant@example.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={labelCls + " !mb-0"}>Password</label>
                <Link href="/forgot-password" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls + " pr-10"}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
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
                    <input
                        value={guard.captchaInput}
                        onChange={e => guard.setCaptchaInput(e.target.value.replace(/\D/g, ""))}
                        type="text"
                        inputMode="numeric"
                        required
                        placeholder="?"
                        maxLength={4}
                        className="w-16 border border-gray-200 rounded-lg px-2.5 py-2 text-[13px] text-center font-bold bg-gray-50/60 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-300"
                    />
                    <button
                        type="button"
                        onClick={guard.regenerateCaptcha}
                        className="text-gray-300 hover:text-primary transition-colors p-1 flex-shrink-0"
                        title="New question"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
                {guard.captchaError && (
                    <p className="text-[11px] text-red-500 font-medium mt-1">{guard.captchaError}</p>
                )}
            </div>

            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              {loading ? "Signing in..." : "Sign In to Dashboard"}
            </button>
          </form>

          <div className="mt-5 text-center text-[12px] text-gray-400">
            Interested in listing your restaurant?{" "}
            <Link
              href="/register/owner"
              className="text-primary font-bold hover:underline"
            >
              Apply here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
