"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Star, Pencil, Trash2, ChevronLeft, ChevronRight, MessageSquare, Building2, User, Mail, ShieldAlert, ShieldCheck } from "lucide-react";

interface RestaurantReview {
    _id: string;
    restaurantId: {
        _id: string;
        name: string;
        area?: { name: string };
        city?: { name: string };
    };
    userId?: {
        name: string;
        email: string;
        phone: string;
    };
    guestName?: string;
    guestEmail?: string;
    text: string;
    createdAt: string;
    isEdited?: boolean;
    isVisible: boolean;
    overallRating: number;
}

export default function RestaurantReviewsAdmin() {
    const [reviews, setReviews] = useState<RestaurantReview[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const limit = 20;

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editRating, setEditRating] = useState(5);
    const [editText, setEditText] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        try {
            // Correct admin-reviews route is /api/admin/reviews (session-authed
            // proxy). The old /api/v1/reviews/admin path hit the Next server,
            // which has no /api/v1/* routes, so every call 404'd.
            const res = await fetch(`/api/admin/reviews?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}`);
            const data = await res.json();
            setReviews(data.reviews || data.data?.reviews || []);
            setTotal(data.total || data.pagination?.total || 0);
        } catch {
            setReviews([]);
        }
        setLoading(false);
    }, [page, debouncedSearch]);

    useEffect(() => { fetchReviews(); }, [fetchReviews]);

    const totalPages = Math.ceil(total / limit);

    const startEdit = (r: RestaurantReview) => {
        setEditingId(r._id);
        setEditRating(r.overallRating);
        setEditText(r.text || "");
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await fetch(`/api/admin/reviews/${editingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ overallRating: editRating, text: editText }),
            });
            setEditingId(null);
            fetchReviews();
        } catch {}
    };

    const toggleStatus = async (r: RestaurantReview) => {
        try {
            await fetch(`/api/admin/reviews/${r._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isVisible: !r.isVisible }),
            });
            fetchReviews();
        } catch {}
    };

    const deleteReview = async (id: string) => {
        if (!confirm("Are you sure you want to permanently delete this review? This will recalculate the restaurant's average rating.")) return;
        try {
            await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
            fetchReviews();
        } catch {}
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Star className="w-6 h-6 text-indigo-500 fill-indigo-500" /> Restaurant Reviews
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">{total} total reviews on restaurants</p>
                </div>
                <div className="w-full md:w-72">
                    <input 
                        type="search" 
                        placeholder="Search by restaurant or reviewer..." 
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Reviews Table */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500 w-[200px]">Restaurant</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500 w-[180px]">Reviewer</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500 w-[120px]">Rating</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Review Text</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500 w-[100px]">Date</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500 w-[100px]">Status</th>
                                <th className="p-3 w-[120px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">Loading reviews...</td></tr>
                            ) : reviews.length === 0 ? (
                                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No reviews found.</td></tr>
                            ) : reviews.map(r => (
                                <tr key={r._id} className="hover:bg-muted/20 transition-colors">
                                    <td className="p-3">
                                        <div className="flex items-start gap-2">
                                            <div className="bg-indigo-50 p-1.5 rounded-lg flex-shrink-0 mt-0.5"><Building2 className="w-3.5 h-3.5 text-indigo-600" /></div>
                                            <div>
                                                <p className="font-bold text-gray-900">{r.restaurantId?.name || "Unknown Restaurant"}</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">{r.restaurantId?.area?.name}, {r.restaurantId?.city?.name}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex flex-col gap-1 text-xs">
                                            <div className="flex items-center gap-1 font-bold text-gray-900">
                                                <User className="w-3 h-3 text-gray-400" /> 
                                                <span>{r.userId?.name || r.guestName || "Guest"}</span>
                                            </div>
                                            {(r.userId?.email || r.guestEmail) && (
                                                <div className="flex items-center gap-1 text-gray-500">
                                                    <Mail className="w-3 h-3" />
                                                    <span className="truncate max-w-[140px]">{r.userId?.email || r.guestEmail}</span>
                                                </div>
                                            )}
                                            {r.userId && (
                                                <span className="mt-1 inline-flex w-max items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-700">Verified User</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        {editingId === r._id ? (
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <button key={s} onClick={() => setEditRating(s)} className="text-lg cursor-pointer hover:scale-110 transition-transform">
                                                        <Star className={`w-4 h-4 ${s <= editRating ? "text-yellow-500 fill-yellow-500" : "text-gray-200"}`} />
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} className={`w-3.5 h-3.5 ${s <= r.overallRating ? "text-yellow-500 fill-yellow-500" : "text-gray-200"}`} />
                                                ))}
                                            </div>
                                        )}
                                        {r.isEdited && <div className="text-[9px] text-gray-400 mt-1 italic">Admin Edited</div>}
                                    </td>
                                    <td className="p-3">
                                        {editingId === r._id ? (
                                            <textarea 
                                                value={editText} 
                                                onChange={e => setEditText(e.target.value)} 
                                                className="w-full border rounded-lg px-2 py-2 text-xs min-h-[60px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                placeholder="Review text..."
                                            />
                                        ) : r.text ? (
                                            <div className="text-xs text-gray-700 max-w-[300px] whitespace-pre-wrap flex items-start gap-1.5">
                                                <MessageSquare className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />
                                                <span className="line-clamp-3" title={r.text}>{r.text}</span>
                                            </div>
                                        ) : <span className="text-gray-300 text-xs italic">No text provided</span>}
                                    </td>
                                    <td className="p-3 text-xs text-gray-500">
                                        {new Date(r.createdAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                                    </td>
                                    <td className="p-3">
                                        <button 
                                            onClick={() => toggleStatus(r)}
                                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold transition-colors border ${
                                                r.isVisible 
                                                    ? "bg-green-50 text-green-700 border-green-100 hover:bg-green-100" 
                                                    : "bg-red-50 text-red-700 border-red-100 hover:bg-red-100"
                                            }`}
                                        >
                                            {r.isVisible ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                                            {r.isVisible ? "Visible" : "Hidden"}
                                        </button>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex gap-1.5">
                                            {editingId === r._id ? (
                                                <div className="flex flex-col gap-1 w-full">
                                                    <button onClick={saveEdit} className="bg-indigo-600 text-white px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition">Save</button>
                                                    <button onClick={() => setEditingId(null)} className="border px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 transition">Cancel</button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-1">
                                                    <button onClick={() => startEdit(r)} className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-100 transition" title="Edit Review"><Pencil className="w-4 h-4" /></button>
                                                    <button onClick={() => deleteReview(r._id)} className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-100 transition" title="Permanently Delete"><Trash2 className="w-4 h-4" /></button>
                                                </div>
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
