"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
    GripVertical, 
    Pencil, 
    Trash2, 
    Loader2,
    Eye,
    EyeOff,
    CheckCircle,
    Star,
    Sparkles, 
    RefreshCw, 
    Layers, 
    Search, 
    Plus,
    Filter,
    Edit2,
    MoreHorizontal,
    LayoutGrid,
    List as ListIcon,
    Image as ImageIcon,
    ChevronDown
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import MenuItemEditor, { MenuItemData } from "./menu-item-editor";
const DEFAULT_CATEGORIES = [
    "Appetizers", "Main Course", "Desserts", "Beverages", "Deals", "Sides"
];
import AIMenuReviewModal, { ExtractedItem } from "./ai-menu-review-modal";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import ImageGalleryModal from "./image-gallery-modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface DigitalMenuManagerProps {
    restaurantId: string;
    branchImages: string[]; // for the media library
    menuImages?: string[]; // for AI extraction
}

export default function DigitalMenuManager({ restaurantId, branchImages, menuImages = [] }: DigitalMenuManagerProps) {
    const queryClient = useQueryClient();

    // State
    const [mounted, setMounted] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
    const [aiGalleryOpen, setAiGalleryOpen] = useState(false);
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [viewMode, setViewMode] = useState<"card" | "list">("card");
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [extractionStatus, setExtractionStatus] = useState<string | null>(null);
    const [itemScale, setItemScale] = useState<"standard" | "compact">("standard");

    // Queries
    const { data: menuItems = [], isLoading: menuLoading } = useQuery<MenuItemData[]>({
        queryKey: ["menu-items", restaurantId],
        queryFn: async () => {
            const res = await fetch(`/api/v1/menu-items/restaurant/${restaurantId}`);
            if (!res.ok) throw new Error("Failed to fetch menu items");
            const json = await res.json();
            return (json.data || []).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Derive unique categories
    const categories = useMemo(() => {
        const unique = Array.from(new Set(menuItems.map(item => item.category))).filter(Boolean);
        if (unique.length === 0) return DEFAULT_CATEGORIES;
        return unique.sort();
    }, [menuItems]);

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/v1/menu-items/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["menu-items", restaurantId] });
            toast.success("Menu item deleted");
        },
        onError: () => toast.error("Failed to delete item")
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const res = await fetch(`/api/v1/menu-items/bulk-delete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemIds: ids, restaurantId })
            });
            if (!res.ok) throw new Error("Bulk delete failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["menu-items", restaurantId] });
            setSelectedItems([]);
            toast.success("Items deleted successfully");
        },
        onError: () => toast.error("Failed to delete selected items")
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: Partial<MenuItemData> }) => {
            const res = await fetch(`/api/v1/menu-items/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, restaurantId })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || "Update failed");
            return json;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["menu-items", restaurantId] });
            toast.success("Item updated!");
            setEditorOpen(false);
        },
        onError: (error: any) => toast.error(error.message)
    });

    const createMutation = useMutation({
        mutationFn: async (data: Partial<MenuItemData>) => {
            const res = await fetch(`/api/v1/menu-items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, restaurantId })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || "Creation failed");
            return json;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["menu-items", restaurantId] });
            toast.success("Item added!");
            setEditorOpen(false);
        },
        onError: (error: any) => toast.error(error.message)
    });

    const sortMutation = useMutation({
        mutationFn: async (updates: any[]) => {
            const res = await fetch(`/api/v1/menu-items/bulk-sort`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    restaurantId,
                    sortedItems: updates
                })
            });
            if (!res.ok) throw new Error("Failed to save order");
            return res.json();
        },
        onMutate: async (updates) => {
            await queryClient.cancelQueries({ queryKey: ["menu-items", restaurantId] });
            const previousItems = queryClient.getQueryData(["menu-items", restaurantId]);
            
            queryClient.setQueryData(["menu-items", restaurantId], (old: any[] | undefined) => {
                if (!old) return [];
                const updated = [...old].map(item => {
                    const update = updates.find((u: any) => u._id === item._id);
                    if (update) return { ...item, sortOrder: update.sortOrder };
                    return item;
                });
                return updated.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            });

            return { previousItems };
        },
        onError: (err, variables, context: any) => {
            if (context?.previousItems) {
                queryClient.setQueryData(["menu-items", restaurantId], context.previousItems);
            }
            toast.error("Failed to update order");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["menu-items", restaurantId] });
        }
    });

    const extractMutation = useMutation({
        mutationFn: async (imageUrls: string[]) => {
            let allItems: ExtractedItem[] = [];
            // Process images one at a time for reliability (GPT-4o vision is heavy)
            const CONCURRENCY = 2;
            
            for (let i = 0; i < imageUrls.length; i += CONCURRENCY) {
                const chunk = imageUrls.slice(i, i + CONCURRENCY);
                setExtractionStatus(`Processing image${chunk.length > 1 ? 's' : ''} ${i + 1}${chunk.length > 1 ? `-${Math.min(i + CONCURRENCY, imageUrls.length)}` : ''} of ${imageUrls.length}...`);
                
                const results = await Promise.allSettled(chunk.map(async (url) => {
                    const res = await fetch("/api/v1/menu-items/extract", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ imageUrl: url })
                    });
                    const json = await res.json();
                    if (!res.ok) {
                        throw new Error(json?.error || json?.message || `AI Extraction failed for image`);
                    }
                    return json;
                }));

                for (const result of results) {
                    if (result.status === "fulfilled") {
                        const responseData = result.value;
                        // API proxy returns: { success: true, data: { items: [...], menuOverview: "...", categoryOverviews: {...} } }
                        // Or directly: { items: [...] } depending on proxy layer
                        const innerData = responseData?.data || responseData;
                        const items = Array.isArray(innerData?.items) 
                            ? innerData.items 
                            : Array.isArray(innerData?.data?.items)
                                ? innerData.data.items
                                : Array.isArray(innerData) 
                                    ? innerData 
                                    : [];
                        allItems = [...allItems, ...items];
                    } else {
                        console.error("[AI Extract] Image failed:", result.reason?.message);
                        toast.error(result.reason?.message || "One image failed to extract");
                    }
                }
            }

            if (allItems.length === 0) {
                throw new Error("No menu items could be extracted from the selected images. Make sure the images contain clear text of a restaurant menu.");
            }

            return allItems;
        },
        onSuccess: (data) => {
            setExtractedItems(data || []);
            setExtractionStatus(null);
            setAiModalOpen(true);
            toast.success(`Extracted ${data.length} items! Review and save them.`);
        },
        onError: (error: any) => {
            setExtractionStatus(null);
            toast.error(error.message || "Failed to extract menu");
        }
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const sourceIndex = result.source.index;
        const destinationIndex = result.destination.index;
        if (sourceIndex === destinationIndex) return;

        const newVisible = [...visibleItems];
        const [moved] = newVisible.splice(sourceIndex, 1);
        newVisible.splice(destinationIndex, 0, moved);

        const updates = newVisible.map((item, index) => ({
            _id: item._id!,
            sortOrder: index 
        }));

        sortMutation.mutate(updates);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        deleteMutation.mutate(id);
    };

    const handleDeleteAll = () => {
        if (menuItems.length === 0) return;
        if (!confirm(`Are you sure you want to delete ALL ${menuItems.length} menu items? This action cannot be undone.`)) return;
        const allIds = menuItems.map(item => item._id!).filter(Boolean) as string[];
        bulkDeleteMutation.mutate(allIds);
    };

    const toggleSelectItem = (id: string) => {
        setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const openCreate = () => {
        setEditingItem(null);
        setEditorOpen(true);
    };

    const handleAIExtract = async (imageUrls: string[]) => {
        if (imageUrls.length === 0) return;
        extractMutation.mutate(imageUrls);
    };

    const openEdit = (item: MenuItemData) => {
        setEditingItem(item);
        setEditorOpen(true);
    };

    const visibleItems = useMemo(() => {
        return menuItems.filter(item => {
            const searchTermLower = searchTerm.toLowerCase();
            const matchSearch = searchTerm === "" || 
                item.name.toLowerCase().includes(searchTermLower) ||
                (item.description && item.description.toLowerCase().includes(searchTermLower));
            
            const matchCat = selectedCategory === "all" || item.category === selectedCategory;
            return matchSearch && matchCat;
        });
    }, [menuItems, searchTerm, selectedCategory]);

    if (!mounted) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Digital Menu</h2>
                    <p className="text-sm font-bold text-gray-400">Manage your items, categories & ordering</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-2xl border border-gray-100">
                        <button
                            onClick={() => setViewMode("card")}
                            className={`p-2 rounded-xl transition-all ${viewMode === "card" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                            title="Card View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-xl transition-all ${viewMode === "list" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                            title="List View"
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="h-8 w-[1px] bg-gray-200 mx-1 hidden sm:block" />

                    <div className="relative group w-full sm:w-64">
                        <input 
                            type="text" 
                            placeholder="Search in menu..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-11 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                    </div>

                    <div className="relative group w-full sm:w-48">
                        <select 
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-11 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">All Categories</option>
                            {categories.map((cat: string) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                    </div>
                    
                    <div className="relative flex items-center gap-2">
                        {menuImages.length > 0 && (
                            <button 
                                onClick={() => handleAIExtract(menuImages)}
                                disabled={extractMutation.isPending}
                                className="bg-amber-600 text-white px-4 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-amber-700 transition shadow-lg shadow-amber-200 disabled:opacity-50"
                                title={`Instantly extract from ${menuImages.length} uploaded menu images`}
                            >
                                {extractMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-white" />}
                                Flash Extract ({menuImages.length})
                            </button>
                        )}

                        <button 
                            onClick={() => setAiGalleryOpen(true)}
                            disabled={extractMutation.isPending}
                            className={`px-4 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition border disabled:opacity-50 ${
                                menuImages.length > 0 
                                ? "bg-white text-amber-600 border-amber-100 hover:bg-amber-50" 
                                : "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100"
                            }`}
                        >
                            <ImageIcon className="w-4 h-4" />
                            {extractionStatus || "Select Images"}
                        </button>
                        
                        <button 
                            onClick={openCreate}
                            className="bg-primary text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-primary-dark transition shadow-lg shadow-primary/20 shrink-0"
                        >
                            <Plus className="w-4 h-4" /> Add Item
                        </button>
                        
                        {menuItems.length > 0 && (
                            <button
                                onClick={handleDeleteAll}
                                disabled={bulkDeleteMutation.isPending}
                                className="bg-red-50 text-red-600 px-4 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-red-100 transition shadow-sm border border-red-100 disabled:opacity-50 shrink-0"
                                title="Delete all items completely"
                            >
                                {bulkDeleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Delete All
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <ImageGalleryModal 
                isOpen={aiGalleryOpen} 
                onClose={() => setAiGalleryOpen(false)} 
                restaurantId={restaurantId}
                multiple={true}
                acceptVideo={false}
                existingMedia={menuImages.map(url => ({ url, type: "image" as const }))}
                onSelect={(items) => {
                    if (items.length > 0) {
                        handleAIExtract(items.map(i => i.url));
                    }
                    setAiGalleryOpen(false);
                }}
            />

            {/* List */}
            {menuLoading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm font-bold text-gray-400">Loading menu items...</p>
                </div>
            ) : menuItems.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-[32px] p-12 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-[24px] flex items-center justify-center mx-auto mb-4">
                        <Plus className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Your Menu is Empty</h3>
                    <p className="text-sm font-bold text-gray-500 mt-2 mb-6 max-w-sm mx-auto">
                        Start building your interactive digital menu. Upload images, set prices, and drag to reorder.
                    </p>
                    <button onClick={openCreate} className="bg-primary text-white px-8 py-3 rounded-2xl text-sm font-black hover:bg-primary-dark transition shadow-lg shadow-primary/20">
                        Create First Item
                    </button>
                </div>
            ) : visibleItems.length === 0 ? (
                <div className="text-center py-16 text-sm font-bold text-gray-400">
                    No items found matching your filters.
                </div>
            ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="menu-items-list">
                        {(droppableProvided) => (
                            <div 
                                {...droppableProvided.droppableProps} 
                                ref={droppableProvided.innerRef}
                                className={viewMode === "card" 
                                    ? `grid grid-cols-1 ${itemScale === "compact" ? "md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "md:grid-cols-2 lg:grid-cols-3"} gap-6` 
                                    : "space-y-3"
                                }
                            >
                                {visibleItems.map((item, index) => (
                                    <Draggable 
                                        key={item._id!} 
                                        draggableId={item._id!} 
                                        index={index}
                                        isDragDisabled={searchTerm !== ""}
                                    >
                                        {(draggableProvided, snapshot) => (
                                            <div
                                                ref={draggableProvided.innerRef}
                                                {...draggableProvided.draggableProps}
                                                className={`group relative ${snapshot.isDragging ? "z-50 shadow-2xl scale-[1.02]" : ""}`}
                                            >
                                                {viewMode === "card" ? (
                                                    <div className={`bg-white rounded-[32px] border-2 transition-all ${itemScale === "compact" ? "p-3" : "p-5"} h-full flex flex-col ${
                                                        selectedItems.includes(item._id!) ? "border-primary bg-primary/[0.02]" : "border-gray-100 hover:border-gray-200"
                                                    } ${!item.isAvailable ? "opacity-75 grayscale-[0.5]" : ""}`}>
                                                        <div className={`flex ${itemScale === "compact" ? "flex-col" : "items-start gap-4"} mb-4`}>
                                                            <div 
                                                                {...draggableProvided.dragHandleProps}
                                                                className={`p-2 rounded-xl text-gray-300 hover:text-gray-900 hover:bg-gray-50 transition cursor-grab active:cursor-grabbing ${
                                                                    searchTerm !== "" ? "opacity-0 pointer-events-none w-0 p-0" : ""
                                                                }`}
                                                            >
                                                                <GripVertical className="w-5 h-5" />
                                                            </div>

                                                            <div 
                                                                onClick={() => toggleSelectItem(item._id!)}
                                                                className={`relative ${itemScale === "compact" ? "w-full aspect-video" : "w-24 h-24"} rounded-3xl overflow-hidden bg-gray-50 cursor-pointer flex-shrink-0 group/img`}
                                                            >
                                                                {item.image ? (
                                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                                                                        <ImageIcon className="w-10 h-10" />
                                                                    </div>
                                                                )}
                                                                <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                                                                    selectedItems.includes(item._id!) ? "bg-primary/40 opacity-100" : "bg-black/20 opacity-0 group-hover/img:opacity-100"
                                                                }`}>
                                                                    <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
                                                                        selectedItems.includes(item._id!) ? "bg-white border-white text-primary" : "border-white"
                                                                    }`}>
                                                                        {selectedItems.includes(item._id!) && <CheckCircle className="w-5 h-5 fill-current" />}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className="font-black text-gray-900 truncate leading-tight">{item.name}</h4>
                                                                    {item.isPopular && <Star className="w-4 h-4 text-yellow-500 fill-current shrink-0" />}
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.category}</span>
                                                                    {!item.isAvailable && <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Out of stock</span>}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                                                            <span className="text-lg font-black text-primary">Rs. {item.price || (item.pricePaisa ? item.pricePaisa / 100 : 0)}</span>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={() => openEdit(item)}
                                                                    className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:bg-primary/10 hover:text-primary transition-all"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDelete(item._id!)}
                                                                    className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={`bg-white rounded-2xl border transition-all px-4 py-3 flex items-center gap-4 ${
                                                        selectedItems.includes(item._id!) ? "border-primary bg-primary/[0.01]" : "border-gray-100 hover:border-gray-200"
                                                    }`}>
                                                        <div 
                                                            {...draggableProvided.dragHandleProps}
                                                            className={`text-gray-300 hover:text-gray-900 transition cursor-grab active:cursor-grabbing ${
                                                                searchTerm !== "" ? "opacity-0 pointer-events-none w-0" : ""
                                                            }`}
                                                        >
                                                            <GripVertical className="w-4 h-4" />
                                                        </div>

                                                        <div 
                                                            onClick={() => toggleSelectItem(item._id!)}
                                                            className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 cursor-pointer"
                                                        >
                                                            {item.image ? (
                                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-200">
                                                                    <ImageIcon className="w-6 h-6" />
                                                                </div>
                                                            )}
                                                            {selectedItems.includes(item._id!) && (
                                                                <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                                                                    <CheckCircle className="w-4 h-4 text-white fill-current" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                                                            <div className="col-span-5">
                                                                <h4 className="text-sm font-black text-gray-900 truncate">{item.name}</h4>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight line-clamp-1">{item.category}</p>
                                                            </div>
                                                            <div className="col-span-3 text-right">
                                                                <span className="text-sm font-black text-primary">Rs. {item.price || (item.pricePaisa ? item.pricePaisa / 100 : 0)}</span>
                                                            </div>
                                                            <div className="col-span-4 flex items-center justify-end gap-2">
                                                                {item.isPopular && <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />}
                                                                {!item.isAvailable && <span className="text-[10px] font-bold text-red-400">Off</span>}
                                                                <div className="h-4 w-[1px] bg-gray-100 mx-1" />
                                                                <button 
                                                                    onClick={() => openEdit(item)}
                                                                    className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDelete(item._id!)}
                                                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {droppableProvided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}

            <MenuItemEditor
                isOpen={editorOpen}
                onClose={() => setEditorOpen(false)}
                item={editingItem}
                restaurantId={restaurantId}
                branchImages={branchImages}
                existingCategories={categories}
                onSave={async (data) => {
                    if (editingItem?._id) {
                        await updateMutation.mutateAsync({ id: editingItem._id, data });
                    } else {
                        await createMutation.mutateAsync(data);
                    }
                }}
            />

            <AIMenuReviewModal
                isOpen={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                extractedItems={extractedItems}
                restaurantId={restaurantId}
                existingCategories={categories}
                onSuccess={(count) => {
                    setExtractionStatus(`Success! Added ${count} items to your menu.`);
                    setTimeout(() => setExtractionStatus(null), 5000);
                    queryClient.invalidateQueries({ queryKey: ["menu-items", restaurantId] });
                }}
            />
        </div>
    );
}
