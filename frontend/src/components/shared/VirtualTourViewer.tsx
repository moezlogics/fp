"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, Compass, Navigation } from "lucide-react";

interface VirtualTourViewerProps {
    scenes: any[];
    onClose: () => void;
    initialSceneIndex?: number;
    /** When true, hides the built-in header/close button */
    hideChrome?: boolean;
}

/**
 * VirtualTourViewer — Immersive 3D World.
 * 
 * INNOVATIVE FEATURES:
 * 1. Gyroscope Orientation (Look around by moving phone).
 * 2. Mobile VR / Stereo Mode (Split screen for headsets).
 * 3. Progressive Loading (Blur-to-sharp).
 * 4. Premium Navigation HUD.
 */
export const VirtualTourViewer: React.FC<VirtualTourViewerProps> = ({ 
    scenes, 
    onClose, 
    initialSceneIndex = 0,
    hideChrome = false,
}) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const psvInstanceRef = useRef<any>(null);
    const [currentSceneIndex, setCurrentSceneIndex] = useState(initialSceneIndex);
    const [loading, setLoading] = useState(true);
    const [isVR, setIsVR] = useState(false);
    const [isGyro, setIsGyro] = useState(false);
    const [autoRotate, setAutoRotate] = useState(true);
    const [isPermissionRequested, setIsPermissionRequested] = useState(false);

    const initViewer = useCallback(() => {
        if (!viewerRef.current || !(window as any).PhotoSphereViewer) return;

        // Destroy previous instance
        if (psvInstanceRef.current) {
            try { psvInstanceRef.current.destroy(); } catch {}
            psvInstanceRef.current = null;
        }

        const scene = scenes[currentSceneIndex];
        if (!scene?.panoramaUrl) {
            setLoading(false);
            return;
        }

        try {
            const PSV = (window as any).PhotoSphereViewer;
            const viewer = new PSV.Viewer({
                container: viewerRef.current,
                panorama: scene.panoramaUrl,
                loadingImg: scene.thumbnailUrl || "https://photo-sphere-viewer.js.org/assets/loader.gif",
                loadingTxt: "Loading high-res world...",
                plugins: [
                    [PSV.GyroscopePlugin, {
                        absolutePosition: true,
                    }],
                    [PSV.StereoPlugin, {}],
                    [(PSV as any).MarkersPlugin, {
                        markers: scene.hotspots?.map((hs: any, index: number) => ({
                            id: hs.id || `marker-${index}`,
                            position: { pitch: hs.pitch || 0, yaw: hs.yaw || 0 },
                            // Professional glassmorphic bouncy arrow marker for 'scene' switches
                            html: hs.type === "scene" ? `
                                <div class="w-12 h-12 rounded-full backdrop-blur-xl bg-orange-500/80 border-2 border-white/50 text-white flex items-center justify-center cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.5)] animate-bounce hover:scale-110 transition-transform hover:bg-orange-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                                </div>
                            ` : `
                                <div class="w-8 h-8 rounded-full backdrop-blur-md bg-indigo-500/80 border border-white/30 text-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                                    <span class="font-bold text-sm">i</span>
                                </div>
                            `,
                            tooltip: hs.text || (hs.targetSceneId ? scenes.find((s:any) => s.id === hs.targetSceneId)?.name : null),
                            data: { targetSceneId: hs.targetSceneId }
                        })) || []
                    }],
                ],
                navbar: [
                    "autorotate",
                    "zoom",
                    "caption",
                    "fullscreen"
                ],
                caption: `<b>${scene.name}</b>`,
                defaultZoomLvl: 0,
                defaultLat: scene.initialView?.pitch || 0,
                defaultLong: scene.initialView?.yaw || 0,
                touchmoveTwoFingers: false,
                mousewheelCtrlKey: false,
                fisheye: true, // Professional wide-angle effect
                autorotateDelay: 2000,
                autorotateSpeed: "1rpm",
            });

            viewer.addEventListener("ready", () => {
                setLoading(false);
                if (autoRotate) viewer.psv.startAutorotate();
            });

            // Handle hotspot clicks
            const markersPlugin = viewer.getPlugin((PSV as any).MarkersPlugin);
            if (markersPlugin) {
                markersPlugin.addEventListener('select-marker', ({ marker }: any) => {
                    if (marker.data?.targetSceneId) {
                        const targetIndex = scenes.findIndex((s:any) => s.id === marker.data.targetSceneId);
                        if (targetIndex !== -1) {
                            // Switch scene
                            if (psvInstanceRef.current) {
                                psvInstanceRef.current.setPanorama(scenes[targetIndex].panoramaUrl, {
                                    showLoader: true,
                                    transition: 1000,
                                    zoom: 0,
                                }).then(() => {
                                    setCurrentSceneIndex(targetIndex);
                                    if (autoRotate) psvInstanceRef.current.startAutorotate();
                                });
                            }
                        }
                    }
                });
            }

            psvInstanceRef.current = viewer;
        } catch (err) {
            console.error("[VirtualTourViewer] Init failed:", err);
            setLoading(false);
        }
    }, [currentSceneIndex, scenes]);

    // Handle VR Toggle
    const toggleVR = () => {
        if (!psvInstanceRef.current) return;
        const stereo = psvInstanceRef.current.getPlugin((window as any).PhotoSphereViewer.StereoPlugin);
        if (stereo) {
            if (isVR) stereo.stop();
            else stereo.start();
            setIsVR(!isVR);
        }
    };

    // Handle Gyro Toggle
    const toggleGyro = async () => {
        if (!psvInstanceRef.current) return;
        
        // iOS Permission Request
        if (!isPermissionRequested && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const response = await (DeviceOrientationEvent as any).requestPermission();
                setIsPermissionRequested(true);
                if (response !== 'granted') return;
            } catch (e) {
                console.error("Gyro permission failed", e);
                return;
            }
        }

        const gyro = psvInstanceRef.current.getPlugin((window as any).PhotoSphereViewer.GyroscopePlugin);
        if (gyro) {
            if (isGyro) {
                gyro.stop();
                setIsGyro(false);
            } else {
                gyro.start().then(() => setIsGyro(true)).catch((e: any) => console.warn("Gyro start failed", e));
            }
        }
    };

    // Toggle Auto Rotate
    const toggleAutoRotate = () => {
        if (!psvInstanceRef.current) return;
        if (autoRotate) psvInstanceRef.current.stopAutorotate();
        else psvInstanceRef.current.startAutorotate();
        setAutoRotate(!autoRotate);
    };

    useEffect(() => {
        let cancelled = false;

        const loadScripts = async () => {
            if ((window as any).PhotoSphereViewer?.GyroscopePlugin) {
                if (!cancelled) initViewer();
                return;
            }

            const loadChain = [
                { id: "psv-css", type: "link", href: "https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/core/index.min.css" },
                { id: "psv-markers-css", type: "link", href: "https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/markers-plugin/index.min.css" },
                { id: "three-js", type: "script", src: "https://cdn.jsdelivr.net/npm/three/build/three.min.js" },
                { id: "psv-core", type: "script", src: "https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/core/index.min.js" },
                { id: "psv-gyro", type: "script", src: "https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/gyroscope-plugin/index.min.js" },
                { id: "psv-stereo", type: "script", src: "https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/stereo-plugin/index.min.js" },
                { id: "psv-markers", type: "script", src: "https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/markers-plugin/index.min.js" },
            ];

            for (const item of loadChain) {
                if (document.getElementById(item.id)) continue;
                if (item.type === "link") {
                    const l = document.createElement("link");
                    l.id = item.id;
                    l.rel = "stylesheet";
                    l.href = item.href!;
                    document.head.appendChild(l);
                } else {
                    const s = document.createElement("script");
                    s.id = item.id;
                    s.src = item.src!;
                    document.head.appendChild(s);
                    await new Promise(r => s.onload = r);
                }
            }

            if (!cancelled) initViewer();
        };

        setLoading(true);
        loadScripts();

        return () => {
            cancelled = true;
            if (psvInstanceRef.current) {
                try { psvInstanceRef.current.destroy(); } catch {}
                psvInstanceRef.current = null;
            }
        };
    }, [initViewer]);

    return (
        <div className={`${hideChrome ? "w-full h-full relative" : "fixed inset-0 z-[110] bg-black flex flex-col"} font-sans`}>
            
            {/* Immersive Header */}
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

                        {/* Innovatve Controls: VR & Gyro */}
                        <div className="flex gap-2 pointer-events-auto">
                            <button 
                                onClick={toggleGyro}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-300 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md ${isGyro ? "bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/40" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}
                            >
                                <Smartphone className="w-3 h-3" />
                                {isGyro ? "Gyro Active" : "Enable Gyro"}
                            </button>
                            <button 
                                onClick={toggleVR}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-300 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md ${isVR ? "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/40" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}
                            >
                                <Monitor className="w-3 h-3" />
                                {isVR ? "VR Mode On" : "VR Mode"}
                            </button>
                            <button 
                                onClick={toggleAutoRotate}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-300 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md ${autoRotate ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/40" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}
                            >
                                <Compass className="w-3 h-3" />
                                {autoRotate ? "Auto-Rotate On" : "Cinematic Mode"}
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-xl border border-white/10 pointer-events-auto flex items-center justify-center transition-all hover:rotate-90 group"
                    >
                        <span className="text-2xl group-hover:scale-125 transition-transform">×</span>
                    </button>
                </div>
            )}

            {/* The Main 360 Canvas */}
            <div ref={viewerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing bg-black" />

            {/* Innovative Thumbnails (Floating Glass) */}
            {scenes.length > 1 && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-end gap-4 p-4 backdrop-blur-2xl bg-black/20 rounded-[40px] border border-white/10 overflow-x-auto max-w-[95vw] sm:max-w-[80vw] z-30 shadow-2xl no-scrollbar">
                    {scenes.map((scene: any, i: number) => (
                        <button
                            key={i}
                            onClick={() => {
                                if (currentSceneIndex === i) return;
                                if (psvInstanceRef.current) {
                                    psvInstanceRef.current.setPanorama(scene.panoramaUrl, {
                                        showLoader: true,
                                        transition: 1000,
                                        zoom: 0,
                                    }).then(() => {
                                        setCurrentSceneIndex(i);
                                        if (autoRotate) psvInstanceRef.current.startAutorotate();
                                    });
                                } else {
                                    setLoading(true);
                                    setCurrentSceneIndex(i);
                                }
                            }}
                            className={`group relative min-w-[100px] h-20 rounded-3xl overflow-hidden transition-all duration-500 border-2 ${
                                currentSceneIndex === i ? "border-orange-500 scale-110 -translate-y-2 shadow-2xl shadow-orange-500/40" : "border-transparent opacity-40 hover:opacity-100 hover:-translate-y-1"
                            }`}
                        >
                            <img src={scene.thumbnailUrl || scene.panoramaUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={scene.name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="absolute bottom-2 left-0 right-0 text-[8px] font-black text-white uppercase tracking-tighter text-center">
                                {scene.name}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Progressive Loading State */}
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-2xl z-40 transition-opacity duration-1000">
                    <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                        <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin" />
                        <Compass className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white/40" />
                    </div>
                    <h2 className="text-white font-black text-lg uppercase tracking-[0.4em] mb-2">IMMERSING</h2>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest animate-pulse">Syncing 360 Environment...</p>
                    
                    {/* Background Preview (Progressive) */}
                    {scenes[currentSceneIndex]?.thumbnailUrl && (
                        <img 
                            src={scenes[currentSceneIndex].thumbnailUrl} 
                            className="absolute inset-0 w-full h-full object-cover -z-10 opacity-20 blur-3xl scale-150 animate-pulse" 
                            alt="preview"
                        />
                    )}
                </div>
            )}
        </div>
    );
};
