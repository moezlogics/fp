"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";
import { StoryViewer } from "./StoryViewer";
import { cn } from "@/lib/utils";

interface StoryRingProps {
    restaurantId: string;
    restaurantName: string;
    logoUrl: string;
    className?: string;
}

export function StoryRing({ restaurantId, restaurantName, logoUrl, className }: StoryRingProps) {
    const [isViewerOpen, setIsViewerOpen] = useState(false);

    const { data: storiesData } = useQuery({
        queryKey: ["restaurantStories", restaurantId],
        queryFn: async () => {
            const res = await fetch(`/api/stories/restaurant/${restaurantId}`);
            if (!res.ok) throw new Error("Failed to fetch stories");
            return res.json();
        },
        enabled: !!restaurantId,
        staleTime: 60 * 1000,
        retry: 1,
    });

    const hasStories = storiesData?.stories && storiesData.stories.length > 0;
    const initial = (restaurantName || "?").charAt(0).toUpperCase();

    return (
        <>
            <div 
                className={cn(
                    "relative rounded-full shrink-0",
                    hasStories 
                        ? "cursor-pointer group p-[3px] bg-gradient-to-tr from-yellow-400 via-orange-500 to-primary shadow-lg animate-pulse-ring" 
                        : "p-[2px] border-[3px] border-white bg-white shadow-xl",
                    className
                )}
                onClick={() => {
                     if (hasStories) setIsViewerOpen(true);
                }}
            >
                <div className={cn(
                    "w-full h-full bg-gray-100 rounded-full p-[2px] relative overflow-hidden",
                    hasStories && "group-hover:scale-[0.97] transition-transform duration-200"
                )}>
                    {logoUrl ? (
                        <Image 
                            src={logoUrl} 
                            alt={restaurantName} 
                            fill 
                            className="object-cover rounded-full"
                            sizes="(max-width: 768px) 80px, 120px"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-50 flex items-center justify-center rounded-full">
                            <span className="text-xl md:text-3xl font-black text-gray-200">{initial}</span>
                        </div>
                    )}
                </div>
            </div>

            {isViewerOpen && hasStories && (
                 <StoryViewer 
                      stories={storiesData.stories}
                      restaurant={{ _id: restaurantId, name: restaurantName, logoUrl }}
                      onClose={() => setIsViewerOpen(false)}
                      onNext={() => setIsViewerOpen(false)}
                      onPrev={() => setIsViewerOpen(false)}
                 />
            )}

            {/* Subtle pulse animation for story ring */}
            <style jsx global>{`
                @keyframes pulseRing {
                    0%, 100% { box-shadow: 0 4px 16px rgba(249,115,22,0.25); }
                    50% { box-shadow: 0 4px 24px rgba(249,115,22,0.45); }
                }
                .animate-pulse-ring {
                    animation: pulseRing 3s ease-in-out infinite;
                }
            `}</style>
        </>
    );
}
