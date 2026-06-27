/**
 * Restaurant Routes — /api/v1/restaurants
 *
 * GET /               — List restaurants (public, paginated, filterable)
 * GET /:slug          — Get restaurant by slug (public)
 * GET /id/:id         — Get restaurant by ID (private, for owner dashboard)
 * POST /              — Create restaurant (admin/owner)
 * PUT /:id            — Update restaurant (admin/owner)
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Restaurant } from "../../models/Restaurant";
import Media from "../../models/Media";

import { YieldRule } from "../../models/YieldRule";
import { Deal } from "../../models/Deal";
import { Voucher } from "../../models/Voucher";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
    successResponse,
    errorResponse,
    paginatedResponse,
} from "../../utils/api-response";
import { withRedisCache, invalidateCache } from "../../utils/redis-cache";
import { toggleFollowRestaurant, checkFollowStatus } from "../../controllers/RestaurantFollowController";
import crypto from "crypto";

const router = Router();
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
 * GET /api/v1/restaurants
 * Query: ?city=lahore&cuisine=bbq&page=1&limit=20&sort=rating
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const {
            city,
            cuisine,
            vibe,
            priceRange,
            search,
            page = "1",
            limit = "20",
            sort = "-averageRating",
            featured,
        } = req.query;

        const filter: any = { isApproved: true, isActive: true };

        if (city) filter.city = new RegExp(city as string, "i");
        if (cuisine) filter.cuisines = { $in: [(cuisine as string)] };
        if (vibe) filter.vibes = { $in: [(vibe as string)] };
        if (priceRange) filter.priceRange = parseInt(priceRange as string, 10);
        if (featured === "true") filter.isFeatured = true;
        if (search) {
            filter.$or = [
                { name: new RegExp(search as string, "i") },
                { brandName: new RegExp(search as string, "i") },
                { cuisines: new RegExp(search as string, "i") },
            ];
        }

        const cacheKey = `rests:list:${crypto.createHash("md5").update(JSON.stringify(req.query)).digest("hex")}`;
        const cacheTTL = 300; // 5 minutes

        const pageInt = Math.max(1, parseInt(page as string, 10));
        const limitInt = Math.min(50, Math.max(1, parseInt(limit as string, 10)));

        const { restaurants, total } = await withRedisCache(cacheKey, cacheTTL, async () => {
            const skip = (pageInt - 1) * limitInt;

            const sortField = (sort as string) || "-averageRating";
            const sortDir = sortField.startsWith("-") ? -1 : 1;
            const sortKey = sortField.replace(/^-/, "");
            const compoundSort: Record<string, number> = { isFeatured: -1, [sortKey]: sortDir };

            const [resList, resTotal] = await Promise.all([
                Restaurant.find(filter)
                    .select("-menuImages -galleryImages -specialOverrides")
                    .sort(compoundSort as any)
                    .skip(skip)
                    .limit(limitInt)
                    .lean(),
                Restaurant.countDocuments(filter),
            ]);

            return { restaurants: resList, total: resTotal };
        });

        // Enrich with discount summary metadata for cards and detail views
        const restaurantIds = (restaurants as any[]).map((r: any) => r._id);
        const now = new Date();
        const [discountAgg, bankDealAgg] = await Promise.all([
            YieldRule.aggregate([
                {
                    $match: {
                        restaurantId: { $in: restaurantIds },
                        isActive: true,
                        validFrom: { $lte: now },
                        validTo: { $gte: now },
                    }
                },
                { $group: { _id: "$restaurantId", maxDiscount: { $max: "$discountPercent" } } }
            ]),
            Deal.aggregate([
                {
                    $match: {
                        restaurantId: { $in: restaurantIds },
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
                { $group: { _id: "$restaurantId", maxDiscount: { $max: "$discountPercent" } } },
            ]),
        ]);

        const discountMap = new Map<string, number>();
        const bankDiscountMap = new Map<string, number>();
        for (const d of discountAgg) discountMap.set(d._id.toString(), d.maxDiscount);
        for (const d of bankDealAgg) bankDiscountMap.set(d._id.toString(), d.maxDiscount);

        const enriched = (restaurants as any[]).map((r: any) => {
            const yieldDiscount = discountMap.get(r._id.toString()) || 0;
            const isPrime = r.bookingSettings?.isPrimePartner || false;
            const bankDiscount = bankDiscountMap.get(r._id.toString()) || 0;
            return {
                ...r,
                maxDiscountPercent: yieldDiscount,
                yieldDiscountPercent: yieldDiscount,
                primeDiscountPercent: isPrime ? PRIME_PARTNER_DISCOUNT_PERCENT : 0,
                bankDiscountPercent: bankDiscount,
                discountLabel: buildDiscountSummary(yieldDiscount, isPrime, bankDiscount) || null,
            };
        });

        paginatedResponse(res, enriched, total, pageInt, limitInt);
    } catch (err) {
        console.error("[Restaurants] List error:", err);
        errorResponse(res, "Failed to fetch restaurants.", 500);
    }
});

/**
 * GET /api/v1/restaurants/admin
 * Protected: admin only
 * Query: ?search=monal&status=all|approved|pending|rejected&page=1&limit=20
 * Returns ALL restaurants regardless of approval/active status
 */
router.get(
    "/admin",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const search = (req.query.search as string) || "";
            const status = (req.query.status as string) || "all";
            const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || "20", 10)));
            const skip = (page - 1) * limit;

            const filter: any = {};

            // Search by name, brandName, branchName, city, area
            if (search) {
                const regex = new RegExp(search, "i");
                filter.$or = [
                    { name: regex },
                    { brandName: regex },
                    { branchName: regex },
                    { city: regex },
                    { area: regex },
                    { areas: regex },
                    { slug: regex },
                ];
            }

            // Status filter
            if (status === "approved") {
                filter.isApproved = true;
            } else if (status === "pending") {
                filter.isApproved = false;
            } else if (status === "rejected") {
                filter.isApproved = false;
                filter.isActive = false;
            }
            // "all" → no filter on approval/active

            const [restaurants, total] = await Promise.all([
                Restaurant.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Restaurant.countDocuments(filter),
            ]);

            successResponse(res, {
                restaurants,
                total,
                pages: Math.ceil(total / limit),
            });
        } catch (err) {
            console.error("[Restaurants] Admin list error:", err);
            errorResponse(res, "Failed to fetch restaurants for admin.", 500);
        }
    }
);

import { Review } from "../../models/Review";

// ... existing code ...
import { TableInventory } from "../../models/TableInventory";

/**
 * PATCH /api/v1/restaurants/update-all-dates
 * Admin only — bulk-updates updatedAt on every restaurant in one DB call.
 * Zero ordering changes (no sort field touched), no per-document round-trips.
 */
router.patch(
    "/update-all-dates",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const now = new Date();
            const result = await Restaurant.updateMany(
                {},
                { $set: { updatedAt: now } },
                { timestamps: false }   // bypass Mongoose auto-ts so we control the value
            );
            successResponse(res, {
                updated: result.modifiedCount,
                date: now.toISOString(),
            });
        } catch (err) {
            console.error("[Restaurants] update-all-dates error:", err);
            errorResponse(res, "Failed to update restaurant dates.", 500);
        }
    }
);

/**
 * GET /api/v1/restaurants/nearby
 * Query: ?lat=31.5&lng=74.3&maxDistance=10000&limit=10
 * Falls back to Haversine if no 2dsphere index exists
 */
router.get("/nearby", async (req: Request, res: Response) => {
    try {
        const { lat, lng } = req.query;
        const maxDistanceStr = req.query.maxDistance as string || "10000";
        const limitStr = req.query.limit as string || "10";

        if (!lat || !lng) {
            errorResponse(res, "Missing lat/lng coordinates", 400);
            return;
        }

        const userLat = parseFloat(lat as string);
        const userLng = parseFloat(lng as string);
        const maxDistance = parseInt(maxDistanceStr, 10); // meters
        const limit = Math.min(50, Math.max(1, parseInt(limitStr, 10)));

        let restaurants: any[] = [];

        // Try GeoJSON $near first (requires 2dsphere index)
        try {
            restaurants = await Restaurant.find({
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [userLng, userLat] },
                        $maxDistance: maxDistance,
                    },
                },
                isApproved: true,
                isActive: true,
            })
                .limit(limit)
                .lean();
        } catch {
            // Fallback: Haversine manual calculation using lat/lng fields
            const allRestaurants = await Restaurant.find({
                isApproved: true,
                isActive: true,
                latitude: { $exists: true, $ne: null },
                longitude: { $exists: true, $ne: null },
            })
                .select("-menuImages -galleryImages")
                .lean();

            // Calculate distances using Haversine formula
            const R = 6371000; // Earth radius in meters
            const toRad = (d: number) => (d * Math.PI) / 180;

            restaurants = allRestaurants
                .map((r: any) => {
                    const dLat = toRad(r.latitude - userLat);
                    const dLng = toRad(r.longitude - userLng);
                    const a = Math.sin(dLat / 2) ** 2 +
                        Math.cos(toRad(userLat)) * Math.cos(toRad(r.latitude)) * Math.sin(dLng / 2) ** 2;
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const distance = R * c;
                    return { ...r, distance };
                })
                .filter((r: any) => r.distance <= maxDistance)
                .sort((a: any, b: any) => a.distance - b.distance)
                .slice(0, limit);
        }

        successResponse(res, restaurants);
    } catch (error: any) {
        console.error("Nearby API Error:", error);
        errorResponse(res, "Failed to fetch nearby restaurants", 500);
    }
});

/**
 * POST /api/v1/restaurants/:id/follow
 * Toggle follow/unfollow for a restaurant
 */
router.post("/:id/follow", authenticate, toggleFollowRestaurant);

/**
 * GET /api/v1/restaurants/:id/follow-status
 * Check if the current user follows this restaurant
 */
router.get("/:id/follow-status", authenticate, checkFollowStatus);

/**
 * GET /api/v1/restaurants/:slug/slots
 * Query: ?date=YYYY-MM-DD&pax=4
 */
router.get("/:slug/slots", async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const dateStr = req.query.date as string;
        const paxStr = req.query.pax as string || "2";
        const pax = parseInt(paxStr, 10);

        if (!dateStr) {
            errorResponse(res, "date query parameter is required (YYYY-MM-DD)", 400);
            return;
        }

        // Find restaurant
        const restaurant = await Restaurant.findOne({
            slug,
            isApproved: true,
            isActive: true,
        })
            .select("_id name brandName branchName city area priceRange")
            .lean();

        if (!restaurant) {
            errorResponse(res, "Restaurant not found", 404);
            return;
        }

        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);

        // Fetch all slots for this date
        const slots = await TableInventory.find({
            restaurantId: (restaurant as any)._id,
            date,
            isBlocked: false,
        })
            .sort({ timeSlot: 1 })
            .lean();

        // Filter to only slots with enough remaining capacity
        const availableSlots = slots
            .map((slot: any) => {
                const available = slot.maxCovers - slot.bookedCovers - slot.heldCovers;
                return {
                    _id: slot._id,
                    timeSlot: slot.timeSlot,
                    maxCovers: slot.maxCovers,
                    bookedCovers: slot.bookedCovers,
                    heldCovers: slot.heldCovers,
                    availableCovers: Math.max(0, available),
                    discountPercent: slot.discountPercent,
                    occupancyPercent: Math.round(
                        ((slot.bookedCovers + slot.heldCovers) / slot.maxCovers) * 100
                    ),
                    isAvailable: available >= pax,
                };
            })
            .filter((s) => s.availableCovers > 0);

        // Fetch any active bank deals for this restaurant
        const bankDeals = await Deal.find({
            restaurantId: (restaurant as any)._id,
            isActive: true,
        })
            .populate("bankId", "name color logoUrl slug")
            .lean();

        successResponse(res, {
            restaurant,
            date: dateStr,
            pax,
            slots: availableSlots,
            bankDeals: bankDeals.map((d: any) => ({
                bankName: d.bankId?.name,
                bankColor: d.bankId?.color,
                bankLogo: d.bankId?.logoUrl,
                discountPercent: d.discountPercent,
                description: d.description,
                validTill: d.validTill,
            })),
        });
    } catch (err: any) {
        console.error("Slots API error:", err);
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * GET /api/v1/restaurants/:slug
 * Aggregates restaurant details, reviews, deals, and similar spots.
 */
router.get("/:slug", async (req: Request, res: Response) => {
    try {
        const cacheKey = `rest:slug:${req.params.slug}`;
        const cacheTTL = 3600; // 1 hour

        const data = await withRedisCache(cacheKey, cacheTTL, async () => {
            const restaurant = await Restaurant.findOne({
                slug: req.params.slug,
                isApproved: true,
                isActive: true,
            }).lean() as any;

            if (!restaurant) return null;

            // Retrieve altText for coverImage and galleryImages from Media collection
            const imageUrls = [
                restaurant.coverImage,
                ...(restaurant.galleryImages || []).map((img: any) => typeof img === "string" ? img : img.url)
            ].filter(Boolean);

            const mediaDocs = await Media.find({ url: { $in: imageUrls } })
                .select("url altText")
                .lean();

            const altTextMap = new Map<string, string>();
            for (const doc of mediaDocs) {
                if (doc.altText) {
                    altTextMap.set(doc.url, doc.altText);
                }
            }

            // Enrich restaurant with altTexts
            restaurant.coverImageAlt = altTextMap.get(restaurant.coverImage) || "";
            restaurant.galleryImages = (restaurant.galleryImages || []).map((img: any) => {
                const imgUrl = typeof img === "string" ? img : img.url;
                return {
                    url: imgUrl,
                    category: img.category || "Food",
                    altText: altTextMap.get(imgUrl) || "",
                };
            });

            // Fetch related metadata
            const [reviews, deals, otherBranches, similarRestaurants, yieldRules, vouchers] = await Promise.all([
                Review.find({ restaurantId: restaurant._id, isVisible: true })
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .populate("userId", "name avatar username")
                    .populate("replies.userId", "name avatar username")
                    .lean(),
                Deal.find({ restaurantId: restaurant._id, isActive: true })
                    .populate("bankId", "name color logoUrl")
                    .lean(),
                Restaurant.find({ brandName: restaurant.brandName, _id: { $ne: restaurant._id }, isApproved: true })
                    .select("name slug branchName area city")
                    .lean(),
                Restaurant.find({ city: restaurant.city, _id: { $ne: restaurant._id }, isApproved: true, isActive: true })
                    .sort({ averageRating: -1 })
                    .limit(6)
                    .select("name slug brandName branchName coverImage averageRating totalReviews area cuisines priceRange logo bookingSettings isFeatured isVerifiedPartner openingHours")
                    .lean(),
                YieldRule.find({
                    restaurantId: restaurant._id,
                    isActive: true,
                    validFrom: { $lte: new Date() },
                    validTo: { $gte: new Date() },
                }).sort({ priority: -1 }).lean(),
                Voucher.find({
                    restaurantId: restaurant._id,
                    isActive: true,
                    validTo: { $gte: new Date() }
                }).sort({ createdAt: -1 }).lean(),
            ]);

            // Compute discount info
            const maxYieldDiscount = (yieldRules as any[]).reduce((max, r) => Math.max(max, (r as any).discountPercent), 0);
            const isPrime = restaurant.bookingSettings?.isPrimePartner || false;
            const maxBankDiscount = (deals as any[])
                .filter((deal: any) => !!deal.bankId && deal.isActive !== false)
                .reduce((max, deal: any) => Math.max(max, deal.discountPercent || 0), 0);

            // Enrich similar restaurants
            const similarIds = (similarRestaurants as any[]).map((s: any) => s._id);
            const [similarDiscountAgg, similarBankAgg] = await Promise.all([
                YieldRule.aggregate([
                    {
                        $match: {
                            restaurantId: { $in: similarIds },
                            isActive: true,
                            validFrom: { $lte: new Date() },
                            validTo: { $gte: new Date() },
                        }
                    },
                    { $group: { _id: "$restaurantId", maxDiscount: { $max: "$discountPercent" } } }
                ]),
                Deal.aggregate([
                    {
                        $match: { restaurantId: { $in: similarIds }, isActive: true, bankId: { $ne: null } }
                    },
                    { $group: { _id: "$restaurantId", maxDiscount: { $max: "$discountPercent" } } }
                ]),
            ]);
            const simDiscountMap = new Map<string, number>();
            const simBankMap = new Map<string, number>();
            for (const d of similarDiscountAgg) simDiscountMap.set(d._id.toString(), d.maxDiscount);
            for (const d of similarBankAgg) simBankMap.set(d._id.toString(), d.maxDiscount);

            const enrichedSimilar = (similarRestaurants as any[]).map((r: any) => {
                const yd = simDiscountMap.get(r._id.toString()) || 0;
                const ip = r.bookingSettings?.isPrimePartner || false;
                const bd = simBankMap.get(r._id.toString()) || 0;
                return {
                    ...r,
                    maxDiscountPercent: yd,
                    yieldDiscountPercent: yd,
                    primeDiscountPercent: ip ? PRIME_PARTNER_DISCOUNT_PERCENT : 0,
                    bankDiscountPercent: bd,
                    discountLabel: buildDiscountSummary(yd, ip, bd) || null,
                };
            });

            return {
                restaurant: {
                    ...restaurant,
                    maxDiscountPercent: maxYieldDiscount,
                    yieldDiscountPercent: maxYieldDiscount,
                    primeDiscountPercent: isPrime ? PRIME_PARTNER_DISCOUNT_PERCENT : 0,
                    bankDiscountPercent: maxBankDiscount,
                    discountLabel: buildDiscountSummary(maxYieldDiscount, isPrime, maxBankDiscount) || null,
                },
                reviews,
                deals,
                otherBranches,
                similarRestaurants: enrichedSimilar,
                activeYieldRules: (yieldRules as any[]).map((r: any) => ({
                    name: r.name,
                    timeSlotStart: r.timeSlotStart,
                    timeSlotEnd: r.timeSlotEnd,
                    discountPercent: r.discountPercent,
                    daysOfWeek: r.daysOfWeek,
                })),
                vouchers,
            };
        });

        if (!data) {
            errorResponse(res, "Restaurant not found.", 404);
            return;
        }

        // Increment view count (fire and forget)
        Restaurant.updateOne(
            { slug: req.params.slug },
            { $inc: { viewCount: 1 } }
        ).exec();

        successResponse(res, data);
    } catch (err) {
        console.error("[Restaurants] Get by slug error:", err);
        errorResponse(res, "Failed to fetch restaurant details.", 500);
    }
});

/**
 * GET /api/v1/restaurants/id/:id
 * Protected: admin or the owning owner
 */
router.get(
    "/id/:id",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const restaurant = await Restaurant.findById(req.params.id).lean();

            if (!restaurant) {
                errorResponse(res, "Restaurant not found.", 404);
                return;
            }

            // Only admin or the owner can see unapproved restaurants
            if (
                req.user!.role !== "admin" &&
                (restaurant as any).ownerId?.toString() !== req.user!.id
            ) {
                errorResponse(res, "Access denied.", 403);
                return;
            }

            successResponse(res, restaurant);
        } catch (err) {
            errorResponse(res, "Failed to fetch restaurant.", 500);
        }
    }
);

/**
 * GET /api/v1/restaurants/owner/my
 * Protected: owner, admin
 * Returns all branches for the logged-in owner (including unapproved).
 */
router.get(
    "/owner/my",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const ownerId = req.query.ownerId || req.user!.id;

            // If an owner tries to query another owner's restaurants, deny unless admin
            if (req.user!.role === "owner" && ownerId !== req.user!.id) {
                errorResponse(res, "Access denied.", 403);
                return;
            }

            const branches = await Restaurant.find({ ownerId })
                .sort({ isHeadOffice: -1, createdAt: 1 })
                .lean();

            successResponse(res, branches);
        } catch (err) {
            console.error("[Restaurants] Get my branches error:", err);
            errorResponse(res, "Failed to fetch branches.", 500);
        }
    }
);

/**
 * GET /api/v1/restaurants/check-name
 * Public: Check if a brand name is available in a given city
 * Query: ?brandName=Monal&city=Lahore&ownerId=xxx
 */
router.get("/check-name", async (req: Request, res: Response) => {
    try {
        const { brandName, city, ownerId } = req.query;
        if (!brandName || !city) {
            successResponse(res, { available: true });
            return;
        }

        const escaped = (brandName as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const query: any = {
            brandName: { $regex: new RegExp(`^${escaped}$`, "i") },
            city: city as string,
        };
        if (ownerId) query.ownerId = { $ne: ownerId };

        const existing = await Restaurant.findOne(query).lean();
        successResponse(res, { available: !existing });
    } catch {
        successResponse(res, { available: true }); // Fail open
    }
});

/**
 * POST /api/v1/restaurants
 * Protected: admin, owner
 *
 * Slug Strategy:
 *   - Single/Main Branch: slug = "brand-name"          → /lahore/monal/
 *   - Named Branch:       slug = "brand-name-branch"   → /lahore/monal-dha/
 *   - Collision:          slug = "brand-name-2"         → fallback suffix
 */
router.post(
    "/",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const data = req.body;

            if (!data.brandName || !data.city) {
                errorResponse(res, "Brand name and city are required.", 400);
                return;
            }

            // ── Brand name uniqueness per city (different owner) ──
            const existingBrand = await Restaurant.findOne({
                brandName: { $regex: new RegExp(`^${data.brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
                city: data.city,
                ownerId: { $ne: req.user!.role === "owner" ? req.user!.id : data.ownerId },
            }).lean();

            if (existingBrand) {
                errorResponse(res, `A restaurant named "${data.brandName}" already exists in ${data.city}. Please choose a different name.`, 409);
                return;
            }

            // ── SEO-optimized slug generation ──
            const slugify = (str: string) =>
                str.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, "")
                    .replace(/\s+/g, "-")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "");

            const brandSlug = slugify(data.brandName);
            const branchName = (data.branchName || "").trim();
            const isMainBranch = !branchName || branchName.toLowerCase() === "main branch";

            // Single/Main branch → just the brand name
            // Named branch → brand-branchname
            let baseSlug = isMainBranch
                ? brandSlug
                : `${brandSlug}-${slugify(branchName)}`;

            // If admin provides a custom slug, override the baseSlug
            if (req.user!.role === "admin" && data.slug && data.slug.trim() !== "") {
                baseSlug = slugify(data.slug.trim());
            }

            // Ensure slug uniqueness (append -2, -3 only if collision)
            let finalSlug = baseSlug;
            let counter = 1;
            while (await Restaurant.findOne({ slug: finalSlug }).lean()) {
                counter++;
                finalSlug = `${baseSlug}-${counter}`;
            }
            data.slug = finalSlug;

            // Auto-generate display name
            data.name = isMainBranch
                ? data.brandName
                : `${data.brandName} — ${branchName}`;

            // Set owner
            if (req.user!.role === "owner") {
                data.ownerId = req.user!.id;
            }

            // Check if this is the first branch (head office)
            if (data.ownerId && data.brandName) {
                const existingBranches = await Restaurant.countDocuments({ ownerId: data.ownerId, brandName: data.brandName });
                data.isHeadOffice = existingBranches === 0;
            }

            // ── Hash Branch Access PIN if provided ──
            if (data.branchAccessPin) {
                if (typeof data.branchAccessPin !== "string" || !/^\d{4}$/.test(data.branchAccessPin)) {
                    errorResponse(res, "Branch Access PIN must be exactly 4 digits.", 400);
                    return;
                }
                data.branchAccessPin = await bcrypt.hash(data.branchAccessPin, 12);
            }

            const restaurant = await Restaurant.create(data);
            successResponse(res, restaurant, 201);
        } catch (err: any) {
            if (err.code === 11000) {
                errorResponse(res, "A restaurant with this slug already exists.", 409);
                return;
            }
            console.error("[Restaurants] Create error:", err);
            errorResponse(res, "Failed to create restaurant.", 500);
        }
    }
);



/**
 * PUT /api/v1/restaurants/:id
 * Protected: admin, or the owning owner
 */
router.put(
    "/:id",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const restaurant = await Restaurant.findById(req.params.id);
            if (!restaurant) {
                errorResponse(res, "Restaurant not found.", 404);
                return;
            }

            // Owner can only update their own restaurants
            if (
                req.user!.role === "owner" &&
                restaurant.ownerId?.toString() !== req.user!.id
            ) {
                errorResponse(res, "You can only update your own restaurants.", 403);
                return;
            }

            // Prevent owners from changing sensitive fields
            const ownerBlockedFields = [
                "isApproved", "isFeatured", "platformCommissionRate",
                "ownerId", "slug", "viewCount",
            ];
            if (req.user!.role === "owner") {
                for (const field of ownerBlockedFields) {
                    delete req.body[field];
                }
            }

            // ── Recompute Name if Brand or Branch changes ──
            if (req.body.brandName || req.body.branchName !== undefined) {
                const updatedBrandName = req.body.brandName || restaurant.brandName;
                const updatedBranchName = req.body.branchName !== undefined ? req.body.branchName : restaurant.branchName;
                const branchNameTrimmed = (updatedBranchName || "").trim();
                const isMainBranch = !branchNameTrimmed || branchNameTrimmed.toLowerCase() === "main branch";
                req.body.name = isMainBranch
                    ? updatedBrandName
                    : `${updatedBrandName} — ${branchNameTrimmed}`;
            }

            // ── SEO-optimized slug generation for Admin edits ──
            const slugify = (str: string) =>
                str.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, "")
                    .replace(/\s+/g, "-")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "");

            // If an admin provides a new explicit slug
            if (req.user!.role === "admin" && req.body.slug && req.body.slug.trim() !== "") {
                const newBaseSlug = slugify(req.body.slug.trim());
                if (newBaseSlug !== restaurant.slug) {
                    let finalSlug = newBaseSlug;
                    let counter = 1;
                    // Check collision excluding the current restaurant
                    while (await Restaurant.findOne({ slug: finalSlug, _id: { $ne: restaurant._id } }).lean()) {
                        counter++;
                        finalSlug = `${newBaseSlug}-${counter}`;
                    }
                    req.body.slug = finalSlug;
                } else {
                    delete req.body.slug; // Unchanged, ignore it
                }
            } else {
                delete req.body.slug; // Do not touch slug unless explicitly requested
            }

            Object.assign(restaurant, req.body);
            await restaurant.save();

            // Invalidate cache
            await invalidateCache(`rest:slug:${restaurant.slug}`);

            successResponse(res, restaurant);
        } catch (err) {
            console.error("[Restaurants] Update error:", err);
            errorResponse(res, "Failed to update restaurant.", 500);
        }
    }
);

/**
 * DELETE /api/v1/restaurants/:id
 * Protected: admin, or the owning owner
 */
router.delete(
    "/:id",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const restaurant = await Restaurant.findById(req.params.id);
            if (!restaurant) {
                errorResponse(res, "Restaurant not found.", 404);
                return;
            }

            if (
                req.user!.role === "owner" &&
                restaurant.ownerId?.toString() !== req.user!.id
            ) {
                errorResponse(res, "Access denied.", 403);
                return;
            }

            const slugToInvalidate = restaurant.slug;
            await Restaurant.findByIdAndDelete(req.params.id);
            
            // Invalidate cache after deletion
            if (slugToInvalidate) {
                await invalidateCache(`rest:slug:${slugToInvalidate}`);
            }

            successResponse(res, { success: true });
        } catch (err) {
            console.error("[Restaurants] Delete error:", err);
            errorResponse(res, "Failed to delete restaurant.", 500);
        }
    }
);


/**
 * POST /api/v1/restaurants/:id/follow
 * Toggle follow / unfollow a restaurant.
 * Protected: authenticated user
 */
router.post("/:id/follow", authenticate, toggleFollowRestaurant);

/**
 * GET /api/v1/restaurants/:id/follow-status
 * Check if the current user follows a restaurant.
 * Protected: authenticated user
 */
router.get("/:id/follow-status", authenticate, checkFollowStatus);

/**
 * GET /api/v1/restaurants/:id/check-name
 * Check if a restaurant name is available in a given city.
 * Query: ?name=X&city=Y
 */
router.get("/check-name", async (req: Request, res: Response) => {
    try {
        const { name, city } = req.query;
        if (!name || !city) {
            errorResponse(res, "Both name and city are required.", 400);
            return;
        }
        const nameStr = (name as string).trim();
        const cityStr = (city as string).trim();
        if (nameStr.length < 2) {
            errorResponse(res, "Name must be at least 2 characters.", 400);
            return;
        }
        const existing = await Restaurant.findOne({
            brandName: { $regex: new RegExp(`^${nameStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
            city: { $regex: new RegExp(`^${cityStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        }).select("_id").lean();
        if (existing) {
            successResponse(res, { available: false, message: `"${nameStr}" is already taken in ${cityStr}.` });
        } else {
            successResponse(res, { available: true, message: "Name is available!" });
        }
    } catch (err) {
        errorResponse(res, "Failed to check name availability.", 500);
    }
});

export default router;
