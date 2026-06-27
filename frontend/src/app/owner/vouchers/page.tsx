"use client";

import { useState, useEffect } from "react";
import { useBranch } from "../owner-shell";
import { Ticket, Plus, QrCode, Calendar, Package, Loader2, X, CheckCircle, AlertCircle, Percent } from "lucide-react";

export default function OwnerVouchersPage() {
    const { branch } = useBranch();
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: "", description: "", originalPrice: 0, salePrice: 0, totalQuantity: 50, validFrom: "", validTo: "", termsAndConditions: "" });
    const [saving, setSaving] = useState(false);
    const [redeemCode, setRedeemCode] = useState("");
    const [redeemResult, setRedeemResult] = useState<any>(null);
    const [redeeming, setRedeeming] = useState(false);

    useEffect(() => {
        if (!branch?._id) return;
        setLoading(true);
        fetch(`/api/owner/vouchers?restaurantId=${branch._id}`)
            .then(r => r.json())
            .then(d => { const list = d?.data || d; setVouchers(Array.isArray(list) ? list : []); })
            .catch(() => setVouchers([]))
            .finally(() => setLoading(false));
    }, [branch?._id]);

    async function createVoucher() {
        setSaving(true);
        await fetch("/api/owner/vouchers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, restaurantId: branch._id }),
        });
        setShowCreate(false);
        setSaving(false);
        const res = await fetch(`/api/owner/vouchers?restaurantId=${branch._id}`);
        const raw = await res.json();
        const list = raw?.data || raw;
        setVouchers(Array.isArray(list) ? list : []);
    }

    async function redeemVoucher() {
        setRedeeming(true);
        setRedeemResult(null);
        try {
            const res = await fetch("/api/vouchers/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qrCode: redeemCode }),
            });
            const data = await res.json();
            setRedeemResult(data);
            if (res.ok) setRedeemCode("");
        } catch { setRedeemResult({ error: "Network error" }); }
        setRedeeming(false);
    }

    const inputClasses = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 focus:bg-white transition-all";

    return (
        <div className="space-y-6 max-w-3xl">
            {/* ═══ HEADER ═══ */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-primary" /> Vouchers
                    </h1>
                    <p className="text-[12px] text-gray-400 font-medium mt-0.5">Create & manage prepaid dining vouchers</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="text-white text-[12px] px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all active:scale-95"
                    style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                    <Plus className="w-4 h-4" /> Create Voucher
                </button>
            </div>

            {/* ═══ QR REDEEM SECTION ═══ */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-5 text-white">
                <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/5 rounded-full" />
                <div className="absolute -bottom-6 -left-4 w-20 h-20 bg-white/5 rounded-full" />
                <div className="relative z-10">
                    <h3 className="font-bold text-[14px] mb-3 flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-green-400" /> Scan / Enter QR Code
                    </h3>
                    <div className="flex gap-2">
                        <input value={redeemCode} onChange={e => setRedeemCode(e.target.value)} placeholder="Enter voucher QR code (e.g. VCH-XXXXXXXXXXXX)"
                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 outline-none transition-all" />
                        <button onClick={redeemVoucher} disabled={!redeemCode || redeeming}
                            className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-[12px] font-bold hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5 shrink-0">
                            {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            {redeeming ? "..." : "Redeem"}
                        </button>
                    </div>
                    {redeemResult && (
                        <div className={`mt-3 flex items-center gap-2 text-[13px] font-bold ${redeemResult.error ? "text-red-400" : "text-green-400"}`}>
                            {redeemResult.error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            {redeemResult.error || redeemResult.message}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ VOUCHERS GRID ═══ */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[1, 2].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
            ) : vouchers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                    <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                        <Package className="w-8 h-8 text-purple-300" />
                    </div>
                    <p className="font-bold text-gray-700 text-[14px]">No vouchers created yet</p>
                    <p className="text-[12px] text-gray-400 mt-1 max-w-xs">Create prepaid dining vouchers to attract more customers and increase upfront revenue</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vouchers.map((v: any) => {
                        const discount = v.originalPrice > 0 ? Math.round((1 - v.salePrice / v.originalPrice) * 100) : 0;
                        const soldPercent = v.totalQuantity > 0 ? (v.soldQuantity / v.totalQuantity) * 100 : 0;
                        return (
                            <div key={v._id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-sm transition-all group" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.02)" }}>
                                {/* Top accent */}
                                <div className="h-1 bg-gradient-to-r from-primary/50 to-primary" />
                                <div className="p-5 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-[15px] text-gray-900 truncate">{v.title}</h3>
                                            {v.description && <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{v.description}</p>}
                                        </div>
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider shrink-0 ml-3 ${v.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                                            {v.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </div>

                                    {/* Pricing */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-[13px] text-gray-400 line-through font-medium">Rs. {v.originalPrice?.toLocaleString()}</span>
                                        <span className="text-[17px] font-black text-emerald-700">Rs. {v.salePrice?.toLocaleString()}</span>
                                        {discount > 0 && (
                                            <span className="text-[10px] font-black bg-green-50 text-green-700 px-2 py-0.5 rounded-md border border-green-100">
                                                {discount}% OFF
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress */}
                                    <div>
                                        <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium mb-1.5">
                                            <span>Sold: {v.soldQuantity}/{v.totalQuantity}</span>
                                            <span>Redeemed: {v.redeemedQuantity}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div className="bg-gradient-to-r from-primary/50 to-primary h-2 rounded-full transition-all duration-500" style={{ width: `${soldPercent}%` }} />
                                        </div>
                                    </div>

                                    {/* Validity */}
                                    <div className="text-[11px] text-gray-400 flex items-center gap-1 font-medium">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(v.validFrom).toLocaleDateString("en-PK", { month: "short", day: "numeric" })} — {new Date(v.validTo).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══ CREATE VOUCHER MODAL ═══ */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <h3 className="font-black text-[16px]">Create Voucher</h3>
                            <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition active:scale-95">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
                                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Iftar Buffet Deal" className={inputClasses} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe your voucher offer"
                                    className={`${inputClasses} resize-none h-16`} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Original Price</label>
                                    <input type="number" value={form.originalPrice || ""} onChange={e => setForm({ ...form, originalPrice: Number(e.target.value) })} className={inputClasses} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Sale Price</label>
                                    <input type="number" value={form.salePrice || ""} onChange={e => setForm({ ...form, salePrice: Number(e.target.value) })} className={inputClasses} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Total Quantity</label>
                                <input type="number" value={form.totalQuantity || ""} onChange={e => setForm({ ...form, totalQuantity: Number(e.target.value) })} className={inputClasses} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Valid From</label>
                                    <input type="date" value={form.validFrom} onChange={e => setForm({ ...form, validFrom: e.target.value })} className={inputClasses} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Valid To</label>
                                    <input type="date" value={form.validTo} onChange={e => setForm({ ...form, validTo: e.target.value })} className={inputClasses} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Terms & Conditions</label>
                                <textarea value={form.termsAndConditions} onChange={e => setForm({ ...form, termsAndConditions: e.target.value })} placeholder="Optional terms"
                                    className={`${inputClasses} resize-none h-16`} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-[13px]">
                                    Cancel
                                </button>
                                <button onClick={createVoucher} disabled={saving || !form.title}
                                    className="flex-1 flex justify-center items-center px-4 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-50 active:scale-95 text-[13px]"
                                    style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Voucher"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
