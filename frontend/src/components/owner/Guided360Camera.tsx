"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, CheckCircle2, RotateCcw, ShieldCheck, Crosshair } from "lucide-react";
import { toast } from "react-hot-toast";

interface Guided360CameraProps {
    onComplete: (frames: string[]) => void;
    onCancel: () => void;
}

/**
 * Guided360Camera — Proprietary 3D Capture System for Foodies Pakistan.
 * 
 * INNOVATIVE UPGRADES:
 * 1. AR-Targeting (Floating 3D Orbs).
 * 2. Auto-Snap (Frame capture on alignment + stability).
 * 3. Haptic HUD (Vibration feedback).
 * 4. Lightweight WebP integration (handled by backend).
 */
export const Guided360Camera: React.FC<Guided360CameraProps> = ({ onComplete, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Core state
    const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
    const [isStable, setIsStable] = useState(true);
    const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
    const [capturing, setCapturing] = useState(false);
    const [alignmentScore, setAlignmentScore] = useState(0); // 0 to 100
    const [isPermissionGranted, setIsPermissionGranted] = useState(false);

    // Targets for 360 coverage (Degrees: alpha [0-360], beta [-90 to 90])
    const targets = [
        ...[0, 45, 90, 135, 180, 225, 270, 315].map(a => ({ a, b: 0 })), // Horizon
        ...[0, 60, 120, 180, 240, 300].map(a => ({ a, b: 35 })),       // Upper
        ...[0, 60, 120, 180, 240, 300].map(a => ({ a, b: -35 })),      // Lower
        ...[0, 120, 240].map(a => ({ a, b: 65 })),                    // Near Top
        ...[0, 120, 240].map(a => ({ a, b: -65 })),                   // Near Bottom
    ];

    const currentTarget = targets[capturedFrames.length] || null;

    // ── 1. Permission Handling (Crucial for iOS) ──
    const requestPermissions = async () => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const permission = await (DeviceOrientationEvent as any).requestPermission();
                if (permission === 'granted') {
                    setIsPermissionGranted(true);
                    startCamera();
                } else {
                    toast.error("Motion sensors are required for 3D capture.");
                    onCancel();
                }
            } catch (err) {
                console.error("Permission request failed", err);
                onCancel();
            }
        } else {
            setIsPermissionGranted(true);
            startCamera();
        }
    };

    // ── 1. Camera & Fullscreen Setup ──
    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false
            });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
            
            // Enter Fullscreen for professional immersion
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
            }
        } catch (err) {
            toast.error("Camera access denied. Please enable camera in settings.");
        }
    };

    useEffect(() => {
        return () => {
            stream?.getTracks().forEach(t => t.stop());
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        };
    }, [stream]);

    // ── 2. Sensor Integration ──
    useEffect(() => {
        if (!isPermissionGranted) return;

        const handleOrientation = (e: DeviceOrientationEvent) => {
            if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
                setOrientation({ alpha: e.alpha, beta: e.beta, gamma: e.gamma });
            }
        };

        const handleMotion = (e: DeviceMotionEvent) => {
            const acc = e.accelerationIncludingGravity;
            if (acc) {
                const total = Math.sqrt((acc.x || 0)**2 + (acc.y || 0)**2 + (acc.z || 0)**2);
                setIsStable(Math.abs(total - 9.8) < 1.5);
            }
        };

        window.addEventListener("deviceorientation", handleOrientation);
        window.addEventListener("devicemotion", handleMotion);

        return () => {
            window.removeEventListener("deviceorientation", handleOrientation);
            window.removeEventListener("devicemotion", handleMotion);
        };
    }, [isPermissionGranted]);

    // ── 4. High-Quality Capture Logic ──
    const safeVibrate = (pattern: number | number[]) => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch (e) {}
        }
    };

    const captureFrame = useCallback(() => {
        if (!videoRef.current || !canvasRef.current || capturing) return;
        
        setCapturing(true);
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL("image/webp", 0.9);
            setCapturedFrames(prev => [...prev, dataUrl]);
            safeVibrate([50, 30, 50]);
            setTimeout(() => setCapturing(false), 600);
        }
    }, [capturing]);

    // ── 5. AR Alignment Engine ──
    useEffect(() => {
        if (!currentTarget || capturing) return;

        let dAlpha = (currentTarget.a - orientation.alpha + 540) % 360 - 180;
        let dBeta = currentTarget.b - orientation.beta;
        
        const dist = Math.sqrt(dAlpha*dAlpha + dBeta*dBeta);
        const score = Math.max(0, 100 - dist * 5);
        setAlignmentScore(score);

        if (score > 95 && isStable) {
            const timer = setTimeout(captureFrame, 400);
            return () => clearTimeout(timer);
        }
    }, [orientation, currentTarget, isStable, capturing, captureFrame]);

    const getTargetPos = () => {
        if (!currentTarget) return { x: 50, y: 50 };
        let dAlpha = (currentTarget.a - orientation.alpha + 540) % 360 - 180;
        let dBeta = currentTarget.b - orientation.beta;
        const x = 50 + (dAlpha / 40) * 50; 
        const y = 50 - (dBeta / 40) * 50;
        return { x: Math.min(90, Math.max(10, x)), y: Math.min(90, Math.max(10, y)) };
    };

    const targetPos = getTargetPos();
    const progress = Math.round((capturedFrames.length / targets.length) * 100);

    if (!isPermissionGranted) {
        return (
            <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-6 text-center text-white font-sans">
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-orange-500 to-orange-800 flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/20 animate-pulse">
                    <Camera className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-black mb-4 tracking-tight">Studio Mode</h1>
                <p className="text-gray-400 mb-10 max-w-xs text-sm leading-relaxed">
                    To capture a high-quality 3D tour, we need access to your motion sensors.
                </p>
                <div className="space-y-4 w-full max-w-xs">
                    <Button 
                        onClick={requestPermissions}
                        className="w-full bg-white text-black hover:bg-gray-200 h-14 rounded-2xl font-black text-lg shadow-xl shadow-white/10 active:scale-95 transition-all"
                    >
                        I'm Ready
                    </Button>
                    <Button 
                        onClick={onCancel}
                        variant="ghost"
                        className="w-full text-white/40 hover:text-white/60 font-bold"
                    >
                        Maybe Later
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[999] bg-black text-white flex flex-col items-center justify-center overflow-hidden font-sans touch-none h-[100dvh]">
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            <canvas ref={canvasRef} className="hidden" />

            <div className="relative z-10 w-full h-full flex flex-col items-center justify-between pointer-events-none">
                <div className="w-full p-6 pt-10 flex justify-between items-start">
                    <div className="backdrop-blur-md bg-black/30 p-4 rounded-3xl border border-white/10 pointer-events-auto">
                        <h3 className="font-bold text-xl tracking-tight text-white mb-1">PRO 3D SCAN</h3>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            <p className="text-xs font-medium text-white/70 uppercase tracking-widest">
                                NODE {capturedFrames.length + 1} / {targets.length}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3 pointer-events-auto">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={onCancel} 
                            className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white"
                        >
                            <span className="text-xl">×</span>
                        </Button>
                        <div className={`px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-tighter backdrop-blur-md border transition-all ${isStable ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"}`}>
                             {isStable ? <ShieldCheck className="w-3 h-3 inline mr-1 mb-0.5" /> : "HOLD STEADY"}
                             {isStable ? "READY" : "STABILIZING"}
                        </div>
                    </div>
                </div>

                {/* The AR World: Guidance System */}
                <div className="relative w-full flex-1 flex items-center justify-center">
                    {/* Digital Level (Innovative AR UI) */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-64 h-64 relative">
                            <div 
                                className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/20 transition-transform duration-100"
                                style={{ transform: `translateY(-50%) rotate(${orientation.gamma}deg)` }}
                            >
                                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 -mt-2 rounded-full border border-white/40 transition-colors ${Math.abs(orientation.gamma) < 2 ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-white/10"}`} />
                            </div>
                            <div 
                                className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20 transition-transform duration-100"
                                style={{ transform: `translateX(-50%) rotate(${orientation.beta - 90}deg)` }}
                            >
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 -ml-2 rounded-full border border-white/40 transition-colors ${Math.abs(orientation.beta - 90) < 2 ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-white/10"}`} />
                            </div>
                        </div>
                    </div>

                    {/* Fixed Center Reticle */}
                    <div className={`relative w-24 h-24 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${alignmentScore > 90 ? "border-green-400 scale-110 bg-green-400/10" : "border-white/20 scale-100"}`}>
                        <Crosshair className={`w-8 h-8 transition-colors ${alignmentScore > 90 ? "text-green-400" : "text-white/40"}`} />
                        {alignmentScore > 90 && isStable && (
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <circle 
                                    cx="48" cy="48" r="44" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="4" 
                                    strokeDasharray="276"
                                    className="text-green-400 animate-[dash_0.4s_ease-out_forwards]"
                                />
                            </svg>
                        )}
                    </div>

                    {/* Floating 3D Orb (AR Target) */}
                    {currentTarget && (
                        <div 
                            className="absolute transition-all duration-100 ease-linear"
                            style={{ 
                                left: `${targetPos.x}%`, 
                                top: `${targetPos.y}%`,
                                transform: `translate(-50%, -50%) scale(${0.5 + alignmentScore/200})`
                            }}
                        >
                            <div className="relative">
                                <div className={`w-12 h-12 rounded-full bg-white/10 backdrop-blur-lg border-2 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-colors ${alignmentScore > 90 ? "border-green-400 bg-green-400/20" : "border-white/60"}`}>
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                </div>
                                <div className="absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full text-[10px] font-bold text-white/80 border border-white/5 uppercase">
                                    Target Point
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls & Progress */}
                <div className="w-full p-8 space-y-6 pointer-events-auto">
                    <div className="flex items-center gap-6">
                        <div className="flex-1 space-y-2">
                             <div className="flex justify-between text-[10px] font-black tracking-widest text-white/50">
                                <span>3D SCAN PROGRESS</span>
                                <span>{progress}%</span>
                             </div>
                             <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <div 
                                    className="h-full bg-gradient-to-r from-orange-600 via-amber-500 to-green-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                                    style={{ width: `${progress}%` }}
                                />
                             </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-6">
                        {!stream ? (
                            <Button 
                                onClick={requestPermissions}
                                className="bg-white text-black hover:bg-white/90 rounded-full px-12 py-8 h-auto text-lg font-bold shadow-2xl"
                            >
                                START 3D CAPTURE
                            </Button>
                        ) : progress >= 100 ? (
                            <Button 
                                onClick={() => onComplete(capturedFrames)}
                                className="bg-green-500 hover:bg-green-600 text-white rounded-full px-12 py-8 h-auto text-lg font-bold shadow-[0_10px_40px_rgba(34,197,94,0.4)] animate-bounce"
                            >
                                <CheckCircle2 className="mr-2" /> FINISH 360 TOUR
                            </Button>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">Align orb to center to capture</p>
                                <div className="w-20 h-20 rounded-full border-4 border-white/10 flex items-center justify-center">
                                    <div className={`w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center transition-all ${capturing ? "scale-90 bg-white" : "scale-100"}`}>
                                        <Camera className={`w-6 h-6 ${capturing ? "text-black" : "text-white/40"}`} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

             {/* Capture Overlay Flash */}
             {capturing && (
                <div className="absolute inset-0 bg-white z-[110] animate-in fade-in transition-all duration-300 flex items-center justify-center">
                    <div className="text-black font-black text-4xl tracking-tighter italic">CAPTURED</div>
                </div>
             )}
             
             <style jsx>{`
                @keyframes dash {
                    to { stroke-dashoffset: 0; }
                }
             `}</style>
        </div>
    );
};
