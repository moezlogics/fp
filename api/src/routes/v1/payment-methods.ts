import { Router, Request, Response } from "express";
import { PaymentMethod } from "../../models/PaymentMethod";
import { authenticate } from "../../middleware/authenticate";
import { successResponse, errorResponse } from "../../utils/api-response";
import {
    initiatePayment,
    deleteInstrumentToken,
} from "../../services/payment/payfast";

const router = Router();
const MAX_CARDS = 5;

/**
 * GET /api/v1/payment-methods/me
 * Returns all saved payment methods for the logged-in user
 */
router.get("/me", authenticate, async (req: Request, res: Response) => {
    try {
        const cards = await PaymentMethod.find({ userId: req.user!.id })
            .sort({ isDefault: -1, createdAt: -1 })
            .select("-payfastInstrumentToken")  // Never expose token to frontend
            .lean();

        successResponse(res, cards);
    } catch (err) {
        errorResponse(res, "Failed to fetch payment methods", 500);
    }
});

/**
 * POST /api/v1/payment-methods/me/initiate
 * Starts the PayFast card verification flow:
 * - Creates a Rs. 1 temporary charge via PayFast hosted checkout
 * - After user completes, PayFast calls back with instrument_token
 */
router.post("/me/initiate", authenticate, async (req: Request, res: Response) => {
    try {
        const { nickname } = req.body;

        if (!nickname || nickname.length > 50) {
            errorResponse(res, "Card nickname is required (max 50 chars)", 400);
            return;
        }

        // Check card limit
        const count = await PaymentMethod.countDocuments({ userId: req.user!.id });
        if (count >= MAX_CARDS) {
            errorResponse(res, `Maximum ${MAX_CARDS} cards allowed. Delete a card to add a new one.`, 400);
            return;
        }

        // Provide exactly what PayFast initiatePayment expects
        const paymentData = await initiatePayment({
            amountPaisa: 100, // Rs. 1 verification
            orderId: `CARD_VERIFY_${Date.now()}`,
            description: "Card Verification - Rs. 1",
            customerEmail: req.user!.email || "",
            customerPhone: (req.user as any).phone || "",
            tokenizeCard: true,
        });

        // ── WE MUST CREATE A PAYMENT RECORD so the ITN webhook can identify this! ──
        const { Payment } = await import("../../models/Payment");
        await Payment.create({
            userId: req.user!.id,
            type: "card_verify", // NEW TYPE for card auth
            amountPaisa: 100,
            status: "INITIATED",
            txnRefNo: paymentData.txnRefNo,
            orderId: `CARD_VERIFY_${Date.now()}`,
            description: "Card Verification - Rs. 1",
            idempotencyKey: `card_verify_${req.user!.id}_${Date.now()}`,
            metadata: { nickname: nickname.trim() },
        });

        successResponse(res, {
            redirectUrl: paymentData.redirectUrl,
            formData: paymentData.formData,
            txnRefNo: paymentData.txnRefNo,
            nickname, // Pass back so frontend can send it in callback (legacy compat)
        });
    } catch (err) {
        console.error("[PaymentMethods] Initiate error:", err);
        errorResponse(res, "Failed to initiate card verification", 500);
    }
});

/**
 * POST /api/v1/payment-methods/me/confirm
 * Called after PayFast callback — saves the permanent token
 */
router.post("/me/confirm", authenticate, async (req: Request, res: Response) => {
    try {
        const {
            nickname,
            maskedCardNumber,
            cardBrand,
            expiryMonth,
            expiryYear,
            instrumentToken,
        } = req.body;

        if (!instrumentToken || !maskedCardNumber || !cardBrand) {
            errorResponse(res, "Missing required card data from PayFast callback", 400);
            return;
        }

        // Check for duplicate token
        const existing = await PaymentMethod.findOne({ payfastInstrumentToken: instrumentToken });
        if (existing) {
            errorResponse(res, "This card is already saved", 400);
            return;
        }

        // Check card limit
        const count = await PaymentMethod.countDocuments({ userId: req.user!.id });
        if (count >= MAX_CARDS) {
            errorResponse(res, `Maximum ${MAX_CARDS} cards allowed`, 400);
            return;
        }

        // If this is the first card, make it default
        const isDefault = count === 0;

        const card = await PaymentMethod.create({
            userId: req.user!.id,
            cardNickname: nickname || "My Card",
            maskedCardNumber,
            cardBrand: cardBrand.toLowerCase(),
            expiryMonth: expiryMonth || 12,
            expiryYear: expiryYear || 2030,
            isDefault,
            payfastInstrumentToken: instrumentToken,
            payfastTokenCreatedAt: new Date(),
            isVerified: true,
        });

        // Return without exposing token
        const safeCard = card.toObject();
        delete safeCard.payfastInstrumentToken;

        successResponse(res, safeCard, 201);
    } catch (err) {
        console.error("[PaymentMethods] Confirm error:", err);
        errorResponse(res, "Failed to save payment method", 500);
    }
});

/**
 * DELETE /api/v1/payment-methods/me/:cardId
 * Deletes a saved card + revokes PayFast token
 */
router.delete("/me/:cardId", authenticate, async (req: Request, res: Response) => {
    try {
        const card = await PaymentMethod.findOne({
            _id: req.params.cardId,
            userId: req.user!.id,
        });

        if (!card) {
            errorResponse(res, "Card not found", 404);
            return;
        }

        // Delete token from PayFast
        await deleteInstrumentToken(card.payfastInstrumentToken);

        const wasDefault = card.isDefault;
        await card.deleteOne();

        // Auto-promote next card to default if the deleted one was default
        if (wasDefault) {
            const nextCard = await PaymentMethod.findOne({ userId: req.user!.id })
                .sort({ createdAt: 1 });
            if (nextCard) {
                nextCard.isDefault = true;
                await nextCard.save();
            }
        }

        successResponse(res, { message: "Card removed successfully" });
    } catch (err) {
        console.error("[PaymentMethods] Delete error:", err);
        errorResponse(res, "Failed to delete payment method", 500);
    }
});

/**
 * PATCH /api/v1/payment-methods/me/:cardId/default
 * Set a card as the default payment method
 */
router.patch("/me/:cardId/default", authenticate, async (req: Request, res: Response) => {
    try {
        const card = await PaymentMethod.findOne({
            _id: req.params.cardId,
            userId: req.user!.id,
        });

        if (!card) {
            errorResponse(res, "Card not found", 404);
            return;
        }

        // Unset all defaults for this user
        await PaymentMethod.updateMany(
            { userId: req.user!.id },
            { $set: { isDefault: false } }
        );

        // Set this card as default
        card.isDefault = true;
        await card.save();

        successResponse(res, { message: "Default card updated" });
    } catch (err) {
        errorResponse(res, "Failed to set default card", 500);
    }
});

export default router;
