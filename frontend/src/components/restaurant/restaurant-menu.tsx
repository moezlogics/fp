"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
    UtensilsCrossed, 
    Star, 
    Search,
    X,
} from "lucide-react";
import { useState, useMemo } from "react";

interface MenuItem {
    _id: string;
    name: string;
    description: string;
    price: number;
    pricePaisa: number;
    image?: string;
    dietaryTags?: string[];
    isPopular?: boolean;
}

interface MenuData {
    restaurantId: string;
    totalItems: number;
    menu: Record<string, MenuItem[]>;
}

interface RestaurantMenuProps {
    restaurantId: string;
    restaurantName: string;
    isInitiallyCompact?: boolean;
    initialData?: MenuData;
}

export default function RestaurantMenu({ 
    restaurantId, 
    restaurantName, 
    isInitiallyCompact = false,
    initialData 
}: RestaurantMenuProps) {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isExpanded, setIsExpanded] = useState(!isInitiallyCompact);

    const { data: rawMenuData, isLoading, error } = useQuery<any>({
        queryKey: ["restaurant-menu", restaurantId],
        queryFn: async () => {
            const res = await fetch(`/api/v1/menu-items/${restaurantId}`);
            if (!res.ok) throw new Error("Failed to fetch menu");
            const json = await res.json();
            return json.data;
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
        initialData: initialData,
    });

    // Normalize data structure (handles both grouped object and flat array)
    const data = useMemo(() => {
        if (!rawMenuData) return null;
        if (rawMenuData.menu) return rawMenuData as MenuData;
        
        if (Array.isArray(rawMenuData)) {
            const menu: Record<string, MenuItem[]> = {};
            rawMenuData.forEach((item: any) => {
                const catName = item.categoryId?.name || item.category || "Other";
                if (!menu[catName]) menu[catName] = [];
                menu[catName].push(item);
            });
            return {
                restaurantId,
                totalItems: rawMenuData.length,
                menu
            } as MenuData;
        }
        return null;
    }, [rawMenuData, restaurantId]);

    if (isLoading && !initialData) return null;
    if (error || !data || data.totalItems === 0) return null;

    const categories = Object.keys(data.menu || {});
    if (!activeCategory && categories.length > 0) setActiveCategory(categories[0]);

    const getFilteredMenu = () => {
        if (!searchQuery) return data.menu;
        const filtered: Record<string, MenuItem[]> = {};
        const query = searchQuery.toLowerCase();
        
        categories.forEach(cat => {
            const matches = data.menu[cat].filter(item => 
                item.name.toLowerCase().includes(query) || 
                item.description?.toLowerCase().includes(query)
            );
            if (matches.length > 0) filtered[cat] = matches;
        });
        return filtered;
    };

    const filteredMenu = getFilteredMenu();
    const filteredCategories = Object.keys(filteredMenu);

    return (
        <div className="pb-6">
            {/* Compact Header & Search */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 p-3 md:p-4">
                <div className="flex items-center gap-3">
                    <div className="relative group flex-1 max-w-sm">
                        <input 
                            type="text" 
                            placeholder="Search dishes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 pl-8 pr-8 py-2 rounded-xl text-[12px] font-bold focus:bg-white focus:border-primary/20 transition-all outline-none"
                        />
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                            <Search className="w-3.5 h-3.5" />
                        </div>
                        <AnimatePresence>
                            {searchQuery && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors bg-gray-100/50 hover:bg-gray-200 p-0.5 rounded-full cursor-pointer z-10"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 shrink-0">{data.totalItems} items</span>
                </div>

                {!searchQuery && (
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-2.5 pb-0.5">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => {
                                    setActiveCategory(cat);
                                    document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                                    activeCategory === cat 
                                    ? "bg-gray-900 text-white border-gray-900 shadow-sm" 
                                    : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Compact Menu List */}
            <div className={`mt-2 space-y-3 ${!isExpanded && !searchQuery ? 'relative' : ''}`}>
                {filteredCategories.length === 0 ? (
                    <div className="py-12 flex flex-col items-center text-center">
                        <p className="text-gray-400 font-bold text-sm">No items found</p>
                    </div>
                ) : (
                    filteredCategories.map((cat, catIdx) => {
                        const isCategoryVisible = isExpanded || searchQuery || catIdx < 3;
                        
                        return (
                            <div key={cat} id={`cat-${cat}`} className={`scroll-mt-32 ${!isCategoryVisible ? 'hidden' : ''}`}>
                                {/* Category Header */}
                                <div className="flex items-center justify-between px-3 md:px-4 mb-1.5">
                                    <h3 className="text-sm md:text-base font-black text-gray-900 tracking-tight">{cat}</h3>
                                    <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{filteredMenu[cat].length}</span>
                                </div>

                                {/* Items Table */}
                                <div className="border border-gray-100 rounded-xl overflow-hidden bg-white mx-1 md:mx-0">
                                    {filteredMenu[cat].map((item, idx) => {
                                        const isItemVisible = isExpanded || searchQuery || (catIdx < 3 && idx < 6);
                                        
                                        return (
                                            <motion.div
                                                key={item._id}
                                                initial={{ opacity: 0 }}
                                                whileInView={{ opacity: 1 }}
                                                viewport={{ once: true }}
                                                className={`flex items-center gap-2.5 px-3 md:px-4 py-2 md:py-2.5 group hover:bg-gray-50/50 transition-colors ${
                                                    idx < filteredMenu[cat].length - 1 ? 'border-b border-gray-50' : ''
                                                } ${!isItemVisible ? 'hidden' : ''}`}
                                            >
                                                {/* Image (compact) */}
                                                {item.image && (
                                                    <div className="relative size-12 md:size-14 rounded-lg overflow-hidden shrink-0 bg-gray-50 border border-gray-100">
                                                        <img 
                                                            src={item.image} 
                                                            alt={item.name} 
                                                            className="w-full h-full object-cover" 
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                )}

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-[13px] md:text-sm font-bold text-gray-900 leading-snug line-clamp-1">
                                                            {item.name}
                                                            {item.isPopular && <Star className="inline-block w-3 h-3 text-amber-500 fill-amber-500 ml-1 -translate-y-px" />}
                                                        </p>
                                                        <span className="text-[12px] md:text-[13px] font-black text-gray-900 shrink-0 tabular-nums">
                                                            Rs. {item.price.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    
                                                    {item.description && (
                                                        <p className="text-[11px] text-gray-400 font-medium leading-snug line-clamp-1 mt-0.5">
                                                            {item.description}
                                                        </p>
                                                    )}

                                                    {item.dietaryTags && item.dietaryTags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {item.dietaryTags.map(tag => (
                                                                <span key={tag} className="text-[8px] font-bold text-gray-400 bg-gray-50 px-1.5 py-px rounded border border-gray-100 uppercase tracking-tight">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Expand Button */}
                {!isExpanded && !searchQuery && filteredCategories.length > 0 && (
                    <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-white via-white/95 to-transparent flex items-end justify-center pb-6 z-10">
                        <button 
                            onClick={() => setIsExpanded(true)}
                            className="bg-gray-900 text-white px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl active:scale-95 flex items-center gap-2"
                        >
                            <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
                            View Full Menu
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
