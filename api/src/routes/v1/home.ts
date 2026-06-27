import express from "express";
import Banner from "../../models/Banner";
import { Category } from "../../models/Category";
import { City } from "../../models/City";
import { Area } from "../../models/Area";
import { Article } from "../../models/Article";
import { Bank } from "../../models/Bank";
import { Deal } from "../../models/Deal";
import { Restaurant } from "../../models/Restaurant";
import { YieldRule } from "../../models/YieldRule";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = express.Router();
const PRIME_PARTNER_DISCOUNT_PERCENT = 15;

function buildDiscountSummary(yieldDiscountPercent: number, isPrimePartner: boolean, bankDiscountPercent: number) {
    const parts = [
        yieldDiscountPercent,
        isPrimePartner ? PRIME_PARTNER_DISCOUNT_PERCENT : 0,
        bankDiscountPercent,
    ]
        .map((value) => Number(value) || 0)
        .filter((value) => value > 0)
        .sort((a, b) => b - a)
        .map((value) => `${value}%`);

    return parts.join(" + ");
}

/**
 * GET /api/v1/home
 * Unified endpoint for the Web & Mobile App Homepage.
 * Returns aggregated data: banners, categories, areas, articles, banks, deals, and featured restaurants.
 */
router.get("/", async (req, res) => {
    try {
        const citySlug = (req.query.city as string) || "lahore";

        const currentCity = await City.findOne({ slug: citySlug }).lean() as any;
        const cityName = currentCity?.name || "Lahore";

        const [banners, categories, areas, articles, banks, featuredRestaurants, topRatedRestaurants] = await Promise.all([
            Banner.find({ isActive: true }).sort({ order: 1 }).lean(),
            Category.find({ isActive: true }).sort({ order: 1 }).lean(),
            Area.find({ citySlug, isActive: true }).sort({ name: 1 }).lean(),
            Article.find({ isPublished: true }).sort({ publishedAt: -1 }).limit(4).lean(),
            Bank.find({ isActive: true }).sort({ order: 1 }).lean(),
            // Featured in this city
            Restaurant.find({ isApproved: true, isFeatured: true, isActive: true, city: { $regex: new RegExp(`^${cityName}$`, "i") } })
                .sort({ averageRating: -1 })
                .limit(8)
                .lean(),
            // Top Rated in this city (Not featured)
            Restaurant.find({ isApproved: true, isFeatured: false, isActive: true, city: { $regex: new RegExp(`^${cityName}$`, "i") } })
                .sort({ averageRating: -1, reviewCount: -1 })
                .limit(12)
                .lean(),
        ]);

        // Aggregate max discount per bank
        const bankDeals = await Promise.all(
            (banks as any[]).map(async (b: any) => {
                const maxDeal = await Deal.findOne({ bankId: b._id, isActive: true })
                    .sort({ discountPercent: -1 })
                    .lean() as any;
                return { ...b, maxDiscount: maxDeal?.discountPercent || 0 };
            })
        );

        // ── Compute max discount for each restaurant from YieldRules ──
        const allRestaurantIds = [
            ...(featuredRestaurants as any[]).map((r: any) => r._id),
            ...(topRatedRestaurants as any[]).map((r: any) => r._id),
        ];

        const now = new Date();
        const [discountAgg, bankDealAgg] = await Promise.all([
            YieldRule.aggregate([
                {
                    $match: {
                        restaurantId: { $in: allRestaurantIds },
                        isActive: true,
                        validFrom: { $lte: now },
                        validTo: { $gte: now },
                    }
                },
                {
                    $group: {
                        _id: "$restaurantId",
                        maxDiscount: { $max: "$discountPercent" },
                    }
                }
            ]),
            Deal.aggregate([
                {
                    $match: {
                        restaurantId: { $in: allRestaurantIds },
                        isActive: true,
                        bankId: { $ne: null },
                        $or: [
                            { validFrom: { $exists: false } },
                            { validFrom: null },
                            { validFrom: { $lte: now } },
                        ],
                    },
                },
                {
                    $match: {
                        $or: [
                            { validTo: { $exists: false } },
                            { validTo: null },
                            { validTo: { $gte: now } },
                        ],
                    },
                },
                {
                    $group: {
                        _id: "$restaurantId",
                        maxDiscount: { $max: "$discountPercent" },
                    }
                }
            ]),
        ]);

        const discountMap = new Map<string, number>();
        const bankDiscountMap = new Map<string, number>();
        for (const d of discountAgg) {
            discountMap.set(d._id.toString(), d.maxDiscount);
        }
        for (const d of bankDealAgg) {
            bankDiscountMap.set(d._id.toString(), d.maxDiscount);
        }

        // Attach discount + discount source info to restaurants
        const enrichRestaurant = (r: any) => {
            const yieldDiscount = discountMap.get(r._id.toString()) || 0;
            const isPrime = r.bookingSettings?.isPrimePartner || false;
            const bankDiscount = bankDiscountMap.get(r._id.toString()) || 0;
            const maxDiscountPercent = yieldDiscount;

            return {
                ...r,
                maxDiscountPercent,
                yieldDiscountPercent: yieldDiscount,
                primeDiscountPercent: isPrime ? PRIME_PARTNER_DISCOUNT_PERCENT : 0,
                bankDiscountPercent: bankDiscount,
                discountTags: [],
                discountLabel: buildDiscountSummary(yieldDiscount, isPrime, bankDiscount) || null,
            };
        };

        const enrichedFeatured = (featuredRestaurants as any[]).map(enrichRestaurant);
        const enrichedTopRated = (topRatedRestaurants as any[]).map(enrichRestaurant);

        successResponse(res, {
            city: {
                name: cityName,
                slug: citySlug
            },
            banners,
            categories,
            areas,
            articles,
            bankDeals,
            featuredRestaurants: enrichedFeatured,
            topRatedRestaurants: enrichedTopRated,
        });
    } catch (error: any) {
        console.error("Home Aggregation error:", error);
        errorResponse(res, "Failed to fetch homepage data", 500);
    }
});

export default router;
