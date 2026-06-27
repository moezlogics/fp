import { Router, Request, Response } from "express";
import { Article } from "../../models/Article";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

// GET all published articles
router.get("/", async (req: Request, res: Response) => {
    try {
        const isPublished = req.query.isPublished === "true";
        const query = isPublished ? { isPublished: true } : {};
        const articles = await Article.find(query).sort({ createdAt: -1 }).lean();
        successResponse(res, articles);
    } catch (err) {
        errorResponse(res, "Failed to fetch", 500);
    }
});

// GET single article by slug
router.get("/:slug", async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const article = await Article.findOne({ slug, isPublished: true }).lean() as any;
        if (!article) {
            errorResponse(res, "Article not found", 404);
            return;
        }

        // Fetch linked restaurants if any
        let linkedRestaurants: any[] = [];
        if (article.linkedRestaurants?.length) {
            const { Restaurant } = require("../../models/Restaurant");
            linkedRestaurants = await Restaurant.find({
                _id: { $in: article.linkedRestaurants },
                isApproved: true
            }).select("name slug coverImage averageRating city area").lean();
        }

        successResponse(res, { article, linkedRestaurants });
    } catch (err) {
        errorResponse(res, "Failed to fetch article", 500);
    }
});

// POST create new article (Admin)
router.post("/", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const body = req.body;
        // Generate safe slug: user input OR auto-generated from title
        const baseSlug = (body.slug || body.title).toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").substring(0, 80);
        const slug = baseSlug || "article";
        const article = await Article.create({ ...body, slug, publishedAt: body.isPublished ? new Date() : undefined });
        successResponse(res, article, 201);
    } catch (err: any) {
        if (err.code === 11000) {
            errorResponse(res, "Article with this title already exists", 409);
        } else {
            errorResponse(res, "Failed to create", 500);
        }
    }
});

// PUT update article (Admin)
router.put("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const body = req.body;

        // Handle custom slug update if provided
        if (body.slug) {
            body.slug = body.slug.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").substring(0, 80);
            if (!body.slug) body.slug = "article";
        }

        if (body.isPublished && !body.publishedAt) body.publishedAt = new Date();
        const updated = await Article.findByIdAndUpdate(id, body, { new: true });
        if (!updated) {
            errorResponse(res, "Not found", 404);
            return;
        }
        successResponse(res, updated);
    } catch (err: any) {
        if (err.code === 11000) {
            errorResponse(res, "An article with this slug already exists", 409);
        } else {
            errorResponse(res, "Failed to update", 500);
        }
    }
});

// DELETE article (Admin)
router.delete("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await Article.findByIdAndDelete(id);
        successResponse(res, { success: true });
    } catch (err) {
        errorResponse(res, "Failed to delete", 500);
    }
});

export default router;
