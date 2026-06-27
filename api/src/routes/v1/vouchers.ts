/**
 * Vouchers — Purchase DISABLED (Security Audit SEC-03)
 *
 * The purchase endpoint has been permanently disabled because vouchers
 * were created without payment verification, allowing free acquisition.
 *
 * Management routes (create/list/redeem) remain active for owners/admin.
 * Purchase will return 410 Gone until a payment gateway is integrated.
 */

import { Router, Request, Response } from "express";
import { Voucher } from "../../models/Voucher";
import { VoucherPurchase } from "../../models/VoucherPurchase";
import { Restaurant } from "../../models/Restaurant";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * GET /api/v1/vouchers/restaurant/:restaurantId
 * Protected: admin, owner
 */
router.get(
    "/restaurant/:restaurantId",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const { restaurantId } = req.params;

            // Verify ownership
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Not found or not yours", 403);
                    return;
                }
            }

            const vouchers = await Voucher.find({ restaurantId }).sort({ createdAt: -1 }).lean();
            successResponse(res, vouchers);
        } catch (err) {
            errorResponse(res, "Failed to fetch vouchers", 500);
        }
    }
);

/**
 * POST /api/v1/vouchers
 * Protected: admin, owner
 */
router.post(
    "/",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const body = req.body;
            const { restaurantId, title, description, originalPrice, salePrice, totalQuantity, validFrom, validTo, termsAndConditions, coverImage } = body;

            if (!restaurantId || !title || !originalPrice || !salePrice) {
                errorResponse(res, "Missing required voucher fields", 400);
                return;
            }

            // Verify ownership
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Not your restaurant", 403);
                    return;
                }
            }

            const voucher = await Voucher.create({
                restaurantId,
                title,
                description: description || "",
                originalPrice,
                salePrice,
                totalQuantity: totalQuantity || 100,
                soldQuantity: 0,
                validFrom: validFrom ? new Date(validFrom) : new Date(),
                validTo: validTo ? new Date(validTo) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                termsAndConditions: termsAndConditions || "",
                coverImage: coverImage || "",
                isActive: true,
            });

            successResponse(res, voucher, 201);
        } catch (err) {
            errorResponse(res, "Failed to create voucher", 500);
        }
    }
);

/**
 * POST /api/v1/vouchers/:id/purchase
 * ⛔ DISABLED — SEC-03: No payment verification.
 * Returns 410 Gone until payment integration is complete.
 */
router.post("/:id/purchase", authenticate, (_req: Request, res: Response) => {
    res.status(410).json({
        success: false,
        error: "Voucher purchases have been disabled. Payment integration required.",
        code: "FEATURE_DISABLED",
    });
});

/**
 * POST /api/v1/vouchers/redeem
 * Owner scans a QR code to redeem a voucher
 */
router.post("/redeem", authenticate, authorize("owner", "admin"), async (req: Request, res: Response) => {
    try {
        const { qrCode } = req.body;
        if (!qrCode) {
            errorResponse(res, "qrCode required", 400);
            return;
        }

        const purchase = await VoucherPurchase.findOne({ qrCode })
            .populate("voucherId", "title originalPrice validTo")
            .populate("userId", "name phone");

        if (!purchase) {
            errorResponse(res, "Invalid QR code", 404);
            return;
        }

        // Verify the owner owns this restaurant
        if (req.user!.role === "owner") {
            const rest = await Restaurant.findOne({
                _id: purchase.restaurantId,
                ownerId: req.user!.id,
            });
            if (!rest) {
                errorResponse(res, "Not your restaurant", 403);
                return;
            }
        }

        if (purchase.status === "Redeemed") {
            errorResponse(res, "Voucher already redeemed", 409);
            return;
        }

        if (purchase.status === "Expired") {
            errorResponse(res, "Voucher has expired", 410);
            return;
        }

        purchase.status = "Redeemed";
        purchase.redeemedAt = new Date();
        await purchase.save();

        successResponse(res, {
            message: "Voucher redeemed successfully!",
            purchase,
        });
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * PUT /api/v1/vouchers/:id
 * Protected: admin, owner
 */
router.put("/:id", authenticate, authorize("admin", "owner"), async (req: Request, res: Response) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) {
            errorResponse(res, "Voucher not found", 404);
            return;
        }

        if (req.user!.role === "owner") {
            const rest = await Restaurant.findOne({ _id: voucher.restaurantId, ownerId: req.user!.id });
            if (!rest) {
                errorResponse(res, "Not your restaurant", 403);
                return;
            }
        }

        Object.assign(voucher, req.body);
        await voucher.save();
        successResponse(res, voucher);
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * DELETE /api/v1/vouchers/:id
 * Protected: admin, owner
 */
router.delete("/:id", authenticate, authorize("admin", "owner"), async (req: Request, res: Response) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) {
            errorResponse(res, "Voucher not found", 404);
            return;
        }

        if (req.user!.role === "owner") {
            const rest = await Restaurant.findOne({ _id: voucher.restaurantId, ownerId: req.user!.id });
            if (!rest) {
                errorResponse(res, "Not your restaurant", 403);
                return;
            }
        }

        await Voucher.findByIdAndDelete(req.params.id);
        successResponse(res, { success: true });
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

export default router;
