"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Smartphone, Compass, Navigation } from "lucide-react";

// Photo Sphere Viewer v5 styles (bundled — needs `npm install`).
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";

interface VirtualTourViewerProps {
    scenes: any[];
    onClose: () => void;
    initialSceneIndex?: number;
    /** When true, hides the built-in header/close button */
    hideChrome?: boolean;
}

const deg = (v: any) => `${Number(v) || 0}deg`;

/**
 * VirtualTourViewer — Photo Sphere Viewer v5 (ESM) immersive 360° tour.
 *
 * Was previously broken: it loaded the v5 npm package from a CDN <script> but
 * called it through the v4 UMD global (`window.PhotoSphereViewer`) with a mix
 * of v4 + v5 options — so it never initialised. This is a clean v5 rewrite:
 * proper ESM imports, correct v5 API, in-place scene switching, gyroscope and
 * autorotate plugins, and marker-driven room-to-room navigation.
 */
export const VirtualTourViewer: React.FC<VirtualTourViewerProps> = ({
    scenes,
    onClose,
    initialSceneIndex = 0,
    hideChrome = false,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const pluginsRef = useRef<any>(null);

    const [currentSceneIndex, setCurrentSceneIndex] = useState(initialSceneIndex);
    const [loading, setLoading] = useState(true);
    const [isGyro, setIsGyro] = useState(false);
    const [autoRotate, setAutoRotate] = useState(true);

    // Build PSV markers for a scene from its hotspots.
    const buildMarkers = useCallback((scene: any) => {
        return (scene?.hotspots || []).map((hs: any, index: number) => {
            const isScene = hs.type === "scene";
            const targetName = hs.targetSceneId
                ? scenes.find((s: any) => s.id === hs.targetSceneId)?.name
                : null;
            return {
                id: hs.id || `marker-${scene.id}-${index}`,
                position: { yaw: deg(hs.yaw), pitch: deg(hs.pitch) },
                html: isScene
                    ? `<div style="width:48px;height:48px;border-radius:9999px;backdrop-filter:blur(12px);background:rgba(249,115,22,.82);border:2px solid rgba(255,255,255,.55);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 0 20px rgba(249,115,22,.5)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                        </div>`
                    : `<div style="width:32px;height:32px;border-radius:9999px;backdrop-filter:blur(8px);background:rgba(99,102,241,.82);border:1px solid rgba(255,255,255,.35);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:700">i</div>`,
                tooltip: hs.text || targetName ? { content: hs.text || targetName } : undefined,
                data: { targetSceneId: hs.targetSceneId },
            };
        });
    }, [scenes]);

    // Imperatively switch panorama (no viewer re-creation).
    const switchScene = useCallback((index: number) => {
        const viewer = viewerRef.current;
        const plugins = pluginsRef.current;
        if (!viewer || !plugins || index === currentSceneIndex) return;
        const scene = scenes[index];
        if (!scene?.panoramaUrl) return;

        setLoading(true);
        viewer
            .setPanorama(scene.panoramaUrl, {
                caption: `<b>${scene.name || ""}</b>`,
                transition: true,
                showLoader: true,
            })
            .then(() => {
                const markers = viewer.getPlugin(plugins.MarkersPlugin);
                if (markers) markers.setMarkers(buildMarkers(scene));
                setCurrentSceneIndex(index);
                setLoading(false);
                if (autoRotate) viewer.getPlugin(plugins.AutorotatePlugin)?.start();
            })
            .catch(() => setLoading(false));
    }, [currentSceneIndex, scenes, autoRotate, buildMarkers]);

    // ── Create the viewer once ──
    useEffect(() => {
        let cancelled = false;

        (async () => {
            const [core, markersMod, gyroMod, autoMod] = await Promise.all([
                import("@photo-sphere-viewer/core"),
                import("@photo-sphere-viewer/markers-plugin"),
                import("@photo-sphere-viewer/gyroscope-plugin"),
                import("@photo-sphere-viewer/autorotate-plugin"),
            ]);
            if (cancelled || !containerRef.current) return;

            const { Viewer } = core;
            const { MarkersPlugin } = markersMod;
            const { GyroscopePlugin } = gyroMod;
            const { AutorotatePlugin } = autoMod;
            pluginsRef.current = { MarkersPlugin, GyroscopePlugin, AutorotatePlugin };

            const first = scenes[initialSceneIndex] || scenes[0];
            if (!first?.panoramaUrl) { setLoading(false); return; }

            const viewer = new Viewer({
                container: containerRef.current,
                panorama: first.panoramaUrl,
                caption: `<b>${first.name || ""}</b>`,
                loadingTxt: "Loading 360°…",
                defaultZoomLvl: 35,
                defaultYaw: deg(first.initialView?.yaw || 0),
                defaultPitch: deg(first.initialView?.pitch || 0),
                minFov: 30,
                maxFov: 100,
                touchmoveTwoFingers: false,
                mousewheelCtrlKey: false,
                navbar: ["zoom", "move", "caption", "fullscreen"],
                plugins: [
                    [MarkersPlugin, { markers: buildMarkers(first) }],
                    [GyroscopePlugin, {}],
                    [AutorotatePlugin, { autostartDelay: 2500, autorotateSpeed: "0.5rpm", autorotatePitch: "2deg" }],
                ],
            });
            viewerRef.current = viewer;

            viewer.addEventListener("ready", () => { if (!cancelled) setLoading(false); }, { once: true });

            const markers = viewer.getPlugin(MarkersPlugin);
            markers?.addEventListener("select-marker", ({ marker }: any) => {
                const target = marker?.config?.data?.targetSceneId ?? marker?.data?.targetSceneId;
                if (target) {
                    const idx = scenes.findIndex((s: any) => s.id === target);
                    if (idx >= 0) switchScene(idx);
                }
            });
        })().catch((err) => {
            console.error("[VirtualTourViewer] init failed:", err);
            setLoading(false);
        });

        return () => {
            cancelled = true;
            if (viewerRef.current) {
                try { viewerRef.current.destroy(); } catch { /* noop */ }
                viewerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Controls ──
    const toggleGyro = async () => {
        const viewer = viewerRef.current;
        const plugins = pluginsRef.current;
        if (!viewer || !plugins) return;
        // iOS 13+ needs an explicit motion permission request.
        const DOE = (typeof window !== "undefined" ? (window as any).DeviceOrientationEvent : null);
        if (DOE && typeof DOE.requestPermission === "function") {
            try {
                const res = await DOE.requestPermission();
                if (res !== "granted") return;
            } catch { return; }
        }
        const gyro = viewer.getPlugin(plugins.GyroscopePlugin);
        if (!gyro) return;
        if (isGyro) { gyro.stop(); setIsGyro(false); }
        else { gyro.start().then(() => setIsGyro(true)).catch(() => { }); }
    };

    const toggleAutoRotate = () => {
        const viewer = viewerRef.current;
        const plugins = pluginsRef.current;
        if (!viewer || !plugins) return;
        const ar = viewer.getPlugin(plugins.AutorotatePlugin);
        if (!ar) return;
        if (autoRotate) { ar.stop(); setAutoRotate(false); }
        else { ar.start(); setAutoRotate(true); }
    };

    return (
        <div className={`${hideChrome ? "w-full h-full relative" : "fixed inset-0 z-[110] bg-black flex flex-col"} font-sans`}>

            {!hideChrome && (
                <div className="absolute top-0 left-0 right-0 z-30 p-4 md:p-8 flex items-start justify-between pointer-events-none">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4 backdrop-blur-xl bg-white/5 p-3 rounded-3xl border border-white/10 pointer-events-auto shadow-2xl">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <Navigation className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-black text-xs uppercase tracking-[0.2em] leading-none mb-1">PRO 3D IMMERSION</h2>
                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{scenes[currentSceneIndex]?.name}</p>
                            </div>
                        </div>

                        <div className="flex gap-2 pointer-events-auto">
                            <button onClick={toggleGyro}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-300 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md ${isGyro ? "bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/40" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}>
                                <Smartphone className="w-3 h-3" />
                                {isGyro ? "Gyro Active" : "Enable Gyro"}
                            </button>
                            <button onClick={toggleAutoRotate}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-300 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md ${autoRotate ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/40" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}>
                                <Compass className="w-3 h-3" />
                                {autoRotate ? "Auto-Rotate On" : "Cinematic Mode"}
                            </button>
                        </div>
                    </div>

                    <button onClick={onClose}
                        className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-xl border border-white/10 pointer-events-auto flex items-center justify-center transition-all hover:rotate-90 group">
                        <span className="text-2xl group-hover:scale-125 transition-transform">×</span>
                    </button>
                </div>
            )}

            {/* 360 canvas */}
            <div ref={containerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing bg-black" />

            {/* Scene thumbnails */}
            {scenes.length > 1 && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-end gap-4 p-4 backdrop-blur-2xl bg-black/20 rounded-[40px] border border-white/10 overflow-x-auto max-w-[95vw] sm:max-w-[80vw] z-30 shadow-2xl no-scrollbar">
                    {scenes.map((scene: any, i: number) => (
                        <button key={i} onClick={() => switchScene(i)}
                            className={`group relative min-w-[100px] h-20 rounded-3xl overflow-hidden transition-all duration-500 border-2 ${currentSceneIndex === i ? "border-orange-500 scale-110 -translate-y-2 shadow-2xl shadow-orange-500/40" : "border-transparent opacity-40 hover:opacity-100 hover:-translate-y-1"}`}>
                            <img src={scene.thumbnailUrl || scene.panoramaUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={scene.name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="absolute bottom-2 left-0 right-0 text-[8px] font-black text-white uppercase tracking-tighter text-center">{scene.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-2xl z-40 transition-opacity duration-1000">
                    <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                        <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin" />
                        <Compass className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white/40" />
                    </div>
                    <h2 className="text-white font-black text-lg uppercase tracking-[0.4em] mb-2">IMMERSING</h2>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest animate-pulse">Syncing 360 Environment…</p>
                    {scenes[currentSceneIndex]?.thumbnailUrl && (
                        <img src={scenes[currentSceneIndex].thumbnailUrl}
                            className="absolute inset-0 w-full h-full object-cover -z-10 opacity-20 blur-3xl scale-150 animate-pulse" alt="preview" />
                    )}
                </div>
            )}
        </div>
    );
};
