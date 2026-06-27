"use client";

import { useState, useEffect } from "react";
import { useBranch } from "../owner-shell";
import { Star, Loader2, Send, MessageCircle, User, Camera, X, Mail, Phone } from "lucide-react";

export default function OwnerReviewsPage() {
    const { branch } = useBranch();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!branch) return;
        fetch(`/api/reviews?restaurantId=${branch._id}`).then(r => r.json()).then(d => { const payload = d?.data || d; setReviews(payload?.reviews || (Array.isArray(payload) ? payload : [])); setLoading(false); });
    }, [branch]);

    const submitReply = async (reviewId: string) => {
        if (!replyText.trim()) return;
        setSubmitting(true);
        await fetch(`/api/reviews/${reviewId}/reply`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ownerReply: replyText }),
        });
        setSubmitting(false);
        setReplyingTo(null);
        setReplyText("");
        const d = await fetch(`/api/reviews?restaurantId=${branch._id}`).then(r => r.json());
        const payload = d?.data || d;
        setReviews(payload?.reviews || (Array.isArray(payload) ? payload : []));
    };

    if (!branch) return null;

    const avgRating = reviews.length > 0
        ? (reviews.reduce((s, r) => s + (r.overallRating || 0), 0) / reviews.length).toFixed(1)
        : "0.0";

    return (
        <div className="space-y-6 max-w-3xl">
            {/* ═══ HEADER ═══ */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-gray-900">Reviews</h1>
                    <p className="text-[12px] text-gray-400 font-medium mt-0.5">{reviews.length} reviews for {branch.branchName}</p>
                </div>
                {reviews.length > 0 && (
                    <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 px-4 py-2.5 rounded-2xl">
                        <Star className="w-5 h-5 text-primary fill-primary" />
                        <span className="font-black text-[18px] text-primary-dark">{avgRating}</span>
                        <span className="text-[11px] text-primary font-medium">avg rating</span>
                    </div>
                )}
            </div>

            {/* ═══ REVIEWS LIST ═══ */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : reviews.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                    <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                        <Star className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-bold text-gray-700 text-[14px]">No reviews yet</p>
                    <p className="text-[12px] text-gray-400 mt-1">Reviews will appear here when customers rate this branch.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((r: any) => (
                        <div key={r._id} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 hover:shadow-sm transition-all" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.02)" }}>
                            {/* Header: User + Rating */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-black text-[14px] border border-primary/10">
                                        {(r.userId?.name || r.guestName || "?").charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[14px] font-bold text-gray-900">{r.userId?.name || r.guestName || "Anonymous"}</p>
                                            {r.userId && <span className="text-[9px] font-bold uppercase bg-green-50 text-green-700 px-1.5 py-0.5 rounded">Verified</span>}
                                        </div>
                                        <p className="text-[11px] text-gray-400 font-medium mb-1">{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" }) : ""}</p>
                                        
                                        {/* Contact Info container */}
                                        <div className="flex flex-col gap-0.5 mt-1">
                                            {(r.userId?.email || r.guestEmail) && (
                                                <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                                                    <Mail className="w-3 h-3 text-gray-400" />
                                                    <span>{r.userId?.email || r.guestEmail}</span>
                                                </div>
                                            )}
                                            {r.userId?.phone && (
                                                <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                                                    <Phone className="w-3 h-3 text-gray-400" />
                                                    <span>{r.userId.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    {Array.from({ length: 5 }, (_, i) => (
                                        <Star key={i} className={`w-4 h-4 ${i < r.overallRating ? "text-primary fill-primary" : "text-gray-200"}`} />
                                    ))}
                                </div>
                            </div>

                            {/* Granular Ratings */}
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { label: "Food", value: r.foodRating, emoji: "🍽️" },
                                    { label: "Ambiance", value: r.ambianceRating, emoji: "🏡" },
                                    { label: "Service", value: r.serviceRating, emoji: "🤝" },
                                ].map(rating => (
                                    <div key={rating.label} className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100/50">
                                        <span className="text-[12px]">{rating.emoji}</span>
                                        <span className="text-[11px] text-gray-500 font-medium">{rating.label}</span>
                                        <span className="text-[12px] font-black text-gray-800">{rating.value}/5</span>
                                    </div>
                                ))}
                            </div>

                            {/* Review Text */}
                            {r.text && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100/50">
                                    <p className="text-[13px] text-gray-700 leading-relaxed italic">&ldquo;{r.text}&rdquo;</p>
                                </div>
                            )}

                            {/* Review Photos */}
                            {r.photos?.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {r.photos.map((p: string, i: number) => (
                                        <img key={i} src={p} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-100 shrink-0" />
                                    ))}
                                </div>
                            )}

                            {/* Owner Reply / Reply Input */}
                            {r.ownerReply ? (
                                <div className="ml-4 bg-primary/5 border border-primary/10 rounded-xl p-4 relative">
                                    <div className="absolute -left-2.5 top-4 w-2.5 h-[2px] bg-primary/20" />
                                    <p className="text-[10px] font-black text-primary uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                        <MessageCircle className="w-3 h-3" /> Your Reply
                                    </p>
                                    <p className="text-[13px] text-gray-800 leading-relaxed">{r.ownerReply}</p>
                                </div>
                            ) : replyingTo === r._id ? (
                                <div className="ml-4 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            placeholder="Write your reply..."
                                            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 focus:bg-white transition-all"
                                        />
                                        <button
                                            onClick={() => submitReply(r._id)}
                                            disabled={submitting || !replyText.trim()}
                                            className="text-white px-4 py-2.5 rounded-xl text-[12px] font-bold disabled:opacity-50 flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                                            style={{ backgroundColor: "#e8323b" }}
                                        >
                                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <button onClick={() => { setReplyingTo(null); setReplyText(""); }} className="text-[11px] text-gray-400 hover:text-gray-600 font-bold ml-1">
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => setReplyingTo(r._id)} className="text-[12px] font-bold text-primary hover:text-primary-dark bg-primary/5 hover:bg-primary/10 px-3.5 py-2 rounded-xl transition-colors ml-4 active:scale-95">
                                    Reply to this review
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
