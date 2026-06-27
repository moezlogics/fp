"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { StoryViewer } from "./StoryViewer";

export function StoryFeed() {
    const { data: session } = useSession();
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);

    const { data: feedData, isLoading } = useQuery({
        queryKey: ["storyFeed"],
        queryFn: async () => {
            const res = await fetch("/api/stories/feed", {
                headers: {
                    ...(session?.accessToken && { Authorization: `Bearer ${session.accessToken}` })
                }
            });
            if (!res.ok) throw new Error("Failed to fetch stories feed");
            return res.json();
        },
        enabled: !!session?.accessToken, // Only fetch for logged-in users
        staleTime: 60 * 1000,
    });

    if (!session || isLoading || !feedData?.feed || feedData.feed.length === 0) {
        return null;
    }

    const { feed } = feedData;

    return (
        <section className="py-2 mb-4">
            <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar snap-x">
                {feed.map((item: any) => {
                    const restaurant = item.restaurant;
                    return (
                        <div 
                            key={restaurant._id} 
                            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer snap-start w-16 md:w-20 group"
                            onClick={() => setSelectedRestaurantId(restaurant._id)}
                        >
                            <div className="w-14 h-14 md:w-16 md:h-16 relative rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-orange-500 to-primary group-hover:scale-105 transition-transform">
                                <div className="w-full h-full bg-white rounded-full p-0.5 relative overflow-hidden">
                                    <Image 
                                        src={restaurant.logoUrl || "/placeholder.jpg"} 
                                        alt={restaurant.name} 
                                        fill 
                                        className="object-cover rounded-full"
                                        sizes="64px"
                                    />
                                </div>
                            </div>
                            <span className="text-[10px] md:text-xs font-medium text-center truncate w-full group-hover:text-primary transition-colors">
                                {restaurant.brandName || restaurant.name}
                            </span>
                        </div>
                    );
                })}
            </div>

            {selectedRestaurantId && (
                 <StoryViewer 
                      stories={feed.find((i: any) => i.restaurant._id === selectedRestaurantId)?.stories || []}
                      restaurant={feed.find((i: any) => i.restaurant._id === selectedRestaurantId)?.restaurant}
                      onClose={() => setSelectedRestaurantId(null)}
                      onNext={() => {
                          const currentIndex = feed.findIndex((i: any) => i.restaurant._id === selectedRestaurantId);
                          if (currentIndex < feed.length - 1) {
                              setSelectedRestaurantId(feed[currentIndex + 1].restaurant._id);
                          } else {
                              setSelectedRestaurantId(null);
                          }
                      }}
                      onPrev={() => {
                        const currentIndex = feed.findIndex((i: any) => i.restaurant._id === selectedRestaurantId);
                        if (currentIndex > 0) {
                            setSelectedRestaurantId(feed[currentIndex - 1].restaurant._id);
                        }
                    }}
                 />
            )}
        </section>
    );
}
