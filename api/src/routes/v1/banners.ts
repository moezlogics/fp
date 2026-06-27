import { Router, Request, Response } from "express";
import Banner from "../../models/Banner";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

// GET banners — supports ?citySlug=lahore for city-specific filtering
router.get("/", async (req: Request, res: Response) => {
    try {
        const citySlug = req.query.citySlug as string;
        const query: any = { isActive: true };
        if (citySlug) {
            // Return banners for this city OR default banners (no city assigned)
            query.$or = [{ citySlug }, { citySlug: null }, { citySlug: "" }];
        }
        const banners = await Banner.find(query).sort({ order: 1, createdAt: -1 });
        successResponse(res, banners);
    } catch (err) {
        errorResponse(res, "Failed to fetch banners", 500);
    }
});

// POST create new banner (Admin)
router.post("/", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const banner = await Banner.create(body);
        successResponse(res, banner, 201);
    } catch (err) {
        errorResponse(res, "Failed to create banner", 500);
    }
});

// PUT update banner (Admin)
router.put("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const updated = await Banner.findByIdAndUpdate(id, body, { new: true });
        if (!updated) {
            errorResponse(res, "Not found", 404);
            return;
        }
        successResponse(res, updated);
    } catch (err) {
        errorResponse(res, "Failed to update banner", 500);
    }
});

// DELETE banner (Admin)
router.delete("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await Banner.findByIdAndDelete(id);
        successResponse(res, { success: true });
    } catch (err) {
        errorResponse(res, "Failed to delete banner", 500);
    }
});

export default router;
