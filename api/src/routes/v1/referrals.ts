import { Router, Request, Response } from "express";
import { User } from "../../models/User";
import { generateReferralCode } from "../../services/wallet-service";
// Credit the referral bonus into the WalletLedger (the SPENDABLE coin balance
// that checkout-engine redeems from) — NOT User.points, which is a separate
// gamification counter that can never be spent.
import { creditCoins } from "../../services/wallet";
import { authenticate } from "../../middleware/authenticate";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * GET /api/v1/referrals/me
 * Get user's referral code, stats.
 */
router.get("/me", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const code = await generateReferralCode(userId);

        // Count how many users were referred
        const referredCount = await User.countDocuments({ referredBy: userId });

        successResponse(res, {
            referralCode: code,
            referralLink: `https://foodiespakistan.pk/signup?ref=${code}`, // The frontend uses NEXT_PUBLIC_SITE_URL, API hardcodes production url for now
            totalReferred: referredCount,
        });
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * POST /api/v1/referrals/apply
 * New user applies a referral code during signup.
 */
router.post("/apply", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { code } = req.body;

        if (!code) {
            errorResponse(res, "Referral code required", 400);
            return;
        }

        const currentUser = await User.findById(userId);
        if (!currentUser) {
            errorResponse(res, "User not found", 404);
            return;
        }

        // Check if already referred
        if (currentUser.referredBy) {
            errorResponse(res, "You have already used a referral code", 400);
            return;
        }

        // Prevent self-referral
        if (currentUser.referralCode === code) {
            errorResponse(res, "Cannot use your own referral code", 400);
            return;
        }

        // Find referrer
        const referrer = await User.findOne({ referralCode: code });
        if (!referrer) {
            errorResponse(res, "Invalid referral code", 404);
            return;
        }

        // Link referee to referrer
        currentUser.referredBy = referrer.id;
        await currentUser.save();

        // Credit referrer immediately with a spendable 50-coin bonus.
        // overrideAmount bypasses RewardConfig so the bonus is guaranteed even if
        // no "Referral" reward row is configured.
        await creditCoins({
            userId: referrer.id,
            source: "Referral",
            referenceType: "User",
            referenceId: currentUser.id,
            description: `Referral bonus: ${currentUser.name} signed up using your code`,
            overrideAmount: 50,
        });

        successResponse(res, {
            message: "Referral code applied! Your friend earned bonus coins. You'll earn coins after your first booking.",
            referrerName: referrer.name,
        });
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

export default router;
