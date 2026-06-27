"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, Save, Globe, Mail, Phone, Share2, Search as SearchIcon, Shield, RefreshCw, Upload, Image as ImageIcon, Monitor, Smartphone, X, FileText } from "lucide-react";

interface PlatformSettings {
    siteName: string;
    tagline: string;
    logoUrl: string;
    logoWidthDesktop: number;
    logoHeightDesktop: number;
    logoWidthMobile: number;
    logoHeightMobile: number;
    contactEmail: string;
    contactPhone: string;
    whatsapp: string;
    facebookUrl: string;
    instagramUrl: string;
    tiktokUrl: string;
    youtubeUrl: string;
    defaultMetaTitle: string;
    defaultMetaDescription: string;
    homepageTitle: string;
    homepageMetaDescription: string;
    defaultCommissionPercent: number;
    maintenanceMode: boolean;
    homeContent: string;
    faviconUrl: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
    siteName: "Foodies Pakistan",
    tagline: "Pakistan's #1 Restaurant Discovery & Booking Platform",
    logoUrl: "",
    logoWidthDesktop: 140,
    logoHeightDesktop: 40,
    logoWidthMobile: 100,
    logoHeightMobile: 32,
    contactEmail: "",
    contactPhone: "",
    whatsapp: "",
    facebookUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
    youtubeUrl: "",
    defaultMetaTitle: "Best Restaurants in Pakistan — Foodies Pakistan",
    defaultMetaDescription: "Discover, book, and save at Pakistan's top restaurants. Exclusive bank deals, verified reviews, and instant reservations.",
    homepageTitle: "Foodies Pakistan - Best Restaurant Deals & Discovery",
    homepageMetaDescription: "Discover the best restaurants near you in Pakistan. Exclusive bank deals, menu photos, reviews, and directions.",
    defaultCommissionPercent: 0,
    maintenanceMode: false,
    homeContent: "",
    faviconUrl: "",
};

export default function GlobalSettingsPage() {
    const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadingFavicon, setUploadingFavicon] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchSettings(); }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/settings");
            if (res.ok) {
                const data = await res.json();
                if (data && typeof data === "object") {
                    setSettings({ ...DEFAULT_SETTINGS, ...data });
                }
            }
        } catch { }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch { }
        setSaving(false);
    };

    const handleLogoUpload = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("image", file);
            formData.append("slug", `platform-logo-${Date.now()}`);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({ ...prev, logoUrl: data.url }));
            }
        } catch { }
        setUploading(false);
    };

    const handleFaviconUpload = async (file: File) => {
        setUploadingFavicon(true);
        try {
            const formData = new FormData();
            formData.append("image", file);
            formData.append("slug", `platform-favicon-${Date.now()}`);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({ ...prev, faviconUrl: data.url }));
            }
        } catch { }
        setUploadingFavicon(false);
    };

    const Input = ({ label, icon: Icon, value, onChange, type = "text", placeholder = "" }: any) => (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                {Icon && <Icon className="w-3.5 h-3.5" />} {label}
            </label>
            <input
                type={type} value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
        </div>
    );

    if (loading) {
        return <div className="flex items-center justify-center py-20 text-muted-foreground"><RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading settings...</div>;
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Settings className="w-6 h-6 text-primary" /> Platform Settings
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Configure global platform settings and preferences.</p>
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition disabled:opacity-50 flex items-center gap-2">
                    <Save className="w-4 h-4" /> {saving ? "Saving..." : saved ? "✓ Saved!" : "Save All"}
                </button>
            </div>

            {/* Logo Upload */}
            <div className="bg-card border rounded-xl p-6 space-y-5">
                <h2 className="font-bold text-sm flex items-center gap-2 text-gray-700 uppercase tracking-wider">
                    <ImageIcon className="w-4 h-4 text-primary" /> Site Logo
                </h2>

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]); }} />

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Logo Preview + Upload */}
                    <div className="space-y-3">
                        {settings.logoUrl ? (
                            <div className="relative group inline-block">
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50">
                                    <img src={settings.logoUrl} alt="Logo" style={{ maxWidth: 200, maxHeight: 80 }} className="object-contain" />
                                </div>
                                <button onClick={() => setSettings(p => ({ ...p, logoUrl: "" }))}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => fileInputRef.current?.click()}
                                className="w-48 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition cursor-pointer">
                                <Upload className="w-5 h-5 text-gray-400" />
                                <span className="text-xs font-bold text-gray-500">Upload Logo</span>
                            </button>
                        )}

                        {settings.logoUrl && (
                            <button onClick={() => fileInputRef.current?.click()}
                                className="text-xs text-primary font-bold hover:underline">Change Logo</button>
                        )}

                        {uploading && (
                            <p className="text-xs text-primary font-bold flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin" /> Uploading...
                            </p>
                        )}
                    </div>

                    {/* Size Controls */}
                    <div className="flex-1 space-y-4">
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> Desktop Size (px)</p>
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Width" type="number" value={settings.logoWidthDesktop}
                                    onChange={(v: string) => setSettings({ ...settings, logoWidthDesktop: parseInt(v) || 140 })} placeholder="140" />
                                <Input label="Height" type="number" value={settings.logoHeightDesktop}
                                    onChange={(v: string) => setSettings({ ...settings, logoHeightDesktop: parseInt(v) || 40 })} placeholder="40" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Mobile Size (px)</p>
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Width" type="number" value={settings.logoWidthMobile}
                                    onChange={(v: string) => setSettings({ ...settings, logoWidthMobile: parseInt(v) || 100 })} placeholder="100" />
                                <Input label="Height" type="number" value={settings.logoHeightMobile}
                                    onChange={(v: string) => setSettings({ ...settings, logoHeightMobile: parseInt(v) || 32 })} placeholder="32" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Favicon Upload */}
            <div className="bg-card border rounded-xl p-6 space-y-5">
                <h2 className="font-bold text-sm flex items-center gap-2 text-gray-700 uppercase tracking-wider">
                    <SearchIcon className="w-4 h-4 text-primary" /> Site Favicon
                </h2>

                <input ref={faviconInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleFaviconUpload(e.target.files[0]); }} />

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="space-y-3">
                        {settings.faviconUrl ? (
                            <div className="relative group inline-block">
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50 flex items-center justify-center w-20 h-20">
                                    <img src={settings.faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                                </div>
                                <button onClick={() => setSettings(p => ({ ...p, faviconUrl: "" }))}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => faviconInputRef.current?.click()}
                                className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition cursor-pointer">
                                <Upload className="w-5 h-5 text-gray-400" />
                                <span className="text-[10px] font-bold text-gray-500">Upload</span>
                            </button>
                        )}

                        {settings.faviconUrl && (
                            <button onClick={() => faviconInputRef.current?.click()}
                                className="text-xs text-primary font-bold hover:underline block">Change Favicon</button>
                        )}

                        {uploadingFavicon && (
                            <p className="text-xs text-primary font-bold flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin" /> Uploading...
                            </p>
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Favicon Preview</p>
                        <p className="text-xs text-muted-foreground mt-1">This icon will appear in browser tabs and as the app icon on mobile devices. Recommended size: 512x512px (PNG).</p>
                    </div>
                </div>
            </div>

            {/* Platform Info */}
            <div className="bg-card border rounded-xl p-6 space-y-4">
                <h2 className="font-bold text-sm flex items-center gap-2 text-gray-700 uppercase tracking-wider">
                    <Globe className="w-4 h-4 text-blue-500" /> Platform Info
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Site Name" value={settings.siteName} onChange={(v: string) => setSettings({ ...settings, siteName: v })} placeholder="Foodies Pakistan" />
                    <Input label="Tagline" value={settings.tagline} onChange={(v: string) => setSettings({ ...settings, tagline: v })} placeholder="Pakistan's #1..." />
                </div>
            </div>

            {/* Contact Info */}
            <div className="bg-card border rounded-xl p-6 space-y-4">
                <h2 className="font-bold text-sm flex items-center gap-2 text-gray-700 uppercase tracking-wider">
                    <Mail className="w-4 h-4 text-green-500" /> Contact Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Contact Email" icon={Mail} value={settings.contactEmail} onChange={(v: string) => setSettings({ ...settings, contactEmail: v })} placeholder="logicalmoez@gmail.com" />
                    <Input label="Contact Phone" icon={Phone} value={settings.contactPhone} onChange={(v: string) => setSettings({ ...settings, contactPhone: v })} placeholder="03299493973" />
                    <Input label="WhatsApp" icon={Phone} value={settings.whatsapp} onChange={(v: string) => setSettings({ ...settings, whatsapp: v })} placeholder="03299493973" />
                </div>
            </div>

            {/* Social Links */}
            <div className="bg-card border rounded-xl p-6 space-y-4">
                <h2 className="font-bold text-sm flex items-center gap-2 text-gray-700 uppercase tracking-wider">
                    <Share2 className="w-4 h-4 text-pink-500" /> Social Media
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Facebook URL" value={settings.facebookUrl} onChange={(v: string) => setSettings({ ...settings, facebookUrl: v })} placeholder="https://facebook.com/..." />
                    <Input label="Instagram URL" value={settings.instagramUrl} onChange={(v: string) => setSettings({ ...settings, instagramUrl: v })} placeholder="https://instagram.com/..." />
                    <Input label="TikTok URL" value={settings.tiktokUrl} onChange={(v: string) => setSettings({ ...settings, tiktokUrl: v })} placeholder="https://tiktok.com/@..." />
                    <Input label="YouTube URL" value={settings.youtubeUrl} onChange={(v: string) => setSettings({ ...settings, youtubeUrl: v })} placeholder="https://youtube.com/@..." />
                </div>
            </div>

            {/* SEO Defaults */}
            <div className="bg-card border rounded-xl p-6 space-y-4">
                <h2 className="font-bold text-sm flex items-center gap-2 text-gray-700 uppercase tracking-wider">
                    <SearchIcon className="w-4 h-4 text-purple-500" /> SEO Defaults
                </h2>
                <div className="space-y-4">
                    <Input label="Default Meta Title" value={settings.defaultMetaTitle} onChange={(v: string) => setSettings({ ...settings, defaultMetaTitle: v })} />
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Default Meta Description</label>
                        <textarea value={settings.defaultMetaDescription} onChange={e => setSettings({ ...settings, defaultMetaDescription: e.target.value })}
                            rows={3} className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition" />
                        <p className="text-[10px] text-gray-400">{settings.defaultMetaDescription.length}/160 characters</p>
                    </div>
                    <Input label="Homepage Title" value={settings.homepageTitle} onChange={(v: string) => setSettings({ ...settings, homepageTitle: v })} />
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Homepage Meta Description</label>
                        <textarea value={settings.homepageMetaDescription} onChange={e => setSettings({ ...settings, homepageMetaDescription: e.target.value })}
                            rows={3} className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition" />
                        <p className="text-[10px] text-gray-400">{settings.homepageMetaDescription.length}/160 characters</p>
                    </div>
                </div>
            </div>

            {/* Business Settings */}
            <div className="bg-card border rounded-xl p-6 space-y-4">
                <h2 className="font-bold text-sm flex items-center gap-2 text-gray-700 uppercase tracking-wider">
                    <Shield className="w-4 h-4 text-red-500" /> Business & Security
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Default Commission %" type="number" value={settings.defaultCommissionPercent}
                        onChange={(v: string) => setSettings({ ...settings, defaultCommissionPercent: parseFloat(v) || 0 })} placeholder="0" />
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" /> Maintenance Mode
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl px-4 py-3 border hover:bg-gray-100 transition">
                            <input type="checkbox" checked={settings.maintenanceMode}
                                onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 text-primary" />
                            <div>
                                <span className="text-sm font-bold">{settings.maintenanceMode ? "🔴 Site is DOWN" : "🟢 Site is LIVE"}</span>
                                <p className="text-[10px] text-gray-500">Toggle to show maintenance page to visitors</p>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Homepage Content */}
            <div className="bg-card border rounded-xl p-6 space-y-4">
                <h2 className="font-bold text-sm flex items-center gap-2 text-gray-700 uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-primary" /> Homepage Content
                </h2>
                <p className="text-xs text-gray-500">Rich content that appears on the homepage below restaurants. Use this for SEO, announcements, or featured content.</p>
                <div className="min-h-[200px]">
                    <textarea
                        value={settings.homeContent}
                        onChange={(e) => setSettings({ ...settings, homeContent: e.target.value })}
                        placeholder="Write homepage content (HTML supported)..."
                        className="w-full min-h-[200px] p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
            </div>
        </div>
    );
}
