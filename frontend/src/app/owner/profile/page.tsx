"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useBranch } from "../owner-shell";
import {
    Save, Loader2, MapPin, Phone as PhoneIcon,
    AlertTriangle, Building, GitBranch, Shield, CheckCircle, Store
} from "lucide-react";
import Link from "next/link";
import { FACILITIES, VIBES, FACILITY_LABELS, VIBE_LABELS, SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/constants";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("@/components/owner/branch-map"), { ssr: false });

export default function OwnerProfilePage() {
    const { data: session, update: updateSession } = useSession();
    const { branch } = useBranch();
    const [form, setForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const [cities, setCities] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [areasLoading, setAreasLoading] = useState(false);

    const branchType = (session?.user as any)?.branchType || "single";

    useEffect(() => {
        if (branch) setForm({ ...branch });
    }, [branch]);

    useEffect(() => {
        fetch("/api/cities").then(r => r.json()).then(d => {
            setCities(Array.isArray(d) ? d : d?.data || []);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        fetch("/api/categories").then(r => r.json()).then(d => {
            setCategories(Array.isArray(d) ? d : d?.data || []);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (!form.city) { setAreas([]); return; }
        setAreasLoading(true);
        const cityObj = cities.find(c => c.name === form.city);
        const citySlug = cityObj?.slug || form.city.toLowerCase();
        fetch(`/api/areas?citySlug=${citySlug}`).then(r => r.json()).then(d => {
            setAreas(Array.isArray(d) ? d : d?.data || []);
        }).catch(() => setAreas([])).finally(() => setAreasLoading(false));
    }, [form.city, cities]);

    const handleSave = async () => {
        setSaving(true);
        setMsg("");
        await fetch("/api/owner/restaurant", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: branch._id,
                ...form,
                areas: Array.from(new Set([form.area, ...(form.areas || [])])),
                location: {
                    type: "Point",
                    coordinates: [form.lng || form.location?.coordinates?.[0] || 74.3587, form.lat || form.location?.coordinates?.[1] || 31.5204],
                },
            }),
        });
        setSaving(false);
        setMsg("Saved!");
        setTimeout(() => setMsg(""), 3000);
    };

    const handleBranchTypeChange = async (newType: "single" | "multi") => {
        try {
            await fetch("/api/owner/user-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ branchType: newType }),
            });
            await updateSession({ branchType: newType });
            window.location.reload();
        } catch { }
    };

    const handleMapLocationChange = (lat: number, lng: number, address?: string) => {
        setForm((f: any) => ({
            ...f,
            lat,
            lng,
            ...(address ? { address } : {}),
        }));
    };

    const toggleArea = (areaName: string) => {
        setForm((f: any) => {
            const currentAreas = f.areas || [];
            return {
                ...f,
                areas: currentAreas.includes(areaName)
                    ? currentAreas.filter((a: string) => a !== areaName)
                    : [...currentAreas, areaName]
            };
        });
    };

    if (!branch) return null;

    const mapLat = form.lat || form.location?.coordinates?.[1] || 31.5204;
    const mapLng = form.lng || form.location?.coordinates?.[0] || 74.3587;

    const inputClasses = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 focus:bg-white transition-all";
    const disabledInputClasses = "w-full border border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-medium bg-gray-50 text-gray-400 cursor-not-allowed";
    const labelClasses = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5";

    return (
        <div className="space-y-6 max-w-3xl">
            {/* ═══ HEADER ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <Store className="w-5 h-5 text-primary" /> Branch Profile
                    </h1>
                    <p className="text-[12px] text-gray-400 font-medium mt-0.5">Manage your restaurant details and information</p>
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="text-white px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 disabled:opacity-50 shrink-0 active:scale-95"
                    style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>

            {msg && (
                <div className="flex items-center gap-2 text-[13px] font-bold px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle className="w-4 h-4" /> {msg}
                </div>
            )}

            {/* ═══ BRAND IDENTITY ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                        <Store className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="font-bold text-[14px] text-gray-900">Brand Identity</h2>
                </div>
                <div className="p-5 space-y-4">
                    <div className="flex items-start gap-2 p-3 bg-primary/5 text-primary-dark rounded-xl text-[12px] border border-primary/10">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>Some fields cannot be changed to protect your restaurant's URL and SEO identity. Please <Link href="/contact-us" className="underline font-bold">contact support</Link> for changes.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClasses}>Brand Name</label>
                            <input value={form.brandName || ""} readOnly disabled className={disabledInputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>Branch Name</label>
                            <input value={form.branchName || ""} readOnly disabled className={disabledInputClasses} placeholder="Main Branch" />
                        </div>
                    </div>
                    {(form.logo || form.coverImage) && (
                        <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
                            {form.logo && <img src={form.logo} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-gray-100" />}
                            {form.coverImage && <img src={form.coverImage} alt="Cover" className="h-12 w-20 rounded-xl object-cover border border-gray-100" />}
                            <p className="text-[11px] text-gray-500">Logo & Cover managed in <strong>Gallery</strong> tab</p>
                        </div>
                    )}
                    <div>
                        <label className={labelClasses}>Description</label>
                        <textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={`${inputClasses} resize-none`} />
                    </div>
                    <div>
                        <label className={labelClasses}>Price Range</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map(v => (
                                <button key={v} type="button" onClick={() => setForm({ ...form, priceRange: v })}
                                    className={`px-5 py-2.5 rounded-xl text-[13px] font-bold border transition-all active:scale-95 ${form.priceRange === v ? "text-white border-transparent" : "bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200"}`}
                                    style={form.priceRange === v ? { backgroundColor: "#e8323b" } : {}}>
                                    {"$".repeat(v)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ CONTACT ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <PhoneIcon className="w-4 h-4 text-blue-500" />
                    </div>
                    <h2 className="font-bold text-[14px] text-gray-900">Contact Details</h2>
                </div>
                <div className="p-5">
                    <div>
                        <label className={labelClasses}>Phone Number</label>
                        <input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClasses} placeholder="+92 42 35756041" />
                    </div>
                </div>
            </div>

            {/* ═══ LOCATION ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h2 className="font-bold text-[14px] text-gray-900">Location</h2>
                </div>
                <div className="p-5 space-y-4">
                    <div className="flex items-start gap-2 p-3 bg-primary/5 text-primary-dark rounded-xl text-[12px] border border-primary/10">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>Location details are locked. Please <Link href="/contact-us" className="underline font-bold">contact support</Link> if your address has changed.</p>
                    </div>
                    <div>
                        <label className={labelClasses}>Full Address</label>
                        <input value={form.address || ""} readOnly disabled className={disabledInputClasses} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClasses}>City</label>
                            <select value={form.city || ""} disabled className={disabledInputClasses}>
                                <option value={form.city}>{form.city || "Select City"}</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClasses}>Area</label>
                            <select value={form.area || ""} disabled className={disabledInputClasses}>
                                <option value={form.area}>{form.area || "Select Area"}</option>
                            </select>
                        </div>
                    </div>
                    {form.city && areasLoading === false && areas.length > 1 && (
                        <div className="space-y-2">
                            <label className={labelClasses}>Additional Areas (Optional)</label>
                            <p className="text-[10px] text-gray-400">Select any other areas your branch covers or belongs to.</p>
                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                                {areas.filter(a => a.name !== form.area).map(a => (
                                    <button
                                        key={a._id || a.name}
                                        type="button"
                                        onClick={() => toggleArea(a.name)}
                                        className={`text-[11px] px-3 py-1.5 rounded-full border transition font-bold ${
                                            (form.areas || []).includes(a.name)
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
                    <div className="rounded-2xl overflow-hidden border border-gray-200 h-[300px] pointer-events-none opacity-80">
                        <MapComponent lat={mapLat} lng={mapLng} address={form.address || ""} onLocationChange={() => { }} />
                    </div>
                </div>
            </div>

            {/* ═══ SERVICE TYPE ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <span className="text-[16px]">🛎️</span>
                    </div>
                    <h2 className="font-bold text-[14px] text-gray-900">Service Type</h2>
                </div>
                <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                        {SERVICE_TYPES.map(t => (
                            <button key={t} type="button" onClick={() => { const curr = form.restaurantType || []; setForm({ ...form, restaurantType: curr.includes(t) ? curr.filter((x: string) => x !== t) : [...curr, t] }); }}
                                className={`text-[12px] px-3.5 py-2 rounded-xl font-bold transition-all active:scale-95 ${(form.restaurantType || []).includes(t) ? "bg-amber-500 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>
                                {SERVICE_TYPE_LABELS[t] || t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ FACILITIES ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                        <span className="text-[16px]">🏛️</span>
                    </div>
                    <h2 className="font-bold text-[14px] text-gray-900">Facilities</h2>
                </div>
                <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                        {FACILITIES.map(f => (
                            <button key={f} type="button" onClick={() => { const curr = form.facilities || []; setForm({ ...form, facilities: curr.includes(f) ? curr.filter((x: string) => x !== f) : [...curr, f] }); }}
                                className={`text-[12px] px-3.5 py-2 rounded-xl font-bold transition-all active:scale-95 ${(form.facilities || []).includes(f) ? "text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"}`}
                                style={(form.facilities || []).includes(f) ? { backgroundColor: "#e8323b" } : {}}>
                                {FACILITY_LABELS[f] || f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ VIBES ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                        <span className="text-[16px]">✨</span>
                    </div>
                    <h2 className="font-bold text-[14px] text-gray-900">Vibes</h2>
                </div>
                <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                        {VIBES.map(v => (
                            <button key={v} type="button" onClick={() => { const curr = form.vibes || []; setForm({ ...form, vibes: curr.includes(v) ? curr.filter((x: string) => x !== v) : [...curr, v] }); }}
                                className={`text-[12px] px-3.5 py-2 rounded-xl font-bold transition-all active:scale-95 ${(form.vibes || []).includes(v) ? "bg-purple-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>
                                {VIBE_LABELS[v] || v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ CUISINES ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                        <span className="text-[16px]">🍽️</span>
                    </div>
                    <h2 className="font-bold text-[14px] text-gray-900">Cuisines <span className="text-gray-400 font-medium text-[11px]">(max 3)</span></h2>
                </div>
                <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                        {categories.map(c => (
                            <button key={c._id || c.slug} type="button" onClick={() => { const curr = form.cuisines || []; const val = c.name || c.slug; if (!curr.includes(val) && curr.length >= 3) return; setForm({ ...form, cuisines: curr.includes(val) ? curr.filter((x: string) => x !== val) : [...curr, val] }); }}
                                className={`text-[12px] px-3.5 py-2 rounded-xl font-bold transition-all active:scale-95 ${(form.cuisines || []).includes(c.name || c.slug) ? "text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"}`}
                                style={(form.cuisines || []).includes(c.name || c.slug) ? { backgroundColor: "#e8323b" } : {}}>
                                {c.name || c.slug}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ ACCOUNT SETTINGS ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden relative" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4 text-center">
                    <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100 max-w-sm">
                        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mx-auto mb-3">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-black text-[14px] text-gray-900 mb-1">Account Type Locked</h3>
                        <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">To switch between Single and Multiple branches, please contact our support team to ensure your data is migrated safely.</p>
                        <Link href="/contact-us" className="inline-block text-white text-[12px] font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95" style={{ backgroundColor: "#e8323b" }}>
                            Contact Support
                        </Link>
                    </div>
                </div>
                <div className="opacity-50 pointer-events-none">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-gray-500" />
                        </div>
                        <h2 className="font-bold text-[14px] text-gray-900">Account Settings</h2>
                    </div>
                    <div className="p-5 space-y-3">
                        <label className={labelClasses}>Branch Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" disabled
                                className={`p-4 rounded-xl border-2 transition-all text-left ${branchType === "single" ? "border-primary/30 bg-primary/5" : "border-gray-200"}`}>
                                <Building className={`w-5 h-5 mb-1 ${branchType === "single" ? "text-primary" : "text-gray-400"}`} />
                                <p className="font-bold text-[13px]">Single Branch</p>
                                <p className="text-[10px] text-gray-500">One location only</p>
                            </button>
                            <button type="button" disabled
                                className={`p-4 rounded-xl border-2 transition-all text-left ${branchType === "multi" ? "border-primary/30 bg-primary/5" : "border-gray-200"}`}>
                                <GitBranch className={`w-5 h-5 mb-1 ${branchType === "multi" ? "text-primary" : "text-gray-400"}`} />
                                <p className="font-bold text-[13px]">Multiple Branches</p>
                                <p className="text-[10px] text-gray-500">Chain with many locations</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
