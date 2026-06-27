"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Star, Pencil, Trash2, ChevronLeft, ChevronRight, Phone, MessageSquare, Shield } from "lucide-react";

const EMOJIS = ["😡", "😕", "😐", "🙂", "😍"];
const LABELS = ["Terrible", "Bad", "Okay", "Good", "Amazing"];

interface SiteReview {
    _id: string;
    rating: number;
    phone: string;
    message: string;
    ip: string;
    isEdited: boolean;
    originalRating: number;
    createdAt: string;
}

export default function SiteReviewsAdmin() {
    const [reviews, setReviews] = useState<SiteReview[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const limit = 30;

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editRating, setEditRating] = useState(5);
    const [editMessage, setEditMessage] = useState("");

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/site-reviews?page=${page}&limit=${limit}`);
            const data = await res.json();
            setReviews(data.docs || []);
            setTotal(data.total || 0);
        } catch {
            setReviews([]);
        }
        setLoading(false);
    }, [page]);

    useEffect(() => { fetchReviews(); }, [fetchReviews]);

    const totalPages = Math.ceil(total / limit);

    const stats = useMemo(() => {
        if (reviews.length === 0) return { avg: 0, distribution: [0, 0, 0, 0, 0] };
        const dist = [0, 0, 0, 0, 0];
        let sum = 0;
        reviews.forEach(r => { sum += r.rating; dist[r.rating - 1]++; });
        return { avg: sum / reviews.length, distribution: dist };
    }, [reviews]);

    const startEdit = (r: SiteReview) => {
        setEditingId(r._id);
        setEditRating(r.rating);
        setEditMessage(r.message);
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await fetch(`/api/site-reviews/${editingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating: editRating, message: editMessage }),
            });
            setEditingId(null);
            fetchReviews();
        } catch { }
    };

    const deleteReview = async (id: string) => {
        if (!confirm("Delete this review permanently?")) return;
        try {
            await fetch(`/api/site-reviews/${id}`, { method: "DELETE" });
            fetchReviews();
        } catch { }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" /> Site Reviews
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">{total} total reviews from popup widget</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="bg-gradient-to-br from-yellow-50 to-primary/5 border border-yellow-100 rounded-xl p-4 col-span-2">
                    <p className="text-xs font-bold text-yellow-600 uppercase">Average Rating</p>
                    <p className="text-3xl font-black text-gray-900 mt-1">{stats.avg.toFixed(1)} <span className="text-lg">/ 5</span></p>
                    <div className="flex gap-0.5 mt-2">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-4 h-4 ${s <= Math.round(stats.avg) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                        ))}
                    </div>
                </div>
                {EMOJIS.map((e, i) => (
                    <div key={i} className="bg-white border rounded-xl p-3 text-center">
                        <span className="text-2xl">{e}</span>
                        <p className="text-lg font-black mt-1">{stats.distribution[i]}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{LABELS[i]}</p>
                    </div>
                ))}
            </div>

            {/* Reviews Table */}
            <div className="bg-card border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Emoji</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Rating</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Phone</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Message</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Date</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Status</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">Loading...</td></tr>
                            ) : reviews.length === 0 ? (
                                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No reviews yet. They will appear as users submit reviews via the popup.</td></tr>
                            ) : reviews.map(r => (
                                <tr key={r._id} className="hover:bg-muted/20 transition-colors">
                                    <td className="p-3 text-2xl">{EMOJIS[r.rating - 1] || "❓"}</td>
                                    <td className="p-3">
                                        {editingId === r._id ? (
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <button key={s} onClick={() => setEditRating(s)} className="text-xl cursor-pointer">
                                                        {s <= editRating ? EMOJIS[s - 1] : "⚪"}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-200"}`} />
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {r.phone ? (
                                            <span className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3 text-green-500" /> {r.phone}</span>
                                        ) : <span className="text-gray-300 text-xs">—</span>}
                                    </td>
                                    <td className="p-3 max-w-[200px]">
                                        {editingId === r._id ? (
                                            <input value={editMessage} onChange={e => setEditMessage(e.target.value)} className="w-full border rounded-lg px-2 py-1 text-xs" />
                                        ) : r.message ? (
                                            <p className="text-xs text-gray-600 truncate flex items-center gap-1"><MessageSquare className="w-3 h-3 flex-shrink-0" /> {r.message}</p>
                                        ) : <span className="text-gray-300 text-xs">No message</span>}
                                    </td>
                                    <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                    <td className="p-3">
                                        {r.isEdited ? (
                                            <span className="flex items-center gap-1 text-primary text-[10px] font-bold"><Shield className="w-3 h-3" /> Edited (was {r.originalRating}⭐)</span>
                                        ) : (
                                            <span className="text-green-600 text-[10px] font-bold">Original</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex gap-1.5">
                                            {editingId === r._id ? (
                                                <>
                                                    <button onClick={saveEdit} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-600 transition">Save</button>
                                                    <button onClick={() => setEditingId(null)} className="border px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 transition">Cancel</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(r)} className="bg-primary/10 text-primary p-2 rounded-lg hover:bg-primary/20 transition"><Pencil className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => deleteReview(r._id)} className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-100 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3">
                    <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-lg border hover:bg-muted/50 disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-sm font-bold">Page {page} of {totalPages}</span>
                    <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 rounded-lg border hover:bg-muted/50 disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    );
}
