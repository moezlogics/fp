import { Router, Request, Response } from "express";
import { TableInventory } from "../../models/TableInventory";
import { Restaurant } from "../../models/Restaurant";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * GET /api/v1/yield-calendar/restaurant/:restaurantId
 * Query params: ?month=2026-03
 * Protected: admin, owner
 */
router.get(
    "/restaurant/:restaurantId",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const { restaurantId } = req.params;
            const month = req.query.month as string;

            if (!month) {
                errorResponse(res, "Month query param required (YYYY-MM)", 400);
                return;
            }

            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Not found or not yours", 403);
                    return;
                }
            }

            const [year, mon] = month.split("-").map(Number);
            const startDate = new Date(year, mon - 1, 1);
            const endDate = new Date(year, mon, 0, 23, 59, 59);

            const slots = await TableInventory.find({
                restaurantId,
                date: { $gte: startDate, $lte: endDate },
            })
                .sort({ date: 1, timeSlot: 1 })
                .lean();

            const calendar: Record<string, any[]> = {};
            for (const slot of slots) {
                const dateKey = (slot as any).date.toISOString().split("T")[0];
                if (!calendar[dateKey]) calendar[dateKey] = [];
                calendar[dateKey].push({
                    _id: (slot as any)._id,
                    timeSlot: (slot as any).timeSlot,
                    maxCovers: (slot as any).maxCovers,
                    bookedCovers: (slot as any).bookedCovers,
                    heldCovers: (slot as any).heldCovers,
                    availableCovers: Math.max(0, (slot as any).maxCovers - (slot as any).bookedCovers - (slot as any).heldCovers),
                    discountPercent: (slot as any).discountPercent,
                    isBlocked: (slot as any).isBlocked,
                    isManualOverride: (slot as any).isManualOverride,
                    occupancyPercent: Math.round(
                        (((slot as any).bookedCovers + (slot as any).heldCovers) / (slot as any).maxCovers) * 100
                    ),
                });
            }

            successResponse(res, { month, calendar });
        } catch (err) {
            errorResponse(res, "Failed to fetch calendar", 500);
        }
    }
);

/**
 * PUT /api/v1/yield-calendar
 * Protected: admin, owner
 */
router.put(
    "/",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const { slotId, discountPercent, isBlocked } = req.body;

            if (!slotId) {
                errorResponse(res, "slotId required", 400);
                return;
            }

            const slot = await TableInventory.findById(slotId).populate("restaurantId", "ownerId");
            if (!slot) {
                errorResponse(res, "Slot not found", 404);
                return;
            }

            const rest = slot.restaurantId as any;
            if (req.user!.role === "owner" && rest.ownerId?.toString() !== req.user!.id) {
                errorResponse(res, "Not yours", 403);
                return;
            }

            if (discountPercent != null) {
                slot.discountPercent = discountPercent;
                slot.isManualOverride = true;
            }
            if (isBlocked != null) slot.isBlocked = isBlocked;

            await slot.save();
            successResponse(res, { message: "Slot updated", slot });
        } catch (err) {
            errorResponse(res, "Failed to update slot", 500);
        }
    }
);

export default router;
