"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useBranch } from "../owner-shell";
import { saveBranchToDevice } from "../branch-selector";
import {
    Loader2, ArrowRight, Store, MapPin, Search,
    Building2, Phone, FileText, Tag, Navigation, Lock, ChefHat
} from "lucide-react";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/constants";
import dynamic from "next/dynamic";

const ReactQuill = lazy(() => import("react-quill-new"));
import "react-quill-new/dist/quill.snow.css";

// Lazy-load map to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/owner/branch-map"), { ssr: false });

export default function NewBranchPage() {
    const { data: session } = useSession();
    const { branches, refreshBranches } = useBranch();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
    const [checkingName, setCheckingName] = useState(false);
    const [branchPin, setBranchPin] = useState(["", "", "", ""]);
    const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const branchType = (session?.user as any)?.branchType || "single";
    const businessName = (session?.user as any)?.businessName || "";

    // ── Block single-branch owners with existing branches ──
    const canAdd = branchType === "multi" || branches.length === 0;

    // ── Dynamic data ──
    const [cities, setCities] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [areasLoading, setAreasLoading] = useState(false);

    // ── Form state ──
    const [form, setForm] = useState({
        brandName: "",
        branchName: "",
        city: "",
        area: "",
        areas: [] as string[],
        address: "",
        phone: "",
        description: "",
        cuisines: [] as string[],
        restaurantType: [] as string[],
        lat: 31.5204,
        lng: 74.3587,
    });

    // ── Set brandName from session ──
    useEffect(() => {
        if (businessName && !form.brandName) {
            setForm(f => ({ ...f, brandName: businessName }));
        }
    }, [businessName, form.brandName]);

    // ── Fetch cities ──
    useEffect(() => {
        fetch("/api/cities").then(r => r.json()).then(d => {
            const arr = Array.isArray(d) ? d : d?.data || [];
            setCities(arr);
        }).catch(() => { });
    }, []);

    // ── Fetch categories ──
    useEffect(() => {
        fetch("/api/categories").then(r => r.json()).then(d => {
            const arr = Array.isArray(d) ? d : d?.data || [];
            setCategories(arr);
        }).catch(() => { });
    }, []);

    // ── Fetch areas when city changes ──
    useEffect(() => {
        if (!form.city) { setAreas([]); return; }
        setAreasLoading(true);
        const cityObj = cities.find(c => c.name === form.city);
        const citySlug = cityObj?.slug || form.city.toLowerCase();
        fetch(`/api/areas?citySlug=${citySlug}`).then(r => r.json()).then(d => {
            const arr = Array.isArray(d) ? d : d?.data || [];
            setAreas(arr);
        }).catch(() => setAreas([])).finally(() => setAreasLoading(false));
    }, [form.city, cities]);

    // ── Check brand name availability logic removed (since owner already owns brand) ──

    // ── Map location callbacks ──
    const handleMapLocationChange = (lat: number, lng: number, address?: string) => {
        setForm(f => ({
            ...f,
            lat,
            lng,
            ...(address ? { address } : {}),
        }));
    };

    // ── PIN input helpers ──
    const handlePinDigit = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return;
        const updated = [...branchPin];
        updated[index] = value;
        setBranchPin(updated);
        if (value && index < 3) pinInputRefs.current[index + 1]?.focus();
    };
    const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !branchPin[index] && index > 0) {
            const updated = [...branchPin];
            updated[index - 1] = "";
            setBranchPin(updated);
            pinInputRefs.current[index - 1]?.focus();
        }
    };

    // ── Submit ──
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.brandName.trim()) { setError("Brand name is required"); return; }
        if (!form.city) { setError("Please select a city"); return; }
        if (!form.address.trim()) { setError("Address is required"); return; }

        // PIN validation
        const pinStr = branchPin.join("");
        if (pinStr.length !== 4) { setError("Please set a 4-digit Access PIN for this branch"); return; }

        setSaving(true);
        setError("");
        try {
            const res = await fetch("/api/owner/restaurant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    areas: Array.from(new Set([form.area, ...form.areas])),
                    branchAccessPin: pinStr,
                    ownerId: (session?.user as any)?.id,
                    location: {
                        type: "Point",
                        coordinates: [form.lng, form.lat],
                    },
                }),
            });
            if (res.ok) {
                const data = await res.json();
                const newBranch = data?.data || data;
                // Auto-lock device to the newly created branch
                if (newBranch?._id) saveBranchToDevice(newBranch._id);
                await refreshBranches();
                router.push("/owner");
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to create");
            }
        } catch {
            setError("Network error");
        }
        setSaving(false);
    };

    // ── Block Screen ──
    if (!canAdd) {
        return (
            <div className="max-w-xl mx-auto text-center space-y-4 py-16">
                <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto">
                    <Store className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-black text-gray-900">Single Branch Account</h2>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Your account is registered as a single-branch restaurant. To add more branches, switch to "Multiple Branches" in your Profile Settings.
                </p>
                <button onClick={() => router.push("/owner/profile")}
                    className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition">
                    Go to Settings
                </button>
            </div>
        );
    }

    // ── Toggle cuisine (Max 3) ──
    const toggleCuisine = (slug: string) => {
        setForm(f => {
            if (f.cuisines.includes(slug)) {
                return { ...f, cuisines: f.cuisines.filter(c => c !== slug) };
            }
            if (f.cuisines.length >= 3) {
                // Optionally could set an error state here, but simple return is robust
                return f;
            }
            return { ...f, cuisines: [...f.cuisines, slug] };
        });
    };

    // ── Toggle additional areas ──
    const toggleArea = (areaName: string) => {
        setForm(f => ({
            ...f,
            areas: f.areas.includes(areaName)
                ? f.areas.filter(a => a !== areaName)
                : [...f.areas, areaName]
        }));
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto">
                    <Store className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-black tracking-tight">
                    {branchType === "single" ? "Add Your Restaurant" : "Add New Branch"}
                </h1>
                <p className="text-sm text-gray-500">Fill in the details for your new location.</p>
            </div>

            {error && <div className="bg-red-50 text-red-700 text-sm font-bold px-4 py-3 rounded-xl border border-red-200">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── Brand & Branch Name ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                    <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2 border-b pb-3">
                        <Building2 className="w-4 h-4 text-primary" /> Brand Identity
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">Brand Name</label>
                            <input
                                value={form.brandName}
                                readOnly
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] text-primary">🔒 Set during registration</p>
                            </div>
                        </div>
                        {branchType !== "single" && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-600">Branch Name</label>
                                <input
                                    value={form.branchName}
                                    onChange={e => setForm({ ...form, branchName: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                                    placeholder="DHA Phase 5 Branch"
                                />
                            </div>
                        )}
                    </div>

                    {/* Slug Preview */}
                    {form.brandName && form.city && (
                        <div className="bg-gray-50 rounded-lg px-4 py-2.5 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">URL Preview:</span>
                            <code className="text-xs text-primary font-mono">
                                /{form.city.toLowerCase()}/{form.brandName.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")}{(branchType !== "single" && form.branchName && form.branchName.toLowerCase() !== "main branch") ? `-${form.branchName.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")}` : ""}/
                            </code>
                        </div>
                    )}
                </div>

                {/* ── Location ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                    <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2 border-b pb-3">
                        <MapPin className="w-4 h-4 text-primary" /> Location
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">City *</label>
                            <select
                                value={form.city}
                                onChange={e => setForm({ ...form, city: e.target.value, area: "" })}
                                required
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white"
                            >
                                <option value="">Select City</option>
                                {cities.map(c => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">Area *</label>
                            <select
                                value={form.area}
                                onChange={e => setForm({ ...form, area: e.target.value })}
                                required
                                disabled={!form.city || areasLoading}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                            >
                                <option value="">{areasLoading ? "Loading..." : form.city ? "Select Area" : "Select city first"}</option>
                                {areas.map(a => <option key={a._id || a.name} value={a.name}>{a.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* ── Additional Areas ── */}
                    {form.city && areasLoading === false && areas.length > 1 && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-600">Additional Areas (Optional)</label>
                            <p className="text-[10px] text-gray-400">Select any other areas your branch covers or belongs to.</p>
                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                                {areas.filter(a => a.name !== form.area).map(a => (
                                    <button
                                        key={a._id || a.name}
                                        type="button"
                                        onClick={() => toggleArea(a.name)}
                                        className={`text-[11px] px-3 py-1.5 rounded-full border transition font-bold ${
                                            form.areas.includes(a.name)
                                                ? "bg-primary text-white border-primary shadow-sm"
                                                : "bg-white text-gray-600 hover:bg-gray-100 border-gray-200"
                                        }`}
                                    >
                                        {a.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600">Full Address *</label>
                        <div className="relative">
                            <input
                                value={form.address}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition pr-10"
                                placeholder="123 Main Blvd, DHA Phase 5, Lahore"
                            />
                            <Navigation className="w-4 h-4 text-gray-400 absolute right-3 top-3.5" />
                        </div>
                    </div>

                    {/* ── Interactive Map ── */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Pin Your Location on Map
                        </label>
                        <p className="text-[10px] text-gray-400">Drag the pin or type your address to set the exact location. Map and address stay in sync.</p>
                        <div className="rounded-xl overflow-hidden border border-gray-200 h-[300px]">
                            <MapComponent
                                lat={form.lat}
                                lng={form.lng}
                                address={form.address}
                                onLocationChange={handleMapLocationChange}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Service Type ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                    <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2 border-b pb-3">
                        <ChefHat className="w-4 h-4 text-primary" /> Service Type
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {SERVICE_TYPES.map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => {
                                    setForm(f => {
                                        const curr = f.restaurantType || [];
                                        return { ...f, restaurantType: curr.includes(t) ? curr.filter(x => x !== t) : [...curr, t] };
                                    });
                                }}
                                className={`text-xs px-4 py-2 rounded-full border transition font-bold ${form.restaurantType.includes(t)
                                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200"
                                    }`}
                            >
                                {SERVICE_TYPE_LABELS[t] || t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Categories / Cuisines ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                    <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2 border-b pb-3">
                        <Tag className="w-4 h-4 text-primary" /> Cuisines / Categories
                    </h2>
                    <p className="text-xs text-primary font-bold">⚠️ You can select a maximum of 3 cuisines for your branch.</p>
                    <div className="flex flex-wrap gap-2">
                        {categories.map(c => (
                            <button
                                key={c._id || c.slug}
                                type="button"
                                onClick={() => toggleCuisine(c.name || c.slug)}
                                className={`text-xs px-4 py-2 rounded-full border transition font-bold ${form.cuisines.includes(c.name || c.slug)
                                    ? "bg-primary text-white border-primary shadow-sm"
                                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200"
                                    }`}
                            >
                                {c.name || c.slug}
                            </button>
                        ))}
                    </div>
                    {form.cuisines.length > 0 && (
                        <p className="text-[10px] text-primary font-bold">{form.cuisines.length} selected</p>
                    )}
                </div>

                {/* ── Contact & Description ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                    <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2 border-b pb-3">
                        <Phone className="w-4 h-4 text-primary" /> Contact & Description
                    </h2>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600">Phone Number</label>
                        <input
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                            placeholder="+92 42 35756041"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600">Description</label>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <Suspense fallback={<div className="p-6 text-center text-gray-400 text-sm">Loading editor...</div>}>
                                <ReactQuill
                                    theme="snow"
                                    value={form.description}
                                    onChange={(val: string) => setForm({ ...form, description: val })}
                                    modules={{
                                        toolbar: [
                                            [{ header: [2, 3, false] }],
                                            ["bold", "italic", "underline"],
                                            [{ list: "ordered" }, { list: "bullet" }],
                                            ["link"],
                                            ["clean"],
                                        ],
                                    }}
                                    placeholder="Tell customers what makes your restaurant special..."
                                />
                            </Suspense>
                        </div>
                        <p className="text-[10px] text-gray-400">Use the toolbar to format your description with headings, lists, and links for better SEO.</p>
                    </div>
                </div>

                {/* ── Branch Access PIN ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                    <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2 border-b pb-3">
                        <Lock className="w-4 h-4 text-primary" /> Branch Access PIN
                    </h2>
                    <p className="text-xs text-gray-500">
                        Set a 4-digit PIN to secure this branch. This PIN will be required whenever any device tries to manage this branch.
                    </p>
                    <div className="flex gap-3 justify-center py-2">
                        {branchPin.map((digit, i) => (
                            <input
                                key={i}
                                ref={el => { pinInputRefs.current[i] = el; }}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handlePinDigit(i, e.target.value)}
                                onKeyDown={e => handlePinKeyDown(i, e)}
                                className="w-14 h-14 rounded-xl text-center text-xl font-black border-2 border-gray-200 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 bg-gray-50"
                            />
                        ))}
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                        <p className="text-[11px] text-primary-dark font-medium">⚠️ <strong>Do not forget this PIN.</strong> It will be required to access this branch from any device.</p>
                    </div>
                </div>

                {/* ── Submit ── */}
                <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm hover:bg-primary-dark transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {saving ? "Creating..." : "Create Branch & Continue Setup"}
                </button>
            </form>
        </div>
    );
}
