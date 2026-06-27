"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Image as ImageIcon, Search, Trash2, Copy, Upload, Loader2,
    CheckCircle, X, Film, ExternalLink, Type, RefreshCw, AlertCircle,
    FileText, Calendar, HardDrive, Maximize2
} from "lucide-react";

interface MediaItem {
    _id: string;
    url: string;
    thumbUrl: string | null;
    filename: string;
    originalFilename: string | null;
    altText: string;
    altTextStatus: "pending" | "generated" | "failed";
    type: "image" | "video";
    format: string | null;
    width: number | null;
    height: number | null;
    sizeBytes: number | null;
    createdAt: string;
}

function formatBytes(bytes: number | null) {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
}

function formatDate(iso: string) {
    try {
        return new Date(iso).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
        });
    } catch {
        return "—";
    }
}

export default function MediaLibraryPage() {
    const [items, setItems] = useState<MediaItem[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState("");
    const [searchDebounce, setSearchDebounce] = useState("");
    const [selected, setSelected] = useState<MediaItem | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setSearchDebounce(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    const fetchMedia = useCallback(async (pageNum: number, isLoadMore = false) => {
        try {
            if (isLoadMore) setLoadingMore(true);
            else setLoading(true);

            const params = new URLSearchParams({ page: String(pageNum), limit: "40" });
            if (searchDebounce) params.set("search", searchDebounce);

            const res = await fetch(`/api/media?${params}`);
            const json = await res.json();

            if (json.success && json.data) {
                const newItems = json.data.items || json.data.files || [];
                if (isLoadMore) {
                    setItems(prev => [...prev, ...newItems]);
                } else {
                    setItems(newItems);
                }
                setTotal(json.data.total || newItems.length);
                setHasMore(json.data.hasMore ?? false);
            }
        } catch (err) {
            console.error("Failed to fetch media:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [searchDebounce]);

    useEffect(() => {
        setPage(1);
        fetchMedia(1);
    }, [fetchMedia]);

    const loadMore = () => {
        const next = page + 1;
        setPage(next);
        fetchMedia(next, true);
    };

    const handleUpload = async (files: FileList) => {
        setUploading(true);
        setUploadSuccess(null);
        try {
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append("image", file);
                formData.append("context", "admin-media-library");
                const res = await fetch("/api/upload", { method: "POST", body: formData });
                if (!res.ok) throw new Error("Upload failed");
            }
            setUploadSuccess(`${files.length} file(s) uploaded successfully!`);
            setTimeout(() => setUploadSuccess(null), 4000);
            // Refresh list
            setPage(1);
            fetchMedia(1);
        } catch (err) {
            alert("Upload failed. Please try again.");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const handleDelete = async (item: MediaItem) => {
        if (!confirm(`Delete "${item.filename}"? This cannot be undone.`)) return;
        setDeleting(item._id);
        try {
            const res = await fetch(`/api/media/${item._id}`, { method: "DELETE" });
            if (res.ok) {
                setItems(prev => prev.filter(i => i._id !== item._id));
                setTotal(prev => prev - 1);
                if (selected?._id === item._id) setSelected(null);
            } else {
                alert("Failed to delete. Please try again.");
            }
        } catch {
            alert("Delete failed.");
        } finally {
            setDeleting(null);
        }
    };

    const copyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopied(url);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleRegenerateAlt = async (item: MediaItem) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            await fetch(`${apiUrl}/api/v1/media/${item._id}/regenerate-alt`, { method: "POST" });
            alert("ALT text regeneration started. Refresh in a few seconds.");
        } catch {
            alert("Failed to regenerate ALT text.");
        }
    };

    return (
        <div className="space-y-6">
            {/* ═══ HEADER ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" /> Media Library
                    </h1>
                    <p className="text-[12px] text-gray-400 font-medium mt-0.5">
                        {total} total files — All uploads with AI-generated SEO alt text
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setPage(1); fetchMedia(1); }}
                        className="p-2 border rounded-xl hover:bg-gray-50 transition"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4 text-gray-500" />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden"
                        onChange={e => e.target.files && handleUpload(e.target.files)} />
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="text-white px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                        style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? "Uploading..." : "Upload Files"}
                    </button>
                </div>
            </div>

            {/* ═══ SUCCESS MESSAGE ═══ */}
            {uploadSuccess && (
                <div className="flex items-center gap-2 text-[13px] font-bold px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle className="w-4 h-4" /> {uploadSuccess}
                </div>
            )}

            {/* ═══ SEARCH BAR ═══ */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by filename, alt text..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition"
                />
                {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                )}
            </div>

            {/* ═══ CONTENT AREA ═══ */}
            <div className="flex gap-6">
                {/* ─── GRID ─── */}
                <div className={`flex-1 ${selected ? "hidden md:block" : ""}`}>
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-bold text-gray-500">No media found</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {search ? "Try a different search term" : "Upload your first image to get started"}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                                {items.map(item => (
                                    <div
                                        key={item._id || item.filename}
                                        onClick={() => setSelected(item)}
                                        className={`group relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all hover:shadow-md ${
                                            selected?._id === item._id
                                                ? "ring-2 ring-primary border-primary shadow-md"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        {item.type === "video" ? (
                                            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                                <Film className="w-8 h-8 text-white/60" />
                                            </div>
                                        ) : (
                                            <img
                                                src={item.thumbUrl || item.url}
                                                alt={item.altText || item.filename}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        )}
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
                                        </div>
                                        {/* ALT badge */}
                                        {item.altTextStatus === "generated" && (
                                            <span className="absolute top-1 left-1 bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase">ALT</span>
                                        )}
                                        {item.altTextStatus === "pending" && (
                                            <span className="absolute top-1 left-1 bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase">...</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Load More */}
                            {hasMore && (
                                <div className="flex justify-center mt-6">
                                    <button
                                        onClick={loadMore}
                                        disabled={loadingMore}
                                        className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        {loadingMore ? "Loading..." : "Load More"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ─── DETAIL SIDEBAR ─── */}
                {selected && (
                    <div className="w-full md:w-[360px] shrink-0 bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-4 self-start"
                        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                            <h3 className="font-bold text-[13px] text-gray-900">File Details</h3>
                            <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Preview */}
                        <div className="p-4 border-b border-gray-50">
                            {selected.type === "video" ? (
                                <video src={selected.url} className="w-full rounded-xl border" controls preload="metadata" />
                            ) : (
                                <img src={selected.url} alt={selected.altText || selected.filename} className="w-full rounded-xl border" />
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-4 space-y-3">
                            {/* Filename */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> Filename
                                </label>
                                <p className="text-[12px] text-gray-700 font-medium mt-0.5 break-all">{selected.filename}</p>
                            </div>

                            {/* ALT Text */}
                            {selected.type !== "video" && (
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                        <Type className="w-3 h-3" /> AI Alt Text
                                        {selected.altTextStatus === "generated" && (
                                            <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.5 rounded-full font-bold ml-1">✓ Generated</span>
                                        )}
                                        {selected.altTextStatus === "pending" && (
                                            <span className="bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 rounded-full font-bold ml-1 flex items-center gap-0.5">
                                                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Generating...
                                            </span>
                                        )}
                                        {selected.altTextStatus === "failed" && (
                                            <span className="bg-red-100 text-red-700 text-[8px] px-1.5 py-0.5 rounded-full font-bold ml-1 flex items-center gap-0.5">
                                                <AlertCircle className="w-2.5 h-2.5" /> Failed
                                            </span>
                                        )}
                                    </label>
                                    <p className="text-[12px] text-gray-600 mt-0.5 leading-relaxed">
                                        {selected.altText || <span className="text-gray-300 italic">Not generated yet</span>}
                                    </p>
                                    {(selected.altTextStatus === "failed" || selected.altTextStatus === "pending") && (
                                        <button
                                            onClick={() => handleRegenerateAlt(selected)}
                                            className="mt-1 text-[10px] text-primary font-bold flex items-center gap-1 hover:underline"
                                        >
                                            <RefreshCw className="w-3 h-3" /> Regenerate
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Dimensions */}
                            <div className="grid grid-cols-2 gap-3">
                                {selected.width && selected.height && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dimensions</label>
                                        <p className="text-[12px] text-gray-700 font-medium mt-0.5">{selected.width} × {selected.height}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                        <HardDrive className="w-3 h-3" /> Size
                                    </label>
                                    <p className="text-[12px] text-gray-700 font-medium mt-0.5">{formatBytes(selected.sizeBytes)}</p>
                                </div>
                            </div>

                            {/* Date */}
                            {selected.createdAt && (
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Uploaded
                                    </label>
                                    <p className="text-[12px] text-gray-700 font-medium mt-0.5">{formatDate(selected.createdAt)}</p>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-gray-50 space-y-2">
                            <button
                                onClick={() => copyUrl(selected.url)}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-[0.98] ${
                                    copied === selected.url
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                {copied === selected.url ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied === selected.url ? "Copied!" : "Copy URL"}
                            </button>
                            <a
                                href={selected.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all active:scale-[0.98]"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                            </a>
                            <button
                                onClick={() => handleDelete(selected)}
                                disabled={deleting === selected._id}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {deleting === selected._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                {deleting === selected._id ? "Deleting..." : "Delete File"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
