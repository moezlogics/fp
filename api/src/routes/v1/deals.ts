/**
 * Deals Routes � /api/v1/deals
 *
 * CRUD for restaurant-level bank deals and promotional offers.
 * Owners create deals linking their restaurant to specific banks/card types.
 * The booking system uses these to show available discounts.
 *
 * Routes:
 *  GET    /restaurant/:restaurantId � Owner/Admin: list restaurant deals
 *  POST   /                         � Owner/Admin: create deal
 *  PUT    /:id                      � Owner/Admin: update deal
 *  DELETE /:id                      � Owner/Admin: delete deal
 *  GET    /                         � Public: all deals
 *  GET    /city/:city               � Public: deals by city
 *  GET    /city/:city/bank/:bankSlug � Public: bank-specific deals by city
 */

import { Router, Request, Response } from "express";
import { Deal } from "../../models/Deal";
import { Restaurant } from "../../models/Restaurant";
import { City } from "../../models/City";
import { Bank } from "../../models/Bank";
import { SeoPage } from "../../models/SeoPage";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";
import {
    ensureAllBankSlugs,
    escapeRegex,
    slugifyBankValue,
} from "../../utils/bank-slug";

const router = Router();

function buildCityMatchFilter(cityDoc: any) {
    const cityNameRegex = new RegExp(`^${escapeRegex(cityDoc.name)}$`, "i");
    const citySlugRegex = new RegExp(`^${escapeRegex(cityDoc.slug)}$`, "i");

    return {
        isApproved: true,
        isActive: true,
        $or: [{ city: cityNameRegex }, { city: citySlugRegex }],
    };
}

async function resolveCity(cityParam: string) {
    const decoded = decodeURIComponent(cityParam || "").trim().toLowerCase();
    if (!decoded) return null;

    const cityBySlug = await City.findOne({ slug: decoded }).lean();
    if (cityBySlug) return cityBySlug;

    return City.findOne({ name: { $regex: new RegExp(`^${escapeRegex(decoded)}$`, "i") } }).lean();
}

/**
 * GET /api/v1/deals/restaurant/:restaurantId
 * Protected: admin, owner
 */
router.get(
    "/restaurant/:restaurantId",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const { restaurantId } = req.params;

            // Verify ownership for owners
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Not found or not yours", 403);
                    return;
                }
            }

            const deals = await Deal.find({ restaurantId })
                .sort({ createdAt: -1 })
                .populate("bankId", "name color logoUrl cardTypes slug")
                .lean();
            successResponse(res, deals);
        } catch (err) {
            console.error("[DEALS] GET restaurant deals error:", err);
            errorResponse(res, "Failed to fetch deals", 500);
        }
    }
);

/**
 * POST /api/v1/deals
 * Protected: admin, owner
 */
router.post(
    "/",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const body = req.body;
            if (!body.restaurantId) {
                errorResponse(res, "Missing restaurantId", 400);
                return;
            }

            if (!body.discountPercent || body.discountPercent < 1 || body.discountPercent > 100) {
                errorResponse(res, "discountPercent must be between 1 and 100", 400);
                return;
            }

            // Verify ownership for owners
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: body.restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Not found or not yours", 403);
                    return;
                }
            }

            const deal = await Deal.create({
                restaurantId: body.restaurantId,
                bankId: body.bankId || null,
                cardTypes: body.cardTypes || [],
                discountPercent: body.discountPercent,
                maxDiscountCapPaisa: body.maxDiscountCapPaisa || 0,
                minSpendPaisa: body.minSpendPaisa || 0,
                daysValid: body.daysValid || [],
                applicableOn: body.applicableOn || "both",
                description: body.description || "",
                validFrom: body.validFrom || undefined,
                validTo: body.validTo || undefined,
                isActive: body.isActive !== false,
            });

            // Populate bank details before returning
            const populated = await Deal.findById(deal._id)
                .populate("bankId", "name color logoUrl cardTypes slug")
                .lean();

            successResponse(res, populated, 201);
        } catch (err: any) {
            console.error("[DEALS] POST create error:", err);
            errorResponse(res, "Creation failed due to an internal error.", 500);
        }
    }
);

/**
 * PUT /api/v1/deals/:id
 * Protected: admin, owner
 */
router.put(
    "/:id",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const body = req.body;

            const deal = await Deal.findById(id);
            if (!deal) {
                errorResponse(res, "Deal not found", 404);
                return;
            }

            // Verify ownership for owners
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: deal.restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Unauthorized", 403);
                    return;
                }
            }

            // Whitelist of updatable fields
            const allowed = [
                "bankId", "cardTypes", "discountPercent", "maxDiscountCapPaisa",
                "minSpendPaisa", "daysValid", "applicableOn", "description",
                "validFrom", "validTo", "isActive",
            ];
            for (const key of allowed) {
                if (body[key] !== undefined) {
                    (deal as any)[key] = body[key];
                }
            }

            await deal.save();

            const populated = await Deal.findById(deal._id)
                .populate("bankId", "name color logoUrl cardTypes slug")
                .lean();

            successResponse(res, populated);
        } catch (err: any) {
            console.error("[DEALS] PUT update error:", err);
            errorResponse(res, "Update failed due to an internal error.", 500);
        }
    }
);

/**
 * GET /api/v1/deals
 * Public: Get all active deals
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        const deals = await Deal.find({ isActive: true, bankId: { $ne: null } })
            .sort({ createdAt: -1 })
            .populate("restaurantId", "name slug city area coverImage logo brandName")
            .populate("bankId", "name color logoUrl slug")
            .lean();
        successResponse(res, deals);
    } catch (err) {
        errorResponse(res, "Failed to fetch deals", 500);
    }
});

/**
 * GET /api/v1/deals/city/:city
 * Public: Get deals by city with all referenced models + seoPage
 */
router.get("/city/:city", async (req: Request, res: Response) => {
    try {
        const city = String(req.params.city || "");

        await ensureAllBankSlugs();

        const cityDoc = (await resolveCity(city)) as any;
        if (!cityDoc) {
            errorResponse(res, "City not found", 404);
            return;
        }

        const banks = await Bank.find({ isActive: true }).sort({ order: 1 }).lean();

        const cityRestaurants = await Restaurant.find(buildCityMatchFilter(cityDoc))
            .select("_id name slug coverImage logo area brandName averageRating priceRange cuisines city location openingHours isVerifiedPartner isFeatured bookingSettings")
            .lean();

        const restIds = cityRestaurants.map((r: any) => r._id);
        const deals = await Deal.find({
            restaurantId: { $in: restIds },
            isActive: true,
            bankId: { $ne: null },
        })
            .sort({ discountPercent: -1, createdAt: -1 })
            .populate("bankId", "name color logoUrl slug")
            .lean();

        const seoPage = await SeoPage.findOne({
            combinationSlug: `${cityDoc.slug}/deals`,
            isPublished: true,
        }).lean();

        successResponse(res, {
            cityDoc,
            banks,
            cityRestaurants,
            deals,
            seoPage,
            combinationSlug: `${cityDoc.slug}/deals`,
        });
    } catch (err) {
        errorResponse(res, "Failed to fetch deals", 500);
    }
});

/**
 * GET /api/v1/deals/city/:city/bank/:bankSlug
 * Public: Get specific bank deals by city
 */
router.get("/city/:city/bank/:bankSlug", async (req: Request, res: Response) => {
    try {
        const city = String(req.params.city || "");
        const bankSlug = String(req.params.bankSlug || "");

        await ensureAllBankSlugs();

        const cityDoc = (await resolveCity(city)) as any;
        if (!cityDoc) {
            errorResponse(res, "City not found", 404);
            return;
        }

        const requestedSlug = slugifyBankValue(decodeURIComponent(bankSlug || ""));

        let bankDoc = (await Bank.findOne({
            slug: requestedSlug,
            isActive: true,
        }).lean()) as any;

        if (!bankDoc) {
            const nameLike = requestedSlug.replace(/-/g, " ");
            bankDoc = (await Bank.findOne({
                isActive: true,
                name: { $regex: new RegExp(escapeRegex(nameLike), "i") },
            }).lean()) as any;
        }

        if (!bankDoc) {
            const allActiveBanks = (await Bank.find({ isActive: true }).select("name slug color logoUrl cardTypes").lean()) as any[];
            bankDoc = allActiveBanks.find((bank) => slugifyBankValue(bank.slug || bank.name) === requestedSlug) || null;
        }

        if (!bankDoc) {
            errorResponse(res, "Bank not found", 404);
            return;
        }

        const canonicalBankSlug = bankDoc.slug || slugifyBankValue(bankDoc.name);

        const cityRestaurants = await Restaurant.find(buildCityMatchFilter(cityDoc))
            .select("_id name slug coverImage logo area brandName averageRating priceRange cuisines city location openingHours isVerifiedPartner isFeatured bookingSettings")
            .lean();
        const restIds = cityRestaurants.map((r: any) => r._id);

        const deals = await Deal.find({
            bankId: bankDoc._id,
            restaurantId: { $in: restIds },
            isActive: true,
        })
            .sort({ discountPercent: -1, createdAt: -1 })
            .populate("bankId", "name color logoUrl slug")
            .lean();

        const combinationSlug = `${cityDoc.slug}/deals/${canonicalBankSlug}`;
        const seoPage = await SeoPage.findOne({
            combinationSlug,
            isPublished: true,
        }).lean();

        successResponse(res, {
            cityDoc,
            bankDoc,
            canonicalBankSlug,
            cityRestaurants,
            deals,
            seoPage,
            combinationSlug,
        });
    } catch (err) {
        errorResponse(res, "Failed to fetch deals", 500);
    }
});

/**
 * DELETE /api/v1/deals/:id
 * Protected: admin, owner
 */
router.delete("/:id", authenticate, authorize("admin", "owner"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (req.user!.role === "owner") {
            const deal = await Deal.findById(id);
            if (!deal) {
                errorResponse(res, "Not found", 404);
                return;
            }
            const rest = await Restaurant.findOne({ _id: deal.restaurantId, ownerId: req.user!.id });
            if (!rest) {
                errorResponse(res, "Unauthorized", 403);
                return;
            }
        }

        await Deal.findByIdAndDelete(id);
        successResponse(res, { success: true });
    } catch (err) {
        errorResponse(res, "Failed to delete", 500);
    }
});

export default router;


