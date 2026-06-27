"use client";

import { useState, useEffect, useCallback } from "react";
import { useBranch } from "../owner-shell";
import {
    Plus, Loader2, Tag, Trash2, Percent, Calendar, CreditCard, Sparkles,
    ChevronDown, ChevronUp, X, CheckCircle, AlertCircle, Store, Globe, Smartphone,
} from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const APPLICABLE_OPTIONS = [
    { value: "both", label: "Both", desc: "Online + Dine-in", icon: Globe },
    { value: "online", label: "Online", desc: "FoodiesPay only", icon: Smartphone },
    { value: "dine-in", label: "Dine-in", desc: "Restaurant only", icon: Store },
] as const;

const inputClasses = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 focus:bg-white transition-all";
const labelClasses = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5";

interface DealForm {
    bankId: string;
    cardTypes: string[];
    discountPercent: number;
    maxDiscountCapPaisa: number;
    minSpendPaisa: number;
    daysValid: string[];
    applicableOn: "online" | "dine-in" | "both";
    description: string;
    validFrom: string;
    validTo: string;
}

const DEFAULT_FORM: DealForm = {
    bankId: "", cardTypes: [], discountPercent: 0, maxDiscountCapPaisa: 0,
    minSpendPaisa: 0, daysValid: [], applicableOn: "both",
    description: "", validFrom: "", validTo: "",
};

export default function OwnerDealsPage() {
    const { branch } = useBranch();
    const [deals, setDeals] = useState<any[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<DealForm>({ ...DEFAULT_FORM });
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState<"success" | "error">("success");

    const selectedBank = banks.find((b: any) => b._id === form.bankId);

    const showMessage = (text: string, type: "success" | "error") => {
        setMsg(text);
        setMsgType(type);
        setTimeout(() => setMsg(""), 4000);
    };

    const fetchDeals = useCallback(async () => {
        if (!branch?._id) return;
        try {
            const [d, b] = await Promise.all([
                fetch(`/api/owner/deals?restaurantId=${branch._id}`).then(r => r.json()),
                fetch("/api/banks").then(r => r.json()),
            ]);
            const dealsList = d?.data || d;
            const bankList = b?.data || b;
            setDeals(Array.isArray(dealsList) ? dealsList : []);
            setBanks(Array.isArray(bankList) ? bankList : []);
        } catch {
            showMessage("Failed to load deals", "error");
        }
        setLoading(false);
    }, [branch?._id]);

    useEffect(() => { fetchDeals(); }, [fetchDeals]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.discountPercent || form.discountPercent < 1) {
            showMessage("Please enter a valid discount percentage", "error");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/owner/deals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    restaurantId: branch._id,
                    bankId: form.bankId || undefined,
                    maxDiscountCapPaisa: Math.round(form.maxDiscountCapPaisa * 100),
                    minSpendPaisa: Math.round(form.minSpendPaisa * 100),
                    validFrom: form.validFrom || undefined,
                    validTo: form.validTo || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                showMessage("Deal created successfully!", "success");
                setForm({ ...DEFAULT_FORM });
                setShowForm(false);
                fetchDeals();
            } else {
                showMessage(data.error || "Failed to create deal", "error");
            }
        } catch {
            showMessage("Network error", "error");
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this deal?")) return;
        try {
            await fetch(`/api/owner/deals?dealId=${id}`, { method: "DELETE" });
            setDeals(prev => prev.filter(d => d._id !== id));
            showMessage("Deal deleted", "success");
        } catch {
            showMessage("Failed to delete deal", "error");
        }
    };

    const toggleActive = async (deal: any) => {
        try {
            await fetch(`/api/owner/deals?dealId=${deal._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !deal.isActive }),
            });
            setDeals(prev => prev.map(d => d._id === deal._id ? { ...d, isActive: !d.isActive } : d));
        } catch {
            showMessage("Failed to update deal", "error");
        }
    };

    const toggleDay = (day: string) => {
        setForm(prev => ({
            ...prev,
            daysValid: prev.daysValid.includes(day)
                ? prev.daysValid.filter(d => d !== day)
                : [...prev.daysValid, day],
        }));
    };

    const toggleCardType = (ct: string) => {
        setForm(prev => ({
            ...prev,
            cardTypes: prev.cardTypes.includes(ct)
                ? prev.cardTypes.filter(c => c !== ct)
                : [...prev.cardTypes, ct],
        }));
    };

    if (!branch) return null;

    return (
        <div className="space-y-6 max-w-3xl">
            {/* ═══ HEADER ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-primary" /> Deals & Offers
                    </h1>
                    <p className="text-[12px] text-gray-400 font-medium mt-0.5">
                        Create bank deals and promotional offers for your customers
                    </p>
                </div>
                {!showForm && (
                    <button onClick={() => setShowForm(true)}
                        className="text-white px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 active:scale-95 shrink-0"
                        style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                        <Plus className="w-4 h-4" /> New Deal
                    </button>
                )}
            </div>

            {msg && (
                <div className={`flex items-center gap-2 text-[13px] font-bold px-4 py-3 rounded-xl ${msgType === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                    {msgType === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {msg}
                </div>
            )}

            {/* ═══ CREATE DEAL FORM ═══ */}
            {showForm && (
                <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.03)" }}>
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-primary" />
                            </div>
                            <h2 className="font-bold text-[14px] text-gray-900">Create New Deal</h2>
                        </div>
                        <button type="button" onClick={() => { setShowForm(false); setForm({ ...DEFAULT_FORM }); }}
                            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition active:scale-95">
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                    <div className="p-5 space-y-5">
                        {/* Row 1: Bank + Discount */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>
                                    <CreditCard className="w-3 h-3 inline mr-1" /> Bank Partner
                                </label>
                                <select value={form.bankId} onChange={e => setForm({ ...form, bankId: e.target.value, cardTypes: [] })} className={inputClasses}>
                                    <option value="">No Bank (General Deal)</option>
                                    {banks.map((b: any) => <option key={b._id} value={b._id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>
                                    <Percent className="w-3 h-3 inline mr-1" /> Discount %
                                </label>
                                <input type="number" value={form.discountPercent || ""} min={1} max={100}
                                    onChange={e => setForm({ ...form, discountPercent: Math.max(0, Math.min(100, Number(e.target.value))) })}
                                    placeholder="e.g. 25" className={inputClasses} />
                            </div>
                        </div>

                        {/* Card Types (if bank selected) */}
                        {selectedBank?.cardTypes?.length > 0 && (
                            <div>
                                <label className={labelClasses}>Card Types (leave empty for all)</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedBank.cardTypes.map((ct: string) => (
                                        <button key={ct} type="button" onClick={() => toggleCardType(ct)}
                                            className={`text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all active:scale-95 ${form.cardTypes.includes(ct) ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>
                                            {ct}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Row 2: Max Cap + Min Spend */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Max Discount Cap (Rs.)</label>
                                <input type="number" value={form.maxDiscountCapPaisa || ""} min={0}
                                    onChange={e => setForm({ ...form, maxDiscountCapPaisa: Math.max(0, Number(e.target.value)) })}
                                    placeholder="0 = No cap" className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Min Bill Amount (Rs.)</label>
                                <input type="number" value={form.minSpendPaisa || ""} min={0}
                                    onChange={e => setForm({ ...form, minSpendPaisa: Math.max(0, Number(e.target.value)) })}
                                    placeholder="0 = No minimum" className={inputClasses} />
                            </div>
                        </div>

                        {/* Applicable On */}
                        <div>
                            <label className={labelClasses}>Applicable On</label>
                            <div className="grid grid-cols-3 gap-2">
                                {APPLICABLE_OPTIONS.map(opt => (
                                    <button key={opt.value} type="button"
                                        onClick={() => setForm({ ...form, applicableOn: opt.value })}
                                        className={`p-3 rounded-xl text-center border transition-all active:scale-95 ${form.applicableOn === opt.value ? "bg-primary/5 border-primary/20 text-primary" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                                        <opt.icon className="w-4 h-4 mx-auto mb-1" />
                                        <p className="text-[12px] font-bold">{opt.label}</p>
                                        <p className="text-[9px] mt-0.5 opacity-70">{opt.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Valid Days */}
                        <div>
                            <label className={labelClasses}>Valid Days (leave empty for all days)</label>
                            <div className="flex flex-wrap gap-1.5">
                                {DAYS.map(day => (
                                    <button key={day} type="button" onClick={() => toggleDay(day)}
                                        className={`text-[11px] px-2.5 py-1.5 rounded-lg font-bold transition-all active:scale-95 ${form.daysValid.includes(day) ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>
                                        {day.slice(0, 3)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Row 3: Validity Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>
                                    <Calendar className="w-3 h-3 inline mr-1" /> Valid From
                                </label>
                                <input type="date" value={form.validFrom} onChange={e => setForm({ ...form, validFrom: e.target.value })} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>
                                    <Calendar className="w-3 h-3 inline mr-1" /> Valid Until
                                </label>
                                <input type="date" value={form.validTo} onChange={e => setForm({ ...form, validTo: e.target.value })} className={inputClasses} />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className={labelClasses}>Description</label>
                            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="e.g., 25% off with HBL Platinum on weekdays"
                                className={inputClasses} />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 justify-end pt-1">
                            <button type="button" onClick={() => { setShowForm(false); setForm({ ...DEFAULT_FORM }); }}
                                className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-[13px]">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving}
                                className="px-6 py-2.5 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95 text-[13px]"
                                style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                {saving ? "Creating..." : "Create Deal"}
                            </button>
                        </div>

                        {/* Info box */}
                        <div className="p-3 bg-blue-50 text-blue-700 text-[12px] rounded-xl border border-blue-100 font-medium">
                            <strong>💡 How it works:</strong> Deals you create here will appear on your restaurant&apos;s booking page.
                            {" "}<strong>Online</strong> deals work with FoodiesPay (auto-detects bank card). <strong>Dine-in</strong> deals
                            are verified at the restaurant. <strong>Both</strong> applies everywhere.
                        </div>
                    </div>
                </form>
            )}

            {/* ═══ ACTIVE DEALS ═══ */}
            <div>
                <h2 className="font-bold text-[14px] text-gray-900 mb-3">Your Deals ({deals.length})</h2>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : deals.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center flex flex-col items-center" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                        <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-3">
                            <Tag className="w-7 h-7 text-purple-300" />
                        </div>
                        <p className="font-bold text-gray-600 text-[13px]">No deals yet</p>
                        <p className="text-[11px] text-gray-400 mt-1">Create your first deal to attract more customers</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {deals.map((d: any) => {
                            const isExpired = d.validTo && new Date(d.validTo) < new Date();
                            return (
                                <div key={d._id}
                                    className={`bg-white rounded-2xl border overflow-hidden transition-all group ${d.isActive && !isExpired ? "border-gray-100 hover:shadow-md" : "border-gray-100 opacity-60"}`}
                                    style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.02)" }}>
                                    <div className="p-4 flex items-center gap-4">
                                        {/* Discount badge */}
                                        <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center text-white shrink-0 ${d.bankId?.color ? "" : "bg-gradient-to-br from-green-500 to-emerald-600"}`}
                                            style={d.bankId?.color ? { backgroundColor: d.bankId.color } : {}}>
                                            <span className="text-[18px] font-black leading-none">{d.discountPercent}%</span>
                                            <span className="text-[8px] font-bold mt-0.5 uppercase tracking-wider opacity-80">OFF</span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {d.bankId?.name && (
                                                    <span className="text-[11px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                                                        {d.bankId.name}
                                                    </span>
                                                )}
                                                {!d.bankId && (
                                                    <span className="text-[11px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md">
                                                        General Deal
                                                    </span>
                                                )}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${d.applicableOn === "online" ? "bg-cyan-50 text-cyan-600" : d.applicableOn === "dine-in" ? "bg-primary/5 text-primary" : "bg-emerald-50 text-emerald-600"}`}>
                                                    {d.applicableOn === "both" ? "Online + Dine-in" : d.applicableOn === "online" ? "Online Only" : "Dine-in Only"}
                                                </span>
                                                {isExpired && <span className="text-[10px] font-bold bg-red-50 text-red-500 px-2 py-0.5 rounded-md">Expired</span>}
                                            </div>
                                            {d.description && (
                                                <p className="text-[13px] font-bold text-gray-900 mt-1 truncate">{d.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                {d.cardTypes?.length > 0 && (
                                                    <span className="text-[10px] text-gray-400 font-medium">{d.cardTypes.join(", ")}</span>
                                                )}
                                                {(d.validFrom || d.validTo) && (
                                                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {d.validFrom ? new Date(d.validFrom).toLocaleDateString("en-PK", { month: "short", day: "numeric" }) : "—"}
                                                        {" → "}
                                                        {d.validTo ? new Date(d.validTo).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" }) : "Ongoing"}
                                                    </span>
                                                )}
                                                {d.daysValid?.length > 0 && (
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {d.daysValid.map((dy: string) => dy.slice(0, 3)).join(", ")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => toggleActive(d)}
                                                className={`relative w-10 h-5 rounded-full transition-all duration-200 ${d.isActive ? "bg-emerald-500" : "bg-gray-200"}`}>
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${d.isActive ? "left-[20px]" : "left-0.5"}`} />
                                            </button>
                                            <button onClick={() => handleDelete(d._id)}
                                                className="w-8 h-8 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Extra info row */}
                                    {(d.maxDiscountCapPaisa > 0 || d.minSpendPaisa > 0) && (
                                        <div className="px-4 pb-3 flex gap-4">
                                            {d.maxDiscountCapPaisa > 0 && (
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    Max Discount: Rs. {Math.round(d.maxDiscountCapPaisa / 100).toLocaleString()}
                                                </span>
                                            )}
                                            {d.minSpendPaisa > 0 && (
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    Min Spend: Rs. {Math.round(d.minSpendPaisa / 100).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
