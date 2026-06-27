"use client";

import { useState, useEffect } from "react";
import { DIETARY_TAGS } from "@/constants/menu";
import CategoryAutocomplete from "./category-autocomplete";
import { 
    X, 
    Check, 
    AlertCircle, 
    Loader2, 
    Plus, 
    Trash2, 
    ChevronDown, 
    ChevronUp,
    Sparkles,
    Save,
    Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";



export interface ExtractedItem {
    name: string;
    description: string;
    price: number;
    pricePaisa: number;
    category: string;
    dietaryTags: string[];
    isPopular?: boolean;
    image?: string;
}

interface AIMenuReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    extractedItems: ExtractedItem[];
    restaurantId: string;
    existingCategories: string[];
    onSuccess: (count: number) => void;
}
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function AIMenuReviewModal({ 
    isOpen, 
    onClose,
    extractedItems: initialItems, 
    restaurantId,
    existingCategories,
    onSuccess 
}: AIMenuReviewModalProps) {
    const queryClient = useQueryClient();
    const [items, setItems] = useState<ExtractedItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    const bulkSaveMutation = useMutation({
        mutationFn: async (itemsToSave: ExtractedItem[]) => {
            const res = await fetch("/api/v1/menu-items/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    restaurantId,
                    items: itemsToSave.map(item => ({
                        ...item,
                    }))
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save menu items");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["menu-items", restaurantId] });
            onSuccess(items.length);
            onClose();
        },
        onError: (err: any) => {
            setError(err.message);
        }
    });

    useEffect(() => {
        if (isOpen) {
            setItems([...initialItems]);
        }
    }, [isOpen, initialItems]);

    const handleUpdateItem = (index: number, updates: Partial<ExtractedItem>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updates };
        
        if (updates.price !== undefined) {
            newItems[index].pricePaisa = Math.round(updates.price * 100);
        }
        
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSaveAll = () => {
        if (items.length === 0) return;
        setError(null);
        bulkSaveMutation.mutate(items);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-white/20"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Review AI Extraction</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                {items.length} items detected • Please verify before saving
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white custom-scrollbar">
                    {error && (
                        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
                            <AlertCircle className="w-5 h-5" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        <AnimatePresence mode="popLayout">
                            {items.map((item, index) => (
                                <motion.div 
                                    layout
                                    key={`item-${index}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 bg-gray-50/50 rounded-3xl border border-gray-100 hover:border-primary/30 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300"
                                >
                                    {/* Name & Description */}
                                    <div className="lg:col-span-5 space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Item Name</label>
                                            <input 
                                                value={item.name}
                                                onChange={e => handleUpdateItem(index, { name: e.target.value })}
                                                placeholder="e.g. Chicken Biryani"
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                                            <textarea 
                                                value={item.description}
                                                onChange={e => handleUpdateItem(index, { description: e.target.value })}
                                                placeholder="Briefly describe the dish..."
                                                rows={2}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-600 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Category & Price */}
                                    <div className="lg:col-span-4 space-y-3">
                                        <div className="space-y-1">
                                            <CategoryAutocomplete
                                                label="Category"
                                                options={existingCategories}
                                                value={item.category}
                                                onChange={val => handleUpdateItem(index, { category: val })}
                                                placeholder="Select or create..."
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Price (Rs.)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₨</span>
                                                <input 
                                                    type="number"
                                                    value={item.price}
                                                    onChange={e => handleUpdateItem(index, { price: parseFloat(e.target.value) || 0 })}
                                                    className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-black focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tags & Action */}
                                    <div className="lg:col-span-3 flex flex-col justify-between">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Dietary Tags</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {DIETARY_TAGS.slice(0, 5).map(tag => (
                                                    <button
                                                        key={tag}
                                                        onClick={() => {
                                                            const tags = item.dietaryTags.includes(tag)
                                                                ? item.dietaryTags.filter(t => t !== tag)
                                                                : [...item.dietaryTags, tag];
                                                            handleUpdateItem(index, { dietaryTags: tags });
                                                        }}
                                                        className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                                                            item.dietaryTags.includes(tag)
                                                                ? "bg-primary text-white"
                                                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                                        }`}
                                                    >
                                                        {tag.split('-')[0]}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between mt-4">
                                            <button 
                                                onClick={() => handleUpdateItem(index, { isPopular: !item.isPopular })}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                                    item.isPopular ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400 opacity-60 grayscale'
                                                }`}
                                            >
                                                <Star className={`w-3 h-3 ${item.isPopular ? 'fill-yellow-700' : ''}`} />
                                                Popular
                                            </button>
                                            <button 
                                                onClick={() => handleRemoveItem(index)}
                                                className="w-9 h-9 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all group-hover:scale-105 active:scale-95"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {items.length === 0 && (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                                <Sparkles className="w-10 h-10 text-gray-200" />
                            </div>
                            <p className="text-gray-400 font-bold">No items left to review.</p>
                            <button 
                                onClick={onClose}
                                className="text-primary font-bold text-sm hover:underline"
                            >
                                Go back
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Check twice before final submission
                    </p>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onClose}
                            className="px-6 py-3 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveAll}
                            disabled={bulkSaveMutation.isPending || items.length === 0}
                            className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-2xl text-sm font-extrabold flex items-center gap-2 shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {bulkSaveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {bulkSaveMutation.isPending ? "SAVING ITEMS..." : "ADD TO DIGITAL MENU"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
