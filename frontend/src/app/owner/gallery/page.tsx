"use client";

import { useState, useEffect } from "react";
import { useBranch } from "../owner-shell";
import { ImageIcon, Film, Youtube, Plus, X, Save, Loader2, Star, CheckCircle, Camera, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";

const ImageGalleryModal = dynamic(() => import("@/components/owner/image-gallery-modal"), { ssr: false });

type MediaItem = {
    url: string;
    thumbUrl?: string;
    type: "image" | "video" | "youtube";
    filename?: string;
};

const GALLERY_CATEGORIES = ["Food", "Interior", "Vibes", "Location"];

export default function OwnerGalleryPage() {
    const { branch } = useBranch();
    const [galleryImages, setGalleryImages] = useState<{ url: string; category: string }[]>([]);
    const [galleryVideos, setGalleryVideos] = useState<MediaItem[]>([]);
    const [coverImage, setCoverImage] = useState("");
    const [logo, setLogo] = useState("");
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const [galleryModalOpen, setGalleryModalOpen] = useState(false);
    const [coverModalOpen, setCoverModalOpen] = useState(false);
    const [logoModalOpen, setLogoModalOpen] = useState(false);
    const [videoModalOpen, setVideoModalOpen] = useState(false);

    useEffect(() => {
        if (!branch) return;
        setGalleryImages((branch.galleryImages || []).map((img: any) => 
            typeof img === "string" ? { url: img, category: "Food" } : img
        ));
        setCoverImage(branch.coverImage || "");
        setLogo(branch.logo || "");
        setGalleryVideos(branch.galleryVideos || []);
    }, [branch]);

    const handleSave = async () => {
        setSaving(true);
        setMsg("");
        await fetch("/api/owner/restaurant", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: branch._id, galleryImages, galleryVideos, coverImage, logo }),
        });
        setSaving(false);
        setMsg("Gallery saved!");
        setTimeout(() => setMsg(""), 3000);
    };

    const removeImage = (url: string) => setGalleryImages(prev => prev.filter(i => i.url !== url));
    const removeVideo = (url: string) => setGalleryVideos(prev => prev.filter(v => v.url !== url));

    const getYoutubeId = (url: string) => {
        const m = url.match(/(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return m ? m[1] : null;
    };

    const existingMedia: MediaItem[] = [
        ...galleryImages.map(img => ({ url: img.url, type: "image" as const })),
        ...galleryVideos,
    ];

    if (!branch) return null;

    return (
        <div className="space-y-6 max-w-3xl">
            {/* ═══ HEADER ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-primary" /> Media Gallery
                    </h1>
                    <p className="text-[12px] text-gray-400 font-medium mt-0.5">Manage your photos, videos, cover image and logo</p>
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="text-white px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 disabled:opacity-50 shrink-0 active:scale-95"
                    style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Saving..." : "Save All"}
                </button>
            </div>

            {msg && (
                <div className="flex items-center gap-2 text-[13px] font-bold px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle className="w-4 h-4" /> {msg}
                </div>
            )}

            {/* ═══ COVER IMAGE ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                        <Star className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="font-bold text-[14px] text-gray-900">Cover Image</h2>
                </div>
                <div className="p-5">
                    {coverImage ? (
                        <div className="relative rounded-2xl overflow-hidden group">
                            <img src={coverImage} alt="Cover" className="w-full h-52 object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                <button onClick={() => setCoverModalOpen(true)} className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl text-[12px] font-bold hover:bg-white transition-all active:scale-95">Change</button>
                                <button onClick={() => setCoverImage("")} className="bg-red-600/90 text-white px-4 py-2 rounded-xl text-[12px] font-bold hover:bg-red-700 transition-all active:scale-95">Remove</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setCoverModalOpen(true)} className="w-full h-40 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 font-bold hover:border-primary/30 hover:text-primary transition-all">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
                                <ImageIcon className="w-6 h-6" />
                            </div>
                            <span className="text-[13px]">Set Cover Image</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ═══ LOGO ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-blue-500" />
                    </div>
                    <h2 className="font-bold text-[14px] text-gray-900">Restaurant Logo</h2>
                </div>
                <div className="p-5 flex items-center gap-5">
                    {logo ? (
                        <div className="relative group">
                            <img src={logo} alt="Logo" className="w-20 h-20 rounded-2xl object-contain bg-white border border-gray-100" />
                            <button onClick={() => setLogo("")} className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all active:scale-90">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300">
                            <ImageIcon className="w-8 h-8" />
                        </div>
                    )}
                    <button onClick={() => setLogoModalOpen(true)} className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-[12px] font-bold hover:bg-gray-200 transition-all active:scale-95">
                        {logo ? "Change Logo" : "Upload Logo"}
                    </button>
                </div>
            </div>

            {/* ═══ GALLERY IMAGES ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-primary" />
                        </div>
                        <h2 className="font-bold text-[14px] text-gray-900">Gallery Images ({galleryImages.length})</h2>
                    </div>
                    <button onClick={() => setGalleryModalOpen(true)}
                        className="text-white px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center gap-1.5 active:scale-95"
                        style={{ backgroundColor: "#e8323b" }}>
                        <Plus className="w-3.5 h-3.5" /> Add Images
                    </button>
                </div>
                <div className="p-5">
                    {galleryImages.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                            {galleryImages.map((img, idx) => (
                                <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-100 flex flex-col">
                                    <div className="relative group aspect-square">
                                        <img src={img.url} alt="" className="w-full h-full object-cover bg-gray-50" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                                        <button onClick={() => removeImage(img.url)}
                                            className="absolute top-1.5 right-1.5 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all active:scale-90 z-10">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="p-2 border-t border-gray-50 flex flex-col gap-1">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</span>
                                        <select 
                                            value={img.category}
                                            onChange={(e) => {
                                                const newGallery = [...galleryImages];
                                                newGallery[idx] = { ...newGallery[idx], category: e.target.value };
                                                setGalleryImages(newGallery);
                                            }}
                                            className="w-full text-[11px] font-bold bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-primary transition-all appearance-none"
                                        >
                                            {GALLERY_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-10 text-center flex flex-col items-center">
                            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                                <ImageIcon className="w-7 h-7 text-gray-300" />
                            </div>
                            <p className="text-[13px] text-gray-500 font-bold">No gallery images yet</p>
                            <p className="text-[11px] text-gray-400 mt-1">Click "Add Images" to upload photos</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ VIDEOS ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Film className="w-4 h-4 text-purple-500" />
                        </div>
                        <h2 className="font-bold text-[14px] text-gray-900">Videos ({galleryVideos.length})</h2>
                    </div>
                    <button onClick={() => setVideoModalOpen(true)}
                        className="text-white px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center gap-1.5 active:scale-95"
                        style={{ backgroundColor: "#e8323b" }}>
                        <Plus className="w-3.5 h-3.5" /> Add Videos
                    </button>
                </div>
                <div className="p-5">
                    {galleryVideos.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {galleryVideos.map(v => (
                                <div key={v.url} className="relative group rounded-2xl overflow-hidden border border-gray-100 bg-gray-900">
                                    {v.type === "youtube" ? (
                                        <div className="aspect-video">
                                            <iframe src={`https://www.youtube.com/embed/${getYoutubeId(v.url)}`} className="w-full h-full" allowFullScreen loading="lazy" />
                                        </div>
                                    ) : (
                                        <div className="aspect-video">
                                            <video src={v.url} className="w-full h-full object-cover" controls preload="metadata" />
                                        </div>
                                    )}
                                    <button onClick={() => removeVideo(v.url)}
                                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all active:scale-90">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-10 text-center flex flex-col items-center">
                            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                                <Film className="w-7 h-7 text-gray-300" />
                            </div>
                            <p className="text-[13px] text-gray-500 font-bold">No videos yet</p>
                            <p className="text-[11px] text-gray-400 mt-1">Upload from CDN or add YouTube links</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ MODALS ═══ */}
            <ImageGalleryModal isOpen={galleryModalOpen} onClose={() => setGalleryModalOpen(false)}
                onSelect={items => setGalleryImages(prev => [...prev, ...items.filter(i => i.type === "image").map(i => ({ url: i.url, category: "Food" }))])}
                restaurantId={branch._id} acceptVideo={false} existingMedia={existingMedia} />
            <ImageGalleryModal isOpen={coverModalOpen} onClose={() => setCoverModalOpen(false)}
                onSelect={items => items[0] && setCoverImage(items[0].url)}
                restaurantId={branch._id} multiple={false} acceptVideo={false} existingMedia={existingMedia} />
            <ImageGalleryModal isOpen={logoModalOpen} onClose={() => setLogoModalOpen(false)}
                onSelect={items => items[0] && setLogo(items[0].url)}
                restaurantId={branch._id} multiple={false} acceptVideo={false} existingMedia={existingMedia} />
            <ImageGalleryModal isOpen={videoModalOpen} onClose={() => setVideoModalOpen(false)}
                onSelect={items => setGalleryVideos(prev => [...prev, ...items.filter(i => i.type === "video" || i.type === "youtube")])}
                restaurantId={branch._id} acceptVideo={true} existingMedia={existingMedia} />
        </div>
    );
}
