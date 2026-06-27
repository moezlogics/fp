import { Router, Request, Response } from "express";
import { Restaurant } from "../../models/Restaurant";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * GET /api/v1/booking-settings/restaurant/:restaurantId
 * Public: Anyone can view a restaurant's booking configuration
 * (needed by frontend to render the booking widget)
 */
router.get(
    "/restaurant/:restaurantId",
    async (req: Request, res: Response) => {
        try {
            const { restaurantId } = req.params;

            const rest = await Restaurant.findById(restaurantId)
                .select("bookingSettings name brandName branchName")
                .lean();

            if (!rest) {
                errorResponse(res, "Restaurant not found", 404);
                return;
            }

            successResponse(res, rest);
        } catch (err) {
            errorResponse(res, "Failed to fetch booking settings", 500);
        }
    }
);

/**
 * PUT /api/v1/booking-settings/restaurant/:restaurantId
 * Protected: owner, admin
 * Owner updates their restaurant's booking configuration.
 */
router.put(
    "/restaurant/:restaurantId",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const { restaurantId } = req.params;

            // Ownership check for owners
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({
                    _id: restaurantId,
                    ownerId: req.user!.id,
                });
                if (!rest) {
                    errorResponse(res, "Restaurant not found or not yours", 403);
                    return;
                }
            }

            // Whitelist allowed fields (prevent injection of non-booking fields)
            const allowed = [
                "isBookingEnabled",
                "slotDurationMinutes",
                "maxPartySize",
                "minPartySize",
                "maxAdvanceBookingDays",
                "autoConfirm",
                "cancellationWindowMinutes",
                "bookableDays",
                "bookableTimeStart",
                "bookableTimeEnd",
                "coversPerSlot",
                "minimumBillForDiscountPaisa",
                "maxDiscountCap",
                "bankDealsOnCash",
            ];

            if (req.user!.role === "admin") {
                allowed.push("isPrimePartner");
            }

            const updateObj: Record<string, any> = {};
            for (const key of allowed) {
                if (req.body[key] !== undefined) {
                    // Nested coversPerSlot
                    if (key === "coversPerSlot" && typeof req.body[key] === "object") {
                        const covers = req.body[key];
                        if (covers.lunch != null)
                            updateObj["bookingSettings.coversPerSlot.lunch"] = Math.max(0, Math.min(200, Number(covers.lunch)));
                        if (covers.afternoon != null)
                            updateObj["bookingSettings.coversPerSlot.afternoon"] = Math.max(0, Math.min(200, Number(covers.afternoon)));
                        if (covers.dinner != null)
                            updateObj["bookingSettings.coversPerSlot.dinner"] = Math.max(0, Math.min(200, Number(covers.dinner)));
                    } else {
                        updateObj[`bookingSettings.${key}`] = req.body[key];
                    }
                }
            }

            const unsetObj: Record<string, 1> = {};
            if (req.user!.role === "admin" && req.body.isPrimePartner !== undefined) {
                if (req.body.isPrimePartner) {
                    updateObj.partnerSource = "manual";
                } else {
                    unsetObj.partnerSource = 1;
                }
            }

            // Validation: maxDiscountCap range
            if (updateObj["bookingSettings.maxDiscountCap"] != null) {
                const val = Number(updateObj["bookingSettings.maxDiscountCap"]);
                if (val < 10 || val > 70) {
                    errorResponse(res, "maxDiscountCap must be between 10 and 70", 400);
                    return;
                }
            }

            // Validation: slotDurationMinutes
            if (updateObj["bookingSettings.slotDurationMinutes"] != null) {
                const val = Number(updateObj["bookingSettings.slotDurationMinutes"]);
                if (![15, 30, 60].includes(val)) {
                    errorResponse(res, "slotDurationMinutes must be 15, 30, or 60", 400);
                    return;
                }
            }

            // Validation: min <= max party size
            const newMin = updateObj["bookingSettings.minPartySize"];
            const newMax = updateObj["bookingSettings.maxPartySize"];
            if (newMin != null && newMax != null && newMin > newMax) {
                errorResponse(res, "minPartySize cannot exceed maxPartySize", 400);
                return;
            }

            const updated = await Restaurant.findByIdAndUpdate(
                restaurantId,
                {
                    $set: updateObj,
                    ...(Object.keys(unsetObj).length ? { $unset: unsetObj } : {}),
                },
                { new: true, runValidators: true }
            ).select("bookingSettings");

            if (!updated) {
                errorResponse(res, "Restaurant not found", 404);
                return;
            }

            console.log(`[AUDIT] Booking settings updated for restaurant ${restaurantId} by user ${req.user!.id}`);
            successResponse(res, updated.bookingSettings);
        } catch (err: any) {
            console.error("Update booking settings error:", err);
            errorResponse(res, "Update failed due to an internal error.", 500);
        }
    }
);

export default router;
