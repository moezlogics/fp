"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MapPin, Search, ChevronDown, User, X, Menu, Compass, Newspaper, Crown, Tag } from "lucide-react";
import { useSession } from "next-auth/react";
import { AnimatedLogo } from "./animated-logo";

interface Branding {
    logoUrl: string;
    logoWidthDesktop: number;
    logoHeightDesktop: number;
    logoWidthMobile: number;
    logoHeightMobile: number;
    siteName: string;
}

export function AppHeader({ initialCity = "Lahore", initialCitySlug = "lahore", initialBranding }: { initialCity?: string; initialCitySlug?: string; initialBranding?: Partial<Branding> } = {}) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    const [scrolled, setScrolled] = useState(false);
    const [cityOpen, setCityOpen] = useState(false);
    const [cities, setCities] = useState<any[]>([]);
    const [activeCity, setActiveCity] = useState(initialCity);
    const [activeCitySlug, setActiveCitySlug] = useState(initialCitySlug);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [mobileMenu, setMobileMenu] = useState(false);
    const [branding, setBranding] = useState<Branding>({
        logoUrl: initialBranding?.logoUrl || "",
        logoWidthDesktop: initialBranding?.logoWidthDesktop || 140,
        logoHeightDesktop: initialBranding?.logoHeightDesktop || 40,
        logoWidthMobile: initialBranding?.logoWidthMobile || 100,
        logoHeightMobile: initialBranding?.logoHeightMobile || 32,
        siteName: initialBranding?.siteName || "Foodies Pakistan",
    });

    const desktopCityRef = useRef<HTMLDivElement>(null);
    const mobileCityRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const mobileSearchRef = useRef<HTMLInputElement>(null);

    // ── Scroll: sticky with glassmorphism ──
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // ── Fetch branding + cities on mount ──
    useEffect(() => {
        fetch("/api/initial-data")
            .then(r => r.json())
            .then(d => {
                if (d?.settings && typeof d.settings === "object") setBranding(prev => ({ ...prev, ...d.settings }));
                if (d?.cities && Array.isArray(d.cities)) setCities(d.cities);
            })
            .catch(() => { });

        // ── City detection priority order (accurate → fallback) ──
        // 1. User-selected cookie (if manually chosen in last 7 days — respect user's choice)
        // 2. Browser GPS geolocation (most accurate: ±10–50m)
        // 3. IP-based geolocation (inaccurate in PK — ISP hubs report Islamabad/Lahore for all)
        // 4. Default to Lahore
        const match = document.cookie.match(/foodies_city=([^;]+)/);
        const nameMatch = document.cookie.match(/foodies_city_name=([^;]+)/);
        const manualMatch = document.cookie.match(/foodies_city_manual=([^;]+)/);
        const hasManualPick = !!manualMatch;

        if (match && nameMatch) {
            // Show cookie city immediately (no flicker)
            setActiveCitySlug(match[1]);
            setActiveCity(decodeURIComponent(nameMatch[1]));
        }

        // Always try GPS first — it's dramatically more accurate than IP in Pakistan.
        // Only skip GPS re-detection if user manually picked a city (respect user choice).
        if (!hasManualPick) {
            requestBrowserLocation(false).catch(() => {
                // GPS failed/denied → fall back to IP detection
                if (!match) detectViaIP();
            });
        }
    }, []);

    const detectViaIP = async () => {
        try {
            const r = await fetch("/api/geo/ip");
            const data = await r.json();
            if (data?.latitude && data.longitude) {
                storeUserCoords(data.latitude, data.longitude);
                const r2 = await fetch(`/api/cities/detect?lat=${data.latitude}&lng=${data.longitude}`);
                const data2 = await r2.json();
                if (data2?.slug) {
                    setCityCookieSilent(data2.slug, data2.name);
                    router.refresh();
                    return;
                }
            }
            // If IP detection itself failed → default to Lahore
            if (!document.cookie.match(/foodies_city=/)) {
                setCityCookieSilent("lahore", "Lahore");
                router.refresh();
            }
        } catch {
            if (!document.cookie.match(/foodies_city=/)) {
                setCityCookieSilent("lahore", "Lahore");
                router.refresh();
            }
        }
    };

    const requestBrowserLocation = (coordsOnly: boolean): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation not supported"));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    storeUserCoords(latitude, longitude);
                    if (!coordsOnly) {
                        try {
                            const res = await fetch(`/api/cities/detect?lat=${latitude}&lng=${longitude}`);
                            const data = await res.json();
                            // Read current cookie directly (state may be stale in closure)
                            const currentMatch = document.cookie.match(/foodies_city=([^;]+)/);
                            const currentSlug = currentMatch ? currentMatch[1] : "";
                            if (data?.slug && data.slug !== currentSlug) {
                                setCityCookieSilent(data.slug, data.name);
                                router.refresh();
                            }
                        } catch { /* ignore — don't overwrite existing city on API error */ }
                    }
                    resolve();
                },
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
            );
        });
    };

    const storeUserCoords = (lat: number, lng: number) => {
        sessionStorage.setItem("fp_lat", String(lat));
        sessionStorage.setItem("fp_lng", String(lng));
        localStorage.setItem("fp_lat", String(lat));
        localStorage.setItem("fp_lng", String(lng));
    };

    const setCityCookieSilent = (slug: string, name: string) => {
        setActiveCity(name);
        setActiveCitySlug(slug);
        document.cookie = `foodies_city=${slug};path=/;max-age=${365 * 24 * 60 * 60}`;
        document.cookie = `foodies_city_name=${encodeURIComponent(name)};path=/;max-age=${365 * 24 * 60 * 60}`;
    };

    const setCityCookie = (slug: string, name: string) => {
        setCityCookieSilent(slug, name);
        router.refresh();
    };

    // ── Click outside ──
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const isOutsideDesktop = desktopCityRef.current && !desktopCityRef.current.contains(e.target as Node);
            const isOutsideMobile = mobileCityRef.current && !mobileCityRef.current.contains(e.target as Node);
            if (isOutsideDesktop && isOutsideMobile) setCityOpen(false);
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── Debounced search ──
    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults([]); return; }
        const t = setTimeout(() => {
            fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=6&city=${activeCitySlug}`)
                .then(r => r.json())
                .then(data => setSearchResults(Array.isArray(data) ? data : []))
                .catch(() => { });
        }, 300);
        return () => clearTimeout(t);
    }, [searchQuery, activeCitySlug]);

    // ── Auto-focus mobile search ──
    useEffect(() => {
        if (searchOpen && mobileSearchRef.current) {
            setTimeout(() => mobileSearchRef.current?.focus(), 100);
        }
    }, [searchOpen]);

    const selectCity = (city: any) => {
        setCityCookieSilent(city.slug, city.name);
        // Mark as manual selection — prevents GPS auto-override on next page load
        // (user explicitly chose this city, respect their choice for 7 days)
        document.cookie = `foodies_city_manual=1;path=/;max-age=${7 * 24 * 60 * 60}`;
        setCityOpen(false);
        router.push(`/${city.slug}/`);
    };

    const handleSearchResultClick = (r: any) => {
        setSearchOpen(false);
        setSearchQuery("");
        setMobileMenu(false);
        if (typeof window !== "undefined") {
            sessionStorage.setItem("next_route_type", "restaurant");
        }
        router.push(`/${(r.city || "pk").toLowerCase()}/${r.slug}/`);
    };

    const navLinks = [
        { label: "Near Me", href: `/${activeCitySlug}/`, icon: Compass },
        { label: "Deals", href: `/${activeCitySlug}/deals/`, icon: Tag },
        { label: "Blog", href: "/articles", icon: Newspaper },
    ];

    const userRole = (session?.user as any)?.role;
    const showListRestaurant = userRole !== "owner" && userRole !== "admin";

    // ── Logo component — Always uses Animated SVG ──
    const Logo = ({ mobile = false }: { mobile?: boolean }) => (
        <AnimatedLogo mobile={mobile} />
    );

    return (
        <>
            <nav
                className={`sticky top-0 z-50 transition-all duration-300 border-b ${scrolled
                    ? "bg-white/90 backdrop-blur-xl shadow-sm border-gray-100"
                    : "bg-white border-transparent"
                    }`}
            >
                {/* ─── DESKTOP HEADER ─── */}
                <div className="hidden md:block">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex items-center justify-between h-16 gap-4">
                            {/* Logo */}
                            <Link href="/" className="shrink-0 transition-transform active:scale-95">
                                <Logo />
                            </Link>

                            {/* Nav Links */}
                            <div className="flex items-center gap-1">
                                {navLinks.map(link => (
                                    <Link
                                        key={link.label}
                                        href={link.href}
                                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                                            ? "text-primary bg-primary/5"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                            }`}
                                    >
                                        <link.icon className="w-4 h-4" />
                                        {link.label}
                                    </Link>
                                ))}
                                {showListRestaurant && (
                                    <Link href="/prime"
                                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${pathname === "/prime"
                                                ? "text-primary-dark bg-primary/5"
                                                : "text-primary hover:text-primary-dark hover:bg-primary/5 bg-primary/5"
                                            }`}>
                                        <Crown className="w-4 h-4" />
                                        Prime
                                    </Link>
                                )}
                            </div>

                            {/* Search Bar */}
                            <div ref={searchRef} className="flex-1 max-w-sm relative">
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        value={searchQuery}
                                        onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                                        onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
                                        placeholder="Search restaurants..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-full text-sm focus:outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                    />
                                </div>
                                {searchOpen && searchResults.length > 0 && (
                                    <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                                        {searchResults.map((r: any) => (
                                            <button key={r._id} onClick={() => handleSearchResultClick(r)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 text-left">
                                                <img src={r.logo || r.coverImage || "/placeholder.jpg"} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                                                    <p className="text-xs text-gray-500">{r.area}, {r.city}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* City + Auth */}
                            <div className="flex items-center gap-2 shrink-0">
                                {/* City Selector */}
                                <div ref={desktopCityRef} className="relative">
                                    <button onClick={() => setCityOpen(!cityOpen)}
                                        className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 rounded-full px-3 py-2 border border-gray-200/80 transition-all text-sm group">
                                        <MapPin className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                                        <span className="font-bold text-gray-900 max-w-[80px] truncate">{activeCity}</span>
                                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${cityOpen ? "rotate-180" : ""}`} />
                                    </button>
                                    {cityOpen && (
                                        <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-3 border-b sticky top-0 bg-white rounded-t-2xl">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Select City</p>
                                            </div>
                                            <div className="p-2 grid grid-cols-2 gap-1">
                                                {cities.map(c => (
                                                    <button key={c._id || c.slug} onClick={() => selectCity(c)}
                                                        className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition ${c.slug === activeCitySlug ? "bg-primary/10 text-primary font-bold" : "hover:bg-gray-50 text-gray-700"}`}>
                                                        {c.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Auth Button */}
                                {session?.user ? (
                                    <Link href={userRole === "owner" ? "/owner" : userRole === "admin" ? "/admin" : "/account"}
                                        className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-full px-3 py-1.5 border border-gray-200/80 transition-all">
                                        {(session.user as any).avatar || session.user.image ? (
                                            <img src={(session.user as any).avatar || session.user.image} alt="" className="w-7 h-7 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                {(session.user.name || "U").charAt(0)}
                                            </div>
                                        )}
                                        <span className="text-xs font-bold text-gray-700 max-w-[60px] truncate">{session.user.name?.split(" ")[0]}</span>
                                    </Link>
                                ) : (
                                    <Link href="/account"
                                        className="bg-primary text-white px-5 py-2.5 rounded-full text-xs font-black hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5" />
                                        Login / Register
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── MOBILE HEADER ─── */}
                <div className="md:hidden">
                    <div className="px-3">
                        <div className="relative flex items-center justify-between h-14 gap-2">
                            {/* Left: City Selector */}
                            <div ref={mobileCityRef} className="relative shrink-0">
                                <button onClick={() => setCityOpen(!cityOpen)}
                                    className="flex items-center gap-1 bg-gray-50 rounded-full pl-2 pr-2.5 py-1.5 border border-gray-100 text-xs">
                                    <MapPin className="w-3 h-3 text-primary" />
                                    <span className="font-bold text-gray-900 max-w-[35px] truncate">{activeCity}</span>
                                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${cityOpen ? "rotate-180" : ""}`} />
                                </button>
                                {cityOpen && (
                                    <div className="absolute top-full mt-2 left-0 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-3 border-b sticky top-0 bg-white rounded-t-2xl">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Select City</p>
                                        </div>
                                        <div className="p-2 grid grid-cols-2 gap-1">
                                            {cities.map(c => (
                                                <button key={c._id || c.slug} onClick={() => selectCity(c)}
                                                    className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition ${c.slug === activeCitySlug ? "bg-primary/10 text-primary font-bold" : "hover:bg-gray-50 text-gray-700"}`}>
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Center: Logo */}
                            <Link href="/" className="absolute left-1/2 -translate-x-1/2 transition-transform active:scale-95">
                                <Logo mobile />
                            </Link>

                            {/* Right: Search + Menu */}
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => { setSearchOpen(!searchOpen); setMobileMenu(false); }}
                                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-full transition">
                                    <Search className="w-5 h-5" />
                                </button>
                                <button onClick={() => { setMobileMenu(!mobileMenu); setSearchOpen(false); }}
                                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-full transition">
                                    {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Mobile Search Drawer ── */}
                    {searchOpen && (
                        <div className="px-3 pb-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    ref={mobileSearchRef}
                                    autoFocus
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search restaurants, cuisines..."
                                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                                />
                                <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {searchResults.length > 0 && (
                                <div className="mt-2 bg-white border border-gray-100 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                                    {searchResults.map((r: any) => (
                                        <button key={r._id} onClick={() => handleSearchResultClick(r)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-left">
                                            <img src={r.logo || r.coverImage || "/placeholder.jpg"} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-100" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                                                <p className="text-[11px] text-gray-500">{r.area}, {r.city}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Mobile Menu Drawer ── */}
                    {mobileMenu && (
                        <div className="border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-2 py-3 space-y-0.5">
                                {navLinks.map(link => (
                                    <Link key={link.label} href={link.href} onClick={() => setMobileMenu(false)}
                                        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-800 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors">
                                        <link.icon className="w-4.5 h-4.5 text-gray-400" />
                                        {link.label}
                                    </Link>
                                ))}
                                {showListRestaurant && (
                                    <Link href="/prime" onClick={() => setMobileMenu(false)}
                                        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-primary-dark bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors">
                                        <Crown className="w-4.5 h-4.5 text-primary" />
                                        Foodies Prime
                                    </Link>
                                )}

                                <div className="pt-2 px-2 border-t border-gray-100 mt-2">
                                    {session?.user ? (
                                        <Link href={userRole === "owner" ? "/owner" : userRole === "admin" ? "/admin" : "/account"}
                                            onClick={() => setMobileMenu(false)}
                                            className="flex items-center gap-3 py-3 px-2">
                                            {(session.user as any).avatar || session.user.image ? (
                                                <img src={(session.user as any).avatar || session.user.image} alt="" className="w-9 h-9 rounded-full object-cover border" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                    {(session.user.name || "U").charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{session.user.name}</p>
                                                <p className="text-[11px] text-gray-500 capitalize">{userRole || "User"} Account</p>
                                            </div>
                                        </Link>
                                    ) : (
                                        <Link href="/account" onClick={() => setMobileMenu(false)}
                                            className="block w-full bg-primary text-white text-center py-3 rounded-xl text-sm font-black shadow-lg shadow-primary/20 active:scale-95 transition-transform">
                                            Login / Register
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </nav>
        </>
    );
}