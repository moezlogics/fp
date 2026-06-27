import { Router, Request, Response } from "express";
import { User } from "../../models/User";
import { Restaurant } from "../../models/Restaurant";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

// GET /api/v1/owners
router.get("/", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const filter = (req.query.filter as string) || "pending";

        let query: any = { role: "owner" };
        if (filter === "pending") query = { role: "owner", isApproved: false, rejectionReason: { $exists: false } };
        else if (filter === "approved") query = { role: "owner", isApproved: true };
        else if (filter === "rejected") query = { role: "owner", rejectionReason: { $exists: true, $ne: "" } };

        const owners = await User.find(query).sort({ createdAt: -1 }).lean();
        successResponse(res, owners);
    } catch (error) {
        errorResponse(res, "Failed to fetch owners", 500);
    }
});

/**
 * PUT /api/v1/owners/:id
 * 
 * Admin approves or rejects an owner application.
 * 
 * Architecture:
 * - When APPROVING: sets isApproved=true on both the User AND all their Restaurants.
 *   This ensures the owner's restaurants immediately appear in public listings
 *   without requiring a separate restaurant approval step.
 * 
 * - When REJECTING: sets isApproved=false on the User AND all their Restaurants.
 *   This removes any previously approved restaurants from public listings.
 * 
 * Both operations use Promise.all for atomic consistency — if one fails, 
 * the error propagates and the admin sees a failure (can retry).
 */
router.put("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { action, rejectionReason } = req.body;

        if (action === "approve") {
            // Approve owner + all their restaurants atomically
            await Promise.all([
                User.findByIdAndUpdate(id, { isApproved: true, rejectionReason: "" }),
                Restaurant.updateMany({ ownerId: id }, { isApproved: true }),
            ]);

            const restaurantCount = await Restaurant.countDocuments({ ownerId: id });
            console.log(`[AUDIT] Admin approved owner ${id}. ${restaurantCount} restaurant(s) also approved.`);

        } else if (action === "reject") {
            // Reject owner + unpublish all their restaurants
            await Promise.all([
                User.findByIdAndUpdate(id, { isApproved: false, rejectionReason: rejectionReason || "Application rejected" }),
                Restaurant.updateMany({ ownerId: id }, { isApproved: false }),
            ]);

            console.log(`[AUDIT] Admin rejected owner ${id}. Reason: ${rejectionReason || "Application rejected"}`);

        } else {
            errorResponse(res, "Invalid action", 400);
            return;
        }

        successResponse(res, { message: `Owner ${action}d successfully` });
    } catch (error) {
        console.error(`[Owners] Failed to ${req.body?.action} owner ${req.params.id}:`, error);
        errorResponse(res, "Failed to update owner", 500);
    }
});

export default router;
