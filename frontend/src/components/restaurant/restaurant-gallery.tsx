"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Heart, Share2, X, Link2, Check, Crown, Tag, BadgeCheck, Sparkles, Utensils, Home, Palmtree, MapPin, LayoutGrid, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { useAuthModal } from "@/components/auth/auth-modal";
import { blurDataUrl } from "@/lib/blur-data-url";

interface GalleryImage {
    url: string;
    category: "Food" | "Interior" | "Vibes" | "Location";
    altText?: string;
}

interface RestaurantGalleryProps {
    restaurantId: string;
    coverImage: string;
    coverImageAlt?: string;
    galleryImages: (string | GalleryImage)[];
    restaurantName: string;
    restaurantSlug: string;
    videoUrl?: string;
    discountLabel?: string | null;
    isPrimePartner?: boolean;
    isVerifiedPartner?: boolean;
    isFeatured?: boolean;
    coverPriority?: boolean;
}

const CATEGORIES = ["All", "Food", "Interior", "Vibes", "Location"] as const;
type CategoryType = (typeof CATEGORIES)[number];

const CATEGORY_ICONS: Record<string, any> = {
    All: LayoutGrid,
    Food: Utensils,
    Interior: Home,
    Vibes: Sparkles,
    Location: MapPin,
};

/* ─────────── Component ─────────── */
export function RestaurantGallery({
    restaurantId, coverImage, coverImageAlt, galleryImages, restaurantName, restaurantSlug, videoUrl, discountLabel, isPrimePartner, isVerifiedPartner, isFeatured,
    coverPriority = true,
}: RestaurantGalleryProps) {
    const { data: session } = useSession();
    const { openAuthModal } = useAuthModal();

    /* ── Normalization (Media + Categories) ── */
    const normalizedImages: GalleryImage[] = [
        { url: coverImage, category: "Interior" as const, altText: coverImageAlt || `${restaurantName} - Main Entrance` },
        ...galleryImages.map(img => 
            typeof img === "string" 
                ? { url: img, category: "Food" as const, altText: `${restaurantName} Food` } 
                : { url: img.url, category: img.category, altText: img.altText || `${restaurantName} ${img.category || 'Interior'}` }
        )
    ].filter(i => i.url);

    const [activeCategory, setActiveCategory] = useState<CategoryType>("All");
    const [lbIndex, setLbIndex] = useState(-1);

    const filteredMedia = activeCategory === "All" 
        ? normalizedImages 
        : normalizedImages.filter(img => img.category === activeCategory);

    const slides = filteredMedia.map(img => ({ src: img.url, alt: img.altText }));

    /* ── Save / Heart ── */
    const [saved, setSaved] = useState(false);
    const [saveAnim, setSaveAnim] = useState(false);

    useEffect(() => {
        if (!session?.user) return;
        fetch("/api/users/saved")
            .then(r => r.json())
            .then(d => {
                const ids: string[] = d.savedRestaurants || d.data?.savedRestaurants || [];
                if (ids.includes(restaurantId)) setSaved(true);
            })
            .catch(() => { });
    }, [session, restaurantId]);

    const toggleSave = async () => {
        const performSave = async () => {
            setSaveAnim(true);
            setTimeout(() => setSaveAnim(false), 400);
            const prev = saved;
            setSaved(!prev);
            try {
                const res = await fetch("/api/users/saved", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ restaurantId }),
                });
                if (!res.ok) {
                    setSaved(prev);
                }
            } catch {
                setSaved(prev);
            }
        };

        if (!session?.user) {
            openAuthModal(() => performSave());
            return;
        }

        await performSave();
    };

    /* ── Share ── */
    const [shareOpen, setShareOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const shareRef = useRef<HTMLDivElement>(null);
    const [pageUrl, setPageUrl] = useState(`https://foodiespakistan.pk/${restaurantSlug}/`);
    useEffect(() => {
        if (typeof window !== "undefined") {
            setPageUrl(window.location.href);
        }
    }, []);

    useEffect(() => {
        document.getElementById("restaurant-lcp-cover")?.classList.add("hidden");
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const copyLink = () => {
        navigator.clipboard.writeText(pageUrl);
        setCopied(true);
        setTimeout(() => { setCopied(false); setShareOpen(false); }, 1200);
    };



    /* ─────── Desktop Gallery Grid (md+) ─────── */
    const DesktopGrid = () => (
        <div className="hidden md:grid grid-cols-4 gap-[3px] h-[420px] rounded-2xl overflow-hidden shadow-sm lg:shadow-md border border-gray-100">
            {/* Cover — 2×2 */}
            <div className="col-span-2 row-span-2 relative group cursor-pointer overflow-hidden border-r-[1.5px] border-gray-100"
                onClick={() => { 
                    const cat = normalizedImages[0].category;
                    setActiveCategory(cat); 
                    setLbIndex(0); // It's the first image in any filtered list because it's first in normalized
                }}>
                <Image src={normalizedImages[0].url || "/placeholder.jpg"} alt={normalizedImages[0].altText || `${restaurantName} - Main Entrance`} fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-105" sizes="(max-width: 768px) 66vw, 50vw" priority={coverPriority} quality={85} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
            </div>

            {/* Gallery images — 4 cells */}
            {[1, 2, 3, 4].map(i => {
                const img = normalizedImages[i];
                const isLast = i === 4;
                if (!img) return <div key={i} className="bg-gray-50 flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-200" /></div>;
                return (
                    <div key={i} className="relative group cursor-pointer overflow-hidden border-b-[1.5px] border-l-[1.5px] border-gray-100 last:border-b-0"
                        onClick={() => { 
                            const cat = normalizedImages[i].category;
                            setActiveCategory(cat);
                            const filtered = normalizedImages.filter(img => img.category === cat);
                            const idx = filtered.findIndex(img => img.url === normalizedImages[i].url);
                            setLbIndex(idx >= 0 ? idx : 0);
                        }}>
                        <Image src={img.url} alt={img.altText || `${restaurantName} Interior`} fill className="object-cover transition-transform duration-1000 group-hover:scale-105" sizes="(max-width: 768px) 33vw, 25vw" placeholder="blur" blurDataURL={blurDataUrl} quality={85} />
                        
                        {isLast && normalizedImages.length > 5 && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 backdrop-blur-[3px] transition-all group-hover:bg-black/60">
                                <div className="text-center group-hover:scale-110 transition-transform duration-500">
                                    <span className="text-white font-black text-3xl drop-shadow-2xl tracking-tighter">+{normalizedImages.length - 5}</span>
                                    <p className="text-white/90 text-[10px] font-black uppercase tracking-[0.2em] mt-[-2px]">Experience More</p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-2 px-4">
                                    {CATEGORIES.slice(1).map(cat => (
                                        <button 
                                            key={cat}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveCategory(cat);
                                                setLbIndex(0);
                                            }}
                                            className="h-9 px-4 rounded-xl bg-white/10 hover:bg-primary backdrop-blur-md border border-white/20 flex items-center justify-center transition-all active:scale-95 group/btn shadow-lg"
                                        >
                                            <span className="text-[11px] font-black text-white uppercase tracking-wider">{cat}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    /* ─────── Mobile Gallery Grid (<md) ─────── */
    const MobileGrid = () => (
        <div className="md:hidden grid grid-cols-3 grid-rows-2 gap-0.5" style={{ height: 'clamp(200px, 50vw, 280px)' }}>
            {/* Cover — 2×2 */}
            <div className="col-span-2 row-span-2 relative cursor-pointer overflow-hidden bg-gray-100"
                onClick={() => { 
                    const cat = normalizedImages[0].category;
                    setActiveCategory(cat); 
                    setLbIndex(0);
                }}>
                <Image src={normalizedImages[0].url || "/placeholder.jpg"} alt={normalizedImages[0].altText || `${restaurantName}`} fill
                    className="object-cover" sizes="(max-width: 768px) 66vw, 50vw" priority={coverPriority} quality={85} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>

            {/* Right top */}
            {normalizedImages[1] ? (
                <div className="col-span-1 row-span-1 relative cursor-pointer overflow-hidden bg-gray-100"
                    onClick={() => { 
                        const cat = normalizedImages[1].category;
                        setActiveCategory(cat);
                        const filtered = normalizedImages.filter(img => img.category === cat);
                        const idx = filtered.findIndex(img => img.url === normalizedImages[1].url);
                        setLbIndex(idx >= 0 ? idx : 0);
                    }}>
                    <Image src={normalizedImages[1].url} alt={normalizedImages[1].altText || `${restaurantName}`} fill className="object-cover" sizes="(max-width: 768px) 33vw, 25vw" placeholder="blur" blurDataURL={blurDataUrl} quality={85} />
                </div>
            ) : <div className="bg-gray-50 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-200" /></div>}

            {/* Right bottom — "+N" overlay */}
            {normalizedImages[2] ? (
                <div className="col-span-1 row-span-1 relative cursor-pointer overflow-hidden bg-gray-100"
                    onClick={() => { 
                        const cat = normalizedImages[2].category;
                        setActiveCategory(cat);
                        const filtered = normalizedImages.filter(img => img.category === cat);
                        const idx = filtered.findIndex(img => img.url === normalizedImages[2].url);
                        setLbIndex(idx >= 0 ? idx : 0);
                    }}>
                    <Image src={normalizedImages[2].url} alt={normalizedImages[2].altText || `${restaurantName}`} fill className="object-cover" sizes="(max-width: 768px) 33vw, 25vw" placeholder="blur" blurDataURL={blurDataUrl} quality={85} />
                    
                    {normalizedImages.length > 3 && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-[2px]">
                            <div className="text-center mb-1">
                                <span className="text-white font-black text-xl leading-none">+{normalizedImages.length - 3}</span>
                                <p className="text-white/80 text-[8px] font-black uppercase tracking-widest mt-0.5">Explore</p>
                            </div>
                            <div className="flex flex-col items-center gap-1 w-full px-2">
                                {CATEGORIES.slice(1, 4).map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveCategory(cat);
                                            setLbIndex(0);
                                        }}
                                        className="h-5 w-full rounded-md bg-white/10 active:bg-primary backdrop-blur-md border border-white/20 flex items-center justify-center transition-all active:scale-90"
                                    >
                                        <span className="text-[7px] font-black text-white uppercase tracking-tighter">{cat}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : <div className="bg-gray-50" />}
        </div>
    );

    return (
        <>


            <div className="relative group/gallery">
                <DesktopGrid />

                <div className="absolute top-3 left-3 md:top-4 md:left-6 z-10 flex max-w-[70%] flex-col gap-2">



                    {discountLabel && (
                        <div className="inline-flex max-w-full items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-black tracking-wide text-white backdrop-blur-sm shadow-lg md:text-xs">
                            <Tag className="h-3 w-3 shrink-0 text-primary/70" />
                            <span className="truncate whitespace-nowrap">{discountLabel}</span>
                        </div>
                    )}
                </div>
                <MobileGrid />

                {/* ── Action Buttons (Save + Share) ── */}
                {/* Desktop */}
                <div className="hidden md:flex absolute top-4 right-6 gap-3 z-10">
                    <button onClick={toggleSave} aria-label="Save"
                        className={`p-2.5 rounded-full shadow-lg transition-all flex items-center justify-center group ${saved
                            ? "bg-white text-red-500"
                            : "bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white"
                            } ${saveAnim ? "scale-125" : ""}`}>
                        <Heart className={`w-5 h-5 transition ${saved ? "fill-red-500 text-red-500" : "group-hover:text-primary"}`} />
                    </button>
                    <div className="relative" ref={shareRef}>
                        <button onClick={() => setShareOpen(!shareOpen)}
                            className="bg-white/90 backdrop-blur-sm text-gray-700 px-4 py-2.5 rounded-full shadow-lg hover:bg-white transition-colors flex items-center gap-2 text-sm font-bold">
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                        {shareOpen && <ShareDropdown pageUrl={pageUrl} restaurantName={restaurantName} copyLink={copyLink} copied={copied} />}
                    </div>
                </div>

                {/* Mobile */}
                <div className="md:hidden absolute top-3 right-3 flex gap-2.5 z-10">
                    <button onClick={toggleSave} aria-label="Save"
                        className={`size-9 rounded-full flex items-center justify-center shadow-lg transition-all ${saved
                            ? "bg-white text-red-500"
                            : "bg-black/40 backdrop-blur-sm text-white hover:bg-black/50"
                            } ${saveAnim ? "scale-125" : ""}`}>
                        <Heart className={`w-[18px] h-[18px] ${saved ? "fill-red-500 text-red-500" : ""}`} />
                    </button>
                    <div className="relative" ref={shareRef}>
                        <button onClick={() => setShareOpen(!shareOpen)} aria-label="Share"
                            className="size-9 bg-black/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center shadow-lg hover:bg-black/50 transition-colors">
                            <Share2 className="w-[18px] h-[18px]" />
                        </button>
                        {shareOpen && <ShareDropdown pageUrl={pageUrl} restaurantName={restaurantName} copyLink={copyLink} copied={copied} />}
                    </div>
                </div>
            </div>

            {/* Lightbox with Category Filter */}
            <Lightbox
                open={lbIndex >= 0}
                close={() => setLbIndex(-1)}
                index={lbIndex}
                slides={slides}
                plugins={[Counter, Zoom]}
                animation={{ fade: 300, swipe: 500 }}
                counter={{ container: { style: { top: "unset", bottom: 20 } } }}
                carousel={{ finite: slides.length <= 1, padding: "12px" }}
                styles={{ 
                    container: { 
                        backgroundColor: "rgba(0, 0, 0, 0.95)",
                        backdropFilter: "blur(8px)" 
                    } 
                }}
                render={{
                    buttonPrev: slides.length <= 1 ? () => null : undefined,
                    buttonNext: slides.length <= 1 ? () => null : undefined,
                    slide: ({ slide }) => (
                        <div className="relative w-full h-full flex items-center justify-center p-6 pb-24 md:pb-36">
                            <img 
                                src={slide.src} 
                                alt={slide.alt || ""} 
                                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-all"
                            />
                        </div>
                    ),
                    controls: () => (
                        <div className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col items-center pb-8 md:pb-12 pointer-events-none">
                            <div className="pointer-events-auto flex items-center bg-black/50 backdrop-blur-2xl border border-white/10 rounded-[28px] p-1.5 gap-1 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-x-auto max-w-[90%] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {CATEGORIES.map(cat => {
                                    const isActive = activeCategory === cat;
                                    return (
                                        <button
                                            key={cat}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveCategory(cat);
                                                setLbIndex(0);
                                            }}
                                            className={`relative px-4 md:px-6 py-2.5 md:py-3.5 rounded-[18px] md:rounded-[22px] text-[9px] md:text-[11px] font-black uppercase tracking-[0.1em] md:tracking-[0.15em] transition-all whitespace-nowrap active:scale-95 ${isActive ? "text-white" : "text-white/40 hover:text-white/70"
                                                }`}
                                        >
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="lb-active-tab-fixed" 
                                                    className="absolute inset-0 bg-primary rounded-[18px] md:rounded-[22px] -z-10 shadow-lg shadow-primary/30" 
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} 
                                                />
                                            )}
                                            {cat}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )
                }}
            />


        </>
    );
}



function ImageSkeleton({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-gray-100 ${className}`}>
             <LayoutGrid className="w-full h-full text-gray-200 p-8" />
        </div>
    );
}

/* ─────── Share Dropdown ─────── */
function ShareDropdown({ pageUrl, restaurantName, copyLink, copied }: {
    pageUrl: string; restaurantName: string; copyLink: () => void; copied: boolean;
}) {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`Check out ${restaurantName} on Foodies Pakistan!\n${pageUrl}`)}`;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;

    return (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 w-52 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                <span className="text-lg">💬</span> WhatsApp
            </a>
            <a href={fbUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                <span className="text-lg">📘</span> Facebook
            </a>
            <button onClick={copyLink}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-sm font-medium text-gray-700 w-full text-left">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4 text-gray-400" />}
                {copied ? "Copied!" : "Copy Link"}
            </button>
        </div>
    );
}
