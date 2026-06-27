"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, User, Compass, Sparkles } from "lucide-react";

export function BottomNav() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [citySlug, setCitySlug] = useState("lahore");
    const [tapped, setTapped] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        const match = document.cookie.match(/foodies_city=([^;]+)/);
        if (match) setCitySlug(match[1]);
    }, []);

    // Don't render on restaurant detail pages — the Book Now bar replaces this
    const isRestaurantPage = mounted && /^\/[^/]+\/[^/]+\/?$/.test(pathname) && !pathname.includes("/deals");

    if (isRestaurantPage) return null;

    const items = [
        { label: "Deals", href: `/${citySlug}/deals/`, icon: Sparkles },
        { label: "Explore", href: `/${citySlug}/`, icon: Compass },
        { label: "Home", href: "/", icon: Home },
        { label: "Saved", href: "/saved", icon: Heart },
        { label: "Account", href: "/account", icon: User },
    ];

    const handleTap = (label: string) => {
        setTapped(label);
        setTimeout(() => setTapped(null), 400);
    };

    // Find active index for pill position
    const activeIndex = mounted
        ? items.findIndex(item => item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))
        : 2;

    return (
        <nav className="btm-nav fixed bottom-0 left-0 right-0 z-50 sm:hidden">
            {/* Glassmorphism background */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl border-t border-gray-100/80" />

            {/* Active pill background — slides to the active item */}
            <div
                className="absolute top-1.5 h-10 w-[52px] rounded-2xl bg-primary/10 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-[1]"
                style={{
                    left: `calc(${activeIndex >= 0 ? activeIndex : 2} * 20% + 10% - 26px)`,
                    opacity: activeIndex >= 0 ? 1 : 0,
                }}
            />

            <div className="relative flex justify-around items-center h-[56px] px-1 pb-[env(safe-area-inset-bottom)] z-[2]">
                {items.map((item) => {
                    const isActive = mounted && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
                    const isTapped = tapped === item.label;

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => handleTap(item.label)}
                            className="flex flex-col items-center justify-center w-full py-1 relative"
                        >
                            {/* Icon with bounce animation */}
                            <div
                                className={`transition-all duration-300 ease-out ${
                                    isActive
                                        ? "text-primary scale-110"
                                        : "text-gray-400"
                                } ${isTapped ? "scale-125" : ""}`}
                                style={{
                                    transform: `${isActive ? "scale(1.1)" : "scale(1)"} ${isTapped ? "scale(1.25) translateY(-2px)" : ""}`,
                                    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                }}
                            >
                                <item.icon
                                    className={`w-[20px] h-[20px] transition-all duration-300 ${
                                        isActive ? "drop-shadow-sm" : ""
                                    }`}
                                    strokeWidth={isActive ? 2.5 : 1.8}
                                    fill={isActive && item.icon === Heart ? "currentColor" : "none"}
                                />
                            </div>

                            {/* Label */}
                            <span
                                className={`text-[9px] mt-[2px] font-semibold transition-all duration-300 ${
                                    isActive ? "text-primary" : "text-gray-400"
                                }`}
                            >
                                {item.label}
                            </span>

                            {/* Active dot indicator */}
                            <div
                                className={`absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                                    isActive ? "opacity-100 scale-100" : "opacity-0 scale-0"
                                }`}
                            />
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
