"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export function MenuLightbox({ images }: { images: string[] }) {
    const [index, setIndex] = useState(-1);

    if (!images || images.length === 0) return null;

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIndex(0)}
                className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
            >
                📋 View Full Menu ({images.length} pages)
            </button>

            {/* Menu Preview Grid */}
            <div className="grid grid-cols-3 gap-2 mt-3">
                {images.slice(0, 3).map((img, i) => (
                    <button key={i} onClick={() => setIndex(i)} className="aspect-[3/4] rounded-lg overflow-hidden border hover:opacity-80 transition relative">
                        <img src={img} alt={`Menu page ${i + 1}`} className="w-full h-full object-cover" />
                        {i === 2 && images.length > 3 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-sm">+{images.length - 3} more</div>
                        )}
                    </button>
                ))}
            </div>

            {/* Lightbox */}
            <Lightbox
                open={index >= 0}
                close={() => setIndex(-1)}
                index={index}
                slides={images.map(src => ({ src }))}
            />
        </>
    );
}

export function GalleryLightbox({ images, coverImage }: { images: string[]; coverImage?: string }) {
    const [index, setIndex] = useState(-1);
    const allImages = coverImage ? [coverImage, ...images] : images;

    if (allImages.length === 0) return null;

    return (
        <>
            {/* Gallery Grid */}
            <div className="grid grid-cols-4 gap-1.5">
                {allImages.slice(0, 4).map((img, i) => (
                    <button key={i} onClick={() => setIndex(i)} className={`aspect-square rounded-lg overflow-hidden hover:opacity-80 transition relative ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        {i === 3 && allImages.length > 4 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-sm">+{allImages.length - 4}</div>
                        )}
                    </button>
                ))}
            </div>

            <Lightbox
                open={index >= 0}
                close={() => setIndex(-1)}
                index={index}
                slides={allImages.map(src => ({ src }))}
            />
        </>
    );
}
