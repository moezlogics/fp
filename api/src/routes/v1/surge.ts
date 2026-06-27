import { Router, Request, Response } from "express";
import { SurgeEngine } from "../../services/surge-engine";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { Restaurant } from "../../models/Restaurant";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * GET /api/v1/surge/:restaurantId
 * Returns live surge/occupancy data for a restaurant's slots today.
 * Public — used by frontend to show "🔥 High Demand" badge.
 */
router.get("/:restaurantId", async (req: Request, res: Response) => {
    try {
        const restaurantId = req.params.restaurantId as string;
        const info = await SurgeEngine.getLiveSurgeInfo(restaurantId);

        successResponse(res, {
            isSurging: info.isSurging,
            avgOccupancy: info.avgOccupancy,
            slots: info.slots.map((s) => ({
                timeSlot: s.timeSlot,
                occupancyPercent: s.occupancyPercent,
                effectiveDiscount: s.effectiveDiscount,
                baseDiscount: s.baseDiscount,
                wasSurged: s.wasSurged,
            })),
        });
    } catch (err) {
        errorResponse(res, "Failed to fetch surge info", 500);
    }
});

/**
 * POST /api/v1/surge/recalculate
 * Admin-only: Manually trigger surge recalculation across all restaurants.
 */
router.post(
    "/recalculate",
    authenticate,
    authorize("admin"),
    async (_req: Request, res: Response) => {
        try {
            const result = await SurgeEngine.recalculateAll();
            successResponse(res, {
                message: `Surge recalculated: ${result.processed} slots processed, ${result.surged} surged.`,
                ...result,
            });
        } catch (err) {
            errorResponse(res, "Surge recalculation failed", 500);
        }
    }
);

/**
 * PATCH /api/v1/surge/:restaurantId/settings
 * Owner/Admin: Update surge settings for a restaurant.
 */
router.patch(
    "/:restaurantId/settings",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const { restaurantId } = req.params;
            const { surgeEnabled, surgeIntensity } = req.body;

            // Validate ownership
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Restaurant not found or not yours", 403);
                    return;
                }
            }

            const update: any = {};
            if (typeof surgeEnabled === "boolean") update.surgeEnabled = surgeEnabled;
            if (typeof surgeIntensity === "number" && surgeIntensity >= 0 && surgeIntensity <= 1) {
                update.surgeIntensity = surgeIntensity;
            }

            const updated = await Restaurant.findByIdAndUpdate(
                restaurantId,
                { $set: update },
                { new: true }
            ).select("surgeEnabled surgeIntensity");

            successResponse(res, updated);
        } catch (err) {
            errorResponse(res, "Failed to update surge settings", 500);
        }
    }
);

export default router;
