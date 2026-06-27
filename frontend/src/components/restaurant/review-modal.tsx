"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Star, X, Loader2, Camera, Send, CheckCircle } from "lucide-react";

interface ReviewModalProps {
    restaurantId: string;
    restaurantName: string;
    isOpen: boolean;
    onClose: () => void;
    onSubmitted?: () => void;
}

const RATING_LABELS = ["", "Poor", "Below Average", "Average", "Good", "Excellent"];

export function ReviewModal({ restaurantId, restaurantName, isOpen, onClose, onSubmitted }: ReviewModalProps) {
    const { data: session } = useSession();
    const [overallRating, setOverallRating] = useState(0);
    const [foodRating, setFoodRating] = useState(0);
    const [ambianceRating, setAmbianceRating] = useState(0);
    const [serviceRating, setServiceRating] = useState(0);
    const [text, setText] = useState("");
    const [photoUrls, setPhotoUrls] = useState<string[]>([]);
    const [photoInput, setPhotoInput] = useState("");
    const [guestName, setGuestName] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    function addPhoto() {
        if (photoInput.trim() && photoUrls.length < 5) {
            setPhotoUrls([...photoUrls, photoInput.trim()]);
            setPhotoInput("");
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (!session?.user) {
            if (!guestName.trim()) {
                setError("Please enter your name.");
                return;
            }
            if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
                setError("Please enter a valid email address.");
                return;
            }
        }

        if (overallRating === 0) {
            setError("Please select an overall rating.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    restaurantId,
                    overallRating,
                    foodRating: foodRating || overallRating,
                    ambianceRating: ambianceRating || overallRating,
                    serviceRating: serviceRating || overallRating,
                    text,
                    photos: photoUrls,
                    ...(!session?.user && { guestName, guestEmail }),
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to submit review.");
            } else {
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                    onSubmitted?.();
                }, 2000);
            }
        } catch {
            setError("Network error. Please try again.");
        }
        setLoading(false);
    }

    function RatingStars({
        value,
        onChange,
        label,
    }: {
        value: number;
        onChange: (v: number) => void;
        label: string;
    }) {
        return (
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 w-24">{label}</span>
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => onChange(star)}
                            className="p-0.5 transition-transform hover:scale-110"
                        >
                            <Star
                                className={`w-6 h-6 transition ${star <= value
                                        ? "text-yellow-400 fill-yellow-400"
                                        : "text-gray-200 hover:text-yellow-200"
                                    }`}
                            />
                        </button>
                    ))}
                    <span className="text-xs text-gray-400 w-20 text-right">
                        {RATING_LABELS[value] || ""}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-2xl z-10">
                    <div>
                        <h2 className="text-lg font-bold">Write a Review</h2>
                        <p className="text-xs text-gray-500">{restaurantName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {success ? (
                    <div className="p-8 text-center space-y-3">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                        <h3 className="text-xl font-bold">Thank You!</h3>
                        <p className="text-sm text-gray-500">Your review has been submitted and will be visible shortly.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-5 space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        {/* Ratings */}
                        <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                            <RatingStars value={overallRating} onChange={setOverallRating} label="Overall *" />
                            <div className="border-t pt-2 space-y-2">
                                <RatingStars value={foodRating} onChange={setFoodRating} label="Food" />
                                <RatingStars value={ambianceRating} onChange={setAmbianceRating} label="Ambiance" />
                                <RatingStars value={serviceRating} onChange={setServiceRating} label="Service" />
                            </div>
                        </div>

                        {/* Review Text */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">Your Experience</label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                rows={4}
                                placeholder="Tell other foodies about your dining experience..."
                                maxLength={2000}
                                className="w-full border rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                            />
                            <p className="text-xs text-gray-400 text-right">{text.length}/2000</p>
                        </div>

                        {/* Guest Info (If not logged in) */}
                        {!session?.user && (
                            <div className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                <p className="text-xs font-bold text-indigo-800">Reviewing as a Guest</p>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Your Name *</label>
                                    <input 
                                        type="text" 
                                        value={guestName} 
                                        onChange={e => setGuestName(e.target.value)} 
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 outline-none" 
                                        placeholder="e.g. Ali Khan" 
                                        required 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Your Email *</label>
                                    <input 
                                        type="email" 
                                        value={guestEmail} 
                                        onChange={e => setGuestEmail(e.target.value)} 
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 outline-none" 
                                        placeholder="ali@example.com" 
                                        required 
                                    />
                                    <p className="text-[10px] text-gray-500">Your email will not be published. It is used to verify authentic reviews.</p>
                                </div>
                            </div>
                        )}

                        {/* Photos (Only for logged in users) */}
                        {session?.user && (
                            <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
                                <Camera className="w-3 h-3" /> Add Photos (Optional, max 5)
                            </label>
                            {photoUrls.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                    {photoUrls.map((url, i) => (
                                        <div key={i} className="relative group">
                                            <img src={url} alt={`Photo ${i + 1}`} className="w-16 h-16 rounded-lg object-cover border" />
                                            <button
                                                type="button"
                                                onClick={() => setPhotoUrls(photoUrls.filter((_, idx) => idx !== i))}
                                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {photoUrls.length < 5 && (
                                <div className="flex gap-2">
                                    <input
                                        value={photoInput}
                                        onChange={(e) => setPhotoInput(e.target.value)}
                                        placeholder="Paste image URL..."
                                        className="flex-1 border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary/30 transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={addPhoto}
                                        className="bg-gray-100 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition"
                                    >
                                        Add
                                    </button>
                                </div>
                            )}
                        </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || overallRating === 0}
                            className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {loading ? "Submitting..." : "Submit Review"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
