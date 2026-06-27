"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useBranch } from "../owner-shell";
import { Loader2, Plus, Trash2, Eye, Heart, Image as ImageIcon, Clock, Upload, Film, Camera } from "lucide-react";
import { toast } from "react-hot-toast";
import Image from "next/image";

interface Story {
    _id: string;
    mediaUrl: string;
    mediaType: "image" | "video";
    caption?: string;
    viewsCount: number;
    likesCount: number;
    expiresAt: string;
    createdAt: string;
}

export default function OwnerStoriesPage() {
    const { data: session } = useSession();
    const { branch } = useBranch();
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState("");

    const restaurantId = branch?._id;

    const { data: storiesData, isLoading } = useQuery({
        queryKey: ["ownerStories", restaurantId],
        queryFn: async () => {
            const res = await fetch(`/api/stories/owner/my-stories/${restaurantId}`);
            if (!res.ok) throw new Error("Failed to fetch stories");
            return res.json();
        },
        enabled: !!restaurantId,
        staleTime: 30 * 1000,
        retry: 2,
    });

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!file || !restaurantId) throw new Error("Missing file or restaurant");
            const formData = new FormData();
            formData.append("restaurantId", restaurantId);
            formData.append("media", file);
            formData.append("mediaType", file.type.startsWith("video") ? "video" : "image");
            if (caption) formData.append("caption", caption);

            const res = await fetch("/api/stories", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Upload failed");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("Story posted! It will be visible for 24 hours.");
            setFile(null);
            setPreview(null);
            setCaption("");
            queryClient.invalidateQueries({ queryKey: ["ownerStories", restaurantId] });
        },
        onError: (err: Error) => toast.error(err.message || "Failed to post story"),
    });

    const deleteMutation = useMutation({
        mutationFn: async (storyId: string) => {
            const res = await fetch(`/api/stories/${storyId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Story deleted");
            queryClient.invalidateQueries({ queryKey: ["ownerStories", restaurantId] });
        },
        onError: () => toast.error("Failed to delete story"),
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 20 * 1024 * 1024) {
                toast.error("File is too large (Max 20MB)");
                return;
            }
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const getTimeRemaining = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return "Expired";
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const stories: Story[] = storiesData?.stories || [];

    if (!branch) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "#e8323b" }} />
                    <p className="text-sm text-gray-400 font-medium">Loading restaurant data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">Stories</h1>
                <p className="text-sm text-gray-400 mt-1">Share updates with your audience. Stories expire after 24 hours.</p>
            </div>

            {/* Upload Card */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div className="px-5 py-4 border-b border-gray-50">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Upload className="w-4 h-4" style={{ color: "#e8323b" }} />
                        Post New Story
                    </h3>
                </div>
                <div className="p-5 space-y-4">
                    {/* File Input */}
                    {!preview ? (
                        <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all group">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-primary/5 flex items-center justify-center transition-colors">
                                    <ImageIcon className="w-6 h-6 text-gray-300 group-hover:text-primary/50 transition-colors" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-gray-500">Click to upload</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Photo or video up to 20MB</p>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                                        <Camera className="w-3 h-3" /> JPG, PNG, WebP
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                                        <Film className="w-3 h-3" /> MP4, MOV
                                    </span>
                                </div>
                            </div>
                            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                        </label>
                    ) : (
                        <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[320px] mx-auto">
                            {file?.type.startsWith("video") ? (
                                <video src={preview} controls className="w-full h-full object-contain" />
                            ) : (
                                <Image src={preview} alt="Preview" fill className="object-contain" />
                            )}
                            <button
                                onClick={() => { setFile(null); setPreview(null); }}
                                className="absolute top-2 right-2 w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {/* Caption */}
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption... (optional)"
                        maxLength={200}
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium bg-gray-50/60 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-300 resize-none"
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">{caption.length}/200</span>
                        <button
                            disabled={!file || uploadMutation.isPending}
                            onClick={() => uploadMutation.mutate()}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs disabled:opacity-50 transition-all active:scale-95"
                            style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232,50,59,0.25)" }}
                        >
                            {uploadMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Plus className="w-3.5 h-3.5" />
                            )}
                            {uploadMutation.isPending ? "Posting..." : "Post Story"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Stories */}
            <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
                    Active Stories ({stories.length})
                </h3>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#e8323b" }} />
                    </div>
                ) : stories.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                            <ImageIcon className="w-7 h-7 text-gray-300" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">No Active Stories</h4>
                        <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                            Post your first story to engage your customers. Share daily specials, behind-the-scenes, or new dishes!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {stories.map((story) => (
                            <div key={story._id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden group" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                                {/* Media Preview */}
                                <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
                                    {story.mediaType === "video" ? (
                                        <video src={story.mediaUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <Image src={story.mediaUrl} alt="Story" fill className="object-cover" />
                                    )}
                                    {/* Expiry Badge */}
                                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                                        <Clock className="w-3 h-3" />
                                        {getTimeRemaining(story.expiresAt)}
                                    </div>
                                    {story.mediaType === "video" && (
                                        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                            <Film className="w-3 h-3" />
                                            Video
                                        </div>
                                    )}
                                </div>
                                {/* Story Info */}
                                <div className="p-3.5">
                                    {story.caption && (
                                        <p className="text-xs text-gray-600 mb-2 line-clamp-2 leading-relaxed">{story.caption}</p>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                                                <Eye className="w-3.5 h-3.5" /> {story.viewsCount}
                                            </span>
                                            <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                                                <Heart className="w-3.5 h-3.5" /> {story.likesCount}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (confirm("Delete this story?")) {
                                                    deleteMutation.mutate(story._id);
                                                }
                                            }}
                                            disabled={deleteMutation.isPending}
                                            className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-500 transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tips Section */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">💡 Story Tips</h4>
                <ul className="space-y-2 text-xs text-gray-500">
                    <li className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                        Post daily specials or limited-time deals to drive foot traffic.
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                        Behind-the-scenes kitchen content gets 40% more engagement.
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                        Stories auto-expire after 24 hours — post regularly for visibility.
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                        Use vertical (9:16) images/videos for the best mobile viewing experience.
                    </li>
                </ul>
            </div>
        </div>
    );
}
