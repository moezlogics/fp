import { Router, Request, Response } from "express";
import { Category } from "../../models/Category";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";
import { generateSeoPagesForCategory } from "../../utils/seo-page-generator";

const router = Router();

// GET all categories
router.get("/", async (req: Request, res: Response) => {
    try {
        const categories = await Category.find().sort({ order: 1 }).lean();
        successResponse(res, categories);
    } catch (err) {
        errorResponse(res, "Failed to fetch categories", 500);
    }
});

// POST create new category (Admin)
router.post("/", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const slug = body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const category = await Category.create({ ...body, slug });

        // Fire-and-forget: auto-generate SEO pages for all cities × this category + all areas × this category
        generateSeoPagesForCategory({ name: category.name, slug: category.slug }).catch(() => { });

        successResponse(res, category, 201);
    } catch (err: any) {
        if (err.code === 11000) {
            errorResponse(res, "Category already exists", 409);
        } else {
            errorResponse(res, "Failed to create category", 500);
        }
    }
});

// PUT update category (Admin)
router.put("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const body = req.body;
        if (body.name) {
            body.slug = body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        }
        const updated = await Category.findByIdAndUpdate(id, body, { new: true });
        if (!updated) {
            errorResponse(res, "Not found", 404);
            return;
        }
        successResponse(res, updated);
    } catch (err) {
        errorResponse(res, "Failed to update", 500);
    }
});

// DELETE category (Admin)
router.delete("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await Category.findByIdAndDelete(id);
        successResponse(res, { success: true });
    } catch (err) {
        errorResponse(res, "Failed to delete", 500);
    }
});

export default router;
