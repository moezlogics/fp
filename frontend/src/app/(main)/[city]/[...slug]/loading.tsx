import { RestaurantDetailSkeleton } from "@/components/ui/skeletons";

/**
 * [city]/[...slug] Loading — Server Component
 * Shows restaurant detail skeleton for deeper routes.
 * The slug segment is most commonly a restaurant (e.g., /lahore/optp/).
 * Server-rendered for instant paint — no client JS needed.
 */
export default function SlugLoading() {
    return (
        <div className="min-h-screen bg-transparent">
            <RestaurantDetailSkeleton />
        </div>
    );
}
