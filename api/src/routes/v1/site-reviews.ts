import { Router, Request, Response } from "express";
import { SiteReview } from "../../models/SiteReview";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * GET /api/v1/site-reviews/me
 * Protected: Check if current logged-in user has already submitted a review.
 */
router.get("/me", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const existing = await SiteReview.findOne({ userId });
        successResponse(res, { hasReviewed: !!existing });
    } catch (err) {
        errorResponse(res, "Failed to check review status", 500);
    }
});

/**
 * POST /api/v1/site-reviews
 * Public: Submit a site review
 * Flow:
 * - If userId provided: checks if user has EVER reviewed. If yes, blocks.
 * - If guest: checks if IP has reviewed in last 24h. If yes, blocks.
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { rating, phone, message, userId } = req.body;
        const ip = (req.headers["x-forwarded-for"] as string || req.ip || "unknown").split(",")[0].trim();
        const userAgent = req.headers["user-agent"] || "";

        if (!rating || rating < 1 || rating > 5) {
            errorResponse(res, "Rating must be between 1 and 5", 400);
            return;
        }

        // Two-factor duplicate protection
        if (userId) {
            // STRICT protection: User can only review once forever
            const existingUserReview = await SiteReview.findOne({ userId });
            if (existingUserReview) {
                // Grace period: allow updating the message/phone if submitted within the last 1 hour
                // This supports the 2-step UI (emoji clicks auto-submit, then form appends text)
                const ageMs = Date.now() - new Date(existingUserReview.createdAt).getTime();
                if (ageMs < 60 * 60 * 1000) {
                    if (message) existingUserReview.message = message.substring(0, 500);
                    if (phone) existingUserReview.phone = phone.substring(0, 20);
                    // Also update rating if changed in grace period
                    if (rating) {
                        existingUserReview.rating = rating;
                        existingUserReview.originalRating = rating;
                    }
                    await existingUserReview.save();
                    successResponse(res, { _id: existingUserReview._id, rating: existingUserReview.rating }, 200);
                    return;
                }
                errorResponse(res, "You have already submitted a review from this account", 429);
                return;
            }
        } else {
            // GUEST protection: IP allowed once per 24 hours
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const existingIpReview = await SiteReview.findOne({ ip, createdAt: { $gte: cutoff } }).sort({ createdAt: -1 });
            if (existingIpReview) {
                // Grace period: 1 hour for guests too
                const ageMs = Date.now() - new Date(existingIpReview.createdAt).getTime();
                if (ageMs < 60 * 60 * 1000) {
                    if (message) existingIpReview.message = message.substring(0, 500);
                    if (phone) existingIpReview.phone = phone.substring(0, 20);
                    if (rating) {
                        existingIpReview.rating = rating;
                        existingIpReview.originalRating = rating;
                    }
                    await existingIpReview.save();
                    successResponse(res, { _id: existingIpReview._id, rating: existingIpReview.rating }, 200);
                    return;
                }
                errorResponse(res, "You have already submitted a review today", 429);
                return;
            }
        }

        const review = await SiteReview.create({
            userId: userId || null,
            rating,
            phone: (phone || "").substring(0, 20),
            message: (message || "").substring(0, 500),
            ip,
            userAgent: userAgent.substring(0, 300),
            originalRating: rating,
        });

        successResponse(res, { _id: review._id, rating: review.rating }, 201);
    } catch (err) {
        console.error("[SiteReview] Create error:", err);
        errorResponse(res, "Failed to submit review", 500);
    }
});

/**
 * GET /api/v1/site-reviews/stats
 * Public: Aggregate stats for JSON-LD schema
 */
router.get("/stats", async (req: Request, res: Response) => {
    try {
        const [result] = await SiteReview.aggregate([
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 },
                },
            },
        ]);

        successResponse(res, {
            averageRating: result ? Math.round(result.averageRating * 10) / 10 : 4.8,
            totalReviews: result ? result.totalReviews : 0,
        });
    } catch (err) {
        console.error("[SiteReview] Stats error:", err);
        errorResponse(res, "Failed to fetch stats", 500);
    }
});

/**
 * GET /api/v1/site-reviews
 * Admin: List all reviews with pagination
 */
router.get("/", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { page = "1", limit = "30" } = req.query;
        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(100, parseInt(limit as string, 10));

        const [docs, total] = await Promise.all([
            SiteReview.find()
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            SiteReview.countDocuments(),
        ]);

        successResponse(res, { docs, total, page: pageNum, limit: limitNum });
    } catch (err) {
        console.error("[SiteReview] List error:", err);
        errorResponse(res, "Failed to fetch reviews", 500);
    }
});

/**
 * PUT /api/v1/site-reviews/:id
 * Admin: Edit review rating/message
 */
router.put("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { rating, message } = req.body;

        const update: any = { isEdited: true };
        if (rating !== undefined) update.rating = Math.min(5, Math.max(1, parseInt(rating)));
        if (message !== undefined) update.message = message;

        const doc = await SiteReview.findByIdAndUpdate(id, update, { new: true });
        if (!doc) {
            errorResponse(res, "Review not found", 404);
            return;
        }

        successResponse(res, doc);
    } catch (err) {
        console.error("[SiteReview] Update error:", err);
        errorResponse(res, "Failed to update review", 500);
    }
});

/**
 * DELETE /api/v1/site-reviews/:id
 * Admin: Delete review
 */
router.delete("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        await SiteReview.findByIdAndDelete(req.params.id);
        successResponse(res, { success: true });
    } catch (err) {
        errorResponse(res, "Failed to delete review", 500);
    }
});

export default router;
