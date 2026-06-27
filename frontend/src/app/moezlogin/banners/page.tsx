"use client";

import { useState, useEffect, useRef } from "react";
import {
    Image as ImageIcon, Plus, Trash2, Pencil, X, Save,
    Upload, ChevronUp, ChevronDown, MapPin, Globe
} from "lucide-react";

interface Banner {
    _id: string;
    title?: string;
    subtitle?: string;
    imageUrl: string;
    linkUrl?: string;
    citySlug?: string;
    order: number;
    isActive: boolean;
}

async function readApiError(res: Response, fallback: string) {
    try {
        const data = await res.json();
        return data?.error || fallback;
    } catch {
        return fallback;
    }
}

export default function BannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Banner | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        title: "", subtitle: "", imageUrl: "", linkUrl: "", citySlug: "", order: 0, isActive: true
    });

    // Media upload
    const [uploading, setUploading] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchBanners();
        fetchCities();
    }, []);

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/banners");
            const data = await res.json();
            setBanners(Array.isArray(data) ? data : (data.data || []));
        } catch { setBanners([]); }
        setLoading(false);
    };

    const fetchCities = async () => {
        try {
            const res = await fetch("/api/cities");
            const data = await res.json();
            setCities(Array.isArray(data) ? data : []);
        } catch { }
    };

    const resetForm = () => {
        setForm({ title: "", subtitle: "", imageUrl: "", linkUrl: "", citySlug: "", order: 0, isActive: true });
        setEditing(null);
        setShowForm(false);
    };

    const openEdit = (banner: Banner) => {
        setEditing(banner);
        setForm({
            title: banner.title || "",
            subtitle: banner.subtitle || "",
            imageUrl: banner.imageUrl || "",
            linkUrl: banner.linkUrl || "",
            citySlug: banner.citySlug || "",
            order: banner.order || 0,
            isActive: banner.isActive,
        });
        setShowForm(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.imageUrl) { alert("Image URL is required."); return; }
        setSaving(true);
        try {
            const url = editing ? `/api/banners/${editing._id}` : "/api/banners";
            const method = editing ? "PUT" : "POST";
            // Convert empty citySlug to null for "default" banners
            const body = { ...form, citySlug: form.citySlug || null };
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                throw new Error(await readApiError(res, editing ? "Failed to update banner." : "Failed to create banner."));
            }
            resetForm();
            fetchBanners();
        } catch (error: any) {
            alert(error?.message || "Failed to save banner.");
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this banner?")) return;
        const res = await fetch(`/api/banners/${id}`, { method: "DELETE" });
        if (!res.ok) {
            alert(await readApiError(res, "Failed to delete banner."));
            return;
        }
        fetchBanners();
    };

    // Media upload
    const handleImageUpload = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("image", file);
            formData.append("slug", `banner-${Date.now()}`);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) {
                throw new Error(await readApiError(res, "Failed to upload banner image."));
            }
            const data = await res.json();
            setForm(prev => ({ ...prev, imageUrl: data.url }));
            setShowMediaPicker(false);
        } catch (error: any) {
            alert(error?.message || "Failed to upload banner image.");
        }
        setUploading(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <ImageIcon className="w-6 h-6 text-primary" /> Homepage Banners
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage hero slider banners. Assign to specific cities or leave as default for all.
                    </p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); }}
                    className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition flex items-center gap-2 self-start">
                    <Plus className="w-4 h-4" /> Add Banner
                </button>
            </div>

            {/* ── Add/Edit Form ── */}
            {showForm && (
                <form onSubmit={handleSave} className="bg-card border rounded-2xl p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-sm">{editing ? "Edit Banner" : "New Banner"}</h2>
                        <button type="button" onClick={resetForm} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X className="w-4 h-4" /></button>
                    </div>

                    {/* Image Picker */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Banner Image *</label>
                        {form.imageUrl ? (
                            <div className="relative group rounded-xl overflow-hidden border">
                                <img src={form.imageUrl} alt="Banner" className="w-full h-48 object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button type="button" onClick={() => setShowMediaPicker(true)}
                                        className="bg-white text-gray-800 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-gray-100 transition">
                                        <ImageIcon className="w-4 h-4" /> Change
                                    </button>
                                    <button type="button" onClick={() => setForm(prev => ({ ...prev, imageUrl: "" }))}
                                        className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-red-600 transition">
                                        <Trash2 className="w-4 h-4" /> Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button type="button" onClick={() => setShowMediaPicker(true)}
                                className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                                <Upload className="w-8 h-8 text-gray-400" />
                                <span className="text-sm font-bold text-gray-500">Upload Banner Image</span>
                                <span className="text-[10px] text-gray-400">Recommended: 1920×600px</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Title</label>
                            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder="Banner headline" className="w-full border rounded-xl px-4 py-2.5 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Subtitle</label>
                            <input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })}
                                placeholder="Banner subtitle" className="w-full border rounded-xl px-4 py-2.5 text-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Link URL</label>
                            <input value={form.linkUrl} onChange={e => setForm({ ...form, linkUrl: e.target.value })}
                                placeholder="/lahore/fine-dining" className="w-full border rounded-xl px-4 py-2.5 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" /> City Target
                            </label>
                            <select value={form.citySlug} onChange={e => setForm({ ...form, citySlug: e.target.value })}
                                className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white">
                                <option value="">🌍 Default (All Cities)</option>
                                {cities.map(c => (
                                    <option key={c.slug} value={c.slug}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Order</label>
                            <input value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                                type="number" className="w-full border rounded-xl px-4 py-2.5 text-sm" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-primary" />
                            <span className="text-sm font-bold">Active</span>
                        </label>
                        <div className="flex gap-2">
                            <button type="button" onClick={resetForm} className="px-5 py-2.5 border rounded-xl text-sm font-bold hover:bg-gray-50 transition">Cancel</button>
                            <button type="submit" disabled={saving}
                                className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition disabled:opacity-50 flex items-center gap-2">
                                <Save className="w-4 h-4" /> {saving ? "Saving..." : editing ? "Update" : "Create"}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* ── Banners List ── */}
            {loading ? (
                <div className="text-center py-10 text-muted-foreground">Loading banners...</div>
            ) : banners.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No banners yet. Add your first banner above.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {banners.map(banner => (
                        <div key={banner._id} className="bg-card border rounded-xl overflow-hidden group hover:shadow-lg transition-shadow">
                            <div className="relative h-40">
                                <img src={banner.imageUrl} alt={banner.title || "Banner"} className="w-full h-full object-cover" />
                                {!banner.isActive && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">INACTIVE</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(banner)}
                                        className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg hover:bg-white transition shadow-sm">
                                        <Pencil className="w-4 h-4 text-blue-600" />
                                    </button>
                                    <button onClick={() => handleDelete(banner._id)}
                                        className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg hover:bg-white transition shadow-sm">
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                </div>
                                {banner.citySlug ? (
                                    <span className="absolute top-2 left-2 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <MapPin className="w-2.5 h-2.5" /> {banner.citySlug}
                                    </span>
                                ) : (
                                    <span className="absolute top-2 left-2 bg-gray-800/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Globe className="w-2.5 h-2.5" /> Default
                                    </span>
                                )}
                            </div>
                            <div className="p-3">
                                <p className="font-bold text-sm">{banner.title || "Untitled"}</p>
                                {banner.subtitle && <p className="text-xs text-gray-500 mt-0.5">{banner.subtitle}</p>}
                                <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
                                    <span>Order: {banner.order}</span>
                                    {banner.linkUrl && <span className="text-blue-500 truncate max-w-[150px]">{banner.linkUrl}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Media Picker Modal ── */}
            {showMediaPicker && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-lg">
                        <div className="border-b p-5 flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Upload Banner Image</h3>
                            <button onClick={() => setShowMediaPicker(false)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div onClick={() => fileInputRef.current?.click()}
                                className="w-full h-36 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                                {uploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm font-bold text-gray-500">Uploading...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-gray-400" />
                                        <span className="text-sm font-bold text-gray-600">Upload from computer</span>
                                        <span className="text-[10px] text-gray-400">Recommended: 1920×600px</span>
                                    </>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                                onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />

                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-xs font-bold text-gray-400 uppercase">or paste URL</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>
                            <div className="flex gap-2">
                                <input id="bannerPasteUrl" type="text" placeholder="https://cdn.foodiespakistan.pk/..."
                                    className="flex-1 border rounded-xl px-4 py-2.5 text-sm" />
                                <button onClick={() => {
                                    const input = document.getElementById("bannerPasteUrl") as HTMLInputElement;
                                    if (input.value.trim()) {
                                        setForm(prev => ({ ...prev, imageUrl: input.value.trim() }));
                                        setShowMediaPicker(false);
                                    }
                                }}
                                    className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition">
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
