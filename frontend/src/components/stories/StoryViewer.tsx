"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { X, Heart, Eye } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface StoryViewerProps {
    stories: any[];
    restaurant: any;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
}

export function StoryViewer({ stories, restaurant, onClose, onNext, onPrev }: StoryViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const queryClient = useQueryClient();

    const currentStory = stories[currentIndex];
    const STORY_DURATION = currentStory?.mediaType === "video" ? 15000 : 5000; // 15s for video fallback, 5s for images

    useEffect(() => {
        // Prevent body scroll when viewer is open
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, []);

    // Record View Mutation
    const viewMutation = useMutation({
        mutationFn: async (storyId: string) => {
             await fetch(`/api/stories/${storyId}/view`, { method: "POST" });
        }
    });

    // Record view when story changes
    useEffect(() => {
        if (currentStory?._id) {
            viewMutation.mutate(currentStory._id);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStory?._id]);

    // Progress Bar Logic
    useEffect(() => {
        if (isPaused || !currentStory) return;

        let animationFrame: number;
        let start = Date.now();

        const updateProgress = () => {
            const passed = Date.now() - start;
            
            // If video, try to sync with video time rather than fallback duration
            if (currentStory.mediaType === "video" && videoRef.current) {
                const duration = videoRef.current.duration || STORY_DURATION / 1000;
                const currentTime = videoRef.current.currentTime;
                const p = (currentTime / duration) * 100;
                setProgress(Math.min(p, 100));

                if (currentTime >= duration) {
                    handleNextStory();
                } else {
                    animationFrame = requestAnimationFrame(updateProgress);
                }
            } else {
                const p = (passed / STORY_DURATION) * 100;
                setProgress(Math.min(p, 100));

                if (passed >= STORY_DURATION) {
                     handleNextStory();
                } else {
                     animationFrame = requestAnimationFrame(updateProgress);
                }
            }
        };

        animationFrame = requestAnimationFrame(updateProgress);

        return () => cancelAnimationFrame(animationFrame);
    }, [currentIndex, isPaused, currentStory]);

    const handleNextStory = () => {
        setProgress(0);
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onNext();
        }
    };

    const handlePrevStory = () => {
        setProgress(0);
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            onPrev();
        }
    };

    const likeMutation = useMutation({
        mutationFn: async () => {
             const res = await fetch(`/api/stories/${currentStory._id}/like`, { method: "POST" });
             if(!res.ok) throw new Error();
             return res.json();
        },
        onMutate: () => {
            // Optimistic update logic could go here
        },
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ["storyFeed"] });
        }
    });

    const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
        const x = e.clientX;
        const width = window.innerWidth;
        if (x < width * 0.3) {
            handlePrevStory();
        } else if (x > width * 0.7) {
            handleNextStory();
        }
    };

    if (!currentStory) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center sm:p-4 md:p-8 backdrop-blur-sm">
            <div 
                className="w-full max-w-sm h-full sm:h-[85vh] sm:rounded-2xl overflow-hidden bg-gray-900 relative shadow-2xl flex flex-col"
                onPointerDown={() => setIsPaused(true)}
                onPointerUp={() => setIsPaused(false)}
                onPointerLeave={() => setIsPaused(false)}
            >
                {/* Progress Bars */}
                <div className="absolute top-2 w-full px-2 flex gap-1 z-20">
                    {stories.map((_, idx) => (
                        <div key={idx} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-white transition-all ease-linear"
                                style={{ 
                                    width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%"
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header Container */}
                <div className="absolute top-4 w-full px-4 flex items-center justify-between z-20">
                    <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8 rounded-full border border-white/20 overflow-hidden">
                            <Image src={restaurant?.logoUrl || "/placeholder.jpg"} alt={restaurant?.name} fill className="object-cover" />
                        </div>
                        <span className="text-white text-sm font-semibold tracking-wide drop-shadow-md">
                            {restaurant?.brandName || restaurant?.name}
                        </span>
                        <span className="text-white/60 text-xs ml-2 drop-shadow-md">
                             {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-md transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Media Container */}
                <div className="flex-1 relative bg-black flex items-center justify-center cursor-pointer" onClick={handleTap}>
                    {currentStory.mediaType === "video" ? (
                        <video 
                            ref={videoRef}
                            src={currentStory.mediaUrl} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-contain"
                            onEnded={handleNextStory}
                        />
                    ) : (
                        <Image 
                            src={currentStory.mediaUrl} 
                            alt="Story" 
                            fill 
                            priority
                            className="object-contain" 
                        />
                    )}
                    
                    {/* Caption Overlay */}
                    {currentStory.caption && (
                         <div className="absolute bottom-16 left-0 right-0 px-4 text-center z-10 pointer-events-none">
                             <span className="bg-black/40 backdrop-blur-md text-white text-sm py-1.5 px-3 rounded-lg inline-block break-words max-w-full leading-relaxed drop-shadow-lg">
                                  {currentStory.caption}
                             </span>
                         </div>
                    )}
                </div>

                {/* Interaction Footer */}
                <div className="absolute bottom-0 w-full px-4 py-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between z-20">
                    <p className="text-white/60 text-xs px-2 truncate">Replying is disabled</p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); likeMutation.mutate(); }}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors group"
                    >
                        <Heart className={cn("h-6 w-6 text-white group-active:scale-90 transition-transform", likeMutation.isPending && "animate-pulse")} />
                    </button>
                </div>
            </div>
            
            {/* Desktop Navigation Hints */}
            <div className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2 p-4 text-white/50 cursor-pointer hover:text-white" onClick={handlePrevStory}>
                 Tap Left
            </div>
            <div className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 p-4 text-white/50 cursor-pointer hover:text-white" onClick={handleNextStory}>
                 Tap Right
            </div>
        </div>
    );
}
