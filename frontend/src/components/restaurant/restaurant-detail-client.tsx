"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
    Calendar, Clock, Users, MapPin, Phone, MessageCircle,
    Heart, Share2, Star, ChevronLeft, ChevronRight, Camera,
    Navigation, Globe, Instagram, Facebook, BookOpen,
    UtensilsCrossed, Info, Tag, Image as ImageIcon, X,
    Crown, Sparkles, Timer, Check, AlertCircle, ZoomIn, Wallet, CreditCard, Banknote, Shield, ChevronUp, List,
    Box, Maximize2, Minimize2
} from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import { AnimatePresence, motion } from "framer-motion";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import DOMPurify from "isomorphic-dompurify";
import dynamic from "next/dynamic";
import { RestaurantReviewsTab } from "./restaurant-reviews-tab";
import { useAuthModal } from "@/components/auth/auth-modal";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import RestaurantMenu from "./restaurant-menu";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";

const MapView = dynamic(() => import("../map/map-view"), { ssr: false });
const MapComponent = dynamic(() => import("@/components/owner/branch-map"), { ssr: false });

interface BookingWidgetProps {
    restaurantId: string;
    restaurantSlug: string;
    restaurantName: string;
    deals: any[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "923001234567";

export function BookingWidget({ restaurantId, restaurantSlug, restaurantName, deals }: BookingWidgetProps) {
    const { data: session } = useSession();
    const { openAuthModal } = useAuthModal();
    const router = useRouter();
    const getPakistanDateString = () => {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Karachi",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(new Date());
        const year = parts.find((part) => part.type === "year")?.value;
        const month = parts.find((part) => part.type === "month")?.value;
        const day = parts.find((part) => part.type === "day")?.value;
        return `${year}-${month}-${day}`;
    };
    const parseDateOnly = (value: string) => {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, (month || 1) - 1, day || 1);
    };
    const getSlotTime = (slot: any) => {
        if (!slot) return "";
        if (typeof slot === "string") return slot;
        if (typeof slot.timeSlot === "string") return slot.timeSlot;
        if (typeof slot.time === "string") return slot.time;
        return "";
    };
    const getSlotHour = (slot: any) => {
        const slotTime = getSlotTime(slot);
        if (!slotTime.includes(":")) return null;
        const [hours] = slotTime.split(":");
        const parsed = parseInt(hours, 10);
        return Number.isNaN(parsed) ? null : parsed;
    };
    const [selectedDate, setSelectedDate] = useState(() => {
        return getPakistanDateString();
    });
    const [pax, setPax] = useState(2);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        const handleOpen = () => {
            setIsDrawerOpen(true);
        };
        window.addEventListener("open-booking-drawer", handleOpen);
        return () => {
            window.removeEventListener("open-booking-drawer", handleOpen);
        };
    }, []);
    const [slots, setSlots] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [booking, setBooking] = useState<any>(null);
    // Once a hold is confirmed we must never auto-release it (the FoodiePay
    // path keeps step="hold" briefly while navigating away).
    const holdConfirmedRef = useRef(false);
    const [countdown, setCountdown] = useState(0);
    const [confirming, setConfirming] = useState(false);
    const [step, setStep] = useState<"select" | "hold" | "details" | "confirmed">("select");
    const [guestName, setGuestName] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [specialRequests, setSpecialRequests] = useState("");
    const [occasion, setOccasion] = useState("None");
    const [error, setError] = useState("");
    const [paymentMode, setPaymentMode] = useState<"FoodiePay" | "AtRestaurant">("AtRestaurant");
    const [bestDeal, setBestDeal] = useState<any>(null);
    const [bankDeals, setBankDeals] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>({
        minPartySize: 1, maxPartySize: 10, isPrimePartner: false,
        cancellationWindow: 360, maxDiscountCap: 50,
    });
    const [bookingAvailable, setBookingAvailable] = useState(true);
    const [dayMessage, setDayMessage] = useState("");
    const bestBankDiscount = bankDeals.reduce((max: number, deal: any) => {
        const percent = Number(deal?.discountPercent || deal?.maxDiscount || 0);
        return percent > max ? percent : max;
    }, 0);
    const bookingBadgeText = [
        Number(bestDeal?.discountPercent || 0),
        settings.isPrimePartner ? 15 : 0,
        !settings.isPrimePartner ? bestBankDiscount : 0,
    ]
        .filter((value) => value > 0)
        .sort((a, b) => b - a)
        .map((value) => `${value}%`)
        .join(" + ");

    // â”€â”€â”€ Calendar State â”€â”€â”€
    const today = parseDateOnly(getPakistanDateString());
    today.setHours(0, 0, 0, 0);
    const [calMonth, setCalMonth] = useState(today.getMonth());
    const [calYear, setCalYear] = useState(today.getFullYear());

    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
    const monthName = new Date(calYear, calMonth).toLocaleString("en-US", { month: "long", year: "numeric" });

    const calendarDays = [];
    for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

    const maxDate = parseDateOnly(getPakistanDateString());
    maxDate.setDate(maxDate.getDate() + (settings.maxAdvanceBookingDays || 30));

    function isDateSelectable(day: number) {
        const date = new Date(calYear, calMonth, day);
        date.setHours(0, 0, 0, 0);
        return date >= today && date <= maxDate;
    }

    function isSelectedDay(day: number) {
        const [sy, sm, sd] = (selectedDate || getPakistanDateString()).split("-").map(Number);
        return sy === calYear && sm === calMonth + 1 && sd === day;
    }

    function isToday(day: number) {
        return today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
    }

    function selectCalDay(day: number) {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        setSelectedDate(dateStr);
    }

    function prevMonth() {
        if (calMonth === today.getMonth() && calYear === today.getFullYear()) return;
        if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
        else setCalMonth(calMonth - 1);
    }

    function nextMonth() {
        const maxM = maxDate.getMonth();
        const maxY = maxDate.getFullYear();
        if (calYear > maxY || (calYear === maxY && calMonth >= maxM)) return;
        if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
        else setCalMonth(calMonth + 1);
    }

    // Fetch slots from new booking-slots API
    useEffect(() => {
        async function fetchSlots() {
            setLoading(true);
            setError("");
            setDayMessage("");
            try {
                const res = await fetch(
                    `${API_URL}/api/v1/booking-slots/restaurant/${restaurantId}?date=${selectedDate}&pax=${pax}`
                );
                const data = await res.json();
                if (!res.ok) {
                    const todayDate = getPakistanDateString();
                    if ((data?.error || "").toLowerCase().includes("past dates") && selectedDate !== todayDate) {
                        setSelectedDate(todayDate);
                    }
                    setError(data.error || "Failed to load slots");
                    setSlots([]);
                    setLoading(false);
                    return;
                }
                const d = data.data || data;
                const normalizedSlots = Array.isArray(d.slots)
                    ? d.slots
                        .map((slot: any) => ({ ...slot, timeSlot: getSlotTime(slot) }))
                        .filter((slot: any) => slot.timeSlot)
                    : [];
                setBookingAvailable(d.available !== false);
                if (d.dayBlocked) setDayMessage(d.reason || "Not available this day");
                setSlots(normalizedSlots);
                setBestDeal(d.bestDeal || null);
                setBankDeals(d.bankDeals || d.bankOffers || []);
                if (d.settings) setSettings((prev: any) => ({ ...prev, ...d.settings }));
            } catch {
                setSlots([]);
            }
            setLoading(false);
        }
        fetchSlots();
    }, [selectedDate, pax, restaurantId]);

    // Countdown timer for held booking
    useEffect(() => {
        if (step !== "hold" || countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown((prev: number) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    releaseHold();
                    setStep("select");
                    setBooking(null);
                    setError("Your hold expired. Please try again.");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [step, countdown]);

    async function holdSlot(slot: any, skipAuthCheck = false) {
        if (!skipAuthCheck && !session?.user) {
            openAuthModal(() => holdSlot(slot, true));
            return;
        }
        setError("");
        try {
            const res = await fetch("/api/reservations/hold", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ restaurantId, date: selectedDate, timeSlot: slot.timeSlot, pax, paymentMode }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || data.message || "Failed to hold slot");
                return;
            }
            holdConfirmedRef.current = false;
            setBooking(data.reservation);
            setSelectedSlot(slot);
            setCountdown(data.remainingSeconds || 180);
            setGuestName(session?.user?.name || "");
            setStep("hold");
        } catch {
            setError("Network error. Please try again.");
        }
    }

    // Release a held (Draft) reservation back to inventory when the user
    // abandons the hold or the timer runs out — otherwise the seats stay
    // locked until the CRON sweep and count against the user's active-booking
    // limit, blocking further bookings.
    async function releaseHold() {
        const id = booking?._id;
        if (!id || holdConfirmedRef.current) return;
        try {
            await fetch(`/api/reservations/${id}/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: "Hold released" }),
            });
        } catch { /* best-effort; CRON will reclaim it anyway */ }
    }

    async function confirmBooking() {
        if (!booking) return;
        setConfirming(true);
        setError("");
        try {
            const res = await fetch(`/api/reservations/${booking._id}/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guestName, guestPhone, specialRequests, occasion, paymentMode }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to confirm");
                setConfirming(false);
                return;
            }
            // Confirmed — lock out any auto-release of this reservation.
            holdConfirmedRef.current = true;
            // Merge — the confirm response only carries { _id, reservationCode },
            // so we must keep timeSlot / pax / discount from the held booking
            // for the confirmation screen.
            setBooking((prev: any) => ({ ...prev, ...data.reservation }));

            if (paymentMode === "FoodiePay") {
                router.push(`/my-bookings?highlight=${booking._id}`);
                return;
            }

            setStep("confirmed");
        } catch {
            setError("Network error");
        }
        setConfirming(false);
    }

    const formatTime = (slot: string) => {
        if (!slot || !slot.includes(":")) return "Time unavailable";
        const [h, m] = slot.split(":");
        const hour = parseInt(h);
        const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${display}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    };

    const formatDateDisplay = (dateStr: string) => {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" });
    };

    // Group slots into Lunch / Afternoon / Dinner
    const lunchSlots = slots.filter((s: any) => { const h = getSlotHour(s); return h !== null && h >= 11 && h < 15; });
    const afternoonSlots = slots.filter((s: any) => { const h = getSlotHour(s); return h !== null && h >= 15 && h < 18; });
    const dinnerSlots = slots.filter((s: any) => { const h = getSlotHour(s); return h !== null && (h >= 18 || h < 11); });

    const wrapResponsive = (formJSX: React.ReactNode) => {
        return (
            <>
                {/* Desktop View: Inline */}
                <div className="hidden lg:block">
                    {formJSX}
                </div>

                {/* Mobile View: CTA + Drawer */}
                <div className="lg:hidden w-full">
                    {/* CTA Card */}
                    <div 
                        onClick={() => setIsDrawerOpen(true)}
                        className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-gray-900">Book a Table</p>
                                <p className="text-xs text-gray-500 truncate">Select date, time & get instant discounts</p>
                            </div>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDrawerOpen(true);
                            }}
                            className="bg-primary hover:bg-primary-dark text-white font-bold text-xs px-4 py-2.5 rounded-xl shrink-0 transition active:scale-95 shadow-sm cursor-pointer"
                        >
                            Book Now
                        </button>
                    </div>

                    {/* Bottom Drawer Modal */}
                    <AnimatePresence>
                        {isDrawerOpen && (
                            <>
                                {/* Backdrop */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.6 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => {
                                        if (step !== "hold") {
                                            setIsDrawerOpen(false);
                                        }
                                    }}
                                    className="fixed inset-0 bg-black/60 z-[999] pointer-events-auto"
                                />

                                {/* Drawer Content Panel */}
                                <motion.div
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                    className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-3xl z-[1000] flex flex-col shadow-2xl pointer-events-auto border-t border-gray-100 overflow-hidden"
                                >
                                    {/* Header */}
                                    <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex flex-col items-center shrink-0 bg-white">
                                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-3" />
                                        <div className="w-full flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-primary" />
                                                <h3 className="font-black text-base text-gray-900">Book a Table</h3>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    if (step === "hold") {
                                                        releaseHold();
                                                        setStep("select");
                                                        setBooking(null);
                                                    }
                                                    setIsDrawerOpen(false);
                                                }}
                                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition cursor-pointer"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Scrollable Form Content */}
                                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
                                        {formJSX}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </>
        );
    };

    // â”€â”€â”€ CONFIRMED STATE â”€â”€â”€
    if (step === "confirmed" && booking) {
        return wrapResponsive(
            <div className="bg-white rounded-2xl border border-gray-250 shadow-md overflow-hidden">
                <div className="bg-zinc-950 text-white px-5 py-6 text-center relative">
                    <div className="w-16 h-16 bg-white/10 rounded-[20px] flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <Check className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-black tracking-tight">Reservation Confirmed</h3>
                    <p className="text-xs text-primary font-mono tracking-[0.2em] font-black uppercase mt-1">{booking.reservationCode}</p>
                </div>
                <div className="p-5 space-y-3 text-sm font-bold text-zinc-950">
                    <div className="flex justify-between py-2.5 border-b border-gray-150"><span className="text-zinc-500 font-bold">Restaurant</span><span className="font-black text-black">{restaurantName}</span></div>
                    <div className="flex justify-between py-2.5 border-b border-gray-150"><span className="text-zinc-500 font-bold">Date</span><span className="font-black text-black">{formatDateDisplay(selectedDate)}</span></div>
                    <div className="flex justify-between py-2.5 border-b border-gray-150"><span className="text-zinc-500 font-bold">Time</span><span className="font-black text-black">{formatTime(booking.timeSlot)}</span></div>
                    <div className="flex justify-between py-2.5 border-b border-gray-150"><span className="text-zinc-500 font-bold">Guests</span><span className="font-black text-black">{booking.pax} Persons</span></div>
                    {booking.appliedYieldDiscount > 0 && (
                        <div className="flex justify-between py-2.5 text-emerald-800 font-black bg-emerald-50 border border-emerald-100 px-3 rounded-lg"><span>Booking Discount</span><span>{booking.appliedYieldDiscount}% OFF</span></div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-150 bg-gray-50/50">
                    <button onClick={() => { setStep("select"); setBooking(null); }}
                        className="w-full bg-zinc-950 hover:bg-black text-white py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest shadow-md">
                        Book Another Table
                    </button>
                </div>
            </div>
        );
    }

    // Compact hold state for mobile and desktop
    if (step === "hold" && booking) {
        const mins = Math.floor(countdown / 60);
        const secs = countdown % 60;
        const countdownPct = (countdown / 180) * 100;
        return wrapResponsive(
            <div className="bg-white rounded-2xl border border-gray-250 shadow-md overflow-hidden flex flex-col">
                <div className="bg-zinc-950 text-white px-4 py-5 sm:px-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400">Reservation Hold</h3>
                            <p className="mt-1 text-sm font-bold text-white">Complete your details to confirm this table.</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 text-white px-3 py-1.5 rounded-full text-xs font-black font-mono shadow-inner whitespace-nowrap">
                            <Timer className="w-3.5 h-3.5 text-primary" />
                            {mins}:{secs.toString().padStart(2, "0")}
                        </div>
                    </div>
                    <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden mb-5">
                        <div
                            className="h-full bg-primary transition-all duration-1000 ease-linear rounded-full"
                            style={{ width: `${countdownPct}%` }}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-wider sm:grid-cols-4">
                        <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-white"><Calendar className="w-3 h-3 text-primary" />{formatDateDisplay(selectedDate)}</span>
                        <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-white"><Clock className="w-3 h-3 text-primary" />{formatTime(selectedSlot?.timeSlot)}</span>
                        <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-white"><Users className="w-3 h-3 text-primary" />{pax} guests</span>
                        {selectedSlot?.discountPercent > 0 && (
                            <span className="flex items-center justify-center rounded-xl bg-emerald-700 px-2.5 py-2 text-white shadow-sm">{selectedSlot.discountPercent}% OFF</span>
                        )}
                    </div>
                </div>
                <div className="p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-[11px] font-black text-black uppercase tracking-wider">Full Name *</label>
                            <input
                                value={guestName}
                                onChange={(e: any) => setGuestName(e.target.value)}
                                placeholder="Enter your full name"
                                className="w-full border border-gray-350 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold bg-white focus:border-primary focus:ring-1 focus:ring-primary/10 outline-none transition placeholder:text-gray-400 text-black"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[11px] font-black text-black uppercase tracking-wider">Phone Number *</label>
                            <input
                                value={guestPhone}
                                onChange={(e: any) => setGuestPhone(e.target.value)}
                                placeholder="03xx xxxxxxx"
                                className="w-full border border-gray-350 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold bg-white focus:border-primary focus:ring-1 focus:ring-primary/10 outline-none transition placeholder:text-gray-400 text-black"
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-[11px] font-black text-black uppercase tracking-wider">Occasion</label>
                            <select
                                value={occasion}
                                onChange={(e: any) => setOccasion(e.target.value)}
                                className="w-full border border-gray-350 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold bg-white focus:border-primary focus:ring-1 focus:ring-primary/10 outline-none transition text-black"
                            >
                                <option value="None">No special occasion</option>
                                <option value="Birthday">Birthday</option>
                                <option value="Anniversary">Anniversary</option>
                                <option value="Business">Business Meal</option>
                                <option value="Date">Date Night</option>
                                <option value="Family">Family Gathering</option>
                                <option value="Celebration">Celebration</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[11px] font-black text-black uppercase tracking-wider">Special Requests</label>
                            <textarea
                                value={specialRequests}
                                onChange={(e: any) => setSpecialRequests(e.target.value)}
                                placeholder="Window seat, high chair, birthday setup..."
                                className="w-full border border-gray-350 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold bg-white focus:border-primary focus:ring-1 focus:ring-primary/10 outline-none transition resize-none h-16 placeholder:text-gray-400 text-black"
                            />
                        </div>
                    </div>
                    {error && <p className="text-red-650 text-[11px] flex items-center gap-1 font-bold bg-red-50 p-2.5 rounded-lg"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
                </div>
                <div className="p-4 border-t border-gray-150 bg-gray-50/50">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button onClick={() => { releaseHold(); setStep("select"); setBooking(null); }}
                            className="flex-1 border border-gray-350 text-black bg-white py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-100 transition-all">
                            Cancel
                        </button>
                        <button onClick={confirmBooking} disabled={confirming || !guestName}
                            className="flex-[1.4] bg-primary hover:bg-primary-dark disabled:opacity-50 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                            {confirming ? "Confirming..." : "Confirm Booking"}
                        </button>
                    </div>
                </div>
                <div className="px-4 pb-4">
                    <a
                        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                            `Hi, I want to book a table:\nRestaurant: ${restaurantName}\nDate: ${selectedDate}\nTime: ${selectedSlot?.timeSlot || ""}\nGuests: ${pax}${selectedSlot?.discountPercent ? `\nDiscount: ${selectedSlot.discountPercent}% OFF` : ""}\nName: ${guestName || ""}\nPhone: ${guestPhone || (session?.user as any)?.phone || ""}\nEmail: ${(session?.user as any)?.email || ""}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black bg-[#25D366] hover:bg-[#1ebe57] text-white transition-all active:scale-[0.98] shadow-md uppercase tracking-wider"
                    >
                        <MessageCircle className="w-4 h-4" />
                        Book on WhatsApp
                    </a>
                </div>
            </div>
        );
    }

    // Main booking widget

    // ————— MAIN BOOKING WIDGET —————
    // ————— MAIN BOOKING WIDGET —————
    return wrapResponsive(
        <div className="bg-white rounded-2xl border border-gray-250 p-4 sm:p-5 shadow-md space-y-4 flex flex-col">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h2 className="text-base md:text-lg font-black text-black border-b border-gray-100 pb-2 flex items-center gap-2">
                    <Calendar className="w-5 h-5 flex-shrink-0 text-primary" /> Book a Table
                </h2>
                {bookingBadgeText && (
                    <div className="mt-1 bg-emerald-50 border border-emerald-250 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 w-max">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-750 shrink-0" />
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider whitespace-nowrap">{bookingBadgeText}</span>
                    </div>
                )}
            </div>

            {/* Mini Calendar */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <button onClick={prevMonth} className="w-7 h-7 rounded bg-white hover:bg-gray-100 border border-gray-250 flex items-center justify-center transition">
                        <ChevronLeft className="w-4 h-4 text-black font-black" />
                    </button>
                    <span className="text-xs font-black text-black uppercase tracking-wider">{monthName}</span>
                    <button onClick={nextMonth} className="w-7 h-7 rounded bg-white hover:bg-gray-100 border border-gray-250 flex items-center justify-center transition">
                        <ChevronRight className="w-4 h-4 text-black font-black" />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                        <div key={d} className="text-center text-[10px] font-black text-zinc-950 uppercase py-0.5">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, i) => {
                        if (day === null) return <div key={`e-${i}`} />;
                        const selectable = isDateSelectable(day);
                        const selected = isSelectedDay(day);
                        const todayDay = isToday(day);
                        return (
                            <button key={day} disabled={!selectable} onClick={() => selectCalDay(day)}
                                className={`w-full aspect-square rounded-lg text-xs font-bold border transition-all ${
                                    selected 
                                        ? "bg-primary border-primary text-white font-black shadow-sm" 
                                        : todayDay 
                                            ? "bg-primary/10 border-primary/20 text-primary font-black hover:bg-primary hover:text-white" 
                                            : selectable 
                                                ? "text-black border-gray-250 hover:border-black bg-white" 
                                                : "text-gray-200 border-transparent bg-transparent cursor-not-allowed font-normal"
                                }`}>
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Guests */}
            <div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-250 px-3 py-2 bg-white">
                    <div className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-wider">
                        <Users className="w-4 h-4 text-primary" /> Party Size
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setPax(Math.max(settings.minPartySize || 1, pax - 1))}
                            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-black text-white font-black transition active:scale-95">&minus;</button>
                        <span className="text-sm font-black w-4 text-center text-black">{pax}</span>
                        <button onClick={() => setPax(Math.min(settings.maxPartySize || 20, pax + 1))}
                            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-black text-white font-black transition active:scale-95">+</button>
                    </div>
                </div>
            </div>

            {/* Payment Mode */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button onClick={() => setPaymentMode("AtRestaurant")}
                    className={`p-2.5 rounded-xl flex items-center justify-between gap-3 border text-left transition-all ${paymentMode === "AtRestaurant" ? "border-2 border-primary bg-primary/5" : "border-gray-250 bg-white hover:bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMode === "AtRestaurant" ? "border-primary animate-pulse" : "border-gray-300"}`}>
                            {paymentMode === "AtRestaurant" && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </div>
                        <div>
                            <span className={`block text-[11px] font-black uppercase tracking-wider ${paymentMode === "AtRestaurant" ? "text-primary" : "text-black"}`}>At Restaurant</span>
                            <span className="block text-[10px] font-bold text-zinc-950 mt-0.5">Pay at venue</span>
                        </div>
                    </div>
                    <Banknote className={`h-4 w-4 ${paymentMode === "AtRestaurant" ? "text-primary" : "text-gray-300"}`} />
                </button>
                <button onClick={() => setPaymentMode("FoodiePay")}
                    className={`p-2.5 rounded-xl flex items-center justify-between gap-3 border text-left transition-all ${paymentMode === "FoodiePay" ? "border-2 border-secondary bg-secondary/5" : "border-gray-250 bg-white hover:bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMode === "FoodiePay" ? "border-secondary" : "border-gray-300"}`}>
                            {paymentMode === "FoodiePay" && <div className="w-1.5 h-1.5 rounded-full bg-secondary" />}
                        </div>
                        <div>
                            <span className={`block text-[11px] font-black uppercase tracking-wider ${paymentMode === "FoodiePay" ? "text-secondary" : "text-black"}`}>FoodiePay</span>
                            <span className="block text-[10px] font-bold text-zinc-950 mt-0.5">Pay online later</span>
                        </div>
                    </div>
                    <Wallet className={`h-4 w-4 ${paymentMode === "FoodiePay" ? "text-secondary" : "text-gray-300"}`} />
                </button>
            </div>

            {/* Time Slots */}
            <div className="border-t border-gray-150 pt-3">
                <div className="flex items-center gap-1.5 mb-2.5 text-xs font-black text-black uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-primary" /> Select Time
                </div>
                {loading ? (
                    <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-10 rounded-xl bg-gray-50 border border-gray-200 animate-pulse" />
                        ))}
                    </div>
                ) : dayMessage ? (
                    <div className="text-center py-6 text-xs text-zinc-950 font-bold border border-dashed rounded-xl border-gray-250 bg-gray-50">
                        {dayMessage}
                    </div>
                ) : slots.length === 0 ? (
                    <div className="text-center py-6 text-xs text-zinc-950 font-bold border border-dashed rounded-xl border-gray-250 bg-gray-50">
                        No slots available for this date.<br />Try another day.
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1 stylish-scrollbar">
                        {lunchSlots.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-black uppercase tracking-wider mb-2">Lunch</p>
                                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                    {lunchSlots.map((slot: any) => (
                                        <button key={slot.timeSlot} onClick={() => holdSlot(slot)} disabled={!slot.isAvailable}
                                            className={`relative p-2 rounded-lg border transition-all text-center flex flex-col items-center justify-center min-h-[44px] ${slot.isAvailable ? "border-gray-250 bg-white text-black hover:border-primary hover:text-primary cursor-pointer hover:shadow-sm" : "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200"}`}>
                                            <p className="text-xs font-black leading-none">{formatTime(slot.timeSlot)}</p>
                                            {slot.discountPercent > 0 && (
                                                <span className="text-[9px] font-black text-emerald-700 mt-1 tracking-tight">{slot.discountPercent}% OFF</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {afternoonSlots.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-black uppercase tracking-wider mb-2 mt-2">Afternoon</p>
                                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                    {afternoonSlots.map((slot: any) => (
                                        <button key={slot.timeSlot} onClick={() => holdSlot(slot)} disabled={!slot.isAvailable}
                                            className={`relative p-2 rounded-lg border transition-all text-center flex flex-col items-center justify-center min-h-[44px] ${slot.isAvailable ? "border-gray-250 bg-white text-black hover:border-primary hover:text-primary cursor-pointer hover:shadow-sm" : "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200"}`}>
                                            <p className="text-xs font-black leading-none">{formatTime(slot.timeSlot)}</p>
                                            {slot.discountPercent > 0 && (
                                                <span className="text-[9px] font-black text-emerald-700 mt-1 tracking-tight">{slot.discountPercent}% OFF</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {dinnerSlots.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-black uppercase tracking-wider mb-2 mt-2">Dinner</p>
                                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                    {dinnerSlots.map((slot: any) => (
                                        <button key={slot.timeSlot} onClick={() => holdSlot(slot)} disabled={!slot.isAvailable}
                                            className={`relative p-2 rounded-lg border transition-all text-center flex flex-col items-center justify-center min-h-[44px] ${slot.isAvailable ? "border-gray-250 bg-white text-black hover:border-primary hover:text-primary cursor-pointer hover:shadow-sm" : "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200"}`}>
                                            <p className="text-xs font-black leading-none">{formatTime(slot.timeSlot)}</p>
                                            {slot.discountPercent > 0 && (
                                                <span className="text-[9px] font-black text-emerald-700 mt-1 tracking-tight">{slot.discountPercent}% OFF</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {error && step === "select" && (
                    <p className="text-red-650 text-[11px] mt-2 flex items-center gap-1 font-bold bg-red-50 p-2 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5" />{error}
                    </p>
                )}
            </div>

            {/* Bank Offers */}
            {bankDeals.length > 0 && (
                <div className="p-3 border border-gray-200 rounded-xl bg-gray-50">
                    <div className="flex flex-wrap gap-2">
                        {bankDeals.slice(0, 2).map((d: any, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-2 py-1 flex-1 min-w-[100px]">
                                <div className="w-4 h-4 rounded text-white text-[8px] font-bold flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: d.bankColor || d.bankId?.color || "#333" }}>
                                    %
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-gray-800 leading-none truncate">{d.discountPercent}% Off {d.bankName || d.bankId?.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Informational Footer */}
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-950 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-emerald-700" />
                    <span>Free cancellation up to {Math.round((settings.cancellationWindow || 360) / 60)}h</span>
                </div>
            </div>
        </div>
    );
}

/* ─── TAB NAVIGATION ─── */
type TabId = "menu" | "deals" | "about" | "reviews" | "tour";

interface TabContentProps {
    restaurant: any;
    deals: any[];
    reviews: any[];
    otherBranches: any[];
    faqs: { question: string; answer: string }[];
    hasMenu?: boolean;
    menuData?: any;
}

export function RestaurantTabs({ restaurant, deals, reviews, otherBranches, faqs, hasMenu = true, menuData }: TabContentProps) {
    const [activeTab, setActiveTab] = useState<TabId>(hasMenu ? "menu" : "deals");
    const [showTourFullscreen, setShowTourFullscreen] = useState(false);
    const r = restaurant;
    const hasTour = r.virtualTour?.status === "published" && r.virtualTour?.scenes?.length > 0;
    const VR_TOUR_APP_URL = process.env.NEXT_PUBLIC_VR_TOUR_APP_URL || "http://localhost:8500";

    // Scroll Spy & Custom Events
    useEffect(() => {
        const handleScroll = () => {
            const sections = (["menu", "deals", "tour", "about", "reviews"] as TabId[]).filter(id => {
                const menuVisible = hasMenu || id !== "menu";
                const tourVisible = hasTour || id !== "tour";
                return menuVisible && tourVisible;
            });
            const offset = 140;

            for (const id of sections) {
                const el = document.getElementById(`section-${id}`);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= offset && rect.bottom > offset) {
                        setActiveTab(id as TabId);
                        break;
                    }
                }
            }
        };

        const locationHandler = () => {
            document.getElementById("section-about")?.scrollIntoView({ behavior: "smooth" });
        };
        const reviewsHandler = () => {
            document.getElementById("section-reviews")?.scrollIntoView({ behavior: "smooth" });
        };
        const handleSwitchTab = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            document.getElementById(`section-${detail}`)?.scrollIntoView({ behavior: "smooth" });
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("scroll-to-location", locationHandler);
        window.addEventListener("scroll-to-reviews", reviewsHandler);
        window.addEventListener("switchTab", handleSwitchTab);

        // Initial check
        handleScroll();

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("scroll-to-location", locationHandler);
            window.removeEventListener("scroll-to-reviews", reviewsHandler);
            window.removeEventListener("switchTab", handleSwitchTab);
        };
    }, [hasMenu]);

    const scrollToSection = (id: string) => {
        const el = document.getElementById(`section-${id}`);
        if (el) {
            // Calculate position considering sticky headers
            const y = el.getBoundingClientRect().top + window.scrollY - 120;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const allTabs: { id: TabId; label: string; icon: any }[] = [
        { id: "menu", label: "Menu", icon: BookOpen },
        { id: "deals", label: "Deals", icon: Tag },
        { id: "tour", label: "360° Tour", icon: Box },
        { id: "about", label: "About", icon: Info },
        { id: "reviews", label: "Reviews", icon: Star },
    ];

    const visibleTabs = allTabs.filter(tab => (hasMenu || tab.id !== "menu") && (hasTour || tab.id !== "tour"));

    return (
        <div className="flex flex-col gap-4">
            {/* Sticky Tab Bar - Simplified Creative Design */}
            <div 
                id="tabs-section" 
                className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-[55px] md:top-[60px] z-30"
            >
                <div className="flex w-full max-w-7xl mx-auto px-3 md:px-6 overflow-x-auto no-scrollbar touch-pan-x">
                    {visibleTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button 
                                key={tab.id} 
                                onClick={() => scrollToSection(tab.id)}
                                className={`flex-1 min-w-[70px] relative py-1 md:py-2.5 flex flex-col sm:flex-row items-center justify-center gap-0.5 md:gap-1.5 transition-all outline-none ${
                                    isActive ? "text-primary" : "text-gray-400 hover:text-gray-600"
                                }`}
                            >
                                <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-colors ${isActive ? "text-primaryScale-500" : "text-gray-400"}`} />
                                <span className={`text-[13px] md:text-[16px] font-bold transition-colors ${isActive ? "font-black" : ""}`}>
                                    {tab.label}
                                </span>
                                
                                {isActive && (
                                    <motion.div 
                                        layoutId="activeTabUnderline"
                                        className="absolute bottom-0 left-4 right-4 h-[3px] bg-primary rounded-t-full shadow-[0_-4px_8px_rgba(var(--primary-rgb),0.2)]"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Sections */}
            <div className="flex flex-col gap-5">
                {hasMenu && (
                    <section id="section-menu" className="scroll-mt-[130px]">
                        <MenuTab restaurant={r} menuData={menuData} />
                    </section>
                )}

                <section id="section-deals" className="scroll-mt-[130px]">
                    <DealsTab deals={deals} restaurant={r} />
                </section>

                {hasTour && (
                    <section id="section-tour" className="scroll-mt-[130px]">
                        <VirtualTourSection
                            restaurantId={r._id}
                            restaurantName={r.name || r.brandName}
                            vrTourAppUrl={VR_TOUR_APP_URL}
                            showFullscreen={showTourFullscreen}
                            onToggleFullscreen={() => setShowTourFullscreen(!showTourFullscreen)}
                        />
                    </section>
                )}

                <section id="section-about" className="scroll-mt-[130px]">
                    <AboutTab restaurant={r} otherBranches={otherBranches} />
                    
                    {faqs?.length > 0 && (
                        <div className="mt-6">
                            <RestaurantFaqs faqs={faqs} restaurantName={r.brandName || r.name} />
                        </div>
                    )}
                </section>

                <section id="section-reviews" className="scroll-mt-[130px]">
                    <RestaurantReviewsTab reviews={reviews} restaurant={r} />
                </section>
            </div>
        </div>
    );
}

function RestaurantFaqs({ faqs, restaurantName }: { faqs: { question: string; answer: string }[]; restaurantName: string }) {
    const [openIndex, setOpenIndex] = useState<number>(0);

    return (
        <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-3 sm:p-5 shadow-sm">
            <div className="mb-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">Quick Answers</p>
                <h2 className="mt-1 text-base font-black tracking-tight text-gray-900">
                    FAQs about {restaurantName}
                </h2>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                    Common questions diners usually check before booking, visiting, or paying.
                </p>
            </div>

            <div className="space-y-2">
                {faqs.map((faq, index) => {
                    const isOpen = index === openIndex;
                    return (
                        <div key={faq.question} className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/70">
                            <button
                                type="button"
                                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                                className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left transition hover:bg-white sm:px-5"
                            >
                                <span className="text-sm font-bold leading-6 text-gray-900">{faq.question}</span>
                                <ChevronRight className={`mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                            </button>
                            {isOpen && (
                                <div className="border-t border-gray-100 bg-white px-3 py-3 text-sm leading-6 text-gray-600 sm:px-5">
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ─── DEALS & OFFERS TAB ─── */
function DealsTab({ deals }: { deals: any[]; restaurant: any }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-250 p-4 sm:p-6 shadow-md space-y-4">
            <h2 className="text-base md:text-lg font-black text-black border-b border-gray-100 pb-2 flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" /> Deals and Offers
            </h2>
            {deals.length > 0 ? (
                <div className="space-y-3">
                    {deals.map((d: any, i: number) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-sm"
                                style={{ backgroundColor: d.bankId?.color || "#333" }}>
                                {d.bankId?.logo ? (
                                    <img src={d.bankId.logo} alt={d.bankId.name} className="w-full h-full object-contain p-1 rounded-xl" />
                                ) : (
                                    d.bankId?.name?.substring(0, 3)
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-black">{d.bankId?.name || "Bank Offer"}</p>
                                <p className="text-xs text-zinc-950 font-bold mt-0.5">
                                    {d.cardType?.join(", ")} • Min Rs. {d.minSpend || 0} spend
                                </p>
                                {d.daysValid?.length > 0 && (
                                    <p className="text-[10px] text-zinc-500 font-extrabold mt-1">Valid: {d.daysValid.join(", ")}</p>
                                )}
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xl font-black text-primary">{d.discountPercent}%</p>
                                <p className="text-[10px] text-zinc-500 font-black">OFF</p>
                                {d.maxDiscountCap > 0 && (
                                    <p className="text-[10px] text-zinc-900 font-bold">Max Rs. {d.maxDiscountCap}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-dashed border-gray-250 p-8 text-center text-zinc-500 font-bold text-sm">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-400" />
                    <p>No deals available right now.</p>
                    <p className="text-xs mt-1 text-zinc-400">Book a table to see time-based discounts!</p>
                </div>
            )}
        </div>
    );
}

/* ─── MENU TAB ─── */
function MenuTab({ restaurant, menuData }: { restaurant: any; menuData?: any }) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIdx, setLightboxIdx] = useState(0);
    const sliderRef = useRef<HTMLDivElement>(null);

    const images: string[] = restaurant.menuImages || [];

    if (images.length === 0 && (!restaurant?.menuItems || restaurant.menuItems.length === 0)) {
        // This case is usually handled by hasMenu on the parent, but as a failsafe:
        return null;
    }

    const scrollLeft = () => {
        if (sliderRef.current) {
            sliderRef.current.scrollBy({ left: -250, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        if (sliderRef.current) {
            sliderRef.current.scrollBy({ left: 250, behavior: "smooth" });
        }
    };

    const [showDigitalMenu, setShowDigitalMenu] = useState(false);

    return (
        <div className="bg-white rounded-2xl border border-gray-250 p-4 sm:p-6 shadow-md space-y-6">
            {images.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-base md:text-lg font-black text-black border-b border-gray-100 pb-2 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" /> Menu Card
                    </h2>
                    <div className="relative group/slider">
                        {images.length > 4 && (
                            <>
                                <button onClick={scrollLeft} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center text-gray-800 opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-white" title="Scroll Left">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button onClick={scrollRight} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center text-gray-800 opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-white" title="Scroll Right">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        <div
                            ref={sliderRef}
                            className="flex gap-2 overflow-x-auto scrollbar-hide snap-x px-1 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        >
                            {images.map((img: string, i: number) => (
                                <div key={i} onClick={() => { setLightboxIdx(i); setLightboxOpen(true); }}
                                    className="relative rounded-xl overflow-hidden cursor-pointer group aspect-[3/4] border bg-gray-50 flex-none snap-start w-[24%] md:w-[15.5%] border-gray-200">
                                    <img src={img} alt={`Menu page ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition duration-300 flex items-center justify-center">
                                        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity transform scale-50 group-hover:scale-100 duration-300 drop-shadow-md" />
                                    </div>
                                    {images.length > 1 && (
                                        <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-md font-medium shadow-sm">
                                            {i + 1}/{images.length}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Complete Menu (Digital Menu) */}
            <div className={images.length > 0 ? "pt-6 border-t border-gray-100" : ""}>
                <h2 className="text-base md:text-lg font-black text-black border-b border-gray-100 pb-2 flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-primary" /> Complete Menu
                </h2>
                <p className="text-[11px] text-zinc-950 font-bold mb-3 mt-1">Browse all dishes with prices — search, filter by category</p>
                <RestaurantMenu 
                    restaurantId={restaurant._id} 
                    restaurantName={restaurant.brandName || restaurant.name} 
                    isInitiallyCompact={true}
                    initialData={menuData}
                />
            </div>


            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={lightboxIdx}
                slides={images.map(src => ({ src }))}
                plugins={[Zoom, Counter]}
                carousel={{ finite: images.length === 1 }}
                render={{
                    buttonPrev: images.length <= 1 ? () => null : undefined,
                    buttonNext: images.length <= 1 ? () => null : undefined,
                }}
                zoom={{
                    maxZoomPixelRatio: 3,
                    zoomInMultiplier: 2,
                    doubleTapDelay: 300,
                    doubleClickDelay: 300,
                    doubleClickMaxStops: 2,
                    keyboardMoveDistance: 50,
                    wheelZoomDistanceFactor: 100,
                    pinchZoomDistanceFactor: 100,
                    scrollToZoom: false,
                }}
            />
        </div>
    );
}


/* ─── ABOUT TAB ─── */
function AboutTab({ restaurant, otherBranches }: { restaurant: any; otherBranches: any[] }) {
    const r = restaurant;

    return (
        <div className="bg-white rounded-2xl border border-gray-250 p-4 sm:p-6 shadow-md space-y-6">
            <h2 className="text-base md:text-lg font-black text-black border-b border-gray-100 pb-2 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" /> About & Venue Details
            </h2>

            {/* Owner Description */}
            {r.description && (
                <div className="space-y-2">
                    <h3 className="text-sm font-black text-black">About {r.brandName || r.name}</h3>
                    <div 
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(r.description) }} 
                        className="prose prose-sm max-w-none text-[13px] md:text-sm text-zinc-950 leading-relaxed [&_p]:mb-3 [&_p]:last:mb-0 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-4 [&_table]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:!w-auto [&_div]:!w-auto [&_span]:!w-auto [&_p]:!mx-0 [&_div]:!mx-0 [&_h1]:!mx-0 [&_h2]:!mx-0 [&_h3]:!mx-0 [&_h4]:!mx-0 [&_h5]:!mx-0 [&_h6]:!mx-0 [&_p]:!whitespace-normal [&_div]:!whitespace-normal [&_span]:!whitespace-normal [&_*]:max-w-full [&_*]:[!word-break:normal] [&_*]:[!overflow-wrap:break-word] font-bold" 
                    />
                </div>
            )}

            {/* Location */}
            <div id="about-location" className="border-t border-gray-100 pt-6 space-y-3">
                <h3 className="text-sm font-black text-black flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" /> Location & Address
                </h3>
                <div>
                    <p className="text-sm font-bold text-zinc-950">{r.address}</p>
                    <p className="text-xs text-zinc-500 font-semibold mt-0.5">{r.area}, {r.city}</p>
                </div>

                {r.location?.coordinates?.length === 2 && (
                    <>
                        <div className="w-full h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 mt-2 z-0 relative">
                            <MapView restaurants={[{ id: r._id, name: r.name, category: r.category || "Restaurant", lat: r.location.coordinates[1], lng: r.location.coordinates[0], logo: r.logo || r.coverImage }]} />
                        </div>
                        <a href={`https://www.google.com/maps?q=${r.location.coordinates[1]},${r.location.coordinates[0]}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-zinc-950 hover:bg-black text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-[0.98]">
                            <Navigation className="w-4 h-4" /> Get Directions
                        </a>
                    </>
                )}
            </div>

            {/* Opening Hours */}
            {r.openingHours?.length > 0 && (() => {
                const to12h = (t: string) => {
                    if (!t) return t;
                    const [hStr, mStr] = t.split(":");
                    let h = parseInt(hStr, 10);
                    const suffix = h >= 12 ? "PM" : "AM";
                    if (h === 0) h = 12;
                    else if (h > 12) h -= 12;
                    return `${h}:${mStr} ${suffix}`;
                };
                return (
                    <div className="border-t border-gray-100 pt-6 space-y-3">
                        <h3 className="text-sm font-black text-black flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-primary" /> Opening Hours
                        </h3>
                        <div className="grid gap-0.5">
                            {r.openingHours.map((h: any, i: number) => (
                                <div key={i} className={`flex justify-between text-sm py-1.5 px-3 rounded-lg ${h.isClosed ? "bg-red-50 text-red-750 font-bold" : "hover:bg-gray-50 text-zinc-950 font-bold"}`}>
                                    <span>{h.day}</span>
                                    <span className={h.isClosed ? "text-red-750 font-black" : "text-black font-black"}>
                                        {h.isClosed ? "Closed" : `${to12h(h.open)} – ${to12h(h.close)}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })()}

            {/* Official Website */}
            {r.website && (
                <div className="border-t border-gray-100 pt-6 space-y-3">
                    <h3 className="text-sm font-black text-black flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-primary" /> Links
                    </h3>
                    <a href={r.website} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-black text-zinc-950 bg-gray-50 border border-gray-250 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition uppercase tracking-wider">
                        Visit Official Website
                    </a>
                </div>
            )}

            {/* Cuisines + Service Type + Facilities + Vibes */}
            <div id="about-details" className="border-t border-gray-100 pt-6 space-y-4">
                {r.restaurantType?.length > 0 && (
                    <div>
                        <h4 className="text-xs font-black text-black uppercase tracking-wider mb-2">Service Type</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {r.restaurantType.map((t: string) => (
                                <span key={t} className="bg-amber-50 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-black border border-amber-200 flex items-center gap-1">
                                    {SERVICE_TYPE_LABELS[t] || t}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {r.cuisines?.length > 0 && (
                    <div>
                        <h4 className="text-xs font-black text-black uppercase tracking-wider mb-2">Cuisines</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {r.cuisines.map((c: string) => (
                                <span key={c} className="bg-primary/5 text-primary px-3 py-1.5 rounded-lg text-xs font-black">{c}</span>
                            ))}
                        </div>
                    </div>
                )}
                {r.facilities?.length > 0 && (
                    <div>
                        <h4 className="text-xs font-black text-black uppercase tracking-wider mb-2">Facilities</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {r.facilities.map((f: string) => (
                                <span key={f} className="bg-gray-50 text-black px-3 py-1.5 rounded-lg text-xs font-black border capitalize">
                                    {f.replace(/_/g, " ")}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {r.vibes?.length > 0 && (
                    <div>
                        <h4 className="text-xs font-black text-black uppercase tracking-wider mb-2">Vibes</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {r.vibes.map((v: string) => (
                                <span key={v} className="bg-primary/5 text-primary px-3 py-1.5 rounded-lg text-xs font-black border border-primary/10 capitalize">
                                    {v.replace(/_/g, " ")}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── 360° VIRTUAL TOUR SECTION ─── */

function VirtualTourSection({
    restaurantId,
    restaurantName,
    vrTourAppUrl,
    showFullscreen,
    onToggleFullscreen,
}: {
    restaurantId: string;
    restaurantName: string;
    vrTourAppUrl: string;
    showFullscreen: boolean;
    onToggleFullscreen: () => void;
}) {
    const viewerUrl = `${vrTourAppUrl}/vr-tour/view/${restaurantId}`;

    // Listen for close messages from the iframe
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data?.type === "CLOSE_VR_TOUR" && showFullscreen) {
                onToggleFullscreen();
            }
        };
        window.addEventListener("message", handler);
        return () => window.removeEventListener("message", handler);
    }, [showFullscreen, onToggleFullscreen]);

    // Lock body scroll when fullscreen
    useEffect(() => {
        if (showFullscreen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [showFullscreen]);

    return (
        <>
            {/* Inline Preview */}
            <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">Immersive Experience</p>
                        <h2 className="text-base font-black tracking-tight text-gray-900 mt-0.5 flex items-center gap-2">
                            <Box className="w-4 h-4 text-primary" /> 360° Virtual Tour
                        </h2>
                    </div>
                    <button
                        onClick={onToggleFullscreen}
                        className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
                    >
                        <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                    </button>
                </div>

                {/* Inline iframe preview (16:9 aspect ratio) */}
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                        src={viewerUrl}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="gyroscope; accelerometer; fullscreen"
                        allowFullScreen
                        title={`360° Tour — ${restaurantName}`}
                        loading="lazy"
                    />
                </div>

                <div className="px-4 py-3 bg-gray-50/50 flex items-center gap-2 text-xs text-gray-500">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Drag to look around • Pinch to zoom • Click hotspots to navigate</span>
                </div>
            </div>

            {/* Fullscreen Overlay */}
            <AnimatePresence>
                {showFullscreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[9999] bg-black"
                    >
                        <iframe
                            src={viewerUrl}
                            className="w-full h-full border-0"
                            allow="gyroscope; accelerometer; fullscreen"
                            allowFullScreen
                            title={`360° Tour — ${restaurantName}`}
                        />

                        {/* Close button (overlay on top of iframe) */}
                        <button
                            onClick={onToggleFullscreen}
                            className="absolute top-4 right-4 z-[10000] w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                            style={{ top: "max(16px, env(safe-area-inset-top))" }}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
