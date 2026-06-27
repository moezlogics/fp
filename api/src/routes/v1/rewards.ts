import { Router, Request, Response } from "express";
import { RewardConfig } from "../../models/RewardConfig";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * GET /api/v1/rewards — List all reward configurations.
 * Protected: admin
 */
router.get(
    "/",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const configs = await RewardConfig.find().sort({ event: 1 });
            successResponse(res, configs);
        } catch (err) {
            errorResponse(res, "Internal server error", 500);
        }
    }
);

/**
 * PUT /api/v1/rewards — Update a reward config.
 * Protected: admin
 */
router.put(
    "/",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const { event, coinsAwarded, isActive, multiplier, multiplierValidUntil, description } = req.body;

            const config = await RewardConfig.findOneAndUpdate(
                { event },
                {
                    coinsAwarded,
                    isActive,
                    multiplier: multiplier || 1,
                    multiplierValidUntil: multiplierValidUntil ? new Date(multiplierValidUntil) : null,
                    description: description || "",
                },
                { upsert: true, new: true }
            );

            successResponse(res, config);
        } catch (err) {
            errorResponse(res, "Internal server error", 500);
        }
    }
);

export default router;
