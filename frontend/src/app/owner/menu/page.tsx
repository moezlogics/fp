"use client";

import { useState, useEffect } from "react";
import { useBranch } from "../owner-shell";
import { 
    Save, 
    Loader2, 
    Plus, 
    Trash2, 
    ImageIcon, 
    ArrowUp, 
    ArrowDown, 
    CheckCircle,
    Sparkles,
    LayoutGrid,
    List
} from "lucide-react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { MENU_CATEGORIES } from "@/constants/menu";

const ImageGalleryModal = dynamic(() => import("@/components/owner/image-gallery-modal"), { ssr: false });
const AIMenuReviewModal = dynamic(() => import("@/components/owner/ai-menu-review-modal"), { ssr: false });
const DigitalMenuManager = dynamic(() => import("@/components/owner/digital-menu-manager"), { ssr: false });

export default function OwnerMenuPage() {
    const { branch } = useBranch();
    const [menuImages, setMenuImages] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"pages" | "digital">("digital");

    // AI Extraction State
    const [extracting, setExtracting] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<any[]>([]);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);

    // Refresh trigger for DigitalMenuManager when AI extraction finishes
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (branch?.menuImages) setMenuImages([...branch.menuImages]);
    }, [branch]);

    const removeImage = (i: number) => setMenuImages(menuImages.filter((_, idx) => idx !== i));

    const moveImage = (from: number, to: number) => {
        if (to < 0 || to >= menuImages.length) return;
        const arr = [...menuImages];
        [arr[from], arr[to]] = [arr[to], arr[from]];
        setMenuImages(arr);
    };

    const handleSave = async () => {
        setSaving(true);
        setMsg("");
        try {
            const res = await fetch("/api/owner/restaurant", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: branch._id, menuImages }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMsg(`Error: ${data?.error || "Failed to save menu pages"}`);
            } else {
                setMsg("Menu pages saved!");
            }
        } catch (err: any) {
            setMsg(`Error: ${err?.message || "Network error"}`);
        }
        setSaving(false);
        setTimeout(() => setMsg(""), 5000);
    };

    const handleAIExtract = async (imageUrl: string) => {
        setExtracting(imageUrl);
        setMsg("");
        try {
            const res = await fetch("/api/v1/menu-items/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.message || "AI extraction failed.");
            
            // API proxy returns: { success: true, data: { items: [...], menuOverview: "...", categoryOverviews: {...} } }
            // Unwrap to find the items array at any depth
            const innerData = data?.data || data;
            const items = Array.isArray(innerData?.items) 
                ? innerData.items 
                : Array.isArray(innerData?.data?.items) 
                    ? innerData.data.items 
                    : Array.isArray(innerData?.data) 
                        ? innerData.data 
                        : Array.isArray(innerData) 
                            ? innerData 
                            : [];

            if (items.length === 0) {
                setMsg("No items could be extracted from this image. Try a clearer menu photo.");
                return;
            }

            setExtractedData(items);
            setReviewModalOpen(true);
        } catch (err: any) {
            setMsg(`Error: ${err.message}`);
        } finally {
            setExtracting(null);
        }
    };

    if (!branch) return null;

    const existingMedia = menuImages.map(url => ({ url, type: "image" as const }));

    return (
        <div className="space-y-6 max-w-6xl">
            {/* ═══ HEADER ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <List className="w-6 h-6 text-primary" /> Menu Management
                    </h1>
                    <p className="text-sm text-gray-400 font-medium mt-0.5">Manage your interactive items and raw menu photos</p>
                </div>
                
                {activeTab === "pages" && (
                    <div className="flex items-center gap-3">
                        <button onClick={handleSave} disabled={saving}
                            className="bg-primary text-white px-6 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-2 disabled:opacity-50 shrink-0 active:scale-95 shadow-lg shadow-primary/25">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? "Saving..." : "Save Pages"}
                        </button>
                    </div>
                )}
            </div>

            {/* Status message */}
            {msg && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-2 text-[13px] font-bold px-4 py-3 rounded-xl ${msg.startsWith("Error") ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
                    {msg.startsWith("Error") ? "❌" : <CheckCircle className="w-4 h-4" />} {msg}
                </motion.div>
            )}

            {/* ═══ TABS ═══ */}
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl w-fit border border-gray-100">
                <button
                    onClick={() => setActiveTab("digital")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-[12px] text-[13px] font-black uppercase tracking-widest transition-all ${
                        activeTab === "digital" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-900"
                    }`}
                >
                    <List className="w-4 h-4" /> Digital Menu
                </button>
                <button
                    onClick={() => setActiveTab("pages")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-[12px] text-[13px] font-black uppercase tracking-widest transition-all ${
                        activeTab === "pages" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-900"
                    }`}
                >
                    <ImageIcon className="w-4 h-4" /> Menu Photos
                </button>
            </div>

            {/* ═══ TAB CONTENT: DIGITAL ═══ */}
            {activeTab === "digital" && (
                <DigitalMenuManager 
                    key={refreshKey}
                    restaurantId={branch._id} 
                    branchImages={[
                        ...(branch.galleryImages || []).map((img: any) => typeof img === 'string' ? img : img.url), 
                        ...(branch.menuImages || [])
                    ]} 
                    menuImages={menuImages} 
                />
            )}

            {/* ═══ TAB CONTENT: PAGES ═══ */}
            {activeTab === "pages" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm shadow-gray-200/50">
                            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                                <div>
                                    <h2 className="font-black text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-gray-400" /> Menu Pages ({menuImages.length})
                                    </h2>
                                </div>
                                <button onClick={() => setGalleryOpen(true)}
                                    className="text-primary hover:bg-primary/5 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95">
                                    <Plus className="w-4 h-4" /> Add Pages
                                </button>
                            </div>

                            <div className="p-6">
                                {menuImages.length === 0 ? (
                                    <div className="py-12 text-center flex flex-col items-center">
                                        <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-4">
                                            <ImageIcon className="w-10 h-10 text-primary/70" />
                                        </div>
                                        <p className="font-bold text-gray-700 text-base">No menu pages yet</p>
                                        <p className="text-xs text-gray-400 mt-1 max-w-xs">Upload photos of your raw menu. Customers can swipe through these.</p>
                                        <button onClick={() => setGalleryOpen(true)}
                                            className="mt-6 bg-primary text-white px-8 py-3 rounded-2xl text-sm font-black transition-all inline-flex items-center gap-2 active:scale-95 shadow-lg shadow-primary/20">
                                            <Plus className="w-5 h-5" /> Upload Photos
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {menuImages.map((url, i) => (
                                            <div key={i} className="bg-gray-50/50 rounded-2xl border border-gray-100 p-4 flex items-center gap-5 group hover:bg-white hover:shadow-xl hover:shadow-gray-200/40 transition-all duration-300">
                                                <div className="relative shrink-0">
                                                    <img src={url} alt={`Menu page ${i + 1}`} className="w-20 h-28 rounded-xl object-cover bg-white border border-gray-100 shadow-sm" />
                                                    <div className="absolute -top-2 -left-2 w-7 h-7 bg-white rounded-full border border-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 shadow-sm">
                                                        {i + 1}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <p className="text-sm font-black text-gray-800">Menu Page {i + 1}</p>
                                                    <p className="text-[11px] text-gray-400 truncate opacity-60 font-mono">{url.split('/').pop()}</p>
                                                    
                                                    <div className="pt-3 flex flex-wrap gap-2">
                                                        <button 
                                                            onClick={() => handleAIExtract(url)}
                                                            disabled={!!extracting}
                                                            className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm ${extracting === url ? "bg-primary text-white animate-pulse" : "bg-white text-primary border border-primary/20 hover:bg-primary hover:text-white"}`}>
                                                            {extracting === url ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                            {extracting === url ? "Extracting..." : "AI Digital Extract"}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-1.5 shrink-0">
                                                    <div className="flex gap-1">
                                                        <button onClick={() => moveImage(i, i - 1)} disabled={i === 0} className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:shadow-sm disabled:opacity-30 transition-all">
                                                            <ArrowUp className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                        <button onClick={() => moveImage(i, i + 1)} disabled={i === menuImages.length - 1} className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:shadow-sm disabled:opacity-30 transition-all">
                                                            <ArrowDown className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                    </div>
                                                    <button onClick={() => removeImage(i)} className="w-full h-8 rounded-lg border border-red-100 bg-red-50/50 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-[32px] p-8 text-white shadow-xl shadow-primary/30 relative overflow-hidden group">
                            <Sparkles className="absolute top-4 right-4 w-12 h-12 text-white/10 group-hover:scale-125 transition-transform duration-500" />
                            <h3 className="text-xl font-black mb-3 leading-tight">AI Digital Menu</h3>
                            <p className="text-sm text-white/80 leading-relaxed mb-6 font-medium">
                                Turn your menu photos into professional digital lists. 
                                Click "AI Digital Extract" on any page to auto-generate digital items.
                            </p>
                            <div className="space-y-3">
                                {[
                                    "Extract items from photos",
                                    "Categorize for easy browsing",
                                    "Automatically import items",
                                    "Premium public view"
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/90">
                                        <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                                            <CheckCircle className="w-2.5 h-2.5" />
                                        </div>
                                        {feature}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ImageGalleryModal
                isOpen={galleryOpen}
                onClose={() => setGalleryOpen(false)}
                onSelect={items => setMenuImages(prev => [...prev, ...items.filter(i => i.type === "image").map(i => i.url)])}
                restaurantId={branch._id}
                acceptVideo={false}
                existingMedia={existingMedia}
            />

            <AIMenuReviewModal 
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                extractedItems={extractedData}
                restaurantId={branch._id}
                existingCategories={MENU_CATEGORIES}
                onSuccess={(count) => {
                    setMsg(`Success! ${count} items added to your digital menu.`);
                    setRefreshKey(prev => prev + 1); // refresh digital menu
                    setActiveTab("digital"); // switch to digital tab
                }}
            />
        </div>
    );
}
