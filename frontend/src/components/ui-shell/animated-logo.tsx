"use client";

import { useEffect, useRef, useId } from "react";

interface AnimatedLogoProps {
    mobile?: boolean;
}

export function AnimatedLogo({ mobile = false }: AnimatedLogoProps) {
    const uniqueId = useId().replace(/:/g, "");

    const svgRef = useRef<SVGSVGElement>(null);

    // Refs for DOM nodes to animate
    const lidLRef = useRef<SVGPathElement>(null);
    const lidRRef = useRef<SVGPathElement>(null);
    const clipLRef = useRef<SVGPathElement>(null);
    const clipRRef = useRef<SVGPathElement>(null);
    const pupilLRef = useRef<SVGCircleElement>(null);
    const pupilRRef = useRef<SVGCircleElement>(null);
    const pupilLHRef = useRef<SVGCircleElement>(null);
    const pupilRHRef = useRef<SVGCircleElement>(null);

    // State object strictly held in ref for animation frame performance
    const state = useRef({
        scroll: 0,
        mx: typeof window !== "undefined" ? window.innerWidth / 2 : 500,
        my: typeof window !== "undefined" ? window.innerHeight / 2 : 500,
        lastMove: typeof performance !== "undefined" ? performance.now() : 0,
        px: 0,
        py: 0,
        tpx: 0,
        tpy: 0,
        idleT: 0,
        blink: 0,
        blinkPh: 'none' as 'none' | 'closing' | 'closed' | 'opening',
        blinkHold: 0,
        blinkAcc: 0,
        nextBlink: 2000 + Math.random() * 3000,
        blinkSpeed: 1,
        blinkMax: 1,
        lt: typeof performance !== "undefined" ? performance.now() : 0,
        dt: 0,
        keyCD: 0,
        mobile: mobile,
        prevScroll: 0,
        gyroX: 0,
        gyroY: 0,
        gyroEnabled: false,
    });

    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const S = state.current;

        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

        const handleMouseMove = (e: MouseEvent) => {
            S.mx = e.clientX;
            S.my = e.clientY;
            S.lastMove = performance.now();
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches && e.touches[0]) {
                S.mx = e.touches[0].clientX;
                S.my = e.touches[0].clientY;
                S.lastMove = performance.now();
            }
        };

        const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
            if (e.gamma === null || e.beta === null) return;
            S.gyroEnabled = true;
            S.gyroX = clamp(e.gamma / 45, -1, 1) * 9;
            S.gyroY = clamp((e.beta - 30) / 40, -1, 1) * 7;
        };

        const triggerBlink = (type = 'normal') => {
            if (S.blinkPh !== 'none') return;
            S.blinkPh = 'closing';
            S.blink = 0;
            if (type === 'fast') { S.blinkSpeed = 2.4; S.blinkMax = 1; }
            else if (type === 'slow') { S.blinkSpeed = 0.5; S.blinkMax = 1; }
            else if (type === 'half') { S.blinkSpeed = 1.2; S.blinkMax = 0.5; }
            else { S.blinkSpeed = 1; S.blinkMax = 1; }
        };

        const handleInteraction = () => {
            if (S.keyCD <= 0) {
                triggerBlink('fast');
                S.keyCD = 350;
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
        }
        document.addEventListener('keydown', handleInteraction);
        document.addEventListener('click', handleInteraction);

        const updateBlink = (dt: number) => {
            S.blinkAcc += dt;
            if (S.blinkPh === 'none' && S.blinkAcc >= S.nextBlink) {
                S.blinkAcc = 0;
                S.nextBlink = 1800 + Math.random() * 4000;
                
                const r = Math.random();
                if (r < 0.20) triggerBlink('fast');
                else if (r < 0.40) triggerBlink('slow');
                else if (r < 0.55) triggerBlink('half');
                else triggerBlink('normal');
                
                if (Math.random() < 0.20) {
                    setTimeout(() => triggerBlink('fast'), 320);
                }
            }
            
            const cs = (dt / 50) * S.blinkSpeed;
            const os = (dt / 105) * S.blinkSpeed;
            
            switch (S.blinkPh) {
                case 'closing':
                    S.blink = Math.min(S.blinkMax, S.blink + cs);
                    if (S.blink >= S.blinkMax) { 
                        S.blinkPh = 'closed'; 
                        S.blinkHold = 25 + Math.random() * 35; 
                    }
                    break;
                case 'closed':
                    S.blinkHold -= dt;
                    if (S.blinkHold <= 0) S.blinkPh = 'opening';
                    break;
                case 'opening':
                    S.blink = Math.max(0, S.blink - os);
                    if (S.blink <= 0) { 
                        S.blinkPh = 'none'; 
                        S.blink = 0; 
                    }
                    break;
            }
        };

        const update = (dt: number) => {
            S.keyCD = Math.max(0, S.keyCD - dt);
            S.prevScroll = S.scroll;
            S.scroll = window.scrollY;
            S.mobile = window.innerWidth < 768 || navigator.maxTouchPoints > 0;

            if (S.prevScroll > 50 && S.scroll <= 2) {
                setTimeout(() => triggerBlink('slow'), 150);
                setTimeout(() => triggerBlink('fast'), 550);
            }

            const idle = performance.now() - S.lastMove;
            let cx = window.innerWidth / 2;
            let cy = window.innerHeight / 2;

            if (svgRef.current) {
                const rect = svgRef.current.getBoundingClientRect();
                cx = rect.left + rect.width * 0.42;
                cy = rect.top + rect.height * 0.45;
            }

            if (!S.mobile && idle > 3000) {
                S.idleT += dt;
                S.tpx = Math.sin(S.idleT * .0006) * 7 + Math.sin(S.idleT * .0017) * 3;
                S.tpy = Math.cos(S.idleT * .0011) * 5 + Math.sin(S.idleT * .0005) * 2;
            } else if (S.mobile) {
                if (S.gyroEnabled) {
                    S.tpx = lerp(S.tpx, S.gyroX, .06);
                    S.tpy = lerp(S.tpy, S.gyroY, .06);
                } else {
                    const maxScroll = document.body.scrollHeight - window.innerHeight || 1;
                    const scrollRatio = S.scroll / maxScroll;
                    
                    S.tpy = Math.pow(scrollRatio, 0.3) * 10;
                    
                    S.idleT += dt;
                    const wanderAmp = 4 + scrollRatio * 8;
                    S.tpx = Math.sin(S.idleT * 0.0007) * wanderAmp;
                }
            } else {
                const dx = S.mx - cx;
                const dy = S.my - cy;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                const str = Math.min(d / 200, 1);
                S.tpx = (dx / d) * 10 * str;
                S.tpy = (dy / d) * 10 * str;
            }

            S.px = lerp(S.px, S.tpx, .09);
            S.py = lerp(S.py, S.tpy, .09);
        };

        const render = () => {
            const base = -40;
            const bf = 1 - S.blink;
            const lc = base * bf;
            
            const lidPath = `M-22 0Q0 ${lc} 22 0`;
            if (lidLRef.current) lidLRef.current.setAttribute('d', lidPath);
            if (lidRRef.current) lidRRef.current.setAttribute('d', lidPath);

            const lidOp = lc < -32 ? Math.max(0, 1 - (-lc - 32) / 10) : 1;
            if (lidLRef.current) lidLRef.current.style.opacity = String(lidOp);
            if (lidRRef.current) lidRRef.current.style.opacity = String(lidOp);

            const clipPath = `M-22 0Q0 ${lc} 22 0L22 30-22 30Z`;
            if (clipLRef.current) clipLRef.current.setAttribute('d', clipPath);
            if (clipRRef.current) clipRRef.current.setAttribute('d', clipPath);

            const tx = `translate3d(${S.px}px,${S.py}px, 0)`;
            const thx = `translate3d(${S.px * 1.15}px,${S.py * 1.15}px, 0)`;

            if (pupilLRef.current) pupilLRef.current.style.transform = tx;
            if (pupilRRef.current) pupilRRef.current.style.transform = tx;
            if (pupilLHRef.current) pupilLHRef.current.style.transform = thx;
            if (pupilRHRef.current) pupilRHRef.current.style.transform = thx;
        };

        const loop = (t: number) => {
            S.dt = Math.min(t - S.lt, 50);
            S.lt = t;

            updateBlink(S.dt);
            update(S.dt);
            render();

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('deviceorientation', handleDeviceOrientation);
            document.removeEventListener('keydown', handleInteraction);
            document.removeEventListener('click', handleInteraction);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const width = mobile ? 160 : 220;
    const height = mobile ? 55 : 75;

    return (
        <svg
            ref={svgRef}
            width={width}
            height={height}
            viewBox="0 0 345 140"
            xmlns="http://www.w3.org/2000/svg"
            className="overflow-visible"
            aria-label="Foodies Pakistan"
        >
            <defs>
                <radialGradient id={`pupilGrad-${uniqueId}`} cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#333" />
                    <stop offset="100%" stopColor="#111" />
                </radialGradient>
                <clipPath id={`eyeClipL-${uniqueId}`}>
                    <path ref={clipLRef} d="M-22 0Q0-5 22 0L22 22-22 22Z" />
                </clipPath>
                <clipPath id={`eyeClipR-${uniqueId}`}>
                    <path ref={clipRRef} d="M-22 0Q0-5 22 0L22 22-22 22Z" />
                </clipPath>
            </defs>

            {/* F */}
            <text
                fill="#e8323b"
                fontFamily='"Poppins", sans-serif'
                fontSize="85"
                fontWeight="700"
                x="0"
                y="85"
            >
                F
            </text>

            {/* Eyes */}
            <g id="eyesCont" transform="translate(100,63)">
                {/* Left Eye */}
                <g transform="translate(-28,0)">
                    <circle cx="0" cy="0" r="22" fill="white" stroke="#111" strokeWidth="5.5" />
                    <circle
                        ref={pupilLRef}
                        className="pupil"
                        clipPath={`url(#eyeClipL-${uniqueId})`}
                        fill={`url(#pupilGrad-${uniqueId})`}
                        cx="0"
                        cy="0"
                        r="10"
                        style={{ willChange: "transform" }}
                    />
                    <circle
                        ref={pupilLHRef}
                        className="pupil-highlight-dot"
                        clipPath={`url(#eyeClipL-${uniqueId})`}
                        cx="-4"
                        cy="-4"
                        fill="white"
                        opacity=".9"
                        r="3"
                        style={{ pointerEvents: "none", willChange: "transform" }}
                    />
                    <path
                        ref={lidLRef}
                        d="M-22 0L22 0"
                        fill="none"
                        stroke="#111"
                        strokeLinecap="round"
                        strokeWidth="8"
                    />
                </g>

                {/* Right Eye */}
                <g transform="translate(28,0)">
                    <circle cx="0" cy="0" r="22" fill="white" stroke="#111" strokeWidth="5.5" />
                    <circle
                        ref={pupilRRef}
                        className="pupil"
                        clipPath={`url(#eyeClipR-${uniqueId})`}
                        fill={`url(#pupilGrad-${uniqueId})`}
                        cx="0"
                        cy="0"
                        r="10"
                        style={{ willChange: "transform" }}
                    />
                    <circle
                        ref={pupilRHRef}
                        className="pupil-highlight-dot"
                        clipPath={`url(#eyeClipR-${uniqueId})`}
                        cx="-4"
                        cy="-4"
                        fill="white"
                        opacity=".9"
                        r="3"
                        style={{ pointerEvents: "none", willChange: "transform" }}
                    />
                    <path
                        ref={lidRRef}
                        d="M-22 0L22 0"
                        fill="none"
                        stroke="#111"
                        strokeLinecap="round"
                        strokeWidth="8"
                    />
                </g>
            </g>

            {/* dies */}
            <text
                fill="#e8323b"
                fontFamily='"Poppins", sans-serif'
                fontSize="85"
                fontWeight="700"
                x="155"
                y="85"
            >
                dies
            </text>

            {/* Smile */}
            <g transform="translate(100,98)">
                <path
                    d="M-35 0Q0 22 35 0"
                    fill="none"
                    stroke="#111"
                    strokeLinecap="round"
                    strokeWidth="5.5"
                />
            </g>

            {/* Pakistan Subtext */}
            <text
                fill="#111"
                fontFamily='"Poppins", sans-serif'
                fontSize="22"
                fontWeight="700"
                letterSpacing="4"
                textAnchor="end"
                x="335"
                y="110"
            >
                PAKISTAN
            </text>
        </svg>
    );
}
