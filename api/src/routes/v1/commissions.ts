import { Router, Request, Response } from "express";
import { CommissionProfile } from "../../models/CommissionProfile";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * GET /api/v1/commissions/admin
 * Protected: admin
 * List all commission profiles.
 */
router.get(
    "/admin",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const profiles = await CommissionProfile.find()
                .populate("restaurantId", "name brandName city")
                .sort({ createdAt: -1 })
                .lean();

            successResponse(res, profiles);
        } catch (err) {
            console.error("[Commissions] Admin List error:", err);
            errorResponse(res, "Failed to fetch commission profiles", 500);
        }
    }
);

/**
 * POST /api/v1/commissions/admin
 * Protected: admin
 * Create/update a commission profile.
 */
router.post(
    "/admin",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const body = req.body;
            const { restaurantId, commissionRate, effectiveFrom, effectiveTo, notes } = body;

            if (!restaurantId || commissionRate == null) {
                errorResponse(res, "restaurantId and commissionRate required", 400);
                return;
            }

            const profile = await CommissionProfile.create({
                restaurantId,
                commissionRate,
                effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
                effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
                notes: notes || "",
                createdBy: req.user!.id,
            });

            successResponse(res, profile, 201);
        } catch (err) {
            console.error("[Commissions] Create error:", err);
            errorResponse(res, "Failed to create commission profile", 500);
        }
    }
);

export default router;
