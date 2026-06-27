"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useBranch } from "../owner-shell";
import {
    Box,
    Plus,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Trash2,
    Eye,
    Clock,
    Info,
    Globe,
    GlobeLock,
    Camera,
    Smartphone,
    MousePointerClick,
    Star,
    ChevronRight,
    Sparkles,
    ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

const VR_TOUR_APP_URL =
    process.env.NEXT_PUBLIC_VR_TOUR_APP_URL || "http://localhost:8500";

export default function VirtualTourPage() {
    const router = useRouter();
    const { branch } = useBranch();
    const [scenes, setScenes] = useState<any[]>([]);
    const [status, setStatus] = useState<string>("idle");
    const [defaultSceneId, setDefaultSceneId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // ── Fetch tour data ──
    const fetchTourData = useCallback(async () => {
        if (!branch?._id) return;
        try {
            const res = await fetch(
                `/api/v1/virtual-tour/${branch._id}/status`
            );
            const data = await res.json();
            if (data.success) {
                setStatus(data.status || "idle");
                setScenes(data.scenes || []);
                setDefaultSceneId(data.defaultSceneId || null);
            }
        } catch (err) {
            console.error("Failed to fetch tour data", err);
        } finally {
            setLoading(false);
        }
    }, [branch?._id]);

    useEffect(() => {
        fetchTourData();
    }, [fetchTourData]);

    // Poll when processing
    useEffect(() => {
        if (status !== "processing") return;
        const interval = setInterval(fetchTourData, 8000);
        return () => clearInterval(interval);
    }, [status, fetchTourData]);

    // Refresh on focus
    useEffect(() => {
        const onFocus = () => fetchTourData();
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [fetchTourData]);

    // ── Create new scene ──
    const handleCreateScene = async () => {
        const name = prompt("Scene ka naam likho (e.g., Main Hall, Garden):");
        if (!name?.trim()) return;

        setCreating(true);
        try {
            const res = await fetch(
                `/api/v1/virtual-tour/${branch._id}/create-session`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sceneName: name.trim() }),
                }
            );
            const data = await res.json();
            if (data.success && data.captureUrl) {
                window.location.href = data.captureUrl;
            } else {
                toast.error(data.error || "Session create nahi ho saka");
            }
        } catch {
            toast.error("Network error. Dobara try karein.");
        } finally {
            setCreating(false);
        }
    };

    // ── Publish/Unpublish ──
    const handleTogglePublish = async () => {
        const isPublishing = status !== "published";
        try {
            const res = await fetch(
                `/api/v1/virtual-tour/${branch._id}/publish`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ publish: isPublishing }),
                }
            );
            const data = await res.json();
            if (data.success) {
                setStatus(data.status);
                toast.success(
                    isPublishing ? "Tour live ho gya! 🎉" : "Tour unpublish ho gya."
                );
            }
        } catch {
            toast.error("Publish status update nahi hua.");
        }
    };

    // ── Delete Scene ──
    const handleDeleteScene = async (sceneId: string, sceneName: string) => {
        if (!confirm(`"${sceneName}" delete karein? Ye wapas nahi aayega.`)) return;
        setDeletingId(sceneId);
        try {
            const res = await fetch(
                `/api/v1/virtual-tour/${branch._id}/scene/${sceneId}`,
                { method: "DELETE" }
            );
            const data = await res.json();
            if (data.success) {
                toast.success("Scene delete ho gya.");
                fetchTourData();
            }
        } catch {
            toast.error("Delete nahi ho saka.");
        } finally {
            setDeletingId(null);
        }
    };

    // ── Set Default Scene ──
    const handleSetDefault = async (sceneId: string) => {
        try {
            const res = await fetch(
                `/api/v1/virtual-tour/${branch._id}/default-scene`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sceneId }),
                }
            );
            const data = await res.json();
            if (data.success) {
                setDefaultSceneId(sceneId);
                toast.success("Default scene set ho gya!");
            }
        } catch {
            toast.error("Default scene update nahi hua.");
        }
    };

    // ── Preview Tour ──
    const handlePreview = () => {
        window.open(`${VR_TOUR_APP_URL}/vr-tour/view/${branch._id}`, "_blank");
    };

    if (!branch) return null;

    const hasScenes = scenes.length > 0;
    const canPublish = hasScenes && (status === "ready" || status === "published");

    return (
        <div className="space-y-5 pb-24 md:pb-8 max-w-3xl mx-auto">
            {/* ═══ Header ═══ */}
            <div>
                <h1 className="text-lg md:text-xl font-black tracking-tight text-gray-900 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Camera className="w-5 h-5 text-primary" />
                    </div>
                    360° Virtual Tour
                </h1>
                <p className="text-xs text-gray-400 font-medium mt-1.5 ml-[46px]">
                    Apne restaurant ka immersive 360° tour banayein
                </p>
            </div>

            {/* ═══ Status Banners ═══ */}
            {status === "published" && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold text-sm text-green-900">
                            Tour Live Hai! 🎉
                        </p>
                        <p className="text-xs text-green-700 mt-0.5">
                            Customers aapke restaurant ko 360° mein dekh sakte hain.
                        </p>
                    </div>
                </div>
            )}

            {status === "processing" && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
                    <Loader2 className="w-5 h-5 text-amber-600 animate-spin shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold text-sm text-amber-900">
                            Scene Process Ho Rha Hai...
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            360° panorama bana rha hai. 1-3 minute lag sakte hain. Aap page chhod sakte hain.
                        </p>
                    </div>
                </div>
            )}

            {status === "failed" && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold text-sm text-red-900">
                            Processing Fail Ho Gyi
                        </p>
                        <p className="text-xs text-red-700 mt-0.5">
                            Dobara capture karein. Photos mein zyada overlap rakhein.
                        </p>
                    </div>
                </div>
            )}

            {/* ═══ Action Buttons ═══ */}
            <div className="flex flex-wrap gap-2">
                <Button
                    onClick={handleCreateScene}
                    disabled={status === "processing" || creating}
                    className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 h-11 px-5 text-sm font-bold flex-1 sm:flex-none"
                >
                    {creating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Plus className="w-4 h-4 mr-2" />
                    )}
                    Naya Scene Capture
                </Button>

                {canPublish && (
                    <>
                        <Button
                            onClick={handlePreview}
                            variant="outline"
                            className="rounded-xl border-gray-200 text-gray-600 h-11 px-4 text-sm font-bold"
                        >
                            <Eye className="w-4 h-4 mr-2" /> Preview
                        </Button>
                        <Button
                            onClick={handleTogglePublish}
                            variant={status === "published" ? "outline" : "default"}
                            className={`rounded-xl h-11 px-4 text-sm font-bold ${
                                status === "published"
                                    ? "border-red-200 text-red-600 hover:bg-red-50"
                                    : "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                            }`}
                        >
                            {status === "published" ? (
                                <>
                                    <GlobeLock className="w-4 h-4 mr-2" /> Unpublish
                                </>
                            ) : (
                                <>
                                    <Globe className="w-4 h-4 mr-2" /> Publish Tour
                                </>
                            )}
                        </Button>
                    </>
                )}
            </div>

            {/* ═══ Scenes List ═══ */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                </div>
            ) : hasScenes ? (
                <div className="space-y-3">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Scenes ({scenes.length})
                    </p>
                    {scenes.map((scene: any) => {
                        const isDefault = scene.id === defaultSceneId;
                        const isDeleting = deletingId === scene.id;
                        return (
                            <div
                                key={scene.id}
                                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                                    isDefault
                                        ? "border-primary/25 ring-1 ring-primary/10"
                                        : "border-gray-100 hover:border-gray-200"
                                }`}
                            >
                                {/* Scene Preview + Info */}
                                <div className="flex items-stretch">
                                    {/* Thumbnail */}
                                    <div className="relative w-28 sm:w-36 shrink-0">
                                        <img
                                            src={scene.thumbnailUrl || scene.panoramaUrl}
                                            alt={scene.name}
                                            className="w-full h-full object-cover min-h-[80px]"
                                        />
                                        {isDefault && (
                                            <div className="absolute top-2 left-2 bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Star className="w-2.5 h-2.5 fill-white" /> Default
                                            </div>
                                        )}
                                        <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                            360°
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                                        <div>
                                            <h3 className="font-bold text-sm text-gray-900 truncate">
                                                {scene.name}
                                            </h3>
                                            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3 shrink-0" />
                                                {scene.createdAt
                                                    ? new Date(scene.createdAt).toLocaleDateString("en-PK", {
                                                          day: "numeric",
                                                          month: "short",
                                                      })
                                                    : "Recently"}
                                            </p>
                                        </div>

                                        {/* Actions Row */}
                                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                            <button
                                                onClick={() =>
                                                    router.push(
                                                        `/owner/virtual-tour/hotspot-editor?sceneId=${scene.id}`
                                                    )
                                                }
                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/8 hover:bg-primary/15 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                <MousePointerClick className="w-3 h-3" />
                                                Edit Hotspots
                                            </button>

                                            {!isDefault && (
                                                <button
                                                    onClick={() => handleSetDefault(scene.id)}
                                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-primary bg-gray-50 hover:bg-primary/8 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    <Star className="w-3 h-3" />
                                                    Set Default
                                                </button>
                                            )}

                                            <button
                                                onClick={() =>
                                                    handleDeleteScene(scene.id, scene.name)
                                                }
                                                disabled={isDeleting}
                                                className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-300 hover:text-red-500 ml-auto px-2 py-1.5 rounded-lg transition-colors"
                                            >
                                                {isDeleting ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3 h-3" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ═══ Empty State ═══ */
                <div className="py-16 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-orange-50 flex items-center justify-center mx-auto mb-5">
                        <Camera className="w-9 h-9 text-primary/60" />
                    </div>
                    <h3 className="font-black text-gray-900 text-lg">
                        Abhi Koi Scene Nahi Hai
                    </h3>
                    <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2 leading-relaxed">
                        Apne restaurant ke rooms ko 360° mein capture karein aur customers ko virtual tour dein.
                    </p>
                    <Button
                        onClick={handleCreateScene}
                        className="mt-6 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 h-12 px-6 text-sm font-bold"
                    >
                        <Smartphone className="w-4 h-4 mr-2" /> Capture Shuru Karein
                    </Button>
                </div>
            )}

            {/* ═══ How It Works ═══ */}
            {!loading && (
                <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/30 border border-blue-100/50 rounded-2xl p-5">
                    <h4 className="font-black text-blue-900 text-sm flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        Kaise Kaam Karta Hai?
                    </h4>

                    <div className="space-y-3">
                        {[
                            {
                                step: "1",
                                title: "Capture",
                                desc: "Phone pe camera guide follow karein — room ke centre mein khade ho kar 360° ghoomein.",
                                color: "bg-blue-500",
                            },
                            {
                                step: "2",
                                title: "Auto-Stitch",
                                desc: "Photos automatically stitch ho jayen gi aik seamless panorama mein.",
                                color: "bg-indigo-500",
                            },
                            {
                                step: "3",
                                title: "Hotspots Lagayein",
                                desc: "Room se room jaane ke liye navigation arrows lagayein — Google Maps ki tarah.",
                                color: "bg-violet-500",
                            },
                            {
                                step: "4",
                                title: "Publish",
                                desc: "Tour ko publish karein aur customers ko 360° experience dein!",
                                color: "bg-green-500",
                            },
                        ].map((item) => (
                            <div key={item.step} className="flex items-start gap-3">
                                <div
                                    className={`w-7 h-7 rounded-lg ${item.color} text-white text-xs font-black flex items-center justify-center shrink-0`}
                                >
                                    {item.step}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-[13px] text-gray-800">
                                        {item.title}
                                    </p>
                                    <p className="text-[11px] text-gray-500 leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
