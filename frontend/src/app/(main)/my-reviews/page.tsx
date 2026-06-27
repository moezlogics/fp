"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Loader2, MessageCircle, MapPin, ArrowLeft } from "lucide-react";

export default function MyReviewsPage() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingReview, setEditingReview] = useState<any>(null);
    const [editData, setEditData] = useState({ rating: 5, reviewText: "" });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (authStatus === "unauthenticated") {
            router.push("/login");
            return;
        }
        if (authStatus !== "authenticated") return;

        fetch("/api/users/reviews")
            .then((r) => r.json())
            .then((data) => setReviews(Array.isArray(data) ? data : []))
            .catch(() => setReviews([]))
            .finally(() => setLoading(false));
    }, [authStatus, router]);

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString("en-PK", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const openEditModal = (review: any) => {
        setEditingReview(review);
        setEditData({
            rating: review.rating,
            reviewText: review.reviewText || review.text || "",
        });
    };

    const submitEdit = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/users/reviews/${editingReview._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editData),
            });
            if (res.ok) {
                const updated = await res.json();
                setReviews((prev) =>
                    prev.map((r) => (r._id === editingReview._id ? { ...r, ...updated.review } : r))
                );
                setEditingReview(null);
            }
        } catch (error) {
            console.error("Error updating review", error);
        } finally {
            setSubmitting(false);
        }
    };

    if (authStatus === "loading" || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 md:pb-8" style={{ backgroundColor: "#fafafa" }}>
            {/* ═══ APP HEADER ═══ */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/account" className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors active:scale-95">
                            <ArrowLeft className="w-5 h-5 text-gray-700" />
                        </Link>
                        <h1 className="font-bold text-lg tracking-tight text-gray-900">My Reviews</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
                {reviews.length === 0 ? (
                    <div className="bg-white rounded-[24px] border border-gray-100 p-10 text-center flex flex-col items-center justify-center mt-4" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.03)", minHeight: 300 }}>
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(232, 50, 59, 0.12)" }}>
                            <MessageCircle className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">No reviews yet</h3>
                        <p className="text-[13px] text-gray-500 max-w-[250px] leading-relaxed mb-6">
                            Share your dining experiences to help other foodies decide where to eat next.
                        </p>
                        <Link href="/" className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95" style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                            Find Restaurants
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <div key={review._id} className="bg-white rounded-[20px] p-5 border border-gray-100/50 relative overflow-hidden group" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.03)" }}>

                                {/* Header / Restaurant Info */}
                                <div className="flex justify-between items-start mb-4">
                                    <Link href={`/${(review.restaurant?.city || review.restaurantId?.city || 'pk').toLowerCase()}/${review.restaurant?.slug || review.restaurantId?.slug || ''}/`} className="flex-1 pr-4">
                                        <h3 className="font-bold text-[15px] text-gray-900 leading-tight group-hover:text-primary-dark transition-colors">
                                            {review.restaurant?.name || review.restaurantId?.name || "Unknown Restaurant"}
                                        </h3>
                                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 font-medium">
                                            <MapPin className="w-3 h-3" />
                                            {review.restaurant?.area || review.restaurantId?.area}, {review.restaurant?.city || review.restaurantId?.city}
                                        </p>
                                    </Link>
                                    <div className="bg-primary/5 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-primary/10">
                                        <span className="font-bold text-[13px] text-primary">{(review.rating || review.overallRating || 0).toFixed(1)}</span>
                                        <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                                    </div>
                                </div>

                                {/* Review Content */}
                                <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100/50">
                                    <p className="text-[13px] text-gray-700 leading-relaxed italic">
                                        "{review.reviewText || review.text}"
                                    </p>
                                </div>

                                {/* Owner Reply */}
                                {review.ownerReply && (
                                    <div className="ml-6 bg-primary/5 border border-primary/10 rounded-xl p-4 mb-4 text-sm relative">
                                        <div className="absolute -left-3 top-4 w-3 h-[2px] bg-primary/20"></div>
                                        <div className="absolute -left-3 top-4 bottom-8 w-[2px] bg-primary/20"></div>
                                        <p className="text-[11px] font-bold text-primary tracking-wider uppercase mb-1 flex items-center gap-1.5">
                                            <MessageCircle className="w-3 h-3" /> Restaurant Reply
                                        </p>
                                        <p className="text-[12.5px] text-gray-800 leading-relaxed">{review.ownerReply}</p>
                                    </div>
                                )}

                                {/* Footer / Actions */}
                                <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                                    <span className="text-[11px] font-medium text-gray-400">
                                        {formatDate(review.createdAt)}
                                    </span>
                                    <button
                                        onClick={() => openEditModal(review)}
                                        className="text-[12px] font-bold text-primary hover:text-primary-dark bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Edit Review
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingReview && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-6">Edit Review</h2>

                        <div className="mb-6">
                            <label className="block text-[13px] font-bold text-gray-700 mb-2">Overall Rating</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setEditData({ ...editData, rating: star })}
                                        className="p-1 focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                    >
                                        <Star
                                            className={`w-8 h-8 ${editData.rating >= star
                                                    ? "text-primary fill-primary drop-shadow-sm"
                                                    : "text-gray-200"
                                                } transition-colors`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-[13px] font-bold text-gray-700 mb-2">Review Details</label>
                            <textarea
                                value={editData.reviewText}
                                onChange={(e) => setEditData({ ...editData, reviewText: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none bg-gray-50 focus:bg-white text-[14px]"
                                rows={4}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditingReview(null)}
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-[13px]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitEdit}
                                disabled={submitting}
                                className="flex-1 flex justify-center items-center px-4 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-70 active:scale-95 text-[13px]"
                                style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
