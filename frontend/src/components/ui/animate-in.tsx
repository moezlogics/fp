"use client";

import { useRef, useEffect, useState, ReactNode } from "react";

type Animation =
    | "fade-in"
    | "slide-up"
    | "slide-down"
    | "slide-right"
    | "slide-left"
    | "scale-in"
    | "blur-in";

interface AnimateInProps {
    children: ReactNode;
    animation?: Animation;
    delay?: number;
    duration?: number;
    className?: string;
    /** Wrap children in a stagger container — each child animates sequentially */
    stagger?: boolean;
    /** Only animate once (default true) */
    once?: boolean;
    /** IntersectionObserver threshold (0-1) */
    threshold?: number;
    /** HTML tag to render as */
    as?: string;
}

/**
 * AnimateIn — Intersection Observer-based entrance animation.
 * Applies animation only when the element scrolls into view.
 * 
 * Usage:
 *   <AnimateIn animation="slide-up">
 *     <h2>Hello</h2>
 *   </AnimateIn>
 * 
 *   <AnimateIn animation="slide-up" stagger>
 *     <Card /><Card /><Card />
 *   </AnimateIn>
 */
export function AnimateIn({
    children,
    animation = "slide-up",
    delay = 0,
    duration,
    className = "",
    stagger = false,
    once = true,
    threshold = 0.1,
    as: Tag = "div",
}: AnimateInProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // Respect reduced motion
        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReduced) {
            setIsVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (once) observer.unobserve(el);
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            { threshold, rootMargin: "0px 0px -40px 0px" }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [once, threshold]);

    const animClass = isVisible ? `animate-${animation}` : "opacity-0";
    const staggerClass = stagger && isVisible ? "stagger-children" : "";
    const style: React.CSSProperties = {};
    if (delay > 0) style.animationDelay = `${delay}ms`;
    if (duration) style.animationDuration = `${duration}ms`;

    return (
        // @ts-expect-error — dynamic tag
        <Tag
            ref={ref}
            className={`${animClass} ${staggerClass} ${className}`.trim()}
            style={style}
        >
            {children}
        </Tag>
    );
}

/**
 * PageTransition — Wraps page content in a smooth entrance animation.
 * Drop this into any page.tsx or layout as the outermost wrapper.
 */
export function PageTransition({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return <div className={`page-enter ${className}`}>{children}</div>;
}

