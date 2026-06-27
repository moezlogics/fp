"use client";

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import {
    MapPin, Plus, Trash2, Pencil, X, Save, Globe, ChevronDown,
    ChevronRight, Search, Image as ImageIcon, Upload, RefreshCw
} from "lucide-react";

const ReactQuill = lazy(() => import("react-quill-new"));
import "react-quill-new/dist/quill.snow.css";

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

interface City {
    _id: string;
    name: string;
    slug: string;
    latitude: number;
    longitude: number;
    image?: string;
    content?: string;
    featuredImage?: string;
    order: number;
    isActive: boolean;
    restaurantCount: number;
}

interface Area {
    _id: string;
    name: string;
    slug: string;
    cityId: string;
    citySlug: string;
    latitude: number;
    longitude: number;
    content?: string;
    featuredImage?: string;
    isActive: boolean;
    restaurantCount: number;
}

export default function CitiesAdminPage() {
    const [cities, setCities] = useState<City[]>([]);
    const [areas, setAreas] = useState<Record<string, Area[]>>({});
    const [loading, setLoading] = useState(true);
    const [expandedCity, setExpandedCity] = useState<string | null>(null);
    const [searchQ, setSearchQ] = useState("");

    // City form
    const [showCityForm, setShowCityForm] = useState(false);
    const [cityForm, setCityForm] = useState({ name: "", latitude: 0, longitude: 0, order: 0 });

    // Area form
    const [showAreaForm, setShowAreaForm] = useState<string | null>(null);
    const [areaForm, setAreaForm] = useState({ name: "", latitude: 0, longitude: 0 });

    // Edit modal (shared for city and area)
    const [editing, setEditing] = useState<{ type: "city" | "area"; item: any } | null>(null);
    const [editForm, setEditForm] = useState({ name: "", content: "", featuredImage: "", latitude: 0, longitude: 0, order: 0 });

    // Media picker
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchCities = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/cities");
            const data = await res.json();
            setCities(Array.isArray(data) ? data : []);
        } catch { setCities([]); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchCities(); }, [fetchCities]);

    const fetchAreas = async (citySlug: string) => {
        try {
            const res = await fetch(`/api/areas?citySlug=${citySlug}`);
            const data = await res.json();
            setAreas(prev => ({ ...prev, [citySlug]: Array.isArray(data) ? data : [] }));
        } catch {
            setAreas(prev => ({ ...prev, [citySlug]: [] }));
        }
    };

    const toggleCity = (citySlug: string) => {
        if (expandedCity === citySlug) {
            setExpandedCity(null);
        } else {
            setExpandedCity(citySlug);
            if (!areas[citySlug]) fetchAreas(citySlug);
        }
    };

    // ── City CRUD ──
    const handleAddCity = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/cities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cityForm),
        });
        setCityForm({ name: "", latitude: 0, longitude: 0, order: 0 });
        setShowCityForm(false);
        fetchCities();
    };

    const handleDeleteCity = async (id: string) => {
        if (!confirm("Delete this city? All areas under it will also be removed.")) return;
        await fetch(`/api/cities/${id}`, { method: "DELETE" });
        fetchCities();
    };

    // ── Area CRUD ──
    const handleAddArea = async (e: React.FormEvent, cityId: string, citySlug: string) => {
        e.preventDefault();
        await fetch("/api/areas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...areaForm, cityId, citySlug }),
        });
        setAreaForm({ name: "", latitude: 0, longitude: 0 });
        setShowAreaForm(null);
        fetchAreas(citySlug);
    };

    const handleDeleteArea = async (areaId: string, citySlug: string) => {
        if (!confirm("Delete this area?")) return;
        await fetch(`/api/areas/${areaId}`, { method: "DELETE" });
        fetchAreas(citySlug);
    };

    // ── Edit Modal ──
    const openEdit = (type: "city" | "area", item: any) => {
        setEditing({ type, item });
        setEditForm({
            name: item.name || "",
            content: item.content || "",
            featuredImage: item.featuredImage || "",
            latitude: item.latitude || 0,
            longitude: item.longitude || 0,
            order: item.order || 0,
        });
    };

    const handleSaveEdit = async () => {
        if (!editing) return;
        const url = editing.type === "city"
            ? `/api/cities/${editing.item._id}`
            : `/api/areas/${editing.item._id}`;

        await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editForm),
        });

        setEditing(null);
        fetchCities();
        if (editing.type === "area") fetchAreas(editing.item.citySlug);
    };

    // ── Media Upload ──
    const handleImageUpload = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("image", file);
            formData.append("slug", `content-${Date.now()}`);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (res.ok) {
                const data = await res.json();
                setEditForm(prev => ({ ...prev, featuredImage: data.url }));
                setShowMediaPicker(false);
            }
        } catch { }
        setUploading(false);
    };

    const filteredCities = cities.filter(c =>
        c.name.toLowerCase().includes(searchQ.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQ.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Globe className="w-6 h-6 text-primary" /> Cities & Areas
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage cities, their areas, and SEO content for each location.
                    </p>
                </div>
                <button onClick={() => setShowCityForm(true)}
                    className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition flex items-center gap-2 self-start">
                    <Plus className="w-4 h-4" /> Add City
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search cities..." className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm" />
            </div>

            {/* Add City Form */}
            {showCityForm && (
                <form onSubmit={handleAddCity} className="bg-card border rounded-xl p-5 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <input value={cityForm.name} onChange={e => setCityForm({ ...cityForm, name: e.target.value })}
                        placeholder="City Name *" required className="border rounded-lg px-3 py-2 text-sm" />
                    <input value={cityForm.latitude || ""} onChange={e => setCityForm({ ...cityForm, latitude: parseFloat(e.target.value) || 0 })}
                        placeholder="Latitude" type="number" step="any" className="border rounded-lg px-3 py-2 text-sm" />
                    <input value={cityForm.longitude || ""} onChange={e => setCityForm({ ...cityForm, longitude: parseFloat(e.target.value) || 0 })}
                        placeholder="Longitude" type="number" step="any" className="border rounded-lg px-3 py-2 text-sm" />
                    <input value={cityForm.order || ""} onChange={e => setCityForm({ ...cityForm, order: parseInt(e.target.value) || 0 })}
                        placeholder="Order" type="number" className="border rounded-lg px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                        <button type="submit" className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-primary-dark transition flex-1 flex items-center justify-center gap-1">
                            <Plus className="w-4 h-4" /> Add
                        </button>
                        <button type="button" onClick={() => setShowCityForm(false)} className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            )}

            {/* Cities List */}
            {loading ? (
                <div className="text-center py-10 text-muted-foreground">Loading cities...</div>
            ) : filteredCities.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No cities found.</div>
            ) : (
                <div className="space-y-3">
                    {filteredCities.map(city => (
                        <div key={city._id} className="bg-card border rounded-xl overflow-hidden">
                            {/* City Header */}
                            <div className="flex items-center justify-between p-4 hover:bg-muted/20 transition cursor-pointer" onClick={() => toggleCity(city.slug)}>
                                <div className="flex items-center gap-3">
                                    {expandedCity === city.slug
                                        ? <ChevronDown className="w-5 h-5 text-primary" />
                                        : <ChevronRight className="w-5 h-5 text-gray-400" />
                                    }
                                    <div>
                                        <h3 className="font-bold text-sm">{city.name}</h3>
                                        <p className="text-xs text-muted-foreground">
                                            /{city.slug} · Order: {city.order} · {city.restaurantCount || 0} restaurants
                                            {city.content ? " · ✅ Has Content" : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => openEdit("city", city)}
                                        className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition" title="Edit City">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteCity(city._id)}
                                        className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition" title="Delete City">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded: Areas */}
                            {expandedCity === city.slug && (
                                <div className="border-t bg-gray-50/50 px-4 py-3 space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" /> Areas in {city.name}
                                        </h4>
                                        <button onClick={() => setShowAreaForm(showAreaForm === city._id ? null : city._id)}
                                            className="text-xs font-bold text-primary hover:text-primary-dark transition flex items-center gap-1">
                                            <Plus className="w-3.5 h-3.5" /> Add Area
                                        </button>
                                    </div>

                                    {/* Add Area Form */}
                                    {showAreaForm === city._id && (
                                        <form onSubmit={(e) => handleAddArea(e, city._id, city.slug)}
                                            className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-white rounded-lg p-3 border">
                                            <input value={areaForm.name} onChange={e => setAreaForm({ ...areaForm, name: e.target.value })}
                                                placeholder="Area Name *" required className="border rounded-lg px-3 py-2 text-xs" />
                                            <input value={areaForm.latitude || ""} onChange={e => setAreaForm({ ...areaForm, latitude: parseFloat(e.target.value) || 0 })}
                                                placeholder="Latitude" type="number" step="any" className="border rounded-lg px-3 py-2 text-xs" />
                                            <input value={areaForm.longitude || ""} onChange={e => setAreaForm({ ...areaForm, longitude: parseFloat(e.target.value) || 0 })}
                                                placeholder="Longitude" type="number" step="any" className="border rounded-lg px-3 py-2 text-xs" />
                                            <button type="submit" className="bg-primary text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-primary-dark transition">
                                                Add Area
                                            </button>
                                        </form>
                                    )}

                                    {/* Areas list */}
                                    {!areas[city.slug] ? (
                                        <p className="text-xs text-gray-400 py-2">Loading areas...</p>
                                    ) : areas[city.slug].length === 0 ? (
                                        <p className="text-xs text-gray-400 py-2">No areas added yet.</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {areas[city.slug].map(area => (
                                                <div key={area._id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border hover:border-primary/20 transition">
                                                    <div>
                                                        <p className="text-sm font-medium">{area.name}</p>
                                                        <p className="text-[10px] text-gray-400">
                                                            /{area.slug} · {area.restaurantCount || 0} restaurants
                                                            {area.content ? " · ✅ Content" : ""}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <button onClick={() => openEdit("area", area)}
                                                            className="bg-blue-50 text-blue-600 p-1.5 rounded-lg hover:bg-blue-100 transition" title="Edit Area">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDeleteArea(area._id, city.slug)}
                                                            className="bg-red-50 text-red-600 p-1.5 rounded-lg hover:bg-red-100 transition" title="Delete Area">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Edit Modal ── */}
            {editing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl z-10">
                            <div>
                                <h2 className="font-bold text-lg">Edit {editing.type === "city" ? "City" : "Area"}</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {editing.item.name} — /{editing.item.slug}
                                </p>
                            </div>
                            <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Name & Coordinates */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Name</label>
                                    <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full border rounded-xl px-4 py-2.5 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Latitude</label>
                                    <input value={editForm.latitude} onChange={e => setEditForm({ ...editForm, latitude: parseFloat(e.target.value) || 0 })}
                                        type="number" step="any" className="w-full border rounded-xl px-4 py-2.5 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Longitude</label>
                                    <input value={editForm.longitude} onChange={e => setEditForm({ ...editForm, longitude: parseFloat(e.target.value) || 0 })}
                                        type="number" step="any" className="w-full border rounded-xl px-4 py-2.5 text-sm" />
                                </div>
                            </div>

                            {editing.type === "city" && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Display Order</label>
                                    <input value={editForm.order} onChange={e => setEditForm({ ...editForm, order: parseInt(e.target.value) || 0 })}
                                        type="number" className="w-full border rounded-xl px-4 py-2.5 text-sm max-w-[120px]" />
                                </div>
                            )}

                            {/* Featured Image */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Featured Image
                                </label>
                                {editForm.featuredImage ? (
                                    <div className="relative group rounded-xl overflow-hidden border">
                                        <img src={editForm.featuredImage} alt="Featured" className="w-full h-48 object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button onClick={() => setShowMediaPicker(true)}
                                                className="bg-white text-gray-800 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-gray-100 transition">
                                                <ImageIcon className="w-4 h-4" /> Change
                                            </button>
                                            <button onClick={() => setEditForm(prev => ({ ...prev, featuredImage: "" }))}
                                                className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-red-600 transition">
                                                <Trash2 className="w-4 h-4" /> Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowMediaPicker(true)}
                                        className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                                        <ImageIcon className="w-8 h-8 text-gray-400" />
                                        <span className="text-sm font-bold text-gray-500">Set Featured Image</span>
                                    </button>
                                )}
                            </div>

                            {/* Rich Content Editor */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Page Content (SEO)</label>
                                <div className="border rounded-xl overflow-hidden">
                                    <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading editor...</div>}>
                                        <ReactQuill theme="snow" value={editForm.content}
                                            onChange={(val: string) => setEditForm({ ...editForm, content: val })}
                                            modules={QUILL_MODULES} placeholder="Write content about this location..." />
                                    </Suspense>
                                </div>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-white border-t p-5 flex justify-end gap-3 rounded-b-2xl">
                            <button onClick={() => setEditing(null)} className="px-5 py-2.5 border rounded-xl text-sm font-bold hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handleSaveEdit} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Media Library Picker (same pattern as SEO pages) ── */}
            {showMediaPicker && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-lg">
                        <div className="border-b p-5 flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Media Library</h3>
                            <button onClick={() => setShowMediaPicker(false)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div onClick={() => fileInputRef.current?.click()}
                                className="w-full h-36 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
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
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                                onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />

                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-xs font-bold text-gray-400 uppercase">or paste URL</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>
                            <div className="flex gap-2">
                                <input id="pasteUrlCities" type="text" placeholder="https://cdn.foodiespakistan.pk/..."
                                    className="flex-1 border rounded-xl px-4 py-2.5 text-sm" />
                                <button onClick={() => {
                                    const input = document.getElementById("pasteUrlCities") as HTMLInputElement;
                                    if (input.value.trim()) {
                                        setEditForm(prev => ({ ...prev, featuredImage: input.value.trim() }));
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
