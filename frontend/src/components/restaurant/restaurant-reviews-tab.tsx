"use client";

import { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Check, Crown, Heart, Image as ImageIcon, MessageCircle, Sparkles, Star, Upload, UtensilsCrossed, X } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

const REVIEW_LINK_PATTERN =
    /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|pk|co|io|me|ly|app|dev|info|biz|gg|tv|ai|uk|us|ca|ae|sa)\b|(?:wa\.me|t\.me|bit\.ly|tinyurl\.com))/i;
const REVIEW_BLOCKED_TERMS = [
    "fuck", "fucking", "shit", "bitch", "bastard", "asshole",
    "madarchod", "behenchod", "behnchod", "benchod", "mc", "bc", "bkl",
    "harami", "kamina", "kameena", "kutta", "kutti", "chutiya", "chootiya", "gandu", "gaand",
];
const MAX_REVIEW_PHOTOS = 4;
const MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;

type ReplyDraft = {
    text: string;
    guestName: string;
    guestEmail?: string;
    error: string;
};

type ReviewPhotoDraft = {
    key: string;
    file: File;
    preview: string;
};

function normalizeReviewInput(value: string) {
    return value
        .toLowerCase()
        .replace(/[@]/g, "a")
        .replace(/[0]/g, "o")
        .replace(/[1!]/g, "i")
        .replace(/[3]/g, "e")
        .replace(/[4]/g, "a")
        .replace(/[5$]/g, "s")
        .replace(/[7]/g, "t")
        .replace(/[^a-z\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function validateDisplayName(value: string) {
    const cleanValue = value.replace(/\s+/g, " ").trim();
    if (cleanValue.length < 2 || cleanValue.length > 40) return "Name must be between 2 and 40 characters.";
    if (REVIEW_LINK_PATTERN.test(cleanValue)) return "Links are not allowed in names.";
    if (REVIEW_BLOCKED_TERMS.some((term) => normalizeReviewInput(cleanValue).includes(term))) return "Please use a respectful name.";
    return "";
}

function validateReviewMessage(value: string, fieldLabel: string, minLength: number, maxLength: number) {
    const cleanValue = value.replace(/\s+/g, " ").trim();
    if (cleanValue.length < minLength) return `${fieldLabel} must be at least ${minLength} characters.`;
    if (cleanValue.length > maxLength) return `${fieldLabel} must be under ${maxLength} characters.`;
    if (REVIEW_LINK_PATTERN.test(cleanValue)) return `Links are not allowed in ${fieldLabel.toLowerCase()}.`;
    if (REVIEW_BLOCKED_TERMS.some((term) => normalizeReviewInput(cleanValue).includes(term))) {
        return `${fieldLabel} contains abusive language and cannot be submitted.`;
    }
    if (/(.)\1{6,}/i.test(cleanValue) || /\b(\w+)(?:\s+\1){4,}\b/i.test(cleanValue)) {
        return `${fieldLabel} looks spammy. Please rewrite it naturally.`;
    }
    return "";
}

function formatReviewDate(value?: string) {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
}

function Avatar({ user, guestName, isVerified, isVerifiedDiner, size = "w-10 h-10" }: any) {
    return (
        <div className="relative shrink-0">
            {user?.avatar ? (
                <img src={user.avatar} alt="" className={`${size} rounded-full object-cover`} />
            ) : (
                <div className={`${size} rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-sm`}>
                    {(user?.name || guestName || "?").charAt(0).toUpperCase()}
                </div>
            )}
            {isVerified && (
                <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-500">
                    <Check className="h-2.5 w-2.5 text-white" />
                </div>
            )}
            {isVerifiedDiner && (
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-primary/50">
                    <Crown className="h-2.5 w-2.5 text-white" />
                </div>
            )}
        </div>
    );
}

function ReviewPhotoGrid({
    photos,
    onPhotoClick,
}: {
    photos: string[];
    onPhotoClick: (index: number) => void;
}) {
    if (!photos?.length) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {photos.map((photo, index) => (
                <button
                    key={`${photo}-${index}`}
                    type="button"
                    onClick={() => onPhotoClick(index)}
                    className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 transition hover:border-stone-300"
                >
                    <img
                        src={photo}
                        alt=""
                        className="h-16 w-16 object-cover sm:h-20 sm:w-20"
                    />
                    <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                </button>
            ))}
        </div>
    );
}

export function RestaurantReviewsTab({ restaurant }: { restaurant: any }) {
    const { data: session } = useSession();
    const router = useRouter();
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [localReviews, setLocalReviews] = useState<any[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyDrafts, setReplyDrafts] = useState<Record<string, ReplyDraft>>({});
    const [replyLoadingId, setReplyLoadingId] = useState<string | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxSlides, setLightboxSlides] = useState<{ src: string }[]>([]);

    useEffect(() => {
        let cancelled = false;
        setReviewsLoading(true);
        fetch(`/api/reviews?restaurantId=${restaurant._id}`)
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled && data.reviews) setLocalReviews(data.reviews);
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setReviewsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [restaurant._id]);

    const handleReviewSubmitted = async () => {
        try {
            const res = await fetch(`/api/reviews?restaurantId=${restaurant._id}`);
            const data = await res.json();
            if (data.reviews) setLocalReviews(data.reviews);
        } catch {
            // Ignore silent refresh failures in UI.
        }
        router.refresh();
    };

    const getReplyDraft = (reviewId: string): ReplyDraft =>
        replyDrafts[reviewId] || { text: "", guestName: "", guestEmail: "", error: "" };

    const patchReplyDraft = (reviewId: string, patch: Partial<ReplyDraft>) => {
        setReplyDrafts((prev) => ({
            ...prev,
            [reviewId]: {
                ...(prev[reviewId] || { text: "", guestName: "", guestEmail: "", error: "" }),
                ...patch,
            },
        }));
    };

    const handleReply = async (reviewId: string) => {
        const draft = getReplyDraft(reviewId);
        const replyError = validateReviewMessage(draft.text, "Reply", 2, 1000);
        if (replyError) {
            patchReplyDraft(reviewId, { error: replyError });
            return;
        }

        if (!session?.user) {
            const guestNameError = validateDisplayName(draft.guestName);
            if (guestNameError) {
                patchReplyDraft(reviewId, { error: guestNameError });
                return;
            }
            if (!draft.guestEmail || !/\S+@\S+\.\S+/.test(draft.guestEmail)) {
                patchReplyDraft(reviewId, { error: "Please enter a valid email address." });
                return;
            }
        }

        setReplyLoadingId(reviewId);
        patchReplyDraft(reviewId, { error: "" });

        try {
            const res = await fetch(`/api/reviews/${reviewId}/reply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: draft.text.trim(),
                    guestName: session?.user ? undefined : draft.guestName.trim(),
                    guestEmail: session?.user ? undefined : draft.guestEmail?.trim(),
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                patchReplyDraft(reviewId, { error: data.error || "Failed to post reply." });
                return;
            }

            setReplyDrafts((prev) => ({
                ...prev,
                [reviewId]: { text: "", guestName: "", guestEmail: "", error: "" },
            }));
            setReplyingTo(null);
            await handleReviewSubmitted();
        } catch {
            patchReplyDraft(reviewId, { error: "Network error. Please try again." });
        } finally {
            setReplyLoadingId(null);
        }
    };

    const openReviewLightbox = (photos: string[], index: number) => {
        setLightboxSlides(photos.map((photo) => ({ src: photo })));
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-black text-stone-900 mb-2 px-1 flex items-center gap-3">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                Customer Reviews for {restaurant.name}
            </h2>

            <div className="overflow-hidden rounded-[26px] border border-primary/10 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                <div className="bg-[radial-gradient(circle_at_top_left,_rgba(232, 50, 59,0.2),_transparent_42%),linear-gradient(135deg,#f4f9e8_0%,#ffffff_62%,#f0f8db_100%)] px-4 py-5 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1.5">
                            <h3 className="text-sm font-black tracking-tight text-stone-900 uppercase tracking-[0.1em]">Share your dining experience</h3>
                            <p className="max-w-md text-xs leading-relaxed text-stone-500">
                                {session?.user
                                    ? "Verified accounts can add review photos."
                                    : "Guests can still leave a review with their name. Photos are reserved for logged-in accounts only."}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowReviewModal(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-primary/20 transition hover:bg-primary-dark active:scale-[0.99]"
                        >
                            <Star className="h-4 w-4" />
                            Write Review
                        </button>
                    </div>
                </div>
            </div>

            {showReviewModal && (
                <ReviewModalInline
                    restaurantId={restaurant._id}
                    restaurantName={restaurant.name}
                    isOpen={showReviewModal}
                    onClose={() => setShowReviewModal(false)}
                    onSubmitted={handleReviewSubmitted}
                />
            )}

            {restaurant.averageRating > 0 && (
                <div className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center">
                        <div className="flex items-center gap-4 md:min-w-[220px] md:border-r md:border-stone-100 md:pr-8">
                            <div className="text-4xl font-black tracking-tight text-stone-900">{restaurant.averageRating?.toFixed(1)}</div>
                            <div>
                                <div className="mb-1 flex gap-0.5">
                                    {Array.from({ length: 5 }, (_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-3.5 w-3.5 ${i < Math.round(restaurant.averageRating) ? "fill-yellow-400 text-yellow-400" : "text-stone-200"}`}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs font-medium text-stone-500">{restaurant.totalReviews || 0} reviews</p>
                            </div>
                        </div>

                        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
                            {[
                                { label: "Food", value: restaurant.avgFoodRating, icon: UtensilsCrossed },
                                { label: "Ambiance", value: restaurant.avgAmbianceRating, icon: Sparkles },
                                { label: "Service", value: restaurant.avgServiceRating, icon: Heart },
                            ].map((item) => (
                                <div key={item.label} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5 font-medium text-stone-600">
                                            <item.icon className="h-3 w-3 text-stone-400" />
                                            {item.label}
                                        </span>
                                        <span className="font-bold text-stone-900">{item.value?.toFixed(1)}</span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                                        <div
                                            className="h-full rounded-full bg-yellow-400"
                                            style={{ width: `${((item.value || 0) / 5) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {localReviews.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-stone-200 bg-white px-6 py-10 text-center">
                    <Star className="mx-auto mb-3 h-10 w-10 text-stone-300" />
                    <p className="text-sm font-semibold text-stone-500">No reviews yet. Be the first to leave one.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {localReviews.map((review: any) => {
                        const draft = getReplyDraft(review._id);
                        return (
                            <div key={review._id} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex items-start gap-3">
                                        {review.userId?.username ? (
                                            <Link href={`/profile/${review.userId.username}`} className="shrink-0 transition-opacity hover:opacity-80">
                                                <Avatar
                                                    user={review.userId}
                                                    guestName={review.guestName}
                                                    isVerified={review.isVerified}
                                                    isVerifiedDiner={review.isVerifiedDiner}
                                                />
                                            </Link>
                                        ) : (
                                            <Avatar
                                                user={review.userId}
                                                guestName={review.guestName}
                                                isVerified={review.isVerified}
                                                isVerifiedDiner={review.isVerifiedDiner}
                                            />
                                        )}
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {review.userId?.username ? (
                                                    <Link href={`/profile/${review.userId.username}`} className="group">
                                                        <p className="text-sm font-black text-stone-900 transition-colors group-hover:text-primary">
                                                            {review.userId?.name || "Anonymous"}
                                                        </p>
                                                    </Link>
                                                ) : (
                                                    <p className="text-sm font-black text-stone-900">
                                                        {review.userId?.name || review.guestName || "Anonymous"}
                                                    </p>
                                                )}
                                                {review.isVerified && (
                                                    <span className="flex items-center justify-center rounded-full bg-emerald-50 h-5 w-5">
                                                        <Check className="h-3 w-3 text-emerald-600" />
                                                    </span>
                                                )}
                                                {review.isVerifiedDiner && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary-dark">
                                                        <Crown className="h-3 w-3" />
                                                        Dined Here
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-[11px] font-medium text-stone-400">{formatReviewDate(review.createdAt)}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 5 }, (_, i) => (
                                            <Star
                                                key={i}
                                                className={`h-3.5 w-3.5 ${i < Math.round(review.overallRating || 0) ? "fill-yellow-400 text-yellow-400" : "text-stone-200"}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 space-y-3">
                                    <p className="whitespace-pre-line break-words text-sm leading-6 text-stone-700">{review.text}</p>
                                    <ReviewPhotoGrid
                                        photos={review.photos || []}
                                        onPhotoClick={(index) => openReviewLightbox(review.photos || [], index)}
                                    />
                                </div>

                                {review.ownerReply && (
                                    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
                                        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                                            <UtensilsCrossed className="h-3.5 w-3.5" />
                                            Restaurant Reply
                                        </p>
                                        <p className="whitespace-pre-line break-words text-sm leading-6 text-blue-900">{review.ownerReply}</p>
                                    </div>
                                )}

                                {review.replies?.length > 0 && (
                                    <div className="mt-4 space-y-2 border-l-2 border-stone-100 pl-4 sm:pl-5">
                                        {review.replies.map((reply: any, index: number) => (
                                            <div key={`${reply._id || reply.createdAt || index}`} className="flex gap-3">
                                                {reply.userId?.username ? (
                                                    <Link href={`/profile/${reply.userId.username}`} className="shrink-0 transition-opacity hover:opacity-80">
                                                        <Avatar user={reply.userId} guestName={reply.guestName} isVerified={reply.isVerified} size="w-8 h-8" />
                                                    </Link>
                                                ) : (
                                                    <Avatar user={reply.userId} guestName={reply.guestName} isVerified={reply.isVerified} size="w-8 h-8" />
                                                )}
                                                <div className="flex-1 rounded-2xl border border-stone-100 bg-stone-50 px-3.5 py-3">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {reply.userId?.username ? (
                                                            <Link href={`/profile/${reply.userId.username}`} className="group">
                                                                <p className="text-xs font-black text-stone-900 transition-colors group-hover:text-primary">
                                                                    {reply.userId?.name || "Anonymous"}
                                                                </p>
                                                            </Link>
                                                        ) : (
                                                            <p className="text-xs font-black text-stone-900">
                                                                {reply.userId?.name || reply.guestName || "Anonymous"}
                                                            </p>
                                                        )}
                                                        {reply.isVerified && (
                                                            <span className="flex items-center justify-center rounded-full bg-emerald-100 h-4 w-4">
                                                                <Check className="h-2.5 w-2.5 text-emerald-700" />
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-medium text-stone-400">{formatReviewDate(reply.createdAt)}</span>
                                                    </div>
                                                    <p className="mt-1 whitespace-pre-line break-words text-xs leading-5 text-stone-600">{reply.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4">
                                    <button
                                        onClick={() => setReplyingTo(replyingTo === review._id ? null : review._id)}
                                        className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-stone-500 transition hover:text-primary"
                                    >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        {replyingTo === review._id ? "Cancel Reply" : "Reply"}
                                    </button>

                                    {replyingTo === review._id && (
                                        <div className="mt-3 rounded-[22px] border border-stone-200 bg-stone-50 p-3.5 sm:ml-6 sm:p-4">
                                            <div className="mb-3 flex items-center gap-2">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-stone-500 shadow-sm">
                                                    <MessageCircle className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-700">Add a reply</p>
                                                </div>
                                            </div>

                                            {!session?.user && (
                                                <div className="mb-3 space-y-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">Your Name</label>
                                                        <input
                                                            value={draft.guestName}
                                                            onChange={(e) => patchReplyDraft(review._id, { guestName: e.target.value, error: "" })}
                                                            placeholder="Enter your name"
                                                            className="w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">Your Email</label>
                                                        <input
                                                            type="email"
                                                            value={draft.guestEmail || ""}
                                                            onChange={(e) => patchReplyDraft(review._id, { guestEmail: e.target.value, error: "" })}
                                                            placeholder="Enter your email"
                                                            className="w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-1.5">
                                                <textarea
                                                    value={draft.text}
                                                    onChange={(e) => patchReplyDraft(review._id, { text: e.target.value, error: "" })}
                                                    rows={3}
                                                    maxLength={1000}
                                                    placeholder="Write a helpful reply..."
                                                    className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                                                />
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-stone-400">{draft.text.trim().length}/1000</span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setReplyingTo(null)}
                                                            className="rounded-2xl border border-stone-200 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-stone-600 transition hover:bg-white"
                                                        >
                                                            Close
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReply(review._id)}
                                                            disabled={replyLoadingId === review._id}
                                                            className="rounded-2xl bg-primary px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {replyLoadingId === review._id ? "Sending..." : "Post Reply"}
                                                        </button>
                                                    </div>
                                                </div>
                                                {draft.error && (
                                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                                                        {draft.error}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={lightboxIndex}
                slides={lightboxSlides}
                plugins={[Counter, Zoom]}
                carousel={{ finite: lightboxSlides.length <= 1 }}
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

function ReviewModalInline({
    restaurantId,
    restaurantName,
    isOpen,
    onClose,
    onSubmitted,
}: {
    restaurantId: string;
    restaurantName: string;
    isOpen: boolean;
    onClose: () => void;
    onSubmitted?: () => void;
}) {
    const { data: session } = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [overallRating, setOverallRating] = useState(0);
    const [foodRating, setFoodRating] = useState(0);
    const [ambianceRating, setAmbianceRating] = useState(0);
    const [serviceRating, setServiceRating] = useState(0);
    const [text, setText] = useState("");
    const [guestName, setGuestName] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [photoDrafts, setPhotoDrafts] = useState<ReviewPhotoDraft[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const ratingLabels = ["", "Poor", "Below Average", "Average", "Good", "Excellent"];

    const clearPhotoDrafts = () => {
        setPhotoDrafts((current) => {
            current.forEach((item) => URL.revokeObjectURL(item.preview));
            return [];
        });
    };

    const handleClose = () => {
        clearPhotoDrafts();
        onClose();
    };

    if (!isOpen || !mounted) return null;

    const uploadReviewPhotos = async () => {
        const uploadedUrls: string[] = [];

        for (const draft of photoDrafts) {
            const formData = new FormData();
            formData.append("image", draft.file);
            formData.append("restaurantId", restaurantId);

            const res = await fetch("/api/reviews/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || "Failed to upload one of the review photos.");
            }

            const url = data?.data?.url || data?.url;
            if (url) uploadedUrls.push(url);
        }

        return uploadedUrls;
    };

    const handlePhotoSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;

        if (!session?.user) {
            setError("Only logged-in users can upload review photos.");
            event.target.value = "";
            return;
        }

        const remainingSlots = MAX_REVIEW_PHOTOS - photoDrafts.length;
        if (remainingSlots <= 0) {
            setError(`You can upload up to ${MAX_REVIEW_PHOTOS} photos.`);
            event.target.value = "";
            return;
        }

        const nextDrafts: ReviewPhotoDraft[] = [];
        for (const file of files.slice(0, remainingSlots)) {
            if (!file.type.startsWith("image/")) {
                setError("Only image files are allowed.");
                continue;
            }
            if (file.size > MAX_REVIEW_PHOTO_BYTES) {
                setError("Each image must be under 5MB.");
                continue;
            }
            nextDrafts.push({
                key: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
                file,
                preview: URL.createObjectURL(file),
            });
        }

        if (nextDrafts.length > 0) {
            setError("");
            setPhotoDrafts((current) => [...current, ...nextDrafts].slice(0, MAX_REVIEW_PHOTOS));
        }

        event.target.value = "";
    };

    const removePhotoDraft = (key: string) => {
        setPhotoDrafts((current) => {
            const draft = current.find((item) => item.key === key);
            if (draft) URL.revokeObjectURL(draft.preview);
            return current.filter((item) => item.key !== key);
        });
    };

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError("");

        if (!session?.user) {
            const guestNameError = validateDisplayName(guestName);
            if (guestNameError) {
                setError(guestNameError);
                return;
            }
            if (!guestEmail || !/\S+@\S+\.\S+/.test(guestEmail)) {
                setError("Please enter a valid email address.");
                return;
            }
        }

        if (overallRating === 0) {
            setError("Please select an overall rating.");
            return;
        }

        const reviewError = validateReviewMessage(text, "Review", 10, 2000);
        if (reviewError) {
            setError(reviewError);
            return;
        }

        setLoading(true);
        try {
            const uploadedPhotos = session?.user ? await uploadReviewPhotos() : [];

            const res = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    restaurantId,
                    overallRating,
                    foodRating: foodRating || overallRating,
                    ambianceRating: ambianceRating || overallRating,
                    serviceRating: serviceRating || overallRating,
                    text: text.trim(),
                    photos: uploadedPhotos,
                    guestName: session?.user ? undefined : guestName.trim(),
                    guestEmail: session?.user ? undefined : guestEmail.trim(),
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || "Failed to submit review.");
                return;
            }

            setSuccess(true);
            clearPhotoDrafts();
            setTimeout(() => {
                onClose();
                onSubmitted?.();
            }, 1600);
        } catch (submitError: any) {
            setError(submitError?.message || "Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    function RatingRow({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
        return (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-bold text-stone-700">{label}</span>
                <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((score) => (
                        <button key={score} type="button" onClick={() => onChange(score)} className="transition hover:scale-110">
                            <Star
                                className={`h-6 w-6 ${score <= value ? "fill-yellow-400 text-yellow-400" : "text-stone-200 hover:text-yellow-200"}`}
                            />
                        </button>
                    ))}
                    <span className="min-w-[76px] text-right text-xs font-medium text-stone-400">{ratingLabels[value] || ""}</span>
                </div>
            </div>
        );
    }

    return createPortal(
        <>
            {/* Keyframes for modal entrance */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes rmSlideUp {
                    from { opacity: 0; transform: translateY(40px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes rmFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes rmCheckBounce {
                    0%   { transform: scale(0); }
                    60%  { transform: scale(1.15); }
                    100% { transform: scale(1); }
                }
            `}} />

            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[3px]"
                style={{ animation: "rmFadeIn 0.25s ease" }}
                onClick={handleClose}
            />

            {/* Modal — bottom-sheet on mobile, centered on desktop */}
            <div
                className="fixed inset-x-0 bottom-0 z-50 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2"
                style={{ animation: "rmSlideUp 0.35s cubic-bezier(0.22,1,0.36,1)" }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex max-h-[88vh] flex-col overflow-hidden rounded-t-[22px] border border-white/60 bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.15)] sm:max-h-[82vh] sm:rounded-[22px] sm:shadow-[0_20px_60px_rgba(0,0,0,0.2)]">

                    {/* Header — compact */}
                    <div className="flex shrink-0 items-center justify-between border-b border-stone-100 bg-white px-4 py-3">
                        <div className="min-w-0">
                            <h2 className="truncate text-sm font-black tracking-tight text-stone-900">Write a Review</h2>
                            <p className="truncate text-[11px] text-stone-400">{restaurantName}</p>
                        </div>
                        <button onClick={handleClose} className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {success ? (
                        /* ── Success State ── */
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10">
                            <div
                                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50"
                                style={{ animation: "rmCheckBounce 0.5s cubic-bezier(0.22,1,0.36,1)" }}
                            >
                                <Check className="h-7 w-7 text-emerald-500" />
                            </div>
                            <h3 className="text-base font-black text-stone-900">Review Submitted!</h3>
                            <p className="text-[12px] text-stone-400">Your feedback is now live for other diners.</p>
                        </div>
                    ) : (
                        /* ── Form ── */
                        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                            {/* Scrollable content */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

                                {/* Error */}
                                {error && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">
                                        {error}
                                    </div>
                                )}

                                {/* Guest Information (non-logged-in) */}
                                {!session?.user && (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Your Name</label>
                                            <input
                                                value={guestName}
                                                onChange={(event) => { setGuestName(event.target.value); setError(""); }}
                                                placeholder="Enter your name"
                                                className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-[13px] outline-none transition focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Your Email</label>
                                            <input
                                                type="email"
                                                value={guestEmail}
                                                onChange={(event) => { setGuestEmail(event.target.value); setError(""); }}
                                                placeholder="Enter your email"
                                                className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-[13px] outline-none transition focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Logged-in user badge */}
                                {session?.user && (
                                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
                                        {(session.user as any).avatar || session.user.image ? (
                                            <img src={(session.user as any).avatar || session.user.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-200 text-xs font-black text-emerald-800">
                                                {(session.user.name || "U").charAt(0)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="flex items-center gap-1 text-[12px] font-bold text-emerald-800">
                                                {session.user.name}
                                                <Check className="h-3 w-3 text-emerald-600" />
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Ratings — compact grid */}
                                <div className="space-y-2.5 rounded-xl border border-stone-100 bg-stone-50/50 p-3">
                                    <RatingRow value={overallRating} onChange={setOverallRating} label="Overall" />
                                    <div className="border-t border-stone-200/60 pt-2.5 space-y-2.5">
                                        <RatingRow value={foodRating} onChange={setFoodRating} label="Food" />
                                        <RatingRow value={ambianceRating} onChange={setAmbianceRating} label="Ambiance" />
                                        <RatingRow value={serviceRating} onChange={setServiceRating} label="Service" />
                                    </div>
                                </div>

                                {/* Text area — compact */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Your Experience</label>
                                        <span className="text-[10px] text-stone-300">{text.length}/2000</span>
                                    </div>
                                    <textarea
                                        value={text}
                                        onChange={(event) => { setText(event.target.value); setError(""); }}
                                        rows={3}
                                        maxLength={2000}
                                        placeholder="Tell other diners about the food, service, and vibe..."
                                        className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-[13px] leading-relaxed outline-none transition focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20"
                                    />
                                </div>

                                {/* Photos — compact */}
                                <div className="rounded-xl border border-stone-100 bg-white p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                                            {session?.user ? `Photos (${photoDrafts.length}/${MAX_REVIEW_PHOTOS})` : "Photos"}
                                        </p>
                                        {session?.user && (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 transition hover:border-primary hover:text-primary"
                                            >
                                                <Upload className="mr-1 inline h-3 w-3" />
                                                Add
                                            </button>
                                        )}
                                    </div>

                                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelection} />

                                    {session?.user ? (
                                        photoDrafts.length > 0 ? (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {photoDrafts.map((draft) => (
                                                    <div key={draft.key} className="group relative overflow-hidden rounded-lg border border-stone-200">
                                                        <img src={draft.preview} alt="" className="h-16 w-16 object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removePhotoDraft(draft.key)}
                                                            className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="mt-2 rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-3 text-center">
                                                <ImageIcon className="mx-auto mb-1 h-4 w-4 text-stone-300" />
                                                <p className="text-[10px] text-stone-400">No photos yet</p>
                                            </div>
                                        )
                                    ) : (
                                        <p className="mt-2 text-[11px] text-stone-400">Sign in to attach photos.</p>
                                    )}
                                </div>
                            </div>

                            {/* Fixed bottom action bar */}
                            <div className="shrink-0 border-t border-stone-100 bg-white px-4 py-3">
                                <button
                                    type="submit"
                                    disabled={loading || overallRating === 0}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                                >
                                    {loading ? <AlertCircle className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
                                    {loading ? "Submitting..." : "Submit Review"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
}


