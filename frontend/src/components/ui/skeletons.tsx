// Skeleton components — pure static JSX, no client APIs needed

/**
 * Homepage Skeleton — matches actual layout: Banner → Category Icons → Cards grid
 */
export function HomepageSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 pt-2 pb-24 md:pb-12 space-y-4 animate-pulse">
            {/* Hero Banner */}
            <div className="rounded-xl overflow-hidden shadow-md h-48 md:h-80 lg:h-96 bg-gray-200" />

            {/* Quick Category Icons */}
            <div className="flex overflow-x-auto gap-2.5 md:gap-4 pb-1 hide-scrollbar md:justify-center">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-14 md:w-18">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl" />
                        <div className="h-2 bg-gray-100 rounded w-10" />
                    </div>
                ))}
            </div>

            {/* Nearby Section Header */}
            <div className="space-y-1">
                <div className="h-2 bg-gray-100 rounded w-16" />
                <div className="h-5 bg-gray-200 rounded w-44" />
            </div>

            {/* Nearby Horizontal Scroll */}
            <div className="flex overflow-hidden gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="min-w-[200px] md:min-w-[240px] rounded-xl overflow-hidden border border-gray-100 bg-white shrink-0">
                        <div className="h-28 sm:h-32 bg-gray-200" />
                        <div className="p-3 pt-6 space-y-2">
                            <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                            <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                            <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                                <div className="h-2.5 bg-gray-100 rounded w-14" />
                                <div className="h-6 w-14 bg-primary/10 rounded-md" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Best of City Section */}
            <div className="space-y-1">
                <div className="h-2 bg-gray-100 rounded w-14" />
                <div className="flex justify-between items-end">
                    <div className="h-5 bg-gray-200 rounded w-36" />
                    <div className="h-3 bg-primary/10 rounded w-12" />
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                    <RestaurantCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

/**
 * Restaurant Card Skeleton — matches real RestaurantCard layout with overlapping logo
 */
export function RestaurantCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse flex flex-col h-full">
            {/* Cover image */}
            <div className="h-28 sm:h-32 bg-gray-100 relative">
                {/* Featured badge placeholder */}
                <div className="absolute top-2.5 left-2.5 h-4 w-16 bg-white/30 rounded-md" />
            </div>
            {/* Card body with overlapping logo */}
            <div className="relative px-3 pb-3 pt-6 flex-1 flex flex-col justify-between">
                {/* Overlapping logo circle */}
                <div className="absolute -top-5 left-3 w-10 h-10 rounded-full border-2 border-white bg-gray-100 shadow-sm" />
                
                <div className="space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                        <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 w-8 bg-gray-50 rounded" />
                    </div>
                    <div className="h-2.5 bg-gray-50 rounded w-1/2" />
                </div>

                <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-50">
                    <div className="h-2.5 bg-gray-50 rounded w-16" />
                    <div className="h-6 w-14 bg-primary/5 rounded-md" />
                </div>
            </div>
        </div>
    );
}

/**
 * Archive Page Skeleton — matches the sidebar + grid layout
 */
export function ArchivePageSkeleton() {
    return (
        <div className="animate-pulse bg-gray-50 min-h-screen">
            {/* Map/Banner Placeholder (Top - Desktop Only) */}
            <div className="bg-gray-200 h-48 w-full border-b hidden lg:block" />

            {/* Breadcrumb bar */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-2.5 flex items-center gap-2">
                    <div className="h-3 w-10 bg-gray-200 rounded" />
                    <div className="h-3 w-3 bg-gray-100 rounded" />
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                    <div className="h-3 w-3 bg-gray-100 rounded" />
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                </div>
            </div>

            {/* Header */}
            <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                        <div className="h-6 bg-gray-200 rounded w-56" />
                        <div className="h-3 bg-gray-100 rounded w-28" />
                    </div>
                    <div className="h-8 w-20 bg-gray-100 rounded-lg hidden md:block" />
                </div>
            </div>

            {/* Content: Sidebar + Grid */}
            <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-3 flex gap-4">
                {/* Sidebar (desktop) */}
                <aside className="w-[220px] hidden lg:block flex-shrink-0 space-y-3">
                    <div className="bg-white rounded-xl border p-3 space-y-2.5">
                        <div className="h-3 bg-gray-200 rounded w-16" />
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-7 bg-gray-50 rounded-lg" />
                        ))}
                    </div>
                    <div className="bg-white rounded-xl border p-3 space-y-2.5">
                        <div className="h-3 bg-gray-200 rounded w-12" />
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-7 bg-gray-50 rounded-lg" />
                        ))}
                    </div>
                </aside>

                {/* Grid */}
                <div className="flex-1">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <RestaurantCardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Restaurant Detail Skeleton — matches gallery → header → tabs → booking widget
 */
export function RestaurantDetailSkeleton() {
    return (
        <div className="bg-gray-50 min-h-screen animate-pulse pb-20 md:pb-8">
            {/* Gallery */}
            <div className="md:max-w-7xl md:mx-auto md:px-6 md:pt-6">
                <div className="h-[200px] md:h-[420px] bg-gray-200 md:rounded-xl" />
            </div>

            <div className="max-w-7xl mx-auto px-3 md:px-6">
                {/* Profile Header with overlapping logo */}
                <div className="relative px-1 md:px-2 md:-mt-10 z-20 mb-4 pt-2 md:pt-0">
                    <div className="flex items-start md:items-end gap-2.5 md:gap-4">
                        {/* Round Logo */}
                        <div className="size-[85px] md:size-28 rounded-full border-[3px] border-white bg-gray-200 shadow-lg -mt-7 md:mt-0 shrink-0" />
                        {/* Name + Meta */}
                        <div className="flex-1 min-w-0 pt-2 md:pt-0 pb-0.5 space-y-2">
                            <div className="h-6 bg-gray-200 rounded w-48" />
                            <div className="h-3 bg-gray-100 rounded w-32" />
                            <div className="flex gap-2">
                                <div className="h-4 w-16 bg-gray-100 rounded-full" />
                                <div className="h-4 w-12 bg-green-100 rounded-full" />
                                <div className="h-4 w-20 bg-gray-100 rounded-full" />
                            </div>
                            <div className="h-3 bg-gray-100 rounded w-4/5 mt-2" />
                            <div className="h-3 bg-gray-100 rounded w-3/5" />
                        </div>
                    </div>
                </div>

                {/* Tabs + Booking Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Tab buttons */}
                        <div className="flex gap-2 border-b pb-3">
                            {["Overview", "Menu", "Reviews", "About"].map((t) => (
                                <div key={t} className="h-9 w-20 bg-gray-100 rounded-lg" />
                            ))}
                        </div>
                        {/* Tab content placeholder */}
                        <div className="bg-white rounded-xl border p-4 space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-32" />
                            <div className="h-3 bg-gray-100 rounded w-full" />
                            <div className="h-3 bg-gray-100 rounded w-5/6" />
                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                        </div>
                        <div className="bg-white rounded-xl border p-4 space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-24" />
                            <div className="h-32 bg-gray-100 rounded-lg" />
                        </div>
                    </div>

                    {/* RIGHT SIDEBAR — Booking Widget */}
                    <div className="hidden lg:block">
                        <div className="sticky top-20 bg-white rounded-xl border p-4 space-y-3">
                            <div className="h-5 bg-gray-200 rounded w-36" />
                            <div className="h-10 bg-gray-100 rounded-lg" />
                            <div className="h-10 bg-gray-100 rounded-lg" />
                            <div className="h-10 bg-gray-100 rounded-lg" />
                            <div className="h-12 bg-primary/20 rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Legacy PageSkeleton alias — used only by the (main)/loading.tsx
 */
export function PageSkeleton() {
    return <HomepageSkeleton />;
}
