import mongoose from "mongoose";
import { Router, Request, Response, NextFunction } from "express";
import { Review } from "../../models/Review";
import { Restaurant } from "../../models/Restaurant";
import { Reservation } from "../../models/Reservation";
import { User } from "../../models/User";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";
import { sendNewReviewEmail } from "../../services/email-service";
import { redis } from "../../config/redis";
import { createContentHash, validateGeneratedText, validateGuestName } from "../../utils/content-moderation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = Router();
const REVIEW_RATE_LIMIT_WINDOW_SECONDS = 3600;
const REVIEW_MAX_PER_WINDOW = 4;
const REPLY_RATE_LIMIT_WINDOW_SECONDS = 1800;
const REPLY_MAX_PER_WINDOW = 12;
const DUPLICATE_REVIEW_TTL_SECONDS = 6 * 60 * 60;
const DUPLICATE_REPLY_TTL_SECONDS = 15 * 60;

function getActorKey(req: Request, userId?: string) {
    if (userId) return `user:${userId}`;
    const forwarded = req.headers["x-forwarded-for"];
    const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
    const deviceId = req.headers["x-device-id"] || req.cookies?.deviceId;
    return deviceId ? `device:${deviceId}` : `guest:${forwardedIp || req.ip || "unknown"}`;
}

async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
    const currentCount = await redis.get(key);
    if (currentCount && parseInt(currentCount, 10) >= limit) {
        return false;
    }

    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    await pipeline.exec();
    return true;
}

function sanitizePhotoUrls(photos: unknown): string[] {
    if (!Array.isArray(photos)) return [];

    return photos
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => {
            try {
                const parsed = new URL(item);
                return (parsed.protocol === "https:" || parsed.protocol === "http:") && item.length <= 2048;
            } catch {
                return false;
            }
        })
        .slice(0, 4);
}

const optionalAuth = async (req: Request, response: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        try {
            return authenticate(req, response, next);
        } catch {
            // Ignore auth errors for guest submissions.
        }
    }
    next();
};

/**
 * GET /api/v1/reviews?restaurantId=xxx&page=1
 * Fetches reviews for a restaurant with pagination.
 * Strips emails for regular users. Shows them for the branch owner/admins.
 */
router.get("/", optionalAuth as any, async (req: Request, res: Response) => {
    try {
        const restaurantId = req.query.restaurantId as string;
        const page = parseInt((req.query.page as string) || "1", 10);
        const limit = 10;

        if (!restaurantId) {
            errorResponse(res, "restaurantId is required.", 400);
            return;
        }

        const isAdmin = req.user?.role === "admin";
        
        // Find if user is owner of THIS restaurant
        let isOwner = false;
        if (req.user?.role === "owner") {
            const rest = await Restaurant.findById(restaurantId).select("ownerId");
            if (rest && rest.ownerId?.toString() === req.user.id) {
                isOwner = true;
            }
        }

        const canSeeEmails = isAdmin || isOwner;

        const [reviewsData, total] = await Promise.all([
            Review.find({ restaurantId, isVisible: true })
                .sort({ isVerifiedDiner: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("userId", "name avatar username foodieLevel" + (canSeeEmails ? " email phone" : ""))
                .populate("replies.userId", "name avatar username")
                .lean(),
            Review.countDocuments({ restaurantId, isVisible: true }),
        ]);

        let reviews = reviewsData as any[];
        
        // If not authorized, proactively strip guest email just in case
        if (!canSeeEmails) {
            reviews = reviews.map(r => {
                const { guestEmail, ...rest } = r;
                if (rest.replies) {
                    rest.replies = rest.replies.map((rep: any) => {
                        const { guestEmail: repEmail, ...repRest } = rep;
                        return repRest;
                    });
                }
                return rest;
            });
        }

        successResponse(res, {
            reviews,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch {
        errorResponse(res, "Failed to fetch reviews.", 500);
    }
});

/**
 * POST /api/v1/reviews
 * Creates a review. Both logged-in users and guests can review.
 * Logged-in users can attach photos; guests are text-only.
 */
router.post("/", optionalAuth as any, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { restaurantId, foodRating, ambianceRating, serviceRating, text, photos, guestName, guestEmail } = req.body;
        const actorKey = getActorKey(req, userId);

        if (!restaurantId || !foodRating || !ambianceRating || !serviceRating || !text) {
            errorResponse(res, "All rating fields and review text are required.", 400);
            return;
        }

        const allowedByRateLimit = await enforceRateLimit(
            `review_rate:${actorKey}`,
            REVIEW_MAX_PER_WINDOW,
            REVIEW_RATE_LIMIT_WINDOW_SECONDS
        );
        if (!allowedByRateLimit) {
            errorResponse(res, "Too many review attempts. Please try again later.", 429);
            return;
        }

        for (const rating of [foodRating, ambianceRating, serviceRating]) {
            if (typeof rating !== "number" || rating < 1 || rating > 5) {
                errorResponse(res, "Ratings must be between 1 and 5.", 400);
                return;
            }
        }

        const validatedText = validateGeneratedText(text, {
            fieldLabel: "Review",
            minLength: 10,
            maxLength: 2000,
        });
        if (validatedText.error || !validatedText.cleanText) {
            errorResponse(res, validatedText.error || "Invalid review text.", 400);
            return;
        }

        let cleanGuestName: string | undefined;
        let cleanGuestEmail: string | undefined;
        if (!userId) {
            const validatedGuestName = validateGuestName(guestName);
            if (validatedGuestName.error || !validatedGuestName.cleanName) {
                errorResponse(res, validatedGuestName.error || "Please enter your name to post a review.", 400);
                return;
            }
            cleanGuestName = validatedGuestName.cleanName;
            
            if (!guestEmail || !EMAIL_REGEX.test(guestEmail)) {
                errorResponse(res, "Please provide a valid email address.", 400);
                return;
            }
            cleanGuestEmail = guestEmail.trim().toLowerCase();
        }

        const cleanPhotos = sanitizePhotoUrls(photos);
        if (!userId && cleanPhotos.length > 0) {
            errorResponse(res, "Only logged-in users can upload review photos.", 403);
            return;
        }

        const duplicateReviewKey = `review_dup:${restaurantId}:${actorKey}:${createContentHash(validatedText.cleanText)}`;
        if (await redis.get(duplicateReviewKey)) {
            errorResponse(res, "This review looks duplicated. Please wait before posting it again.", 409);
            return;
        }

        if (userId) {
            const existingReview = await Review.findOne({ userId, restaurantId });
            if (existingReview) {
                errorResponse(res, "You have already reviewed this restaurant.", 409);
                return;
            }
        } else {
            // Guest check: Use IP or DeviceId to prevent multiple reviews
            const deviceId = req.headers["x-device-id"] || req.cookies?.deviceId;
            const guestQuery: any = { restaurantId, userId: { $exists: false } };
            
            if (deviceId) {
                guestQuery.deviceId = deviceId;
            } else {
                const forwarded = req.headers["x-forwarded-for"];
                guestQuery.ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0] || req.ip || "unknown";
            }

            const existingGuestReview = await Review.findOne(guestQuery);
            if (existingGuestReview) {
                errorResponse(res, "Guests are limited to one review per restaurant to ensure fairness.", 409);
                return;
            }
        }

        let isVerifiedDiner = false;
        if (userId) {
            const completedReservation = await Reservation.findOne({
                userId,
                restaurantId,
                status: "Completed",
            });
            isVerifiedDiner = !!completedReservation;
        }

        const overallRating = Math.round(((foodRating + ambianceRating + serviceRating) / 3) * 10) / 10;

        const review = await Review.create({
            restaurantId,
            userId: userId || undefined,
            deviceId: userId ? undefined : (req.headers["x-device-id"] || req.cookies?.deviceId),
            ip: userId ? undefined : (Array.isArray(req.headers["x-forwarded-for"]) ? req.headers["x-forwarded-for"][0] : req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || "unknown"),
            guestName: userId ? undefined : cleanGuestName,
            guestEmail: userId ? undefined : cleanGuestEmail,
            foodRating,
            ambianceRating,
            serviceRating,
            overallRating,
            text: validatedText.cleanText,
            photos: cleanPhotos,
            isVerified: !!userId,
            isVerifiedDiner,
            replies: [],
        });

        await redis.set(duplicateReviewKey, "1", "EX", DUPLICATE_REVIEW_TTL_SECONDS);

        try {
            const restaurant = await Restaurant.findById(restaurantId).select("ownerId brandName branchName slug email").lean() as any;
            if (restaurant) {
                let recipientEmail = restaurant.email;
                if (!recipientEmail && restaurant.ownerId) {
                    const owner = await User.findById(restaurant.ownerId).select("email").lean() as any;
                    recipientEmail = owner?.email;
                }
                
                if (recipientEmail) {
                    const restaurantName = `${restaurant.brandName} - ${restaurant.branchName || "Main Branch"}`;
                    const restaurantUrl = `${process.env.FRONTEND_URL || "https://foodiespakistan.pk"}/${restaurant.slug}`;
                    await sendNewReviewEmail(recipientEmail, restaurantName, restaurantUrl, overallRating, validatedText.cleanText);
                }
            }
        } catch (emailErr) {
            console.error("[Reviews] Email notification failed:", emailErr);
        }

        try {
            const restObjectId = new mongoose.Types.ObjectId(restaurantId);
            const stats = await Review.aggregate([
                { $match: { restaurantId: restObjectId, isVisible: true } },
                {
                    $group: {
                        _id: "$restaurantId",
                        avgOverall: { $avg: "$overallRating" },
                        avgFood: { $avg: "$foodRating" },
                        avgAmbiance: { $avg: "$ambianceRating" },
                        avgService: { $avg: "$serviceRating" },
                        count: { $sum: 1 },
                    },
                },
            ]);

            if (stats.length > 0) {
                await Restaurant.findByIdAndUpdate(restaurantId, {
                    averageRating: Math.round(stats[0].avgOverall * 10) / 10,
                    avgFoodRating: Math.round(stats[0].avgFood * 10) / 10,
                    avgAmbianceRating: Math.round(stats[0].avgAmbiance * 10) / 10,
                    avgServiceRating: Math.round(stats[0].avgService * 10) / 10,
                    totalReviews: stats[0].count,
                });
            } else {
                await Restaurant.findByIdAndUpdate(restaurantId, {
                    averageRating: overallRating,
                    avgFoodRating: foodRating,
                    avgAmbianceRating: ambianceRating,
                    avgServiceRating: serviceRating,
                    totalReviews: 1,
                });
            }
        } catch (statsErr) {
            console.error("[Reviews] Failed to recalculate restaurant ratings:", statsErr);
        }

        successResponse(
            res,
            {
                review: {
                    id: review._id,
                    overallRating: review.overallRating,
                    isVerified: review.isVerified,
                    isVerifiedDiner: review.isVerifiedDiner,
                },
            },
            201
        );
    } catch (error) {
        console.error("[Reviews] Create error:", error);
        errorResponse(res, "Failed to submit review.", 500);
    }
});

/**
 * POST /api/v1/reviews/:id/reply
 * Anyone (logged-in or guest) can reply.
 */
router.post("/:id/reply", optionalAuth as any, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { text, guestName, guestEmail } = req.body;
        const userId = req.user?.id;
        const actorKey = getActorKey(req, userId);

        const allowedByRateLimit = await enforceRateLimit(
            `reply_rate:${actorKey}`,
            REPLY_MAX_PER_WINDOW,
            REPLY_RATE_LIMIT_WINDOW_SECONDS
        );
        if (!allowedByRateLimit) {
            errorResponse(res, "Too many replies in a short time. Please try again later.", 429);
            return;
        }

        const validatedReply = validateGeneratedText(text, {
            fieldLabel: "Reply",
            minLength: 2,
            maxLength: 1000,
        });
        if (validatedReply.error || !validatedReply.cleanText) {
            errorResponse(res, validatedReply.error || "Reply cannot be empty.", 400);
            return;
        }

        let cleanGuestName: string | undefined;
        let cleanGuestEmail: string | undefined;
        if (!userId) {
            const validatedGuestName = validateGuestName(guestName);
            if (validatedGuestName.error || !validatedGuestName.cleanName) {
                errorResponse(res, validatedGuestName.error || "Please enter your name to reply.", 400);
                return;
            }
            cleanGuestName = validatedGuestName.cleanName;
            
            if (!guestEmail || !EMAIL_REGEX.test(guestEmail)) {
                errorResponse(res, "Please provide a valid email address.", 400);
                return;
            }
            cleanGuestEmail = guestEmail.trim().toLowerCase();
        }

        const duplicateReplyKey = `reply_dup:${id}:${actorKey}:${createContentHash(validatedReply.cleanText)}`;
        if (await redis.get(duplicateReplyKey)) {
            errorResponse(res, "This reply looks duplicated. Please wait before sending it again.", 409);
            return;
        }

        const reply = {
            userId: userId || undefined,
            guestName: userId ? undefined : cleanGuestName,
            guestEmail: userId ? undefined : cleanGuestEmail,
            text: validatedReply.cleanText,
            isVerified: !!userId,
            createdAt: new Date(),
        };

        const updated = await Review.findByIdAndUpdate(
            id,
            {
                $push: { replies: reply },
            },
            { new: true }
        )
            .populate("userId", "name avatar username")
            .populate("replies.userId", "name avatar username");

        if (!updated) {
            errorResponse(res, "Review not found", 404);
            return;
        }

        await redis.set(duplicateReplyKey, "1", "EX", DUPLICATE_REPLY_TTL_SECONDS);

        try {
            const restaurant = await Restaurant.findById(updated.restaurantId).select("ownerId brandName branchName slug email").lean() as any;
            if (restaurant) {
                let recipientEmail = restaurant.email;
                if (!recipientEmail && restaurant.ownerId) {
                    const owner = await User.findById(restaurant.ownerId).select("email").lean() as any;
                    recipientEmail = owner?.email;
                }
                
                if (recipientEmail) {
                    const restaurantName = `${restaurant.brandName} - ${restaurant.branchName || "Main Branch"}`;
                    const restaurantUrl = `${process.env.FRONTEND_URL || "https://foodiespakistan.pk"}/${restaurant.slug}`;
                    await sendNewReviewEmail(recipientEmail, restaurantName, restaurantUrl, 0, `Reply: ${validatedReply.cleanText}`);
                }
            }
        } catch (emailErr) {
            console.error("[Reviews] Reply email notification failed:", emailErr);
        }

        successResponse(res, updated);
    } catch (error) {
        console.error("[Reviews] Reply error:", error);
        errorResponse(res, "Failed to reply", 500);
    }
});

/**
 * POST /api/v1/reviews/:id/owner-reply
 * Owner reply to a review (single reply, stored as ownerReply field)
 */
router.post("/:id/owner-reply", authenticate, authorize("owner", "admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { ownerReply } = req.body;

        const validatedReply = validateGeneratedText(ownerReply, {
            fieldLabel: "Reply",
            minLength: 2,
            maxLength: 1000,
        });
        if (validatedReply.error || !validatedReply.cleanText) {
            errorResponse(res, validatedReply.error || "Reply cannot be empty", 400);
            return;
        }

        const updated = await Review.findByIdAndUpdate(
            id,
            {
                ownerReply: validatedReply.cleanText,
                ownerReplyDate: new Date(),
            },
            { new: true }
        );

        if (!updated) {
            errorResponse(res, "Review not found", 404);
            return;
        }

        successResponse(res, updated);
    } catch {
        errorResponse(res, "Failed to reply", 500);
    }
});

/**
 * POST /api/v1/reviews/recalculate-ratings
 * Admin-only: Recalculates averageRating, totalReviews, and per-category ratings
 * for ALL restaurants from their visible reviews.
 */
router.post("/recalculate-ratings", authenticate, authorize("admin"), async (_req: Request, res: Response) => {
    try {
        const stats = await Review.aggregate([
            { $match: { isVisible: true } },
            {
                $group: {
                    _id: "$restaurantId",
                    avgOverall: { $avg: "$overallRating" },
                    avgFood: { $avg: "$foodRating" },
                    avgAmbiance: { $avg: "$ambianceRating" },
                    avgService: { $avg: "$serviceRating" },
                    count: { $sum: 1 },
                },
            },
        ]);

        let updated = 0;
        for (const stat of stats) {
            await Restaurant.findByIdAndUpdate(stat._id, {
                averageRating: Math.round(stat.avgOverall * 10) / 10,
                avgFoodRating: Math.round(stat.avgFood * 10) / 10,
                avgAmbianceRating: Math.round(stat.avgAmbiance * 10) / 10,
                avgServiceRating: Math.round(stat.avgService * 10) / 10,
                totalReviews: stat.count,
            });
            updated++;
        }

        successResponse(res, { message: `Recalculated ratings for ${updated} restaurants.`, updated });
    } catch (error) {
        console.error("[Reviews] Recalculate ratings error:", error);
        errorResponse(res, "Failed to recalculate ratings.", 500);
    }
});

/**
 * GET /api/v1/reviews/admin
 * Admin-only: Fetch all reviews across the platform with pagination and filtering.
 */
router.get("/admin", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const page = parseInt((req.query.page as string) || "1", 10);
        const limit = parseInt((req.query.limit as string) || "20", 10);
        const search = req.query.search as string;
        
        const filter: any = {};
        if (search) {
            filter.$or = [
                { text: { $regex: search, $options: "i" } },
                { guestName: { $regex: search, $options: "i" } },
                { guestEmail: { $regex: search, $options: "i" } }
            ];
        }

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("restaurantId", "brandName branchName")
                .populate("userId", "name email phone")
                .lean(),
            Review.countDocuments(filter),
        ]);

        successResponse(res, {
            reviews,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        errorResponse(res, "Failed to fetch admin reviews.", 500);
    }
});

/**
 * PUT /api/v1/reviews/admin/:id
 * Admin-only: Update review properties (e.g., text, ratings, visibility)
 */
router.put("/admin/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Prevent changing restaurantId or userId
        delete updates.restaurantId;
        delete updates.userId;

        if (updates.text) {
             const validatedText = validateGeneratedText(updates.text, {
                 fieldLabel: "Review",
                 minLength: 10,
                 maxLength: 2000,
             });
             if (validatedText.error || !validatedText.cleanText) {
                 errorResponse(res, validatedText.error || "Invalid review text.", 400);
                 return;
             }
             updates.text = validatedText.cleanText;
        }

        if (updates.foodRating || updates.ambianceRating || updates.serviceRating) {
            // Need overall recalculation
            const existingReview = await Review.findById(id);
            if (!existingReview) {
                errorResponse(res, "Review not found", 404);
                return;
            }
            const f = updates.foodRating || existingReview.foodRating;
            const a = updates.ambianceRating || existingReview.ambianceRating;
            const s = updates.serviceRating || existingReview.serviceRating;
            updates.overallRating = Math.round(((f + a + s) / 3) * 10) / 10;
        }

        const review = await Review.findByIdAndUpdate(id, updates, { new: true });
        if (!review) {
            errorResponse(res, "Review not found", 404);
            return;
        }
        
        if (updates.isVisible !== undefined || updates.overallRating !== undefined) {
             // We need to trigger the recalculation for the specific restaurant
             const restObjectId = new mongoose.Types.ObjectId(review.restaurantId);
             const stats = await Review.aggregate([
                 { $match: { restaurantId: restObjectId, isVisible: true } },
                 {
                     $group: {
                         _id: "$restaurantId",
                         avgOverall: { $avg: "$overallRating" },
                         avgFood: { $avg: "$foodRating" },
                         avgAmbiance: { $avg: "$ambianceRating" },
                         avgService: { $avg: "$serviceRating" },
                         count: { $sum: 1 },
                     },
                 },
             ]);
 
             if (stats.length > 0) {
                 await Restaurant.findByIdAndUpdate(review.restaurantId, {
                     averageRating: Math.round(stats[0].avgOverall * 10) / 10,
                     avgFoodRating: Math.round(stats[0].avgFood * 10) / 10,
                     avgAmbianceRating: Math.round(stats[0].avgAmbiance * 10) / 10,
                     avgServiceRating: Math.round(stats[0].avgService * 10) / 10,
                     totalReviews: stats[0].count,
                 });
             } else {
                 await Restaurant.findByIdAndUpdate(review.restaurantId, {
                     averageRating: 0,
                     avgFoodRating: 0,
                     avgAmbianceRating: 0,
                     avgServiceRating: 0,
                     totalReviews: 0,
                 });
             }
        }
        
        successResponse(res, review);
    } catch {
        errorResponse(res, "Failed to update review", 500);
    }
});

/**
 * DELETE /api/v1/reviews/admin/:id
 * Admin-only: Delete a review and recalculate overall stats
 */
router.delete("/admin/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const review = await Review.findByIdAndDelete(id);
        if (!review) {
            errorResponse(res, "Review not found", 404);
            return;
        }
        
        // Trigger the recalculation for the specific restaurant
        const restObjectId = new mongoose.Types.ObjectId(review.restaurantId);
        const stats = await Review.aggregate([
            { $match: { restaurantId: restObjectId, isVisible: true } },
            {
                $group: {
                    _id: "$restaurantId",
                    avgOverall: { $avg: "$overallRating" },
                    avgFood: { $avg: "$foodRating" },
                    avgAmbiance: { $avg: "$ambianceRating" },
                    avgService: { $avg: "$serviceRating" },
                    count: { $sum: 1 },
                },
            },
        ]);

        if (stats.length > 0) {
            await Restaurant.findByIdAndUpdate(review.restaurantId, {
                averageRating: Math.round(stats[0].avgOverall * 10) / 10,
                avgFoodRating: Math.round(stats[0].avgFood * 10) / 10,
                avgAmbianceRating: Math.round(stats[0].avgAmbiance * 10) / 10,
                avgServiceRating: Math.round(stats[0].avgService * 10) / 10,
                totalReviews: stats[0].count,
            });
        } else {
            await Restaurant.findByIdAndUpdate(review.restaurantId, {
                averageRating: 0,
                avgFoodRating: 0,
                avgAmbianceRating: 0,
                avgServiceRating: 0,
                totalReviews: 0,
            });
        }

        successResponse(res, { message: "Review deleted successfully" });
    } catch {
        errorResponse(res, "Failed to delete review", 500);
    }
});

export default router;
