"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import {
    Search, CheckCircle2, XCircle, Star, Trash2, Eye, Filter, Plus,
    Pencil, X, Save, Upload, Image as ImageIcon, MapPin, Phone,
    Building2, Tag, Clock, Settings, RefreshCw, GitBranch, Store, UtensilsCrossed, Sparkles
} from "lucide-react";
import dynamic from "next/dynamic";

const ReactQuill = lazy(() => import("react-quill-new"));
import "react-quill-new/dist/quill.snow.css";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/constants";

const MapComponent = dynamic(() => import("@/components/owner/branch-map"), { ssr: false });
const DigitalMenuManager = dynamic(() => import("@/components/owner/digital-menu-manager"), { ssr: false });
const AIMenuReviewModal = dynamic(() => import("@/components/owner/ai-menu-review-modal"), { ssr: false });

const FACILITIES = ["wifi", "parking", "ac", "outdoor", "rooftop", "valet", "delivery", "private_dining", "wheelchair"];
const VIBES = ["family_friendly", "casual", "fine_dining", "romantic", "cafe_vibes", "rooftop", "live_music", "sports_bar"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const GALLERY_CATEGORIES = ["Food", "Interior", "Vibes", "Location"];

const QUILL_MODULES = {
    toolbar: [
        [{ header: [2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
    ],
};

interface RestaurantForm {
    brandName: string;
    branchName: string;
    description: string;
    city: string;
    area: string;
    address: string;
    phone: string;
    coverImage: string;
    logo: string;
    galleryImages: { url: string; category: string }[];
    menuImages: string[];
    cuisines: string[];
    restaurantType: string[];
    vibes: string[];
    facilities: string[];
    priceRange: number;
    isApproved: boolean;
    isFeatured: boolean;
    isActive: boolean;
    metaTitle: string;
    metaDescription: string;
    slug: string; // Admin override
    platformCommissionRate: number;
    openingHours: { day: string; open: string; close: string; isClosed: boolean }[];
    latitude: number;
    longitude: number;
}

async function readApiError(res: Response, fallback: string) {
    try {
        const data = await res.json();
        return data?.error || fallback;
    } catch {
        return fallback;
    }
}

const DEFAULT_FORM: RestaurantForm = {
    brandName: "", branchName: "", description: "",
    city: "", area: "", address: "",
    phone: "",
    coverImage: "", logo: "", galleryImages: [], menuImages: [],
    cuisines: [], restaurantType: [], vibes: [], facilities: [],
    priceRange: 2, isApproved: false, isFeatured: false, isActive: true,
    metaTitle: "", metaDescription: "", slug: "",
    platformCommissionRate: 2.0,
    openingHours: DAYS.map(d => ({ day: d, open: "09:00", close: "23:00", isClosed: false })),
    latitude: 31.5204, longitude: 74.3587,
};



export default function AdminRestaurantsPage() {
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [page, setPage] = useState(1);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<RestaurantForm>({ ...DEFAULT_FORM });
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("basic");

    // Draft state
    const [draft, setDraft] = useState<any>(null);
    const initialFormRef = useRef<string | null>(null);

    // Wizard state for Add flow
    const [showWizard, setShowWizard] = useState(false);

    // AI Menu State
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedItems, setExtractedItems] = useState<any[]>([]);
    const [showAIModal, setShowAIModal] = useState(false);
    const [currentImageForAI, setCurrentImageForAI] = useState("");
    const [wizardStep, setWizardStep] = useState<"type" | "brand">("type");
    const [branchType, setBranchType] = useState<"single" | "multi">("single");
    const [existingBrand, setExistingBrand] = useState<any | null>(null);
    const [brandSearch, setBrandSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Name availability
    const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
    const [checkingName, setCheckingName] = useState(false);

    // Update all dates
    const [updatingDates, setUpdatingDates] = useState(false);

    const handleUpdateAllDates = async () => {
        if (!confirm("Sab restaurants ki updatedAt / lastmod date aaj ki date par update ho jaay gi. Sitemap bhi automatically update ho ga. Jaari rakhen?")) return;
        setUpdatingDates(true);
        try {
            const res = await fetch("/api/restaurants/admin", { method: "PATCH" });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed");
            alert(`${data?.data?.updated ?? data?.updated ?? "All"} restaurants ki date update ho gayi: ${new Date(data?.data?.date ?? data?.date).toLocaleString()}`);
        } catch (err: any) {
            alert(err?.message || "Date update fail ho gayi.");
        } finally {
            setUpdatingDates(false);
        }
    };

    // Dynamic data
    const [cities, setCities] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // Media upload
    const [uploading, setUploading] = useState(false);
    const [uploadTarget, setUploadTarget] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchRestaurants = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/restaurants/admin?search=${search}&status=${status}&page=${page}`);
            if (!res.ok) {
                throw new Error(await readApiError(res, "Failed to fetch restaurants."));
            }
            const data = await res.json();
            const payload = data.data || data;
            setRestaurants(payload.restaurants || []);
            setTotal(payload.total || 0);
        } catch (error: any) {
            setRestaurants([]);
            setTotal(0);
            alert(error?.message || "Failed to fetch restaurants.");
        }
        setLoading(false);
    };

    useEffect(() => { fetchRestaurants(); }, [search, status, page]);

    useEffect(() => {
        fetch("/api/cities").then(r => r.json()).then(d => setCities(Array.isArray(d) ? d : [])).catch(() => { });
        fetch("/api/categories").then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : d?.data || [])).catch(() => { });
        // Load existing draft on mount
        try {
            const saved = localStorage.getItem('admin_restaurant_draft');
            if (saved) setDraft(JSON.parse(saved));
        } catch(e) {}
    }, []);

    // Fetch areas when city changes in form
    useEffect(() => {
        if (!form.city) { setAreas([]); return; }
        const cityObj = cities.find(c => c.name === form.city);
        const citySlug = cityObj?.slug || form.city.toLowerCase().replace(/\s+/g, "-");
        fetch(`/api/areas?citySlug=${citySlug}`).then(r => r.json()).then(d => setAreas(Array.isArray(d) ? d : [])).catch(() => setAreas([]));
    }, [form.city, cities]);

    const handleAction = async (id: string, updates: any) => {
        const res = await fetch("/api/restaurants/admin", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updates }),
        });
        if (!res.ok) {
            alert(await readApiError(res, "Failed to update restaurant."));
            return;
        }
        fetchRestaurants();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Permanently delete this restaurant? This cannot be undone.")) return;
        const res = await fetch(`/api/restaurants/admin?id=${id}`, { method: "DELETE" });
        if (!res.ok) {
            alert(await readApiError(res, "Failed to delete restaurant."));
            return;
        }
        fetchRestaurants();
    };

    // ── Open Add/Edit Modal ──
    const openAddModal = () => {
        setEditingId(null);
        setForm({ ...DEFAULT_FORM });
        initialFormRef.current = JSON.stringify({ ...DEFAULT_FORM });
        setActiveTab("basic");
        setBranchType("single");
        setExistingBrand(null);
        setBrandSearch("");
        setSearchResults([]);
        setWizardStep("type");
        setNameAvailable(null);
        setShowWizard(true);
    };

    // ── Wizard: proceed from wizard to actual modal ──
    const proceedFromWizard = (mode: "new" | "existing", parent?: any) => {
        setShowWizard(false);
        if (mode === "existing" && parent) {
            setForm(f => {
                const updated = { ...f, brandName: parent.brandName, city: parent.city };
                initialFormRef.current = JSON.stringify(updated);
                return updated;
            });
            setExistingBrand(parent);
        } else {
            initialFormRef.current = JSON.stringify({ ...DEFAULT_FORM });
        }
        setShowModal(true);
    };

    // ── Search existing restaurants for brand picker ──
    useEffect(() => {
        if (!brandSearch.trim() || brandSearch.length < 2) { setSearchResults([]); return; }
        const t = setTimeout(() => {
            fetch(`/api/restaurants/admin?search=${encodeURIComponent(brandSearch)}&status=all&page=1`)
                .then(r => r.json())
                .then(d => {
                    const payload = d.data || d;
                    setSearchResults(payload.restaurants || []);
                })
                .catch(() => setSearchResults([]));
        }, 300);
        return () => clearTimeout(t);
    }, [brandSearch]);

    // ── Name availability check ──
    useEffect(() => {
        if (!form.brandName || !form.city || editingId) { setNameAvailable(null); return; }
        setCheckingName(true);
        const t = setTimeout(() => {
            fetch(`/api/owner/check-name?brandName=${encodeURIComponent(form.brandName)}&city=${encodeURIComponent(form.city)}`)
                .then(r => r.json())
                .then(d => setNameAvailable(d.available !== false))
                .catch(() => setNameAvailable(null))
                .finally(() => setCheckingName(false));
        }, 400);
        return () => clearTimeout(t);
    }, [form.brandName, form.city, editingId]);

    const openEditModal = (r: any) => {
        setEditingId(r._id);
        const newForm = {
            brandName: r.brandName || "",
            branchName: r.branchName || "Main Branch",
            description: r.description || "",
            city: r.city || "",
            area: r.area || "",
            address: r.address || "",
            phone: r.phone || "",
            coverImage: r.coverImage || "",
            logo: r.logo || "",
            galleryImages: Array.isArray(r.galleryImages) 
                ? r.galleryImages.map((img: any) => typeof img === "string" ? { url: img, category: "Food" } : img)
                : [],
            menuImages: r.menuImages || [],
            cuisines: r.cuisines || [],
            restaurantType: r.restaurantType || [],
            vibes: r.vibes || [],
            facilities: r.facilities || [],
            priceRange: r.priceRange || 2,
            isApproved: r.isApproved ?? false,
            isFeatured: r.isFeatured ?? false,
            isActive: r.isActive ?? true,
            metaTitle: r.metaTitle || "",
            metaDescription: r.metaDescription || "",
            slug: r.slug || "",
            platformCommissionRate: r.platformCommissionRate ?? 2.0,
            openingHours: r.openingHours?.length > 0 ? r.openingHours : DEFAULT_FORM.openingHours,
            latitude: r.location?.coordinates?.[1] || r.latitude || 31.5204,
            longitude: r.location?.coordinates?.[0] || r.longitude || 74.3587,
        };
        setForm(newForm);
        initialFormRef.current = JSON.stringify(newForm);
        setActiveTab("basic");
        setNameAvailable(null);
        setShowWizard(false);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.brandName || !form.city) { alert("Brand name and city are required."); return; }
        setSaving(true);
        try {
            const payload: any = {
                ...form,
                location: { type: "Point", coordinates: [form.longitude, form.latitude] },
            };
            delete payload.latitude;
            delete payload.longitude;

            if (editingId) {
                const res = await fetch("/api/restaurants/admin", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editingId, ...payload }),
                });
                if (!res.ok) {
                    throw new Error(await readApiError(res, "Failed to update restaurant."));
                }
            } else {
                const res = await fetch("/api/restaurants/admin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) {
                    throw new Error(await readApiError(res, "Failed to create restaurant."));
                }
            }
            setShowModal(false);
            localStorage.removeItem('admin_restaurant_draft');
            setDraft(null);
            fetchRestaurants();
        } catch (error: any) { alert(error?.message || "Failed to save."); }
        setSaving(false);
    };

    // ── Image Upload ──
    const handleImageUpload = async (files: FileList, target: string) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const formData = new FormData();
                formData.append("image", file);
                formData.append("slug", `restaurant-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
                const res = await fetch("/api/upload", { method: "POST", body: formData });
                if (!res.ok) {
                    throw new Error(await readApiError(res, "Failed to upload image."));
                }
                const data = await res.json();
                return data.url;
            });

            const urls = (await Promise.all(uploadPromises)).filter(url => Boolean(url));

            if (urls.length > 0) {
                if (target === "coverImage") setForm(p => ({ ...p, coverImage: urls[0] }));
                else if (target === "logo") setForm(p => ({ ...p, logo: urls[0] }));
                else if (target === "gallery") setForm(p => ({ 
                    ...p, 
                    galleryImages: [...p.galleryImages, ...urls.map(url => ({ url, category: "Food" }))] 
                }));
                else if (target === "menu") setForm(p => ({ ...p, menuImages: [...p.menuImages, ...urls] }));
            }
        } catch (error: any) {
            alert(error?.message || "Failed to upload image.");
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const triggerUpload = (target: string) => {
        setUploadTarget(target);
        fileInputRef.current?.click();
    };

    // ── Toggle Helpers ──
    const toggleArrayItem = (field: "cuisines" | "vibes" | "facilities" | "restaurantType", item: string) => {
        setForm(p => ({
            ...p,
            [field]: p[field].includes(item) ? p[field].filter(i => i !== item) : [...p[field], item]
        }));
    };

    // ── Auto-save to Draft ──
    useEffect(() => {
        if (!showModal) return;
        
        const currentFormStr = JSON.stringify(form);
        // Only save draft if the form actually diverged from the initial opening state
        if (initialFormRef.current === currentFormStr) return; 

        // Debounce typing to save once per second
        const t = setTimeout(() => {
            const payload = { form, editingId, timestamp: Date.now() };
            localStorage.setItem('admin_restaurant_draft', JSON.stringify(payload));
            setDraft(payload);
        }, 1000);

        return () => clearTimeout(t);
    }, [form, showModal, editingId]);

    const discardDraft = () => {
        if (!confirm("Permanently discard this unsaved draft?")) return;
        localStorage.removeItem('admin_restaurant_draft');
        setDraft(null);
    };

    const resumeDraft = () => {
        if (!draft) return;
        setForm(draft.form);
        setEditingId(draft.editingId);
        initialFormRef.current = JSON.stringify(draft.form); // Reset baseline to prevent instant re-save loop
        setActiveTab("basic");
        setShowWizard(false);
        setShowModal(true);
    };

    // ── Tabs ──
    const TABS = [
        { key: "basic", label: "Basic Info", icon: Building2 },
        { key: "location", label: "Location", icon: MapPin },
        { key: "contact", label: "Contact", icon: Phone },
        { key: "media", label: "Media", icon: ImageIcon },
        { key: "digital_menu", label: "Digital Menu", icon: UtensilsCrossed },
        { key: "classify", label: "Classification", icon: Tag },
        { key: "hours", label: "Hours", icon: Clock },
        { key: "seo", label: "SEO & Settings", icon: Settings },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-primary" /> Restaurants
                    </h1>
                    <p className="text-sm text-muted-foreground">{total} total restaurants</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleUpdateAllDates}
                        disabled={updatingDates}
                        title="Sab restaurants ki lastmod / updatedAt date aaj se update karo (sitemap auto-update)"
                        className="bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-600 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <RefreshCw className={`w-4 h-4 ${updatingDates ? "animate-spin" : ""}`} />
                        {updatingDates ? "Updating..." : "Update All Dates"}
                    </button>
                    <button onClick={openAddModal}
                        className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Restaurant
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search restaurants..." className="w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm" />
                </div>
                <div className="flex gap-2">
                    {["all", "approved", "pending"].map((s) => (
                        <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                            className={`text-xs px-3 py-2.5 rounded-xl font-bold capitalize transition ${status === s ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                            <Filter className="w-3 h-3 inline mr-1" />{s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-card border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                        <tr>
                            <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Restaurant</th>
                            <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Location</th>
                            <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Rating</th>
                            <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Status</th>
                            <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Featured</th>
                            <th className="text-right p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {draft && !loading && search === "" && status === "all" && (
                            <tr className="bg-primary/5 hover:bg-primary/5 transition-colors border-l-4 border-l-primary">
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                            <Save className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-primary-dark line-clamp-1">{draft.form.brandName || "Untitled Draft"}</p>
                                            <p className="text-[10px] text-primary-dark font-medium tracking-wide">— {draft.editingId ? "Unsaved Edits" : "Unsaved New Entry"}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <p className="text-sm text-primary-dark line-clamp-1">{draft.form.area || "—"}</p>
                                    <p className="text-xs text-primary/70">{draft.form.city || "—"}</p>
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-1 opacity-50">
                                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                        <span className="font-bold text-sm text-primary-dark">—</span>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary-dark border border-primary/30">
                                        DRAFT (Unsaved)
                                    </span>
                                </td>
                                <td className="p-3 text-xs text-primary-dark/80">
                                    Saved {new Date(draft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={resumeDraft} className="bg-primary/50 hover:bg-primary-dark text-white text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-sm">
                                            Resume
                                        </button>
                                        <button onClick={discardDraft} className="text-primary-dark hover:bg-red-50 hover:text-red-600 p-1.5 rounded-lg transition" title="Discard">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {loading ? (
                            <tr><td colSpan={6} className="p-10 text-center text-muted-foreground"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading...</td></tr>
                        ) : restaurants.length === 0 ? (
                            <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No restaurants found.</td></tr>
                        ) : restaurants.map((r) => (
                            <tr key={r._id} className="hover:bg-muted/20 transition-colors">
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        <img src={r.coverImage || "/placeholder.jpg"} alt={r.name} className="w-10 h-10 rounded-lg object-cover" />
                                        <div>
                                            <p className="font-bold text-sm">{r.name}</p>
                                            <p className="text-[10px] text-muted-foreground">/{r.slug}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <p className="text-sm">{r.area}</p>
                                    <p className="text-xs text-muted-foreground">{r.city}</p>
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-1">
                                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                        <span className="font-bold text-sm">{r.averageRating?.toFixed(1) || "—"}</span>
                                        <span className="text-[10px] text-muted-foreground">({r.totalReviews || 0})</span>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.isApproved ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary-dark"}`}>
                                        {r.isApproved ? "Approved" : "Pending"}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <button onClick={() => handleAction(r._id, { isFeatured: !r.isFeatured })}
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${r.isFeatured ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                                        {r.isFeatured ? "⭐ Featured" : "Normal"}
                                    </button>
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => openEditModal(r)}
                                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition" title="Edit">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        {!r.isApproved && (
                                            <button onClick={() => handleAction(r._id, { isApproved: true })} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg" title="Approve">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        {r.isApproved && (
                                            <button onClick={() => handleAction(r._id, { isApproved: false })} className="text-primary hover:bg-primary/5 p-1.5 rounded-lg" title="Unpublish">
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <a href={`/${(r.city || 'pk').toLowerCase()}/${r.slug}/`} target="_blank" className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg" title="View Live">
                                            <Eye className="w-4 h-4" />
                                        </a>
                                        <button onClick={() => handleDelete(r._id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {total > 20 && (
                <div className="flex justify-center gap-2">
                    <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="text-xs px-4 py-2 border rounded-xl disabled:opacity-50 font-bold hover:bg-gray-50 transition">Previous</button>
                    <span className="text-xs px-4 py-2 text-muted-foreground font-bold">Page {page} of {Math.ceil(total / 20)}</span>
                    <button onClick={() => setPage(page + 1)} disabled={restaurants.length < 20} className="text-xs px-4 py-2 border rounded-xl disabled:opacity-50 font-bold hover:bg-gray-50 transition">Next</button>
                </div>
            )}

            {/* ════════════════════ ADD/EDIT MODAL ════════════════════ */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-[1400px] h-full max-h-[98vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                        {/* ── Modal Header ── */}
                        <div className="bg-white border-b p-4 sm:p-5 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="font-bold text-lg">{editingId ? "Edit Restaurant" : "Add New Restaurant"}</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {editingId ? `Editing: ${form.brandName} — ${form.branchName}` : "Fill in all the details and save."}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5" /></button>
                        </div>

                        {/* ── Tab Navigation ── */}
                        <div className="border-b px-2 sm:px-5 flex gap-1 overflow-x-auto bg-gray-50/50 scrollbar-hide shrink-0">
                            {TABS.map(t => (
                                <button key={t.key} onClick={() => setActiveTab(t.key)}
                                    className={`flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === t.key
                                        ? "border-primary text-primary bg-primary/5"
                                        : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
                                        }`}>
                                    <t.icon className={`w-3 h-3 sm:w-4 sm:h-4 ${activeTab === t.key ? "text-primary" : "text-gray-400"}`} /> 
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* ── Tab Content ── */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-h-0 bg-white">

                            {/* ─── BASIC INFO ─── */}
                            {activeTab === "basic" && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Brand Name *</label>
                                            <input value={form.brandName} onChange={e => setForm({ ...form, brandName: e.target.value })}
                                                placeholder="Salt'n Pepper" className={`w-full border rounded-xl px-4 py-2.5 text-sm ${existingBrand ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                                readOnly={!!existingBrand} />
                                            <div className="flex items-center gap-2">
                                                {existingBrand && <span className="text-[10px] text-blue-600 font-bold">Branch of: {existingBrand.name}</span>}
                                                {!editingId && !existingBrand && checkingName && <span className="text-[10px] text-gray-400">Checking...</span>}
                                                {!editingId && !existingBrand && !checkingName && nameAvailable === true && form.city && <span className="text-[10px] text-green-600 font-bold">✓ Available</span>}
                                                {!editingId && !existingBrand && !checkingName && nameAvailable === false && <span className="text-[10px] text-red-600 font-bold">✗ Name taken in {form.city}</span>}
                                            </div>
                                        </div>
                                        {(!editingId ? branchType !== "single" || !!existingBrand : true) && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Branch Name</label>
                                                <input value={form.branchName} onChange={e => setForm({ ...form, branchName: e.target.value })}
                                                    placeholder="DHA Phase 5 Branch" className="w-full border rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Slug preview */}
                                    {form.brandName && form.city && (
                                        <div className="bg-gray-50 rounded-lg px-4 py-2 flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">URL Preview:</span>
                                            <code className="text-xs text-primary font-mono">
                                                /{form.city.toLowerCase()}/{editingId && form.slug ? form.slug.replace(/^-|-$/g, "") : `${form.brandName.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")}${form.branchName && form.branchName.toLowerCase() !== "main branch" ? `-${form.branchName.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")}` : ""}`}
                                            </code>
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Description</label>
                                        <div className="border rounded-xl overflow-hidden">
                                            <Suspense fallback={<div className="p-6 text-center text-sm text-gray-400">Loading editor...</div>}>
                                                <ReactQuill theme="snow" value={form.description}
                                                    onChange={(val: string) => setForm({ ...form, description: val })}
                                                    modules={QUILL_MODULES} placeholder="Restaurant description..." />
                                            </Suspense>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Price Range</label>
                                            <select value={form.priceRange} onChange={e => setForm({ ...form, priceRange: parseInt(e.target.value) })}
                                                className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white">
                                                <option value={1}>₨ — Budget</option>
                                                <option value={2}>₨₨ — Mid-range</option>
                                                <option value={3}>₨₨₨ — Premium</option>
                                                <option value={4}>₨₨₨₨ — Fine Dining</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Status</label>
                                            <div className="flex gap-3 pt-1">
                                                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.isApproved} onChange={e => setForm({ ...form, isApproved: e.target.checked })} className="rounded" /> Approved</label>
                                                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={e => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" /> Featured</label>
                                                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" /> Active</label>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Commission %</label>
                                            <input value={form.platformCommissionRate} onChange={e => setForm({ ...form, platformCommissionRate: parseFloat(e.target.value) || 0 })}
                                                type="number" step="0.1" className="w-full border rounded-xl px-4 py-2.5 text-sm" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ─── LOCATION ─── */}
                            {activeTab === "location" && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">City *</label>
                                            <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value, area: "" })}
                                                className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white">
                                                <option value="">Select City</option>
                                                {cities.map(c => <option key={c._id || c.slug} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Area</label>
                                            <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}
                                                disabled={!form.city}
                                                className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white disabled:bg-gray-50 disabled:cursor-not-allowed">
                                                <option value="">{form.city ? "Select Area" : "Select city first"}</option>
                                                {areas.map(a => <option key={a._id || a.slug} value={a.name}>{a.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Full Address</label>
                                        <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                                            placeholder="123 Main Blvd, DHA Phase 5, Lahore" className="w-full border rounded-xl px-4 py-2.5 text-sm" />
                                    </div>
                                    {/* Interactive Map */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Pin Location on Map</label>
                                        <div className="border rounded-xl overflow-hidden h-[350px]">
                                            <MapComponent
                                                lat={form.latitude}
                                                lng={form.longitude}
                                                address={form.address}
                                                onLocationChange={(lat, lng, address) => {
                                                    setForm(f => ({
                                                        ...f,
                                                        latitude: lat,
                                                        longitude: lng,
                                                        ...(address ? { address } : {}),
                                                    }));
                                                }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400">Click on the map or drag the pin to set the exact location. Use the search bar to find a place.</p>
                                    </div>
                                </div>
                            )}

                            {/* ─── CONTACT ─── */}
                            {activeTab === "contact" && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {[
                                            { label: "Phone", key: "phone", placeholder: "+92 42 35756041" },
                                            { label: "Instagram", key: "instagram", placeholder: "https://instagram.com/..." },
                                            { label: "Facebook", key: "facebook", placeholder: "https://facebook.com/..." },
                                        ].map(f => (
                                            <div key={f.key} className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">{f.label}</label>
                                                <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                                    placeholder={f.placeholder} className="w-full border rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ─── MEDIA ─── */}
                            {activeTab === "media" && (
                                <div className="space-y-6">
                                    <input ref={fileInputRef} type="file" accept="image/*" multiple={uploadTarget === "gallery" || uploadTarget === "menu"} className="hidden"
                                        onChange={(e) => { if (e.target.files) handleImageUpload(e.target.files, uploadTarget); }} />

                                    {/* Cover */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Cover Image</label>
                                        {form.coverImage ? (
                                            <div className="relative group rounded-xl overflow-hidden border h-48">
                                                <img src={form.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <button type="button" onClick={() => triggerUpload("coverImage")} className="bg-white text-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 transition">Change</button>
                                                    <button type="button" onClick={() => setForm(p => ({ ...p, coverImage: "" }))} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 transition">Remove</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => triggerUpload("coverImage")} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                                                <Upload className="w-6 h-6 text-gray-400" />
                                                <span className="text-xs font-bold text-gray-500">Upload Cover Image</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Logo */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Logo</label>
                                        <div className="flex items-center gap-4">
                                            {form.logo ? (
                                                <div className="relative group">
                                                    <img src={form.logo} alt="Logo" className="w-20 h-20 rounded-xl object-cover border" />
                                                    <button type="button" onClick={() => setForm(p => ({ ...p, logo: "" }))}
                                                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><X className="w-3 h-3" /></button>
                                                </div>
                                            ) : null}
                                            <button type="button" onClick={() => triggerUpload("logo")} className="h-20 px-6 border-2 border-dashed border-gray-300 rounded-xl flex items-center gap-2 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                                                <Upload className="w-4 h-4 text-gray-400" />
                                                <span className="text-xs font-bold text-gray-500">{form.logo ? "Replace" : "Upload"} Logo</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Gallery */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Gallery Images ({form.galleryImages.length})</label>
                                        <div className="flex flex-wrap gap-2">
                                            {form.galleryImages.map((img, i) => (
                                                <div key={i} className="relative group flex flex-col gap-1">
                                                    <div className="relative group">
                                                        <img src={img.url} alt={`Gallery ${i + 1}`} className="w-24 h-24 rounded-xl object-cover border" />
                                                        <button type="button" onClick={() => setForm(p => ({ ...p, galleryImages: p.galleryImages.filter((_, idx) => idx !== i) }))}
                                                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm z-10"><X className="w-3 h-3" /></button>
                                                    </div>
                                                    <select 
                                                        value={img.category} 
                                                        onChange={(e) => {
                                                            const newGallery = [...form.galleryImages];
                                                            newGallery[i] = { ...newGallery[i], category: e.target.value };
                                                            setForm(p => ({ ...p, galleryImages: newGallery }));
                                                        }}
                                                        className="text-[9px] font-bold bg-white border border-gray-200 rounded-md px-1 py-0.5 outline-none focus:border-primary"
                                                    >
                                                        {GALLERY_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                    </select>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => triggerUpload("gallery")} className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                                                <Plus className="w-5 h-5 text-gray-400" />
                                                <span className="text-[9px] font-bold text-gray-400">Add</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Menu Images */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Menu Images ({form.menuImages.length})</label>
                                            {form.menuImages.length > 0 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => setActiveTab("digital_menu")}
                                                    className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 hover:bg-amber-100 transition"
                                                >
                                                    <Sparkles className="w-3 h-3" /> Auto-extract Menu Items
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {form.menuImages.map((img, i) => (
                                                <div key={i} className="relative group">
                                                    <img src={img} alt={`Menu ${i + 1}`} className="w-24 h-24 rounded-xl object-cover border" />
                                                    <button type="button" onClick={() => setForm(p => ({ ...p, menuImages: p.menuImages.filter((_, idx) => idx !== i) }))}
                                                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><X className="w-3 h-3" /></button>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => triggerUpload("menu")} className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                                                <Plus className="w-5 h-5 text-gray-400" />
                                                <span className="text-[9px] font-bold text-gray-400">Add</span>
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-gray-400">Upload clear photos of your physical menu. AI will read them to create your digital menu items.</p>
                                    </div>

                                    {uploading && (
                                        <div className="text-center text-sm text-primary font-bold py-2">
                                            <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Uploading to CDN...
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ─── CLASSIFICATION ─── */}
                            {activeTab === "classify" && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Service Type (Restaurant Type)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {SERVICE_TYPES.map(t => (
                                                <button key={t} type="button" onClick={() => toggleArrayItem("restaurantType", t)}
                                                    className={`text-xs px-3.5 py-2 rounded-xl border transition font-bold ${form.restaurantType.includes(t)
                                                        ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                                        }`}>{SERVICE_TYPE_LABELS[t] || t}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Cuisines</label>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map(c => (
                                                <button key={c._id || c.slug} type="button" onClick={() => toggleArrayItem("cuisines", c.name || c.slug)}
                                                    className={`text-xs px-3 py-1.5 rounded-full border transition font-bold ${form.cuisines.includes(c.name || c.slug)
                                                        ? "bg-primary text-white border-primary" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                                        }`}>{c.name || c.slug}</button>
                                            ))}
                                        </div>
                                        {form.cuisines.length > 0 && <p className="text-[10px] text-primary font-bold">{form.cuisines.length} selected</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Vibes</label>
                                        <div className="flex flex-wrap gap-2">
                                            {VIBES.map(v => (
                                                <button key={v} type="button" onClick={() => toggleArrayItem("vibes", v)}
                                                    className={`text-xs px-3 py-1.5 rounded-full border transition font-bold capitalize ${form.vibes.includes(v)
                                                        ? "bg-blue-500 text-white border-blue-500" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                                        }`}>{v.replace(/_/g, " ")}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Facilities</label>
                                        <div className="flex flex-wrap gap-2">
                                            {FACILITIES.map(f => (
                                                <button key={f} type="button" onClick={() => toggleArrayItem("facilities", f)}
                                                    className={`text-xs px-3 py-1.5 rounded-full border transition font-bold capitalize ${form.facilities.includes(f)
                                                        ? "bg-green-500 text-white border-green-500" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                                        }`}>{f.replace(/_/g, " ")}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ─── OPENING HOURS ─── */}
                            {activeTab === "hours" && (
                                <div className="space-y-4">
                                    <p className="text-xs text-gray-500">Set the opening hours for each day. Use the presets below for quick setup.</p>

                                    {/* Quick Presets Toolbar */}
                                    <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border p-4 space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Quick Presets</p>
                                        <div className="flex flex-wrap gap-2">
                                            <button type="button" onClick={() => {
                                                setForm(f => ({
                                                    ...f,
                                                    openingHours: f.openingHours.map(h => ({ ...h, open: "00:00", close: "23:59", isClosed: false }))
                                                }));
                                            }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-bold hover:bg-green-100 transition-all active:scale-95">
                                                <Clock className="w-3.5 h-3.5" /> 24 Hours Open
                                            </button>

                                            <button type="button" onClick={() => {
                                                const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
                                                setForm(f => ({
                                                    ...f,
                                                    openingHours: f.openingHours.map(h => ({
                                                        ...h,
                                                        isClosed: !weekdays.includes(h.day)
                                                    }))
                                                }));
                                            }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-all active:scale-95">
                                                Mon-Fri Only
                                            </button>

                                            <button type="button" onClick={() => {
                                                const weekend = ["Saturday", "Sunday"];
                                                setForm(f => ({
                                                    ...f,
                                                    openingHours: f.openingHours.map(h => ({
                                                        ...h,
                                                        isClosed: !weekend.includes(h.day)
                                                    }))
                                                }));
                                            }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-all active:scale-95">
                                                Sat-Sun Only
                                            </button>

                                            <button type="button" onClick={() => {
                                                const allClosed = form.openingHours.every(h => h.isClosed);
                                                setForm(f => ({
                                                    ...f,
                                                    openingHours: f.openingHours.map(h => ({ ...h, isClosed: !allClosed }))
                                                }));
                                            }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-100 transition-all active:scale-95">
                                                {form.openingHours.every(h => h.isClosed) ? "Open All Days" : "Close All Days"}
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bulk Set:</span>
                                                <input type="time" id="bulk-open" defaultValue="09:00" className="border rounded-lg px-2 py-1.5 text-sm w-[100px]" />
                                                <span className="text-xs text-gray-400">to</span>
                                                <input type="time" id="bulk-close" defaultValue="23:00" className="border rounded-lg px-2 py-1.5 text-sm w-[100px]" />
                                            </div>
                                            <button type="button" onClick={() => {
                                                const openEl = document.getElementById("bulk-open") as HTMLInputElement;
                                                const closeEl = document.getElementById("bulk-close") as HTMLInputElement;
                                                if (!openEl?.value || !closeEl?.value) return;
                                                setForm(f => ({
                                                    ...f,
                                                    openingHours: f.openingHours.map(h =>
                                                        h.isClosed ? h : { ...h, open: openEl.value, close: closeEl.value }
                                                    )
                                                }));
                                            }} className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all active:scale-95 whitespace-nowrap flex-1 sm:flex-none text-center">
                                                Apply to All Open Days
                                            </button>
                                        </div>
                                    </div>

                                    {/* Per-Day Rows */}
                                    {form.openingHours.map((h, i) => (
                                        <div key={h.day} className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${h.isClosed ? "bg-red-50/50 border-red-100" : "bg-gray-50 border-gray-200"}`}>
                                            <span className="w-24 text-sm font-bold">{h.day}</span>
                                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                <input type="checkbox" checked={h.isClosed} onChange={e => {
                                                    const newHours = [...form.openingHours];
                                                    newHours[i] = { ...h, isClosed: e.target.checked };
                                                    setForm({ ...form, openingHours: newHours });
                                                }} className="rounded" />
                                                Closed
                                            </label>
                                            {!h.isClosed && (
                                                <>
                                                    <input type="time" value={h.open} onChange={e => {
                                                        const newHours = [...form.openingHours];
                                                        newHours[i] = { ...h, open: e.target.value };
                                                        setForm({ ...form, openingHours: newHours });
                                                    }} className="border rounded-lg px-2 py-1.5 text-sm" />
                                                    <span className="text-xs text-gray-400">to</span>
                                                    <input type="time" value={h.close} onChange={e => {
                                                        const newHours = [...form.openingHours];
                                                        newHours[i] = { ...h, close: e.target.value };
                                                        setForm({ ...form, openingHours: newHours });
                                                    }} className="border rounded-lg px-2 py-1.5 text-sm" />
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ─── DIGITAL MENU ─── */}
                            {activeTab === "digital_menu" && editingId && (
                                <div className="space-y-6">
                                    <DigitalMenuManager 
                                        restaurantId={editingId} 
                                        branchImages={[
                                            ...form.galleryImages.map(img => typeof img === 'string' ? img : img.url), 
                                            ...form.menuImages
                                        ]} 
                                        menuImages={form.menuImages}
                                    />
                                </div>
                            )}

                            {/* ─── SEO & SETTINGS ─── */}
                            {activeTab === "seo" && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Meta Title</label>
                                        <input value={form.metaTitle} onChange={e => setForm({ ...form, metaTitle: e.target.value })}
                                            placeholder="Auto-generated if empty" className="w-full border rounded-xl px-4 py-2.5 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Meta Description</label>
                                        <textarea value={form.metaDescription} onChange={e => setForm({ ...form, metaDescription: e.target.value })}
                                            rows={3} placeholder="Auto-generated if empty" className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none" />
                                        <p className="text-[10px] text-gray-400">{form.metaDescription.length}/160 characters</p>
                                    </div>
                                    <div className="space-y-1.5 border-t pt-4 mt-4">
                                        <label className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                                            Custom URL Slug <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">Admin Only</span>
                                        </label>
                                        <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                                            placeholder={editingId ? "leave-empty-to-keep-existing" : "leave-empty-to-auto-generate"} className="w-full border border-red-200 focus:border-red-500 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-700" />
                                        {form.city && (
                                            <p className="text-[10px] text-gray-500">
                                                Result: <code className="font-bold text-gray-800">/{form.city.toLowerCase()}/{form.slug || "<auto-generated>"}/</code>
                                            </p>
                                        )}
                                        <p className="text-[10px] text-primary font-medium max-w-lg">
                                            Warning: Changing this for a live restaurant will break existing links and SEO indexing unless a redirect is setup. {editingId ? "Leave it unchanged to preserve the original URL even if you change the restaurant name." : ""}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Modal Footer ── */}
                        <div className="bg-white border-t p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 shrink-0">
                            <p className="text-[10px] text-gray-400 text-center sm:text-left">
                                {editingId ? "Changes save directly to the database." : "Restaurant will be created with the details you provide."}
                            </p>
                            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                                <button onClick={() => setShowModal(false)} className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 border rounded-xl text-xs sm:text-sm font-bold hover:bg-gray-50 transition">Cancel</button>
                                <button onClick={handleSave} disabled={saving}
                                    className="flex-1 sm:flex-none bg-primary text-white px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-primary-dark transition disabled:opacity-50 flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> {saving ? "Saving..." : editingId ? "Update Restaurant" : "Create Restaurant"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════ ADD WIZARD ════════════════════ */}
            {showWizard && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-lg p-8 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto">
                                <Store className="w-7 h-7 text-primary" />
                            </div>
                            <h2 className="text-xl font-black tracking-tight">Add New Restaurant</h2>
                            <p className="text-sm text-gray-500">Choose the type of listing you want to create.</p>
                        </div>

                        {wizardStep === "type" && (
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => { setBranchType("single"); proceedFromWizard("new"); }}
                                    className="border-2 border-gray-200 hover:border-primary rounded-2xl p-5 text-center space-y-2 transition hover:bg-primary/5 group">
                                    <Store className="w-8 h-8 text-gray-400 mx-auto group-hover:text-primary transition" />
                                    <p className="font-bold text-sm">Single Branch</p>
                                    <p className="text-[10px] text-gray-400">New restaurant with one location</p>
                                </button>
                                <button onClick={() => { setBranchType("multi"); setWizardStep("brand"); }}
                                    className="border-2 border-gray-200 hover:border-primary rounded-2xl p-5 text-center space-y-2 transition hover:bg-primary/5 group">
                                    <GitBranch className="w-8 h-8 text-gray-400 mx-auto group-hover:text-primary transition" />
                                    <p className="font-bold text-sm">Multiple Branches</p>
                                    <p className="text-[10px] text-gray-400">Chain with multiple locations</p>
                                </button>
                            </div>
                        )}

                        {wizardStep === "brand" && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => proceedFromWizard("new")}
                                        className="border-2 border-gray-200 hover:border-primary rounded-xl p-4 text-center space-y-1 transition hover:bg-primary/5">
                                        <Plus className="w-5 h-5 text-gray-400 mx-auto" />
                                        <p className="font-bold text-xs">New Brand</p>
                                        <p className="text-[10px] text-gray-400">Create a brand-new restaurant</p>
                                    </button>
                                    <div className="border-2 border-primary/20 bg-primary/5 rounded-xl p-4 text-center space-y-1">
                                        <Building2 className="w-5 h-5 text-primary mx-auto" />
                                        <p className="font-bold text-xs text-primary">Existing Brand</p>
                                        <p className="text-[10px] text-gray-500">Add branch to posted restaurant</p>
                                    </div>
                                </div>

                                {/* Search existing restaurants */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-600">Search existing restaurant</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input value={brandSearch} onChange={e => setBrandSearch(e.target.value)}
                                            placeholder="Type restaurant name..." className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm" />
                                    </div>
                                    {searchResults.length > 0 && (
                                        <div className="border rounded-xl max-h-48 overflow-y-auto divide-y">
                                            {searchResults.map(r => (
                                                <button key={r._id} onClick={() => proceedFromWizard("existing", r)}
                                                    className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3 transition">
                                                    <img src={r.coverImage || "/placeholder.jpg"} alt="" className="w-9 h-9 rounded-lg object-cover border" />
                                                    <div>
                                                        <p className="text-sm font-bold">{r.brandName}</p>
                                                        <p className="text-[10px] text-gray-400">{r.area}, {r.city} — /{r.slug}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                            {wizardStep === "brand" ? (
                                <button onClick={() => setWizardStep("type")} className="text-xs font-bold text-gray-500 hover:text-gray-700 transition">← Back</button>
                            ) : <span />}
                            <button onClick={() => setShowWizard(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600 transition">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
