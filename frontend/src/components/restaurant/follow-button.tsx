"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, UserMinus, Loader2, Sparkles } from "lucide-react";
import { useAuthModal } from "@/components/auth/auth-modal";
import { motion, AnimatePresence } from "framer-motion";

interface FollowButtonProps {
    restaurantId: string;
    initialFollowersCount: number;
}

export function FollowButton({ restaurantId, initialFollowersCount }: FollowButtonProps) {
    const { data: session } = useSession();
    const { openAuthModal } = useAuthModal();
    const queryClient = useQueryClient();

    // Query to check if the user is following
    const { data: followStatus, isLoading: isStatusLoading } = useQuery({
        queryKey: ["follow-status", restaurantId],
        queryFn: async () => {
            if (!session?.user) return { isFollowing: false, followersCount: initialFollowersCount };
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/restaurants/${restaurantId}/follow-status`, {
                headers: {
                    Authorization: `Bearer ${(session as any)?.accessToken}`,
                },
            });
            if (!res.ok) throw new Error("Failed to fetch follow status");
            return res.json();
        },
        enabled: !!restaurantId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const isFollowing = followStatus?.isFollowing || false;
    const followersCount = followStatus?.followersCount ?? initialFollowersCount;

    // Mutation to toggle follow
    const mutation = useMutation({
        mutationFn: async () => {
            if (!session?.user) {
                openAuthModal();
                return;
            }
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/restaurants/${restaurantId}/follow`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${(session as any)?.accessToken}`,
                },
            });
            if (!res.ok) throw new Error("Failed to update follow status");
            return res.json();
        },
        onSuccess: (data) => {
            // Optimistically update or just invalidate
            queryClient.setQueryData(["follow-status", restaurantId], {
                isFollowing: data.isFollowing,
                followersCount: data.followersCount,
            });
        },
    });

    const handleFollow = () => {
        if (!session?.user) {
            openAuthModal();
            return;
        }
        mutation.mutate();
    };

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={handleFollow}
                disabled={mutation.isPending || isStatusLoading}
                className={`
                    group relative flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-[13px] uppercase tracking-widest transition-all active:scale-95
                    ${isFollowing 
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200" 
                        : "bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
                    }
                `}
            >
                <AnimatePresence mode="wait">
                    {mutation.isPending ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                        >
                            <Loader2 className="w-4 h-4 animate-spin" />
                        </motion.div>
                    ) : isFollowing ? (
                        <motion.div
                            key="unfollow"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-2"
                        >
                            <UserMinus className="w-4 h-4" />
                            <span>Following</span>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="follow"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Follow</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Visual feedback for follow */}
                {!isFollowing && !mutation.isPending && (
                    <div className="absolute -top-1 -right-1">
                        <Sparkles className="w-3 h-3 text-yellow-400 fill-yellow-400 animate-pulse" />
                    </div>
                )}
            </button>

            <div className="flex flex-col">
                <span className="text-[14px] font-black text-gray-900 leading-none">
                    {followersCount.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Followers
                </span>
            </div>
        </div>
    );
}
