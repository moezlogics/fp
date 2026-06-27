"use client";

import { useState, useEffect } from "react";
import { useBranch } from "../owner-shell";
import { CalendarDays, Percent, Lock, Unlock, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";

export default function OwnerYieldPage() {
    const { branch } = useBranch();
    const [month, setMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const [calendar, setCalendar] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<any>(null);
    const [editDiscount, setEditDiscount] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!branch?._id) return;
        setLoading(true);
        fetch(`/api/owner/yield-calendar?restaurantId=${branch._id}&month=${month}`)
            .then(r => r.json())
            .then(data => { const payload = data?.data || data; setCalendar(Array.isArray(payload) ? payload : payload?.slots || []); })
            .catch(() => setCalendar([]))
            .finally(() => setLoading(false));
    }, [branch?._id, month]);

    function prevMonth() {
        const [y, m] = month.split("-").map(Number);
        const d = new Date(y, m - 2, 1);
        setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    function nextMonth() {
        const [y, m] = month.split("-").map(Number);
        const d = new Date(y, m, 1);
        setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    async function saveSlot() {
        if (!editing) return;
        setSaving(true);
        await fetch(`/api/owner/yield-calendar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                restaurantId: branch._id,
                date: editing.date,
                timeSlot: editing.timeSlot,
                discountPercent: editDiscount,
                isBlocked: editing.isBlocked,
            }),
        });
        setEditing(null);
        setSaving(false);
        const res = await fetch(`/api/owner/yield-calendar?restaurantId=${branch._id}&month=${month}`);
        const data = await res.json();
        setCalendar(Array.isArray(data?.data || data) ? (data?.data || data) : (data?.data?.slots || data?.slots || []));
    }

    const grouped: Record<string, any[]> = {};
    calendar.forEach((slot: any) => {
        const d = slot.date?.split("T")[0] || slot.date;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(slot);
    });

    const dateKeys = Object.keys(grouped).sort();

    const getOccupancyColor = (slot: any) => {
        if (slot.isBlocked) return "bg-gray-100 text-gray-400 border-gray-200";
        const pct = ((slot.bookedCovers + slot.heldCovers) / (slot.maxCovers || 1)) * 100;
        if (pct >= 80) return "bg-red-50 text-red-700 border-red-200";
        if (pct >= 50) return "bg-primary/5 text-primary-dark border-primary/20";
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    };

    const formatTime = (slot: string) => {
        const [h, m] = slot.split(":");
        const hour = parseInt(h);
        const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${display}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    };

    const formatMonth = (m: string) => {
        const [y, mo] = m.split("-").map(Number);
        return new Date(y, mo - 1).toLocaleDateString("en-PK", { month: "long", year: "numeric" });
    };

    return (
        <div className="space-y-6">
            {/* ═══ HEADER ═══ */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-primary" /> Yield Calendar
                    </h1>
                    <p className="text-[12px] text-gray-400 font-medium mt-0.5">Manage slot-level discounts and availability</p>
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1">
                    <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95">
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="text-[13px] font-bold px-3 text-gray-700 min-w-[130px] text-center">{formatMonth(month)}</span>
                    <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95">
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* ═══ LEGEND ═══ */}
            <div className="flex gap-4 text-[11px] flex-wrap font-medium">
                {[
                    { label: "Available", color: "bg-emerald-300" },
                    { label: "Filling up", color: "bg-primary/20" },
                    { label: "Almost full", color: "bg-red-300" },
                    { label: "Blocked", color: "bg-gray-300" },
                ].map(l => (
                    <span key={l.label} className="flex items-center gap-1.5 text-gray-600">
                        <span className={`w-3 h-3 rounded ${l.color}`} /> {l.label}
                    </span>
                ))}
            </div>

            {/* ═══ CALENDAR ═══ */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : dateKeys.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                    <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                        <CalendarDays className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-bold text-gray-700 text-[14px]">No inventory generated yet</p>
                    <p className="text-[12px] text-gray-400 mt-1 max-w-xs">Inventory is auto-generated daily. Set up yield rules in Table Management to configure discounts.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {dateKeys.map(dateStr => {
                        const daySlots = grouped[dateStr];
                        const dayName = new Date(dateStr + "T00:00").toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" });
                        return (
                            <div key={dateStr} className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.02)" }}>
                                <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 text-[13px] font-bold text-gray-700">{dayName}</div>
                                <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                    {daySlots.sort((a: any, b: any) => a.timeSlot.localeCompare(b.timeSlot)).map((slot: any) => (
                                        <button key={slot.timeSlot}
                                            onClick={() => { setEditing(slot); setEditDiscount(slot.discountPercent || 0); }}
                                            className={`p-2.5 rounded-xl text-center text-[11px] border transition-all hover:shadow-md active:scale-95 ${getOccupancyColor(slot)}`}>
                                            <p className="font-bold">{formatTime(slot.timeSlot)}</p>
                                            <p className="text-[9px] mt-0.5 opacity-70">{slot.bookedCovers}/{slot.maxCovers}</p>
                                            {slot.discountPercent > 0 && (
                                                <span className="text-[9px] font-black text-green-600">{slot.discountPercent}% off</span>
                                            )}
                                            {slot.isBlocked && <Lock className="w-3 h-3 mx-auto mt-0.5 opacity-60" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══ EDIT SLOT MODAL ═══ */}
            {editing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-black text-[16px]">Edit Slot</h3>
                            <button onClick={() => setEditing(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition active:scale-95">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-[13px] text-gray-600">
                                {new Date(editing.date).toLocaleDateString("en-PK", { weekday: "long", month: "long", day: "numeric" })} at <span className="font-bold text-gray-900">{formatTime(editing.timeSlot)}</span>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    <Percent className="w-3 h-3 inline mr-1" /> Discount %
                                </label>
                                <input type="number" min={0} max={100} value={editDiscount} onChange={e => setEditDiscount(Number(e.target.value))}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 focus:bg-white transition-all" />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-[13px] font-bold text-gray-700">Block this slot</span>
                                <button onClick={() => setEditing({ ...editing, isBlocked: !editing.isBlocked })}
                                    className={`relative w-11 h-6 rounded-full transition-all duration-200 ${editing.isBlocked ? "bg-red-500" : "bg-gray-200"}`}>
                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${editing.isBlocked ? "left-[22px]" : "left-0.5"}`} />
                                </button>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setEditing(null)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-[13px]">Cancel</button>
                                <button onClick={saveSlot} disabled={saving}
                                    className="flex-1 flex justify-center items-center text-white py-3 rounded-xl text-[13px] font-bold transition-all disabled:opacity-50 active:scale-95"
                                    style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
