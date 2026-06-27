"use client";

import { useState, useEffect } from "react";
import {
    X,
    Save,
    Loader2,
    Image as ImageIcon,
    Trash2,
    Star,
    CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const ImageGalleryModal = dynamic(() => import("@/components/owner/image-gallery-modal"), { ssr: false });
import CategoryAutocomplete from "./category-autocomplete";
const DIETARY_TAGS = [
    "Vegetarian", "Vegan", "Gluten-Free", "Spicy", "Nut-Free", "Dairy-Free", "Sugar-Free"
];

export interface MenuItemData {
    _id?: string;
    name: string;
    description: string;
    price: number;
    pricePaisa: number;
    category: string;
    image?: string;
    dietaryTags: string[];
    isAvailable: boolean;
    isPopular: boolean;
    sortOrder?: number;
}

interface MenuItemEditorProps {
    isOpen: boolean;
    onClose: () => void;
    item: Partial<MenuItemData> | null;
    restaurantId: string;
    branchImages: string[];
    existingCategories: string[];
    onSave: (data: Partial<MenuItemData>) => Promise<void>;
}

export default function MenuItemEditor({
    isOpen,
    onClose,
    item,
    restaurantId,
    branchImages,
    existingCategories,
    onSave
}: MenuItemEditorProps) {
    const [formData, setFormData] = useState<Partial<MenuItemData>>({
        name: "",
        description: "",
        price: 0,
        category: "Main Course",
        image: "",
        dietaryTags: [],
        isAvailable: true,
        isPopular: false,
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [galleryOpen, setGalleryOpen] = useState(false);

    useEffect(() => {
        if (isOpen && item) {
            setFormData({
                ...item,
                price: item.pricePaisa ? item.pricePaisa / 100 : (item.price || 0),
                category: item.category || "Main Course",
                dietaryTags: item.dietaryTags || [],
                isAvailable: item.isAvailable ?? true,
                isPopular: item.isPopular ?? false,
            });
            setError("");
        } else if (isOpen) {
            // Reset for new item
            setFormData({
                name: "",
                description: "",
                price: 0,
                category: "Main Course",
                image: "",
                dietaryTags: [],
                isAvailable: true,
                isPopular: false,
            });
            setError("");
        }
    }, [isOpen, item]);

    const existingMedia = branchImages.map(url => ({ url, type: "image" as const }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!formData.name?.trim()) {
            setError("Name is required");
            return;
        }
        if ((formData.price || 0) <= 0) {
            setError("Please enter a valid price");
            return;
        }

        setSaving(true);
        try {
            await onSave({
                ...formData,
                pricePaisa: Math.round((formData.price || 0) * 100),
            });
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to save item");
        } finally {
            setSaving(false);
        }
    };

    const toggleTag = (tag: string) => {
        const current = formData.dietaryTags || [];
        if (current.includes(tag)) {
            setFormData({ ...formData, dietaryTags: current.filter(t => t !== tag) });
        } else {
            setFormData({ ...formData, dietaryTags: [...current, tag] });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
            >
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">
                            {item?._id ? "Edit Menu Item" : "New Menu Item"}
                        </h2>
                        <p className="text-sm text-gray-400 font-medium">
                            {item?._id ? "Update details for this item" : "Create a new entry in your digital menu"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm font-bold px-4 py-3 rounded-2xl border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-6">
                        {/* Image Picker */}
                        <div className="w-full sm:w-1/3 space-y-2">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Item Image</label>
                            <div
                                onClick={() => setGalleryOpen(true)}
                                className={`aspect-square w-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${formData.image
                                        ? "border-transparent overflow-hidden"
                                        : "border-gray-200 hover:border-primary/50 hover:bg-primary/5"
                                    }`}
                            >
                                {formData.image ? (
                                    <div className="relative w-full h-full group">
                                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                            <span className="text-white text-xs font-bold px-3 py-1.5 bg-white/20 rounded-lg">Change Image</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center p-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-2 text-gray-400">
                                            <ImageIcon className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500">Select Image</span>
                                    </div>
                                )}
                            </div>
                            {formData.image && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, image: "" }); }}
                                    className="w-full flex justify-center items-center gap-2 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                </button>
                            )}
                        </div>

                        <div className="flex-1 space-y-5">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Name</label>
                                    <input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Mighty Zinger Burger"
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Price (Rs)</label>
                                        <input
                                            type="number"
                                            value={formData.price || ""}
                                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-black focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <CategoryAutocomplete
                                            label="Category"
                                            options={existingCategories}
                                            value={formData.category || ""}
                                            onChange={val => setFormData({ ...formData, category: val })}
                                            placeholder="Select or create category..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        placeholder="Briefly describe the ingredients and taste..."
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-700 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tags & Toggles */}
                    <div className="space-y-6 pt-4 border-t border-gray-100">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Dietary Tags</label>
                            <div className="flex flex-wrap gap-2">
                                {DIETARY_TAGS.map(tag => {
                                    const active = formData.dietaryTags?.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleTag(tag)}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all border ${active
                                                    ? "bg-primary text-white border-primary shadow-sm"
                                                    : "bg-white text-gray-500 border-gray-200 hover:border-primary/50"
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${formData.isAvailable ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-white text-gray-400 border border-gray-200"
                                    }`}
                            >
                                <CheckCircle className="w-4 h-4" /> Available In-Store
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isPopular: !formData.isPopular })}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${formData.isPopular ? "bg-yellow-100 text-yellow-700 border border-yellow-200" : "bg-white text-gray-400 border border-gray-200"
                                    }`}
                            >
                                <Star className={`w-4 h-4 ${formData.isPopular ? 'fill-yellow-700' : ''}`} /> Highlight as Popular
                            </button>
                        </div>
                    </div>
                </form>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-2xl text-sm font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-2xl text-sm font-black flex items-center gap-2 shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? "SAVING..." : "SAVE ITEM"}
                    </button>
                </div>
            </motion.div>

            <ImageGalleryModal
                isOpen={galleryOpen}
                onClose={() => setGalleryOpen(false)}
                onSelect={items => {
                    const img = items.find(i => i.type === "image");
                    if (img) setFormData({ ...formData, image: img.url });
                }}
                restaurantId={restaurantId}
                acceptVideo={false}
                multiple={false}
                existingMedia={existingMedia}
            />
        </div>
    );
}
