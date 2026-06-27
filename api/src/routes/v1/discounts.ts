import express from "express";
import { CheckoutEngine } from "../../services/payment/checkout-engine";
import { authenticate } from "../../middleware/authenticate";

const router = express.Router();

/**
 * @route   POST /api/v1/discounts/calculate
 * @desc    Calculates the detailed breakdown of the bill using the 4-layer discount logic.
 * @access  Private (Requires User)
 */
router.post("/calculate", authenticate, async (req, res): Promise<any> => {
    try {
        const { originalBillPaisa, restaurantId, yieldRuleId, cardBin, applyCoins } = req.body;

        if (!originalBillPaisa || !restaurantId) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const breakdown = await CheckoutEngine.calculateBill({
            userId: (req as any).user.userId,
            restaurantId,
            originalBillPaisa,
            yieldRuleId,
            cardBin,
            applyCoins
        });

        return res.status(200).json({
            success: true,
            breakdown
        });
    } catch (error) {
        console.error("[Discount Calculate Error]", error);
        return res.status(500).json({ success: false, message: "Server error calculating discount" });
    }
});

export default router;
