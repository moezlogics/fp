"use client";

import { useState, useEffect } from "react";
import { X, Search, Calendar, Clock, Users, Building, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";

interface AdminBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AdminBookingModal({ isOpen, onClose, onSuccess }: AdminBookingModalProps) {
    const { data: session } = useSession();

    // Step 1: Select User
    const [userSearchQ, setUserSearchQ] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    // Step 2: Select Restaurant
    const [restSearchQ, setRestSearchQ] = useState("");
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [searchingRests, setSearchingRests] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);

    // Step 3: Booking Details
    const [date, setDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split("T")[0];
    });
    const [pax, setPax] = useState<number>(2);
    const [slots, setSlots] = useState<any[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string>("");

    // Auth & Submit
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Search Users
    useEffect(() => {
        if (userSearchQ.length < 3) {
            setUsers([]);
            return;
        }
        const delay = setTimeout(() => {
            setSearchingUsers(true);
            // Re-using the admin prime search endpoint since it searches users reliably
            fetch(`/api/users/admin/prime?action=search&q=${encodeURIComponent(userSearchQ)}`)
                .then(r => r.json())
                .then(d => {
                    setUsers(Array.isArray(d) ? d : (d.data || []));
                })
                .catch(() => setUsers([]))
                .finally(() => setSearchingUsers(false));
        }, 500);
        return () => clearTimeout(delay);
    }, [userSearchQ]);

    // Search Restaurants (using public search endpoint)
    useEffect(() => {
        if (restSearchQ.length < 2) {
            setRestaurants([]);
            return;
        }
        const delay = setTimeout(() => {
            setSearchingRests(true);
            fetch(`/api/search?q=${encodeURIComponent(restSearchQ)}&limit=8`)
                .then(r => r.json())
                .then(d => setRestaurants(Array.isArray(d) ? d : (d.results || d.data || [])))
                .catch(() => setRestaurants([]))
                .finally(() => setSearchingRests(false));
        }, 500);
        return () => clearTimeout(delay);
    }, [restSearchQ]);

    // Fetch Slots when Restaurant & Date & Pax change
    useEffect(() => {
        if (!selectedRestaurant || !date || !pax) {
            setSlots([]);
            return;
        }
        setLoadingSlots(true);
        setSelectedSlot("");

        // Use the real booking-slots endpoint (the old /api/restaurants/[slug]
        // path had no route → 404, so slots never loaded).
        fetch(`/api/restaurants/${selectedRestaurant.slug}/slots?date=${date}&pax=${pax}`)
            .then(r => r.json())
            .then(d => setSlots(Array.isArray(d.slots) ? d.slots : []))
            .catch(() => setSlots([]))
            .finally(() => setLoadingSlots(false));
    }, [selectedRestaurant, date, pax]);

    const handleBook = async () => {
        if (!selectedUser || !selectedRestaurant || !date || !selectedSlot || !pax) {
            setError("Please fill all required fields");
            return;
        }

        setError("");
        setSubmitting(true);

        try {
            // First hit the public hold endpoint, but pass adminBookingUserId
            const holdRes = await fetch("/api/reservations/hold", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    restaurantId: selectedRestaurant._id,
                    date,
                    timeSlot: selectedSlot,
                    pax,
                    guestName: selectedUser.name,
                    guestPhone: selectedUser.phone || "",
                    adminBookingUserId: selectedUser._id, // KEY FIELD FOR ADMIN
                    // `occasion` is a strict enum — note the channel in specialRequests instead.
                    specialRequests: "Admin WhatsApp Booking",
                })
            });

            const holdData = await holdRes.json();
            // The hold proxy returns the inner payload: { reservation, remainingSeconds, message }.
            const reservationId = holdData.reservation?._id;
            if (!holdRes.ok || !reservationId) {
                throw new Error(holdData.error || "Failed to hold table");
            }

            // Then automatically confirm it instantly via the [id]/confirm route.
            const confirmRes = await fetch(`/api/reservations/${reservationId}/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    adminBookingUserId: selectedUser._id,
                    guestName: selectedUser.name,
                    guestPhone: selectedUser.phone || "",
                    specialRequests: "Admin WhatsApp Booking",
                    paymentMode: "AtRestaurant",
                })
            });

            const confirmData = await confirmRes.json();
            if (!confirmRes.ok) {
                throw new Error(confirmData.error || "Failed to confirm table");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">

                <div className="flex items-center justify-between p-5 border-b">
                    <div>
                        <h2 className="text-xl font-bold">Create WhatsApp Booking</h2>
                        <p className="text-sm text-gray-500">Book on behalf of a user to apply their Prime benefits</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Step 1: User */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold flex items-center gap-2 text-gray-700 uppercase tracking-wider">
                            <Users className="w-4 h-4 text-primary" /> 1. Select User
                        </label>

                        {!selectedUser ? (
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                <input
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition"
                                    placeholder="Search user by name, email or phone (min 3 chars).."
                                    value={userSearchQ}
                                    onChange={(e) => setUserSearchQ(e.target.value)}
                                />
                                {searchingUsers && <div className="text-xs text-gray-400 mt-2">Searching...</div>}
                                {users.length > 0 && (
                                    <div className="absolute top-full mt-1 w-full bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto z-10">
                                        {users.map(u => (
                                            <button
                                                key={u._id}
                                                onClick={() => { setSelectedUser(u); setUsers([]); setUserSearchQ(""); }}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between group"
                                            >
                                                <div>
                                                    <p className="font-bold text-sm text-gray-800">{u.name}</p>
                                                    <p className="text-xs text-gray-500">{u.phone || u.email}</p>
                                                </div>
                                                {u.isPrime && <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full">PRIME</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-3">
                                <div>
                                    <p className="font-bold text-blue-900">{selectedUser.name}</p>
                                    <p className="text-xs text-blue-700">{selectedUser.phone || selectedUser.email}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {selectedUser.isPrime && <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">PRIME</span>}
                                    <button onClick={() => setSelectedUser(null)} className="text-xs font-bold text-red-600 hover:underline">Change</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Restaurant */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold flex items-center gap-2 text-gray-700 uppercase tracking-wider">
                            <Building className="w-4 h-4 text-primary" /> 2. Select Restaurant
                        </label>

                        {!selectedRestaurant ? (
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                <input
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition"
                                    placeholder="Search restaurant..."
                                    value={restSearchQ}
                                    onChange={(e) => setRestSearchQ(e.target.value)}
                                    disabled={!selectedUser}
                                />
                                {searchingRests && <div className="text-xs text-gray-400 mt-2">Searching...</div>}
                                {restaurants.length > 0 && (
                                    <div className="absolute top-full mt-1 w-full bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto z-10">
                                        {restaurants.map(r => (
                                            <button
                                                key={r._id}
                                                onClick={() => { setSelectedRestaurant(r); setRestaurants([]); setRestSearchQ(""); }}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0"
                                            >
                                                <p className="font-bold text-sm text-gray-800">{r.name}</p>
                                                <p className="text-xs text-gray-500">{r.area}, {r.city}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                                <div>
                                    <p className="font-bold text-emerald-900">{selectedRestaurant.name}</p>
                                    <p className="text-xs text-emerald-700">{selectedRestaurant.area}, {selectedRestaurant.city}</p>
                                </div>
                                <button onClick={() => setSelectedRestaurant(null)} className="text-xs font-bold text-red-600 hover:underline">Change</button>
                            </div>
                        )}
                    </div>

                    {/* Step 3: Date, Pax, Time */}
                    {selectedRestaurant && (
                        <div className="space-y-4 pt-2">
                            <label className="text-sm font-bold flex items-center gap-2 text-gray-700 uppercase tracking-wider">
                                <Calendar className="w-4 h-4 text-primary" /> 3. Booking Details
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        min={new Date().toISOString().split("T")[0]}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full border rounded-xl px-3 py-2 text-sm bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Guests Options</label>
                                    <select
                                        value={pax}
                                        onChange={(e) => setPax(Number(e.target.value))}
                                        className="w-full border rounded-xl px-3 py-2 text-sm bg-gray-50"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(n => (
                                            <option key={n} value={n}>{n} {n === 1 ? "Guest" : "Guests"}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">Available Time Slots</label>
                                {loadingSlots ? (
                                    <div className="text-sm text-gray-400">Loading availability...</div>
                                ) : slots.length === 0 ? (
                                    <div className="text-sm text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">No availability for this date/pax.</div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-2 pb-2 custom-scrollbar">
                                        {slots.map((slot: any) => {
                                            const [h, m] = slot.timeSlot.split(":");
                                            const hr = parseInt(h);
                                            const timeDisplay = `${hr === 0 ? 12 : hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? "PM" : "AM"}`;
                                            const isSelected = selectedSlot === slot.timeSlot;

                                            // booking-slots already computes availability vs pax.
                                            const isFull = slot.isAvailable === false;

                                            return (
                                                <button
                                                    key={slot.timeSlot}
                                                    disabled={isFull}
                                                    onClick={() => setSelectedSlot(slot.timeSlot)}
                                                    className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 border ${isSelected
                                                            ? "bg-primary text-white border-primary ring-2 ring-primary/20"
                                                            : isFull
                                                                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                                                                : "bg-white text-gray-700 hover:border-primary/50"
                                                        }`}
                                                >
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeDisplay}</span>
                                                    {slot.discountPercent > 0 && !isFull && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded inline-block ${isSelected ? "bg-white/20" : "bg-red-50 text-red-600"}`}>
                                                            {slot.discountPercent}% OFF
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBook}
                        disabled={submitting || !selectedUser || !selectedRestaurant || !date || !selectedSlot}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitting ? "Processing..." : "Create Booking"}
                    </button>
                </div>
            </div>
        </div>
    );
} 
