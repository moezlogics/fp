import { Router, Request, Response } from "express";
import { Area } from "../../models/Area";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";
import { generateSeoPagesForArea } from "../../utils/seo-page-generator";

const router = Router();

// GET all areas
router.get("/", async (req: Request, res: Response) => {
    try {
        const citySlug = req.query.citySlug as string;

        const query: any = {};
        if (citySlug) query.citySlug = citySlug;

        const areas = await Area.find(query).sort({ name: 1 }).lean();
        successResponse(res, areas);
    } catch (err) {
        errorResponse(res, "Failed to fetch areas", 500);
    }
});

// POST create new area (Admin)
router.post("/", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const slug = body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const area = await Area.create({ ...body, slug });

        // Fire-and-forget: auto-generate SEO pages for this area × all categories
        generateSeoPagesForArea({ name: area.name, slug: area.slug, citySlug: area.citySlug }).catch(() => { });

        successResponse(res, area, 201);
    } catch (err: any) {
        if (err.code === 11000) {
            errorResponse(res, "Area already exists in this city", 409);
        } else {
            errorResponse(res, "Failed to create area", 500);
        }
    }
});

// PUT update area (Admin)
router.put("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const body = req.body;
        if (body.name) {
            body.slug = body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        }
        const updated = await Area.findByIdAndUpdate(id, body, { new: true });
        if (!updated) {
            errorResponse(res, "Area not found", 404);
            return;
        }
        successResponse(res, updated);
    } catch (err) {
        errorResponse(res, "Failed to update area", 500);
    }
});

// DELETE area (Admin)
router.delete("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await Area.findByIdAndDelete(id);
        successResponse(res, { success: true });
    } catch (err) {
        errorResponse(res, "Failed to delete area", 500);
    }
});

export default router;
