"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Search, Users, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

import { AdminBookingModal } from "@/components/admin/admin-booking-modal";
import { Plus } from "lucide-react";

export default function AdminReservationsPage() {
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [search, setSearch] = useState("");
    const [bookingModalOpen, setBookingModalOpen] = useState(false);

    const fetchReservations = () => {
        setLoading(true);
        fetch(`/api/admin/analytics/reservations?date=${date}`)
            .then(r => r.json())
            .then(d => setReservations(Array.isArray(d) ? d : d.reservations || []))
            .catch(() => setReservations([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchReservations();
    }, [date]);

    const filtered = reservations.filter((r: any) =>
        !search || r.reservationCode?.toLowerCase().includes(search.toLowerCase()) ||
        r.restaurantId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.userId?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total: reservations.length,
        confirmed: reservations.filter(r => r.status === "Confirmed").length,
        completed: reservations.filter(r => r.status === "Completed").length,
        noShow: reservations.filter(r => r.status === "NoShow").length,
        cancelled: reservations.filter(r => r.status?.includes("Cancelled")).length,
    };

    const formatTime = (slot: string) => {
        if (!slot) return "";
        const [h, m] = slot.split(":");
        const hr = parseInt(h);
        const display = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
        return `${display}:${m} ${hr >= 12 ? "PM" : "AM"}`;
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5" /> Global Reservations</h1>
                <button
                    onClick={() => setBookingModalOpen(true)}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition"
                >
                    <Plus className="w-4 h-4" /> Create WhatsApp Booking
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: "Total", val: stats.total, color: "bg-gray-100" },
                    { label: "Confirmed", val: stats.confirmed, color: "bg-blue-50 text-blue-700" },
                    { label: "Completed", val: stats.completed, color: "bg-green-50 text-green-700" },
                    { label: "No Shows", val: stats.noShow, color: "bg-red-50 text-red-700" },
                    { label: "Cancelled", val: stats.cancelled, color: "bg-primary/5 text-primary" },
                ].map(s => (
                    <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
                        <p className="text-2xl font-bold">{s.val}</p>
                        <p className="text-xs opacity-70">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 flex-1 max-w-xs">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code, restaurant, user..."
                        className="text-sm border-none p-0 focus:ring-0 bg-transparent flex-1" />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
                <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-3 py-3 text-left">Code</th>
                                    <th className="px-3 py-3 text-left">Restaurant</th>
                                    <th className="px-3 py-3 text-left">Guest</th>
                                    <th className="px-3 py-3 text-center">Pax</th>
                                    <th className="px-3 py-3 text-center">Time</th>
                                    <th className="px-3 py-3 text-center">Discount</th>
                                    <th className="px-3 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.map((r: any) => (
                                    <tr key={r._id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-mono text-xs">{r.reservationCode}</td>
                                        <td className="px-3 py-2 font-bold text-xs truncate max-w-[150px]">{r.restaurantId?.name || "—"}</td>
                                        <td className="px-3 py-2 text-xs">{r.userId?.name || "—"}</td>
                                        <td className="px-3 py-2 text-center">{r.pax}</td>
                                        <td className="px-3 py-2 text-center text-xs">{formatTime(r.timeSlot)}</td>
                                        <td className="px-3 py-2 text-center text-xs">{r.appliedYieldDiscount > 0 ? `${r.appliedYieldDiscount}%` : "—"}</td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === "Completed" ? "bg-green-50 text-green-700" :
                                                r.status === "Confirmed" ? "bg-blue-50 text-blue-700" :
                                                    r.status === "NoShow" ? "bg-red-50 text-red-700" :
                                                        "bg-gray-100 text-gray-600"
                                                }`}>{r.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No reservations found</p>}
                </div>
            )}

            <AdminBookingModal
                isOpen={bookingModalOpen}
                onClose={() => setBookingModalOpen(false)}
                onSuccess={() => {
                    fetchReservations();
                    // optional: show toast
                }}
            />
        </div>
    );
}
