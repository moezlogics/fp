import { Router, Request, Response } from "express";
import { User } from "../../models/User";
import { Restaurant } from "../../models/Restaurant";
import { Review } from "../../models/Review";
import bcrypt from "bcryptjs";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse, paginatedResponse } from "../../utils/api-response";

const router = Router();

/**
 * GET /api/v1/users/admin
 * Protected: admin
 * List all users with filtering.
 */
router.get(
    "/admin",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const search = (req.query.search as string) || "";
            const role = (req.query.role as string) || "all";
            const pageNum = parseInt((req.query.page as string) || "1", 10);
            const limitNum = 20;

            const query: any = {};
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { phone: { $regex: search, $options: "i" } }
                ];
            }
            if (role !== "all") query.role = role;

            const skip = (pageNum - 1) * limitNum;

            const [users, total] = await Promise.all([
                User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
                User.countDocuments(query),
            ]);

            paginatedResponse(res, users, total, pageNum, limitNum);
        } catch (err) {
            console.error("[Users] Admin listing error:", err);
            errorResponse(res, "Failed to fetch users", 500);
        }
    }
);

/**
 * PUT /api/v1/users/admin/:id
 * Protected: admin
 * Update user details (e.g., change roles, block users)
 */
router.put(
    "/admin/:id",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Prevent changing password through this route
            delete updates.password;

            const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true }).select("-password").lean();
            if (!updatedUser) {
                errorResponse(res, "User not found", 404);
                return;
            }

            successResponse(res, updatedUser);
        } catch (err) {
            errorResponse(res, "Failed to update user", 500);
        }
    }
);

/**
 * GET /api/v1/users/profile
 * Returns the authenticated user's full profile.
 */
router.get("/profile", authenticate, async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user!.id).select("-password").lean();
        if (!user) {
            errorResponse(res, "User not found", 404);
            return;
        }
        successResponse(res, user);
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * PUT /api/v1/users/profile
 * Updates the authenticated user's profile fields.
 * Body: { name?, phone?, city?, avatar? }
 */
router.put("/profile", authenticate, async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const allowedFields = ["name", "phone", "city", "avatar", "branchType", "username", "bio", "socialLinks", "isPublicProfile", "dietaryPreferences", "favoriteCuisines", "notificationPreferences", "themePreference"];
        const updates: Record<string, any> = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
            }
        }

        // Validate username
        if (updates.username !== undefined) {
            const usernameLower = updates.username.toLowerCase();
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(usernameLower)) {
                errorResponse(res, "Username must be 3-20 characters long and contain only letters, numbers, and underscores.", 400);
                return;
            }
            // Check availability
            const existing = await User.findOne({ username: usernameLower });
            if (existing && existing._id.toString() !== req.user!.id.toString()) {
                errorResponse(res, "Username is already taken.", 400);
                return;
            }
            updates.username = usernameLower;
        }

        if (updates.bio !== undefined && updates.bio.length > 160) {
            errorResponse(res, "Bio cannot exceed 160 characters.", 400);
            return;
        }

        if (updates.isPublicProfile !== undefined) {
             updates.isPublicProfile = typeof updates.isPublicProfile === "string" ? updates.isPublicProfile === "true" : Boolean(updates.isPublicProfile);
        }

        if (body.socialLinks !== undefined) updates.socialLinks = body.socialLinks;

        // Validate phone format for Pakistan
        if (updates.phone && !/^\+?92\d{10}$|^0\d{10}$/.test(updates.phone.replace(/[\s-]/g, ""))) {
            errorResponse(res, "Invalid Pakistani phone number format. Use +92XXXXXXXXXX or 03XXXXXXXXX.", 400);
            return;
        }

        // Mark profile as completed if name + phone + city are set
        if (updates.name || updates.phone || updates.city) {
            const existingUser: any = await User.findById(req.user!.id).select("name phone city").lean();
            const finalName = updates.name || existingUser?.name;
            const finalPhone = updates.phone || existingUser?.phone;
            const finalCity = updates.city || existingUser?.city;

            if (finalName && finalPhone && finalCity) {
                updates.profileCompleted = true;
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user!.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-password");

        if (!user) {
            errorResponse(res, "User not found", 404);
            return;
        }

        successResponse(res, user);
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * POST /api/v1/users/change-password
 * Changes the authenticated user's password.
 * Body: { currentPassword, newPassword }
 */
router.post("/change-password", authenticate, async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            errorResponse(res, "Current password and new password are required.", 400);
            return;
        }

        if (newPassword.length < 8) {
            errorResponse(res, "New password must be at least 8 characters.", 400);
            return;
        }

        if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            errorResponse(res, "New password must contain at least one uppercase letter and one number.", 400);
            return;
        }

        const user = await User.findById(req.user!.id).select("+password");
        if (!user || !user.password) {
            errorResponse(res, "User not found", 404);
            return;
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            errorResponse(res, "Current password is incorrect.", 400);
            return;
        }

        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) {
            errorResponse(res, "New password must be different from current password.", 400);
            return;
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.updateOne({ _id: user._id }, { 
            $set: { 
                password: hashedPassword,
                refreshToken: undefined,
                oldRefreshToken: undefined,
                oldRefreshTokenExpiresAt: undefined,
                failedLoginAttempts: 0,
                lockedUntil: undefined
            } 
        });

        successResponse(res, { message: "Password changed successfully. Please log in again with your new password." });
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * GET /api/v1/users/saved
 * Returns the user's saved restaurants with full details.
 */
router.get("/saved", authenticate, async (req: Request, res: Response) => {
    try {
        const user: any = await User.findById(req.user!.id).select("savedRestaurants").lean();

        if (!user || !user.savedRestaurants?.length) {
            successResponse(res, []);
            return;
        }

        const restaurants = await Restaurant.find({
            _id: { $in: user.savedRestaurants },
            isActive: true,
        })
            .select("brandName branchName name slug coverImage city area cuisines averageRating totalReviews priceRange")
            .lean();

        successResponse(res, restaurants);
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * POST /api/v1/users/saved
 * Toggle save/unsave a restaurant.
 * Body: { restaurantId }
 */
router.post("/saved", authenticate, async (req: Request, res: Response) => {
    try {
        const { restaurantId } = req.body;
        if (!restaurantId) {
            errorResponse(res, "restaurantId is required", 400);
            return;
        }

        const userId = req.user!.id;
        const user: any = await User.findById(userId).select("savedRestaurants");

        if (!user) {
            errorResponse(res, "User not found", 404);
            return;
        }

        const isSaved = user.savedRestaurants.some(
            (id: any) => id.toString() === restaurantId
        );

        if (isSaved) {
            // Unsave — atomic pull
            await User.updateOne(
                { _id: userId },
                { $pull: { savedRestaurants: restaurantId } }
            );
            successResponse(res, { saved: false, message: "Restaurant removed from favorites." });
        } else {
            // Save — atomic addToSet (prevents duplicates)
            await User.updateOne(
                { _id: userId },
                { $addToSet: { savedRestaurants: restaurantId } }
            );
            successResponse(res, { saved: true, message: "Restaurant added to favorites!" });
        }
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * GET /api/v1/users/reviews
 * Returns all reviews written by the authenticated user.
 */
router.get("/reviews", authenticate, async (req: Request, res: Response) => {
    try {
        const reviews = await Review.find({ userId: req.user!.id })
            .populate("restaurantId", "brandName branchName name slug coverImage city area")
            .sort({ createdAt: -1 })
            .lean();
        successResponse(res, reviews);
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * PUT /api/v1/users/reviews/:id
 * Updates a specific review owned by the authenticated user.
 */
router.put("/reviews/:id", authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { rating, overallRating, text, reviewText, foodRating, ambianceRating, serviceRating } = req.body;

        const review = await Review.findOne({ _id: id, userId: req.user!.id });
        if (!review) {
            errorResponse(res, "Review not found or unauthorized.", 404);
            return;
        }

        // Handle both older simple rating and newer granular ratings
        if (foodRating !== undefined) review.foodRating = foodRating;
        if (ambianceRating !== undefined) review.ambianceRating = ambianceRating;
        if (serviceRating !== undefined) review.serviceRating = serviceRating;

        if (rating !== undefined || overallRating !== undefined) {
            review.overallRating = overallRating || rating;
        } else if (foodRating !== undefined && ambianceRating !== undefined && serviceRating !== undefined) {
             review.overallRating = Math.round(((foodRating + ambianceRating + serviceRating) / 3) * 10) / 10;
        }

        if (text !== undefined || reviewText !== undefined) {
            review.text = text || reviewText;
        }

        await review.save();

        successResponse(res, { message: "Review updated successfully", review });
    } catch (err) {
        console.error("[Users] Update review error:", err);
        errorResponse(res, "Failed to update review", 500);
    }
});

/**
 * GET /api/v1/users/export-data
 * Protected: authenticated user
 * GDPR: Export all user data.
 */
router.get("/export-data", authenticate, async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user!.id).lean();
        if (!user) {
            errorResponse(res, "User not found", 404);
            return;
        }
        
        const reviews = await Review.find({ userId: req.user!.id }).lean();
        // Remove sensitive fields
        delete (user as any).password;
        delete (user as any).refreshToken;
        delete (user as any).oldRefreshToken;

        successResponse(res, {
            user,
            reviews,
            exporter: "Foodies Pakistan",
            exportedAt: new Date()
        });
    } catch (err) {
        console.error("[Users] Export data error:", err);
        errorResponse(res, "Failed to export data", 500);
    }
});

/**
 * DELETE /api/v1/users/me
 * Protected: authenticated user
 * GDPR: Delete user account and anonymize/remove associated data.
 */
router.delete("/me", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const user = await User.findById(userId);
        if (!user) {
            errorResponse(res, "User not found", 404);
            return;
        }

        // Keep reviews but anonymize them to preserve restaurant ratings
        await Review.updateMany(
            { userId },
            { $set: { userId: null, userName: "Deleted User" } }
        );

        // Actual deletion
        await User.deleteOne({ _id: userId });

        successResponse(res, { message: "Account deleted successfully." });
    } catch (err) {
        console.error("[Users] Delete account error:", err);
        errorResponse(res, "Failed to delete account", 500);
    }
});

export default router;
