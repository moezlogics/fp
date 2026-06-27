"use client";

import { useState, useEffect, useCallback } from "react";
import { useBranch } from "../owner-shell";
import { Wallet, CheckCircle, Clock, AlertTriangle, TrendingUp, Banknote, ArrowDownToLine, Building2, Loader2, X } from "lucide-react";
import Link from "next/link";

export default function OwnerSettlementsPage() {
    const { branch } = useBranch();
    const [data, setData] = useState<any>({ settlements: [], summary: { totalPaid: 0, totalPending: 0 } });
    const [wallet, setWallet] = useState<any>(null);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState("");
    const [withdrawSuccess, setWithdrawSuccess] = useState("");

    const fetchData = useCallback(async () => {
        if (!branch?._id) return;
        setLoading(true);
        try {
            const [settlementsRes, walletRes, withdrawalsRes] = await Promise.all([
                fetch(`/api/owner/settlements?restaurantId=${branch._id}`).then(r => r.json()),
                fetch(`/api/owner/merchant-wallet/balance?restaurantId=${branch._id}`).then(r => r.json()),
                fetch(`/api/owner/merchant-wallet/withdrawals?restaurantId=${branch._id}`).then(r => r.json()),
            ]);

            const payload = settlementsRes?.data || settlementsRes;
            setData({
                settlements: payload?.settlements || [],
                summary: payload?.summary || { totalPaid: 0, totalPending: 0 },
            });
            setWallet(walletRes?.data || walletRes || null);
            setWithdrawals(withdrawalsRes?.data?.withdrawals || withdrawalsRes?.withdrawals || []);
        } catch {
            setData({ settlements: [], summary: { totalPaid: 0, totalPending: 0 } });
        }
        setLoading(false);
    }, [branch?._id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    async function handleWithdraw(e: React.FormEvent) {
        e.preventDefault();
        setWithdrawError("");
        setWithdrawSuccess("");

        const amountRs = parseFloat(withdrawAmount);
        if (!amountRs || amountRs < 100) {
            setWithdrawError("Minimum withdrawal is Rs. 100");
            return;
        }

        setWithdrawing(true);
        try {
            const res = await fetch(`/api/owner/merchant-wallet/withdraw`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    restaurantId: branch?._id,
                    amountPaisa: Math.round(amountRs * 100),
                }),
            });
            const result = await res.json();
            if (!res.ok) {
                setWithdrawError(result.error || "Failed to request withdrawal");
            } else {
                setWithdrawSuccess(result.data?.message || result.message || "Withdrawal requested!");
                setShowWithdrawModal(false);
                setWithdrawAmount("");
                await fetchData();
            }
        } catch {
            setWithdrawError("Network error. Please try again.");
        }
        setWithdrawing(false);
    }

    const statusConfig: Record<string, { icon: any; color: string; bg: string; border: string }> = {
        Paid: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
        Pending: { icon: Clock, color: "text-primary", bg: "bg-primary/5", border: "border-primary/10" },
        Disputed: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
    };

    const withdrawalStatusConfig: Record<string, { color: string; bg: string }> = {
        Pending: { color: "text-primary", bg: "bg-primary/5" },
        Processing: { color: "text-blue-600", bg: "bg-blue-50" },
        Completed: { color: "text-emerald-600", bg: "bg-emerald-50" },
        Rejected: { color: "text-red-600", bg: "bg-red-50" },
    };

    const totalRevenue = (data.summary.totalPaid || 0) + (data.summary.totalPending || 0);
    const availableRs = wallet ? (wallet.availableBalancePaisa / 100) : 0;
    const pendingRs = wallet ? (wallet.pendingClearancePaisa / 100) : 0;
    const activeCommissionRate = data.settlements?.[0]?.commissionRate ?? (branch?.bookingSettings?.isPrimePartner ? 0 : 0.03);

    return (
        <div className="space-y-6">
            {/* ═══ HEADER ═══ */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" /> Settlements & Payouts
                    </h1>
                    <p className="text-[12px] text-gray-400 font-medium mt-0.5">Track FoodiePay earnings, pending clearance, and bank withdrawals.</p>
                    <p className="text-[11px] text-gray-400 mt-1">At-restaurant payments are collected directly by your branch. Only FoodiePay payments move into this wallet.</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                        {activeCommissionRate === 0
                            ? "This branch currently has zero FoodiePay commission."
                            : `Current FoodiePay commission: ${(activeCommissionRate * 100).toFixed(0)}% of merchant settlement.`}
                    </p>
                </div>
                <Link href="/owner/bank-details"
                    className="flex items-center gap-2 text-[12px] text-gray-500 hover:text-primary-dark bg-white border border-gray-200 px-3.5 py-2 rounded-xl font-bold hover:border-primary/20 transition-all active:scale-95">
                    <Building2 className="w-3.5 h-3.5" /> Bank Details
                </Link>
            </div>

            {/* ═══ WALLET BALANCE CARDS ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Available Balance */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white col-span-1 sm:col-span-2 lg:col-span-1">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                    <div className="absolute -bottom-8 -left-4 w-20 h-20 bg-white/5 rounded-full" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">Available</span>
                            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
                                <Wallet className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-black tracking-tight">Rs. {availableRs.toLocaleString()}</p>
                        <p className="text-[11px] text-white/70 font-medium mt-0.5">Ready to withdraw</p>
                    </div>
                </div>

                {/* Pending Clearance */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/50 to-primary p-5 text-white">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">Clearing</span>
                            <Clock className="w-5 h-5 text-white/60" />
                        </div>
                        <p className="text-2xl font-black tracking-tight">Rs. {pendingRs.toLocaleString()}</p>
                        <p className="text-[11px] text-white/70 font-medium mt-0.5">Processing (T+2 days)</p>
                    </div>
                </div>

                {/* Total Paid */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">Total Earned</span>
                            <TrendingUp className="w-5 h-5 text-white/60" />
                        </div>
                        <p className="text-2xl font-black tracking-tight">Rs. {(wallet?.totalEarnedPaisa ? wallet.totalEarnedPaisa / 100 : totalRevenue).toLocaleString()}</p>
                        <p className="text-[11px] text-white/70 font-medium mt-0.5">Lifetime earnings</p>
                    </div>
                </div>

                {/* Withdraw Button */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-5 text-white flex flex-col justify-between">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">Withdraw</span>
                            <ArrowDownToLine className="w-5 h-5 text-primary/80" />
                        </div>
                        <button
                            onClick={() => {
                                if (!wallet?.hasBankDetails) {
                                    window.location.href = "/owner/bank-details";
                                    return;
                                }
                                setShowWithdrawModal(true);
                            }}
                            disabled={availableRs < 100}
                            className="w-full mt-2 bg-primary/50 hover:bg-primary-dark text-white font-bold text-[12px] py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                        >
                            {!wallet?.hasBankDetails ? "Add Bank First" : availableRs < 100 ? "Min Rs. 100" : "Request Withdrawal"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══ WITHDRAWAL HISTORY ═══ */}
            {withdrawals.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                    <div className="px-5 py-4 border-b border-gray-50">
                        <h2 className="text-[14px] font-black text-gray-900 flex items-center gap-2">
                            <ArrowDownToLine className="w-4 h-4 text-primary" /> Withdrawal History
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {withdrawals.map((w: any) => {
                            const wsc = withdrawalStatusConfig[w.status] || withdrawalStatusConfig.Pending;
                            return (
                                <div key={w._id} className="px-5 py-3.5 flex items-center justify-between">
                                    <div>
                                        <p className="text-[13px] font-bold text-gray-900">Rs. {(w.amountPaisa / 100).toLocaleString()}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            {new Date(w.createdAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}
                                            {w.bankDetails?.bankName && ` · ${w.bankDetails.bankName.split(" (")[0]}`}
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${wsc.bg} ${wsc.color}`}>
                                        {w.status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══ SETTLEMENTS TABLE ═══ */}
            <div>
                <h2 className="text-[14px] font-black text-gray-900 mb-3 flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-primary" /> Weekly Settlements
                </h2>
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
            ) : data.settlements.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <Banknote className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="font-bold text-gray-700 text-[14px]">No settlements yet</p>
                    <p className="text-[12px] text-gray-400 mt-1 max-w-xs">Settlements are generated weekly based on completed bookings. Start getting bookings to see your payouts here.</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-50">
                                        <th className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Period</th>
                                        <th className="px-5 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Bookings</th>
                                        <th className="px-5 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Gross</th>
                                        <th className="px-5 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Fee</th>
                                        <th className="px-5 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Net Payable</th>
                                        <th className="px-5 py-4 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.settlements.map((s: any) => {
                                        const sc = statusConfig[s.status] || statusConfig.Pending;
                                        const StatusIcon = sc.icon;
                                        return (
                                            <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-5 py-4">
                                                    <p className="font-bold text-[13px] text-gray-900">
                                                        {new Date(s.periodStart).toLocaleDateString("en-PK", { month: "short", day: "numeric" })} — {new Date(s.periodEnd).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4 text-right font-bold text-[13px] text-gray-700">{s.totalBookings}</td>
                                                <td className="px-5 py-4 text-right font-bold text-[13px] text-gray-700">Rs. {s.totalGrossRevenue?.toLocaleString()}</td>
                                                <td className="px-5 py-4 text-right font-bold text-[13px] text-red-500">
                                                    -Rs. {s.totalCommission?.toLocaleString()}
                                                    <div className="text-[10px] font-semibold text-gray-400">
                                                        {(Number(s.commissionRate || 0) * 100).toFixed(0)}%
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right font-black text-[14px] text-emerald-700">Rs. {s.netPayable?.toLocaleString()}</td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1.5 rounded-lg ${sc.bg} ${sc.color} ${sc.border} border uppercase tracking-wider`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {s.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="sm:hidden space-y-3">
                        {data.settlements.map((s: any) => {
                            const sc = statusConfig[s.status] || statusConfig.Pending;
                            const StatusIcon = sc.icon;
                            return (
                                <div key={s._id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.02)" }}>
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-[13px] text-gray-900">
                                            {new Date(s.periodStart).toLocaleDateString("en-PK", { month: "short", day: "numeric" })} — {new Date(s.periodEnd).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}
                                        </p>
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${sc.bg} ${sc.color} ${sc.border} border`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {s.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                                        <div>
                                            <p className="text-gray-400 font-medium">Bookings</p>
                                            <p className="font-bold text-gray-900">{s.totalBookings}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 font-medium">Gross</p>
                                            <p className="font-bold text-gray-900">Rs. {s.totalGrossRevenue?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 font-medium">Fee</p>
                                            <p className="font-bold text-red-500">-Rs. {s.totalCommission?.toLocaleString()}</p>
                                            <p className="text-[10px] text-gray-400">{(Number(s.commissionRate || 0) * 100).toFixed(0)}%</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 font-medium">Net Payable</p>
                                            <p className="font-black text-emerald-700 text-[14px]">Rs. {s.netPayable?.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ═══ WITHDRAW MODAL ═══ */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-black text-[16px] flex items-center gap-2">
                                <ArrowDownToLine className="w-5 h-5 text-primary" /> Withdraw Funds
                            </h3>
                            <button onClick={() => { setShowWithdrawModal(false); setWithdrawError(""); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition active:scale-95">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleWithdraw} className="p-5 space-y-5">
                            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                <p className="text-[12px] text-emerald-600 font-bold">Available Balance</p>
                                <p className="text-2xl font-black text-emerald-700 mt-1">Rs. {availableRs.toLocaleString()}</p>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-700 mb-2">Withdrawal Amount (Rs.)</label>
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                    required
                                    min="100"
                                    max={availableRs}
                                    step="1"
                                    className="w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary px-4 py-3 text-[15px] font-bold text-gray-900 outline-none transition-all bg-gray-50 focus:bg-white"
                                    placeholder={`Max Rs. ${availableRs.toLocaleString()}`}
                                />
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-gray-500 font-medium">Transfer to</span>
                                    <span className="font-bold text-gray-900">{wallet?.bankDetails?.bankName?.split(" (")[0] || "Your bank"}</span>
                                </div>
                                <div className="flex items-center justify-between text-[12px] mt-1.5">
                                    <span className="text-gray-500 font-medium">IBAN</span>
                                    <span className="font-mono font-bold text-gray-700 text-[11px]">
                                        {wallet?.bankDetails?.iban
                                            ? wallet.bankDetails.iban.slice(0, 4) + "••••" + wallet.bankDetails.iban.slice(-4)
                                            : "Not set"}
                                    </span>
                                </div>
                            </div>
                            {withdrawError && (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                    <p className="text-[12px] font-bold text-red-700">{withdrawError}</p>
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={withdrawing || !withdrawAmount}
                                className="w-full font-bold py-3 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98] text-white text-[13px] flex items-center justify-center gap-2"
                                style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}
                            >
                                {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
                                {withdrawing ? "Processing..." : "Request Withdrawal"}
                            </button>
                            <p className="text-[10px] text-gray-400 text-center">Withdrawals are processed within 2-3 business days</p>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══ SUCCESS TOAST ═══ */}
            {withdrawSuccess && (
                <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
                    <CheckCircle className="w-5 h-5" />
                    <p className="text-[13px] font-bold">{withdrawSuccess}</p>
                </div>
            )}
        </div>
    );
}
