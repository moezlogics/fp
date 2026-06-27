"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Calendar, Clock, Users, MapPin, Star, XCircle,
    CheckCircle, AlertTriangle, ChevronRight, ArrowLeft,
    Ticket, CreditCard
} from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
    Draft: { color: "text-gray-600", bg: "bg-gray-100", icon: Clock },
    Confirmed: { color: "text-blue-700", bg: "bg-blue-50", icon: CheckCircle },
    Seated: { color: "text-purple-700", bg: "bg-purple-50", icon: Star },
    Completed: { color: "text-green-700", bg: "bg-green-50", icon: CheckCircle },
    NoShow: { color: "text-red-700", bg: "bg-red-50", icon: XCircle },
    CancelledByUser: { color: "text-primary", bg: "bg-primary/5", icon: XCircle },
    CancelledByOwner: { color: "text-red-700", bg: "bg-red-50", icon: XCircle },
};

export default function MyBookingsPage() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
    const [cancelling, setCancelling] = useState<string | null>(null);
    const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (authStatus !== "authenticated") return;
        fetch("/api/reservations/my")
            .then(r => r.json())
            .then(data => setBookings(Array.isArray(data) ? data : data.reservations || []))
            .catch(() => setBookings([]))
            .finally(() => setLoading(false));
    }, [authStatus]);

    useEffect(() => {
        if (searchParams.get("highlight")) {
            setTab("upcoming");
            setMessage("Your booking is confirmed. Once the restaurant submits the bill, you will be able to pay it here with FoodiePay.");
        }
    }, [searchParams]);

    // Reservation `date` is stored at midnight (start of day), so compare
    // against the start of today — otherwise a booking made for later TODAY
    // (e.g. tonight) would wrongly fall into "Past".
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const upcoming = bookings.filter((b: any) => new Date(b.date) >= todayStart && ["Draft", "Confirmed"].includes(b.status));
    const past = bookings.filter((b: any) => !upcoming.includes(b));

    const active = tab === "upcoming" ? upcoming : past;

    async function cancelBooking(id: string) {
        setCancelling(id);
        try {
            await fetch(`/api/reservations/${id}/cancel`, { method: "POST" });
            setBookings(bookings.map((b: any) => b._id === id ? { ...b, status: "CancelledByUser" } : b));
        } catch { }
        setCancelling(null);
    }

    async function payBookingBill(id: string) {
        setPayingBookingId(id);
        setMessage("");
        try {
            const res = await fetch(`/api/user/reservations/${id}/bill`);
            const data = await res.json();

            if (!res.ok) {
                setMessage(data.error || "Bill is not ready yet. Please check back shortly.");
                return;
            }

            const billId = data?._id;
            if (!billId) {
                setMessage("Bill is not ready yet. Please check back shortly.");
                return;
            }

            router.push(`/foodiepay?billId=${billId}`);
        } catch {
            setMessage("Unable to open checkout right now. Please try again.");
        } finally {
            setPayingBookingId(null);
        }
    }

    const formatTime = (slot: string) => {
        if (!slot) return "";
        const [h, m] = slot.split(":");
        const hr = parseInt(h);
        const display = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
        return `${display}:${m} ${hr >= 12 ? "PM" : "AM"}`;
    };

    if (authStatus === "loading") return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#e8323b", borderTopColor: "transparent" }} /></div>;
    if (authStatus === "unauthenticated") return (
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h1 className="text-2xl font-bold mb-2">My Bookings</h1>
            <p className="text-gray-500 mb-4">Please log in to view your bookings</p>
            <Link href="/account" className="text-white px-6 py-3 rounded-xl font-bold text-sm" style={{ backgroundColor: "#e8323b" }}>Log In</Link>
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
                        <h1 className="font-bold text-lg tracking-tight text-gray-900">My Bookings</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
                {message && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-[13px] font-medium text-primary">
                        {message}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1.5 bg-gray-200/50 p-1.5 rounded-xl">
                    <button
                        onClick={() => setTab("upcoming")}
                        className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all ${tab === "upcoming" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}`}
                    >
                        Upcoming ({upcoming.length})
                    </button>
                    <button
                        onClick={() => setTab("past")}
                        className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all ${tab === "past" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}`}
                    >
                        Past ({past.length})
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }} />)}
                    </div>
                ) : active.length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 text-center flex flex-col items-center justify-center mt-4" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.03)", minHeight: 300 }}>
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "#f0f8db" }}>
                            <Calendar className="w-8 h-8" style={{ color: "#e8323b" }} />
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">No {tab} bookings</h3>
                        <p className="text-sm text-gray-500 max-w-[250px] leading-relaxed mb-6">
                            {tab === "upcoming" ? "You don't have any upcoming reservations. Book a table at your favorite restaurant!" : "Your past bookings will appear here."}
                        </p>
                        {tab === "upcoming" && (
                            <Link href="/" className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95" style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                                Explore Restaurants
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 mt-2">
                        {active.map((b: any) => {
                            const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.Draft;
                            const Icon = sc.icon;
                            return (
                                <div key={b._id} className="bg-white rounded-2xl p-4 transition-all" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                                    <div className="flex gap-3.5">
                                        <div className="w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 bg-gray-100 border border-gray-100 shadow-sm">
                                            <img src={b.restaurantId?.coverImage || b.restaurantId?.logo || "/placeholder.jpg"} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${sc.bg} ${sc.color}`}>
                                                    <Icon className="w-3 h-3" /> {b.status}
                                                </span>
                                                <span className="text-[10px] font-mono tracking-wider" style={{ color: "#adb5bd" }}>#{b.reservationCode}</span>
                                            </div>
                                            <Link href={`/${(b.restaurantId?.city || 'pk').toLowerCase()}/${b.restaurantId?.slug || ""}/`} className="font-bold text-base text-gray-900 hover:text-primary transition-colors truncate block">
                                                {b.restaurantId?.name || "Restaurant"}
                                            </Link>
                                            <div className="flex items-center gap-3 text-xs mt-1.5 flex-wrap" style={{ color: "#6b7280" }}>
                                                <span className="flex items-center gap-1 font-medium"><Calendar className="w-3.5 h-3.5 text-gray-400" />{new Date(b.date).toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" })}</span>
                                                <span className="flex items-center gap-1 font-medium"><Clock className="w-3.5 h-3.5 text-gray-400" />{formatTime(b.timeSlot)}</span>
                                                <span className="flex items-center gap-1 font-medium"><Users className="w-3.5 h-3.5 text-gray-400" />{b.pax} <span className="hidden sm:inline">guests</span></span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional info section */}
                                    {(b.voucherCode || b.appliedYieldDiscount > 0 || (b.paymentMode && b.paymentMode !== "Pending")) && (
                                        <div className="mt-4 pt-3 border-t border-gray-50 flex flex-col gap-1.5">
                                            {b.voucherCode && (
                                                <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: "#e8323b" }}>
                                                    <Ticket className="w-3.5 h-3.5" /> Voucher Applied: <span className="bg-primary/5 px-1.5 rounded">{b.voucherCode}</span>
                                                </p>
                                            )}
                                            {b.paymentMode && b.paymentMode !== "Pending" && (
                                                <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                                                    <CreditCard className="w-3.5 h-3.5 text-gray-400" /> Payment: <span className="font-bold text-gray-700">{b.paymentMode === "FoodiePay" ? "FoodiePay (Online)" : "At Restaurant (Cash/Card)"}</span>
                                                </p>
                                            )}
                                            {b.appliedYieldDiscount > 0 && (
                                                <p className="text-[11px] font-bold text-green-600 flex items-center gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5" /> {b.appliedYieldDiscount}% discount applied
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {(b.status === "Confirmed" || (b.paymentMode === "FoodiePay" && b.billSubmittedAt && !["Completed", "CancelledByUser", "CancelledByOwner", "NoShow"].includes(b.status))) && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                                            {b.status === "Confirmed" && (
                                                <button onClick={() => cancelBooking(b._id)} disabled={cancelling === b._id}
                                                    className="flex-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50">
                                                    {cancelling === b._id ? "Cancelling..." : "Cancel Booking"}
                                                </button>
                                            )}
                                            {b.paymentMode === "FoodiePay" && b.billSubmittedAt && !["Completed", "CancelledByUser", "CancelledByOwner", "NoShow"].includes(b.status) && (
                                                <button
                                                    onClick={() => payBookingBill(b._id)}
                                                    disabled={payingBookingId === b._id}
                                                    className="flex-1 text-xs text-white py-2.5 rounded-xl font-bold text-center flex items-center justify-center gap-1.5 transition-colors active:scale-95 disabled:opacity-60"
                                                    style={{ backgroundColor: "#10b981", boxShadow: "0 2px 8px rgba(16,185,129,0.25)" }}
                                                >
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                    {payingBookingId === b._id ? "Opening..." : "Pay Bill"}
                                                </button>
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
