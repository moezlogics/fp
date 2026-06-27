"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
    X, Upload, Image as ImageIcon, Film, Youtube, Loader2,
    Check, Trash2, Grid, Plus, Search
} from "lucide-react";

type MediaItem = {
    url: string;
    thumbUrl?: string;
    type: "image" | "video" | "youtube";
    filename?: string;
};

type Tab = "upload" | "library" | "youtube";

interface ImageGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (items: MediaItem[]) => void;
    restaurantId: string;
    multiple?: boolean; // Allow selecting multiple items
    acceptVideo?: boolean; // Show video upload + YouTube tab
    existingMedia?: MediaItem[]; // Already uploaded media for this restaurant
}

export default function ImageGalleryModal({
    isOpen, onClose, onSelect, restaurantId,
    multiple = true, acceptVideo = true, existingMedia = []
}: ImageGalleryModalProps) {
    const [tab, setTab] = useState<Tab>("upload");
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [library, setLibrary] = useState<MediaItem[]>(existingMedia);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [error, setError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [libSearchTerm, setLibSearchTerm] = useState("");
    const [gridScale, setGridScale] = useState<"standard" | "compact">("standard");

    const [loadingLibrary, setLoadingLibrary] = useState(false);

    // Update library when existingMedia prop changes
    useEffect(() => {
        if (existingMedia.length > 0) {
            setLibrary(existingMedia);
        }
    }, [existingMedia]);

    // Fetch all files from /api/media to populate the library tab (WordPress-like library behaviour)
    useEffect(() => {
        if (tab === "library" && isOpen) {
            const fetchGlobalMedia = async () => {
                setLoadingLibrary(true);
                try {
                    const res = await fetch("/api/media?limit=100");
                    const json = await res.json();
                    if (json.success && json.data) {
                        const items = json.data.items || json.data.files || [];
                        const mappedItems: MediaItem[] = items.map((m: any) => ({
                            url: m.url,
                            thumbUrl: m.thumbUrl || undefined,
                            type: m.type || "image",
                            filename: m.filename,
                        }));
                        
                        // Merge with existingMedia ensuring no duplicates by URL
                        const merged = [...existingMedia];
                        const urls = new Set(merged.map(x => x.url));
                        mappedItems.forEach((m: any) => {
                            if (!urls.has(m.url)) {
                                merged.push(m);
                            }
                        });
                        setLibrary(merged);
                    }
                } catch (e) {
                    console.error("Failed to load global media library:", e);
                } finally {
                    setLoadingLibrary(false);
                }
            };
            fetchGlobalMedia();
        }
    }, [tab, isOpen, existingMedia]);

    // ── Upload handler (useCallback to satisfy hooks order) ──
    const handleUpload = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        setError("");
        setUploadProgress(0);

        const newMedia: MediaItem[] = [];
        const total = files.length;

        for (let i = 0; i < total; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append(file.type.startsWith("video") ? "media" : "image", file);
            formData.append("slug", restaurantId);

            try {
                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();
                if (res.ok && data.url) {
                    const item: MediaItem = {
                        url: data.url,
                        thumbUrl: data.thumbUrl || undefined,
                        type: data.type === "video" ? "video" : "image",
                        filename: data.fileName || file.name,
                    };
                    newMedia.push(item);
                }
            } catch (e) {
                console.error("Upload failed:", e);
            }
            setUploadProgress(Math.round(((i + 1) / total) * 100));
        }

        if (newMedia.length > 0) {
            setLibrary(prev => [...newMedia, ...prev]);
            // Auto-select newly uploaded items
            setSelected(prev => {
                const next = new Set(prev);
                newMedia.forEach(m => next.add(m.url));
                return next;
            });
            setTab("library");
        } else {
            setError("Upload failed. Please try again.");
        }

        setUploading(false);
        setUploadProgress(0);
    }, [restaurantId]);

    // ── Drag & Drop ──
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        handleUpload(e.dataTransfer.files);
    }, [handleUpload]);

    // ── Early return AFTER all hooks ──
    if (!isOpen) return null;

    // ── Toggle selection ──
    const toggleSelect = (url: string) => {
        const next = new Set(selected);
        if (next.has(url)) next.delete(url);
        else if (!multiple) { next.clear(); next.add(url); }
        else next.add(url);
        setSelected(next);
    };

    // ── YouTube embed ──
    const extractYoutubeId = (url: string): string | null => {
        const match = url.match(/(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    };

    const handleAddYoutube = () => {
        const id = extractYoutubeId(youtubeUrl);
        if (!id) { setError("Invalid YouTube URL"); return; }
        const item: MediaItem = {
            url: youtubeUrl,
            thumbUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
            type: "youtube",
            filename: `YouTube: ${id}`,
        };
        setLibrary(prev => [item, ...prev]);
        const next = new Set(selected);
        next.add(item.url);
        setSelected(next);
        setYoutubeUrl("");
        setError("");
        setTab("library");
    };

    // ── Insert Selected ──
    const handleInsert = () => {
        const items = library.filter(m => selected.has(m.url));
        onSelect(items);
        onClose();
    };

    // ── Delete from library (visual only) ──
    const handleDelete = (url: string) => {
        setLibrary(prev => prev.filter(m => m.url !== url));
        const next = new Set(selected);
        next.delete(url);
        setSelected(next);
    };

    const filteredLibrary = library.filter(m => {
        const matchesSearch = m.filename?.toLowerCase().includes(libSearchTerm.toLowerCase()) || 
                             m.url.toLowerCase().includes(libSearchTerm.toLowerCase());
        return matchesSearch;
    });

    const images = filteredLibrary.filter(m => m.type === "image");
    const videos = filteredLibrary.filter(m => m.type === "video" || m.type === "youtube");

    const selectAll = () => {
        const next = new Set(selected);
        filteredLibrary.forEach(m => next.add(m.url));
        setSelected(next);
    };

    const clearSelection = () => {
        setSelected(new Set());
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-lg font-black text-gray-900 tracking-tight">Media Gallery</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Tabs ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 pt-4 pb-2 shrink-0 border-b border-gray-50">
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
                        <button onClick={() => setTab("upload")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${tab === "upload" ? "bg-primary text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                            <Upload className="w-3.5 h-3.5" /> Upload
                        </button>
                        <button onClick={() => setTab("library")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${tab === "library" ? "bg-primary text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                            <Grid className="w-3.5 h-3.5" /> Library ({library.length})
                        </button>
                        {acceptVideo && (
                            <button onClick={() => setTab("youtube")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${tab === "youtube" ? "bg-red-500 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                                <Youtube className="w-3.5 h-3.5" /> YouTube
                            </button>
                        )}
                    </div>

                    {tab === "library" && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-48">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input 
                                    type="text"
                                    placeholder="Search library..."
                                    value={libSearchTerm}
                                    onChange={(e) => setLibSearchTerm(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-3 py-2 text-xs focus:bg-white outline-none transition"
                                />
                            </div>
                            <button 
                                onClick={() => setGridScale(s => s === "standard" ? "compact" : "standard")}
                                title={gridScale === "standard" ? "Switch to Compact View" : "Switch to Standard View"}
                                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition shrink-0"
                            >
                                <Grid className={`w-4 h-4 ${gridScale === "compact" ? "scale-75" : ""}`} />
                            </button>
                        </div>
                    )}
                </div>

                {tab === "library" && library.length > 0 && (
                    <div className="px-6 pt-2 flex items-center gap-2">
                        <button onClick={selectAll} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-dark transition">Select All</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={clearSelection} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition">Clear</button>
                    </div>
                )}

                {error && <div className="mx-6 bg-red-50 text-red-600 text-xs font-bold px-3 py-2 rounded-lg">{error}</div>}

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* ═══ Upload Tab ═══ */}
                    {tab === "upload" && (
                        <div
                            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${dragOver ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                        >
                            {uploading ? (
                                <div className="space-y-4">
                                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                                    <p className="text-sm font-bold text-gray-900">Uploading... {uploadProgress}%</p>
                                    <div className="w-48 h-2 bg-gray-100 rounded-full mx-auto overflow-hidden">
                                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto">
                                        <Upload className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900">Drop files here or click to browse</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Images: JPG, PNG, WEBP (max 5MB)
                                            {acceptVideo && " • Videos: MP4, WEBM (max 50MB)"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => fileRef.current?.click()}
                                        className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition shadow-sm"
                                    >
                                        <Plus className="w-4 h-4 inline mr-1" /> Choose Files
                                    </button>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        multiple
                                        accept={`image/*${acceptVideo ? ",video/*" : ""}`}
                                        className="hidden"
                                        onChange={e => handleUpload(e.target.files)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ Library Tab ═══ */}
                    {tab === "library" && (
                        <div className="space-y-6">
                            {loadingLibrary ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p className="text-xs text-gray-400 font-bold">Loading media library...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Images */}
                                    {images.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                                                <ImageIcon className="w-3.5 h-3.5" /> Images ({images.length})
                                            </h3>
                                            <div className={`grid gap-3 ${
                                                gridScale === "compact" 
                                                    ? "grid-cols-4 md:grid-cols-6 lg:grid-cols-8" 
                                                    : "grid-cols-2 md:grid-cols-4"
                                            }`}>
                                                {images.map(m => (
                                                    <div key={m.url} className="relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all bg-gray-50"
                                                        style={{ borderColor: selected.has(m.url) ? "#e8323b" : "transparent" }}
                                                        onClick={() => toggleSelect(m.url)}>
                                                        <img src={m.url} alt="" className="w-full aspect-square object-contain" />
                                                        {selected.has(m.url) && (
                                                            <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow">
                                                                <Check className="w-3 h-3 text-white" />
                                                            </div>
                                                        )}
                                                        <button className="absolute top-2 left-2 w-6 h-6 bg-red-500/80 rounded-full items-center justify-center text-white opacity-0 group-hover:opacity-100 transition hidden md:flex"
                                                            onClick={e => { e.stopPropagation(); handleDelete(m.url); }}>
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Videos */}
                                    {videos.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                                                <Film className="w-3.5 h-3.5" /> Videos ({videos.length})
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {videos.map(m => (
                                                    <div key={m.url} className="relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all"
                                                        style={{ borderColor: selected.has(m.url) ? "#e8323b" : "transparent" }}
                                                        onClick={() => toggleSelect(m.url)}>
                                                        {m.type === "youtube" && m.thumbUrl ? (
                                                            <div className="relative aspect-video bg-black">
                                                                <img src={m.thumbUrl} alt="" className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-xl">
                                                                        <Youtube className="w-5 h-5 text-white" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="aspect-video bg-gray-900 flex items-center justify-center">
                                                                <Film className="w-8 h-8 text-gray-400" />
                                                            </div>
                                                        )}
                                                        {selected.has(m.url) && (
                                                            <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow">
                                                                <Check className="w-3 h-3 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {library.length === 0 && (
                                        <div className="text-center py-16 space-y-3">
                                            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto" />
                                            <p className="text-sm text-gray-500 font-bold">No media yet</p>
                                            <p className="text-xs text-gray-400">Upload images or add YouTube videos to get started.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ═══ YouTube Tab ═══ */}
                    {tab === "youtube" && (
                        <div className="space-y-6">
                            <div className="bg-red-50 rounded-2xl p-6 space-y-4 border border-red-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                                        <Youtube className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">Add YouTube Video</p>
                                        <p className="text-xs text-gray-500">Paste any YouTube video URL</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={youtubeUrl}
                                        onChange={e => setYoutubeUrl(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleAddYoutube()}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                                    />
                                    <button onClick={handleAddYoutube}
                                        className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition shrink-0">
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Preview */}
                            {youtubeUrl && extractYoutubeId(youtubeUrl) && (
                                <div className="rounded-2xl overflow-hidden border border-gray-200">
                                    <div className="aspect-video">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${extractYoutubeId(youtubeUrl)}`}
                                            className="w-full h-full"
                                            allowFullScreen
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="shrink-0 border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50">
                    <p className="text-xs text-gray-500">
                        {selected.size > 0 ? `${selected.size} item${selected.size > 1 ? "s" : ""} selected` : "No items selected"}
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition">
                            Cancel
                        </button>
                        <button onClick={handleInsert} disabled={selected.size === 0}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-dark transition disabled:opacity-50 shadow-sm flex items-center gap-2">
                            <Check className="w-4 h-4" /> Insert Selected
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
