import { auth } from "@/auth"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"
import { Building2, Users, Star, Tag, MapPin, Newspaper, Image as ImageIcon, Clock, AlertTriangle, MessageSquareHeart } from "lucide-react"

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
    const session = await auth()
    // Layout already enforces admin-only access â€” session is guaranteed here

    // Call the core API for admin dashboard stats
    let data: any = {};
    let apiError = false;
    try {
        const res = await apiClient("/analytics/dashboard", { requireAuth: true })
        data = res.data?.data || {}
    } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
        console.error("[AdminDashboard] API call failed:", err?.message || err);
        apiError = true;
    }

    const {
        totalRestaurants = 0, approvedRestaurants = 0, pendingRestaurants = 0,
        totalUsers = 0, totalOwners = 0, pendingOwners = 0,
        totalReviews = 0, totalSiteReviews = 0, totalCategories = 0, totalCities = 0,
        totalDeals = 0, totalArticles = 0, totalBanners = 0
    } = data;

    const stats = [
        { label: "Total Restaurants", value: totalRestaurants, icon: Building2, color: "bg-primary/5 text-primary", sub: `${approvedRestaurants} approved, ${pendingRestaurants} pending` },
        { label: "Total Users", value: totalUsers, icon: Users, color: "bg-blue-50 text-blue-600", sub: `${totalOwners} owners, ${pendingOwners} pending` },
        { label: "Reviews", value: totalReviews, icon: Star, color: "bg-yellow-50 text-yellow-600", sub: "Restaurant reviews" },
        { label: "Site Reviews", value: totalSiteReviews, icon: MessageSquareHeart, color: "bg-rose-50 text-rose-600", sub: "From popup widget" },
        { label: "Active Deals", value: totalDeals, icon: Tag, color: "bg-green-50 text-green-600", sub: "Bank + restaurant deals" },
        { label: "Categories", value: totalCategories, icon: MapPin, color: "bg-purple-50 text-purple-600", sub: `${totalCities} cities` },
        { label: "Articles", value: totalArticles, icon: Newspaper, color: "bg-pink-50 text-pink-600", sub: "Blog posts" },
        { label: "Active Banners", value: totalBanners, icon: ImageIcon, color: "bg-indigo-50 text-indigo-600", sub: "Homepage sliders" },
    ]

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {session?.user?.name}. Here's what's happening on the platform.</p>
            </div>

            {apiError && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-sm text-primary-dark">Unable to Load Stats</p>
                        <p className="text-xs text-primary mt-0.5">Dashboard data could not be fetched. This may be a temporary issue &mdash; try refreshing the page.</p>
                    </div>
                </div>
            )}

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="rounded-xl border bg-card text-card-foreground shadow-sm">
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                                    <stat.icon className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold">{stat.value.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-3">
                {pendingRestaurants > 0 && (
                    <Link href="/moezlogin/restaurants" className="rounded-xl border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-primary" />
                            <div>
                                <p className="font-bold text-sm text-primary">{pendingRestaurants} Pending Approvals</p>
                                <p className="text-xs text-primary">Restaurants awaiting review</p>
                            </div>
                        </div>
                    </Link>
                )}
                {pendingOwners > 0 && (
                    <Link href="/moezlogin/owners" className="rounded-xl border border-blue-200 bg-blue-50 p-4 hover:bg-blue-100 transition">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-blue-600" />
                            <div>
                                <p className="font-bold text-sm text-blue-800">{pendingOwners} Owner Applications</p>
                                <p className="text-xs text-blue-600">Owners awaiting approval</p>
                            </div>
                        </div>
                    </Link>
                )}
                <Link href="/moezlogin/articles" className="rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                        <Newspaper className="w-5 h-5 text-gray-600" />
                        <div>
                            <p className="font-bold text-sm text-gray-800">Write Article</p>
                            <p className="text-xs text-gray-500">Create food trends content</p>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    )
}

