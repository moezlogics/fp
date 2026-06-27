export type DealsSortOption = "discount" | "rating" | "name";

export interface DealGroup {
    restaurant: any;
    deals: any[];
    bestDiscount: number;
}

export function slugifyBankLabel(value: string): string {
    return String(value || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function getIdString(value: any): string {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && value._id) return String(value._id);
    return String(value);
}

export function getBankSlug(bank: any): string {
    return bank?.slug || slugifyBankLabel(bank?.name || "");
}

export function buildBankDealCounts(deals: any[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const deal of deals || []) {
        const bankId = getIdString(deal?.bankId);
        if (!bankId) continue;
        counts[bankId] = (counts[bankId] || 0) + 1;
    }

    return counts;
}

export function normalizeDealsSort(value: string | undefined): DealsSortOption {
    if (value === "rating" || value === "name") return value;
    return "discount";
}

export function normalizeMinDiscount(value: string | undefined): number {
    const parsed = Number(value || 0);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;

    const allowed = [10, 20, 30, 40, 50, 60, 70, 80];
    const nearest = allowed.find((threshold) => parsed <= threshold);
    return nearest || 80;
}

export function buildDealsFilterQuery(sort: DealsSortOption, minDiscount: number): string {
    const params = new URLSearchParams();
    if (sort && sort !== "discount") {
        params.set("sort", sort);
    }
    if (minDiscount > 0) {
        params.set("minDiscount", String(minDiscount));
    }
    const query = params.toString();
    return query ? `?${query}` : "";
}

export function groupDealsByRestaurant(cityRestaurants: any[], deals: any[]): DealGroup[] {
    const restaurantsById = new Map<string, any>();
    for (const restaurant of cityRestaurants || []) {
        restaurantsById.set(getIdString(restaurant?._id), restaurant);
    }

    const groups = new Map<string, DealGroup>();

    for (const deal of deals || []) {
        const restaurantId = getIdString(deal?.restaurantId);
        const restaurant = restaurantsById.get(restaurantId);
        if (!restaurant) continue;

        if (!groups.has(restaurantId)) {
            groups.set(restaurantId, {
                restaurant,
                deals: [],
                bestDiscount: 0,
            });
        }

        const group = groups.get(restaurantId)!;
        group.deals.push(deal);
        const discount = Number(deal?.discountPercent || 0);
        if (discount > group.bestDiscount) {
            group.bestDiscount = discount;
        }
    }

    return Array.from(groups.values()).map((group) => ({
        ...group,
        deals: [...group.deals].sort(
            (a, b) => Number(b?.discountPercent || 0) - Number(a?.discountPercent || 0),
        ),
    }));
}

export function filterAndSortDealGroups(
    groups: DealGroup[],
    sort: DealsSortOption,
    minDiscount: number,
): DealGroup[] {
    const filtered = groups.filter((group) => group.bestDiscount >= minDiscount);

    const sorted = [...filtered];
    sorted.sort((a, b) => {
        if (sort === "name") {
            const aName = String(a.restaurant?.brandName || a.restaurant?.name || "");
            const bName = String(b.restaurant?.brandName || b.restaurant?.name || "");
            return aName.localeCompare(bName);
        }

        if (sort === "rating") {
            const bRating = Number(b.restaurant?.averageRating || 0);
            const aRating = Number(a.restaurant?.averageRating || 0);
            if (bRating !== aRating) return bRating - aRating;
            return b.bestDiscount - a.bestDiscount;
        }

        if (b.bestDiscount !== a.bestDiscount) return b.bestDiscount - a.bestDiscount;
        const bRating = Number(b.restaurant?.averageRating || 0);
        const aRating = Number(a.restaurant?.averageRating || 0);
        return bRating - aRating;
    });

    return sorted;
}

export function restaurantsFromDealGroups(groups: Array<{ restaurant: any }>): any[] {
    return groups.map((group) => group.restaurant);
}
