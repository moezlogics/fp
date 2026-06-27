import { Restaurant } from "../models/Restaurant";
import { RestaurantSubscription, RestaurantSubscriptionPlanSlug } from "../models/RestaurantSubscription";

export const OWNER_PLAN_DEFINITIONS = [
    {
        slug: "prime" as RestaurantSubscriptionPlanSlug,
        name: "Prime Branch",
        pricePaisa: 29900,
        durationMonths: 1,
        description: "Unlock Prime placement perks for a single branch.",
        features: {
            zeroPlatformFee: true,
            primeBadge: true,
            featuredPlacement: false,
            verifiedBadge: false,
            leadBoost: true,
        },
    },
    {
        slug: "featured" as RestaurantSubscriptionPlanSlug,
        name: "Prime Featured",
        pricePaisa: 39900,
        durationMonths: 1,
        description: "Prime perks plus featured ranking and verified blue badge.",
        features: {
            zeroPlatformFee: true,
            primeBadge: true,
            featuredPlacement: true,
            verifiedBadge: true,
            leadBoost: true,
        },
    },
] as const;

export function getOwnerPlanDefinition(planSlug: string) {
    return OWNER_PLAN_DEFINITIONS.find((plan) => plan.slug === planSlug) || null;
}

export async function syncRestaurantSubscriptionState(restaurantId: string) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return null;

    const activeSubscription = await RestaurantSubscription.findOne({
        restaurantId,
        status: { $in: ["Active", "Cancelled"] },
        validTo: { $gt: new Date() },
    })
        .sort({ validTo: -1, createdAt: -1 })
        .lean() as any;

    if (!activeSubscription) {
        if ((restaurant as any).partnerSource === "owner-plan") {
            restaurant.set("bookingSettings.isPrimePartner", false);
            restaurant.set("partnerSource", undefined);
        }

        if ((restaurant as any).featuredSource === "owner-plan") {
            restaurant.set("isFeatured", false);
            restaurant.set("featuredSource", undefined);
        }

        if ((restaurant as any).verifiedSource === "owner-plan") {
            restaurant.set("isVerifiedPartner", false);
            restaurant.set("verifiedSource", undefined);
        }

        restaurant.set("ownerSubscriptionTier", undefined);
        restaurant.set("ownerSubscriptionValidTo", undefined);
        await restaurant.save();
        return null;
    }

    restaurant.set("bookingSettings.isPrimePartner", true);
    restaurant.set("partnerSource", "owner-plan");
    restaurant.set("ownerSubscriptionTier", activeSubscription.planSlug);
    restaurant.set("ownerSubscriptionValidTo", activeSubscription.validTo);

    if (activeSubscription.features.featuredPlacement) {
        restaurant.set("isFeatured", true);
        restaurant.set("featuredSource", "owner-plan");
    } else if ((restaurant as any).featuredSource === "owner-plan") {
        restaurant.set("isFeatured", false);
        restaurant.set("featuredSource", undefined);
    }

    if (activeSubscription.features.verifiedBadge) {
        restaurant.set("isVerifiedPartner", true);
        restaurant.set("verifiedSource", "owner-plan");
    } else if ((restaurant as any).verifiedSource === "owner-plan") {
        restaurant.set("isVerifiedPartner", false);
        restaurant.set("verifiedSource", undefined);
    }

    await restaurant.save();
    return activeSubscription;
}
