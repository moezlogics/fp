"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBranch } from "../../owner-shell";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Loader2,
    Navigation,
    Info,
    Eye,
    MousePointerClick,
    Crosshair,
    X,
    ChevronUp,
    ChevronDown,
    Check,
    AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

interface Hotspot {
    id: string;
    type: "scene" | "info";
    pitch: number;
    yaw: number;
    targetSceneId?: string;
    text: string;
}

interface OtherScene {
    id: string;
    name: string;
    thumbnailUrl: string;
}

interface SceneData {
    id: string;
    name: string;
    panoramaUrl: string;
    thumbnailUrl: string;
    hotspots: Hotspot[];
    initialView: { pitch: number; yaw: number; hfov: number };
}

// ═══════════════════════════════════════════════════
// Hotspot Editor Page
// ═══════════════════════════════════════════════════

export default function HotspotEditorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { branch } = useBranch();

    const sceneId = searchParams.get("sceneId");
    const pannellumRef = useRef<any>(null);
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const pannellumScriptLoaded = useRef(false);

    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sceneData, setSceneData] = useState<SceneData | null>(null);
    const [otherScenes, setOtherScenes] = useState<OtherScene[]>([]);
    const [hotspots, setHotspots] = useState<Hotspot[]>([]);
    const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
    const [isPlacingMode, setIsPlacingMode] = useState(false);
    const [placingType, setPlacingType] = useState<"scene" | "info">("scene");
    const [panelOpen, setPanelOpen] = useState(true);
    const [hasUnsaved, setHasUnsaved] = useState(false);

    // Track unsaved changes
    const originalHotspots = useRef<string>("");

    // ── Fetch scene data ──
    const fetchSceneData = useCallback(async () => {
        if (!branch?._id || !sceneId) return;
        try {
            const res = await fetch(
                `/api/v1/virtual-tour/${branch._id}/scene/${sceneId}`
            );
            const data = await res.json();
            if (data.success) {
                setSceneData(data.scene);
                setOtherScenes(data.otherScenes || []);
                setHotspots(data.scene.hotspots || []);
                originalHotspots.current = JSON.stringify(data.scene.hotspots || []);
            } else {
                toast.error("Scene data load nahi hua");
                router.push("/owner/virtual-tour");
            }
        } catch (err) {
            toast.error("Network error");
            router.push("/owner/virtual-tour");
        } finally {
            setLoading(false);
        }
    }, [branch?._id, sceneId, router]);

    useEffect(() => {
        fetchSceneData();
    }, [fetchSceneData]);

    // Track unsaved changes
    useEffect(() => {
        setHasUnsaved(JSON.stringify(hotspots) !== originalHotspots.current);
    }, [hotspots]);

    // ── Load Pannellum ──
    useEffect(() => {
        if (pannellumScriptLoaded.current) return;

        if (!document.querySelector('link[href*="pannellum"]')) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
            document.head.appendChild(link);
        }

        if (!(window as any).pannellum) {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
            script.onload = () => {
                pannellumScriptLoaded.current = true;
            };
            document.head.appendChild(script);
        } else {
            pannellumScriptLoaded.current = true;
        }
    }, []);

    // ── Initialize viewer ──
    useEffect(() => {
        if (!sceneData || loading) return;

        const initViewer = () => {
            if (!(window as any).pannellum) {
                setTimeout(initViewer, 200);
                return;
            }

            if (pannellumRef.current) {
                try { pannellumRef.current.destroy(); } catch {}
            }

            const viewer = (window as any).pannellum.viewer("hotspot-viewer", {
                type: "equirectangular",
                panorama: sceneData.panoramaUrl,
                preview: sceneData.thumbnailUrl || sceneData.panoramaUrl,
                autoLoad: true,
                autoRotate: 0,
                compass: false,
                showFullscreenCtrl: false,
                showZoomCtrl: false,
                hfov: sceneData.initialView?.hfov || 110,
                pitch: sceneData.initialView?.pitch || 0,
                yaw: sceneData.initialView?.yaw || 0,
                minHfov: 50,
                maxHfov: 120,
                friction: 0.12,
                mouseZoom: true,
                hotSpots: [],
            });

            pannellumRef.current = viewer;
            renderHotspots(hotspots, viewer);
        };

        setTimeout(initViewer, 100);

        return () => {
            if (pannellumRef.current) {
                try { pannellumRef.current.destroy(); } catch {}
                pannellumRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sceneData, loading]);

    // ── Render hotspots ──
    const renderHotspots = useCallback(
        (hsList: Hotspot[], viewer?: any) => {
            const v = viewer || pannellumRef.current;
            if (!v) return;

            // Remove existing
            try {
                const existing = v.getConfig()?.hotSpots || [];
                existing.forEach((_: any, i: number) => {
                    try { v.removeHotSpot(`hs-${i}`); } catch {}
                });
            } catch {}

            hsList.forEach((hs) => {
                try { v.removeHotSpot(hs.id); } catch {}
            });

            // Add hotspots
            hsList.forEach((hs) => {
                const isSelected = hs.id === selectedHotspot;
                const targetScene = otherScenes.find((s) => s.id === hs.targetSceneId);

                v.addHotSpot({
                    id: hs.id,
                    pitch: hs.pitch,
                    yaw: hs.yaw,
                    type: "custom",
                    cssClass: isSelected ? "editor-hotspot selected" : "editor-hotspot",
                    createTooltipFunc: (container: HTMLElement) => {
                        const label =
                            hs.type === "scene"
                                ? targetScene?.name || "Link"
                                : hs.text || "Info";
                        const icon =
                            hs.type === "scene"
                                ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="12 5 12 19"/><polyline points="5 12 12 5 19 12"/></svg>`
                                : `<span style="font-weight:900;font-size:12px">i</span>`;

                        container.innerHTML = `
                            <div class="editor-dot ${hs.type === "scene" ? "type-nav" : "type-info"} ${isSelected ? "selected" : ""}">
                                ${icon}
                            </div>
                            <div class="editor-label">${label}</div>
                        `;

                        container.addEventListener("click", (e: Event) => {
                            e.stopPropagation();
                            setSelectedHotspot(hs.id);
                            setPanelOpen(true);
                        });
                    },
                    createTooltipArgs: {},
                });
            });
        },
        [selectedHotspot, otherScenes]
    );

    // Re-render on selection change
    useEffect(() => {
        if (pannellumRef.current && sceneData) {
            renderHotspots(hotspots);
        }
    }, [selectedHotspot, hotspots, renderHotspots, sceneData]);

    // ── Handle placing ──
    useEffect(() => {
        const container = document.getElementById("hotspot-viewer");
        if (!container || !isPlacingMode) return;

        const handleClick = (e: MouseEvent) => {
            if (!pannellumRef.current || !isPlacingMode) return;
            const coords = pannellumRef.current.mouseEventToCoords(e);
            if (!coords) return;

            const [pitch, yaw] = coords;
            const newHotspot: Hotspot = {
                id: `hs_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                type: placingType,
                pitch,
                yaw,
                targetSceneId: placingType === "scene" ? otherScenes[0]?.id || "" : undefined,
                text: placingType === "info" ? "Info point" : otherScenes[0]?.name || "Next",
            };

            setHotspots((prev) => [...prev, newHotspot]);
            setSelectedHotspot(newHotspot.id);
            setIsPlacingMode(false);
            setPanelOpen(true);
            toast.success(
                `${placingType === "scene" ? "Navigation" : "Info"} hotspot laga diya!`
            );
        };

        container.addEventListener("click", handleClick);
        return () => container.removeEventListener("click", handleClick);
    }, [isPlacingMode, placingType, otherScenes]);

    // ── Save hotspots ──
    const handleSave = async () => {
        if (!branch?._id || !sceneId) return;
        setSaving(true);
        try {
            const res = await fetch(
                `/api/v1/virtual-tour/${branch._id}/scene/${sceneId}/hotspots`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ hotspots }),
                }
            );
            const data = await res.json();
            if (data.success) {
                originalHotspots.current = JSON.stringify(hotspots);
                setHasUnsaved(false);
                toast.success("Hotspots save ho gaye! ✅");
            } else {
                toast.error(data.error || "Save nahi hua");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    // ── Save initial view ──
    const handleSaveView = async () => {
        if (!branch?._id || !sceneId || !pannellumRef.current) return;
        const viewer = pannellumRef.current;
        try {
            const res = await fetch(
                `/api/v1/virtual-tour/${branch._id}/scene/${sceneId}/initial-view`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        pitch: viewer.getPitch(),
                        yaw: viewer.getYaw(),
                        hfov: viewer.getHfov(),
                    }),
                }
            );
            const data = await res.json();
            if (data.success) {
                toast.success("Camera angle save ho gya!");
            }
        } catch {
            toast.error("View save nahi hua");
        }
    };

    // ── Delete hotspot ──
    const handleDeleteHotspot = (id: string) => {
        setHotspots((prev) => prev.filter((h) => h.id !== id));
        if (selectedHotspot === id) setSelectedHotspot(null);
    };

    // ── Update hotspot ──
    const updateHotspot = (id: string, updates: Partial<Hotspot>) => {
        setHotspots((prev) =>
            prev.map((h) => (h.id === id ? { ...h, ...updates } : h))
        );
    };

    const selectedHotspotData = hotspots.find((h) => h.id === selectedHotspot);

    // Loading state
    if (!branch || loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-xs text-gray-400 font-medium">Scene load ho rha hai...</p>
                </div>
            </div>
        );
    }

    if (!sceneData) return null;

    return (
        <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] flex flex-col -mx-4 sm:-mx-6 -mt-4 sm:-mt-6">
            {/* ═══ Top Bar ═══ */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-gray-100 bg-white shrink-0 z-20">
                <div className="flex items-center gap-2.5 min-w-0">
                    <button
                        onClick={() => {
                            if (hasUnsaved && !confirm("Unsaved changes hain. Wapas jayein?")) return;
                            router.push("/owner/virtual-tour");
                        }}
                        className="p-2 -ml-1 rounded-xl hover:bg-gray-50 transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-[13px] font-black text-gray-900 truncate">
                            {sceneData.name}
                        </h1>
                        <p className="text-[10px] text-gray-400 font-medium hidden sm:block">
                            Panorama mein click kar ke hotspots lagayein
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Button
                        onClick={handleSaveView}
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-[11px] border-blue-200 text-blue-600 hover:bg-blue-50 h-8 px-2.5 sm:px-3"
                    >
                        <Eye className="w-3.5 h-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Camera Save</span>
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !hasUnsaved}
                        size="sm"
                        className={`rounded-xl text-[11px] h-8 px-3 sm:px-4 font-bold ${
                            hasUnsaved
                                ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                                : "bg-gray-100 text-gray-400"
                        }`}
                    >
                        {saving ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : hasUnsaved ? (
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                        ) : (
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {saving ? "Saving..." : hasUnsaved ? "Save" : "Saved"}
                    </Button>
                </div>
            </div>

            {/* ═══ Main Content ═══ */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* ── Panorama Viewer ── */}
                <div className="flex-1 relative bg-gray-900">
                    <div
                        id="hotspot-viewer"
                        ref={viewerContainerRef}
                        className="w-full h-full"
                    />

                    {/* Placing Mode Overlay */}
                    {isPlacingMode && (
                        <div className="absolute inset-0 pointer-events-none z-10">
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[11px] font-bold px-4 py-2 rounded-full shadow-lg animate-pulse flex items-center gap-2">
                                <Crosshair className="w-3.5 h-3.5" />
                                {placingType === "scene" ? "Navigation" : "Info"} point lagayein
                            </div>

                            {/* Cancel button (pointer-events allowed) */}
                            <button
                                onClick={() => setIsPlacingMode(false)}
                                className="absolute top-3 right-3 pointer-events-auto bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Crosshair */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-white/40 rounded-full" />
                                <div className="absolute w-0.5 h-5 bg-white/40" />
                                <div className="absolute w-5 h-0.5 bg-white/40" />
                            </div>
                        </div>
                    )}

                    {/* Hotspot count badge */}
                    <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white/60 text-[10px] font-mono px-2.5 py-1 rounded-lg">
                        {hotspots.length} hotspot{hotspots.length !== 1 ? "s" : ""}
                    </div>

                    {/* Mobile: Panel Toggle + Add Buttons */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 md:hidden">
                        <button
                            onClick={() => {
                                setPlacingType("scene");
                                setIsPlacingMode(true);
                                setPanelOpen(false);
                            }}
                            disabled={otherScenes.length === 0}
                            className="bg-primary text-white rounded-full p-2.5 shadow-lg disabled:opacity-40"
                        >
                            <Navigation className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                setPlacingType("info");
                                setIsPlacingMode(true);
                                setPanelOpen(false);
                            }}
                            className="bg-blue-500 text-white rounded-full p-2.5 shadow-lg"
                        >
                            <Info className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPanelOpen(!panelOpen)}
                            className="bg-white/90 backdrop-blur-sm text-gray-700 rounded-full p-2.5 shadow-lg"
                        >
                            {panelOpen ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronUp className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Sidebar (Desktop) / Bottom Sheet (Mobile) ── */}
                <div
                    className={`
                        md:w-[300px] lg:w-[320px] bg-white border-t md:border-t-0 md:border-l border-gray-100 
                        flex flex-col overflow-hidden shrink-0
                        transition-all duration-300 ease-out
                        ${panelOpen ? "h-[45vh] md:h-auto" : "h-0 md:h-auto"}
                    `}
                >
                    {/* Add Hotspot Buttons (Desktop only) */}
                    <div className="p-3 sm:p-4 border-b border-gray-100 hidden md:block">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                            Hotspot Add Karein
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setPlacingType("scene");
                                    setIsPlacingMode(true);
                                }}
                                disabled={otherScenes.length === 0}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                    isPlacingMode && placingType === "scene"
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "border-gray-200 text-gray-600 hover:border-primary/30 hover:text-primary"
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                                <Navigation className="w-3.5 h-3.5" />
                                Navigation
                            </button>
                            <button
                                onClick={() => {
                                    setPlacingType("info");
                                    setIsPlacingMode(true);
                                }}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                    isPlacingMode && placingType === "info"
                                        ? "bg-blue-50 border-blue-400 text-blue-600"
                                        : "border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                                }`}
                            >
                                <Info className="w-3.5 h-3.5" />
                                Info
                            </button>
                        </div>
                        {otherScenes.length === 0 && (
                            <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                Pehle aur scenes add karein
                            </p>
                        )}
                    </div>

                    {/* Hotspot List */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                            Hotspots ({hotspots.length})
                        </p>

                        {hotspots.length === 0 ? (
                            <div className="text-center py-8 md:py-10">
                                <MousePointerClick className="w-7 h-7 text-gray-200 mx-auto mb-2.5" />
                                <p className="text-xs text-gray-400 font-medium">
                                    Koi hotspot nahi hai abhi
                                </p>
                                <p className="text-[10px] text-gray-300 mt-1">
                                    {otherScenes.length > 0
                                        ? "Navigation ya Info button dabayein, phir panorama mein click karein"
                                        : "Pehle aur scenes capture karein, phir yahan navigation laga sakte hain"}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {hotspots.map((hs) => {
                                    const isSelected = selectedHotspot === hs.id;
                                    const targetScene = otherScenes.find(
                                        (s) => s.id === hs.targetSceneId
                                    );
                                    return (
                                        <div
                                            key={hs.id}
                                            onClick={() => setSelectedHotspot(hs.id)}
                                            className={`rounded-xl border cursor-pointer transition-all overflow-hidden ${
                                                isSelected
                                                    ? "border-primary/30 bg-primary/3 ring-1 ring-primary/10"
                                                    : "border-gray-100 hover:border-gray-200"
                                            }`}
                                        >
                                            {/* Hotspot Header */}
                                            <div className="flex items-center justify-between p-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                                            hs.type === "scene"
                                                                ? "bg-primary/10 text-primary"
                                                                : "bg-blue-50 text-blue-600"
                                                        }`}
                                                    >
                                                        {hs.type === "scene" ? (
                                                            <Navigation className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <Info className="w-3.5 h-3.5" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-800 truncate">
                                                            {hs.type === "scene"
                                                                ? targetScene?.name || "Navigation"
                                                                : hs.text || "Info Point"}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-mono">
                                                            {hs.pitch.toFixed(0)}° / {hs.yaw.toFixed(0)}°
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteHotspot(hs.id);
                                                    }}
                                                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Expanded Properties */}
                                            {isSelected && (
                                                <div className="px-3 pb-3 space-y-2.5 border-t border-gray-100 pt-2.5">
                                                    {hs.type === "scene" ? (
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                                                Kis room mein jayega?
                                                            </label>
                                                            <select
                                                                value={hs.targetSceneId || ""}
                                                                onChange={(e) =>
                                                                    updateHotspot(hs.id, {
                                                                        targetSceneId: e.target.value,
                                                                        text:
                                                                            otherScenes.find(
                                                                                (s) => s.id === e.target.value
                                                                            )?.name || "",
                                                                    })
                                                                }
                                                                className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none bg-white"
                                                            >
                                                                <option value="">Scene choose karein...</option>
                                                                {otherScenes.map((s) => (
                                                                    <option key={s.id} value={s.id}>
                                                                        {s.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                                                Info Text
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={hs.text || ""}
                                                                onChange={(e) =>
                                                                    updateHotspot(hs.id, {
                                                                        text: e.target.value,
                                                                    })
                                                                }
                                                                placeholder="e.g. Private Dining Room"
                                                                className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                                                            />
                                                        </div>
                                                    )}

                                                    {hs.type === "scene" && (
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                                                Label (optional)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={hs.text || ""}
                                                                onChange={(e) =>
                                                                    updateHotspot(hs.id, {
                                                                        text: e.target.value,
                                                                    })
                                                                }
                                                                placeholder="Scene name auto use hoga"
                                                                className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Bottom Tip */}
                    <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50/50 hidden md:block">
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            <strong>💡 Tips:</strong> Navigation arrows floor pe lagayein jahan se
                            agla room dikhe. Camera angle set kar ke "Camera Save" dabayein.
                        </p>
                    </div>
                </div>
            </div>

            {/* ═══ Hotspot Styles ═══ */}
            <style jsx global>{`
                #hotspot-viewer .pnlm-about-msg { display: none !important; }
                #hotspot-viewer .pnlm-load-box { display: none !important; }
                #hotspot-viewer { cursor: ${isPlacingMode ? "crosshair" : "grab"}; }

                .pnlm-hotspot-base {
                    background: none !important;
                    border: none !important;
                }
                .pnlm-sprite { display: none !important; }
                div.pnlm-tooltip { display: none !important; }

                .editor-hotspot { cursor: pointer; }

                .editor-dot {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.25s;
                    box-shadow: 0 2px 16px rgba(0,0,0,0.3);
                    position: relative;
                }

                .editor-dot.type-nav {
                    background: rgba(255,107,53,0.3);
                    border: 2.5px solid rgba(255,255,255,0.85);
                    color: white;
                }
                .editor-dot.type-info {
                    background: rgba(59,130,246,0.3);
                    border: 2.5px solid rgba(255,255,255,0.7);
                    color: white;
                }
                .editor-dot.selected {
                    transform: scale(1.3);
                    box-shadow: 0 0 0 3px rgba(255,107,53,0.5), 0 4px 24px rgba(0,0,0,0.4);
                }
                .editor-dot::before {
                    content: '';
                    position: absolute;
                    inset: -6px;
                    border-radius: 50%;
                    border: 1.5px solid rgba(255,255,255,0.15);
                    animation: editor-pulse 2.5s ease-in-out infinite;
                }

                @keyframes editor-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.15); opacity: 0; }
                }

                .editor-label {
                    margin-top: 6px;
                    background: rgba(0,0,0,0.65);
                    backdrop-filter: blur(6px);
                    color: white;
                    padding: 3px 10px;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 700;
                    white-space: nowrap;
                    text-align: center;
                    pointer-events: none;
                }

                /* Mobile: reduce hotspot size */
                @media (max-width: 768px) {
                    .editor-dot { width: 30px; height: 30px; }
                    .editor-label { font-size: 9px; padding: 2px 8px; }
                }
            `}</style>
        </div>
    );
}
