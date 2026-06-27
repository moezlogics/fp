import { Router, Request, Response } from "express";
import { Reservation } from "../../models/Reservation";
import { Restaurant } from "../../models/Restaurant";
import { User } from "../../models/User";
import { Review } from "../../models/Review";
import { Category } from "../../models/Category";
import { City } from "../../models/City";
import { Deal } from "../../models/Deal";
import { Article } from "../../models/Article";
import Banner from "../../models/Banner";
import { SiteReview } from "../../models/SiteReview";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * GET /api/v1/analytics/dashboard
 * Protected: admin (dashboard stats)
 */
router.get(
    "/dashboard",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const [
                totalRestaurants, approvedRestaurants, pendingRestaurants,
                totalUsers, totalOwners, pendingOwners,
                totalReviews, totalCategories, totalCities,
                totalDeals, totalArticles, totalBanners,
                totalSiteReviews
            ] = await Promise.all([
                Restaurant.countDocuments(),
                Restaurant.countDocuments({ isApproved: true }),
                Restaurant.countDocuments({ isApproved: false }),
                User.countDocuments({ role: "user" }),
                User.countDocuments({ role: "owner" }),
                User.countDocuments({ role: "owner", isApproved: false }),
                Review.countDocuments(),
                Category.countDocuments(),
                City.countDocuments(),
                Deal.countDocuments(),
                Article.countDocuments(),
                Banner.countDocuments({ isActive: true }),
                SiteReview.countDocuments(),
            ]);

            successResponse(res, {
                totalRestaurants, approvedRestaurants, pendingRestaurants,
                totalUsers, totalOwners, pendingOwners,
                totalReviews, totalSiteReviews, totalCategories, totalCities,
                totalDeals, totalArticles, totalBanners
            });
        } catch (error) {
            errorResponse(res, "Internal server error", 500);
        }
    }
);

/**
 * GET /api/v1/analytics/reservations
 * Protected: admin
 */
router.get(
    "/reservations",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const date = req.query.date as string;

            const query: any = {};
            if (date) {
                const d = new Date(date);
                const nextDay = new Date(d);
                nextDay.setDate(nextDay.getDate() + 1);
                query.date = { $gte: d, $lt: nextDay };
            }

            const reservations = await Reservation.find(query)
                .sort({ date: -1, timeSlot: -1 })
                .populate("restaurantId", "name slug area city")
                .populate("userId", "name email")
                .limit(200)
                .lean();

            successResponse(res, { reservations });
        } catch (error) {
            errorResponse(res, "Internal server error", 500);
        }
    }
);

/**
 * GET /api/v1/analytics/owner/:restaurantId
 * Protected: owner (owner dashboard stats for a specific restaurant)
 */
router.get(
    "/owner/:restaurantId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { restaurantId } = req.params;

            // Verify restaurant exists and belongs to this owner
            const restaurant = await Restaurant.findById(restaurantId).lean() as any;
            if (!restaurant) {
                errorResponse(res, "Restaurant not found", 404);
                return;
            }
            if (String(restaurant.ownerId) !== String(req.user!.id)) {
                console.warn(`[Analytics] 403 Forbidden: Restaurant ${restaurantId} owner ${restaurant.ownerId} does not match current User ${req.user!.id}`);
                errorResponse(res, "Unauthorized", 403);
                return;
            }

            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            const [
                totalBookings,
                confirmedBookings,
                completedBookings,
                noShowBookings,
                cancelledBookings,
                last30Bookings,
                last7Bookings,
                totalReviews,
                reviewAgg,
                totalPaxAgg,
            ] = await Promise.all([
                Reservation.countDocuments({ restaurantId }),
                Reservation.countDocuments({ restaurantId, status: "Confirmed" }),
                Reservation.countDocuments({ restaurantId, status: "Completed" }),
                Reservation.countDocuments({ restaurantId, status: "NoShow" }),
                Reservation.countDocuments({ restaurantId, status: { $in: ["CancelledByUser", "CancelledByOwner"] } }),
                Reservation.countDocuments({ restaurantId, createdAt: { $gte: thirtyDaysAgo } }),
                Reservation.countDocuments({ restaurantId, createdAt: { $gte: sevenDaysAgo } }),
                Review.countDocuments({ restaurantId, isVisible: true }),
                Review.aggregate([
                    { $match: { restaurantId: restaurant._id, isVisible: true } },
                    { $group: { _id: null, avg: { $avg: "$overallRating" } } },
                ]),
                Reservation.aggregate([
                    { $match: { restaurantId: restaurant._id, status: { $in: ["Confirmed", "Seated", "Completed"] } } },
                    { $group: { _id: null, total: { $sum: "$pax" } } },
                ]),
            ]);

            const averageRating = reviewAgg[0]?.avg || 0;
            const totalGuests = totalPaxAgg[0]?.total || 0;

            successResponse(res, {
                totalBookings,
                confirmedBookings,
                completedBookings,
                noShowBookings,
                cancelledBookings,
                last30Bookings,
                last7Bookings,
                totalReviews,
                averageRating: Math.round(averageRating * 10) / 10,
                totalGuests,
            });
        } catch (error) {
            console.error("[Analytics] Owner error:", error);
            errorResponse(res, "Internal server error", 500);
        }
    }
);

export default router;
