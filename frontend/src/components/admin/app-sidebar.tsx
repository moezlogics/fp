"use client"

import * as React from "react"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { LayoutDashboard, Users, FileText, ImageIcon, Settings, CreditCard, LogOut, MonitorPlay, UtensilsCrossed, MapPin, Building2, UserCheck, Newspaper, CalendarDays, Wallet, Crown, Gift, Globe, Star, Mail } from "lucide-react"
import { signOut } from "next-auth/react"

const navItems = [
    {
        title: "Overview",
        url: "/moezlogin",
        icon: LayoutDashboard,
    },
    {
        title: "Reservations",
        url: "/moezlogin/reservations",
        icon: CalendarDays,
    },
    {
        title: "Finance",
        url: "/moezlogin/finance",
        icon: Wallet,
    },
    {
        title: "Subscriptions",
        url: "/moezlogin/subscriptions",
        icon: Crown,
    },
    {
        title: "Rewards Config",
        url: "/moezlogin/rewards",
        icon: Gift,
    },
    {
        title: "Categories",
        url: "/moezlogin/categories",
        icon: UtensilsCrossed,
    },
    {
        title: "Cities & Areas",
        url: "/moezlogin/cities",
        icon: MapPin,
    },
    {
        title: "SEO Pages",
        url: "/moezlogin/seo-pages",
        icon: Globe,
    },
    {
        title: "Site Reviews",
        url: "/moezlogin/site-reviews",
        icon: Star,
    },
    {
        title: "Contact Leads",
        url: "/moezlogin/contact-leads",
        icon: Mail,
    },
    {
        title: "Restaurant Reviews",
        url: "/moezlogin/reviews",
        icon: Star,
    },
    {
        title: "Restaurants",
        url: "/moezlogin/restaurants",
        icon: Building2,
    },
    {
        title: "Owner Applications",
        url: "/moezlogin/owners",
        icon: UserCheck,
    },
    {
        title: "Users",
        url: "/moezlogin/users",
        icon: Users,
    },
    {
        title: "Banners",
        url: "/moezlogin/banners",
        icon: MonitorPlay,
    },
    {
        title: "Articles / Blog",
        url: "/moezlogin/articles",
        icon: Newspaper,
    },
    {
        title: "Banks",
        url: "/moezlogin/banks",
        icon: CreditCard,
    },
    {
        title: "Deals",
        url: "/moezlogin/deals",
        icon: CreditCard,
    },
    {
        title: "Media Library",
        url: "/moezlogin/media",
        icon: ImageIcon,
    },
    {
        title: "Settings",
        url: "/moezlogin/settings",
        icon: Settings,
    },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const [branding, setBranding] = React.useState<{ logoUrl?: string; siteName?: string }>({ siteName: "Foodies PK" });

    React.useEffect(() => {
        fetch("/api/settings/public").then(r => r.json()).then(d => {
            if (d && typeof d === "object") setBranding(prev => ({ ...prev, ...d }));
        }).catch(() => { });
    }, []);

    return (
        <Sidebar {...props} className="border-r border-gray-100 bg-[#F7F9FC]">
            <SidebarHeader className="p-4 pb-2">
                <div className="flex items-center gap-3 px-2 py-3 bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                    {branding.logoUrl ? (
                        <img src={branding.logoUrl} alt={branding.siteName} className="h-10 object-contain mx-auto" style={{ maxWidth: 160 }} />
                    ) : (
                        <>
                            <div className="flex aspect-square size-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-200 text-white">
                                <span className="font-bold font-heading text-lg">F</span>
                            </div>
                            <div className="flex flex-col gap-0.5 leading-none overflow-hidden">
                                <span className="font-black tracking-tight text-gray-900 truncate">{branding.siteName || "Foodies PK"}</span>
                                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600">Super Admin</span>
                            </div>
                        </>
                    )}
                </div>
            </SidebarHeader>
            <SidebarContent className="px-3 pb-4 custom-scrollbar">
                <SidebarGroup>
                    <SidebarGroupLabel className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2 mt-4">Platform Engine</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-1">
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild className="hover:bg-blue-50 hover:text-blue-700 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700 data-[active=true]:font-bold rounded-xl px-3 py-5 transition-all">
                                        <a href={item.url} className="flex items-center gap-3">
                                            <item.icon className="w-4 h-4" />
                                            <span className="text-sm font-medium">{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <div className="mt-auto pt-6 pb-2">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="w-full flex items-center gap-3 px-3 py-5 rounded-xl text-red-600 font-bold hover:bg-red-50 hover:text-red-700 transition-all border border-transparent hover:border-red-100"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Secure Logout</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
