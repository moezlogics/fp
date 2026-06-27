import { Router, Request, Response } from "express";
import { YieldRule } from "../../models/YieldRule";
import { Restaurant } from "../../models/Restaurant";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * GET /api/v1/yield-rules/restaurant/:restaurantId
 * Protected: admin, owner
 */
router.get(
    "/restaurant/:restaurantId",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const { restaurantId } = req.params;

            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Restaurant not found or not yours", 403);
                    return;
                }
            }

            const rules = await YieldRule.find({ restaurantId }).sort({ priority: -1, createdAt: -1 }).lean();
            successResponse(res, rules);
        } catch (err) {
            errorResponse(res, "Failed to fetch yield rules", 500);
        }
    }
);

/**
 * GET /api/v1/yield-rules/restaurant/:restaurantId/public
 * Public: Anyone can view active yield rules (needed for booking widget)
 */
router.get(
    "/restaurant/:restaurantId/public",
    async (req: Request, res: Response) => {
        try {
            const { restaurantId } = req.params;
            const now = new Date();

            const rules = await YieldRule.find({
                restaurantId,
                isActive: true,
                validFrom: { $lte: now },
                validTo: { $gte: now },
            })
                .select("name daysOfWeek timeSlotStart timeSlotEnd discountPercent")
                .sort({ priority: -1 })
                .lean();

            successResponse(res, rules);
        } catch (err) {
            errorResponse(res, "Failed to fetch yield rules", 500);
        }
    }
);

/**
 * POST /api/v1/yield-rules
 * Protected: admin, owner
 */
router.post(
    "/",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const body = req.body;
            const { restaurantId, name, daysOfWeek, timeSlotStart, timeSlotEnd, discountPercent, validFrom, validTo, priority } = body;

            if (!restaurantId || !name || !daysOfWeek?.length || !timeSlotStart || !timeSlotEnd || discountPercent == null || !validFrom || !validTo) {
                errorResponse(res, "All fields required", 400);
                return;
            }

            if (discountPercent < 0 || discountPercent > 100) {
                errorResponse(res, "Discount must be between 0 and 100", 400);
                return;
            }

            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Restaurant not found or not yours", 403);
                    return;
                }
            }

            const rule = await YieldRule.create({
                restaurantId,
                name,
                daysOfWeek,
                timeSlotStart,
                timeSlotEnd,
                discountPercent,
                validFrom: new Date(validFrom),
                validTo: new Date(validTo),
                priority: priority || 0,
                isActive: true,
                createdBy: req.user!.id,
            });

            console.log(`[AUDIT] Yield rule created: "${name}" for restaurant ${restaurantId} by user ${req.user!.id}`);
            successResponse(res, rule, 201);
        } catch (err) {
            console.error("Create yield rule error:", err);
            errorResponse(res, "Failed to create yield rule", 500);
        }
    }
);

/**
 * PUT /api/v1/yield-rules/:id
 * Protected: admin, owner — Edit or toggle active an existing rule
 */
router.put(
    "/:id",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const rule = await YieldRule.findById(req.params.id);
            if (!rule) {
                errorResponse(res, "Yield rule not found", 404);
                return;
            }

            // Ownership check for owners
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({
                    _id: rule.restaurantId,
                    ownerId: req.user!.id,
                });
                if (!rest) {
                    errorResponse(res, "Not authorized", 403);
                    return;
                }
            }

            // Whitelist allowed updates
            const allowed = [
                "name", "daysOfWeek", "timeSlotStart", "timeSlotEnd",
                "discountPercent", "validFrom", "validTo", "priority", "isActive"
            ];
            for (const key of allowed) {
                if (req.body[key] !== undefined) {
                    if (key === "validFrom" || key === "validTo") {
                        (rule as any)[key] = new Date(req.body[key]);
                    } else {
                        (rule as any)[key] = req.body[key];
                    }
                }
            }

            await rule.save();
            console.log(`[AUDIT] Yield rule updated: ${rule._id} by user ${req.user!.id}`);
            successResponse(res, rule);
        } catch (err) {
            console.error("Update yield rule error:", err);
            errorResponse(res, "Failed to update yield rule", 500);
        }
    }
);

/**
 * DELETE /api/v1/yield-rules/:id
 * Protected: admin, owner
 */
router.delete(
    "/:id",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const rule = await YieldRule.findById(req.params.id);
            if (!rule) {
                errorResponse(res, "Yield rule not found", 404);
                return;
            }

            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({
                    _id: rule.restaurantId,
                    ownerId: req.user!.id,
                });
                if (!rest) {
                    errorResponse(res, "Not authorized", 403);
                    return;
                }
            }

            await rule.deleteOne();
            console.log(`[AUDIT] Yield rule deleted: ${req.params.id} by user ${req.user!.id}`);
            successResponse(res, { message: "Yield rule deleted" });
        } catch (err) {
            console.error("Delete yield rule error:", err);
            errorResponse(res, "Failed to delete yield rule", 500);
        }
    }
);

export default router;
