"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, Gift, Coins, TrendingUp, AlertTriangle, Copy, Check, ArrowLeft } from "lucide-react";

export default function WalletPage() {
    const { data: session, status: authStatus } = useSession();
    const [balance, setBalance] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [referral, setReferral] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (authStatus !== "authenticated") return;
        Promise.all([
            fetch("/api/wallet/balance").then(r => r.json()),
            fetch("/api/wallet/history").then(r => r.json()),
            fetch("/api/referrals").then(r => r.json()),
        ]).then(([bal, hist, ref]) => {
            setBalance(bal);
            setHistory(Array.isArray(hist) ? hist : hist.transactions || []);
            setReferral(ref);
        }).catch(() => { }).finally(() => setLoading(false));
    }, [authStatus]);

    function copyReferral() {
        if (referral?.referralCode) {
            navigator.clipboard.writeText(referral.referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    if (authStatus === "loading") return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    if (authStatus === "unauthenticated") return (
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h1 className="text-2xl font-bold mb-2">Foodie Wallet</h1>
            <p className="text-gray-500 mb-4">Log in to access your Foodie Coins</p>
            <Link href="/login" className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm">Log In</Link>
        </div>
    );

    return (
        <div className="min-h-screen pb-24 md:pb-8" style={{ backgroundColor: "#fafafa" }}>
            {/* ═══ APP HEADER ═══ */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/account" className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors active:scale-95">
                            <ArrowLeft className="w-5 h-5 text-gray-700" />
                        </Link>
                        <h1 className="font-bold text-lg tracking-tight text-gray-900">Foodie Wallet</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }} />)}
                    </div>
                ) : (
                    <>
                        {/* Balance Card */}
                        <div className="relative overflow-hidden text-white rounded-[20px] p-6 shadow-lg"
                            style={{ background: "linear-gradient(135deg, #231408 0%, #1a0e05 50%, #cc2830 100%)" }}>
                            {/* Decorative orbs */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/50/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>

                            <p className="relative text-[11px] font-bold opacity-70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <Wallet className="w-3.5 h-3.5" /> Available Balance
                            </p>
                            <div className="relative flex items-baseline gap-2 mt-2">
                                <span className="text-5xl font-black tracking-tight" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
                                    {balance?.balance || 0}
                                </span>
                                <span className="text-sm font-bold opacity-80 uppercase tracking-wide">Coins</span>
                            </div>

                            {balance?.expiringCoins > 0 && (
                                <div className="relative mt-4 bg-red-500/20 text-red-100 px-3 py-1.5 border border-red-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 inline-flex w-max backdrop-blur-sm">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {balance.expiringCoins} coins expiring soon
                                </div>
                            )}

                            <div className="relative mt-6 grid grid-cols-2 gap-3">
                                <div className="bg-white/10 backdrop-blur-sm border border-white/5 rounded-xl p-3.5">
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Total Earned</p>
                                    <p className="text-xl font-bold">{balance?.totalEarned || 0}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm border border-white/5 rounded-xl p-3.5">
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Total Redeemed</p>
                                    <p className="text-xl font-bold">{balance?.totalRedeemed || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Referral Card */}
                        {referral?.referralCode && (
                            <div className="bg-white border text-gray-900 border-gray-100 rounded-[20px] p-5 relative overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none"></div>

                                <div className="flex items-center gap-2 mb-2 relative">
                                    <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                                        <Gift className="w-4 h-4" />
                                    </div>
                                    <h3 className="font-bold text-[15px]">Refer & Earn</h3>
                                </div>
                                <p className="text-[13px] text-gray-500 mb-4 relative leading-relaxed pr-6">
                                    Share your referral code with friends. Both of you earn Foodie Coins when they join!
                                </p>

                                <div className="flex items-stretch gap-2 relative">
                                    <div className="flex-1 bg-gray-50 border border-gray-200 px-4 flex items-center rounded-xl">
                                        <code className="text-[15px] font-bold text-gray-800 tracking-wider font-mono">{referral.referralCode}</code>
                                    </div>
                                    <button onClick={copyReferral} className="text-white px-5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center shrink-0 min-w-[56px]"
                                        style={{ backgroundColor: copied ? "#10b981" : "#e8323b", boxShadow: copied ? "0 2px 8px rgba(16,185,129,0.25)" : "0 2px 8px rgba(232, 50, 59,0.25)" }}>
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6 text-[13px] relative">
                                    <span className="text-gray-500">Referrals: <b className="text-gray-900 ml-1">{referral.totalReferrals || 0}</b></span>
                                    <span className="text-gray-500">Earned: <b className="text-green-600 ml-1">+{referral.totalEarned || 0} <span className="font-medium text-xs">C</span></b></span>
                                </div>
                            </div>
                        )}

                        {/* Transaction History */}
                        <div className="mt-6">
                            <h3 className="font-bold text-base mb-3.5 text-gray-900">Recent Transactions</h3>
                            {history.length === 0 ? (
                                <div className="bg-white rounded-[20px] border border-gray-100 p-10 text-center text-gray-400 text-sm shadow-sm">
                                    <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Coins className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p className="font-medium">No transactions yet</p>
                                    <p className="text-xs mt-1">Complete bookings to earn Foodie Coins!</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {history.map((tx: any, i: number) => (
                                        <div key={i} className="bg-white rounded-[16px] border border-gray-100 p-4 flex items-center gap-3.5 transition-all hover:bg-gray-50/50" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.02)" }}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.direction === "Credit" ? "bg-green-100/50" : "bg-red-100/50"}`}>
                                                {tx.direction === "Credit" ? <ArrowDownLeft className="w-4 h-4 text-green-600" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] text-gray-900 font-bold truncate leading-tight">{tx.description || tx.source}</p>
                                                <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{new Date(tx.createdAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric", hour: 'numeric', minute: '2-digit' })}</p>
                                            </div>
                                            <div className={`font-black tracking-tight ${tx.direction === "Credit" ? "text-green-600" : "text-gray-900"}`} style={{ fontSize: "15px" }}>
                                                {tx.direction === "Credit" ? "+" : "-"}{tx.amount}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
