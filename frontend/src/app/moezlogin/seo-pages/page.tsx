"use client";

import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from "react";
import {
    Search, RefreshCw, Save, X, Globe, MapPin,
    ChevronLeft, ChevronRight, Filter, CheckCircle, AlertCircle, Pencil,
    Image as ImageIcon, Upload, Clock, Trash2
} from "lucide-react";

const ReactQuill = lazy(() => import("react-quill-new"));
import "react-quill-new/dist/quill.snow.css";

interface SeoPage {
    _id: string;
    type: "city-category" | "city-area" | "area-category" | "city-deals" | "city-bank-deals";
    citySlug: string;
    cityName: string;
    areaSlug: string | null;
    areaName: string | null;
    categorySlug: string | null;
    categoryName: string | null;
    bankSlug: string | null;
    bankName: string | null;
    combinationSlug: string;
    title: string;
    metaDescription: string;
    content: string;
    featuredImage: string;
    isPublished: boolean;
    isCustomized: boolean;
    updatedAt: string;
}

const QUILL_MODULES = {
    toolbar: [
        [{ header: [2, 3, 4, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote"],
        ["link"],
        ["clean"],
    ],
};

export default function SeoAdminPage() {
    const [pages, setPages] = useState<SeoPage[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [touchingDates, setTouchingDates] = useState(false);
    const [saving, setSaving] = useState(false);

    const [filterType, setFilterType] = useState("");
    const [filterCity, setFilterCity] = useState("");
    const [searchQ, setSearchQ] = useState("");
    const [page, setPage] = useState(1);
    const limit = 25;

    // Edit modal
    const [editing, setEditing] = useState<SeoPage | null>(null);
    const [editForm, setEditForm] = useState({ title: "", metaDescription: "", content: "", featuredImage: "", isPublished: true });

    // Media library modal
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchPages = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams();
            if (filterType) qs.set("type", filterType);
            if (filterCity) qs.set("citySlug", filterCity);
            qs.set("page", page.toString());
            qs.set("limit", limit.toString());
            const res = await fetch(`/api/seo-pages?${qs.toString()}`);
            const data = await res.json();
            setPages(data.docs || []);
            setTotal(data.total || 0);
        } catch {
            setPages([]);
        }
        setLoading(false);
    }, [filterType, filterCity, page]);

    useEffect(() => { fetchPages(); }, [fetchPages]);

    const filteredPages = useMemo(() => {
        if (!searchQ.trim()) return pages;
        const q = searchQ.toLowerCase();
        return pages.filter(p =>
            p.cityName.toLowerCase().includes(q) ||
            (p.categoryName || "").toLowerCase().includes(q) ||
            (p.bankName || "").toLowerCase().includes(q) ||
            (p.areaName || "").toLowerCase().includes(q) ||
            p.combinationSlug.toLowerCase().includes(q)
        );
    }, [pages, searchQ]);

    const totalPages = Math.ceil(total / limit);

    const handleRegenerate = async () => {
        if (!confirm("Generate SEO pages for all missing combinations? Existing pages won't be overwritten.")) return;
        setRegenerating(true);
        try {
            await fetch("/api/seo-pages", { method: "POST" });
            fetchPages();
        } catch { }
        setRegenerating(false);
    };

    const handleBulkTouch = async () => {
        if (!confirm("Update dates (lastmod) on ALL SEO pages? This refreshes their sitemap timestamps.")) return;
        setTouchingDates(true);
        try {
            await fetch("/api/seo-pages", { method: "PUT" });
            fetchPages();
        } catch { }
        setTouchingDates(false);
    };

    const openEdit = (p: SeoPage) => {
        setEditing(p);
        setEditForm({
            title: p.title,
            metaDescription: p.metaDescription,
            content: p.content,
            featuredImage: p.featuredImage || "",
            isPublished: p.isPublished,
        });
    };

    const handleSave = async () => {
        if (!editing) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/seo-pages/${editing._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm),
            });
            if (res.ok) {
                setPages(pages.map(p => p._id === editing._id ? { ...p, ...editForm, isCustomized: true } : p));
                setEditing(null);
            }
        } catch { }
        setSaving(false);
    };

    // ── Media Library: Upload + Pick ──
    const handleImageUpload = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("image", file);
            formData.append("slug", `seo-${Date.now()}`);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (res.ok) {
                const data = await res.json();
                setEditForm(prev => ({ ...prev, featuredImage: data.url }));
                setShowMediaPicker(false);
            } else {
                alert("Upload failed. Please try again.");
            }
        } catch {
            alert("Upload failed. Please try again.");
        }
        setUploading(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
    };

    const uniqueCities = useMemo(() => {
        const map = new Map<string, string>();
        pages.forEach(p => map.set(p.citySlug, p.cityName));
        return Array.from(map.entries());
    }, [pages]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Globe className="w-6 h-6 text-primary" /> SEO Pages
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage auto-generated archive SEO pages including city-bank deals combos. {total} total combinations.
                    </p>
                </div>
                <div className="flex gap-2 self-start flex-wrap">
                    <button
                        onClick={handleBulkTouch}
                        disabled={touchingDates}
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        <Clock className={`w-4 h-4 ${touchingDates ? "animate-spin" : ""}`} />
                        {touchingDates ? "Updating..." : "Update All Dates"}
                    </button>
                    <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
                        {regenerating ? "Generating..." : "Regenerate Missing"}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search pages..." className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm" />
                </div>
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className="border rounded-xl px-3 py-2.5 text-sm bg-white">
                    <option value="">All Types</option>
                    <option value="city-category">City + Category</option>
                    <option value="city-area">City + Area</option>
                    <option value="area-category">Area + Category</option>
                    <option value="city-deals">City + Deals</option>
                    <option value="city-bank-deals">City + Bank Deals</option>
                </select>
                <select value={filterCity} onChange={e => { setFilterCity(e.target.value); setPage(1); }} className="border rounded-xl px-3 py-2.5 text-sm bg-white">
                    <option value="">All Cities</option>
                    {uniqueCities.map(([slug, name]) => (<option key={slug} value={slug}>{name}</option>))}
                </select>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Filter className="w-4 h-4" /> Showing {filteredPages.length} of {total}
                </div>
            </div>

            {/* Table */}
            <div className="bg-card border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Type</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">City</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Area</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Category/Bank</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">URL</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Image</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Status</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">Loading...</td></tr>
                            ) : filteredPages.length === 0 ? (
                                <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">No SEO pages found. Click &quot;Regenerate Missing&quot; to create them.</td></tr>
                            ) : filteredPages.map(p => (
                                <tr key={p._id} className="hover:bg-muted/20 transition-colors">
                                    <td className="p-3">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${p.type === "city-category" ? "bg-blue-50 text-blue-700" :
                                                p.type === "city-area" ? "bg-emerald-50 text-emerald-700" :
                                                    p.type === "area-category" ? "bg-purple-50 text-purple-700" :
                                                        p.type === "city-deals" ? "bg-primary/5 text-primary-dark" : "bg-rose-50 text-rose-700"
                                            }`}>
                                            {p.type === "city-category" ? "City+Cat" : p.type === "city-area" ? "City+Area" : p.type === "area-category" ? "Area+Cat" : p.type === "city-deals" ? "City+Deals" : "City+Bank"}
                                        </span>
                                    </td>
                                    <td className="p-3 font-medium">{p.cityName}</td>
                                    <td className="p-3">{p.areaName ? <span className="flex items-center gap-1 text-gray-600"><MapPin className="w-3 h-3" /> {p.areaName}</span> : <span className="text-gray-300">—</span>}</td>
                                    <td className="p-3 font-medium">{p.type === "city-bank-deals" ? (p.bankName || "�") : (p.categoryName || (p.type === "city-deals" ? "All Banks" : "�"))}</td>
                                    <td className="p-3"><code className="text-xs bg-gray-100 px-2 py-0.5 rounded">/{p.combinationSlug}</code></td>
                                    <td className="p-3">
                                        {p.featuredImage ? (
                                            <img src={p.featuredImage} alt="" className="w-10 h-10 rounded-lg object-cover border" />
                                        ) : (
                                            <span className="text-gray-300 text-xs">No image</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {p.isCustomized ? (
                                            <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><CheckCircle className="w-3.5 h-3.5" /> Edited</span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-primary text-xs font-bold"><AlertCircle className="w-3.5 h-3.5" /> Default</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <button onClick={() => openEdit(p)} className="bg-primary/10 text-primary p-2 rounded-lg hover:bg-primary/20 transition"><Pencil className="w-4 h-4" /></button>
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

            {/* ── Edit Modal ── */}
            {editing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl z-10">
                            <div>
                                <h2 className="font-bold text-lg">Edit SEO Page</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {editing.type === "city-category" ? "City + Category" : editing.type === "city-area" ? "City + Area" : editing.type === "area-category" ? "Area + Category" : editing.type === "city-deals" ? "City + Deals" : "City + Bank Deals"} — /{editing.combinationSlug}
                                </p>
                            </div>
                            <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Location info */}
                            <div className="bg-muted/50 rounded-xl p-4 grid grid-cols-3 gap-4 text-sm">
                                <div><span className="text-xs font-bold text-gray-400 uppercase">City</span><p className="font-medium">{editing.cityName}</p></div>
                                {editing.areaName && <div><span className="text-xs font-bold text-gray-400 uppercase">Area</span><p className="font-medium flex items-center gap-1"><MapPin className="w-3 h-3" /> {editing.areaName}</p></div>}
                                {editing.categoryName && <div><span className="text-xs font-bold text-gray-400 uppercase">Category</span><p className="font-medium">{editing.categoryName}</p></div>}
                                {editing.bankName && <div><span className="text-xs font-bold text-gray-400 uppercase">Bank</span><p className="font-medium">{editing.bankName}</p></div>}
                            </div>

                            {/* ── Featured Image (WordPress-style Media Library Picker) ── */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Featured Image
                                </label>
                                {editForm.featuredImage ? (
                                    <div className="relative group rounded-xl overflow-hidden border border-gray-200">
                                        <img src={editForm.featuredImage} alt="Featured" className="w-full h-48 object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => setShowMediaPicker(true)}
                                                className="bg-white text-gray-800 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-gray-100 transition"
                                            >
                                                <ImageIcon className="w-4 h-4" /> Change Image
                                            </button>
                                            <button
                                                onClick={() => setEditForm(prev => ({ ...prev, featuredImage: "" }))}
                                                className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-red-600 transition"
                                            >
                                                <Trash2 className="w-4 h-4" /> Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowMediaPicker(true)}
                                        className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                                    >
                                        <ImageIcon className="w-8 h-8 text-gray-400" />
                                        <span className="text-sm font-bold text-gray-500">Set Featured Image</span>
                                        <span className="text-[10px] text-gray-400">Upload or paste URL</span>
                                    </button>
                                )}
                            </div>

                            {/* SEO Title */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">SEO Title</label>
                                <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="w-full border rounded-xl px-4 py-2.5 text-sm" placeholder="Best [Category] in [City] — Foodies Pakistan" />
                                <p className="text-[10px] text-gray-400">{editForm.title.length}/70 characters</p>
                            </div>

                            {/* Meta Description */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Meta Description</label>
                                <textarea value={editForm.metaDescription} onChange={e => setEditForm({ ...editForm, metaDescription: e.target.value })} rows={3} className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none" placeholder="Discover the best..." />
                                <p className="text-[10px] text-gray-400">{editForm.metaDescription.length}/160 characters</p>
                            </div>

                            {/* Rich Content */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Page Content</label>
                                <div className="border rounded-xl overflow-hidden">
                                    <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading editor...</div>}>
                                        <ReactQuill theme="snow" value={editForm.content} onChange={(val: string) => setEditForm({ ...editForm, content: val })} modules={QUILL_MODULES} placeholder="Write SEO content..." />
                                    </Suspense>
                                </div>
                            </div>

                            {/* Published */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={editForm.isPublished} onChange={e => setEditForm({ ...editForm, isPublished: e.target.checked })} className="w-5 h-5 rounded border-gray-200 text-primary" />
                                <span className="text-sm font-bold">Published</span>
                            </label>
                        </div>

                        <div className="sticky bottom-0 bg-white border-t p-5 flex justify-end gap-3 rounded-b-2xl">
                            <button onClick={() => setEditing(null)} className="px-5 py-2.5 border rounded-xl text-sm font-bold hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition disabled:opacity-50 flex items-center gap-2">
                                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Media Library Picker Modal ── */}
            {showMediaPicker && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-lg">
                        <div className="border-b p-5 flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Media Library</h3>
                            <button onClick={() => setShowMediaPicker(false)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Upload new */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-36 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                            >
                                {uploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm font-bold text-gray-500">Uploading to CDN...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-gray-400" />
                                        <span className="text-sm font-bold text-gray-600">Upload from computer</span>
                                        <span className="text-[10px] text-gray-400">Auto-converts to optimized WebP</span>
                                    </>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

                            {/* Or paste URL */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-xs font-bold text-gray-400 uppercase">or paste URL</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>
                            <div className="flex gap-2">
                                <input
                                    id="pasteUrl"
                                    type="text"
                                    placeholder="https://cdn.foodiespakistan.pk/..."
                                    className="flex-1 border rounded-xl px-4 py-2.5 text-sm"
                                />
                                <button
                                    onClick={() => {
                                        const input = document.getElementById("pasteUrl") as HTMLInputElement;
                                        if (input.value.trim()) {
                                            setEditForm(prev => ({ ...prev, featuredImage: input.value.trim() }));
                                            setShowMediaPicker(false);
                                        }
                                    }}
                                    className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition"
                                >
                                    Use URL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}







