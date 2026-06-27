"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Store, Image as ImageIcon, Clock, Tag, Star,
    Settings, Plus, LogOut, MapPin, UtensilsCrossed, CalendarDays, BookOpen, Wallet, Ticket, X, SlidersHorizontal, Crown,
    ArrowLeftRight, Building2, Box, ImagePlus
} from "lucide-react";
import { signOut } from "next-auth/react";
import BranchSelector, { getSavedBranchId, saveBranchToDevice, clearDeviceBranch } from "./branch-selector";

/* ── Branch Context ── */
const BranchContext = createContext<{ branch: any; branches: any[]; setBranchId: (id: string) => void; refreshBranches: () => Promise<void> }>({ branch: null, branches: [], setBranchId: () => { }, refreshBranches: async () => { } });
export const useBranch = () => useContext(BranchContext);

const navItems = [
    { label: "Dashboard", href: "/owner", icon: LayoutDashboard },
    { label: "Bookings", href: "/owner/bookings", icon: BookOpen },
    { label: "Wallet", href: "/owner/settlements", icon: Wallet },
    { label: "Bank Details", href: "/owner/bank-details", icon: Building2 },
    { label: "Table Mgmt", href: "/owner/table-management", icon: SlidersHorizontal },
    { label: "Branch Prime", href: "/owner/prime", icon: Crown },
    { label: "Prime Verify", href: "/owner/prime-verify", icon: Crown },
    { label: "Vouchers", href: "/owner/vouchers", icon: Ticket },
    { label: "Deals", href: "/owner/deals", icon: Tag },
    { label: "Reviews", href: "/owner/reviews", icon: Star },
    { label: "Profile", href: "/owner/profile", icon: Store },
    { label: "Menu", href: "/owner/menu", icon: UtensilsCrossed },
    { label: "Gallery", href: "/owner/gallery", icon: ImageIcon },
    { label: "Stories", href: "/owner/stories", icon: ImagePlus },
    { label: "3D Virtual Tour", href: "/owner/virtual-tour", icon: Box },
    { label: "Timings", href: "/owner/timings", icon: Clock },
];

// Items specifically for the mobile bottom bar
const mobileNavItems = [
    { label: "Home", href: "/owner", icon: LayoutDashboard },
    { label: "Bookings", href: "/owner/bookings", icon: BookOpen },
    { label: "Deals", href: "/owner/deals", icon: Tag },
    { label: "Menu", href: "/owner/menu", icon: UtensilsCrossed },
    { label: "More", href: "/owner/profile", icon: Settings },
];

export default function OwnerShell({ children }: { children: React.ReactNode }) {
    const { data: session, status, update } = useSession();
    const pathname = usePathname();
    const [branches, setBranches] = useState<any[]>([]);
    const [activeBranchId, setActiveBranchId] = useState<string>("");
    const [activeBranch, setActiveBranch] = useState<any>(null);
    const [isApproved, setIsApproved] = useState<boolean>(true);
    const [branding, setBranding] = useState<{ logoUrl?: string; siteName?: string }>({ siteName: "Owner Portal" });

    /* ── Branch selector gate state ── */
    const [showSelector, setShowSelector] = useState(false);
    const [branchesLoaded, setBranchesLoaded] = useState(false);

    const branchType = (session?.user as any)?.branchType || "single";
    const canAddBranch = branchType === "multi" || branches.length === 0;

    // ── Stable primitives from session (won't cause infinite loops) ──
    const userId = (session?.user as any)?.id as string | undefined;
    const sessionApproved = (session?.user as any)?.isApproved as boolean | undefined;

    // ── Set initial approval from session, then try live API (ONCE) ──
    const hasFetchedApproval = useRef(false);
    useEffect(() => {
        if (status !== "authenticated" || !userId) return;

        // Set from session immediately
        setIsApproved(sessionApproved !== false);

        if (hasFetchedApproval.current) return;
        hasFetchedApproval.current = true;

        // Try to get fresh isApproved from live API (may fail if backend down)
        fetch("/api/owner/user-settings")
            .then(r => {
                if (!r.ok) throw new Error(`API error ${r.status}`);
                return r.json();
            })
            .then(data => {
                const userData = data?.data || data;
                if (userData && typeof userData.isApproved === "boolean") {
                    setIsApproved(userData.isApproved);
                    if (userData.isApproved !== sessionApproved && update) {
                        update({ isApproved: userData.isApproved });
                    }
                }
            })
            .catch(() => {
                console.warn("[OwnerShell] Failed to fetch live approval status, using session value");
            });
        // Fetch branding for the logo
        fetch("/api/settings/public")
            .then(r => r.json())
            .then(d => { if (d && typeof d === "object") setBranding(prev => ({ ...prev, ...d })); })
            .catch((err) => { console.error("[OwnerShell] Branding fetch failed:", err); });
    }, [status, userId, sessionApproved]);

    // ── Fetch branches (ONCE when authenticated, or when forced) ──
    const fetchBranches = async () => {
        if (status !== "authenticated" || !userId) return;
        try {
            const r = await fetch(`/api/owner/restaurant?ownerId=${userId}`);
            if (!r.ok) throw new Error("API error");
            const data = await r.json();
            const arr = Array.isArray(data) ? data : [];
            setBranches(arr);

            // ── Device-lock logic: check localStorage for saved branch ──
            const savedId = getSavedBranchId();
            if (savedId && arr.find((b: any) => b._id === savedId)) {
                // Device has a saved branch — auto-apply it (no selector shown)
                setActiveBranchId(savedId);
                setActiveBranch(arr.find((b: any) => b._id === savedId));
                setShowSelector(false);
            } else if (arr.length > 0) {
                // No saved branch — show the Netflix selector
                setShowSelector(true);
            }

            setBranchesLoaded(true);
        } catch (error) {
            console.warn("[OwnerShell] Failed to fetch branches", error);
            setBranches([]);
            setBranchesLoaded(true);
        }
    };

    const hasFetchedBranches = useRef(false);
    useEffect(() => {
        if (status !== "authenticated" || !userId) return;
        if (hasFetchedBranches.current) return;
        hasFetchedBranches.current = true;
        fetchBranches();
    }, [status, userId]);

    // Exposed to context so new-branch page can force a refresh without unmounting the shell
    const refreshBranches = async () => {
        await fetchBranches();
    };

    useEffect(() => {
        if (!activeBranchId) return;
        const cached = branches.find(b => b._id === activeBranchId);
        if (cached) { setActiveBranch(cached); return; }
        fetch(`/api/owner/restaurant?branchId=${activeBranchId}`).then(r => r.json()).then(d => setActiveBranch(d?.data || d));
    }, [activeBranchId, branches]);

    // ── Handle branch selection from the Netflix selector ──
    const handleBranchSelected = (branchId: string) => {
        saveBranchToDevice(branchId);
        setActiveBranchId(branchId);
        const branchData = branches.find(b => b._id === branchId);
        if (branchData) setActiveBranch(branchData);
        setShowSelector(false);
    };

    // ── Handle switching branches (clears device lock, shows selector) ──
    const handleSwitchBranch = () => {
        clearDeviceBranch();
        setShowSelector(true);
    };

    // ── Mobile sidebar state ──
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    if (status === "loading") return <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC]"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    if (status === "unauthenticated" || (session as any)?.error === "RefreshTokenExpired") {
        if (typeof window !== "undefined") {
            window.location.href = "/owner";
        }
        return <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC]"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    // ── Show Netflix-style Branch Selector gate ──
    // Conditions: branches loaded, has branches, no saved branch, NOT on new-branch page
    const isNewBranchPage = pathname === "/owner/new-branch";
    if (branchesLoaded && showSelector && branches.length > 0 && !isNewBranchPage) {
        return (
            <BranchContext.Provider value={{ branch: activeBranch, branches, setBranchId: handleBranchSelected, refreshBranches }}>
                <BranchSelector
                    branches={branches}
                    onBranchSelected={handleBranchSelected}
                    canAddBranch={canAddBranch}
                />
            </BranchContext.Provider>
        );
    }

    return (
        <BranchContext.Provider value={{ branch: activeBranch, branches, setBranchId: handleBranchSelected, refreshBranches }}>
            <div className="min-h-screen bg-[#F7F9FC] flex flex-col lg:flex-row font-sans">

                {/* ── Desktop Floating Sidebar ── */}
                <aside className="hidden lg:flex flex-col w-[280px] h-screen sticky top-0 p-4 shrink-0">
                    <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col overflow-hidden border border-gray-100">
                        {/* Headers */}
                        <div className="p-6 pb-4">
                            <Link href="/" className="flex items-center gap-3 mb-6 group">
                                {branding.logoUrl ? (
                                    <img src={branding.logoUrl} alt={branding.siteName} className="h-10 object-contain max-w-[160px]" />
                                ) : (
                                    <>
                                        <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-black text-lg shadow-primary/10 shadow-lg group-hover:scale-105 transition-transform">
                                            F
                                        </div>
                                        <div className="transition-transform group-hover:translate-x-1 duration-300 overflow-hidden">
                                            <span className="font-black text-gray-900 tracking-tighter block truncate" suppressHydrationWarning>{branding.siteName || "Owner Portal"}</span>
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em] block truncate" suppressHydrationWarning>
                                                {activeBranch?.brandName || "Select Branch"}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </Link>

                            {/* Branch Indicator + Switch Button */}
                            <button
                                onClick={handleSwitchBranch}
                                className="w-full flex items-center gap-3 bg-gray-50 border border-gray-100 text-gray-900 text-xs font-bold rounded-xl px-4 py-3 hover:bg-gray-100 hover:border-gray-200 transition-all group cursor-pointer"
                            >
                                <MapPin className="w-4 h-4 text-primary shrink-0" />
                                <span className="flex-1 text-left truncate">
                                    {activeBranch ? `${activeBranch.brandName} — ${activeBranch.branchName}` : "Select Branch"}
                                </span>
                                <ArrowLeftRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
                            </button>
                        </div>

                        {/* Navigation Grid */}
                        <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 custom-scrollbar">
                            <p className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-2">Menu</p>
                            {navItems.map(item => {
                                const active = pathname === item.href;
                                return (
                                    <Link key={item.href} href={item.href}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                                            ? "bg-primary/10 text-primary"
                                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                            }`}>
                                        <item.icon className={`w-4 h-4 ${active ? "text-primary" : "text-gray-400"}`} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Logout Bottom Footer */}
                        <div className="p-4 bg-gray-50 mt-auto border-t border-gray-100">
                            {canAddBranch && (
                                <Link href="/owner/new-branch" className="flex items-center gap-3 px-3 py-2.5 text-xs text-primary font-black hover:bg-primary/5 rounded-xl transition-all mb-1 group">
                                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Plus className="w-3 h-3" /></div>
                                    Add New Branch
                                </Link>
                            )}
                            <button onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-3 px-3 py-2.5 text-xs font-black text-red-600 hover:bg-red-50 rounded-xl w-full transition-all group">
                                <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center group-hover:rotate-12 transition-transform"><LogOut className="w-3.5 h-3.5" /></div>
                                Secure Logout
                            </button>
                        </div>
                    </div>
                </aside>

                {/* ── Main Content Area ── */}
                <div className="flex-1 flex flex-col min-w-0 max-w-[1600px] w-full mx-auto relative lg:h-screen lg:overflow-y-auto custom-scrollbar lg:py-4 lg:pr-4">

                    {/* Native App Top Header (Mobile & Desktop) */}
                    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 lg:hidden flex items-center justify-between shadow-sm">
                        {branding.logoUrl ? (
                            <img src={branding.logoUrl} alt={branding.siteName} className="h-8 object-contain shrink-0 max-w-[120px]" />
                        ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-black text-lg shadow-primary/20 shadow-lg shrink-0">
                                F
                            </div>
                        )}
                        {/* Branch indicator + switch */}
                        <button
                            onClick={handleSwitchBranch}
                            className="flex items-center gap-2 bg-gray-100 text-xs font-bold rounded-full px-4 py-2 max-w-[200px] truncate ml-3 hover:bg-gray-200 transition-all active:scale-95"
                        >
                            <span className="truncate">{activeBranch?.branchName || "Select Branch"}</span>
                            <ArrowLeftRight className="w-3 h-3 text-gray-400 shrink-0" />
                        </button>
                    </header>

                    {/* Desktop Top Bar (Transparent App Header) */}
                    <header className="hidden lg:flex sticky top-0 z-30 bg-[#F7F9FC]/80 backdrop-blur-md pb-4 pt-2 px-6 items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight capitalize">{pathname.split('/').pop() || 'Dashboard'}</h2>
                            <p className="text-xs text-gray-500 font-medium" suppressHydrationWarning>{activeBranch?.brandName} — {activeBranch?.branchName}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full shadow-sm border border-gray-100 group cursor-default">
                            <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-[10px] font-black shadow-sm group-hover:rotate-[360deg] transition-transform duration-700">✓</div>
                            <span className="text-xs font-black text-gray-900 tracking-tight">{session?.user?.name}</span>
                        </div>
                    </header>

                    {/* Page Content Container */}
                    <main className="flex-1 p-4 md:p-6 lg:p-0 mb-20 lg:mb-0 lg:px-6">
                        {/* ── Approval Gate ── */}
                        {!isApproved ? (
                            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
                                <div className="w-24 h-24 bg-gradient-to-br from-primary/5 to-primary/10 rounded-[28px] flex items-center justify-center shadow-inner">
                                    <span className="text-5xl">⏳</span>
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Account Under Review</h2>
                                    <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                                        Your restaurant owner account is being reviewed by the <span className="font-bold text-primary">Foodies Pakistan</span> team.
                                        You will receive an email notification once your account is approved.
                                    </p>
                                </div>
                                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 max-w-sm w-full">
                                    <p className="text-xs text-primary-dark font-bold mb-1">What happens next?</p>
                                    <ul className="text-xs text-primary-dark space-y-1">
                                        <li className="flex items-center gap-2"><span className="text-primary">●</span> Our team reviews your application</li>
                                        <li className="flex items-center gap-2"><span className="text-primary">●</span> You get an email when approved</li>
                                        <li className="flex items-center gap-2"><span className="text-primary">●</span> Then you can add branches, menu & more</li>
                                    </ul>
                                </div>
                                <div className="flex gap-3">
                                    <Link href="/" className="text-xs font-bold text-gray-500 hover:text-gray-700 transition px-4 py-2">← Back to Home</Link>
                                    <button onClick={() => window.location.reload()} className="bg-primary text-white text-xs font-bold px-6 py-2.5 rounded-full hover:bg-primary-dark transition shadow-lg shadow-primary/20">
                                        Check Status ↻
                                    </button>
                                </div>
                            </div>
                        ) : branches.length === 0 && !pathname.startsWith("/owner/new-branch") ? (
                            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5 bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
                                <div className="w-24 h-24 bg-gradient-to-br from-primary/5 to-primary/10 rounded-[28px] flex items-center justify-center shadow-inner"><Store className="w-10 h-10 text-primary" /></div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Welcome to Foodies Pakistan!</h2>
                                    <p className="text-sm text-gray-500 max-w-sm mt-2 mx-auto">Start by listing your first restaurant branch. You can add more branches later as your empire grows.</p>
                                </div>
                                <Link href="/owner/new-branch" className="bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-full font-bold text-sm transition-all shadow-lg justify-center shadow-primary/20 flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Add Your First Restaurant
                                </Link>
                            </div>
                        ) : (
                            // Content Wrapper
                            <div className="bg-white lg:rounded-[32px] rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-gray-100 lg:p-8 p-4 min-h-[calc(100vh-140px)]">
                                {children}
                            </div>
                        )}
                    </main>

                    {/* ── Mobile Bottom Navigation Bar ── */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 p-2 px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 rounded-t-3xl">
                        <nav className="flex items-center justify-between max-w-md mx-auto relative">
                            {mobileNavItems.map(item => {
                                if (item.label === "More") {
                                    // "More" button opens the sidebar instead of navigating
                                    return (
                                        <button key="more" onClick={() => setMobileSidebarOpen(true)} className="flex flex-col items-center gap-1 p-2 w-16 relative">
                                            <div className="transition-all duration-300">
                                                <item.icon className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400">More</span>
                                        </button>
                                    );
                                }
                                const active = pathname === item.href;
                                return (
                                    <Link key={item.label} href={item.href} className="flex flex-col items-center gap-1 p-2 w-16 relative">
                                        <div className={`transition-all duration-300 ${active ? "-translate-y-1" : ""}`}>
                                            <item.icon className={`w-5 h-5 ${active ? "text-primary fill-primary/20" : "text-gray-400"}`} />
                                        </div>
                                        <span className={`text-[10px] font-bold transition-all ${active ? "text-primary" : "text-gray-400"}`}>{item.label}</span>
                                        {active && <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full shadow-sm shadow-primary/20" />}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* ── Mobile Slide-Out Sidebar ── */}
                    {mobileSidebarOpen && (
                        <>
                            {/* Backdrop */}
                            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] lg:hidden animate-in fade-in duration-200" onClick={() => setMobileSidebarOpen(false)} />

                            {/* Sidebar Panel */}
                            <div className="fixed inset-y-0 left-0 w-[280px] bg-white z-[61] lg:hidden shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
                                {/* Header */}
                                <div className="p-5 pb-3 border-b border-gray-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-black text-sm">F</div>
                                            <div>
                                                <span className="font-black text-gray-900 text-sm tracking-tighter block">Owner Portal</span>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{session?.user?.name}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => setMobileSidebarOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                                            <X className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>

                                    {/* Branch Switch Button */}
                                    <button
                                        onClick={() => { handleSwitchBranch(); setMobileSidebarOpen(false); }}
                                        className="w-full flex items-center gap-3 bg-gray-50 border border-gray-100 text-gray-900 text-xs font-bold rounded-xl px-3 py-2.5 hover:bg-gray-100 transition-all group"
                                    >
                                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <span className="flex-1 text-left truncate">
                                            {activeBranch ? `${activeBranch.brandName} — ${activeBranch.branchName}` : "Select Branch"}
                                        </span>
                                        <ArrowLeftRight className="w-3 h-3 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
                                    </button>
                                </div>

                                {/* Navigation */}
                                <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                                    {navItems.map(item => {
                                        const active = pathname === item.href;
                                        return (
                                            <Link key={item.href} href={item.href} onClick={() => setMobileSidebarOpen(false)}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-gray-600 hover:bg-gray-50"
                                                    }`}>
                                                <item.icon className={`w-4 h-4 ${active ? "text-primary" : "text-gray-400"}`} />
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </nav>

                                {/* Footer */}
                                <div className="p-3 border-t border-gray-100 space-y-1">
                                    {canAddBranch && (
                                        <Link href="/owner/new-branch" onClick={() => setMobileSidebarOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 text-xs text-primary font-black hover:bg-primary/5 rounded-xl transition-all">
                                            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center"><Plus className="w-3 h-3" /></div>
                                            Add New Branch
                                        </Link>
                                    )}
                                    <button onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-3 px-3 py-2.5 text-xs font-black text-red-600 hover:bg-red-50 rounded-xl w-full transition-all">
                                        <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center"><LogOut className="w-3.5 h-3.5" /></div>
                                        Secure Logout
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </BranchContext.Provider>
    );
}
