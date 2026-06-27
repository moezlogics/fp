"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useBranch } from "../owner-shell";
import {
    Users, Clock, CheckCircle, XCircle, AlertTriangle,
    RefreshCw, Calendar, Armchair, Phone, Receipt, Loader2, X
} from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; dot: string }> = {
    Draft: { color: "text-gray-600", bg: "bg-gray-50", label: "Draft", dot: "bg-gray-400" },
    Confirmed: { color: "text-blue-700", bg: "bg-blue-50", label: "Confirmed", dot: "bg-blue-500" },
    Seated: { color: "text-purple-700", bg: "bg-purple-50", label: "Seated", dot: "bg-purple-500" },
    Completed: { color: "text-emerald-700", bg: "bg-emerald-50", label: "Completed", dot: "bg-emerald-500" },
    NoShow: { color: "text-red-700", bg: "bg-red-50", label: "No Show", dot: "bg-red-500" },
    CancelledByUser: { color: "text-primary", bg: "bg-primary/5", label: "Cancelled", dot: "bg-primary/50" },
    CancelledByOwner: { color: "text-red-700", bg: "bg-red-50", label: "Cancelled (Owner)", dot: "bg-red-500" },
};

export default function OwnerBookingsPage() {
    const { branch } = useBranch();
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(() => {
        // Use Pakistan local date (not UTC) so the default matches the day the
        // owner is actually living in — toISOString() would show "yesterday"
        // during late-night/early-morning hours.
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Karachi",
            year: "numeric", month: "2-digit", day: "2-digit",
        }).format(new Date());
        return parts; // en-CA formats as YYYY-MM-DD
    });
    const [statusFilter, setStatusFilter] = useState("all");
    const [updating, setUpdating] = useState<string | null>(null);
    const [submitBillFor, setSubmitBillFor] = useState<any | null>(null);
    const [billAmount, setBillAmount] = useState("");
    const [billSubmitting, setBillSubmitting] = useState(false);

    const fetchBookings = useCallback(async () => {
        if (!branch?._id) return;
        try {
            const params = new URLSearchParams({ restaurantId: branch._id, date });
            if (statusFilter !== "all") params.set("status", statusFilter);
            const res = await fetch(`/api/owner/reservations?${params}`);
            const data = await res.json();
            setReservations(Array.isArray(data) ? data : data.reservations || []);
        } catch { setReservations([]); }
        setLoading(false);
    }, [branch?._id, date, statusFilter]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    useEffect(() => {
        const interval = setInterval(fetchBookings, 15000);
        return () => clearInterval(interval);
    }, [fetchBookings]);

    async function updateStatus(id: string, newStatus: string) {
        setUpdating(id);
        try {
            await fetch(`/api/reservations/${id}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newStatus }),
            });
            await fetchBookings();
        } catch (err) { console.error(err); }
        setUpdating(null);
    }

    async function handleSubmitBill(e: React.FormEvent) {
        e.preventDefault();
        if (!submitBillFor || !billAmount) return;
        setBillSubmitting(true);
        try {
            const originalBillPaisa = Math.round(parseFloat(billAmount) * 100);
            await fetch(`/api/owner/bills/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reservationId: submitBillFor._id,
                    originalBillPaisa,
                    paymentMode: submitBillFor.paymentMode || "AtRestaurant"
                }),
            });
            setSubmitBillFor(null);
            setBillAmount("");
            await fetchBookings();
        } catch (err) { console.error(err); }
        setBillSubmitting(false);
    }

    const formatTime = (slot: string) => {
        if (!slot) return "";
        const [h, m] = slot.split(":");
        const hour = parseInt(h);
        const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${display}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    };

    const stats = {
        total: reservations.length,
        confirmed: reservations.filter(r => r.status === "Confirmed").length,
        seated: reservations.filter(r => r.status === "Seated").length,
        completed: reservations.filter(r => r.status === "Completed").length,
        noShow: reservations.filter(r => r.status === "NoShow").length,
    };

    const statusTabs = [
        { key: "all", label: "All", count: stats.total },
        { key: "Confirmed", label: "Confirmed", count: stats.confirmed },
        { key: "Seated", label: "Seated", count: stats.seated },
        { key: "Completed", label: "Completed", count: stats.completed },
        { key: "NoShow", label: "No Show", count: stats.noShow },
    ];

    return (
        <div className="space-y-5">
            {/* ═══ HEADER ═══ */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-gray-900">Live Bookings</h1>
                    <p className="text-[12px] text-gray-400 font-medium mt-0.5">Real-time reservation management</p>
                </div>
                <button onClick={fetchBookings} className="flex items-center gap-2 text-[12px] text-gray-500 hover:text-primary-dark bg-white border border-gray-200 px-3.5 py-2 rounded-xl font-bold hover:border-primary/20 transition-all active:scale-95">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>

            {/* ═══ STATS ROW ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: "Total", value: stats.total, icon: Users, bg: "bg-gray-900", text: "text-white" },
                    { label: "Confirmed", value: stats.confirmed, icon: CheckCircle, bg: "bg-blue-50", text: "text-blue-700" },
                    { label: "Seated", value: stats.seated, icon: Armchair, bg: "bg-purple-50", text: "text-purple-700" },
                    { label: "Completed", value: stats.completed, icon: CheckCircle, bg: "bg-emerald-50", text: "text-emerald-700" },
                    { label: "No Show", value: stats.noShow, icon: AlertTriangle, bg: "bg-red-50", text: "text-red-600" },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} ${s.text} rounded-2xl p-4 relative overflow-hidden`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <s.icon className="w-5 h-5 opacity-60" />
                        </div>
                        <p className="text-2xl font-black">{s.value}</p>
                        <p className="text-[11px] font-bold opacity-60 uppercase tracking-wider">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* ═══ FILTER BAR ═══ */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 hover:border-gray-300 transition-colors">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="text-[13px] font-bold border-none p-0 focus:ring-0 bg-transparent text-gray-700" />
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
                    {statusTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${statusFilter === tab.key
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            {tab.label} {tab.count > 0 && <span className="text-[10px] opacity-60 ml-0.5">({tab.count})</span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══ RESERVATIONS LIST ═══ */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : reservations.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <Calendar className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="font-bold text-gray-700 text-[14px]">No bookings for this date</p>
                    <p className="text-[12px] text-gray-400 mt-1">Reservations will appear here in real-time</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reservations.map((r) => {
                        const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.Draft;
                        return (
                            <div key={r._id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-all group" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.02)" }}>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    {/* Left: Guest Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full ${sc.bg} ${sc.color} uppercase tracking-wider`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                {sc.label}
                                            </span>
                                            <span className="text-[11px] text-gray-300 font-mono font-bold">{r.reservationCode}</span>
                                        </div>
                                        <p className="text-[15px] font-bold text-gray-900">{r.guestName || r.userId?.name || "Guest"}</p>
                                        {r.userId?.phone && (
                                            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                <Phone className="w-3 h-3" /> {r.userId.phone}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 text-[12px] text-gray-500 mt-2 font-medium">
                                            <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />{formatTime(r.timeSlot)}
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                                                <Users className="w-3.5 h-3.5 text-gray-400" />{r.pax} guests
                                            </span>
                                            {r.occasion && r.occasion !== "None" && (
                                                <span className="flex items-center gap-1 text-primary font-bold text-[11px] bg-primary/5 px-2 py-1 rounded-lg">
                                                    🎉 {r.occasion}
                                                </span>
                                            )}
                                        </div>
                                        {r.specialRequests && (
                                            <p className="text-[11px] text-gray-400 mt-2 italic bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                                &ldquo;{r.specialRequests}&rdquo;
                                            </p>
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {r.status === "Confirmed" && (
                                            <>
                                                <button onClick={() => updateStatus(r._id, "Seated")} disabled={updating === r._id}
                                                    className="bg-purple-600 text-white text-[12px] px-4 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-all disabled:opacity-50 active:scale-95 flex items-center gap-1.5">
                                                    {updating === r._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Armchair className="w-3.5 h-3.5" />}
                                                    Seat Guest
                                                </button>
                                                <button onClick={() => updateStatus(r._id, "NoShow")} disabled={updating === r._id}
                                                    className="border border-red-200 text-red-600 text-[12px] px-4 py-2.5 rounded-xl font-bold hover:bg-red-50 transition-all disabled:opacity-50 active:scale-95">
                                                    No Show
                                                </button>
                                            </>
                                        )}
                                        {r.status === "Seated" && (
                                            <button onClick={() => setSubmitBillFor(r)} disabled={updating === r._id}
                                                className="bg-emerald-600 text-white text-[12px] px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95 flex items-center gap-1.5">
                                                <Receipt className="w-3.5 h-3.5" />
                                                {r.paymentMode === "FoodiePay" ? "Send Bill for Online Payment" : "Record Bill as Paid"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══ BILL SUBMISSION MODAL ═══ */}
            {submitBillFor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-black text-[16px] flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-primary" /> {submitBillFor.paymentMode === "FoodiePay" ? "Send Bill for Online Payment" : "Record Bill as Paid at Venue"}
                            </h3>
                            <button onClick={() => setSubmitBillFor(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition active:scale-95">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitBill} className="p-5 space-y-5">
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <p className="text-[14px] font-bold text-gray-900">{submitBillFor.guestName || submitBillFor.userId?.name || "Guest"}</p>
                                <p className="text-[12px] text-gray-500 mt-1">Payment: <span className="font-bold text-gray-700">{submitBillFor.paymentMode === "FoodiePay" ? "FoodiePay (Online)" : "At Restaurant (Cash/Card)"}</span></p>
                                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                                    <span>{formatTime(submitBillFor.timeSlot)}</span>
                                    <span>{submitBillFor.pax} guests</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-700 mb-2">Total Bill Amount (Rs.)</label>
                                <input type="number" value={billAmount} onChange={e => setBillAmount(e.target.value)} required min="1" step="1"
                                    className="w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary px-4 py-3 text-[15px] font-bold text-gray-900 outline-none transition-all bg-gray-50 focus:bg-white" placeholder="e.g. 5000" />
                            </div>
                            <button type="submit" disabled={billSubmitting || !billAmount}
                                className="w-full font-bold py-3 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98] text-white text-[13px] flex items-center justify-center gap-2"
                                style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                                {billSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                {billSubmitting ? "Submitting..." : submitBillFor.paymentMode === "FoodiePay" ? "Send Bill to User" : "Record Venue Payment"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
