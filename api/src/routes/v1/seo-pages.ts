import { Router, Request, Response } from "express";
import { SeoPage } from "../../models/SeoPage";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";
import { regenerateAllSeoPages } from "../../utils/seo-page-generator";

const router = Router();

/**
 * GET /api/v1/seo-pages
 * List all SEO pages, filterable by type, citySlug
 * Public: Used by frontend to fetch content for combo pages
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const { type, citySlug, page = "1", limit = "50" } = req.query;
        const query: any = {};
        if (type) query.type = type;
        if (citySlug) query.citySlug = citySlug;

        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(200, parseInt(limit as string, 10));

        const [docs, total] = await Promise.all([
            SeoPage.find(query)
                .sort({ type: 1, citySlug: 1, areaSlug: 1, categorySlug: 1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            SeoPage.countDocuments(query),
        ]);

        successResponse(res, { docs, total, page: pageNum, limit: limitNum });
    } catch (err) {
        console.error("[SeoPages] List error:", err);
        errorResponse(res, "Failed to fetch SEO pages", 500);
    }
});

/**
 * GET /api/v1/seo-pages/by-slug/:combinationSlug
 * Public: Get a single SEO page by its combination slug
 * Used by frontend [city]/[tag] page to get custom meta + content
 */
router.get("/by-slug/*", async (req: Request, res: Response) => {
    try {
        // Extract everything after /by-slug/
        const combinationSlug = req.params[0];
        if (!combinationSlug) {
            errorResponse(res, "Slug required", 400);
            return;
        }

        const doc = await SeoPage.findOne({ combinationSlug, isPublished: true }).lean();
        successResponse(res, doc);
    } catch (err) {
        console.error("[SeoPages] By-slug error:", err);
        errorResponse(res, "Failed to fetch SEO page", 500);
    }
});

/**
 * PUT /api/v1/seo-pages/:id
 * Admin: Update title, metaDescription, content
 */
router.put("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, metaDescription, content, featuredImage, isPublished } = req.body;

        const update: any = { isCustomized: true };
        if (title !== undefined) update.title = title;
        if (metaDescription !== undefined) update.metaDescription = metaDescription;
        if (content !== undefined) update.content = content;
        if (featuredImage !== undefined) update.featuredImage = featuredImage;
        if (isPublished !== undefined) update.isPublished = isPublished;

        const doc = await SeoPage.findByIdAndUpdate(id, update, { new: true });
        if (!doc) {
            errorResponse(res, "SEO page not found", 404);
            return;
        }

        successResponse(res, doc);
    } catch (err) {
        console.error("[SeoPages] Update error:", err);
        errorResponse(res, "Failed to update SEO page", 500);
    }
});

/**
 * POST /api/v1/seo-pages/bulk-touch
 * Admin: Update all SEO pages' timestamps (lastmod refresh)
 */
router.post("/bulk-touch", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const result = await SeoPage.updateMany({}, { $set: { updatedAt: new Date() } });
        successResponse(res, { message: `Updated ${result.modifiedCount} pages`, count: result.modifiedCount });
    } catch (err) {
        console.error("[SeoPages] Bulk-touch error:", err);
        errorResponse(res, "Failed to update dates", 500);
    }
});

/**
 * POST /api/v1/seo-pages/regenerate
 * Admin: Regenerate all missing combinations
 * This never overwrites existing customized pages
 */
router.post("/regenerate", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const count = await regenerateAllSeoPages();
        successResponse(res, { message: `Processed ${count} combinations`, count });
    } catch (err) {
        console.error("[SeoPages] Regenerate error:", err);
        errorResponse(res, "Failed to regenerate", 500);
    }
});

export default router;
