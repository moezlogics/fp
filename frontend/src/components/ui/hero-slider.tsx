"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function HeroSlider({ banners }: { banners: any[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!banners || banners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, 5000); // 5 seconds autoplay
        return () => clearInterval(interval);
    }, [banners]);

    if (!banners || banners.length === 0) {
        // Fallback if no banners are defined
        return (
            <div className="relative rounded-xl overflow-hidden shadow-lg h-48 md:h-80 lg:h-96 group bg-gray-900 flex items-center justify-center">
                <h1 className="text-white text-3xl font-bold font-heading italic">foodies</h1>
            </div>
        );
    }

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % banners.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));

    const current = banners[currentIndex];

    return (
        <div className="relative rounded-xl overflow-hidden shadow-lg h-48 md:h-80 lg:h-96 group">
            {banners.map((slide, i) => (
                <div
                    key={slide._id}
                    className={`absolute inset-0 transition-opacity duration-1000 ${i === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                        }`}
                >
                    <Image
                        alt={slide.title || "Banner"}
                        className="object-cover"
                        src={slide.imageUrl}
                        fill
                        quality={70}
                        sizes="(max-width: 768px) 100vw, 1200px"
                        {...(i === 0 ? { priority: true, fetchPriority: "high" as const } : { loading: "lazy" as const })}
                    />
                    {/* Only show gradient + text if title or subtitle exists */}
                    {(slide.title || slide.subtitle) ? (
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex items-center px-6 md:px-12">
                            <div className="max-w-lg">
                                {slide.subtitle && (
                                    <p className="text-accent font-bold text-sm md:text-lg mb-1 drop-shadow-sm">{slide.subtitle}</p>
                                )}
                                {slide.title && (
                                    <h1 className="text-white text-3xl md:text-5xl font-black mb-6 leading-tight drop-shadow-md">
                                        {slide.title}
                                    </h1>
                                )}
                                {slide.linkUrl && (
                                    <Link
                                        href={slide.linkUrl}
                                        className="btn-primary"
                                    >
                                        Explore Now
                                    </Link>
                                )}
                            </div>
                        </div>
                    ) : slide.linkUrl ? (
                        <Link href={slide.linkUrl} className="absolute inset-0 z-10" />
                    ) : null}
                </div>
            ))}

            {banners.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 rounded-full p-2 text-white backdrop-blur-sm transition"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 rounded-full p-2 text-white backdrop-blur-sm transition"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                    <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
                        {banners.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? "bg-primary w-6" : "bg-white/50"
                                    }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
