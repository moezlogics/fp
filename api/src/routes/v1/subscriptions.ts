import { Router, Request, Response } from "express";
import { SubscriptionPlan } from "../../models/SubscriptionPlan";
import { Subscription } from "../../models/Subscription";
import { PrimeRedemption } from "../../models/PrimeRedemption";
import { User } from "../../models/User";
import { Payment } from "../../models/Payment";
import { PaymentMethod } from "../../models/PaymentMethod";
import { Restaurant } from "../../models/Restaurant";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";
import { redis } from "../../config/redis";
import { checkPrimeCooldown, setPrimeCooldown } from "../../services/sms-service";
import { sendOTPEmail, sendPrimeCancelOTP } from "../../services/email-service";
import { chargeTokenizedCard, initiatePayment } from "../../services/payment/payfast";

const router = Router();
const PRIME_EXTRA_DISCOUNT_PERCENT = 15;
const PRIME_EMAIL_OTP_TTL_SECONDS = 120;
const PRIME_EMAIL_RATE_LIMIT_WINDOW_SECONDS = 1800;
const PRIME_EMAIL_RATE_LIMIT_MAX = 15;
const PRIME_PLAN_DEFINITIONS = [
    {
        name: "6 Months",
        slug: "semiannual",
        duration: "SemiAnnual" as const,
        durationMonths: 6,
        price: 950,
        currency: "PKR",
        isActive: true,
        displayOrder: 1,
        highlightText: "Popular",
        benefits: [{ type: "ExtraDiscount", value: PRIME_EXTRA_DISCOUNT_PERCENT, label: "15% off every meal" }],
    },
    {
        name: "1 Year",
        slug: "annual",
        duration: "Annual" as const,
        durationMonths: 12,
        price: 1699,
        currency: "PKR",
        isActive: true,
        displayOrder: 2,
        highlightText: "Best Value",
        benefits: [{ type: "ExtraDiscount", value: PRIME_EXTRA_DISCOUNT_PERCENT, label: "15% off every meal" }],
    },
] as const;

async function ensurePrimePlanCatalog() {
    await Promise.all(
        PRIME_PLAN_DEFINITIONS.map((plan) =>
            SubscriptionPlan.findOneAndUpdate(
                { slug: plan.slug },
                { $set: plan },
                { upsert: true, new: true }
            )
        )
    );

    await SubscriptionPlan.updateMany(
        { slug: { $nin: PRIME_PLAN_DEFINITIONS.map((plan) => plan.slug) } },
        { $set: { isActive: false } }
    );
}

function maskEmail(email: string): string {
    const [localPart = "", domain = ""] = email.split("@");
    const visible = localPart.slice(0, 2) || localPart.slice(0, 1) || "*";
    const maskedLocal = `${visible}${"*".repeat(Math.max(1, localPart.length - visible.length))}`;
    return `${maskedLocal}@${domain}`;
}

function generateEmailOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

async function sendPrimeEmailOTP(userId: string, email: string) {
    const rateLimitKey = `otp_rate:prime-email:${userId}`;
    const otpKey = `otp:prime-email:${userId}`;
    const currentCount = await redis.get(rateLimitKey);

    if (currentCount && parseInt(currentCount, 10) >= PRIME_EMAIL_RATE_LIMIT_MAX) {
        return {
            success: false,
            message: "Too many OTP requests. Please try again later.",
            code: "RATE_LIMIT" as const,
        };
    }

    const otp = generateEmailOtp();
    await redis.set(otpKey, otp, "EX", PRIME_EMAIL_OTP_TTL_SECONDS);

    const pipeline = redis.pipeline();
    pipeline.incr(rateLimitKey);
    pipeline.expire(rateLimitKey, PRIME_EMAIL_RATE_LIMIT_WINDOW_SECONDS);
    await pipeline.exec();

    try {
        await sendOTPEmail(email, otp);
        return { success: true, message: "OTP sent successfully." };
    } catch (err: any) {
        await redis.del(otpKey);
        return {
            success: false,
            message: err?.message || "Failed to send OTP email.",
            code: "EMAIL_ERROR" as const,
        };
    }
}

async function verifyPrimeEmailOTP(userId: string, otp: string) {
    const otpKey = `otp:prime-email:${userId}`;
    const failKey = `otp_fail:prime-email:${userId}`;
    const failCount = await redis.get(failKey);

    if (failCount && parseInt(failCount, 10) >= 3) {
        await redis.del(otpKey);
        return {
            success: false,
            message: "Too many failed attempts. Please request a new OTP.",
        };
    }

    const storedOTP = await redis.get(otpKey);
    if (!storedOTP) {
        return {
            success: false,
            message: "OTP has expired or was not requested. Please request a new OTP.",
        };
    }

    if (storedOTP !== otp.trim()) {
        const pipeline = redis.pipeline();
        pipeline.incr(failKey);
        pipeline.expire(failKey, PRIME_EMAIL_OTP_TTL_SECONDS);
        await pipeline.exec();
        return {
            success: false,
            message: "Invalid OTP. Please try again.",
        };
    }

    await redis.del(otpKey);
    await redis.del(failKey);
    return {
        success: true,
        message: "OTP verified successfully.",
    };
}

// ── CANCEL OTP LOGIC ──

async function sendCancelEmailOTP(userId: string, email: string) {
    const rateLimitKey = `otp_rate:prime-cancel:${userId}`;
    const otpKey = `otp:prime-cancel:${userId}`;
    const currentCount = await redis.get(rateLimitKey);

    if (currentCount && parseInt(currentCount, 10) >= 5) {
        return {
            success: false,
            message: "Too many OTP requests. Please try again later.",
            code: "RATE_LIMIT" as const,
        };
    }

    const otp = generateEmailOtp();
    await redis.set(otpKey, otp, "EX", PRIME_EMAIL_OTP_TTL_SECONDS);

    const pipeline = redis.pipeline();
    pipeline.incr(rateLimitKey);
    pipeline.expire(rateLimitKey, PRIME_EMAIL_RATE_LIMIT_WINDOW_SECONDS);
    await pipeline.exec();

    try {
        await sendPrimeCancelOTP(email, otp);
        return { success: true, message: "Cancellation OTP sent successfully." };
    } catch (err: any) {
        await redis.del(otpKey);
        return {
            success: false,
            message: err?.message || "Failed to send OTP email.",
            code: "EMAIL_ERROR" as const,
        };
    }
}

async function verifyCancelEmailOTP(userId: string, otp: string) {
    const otpKey = `otp:prime-cancel:${userId}`;
    const failKey = `otp_fail:prime-cancel:${userId}`;
    const failCount = await redis.get(failKey);

    if (failCount && parseInt(failCount, 10) >= 3) {
        await redis.del(otpKey);
        return {
            success: false,
            message: "Too many failed attempts. Please request a new OTP.",
        };
    }

    const storedOTP = await redis.get(otpKey);
    if (!storedOTP) {
        return {
            success: false,
            message: "OTP has expired or was not requested. Please request a new OTP.",
        };
    }

    if (storedOTP !== otp.trim()) {
        const pipeline = redis.pipeline();
        pipeline.incr(failKey);
        pipeline.expire(failKey, PRIME_EMAIL_OTP_TTL_SECONDS);
        await pipeline.exec();
        return {
            success: false,
            message: "Invalid OTP. Please try again.",
        };
    }

    await redis.del(otpKey);
    await redis.del(failKey);
    return {
        success: true,
        message: "OTP verified successfully.",
    };
}

async function findPrimeLookupUser(query: string) {
    const trimmed = String(query || "").trim();
    if (!trimmed) return null;

    if (/^[a-f\d]{24}$/i.test(trimmed)) {
        const byId = await User.findById(trimmed)
            .select("name phone email avatar isPrime primeValidTo")
            .lean();
        if (byId) return byId;
    }

    const cleanPhone = trimmed.replace(/[\s\-\(\)]/g, "");
    let localDigits = cleanPhone;
    if (localDigits.startsWith("+92")) localDigits = localDigits.substring(3);
    else if (localDigits.startsWith("92") && localDigits.length > 10) localDigits = localDigits.substring(2);
    else if (localDigits.startsWith("0")) localDigits = localDigits.substring(1);

    const phoneVariants = localDigits
        ? [localDigits, `0${localDigits}`, `+92${localDigits}`, `92${localDigits}`]
        : [];

    return User.findOne({
        $or: [
            { email: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
            ...phoneVariants.map((value) => ({ phone: value })),
            ...(localDigits ? [{ phone: { $regex: `${localDigits}$`, $options: "i" } }] : []),
        ],
    })
        .select("name phone email avatar isPrime primeValidTo")
        .lean();
}

// ══════════════════════════════════════════════════
// ── PUBLIC ENDPOINTS ──
// ══════════════════════════════════════════════════

/**
 * GET /api/v1/subscriptions/plans
 * List all active plans (public).
 */
router.get("/plans", async (_req: Request, res: Response) => {
    try {
        await ensurePrimePlanCatalog();
        const plans = await SubscriptionPlan.find({ isActive: true })
            .sort({ displayOrder: 1 })
            .lean();

        successResponse(res, plans);
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * POST /api/v1/subscriptions/plans
 * Admin creates/updates a plan.
 */
router.post("/plans", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        await ensurePrimePlanCatalog();
        const body = req.body;
        const allowedPlan = PRIME_PLAN_DEFINITIONS.find((plan) => plan.slug === body.slug);
        if (!allowedPlan) {
            errorResponse(res, "Only the standard 6 months and 1 year Prime plans are allowed.", 400);
            return;
        }
        // Pin ALL money/benefit fields from the canonical definition. Only a few
        // cosmetic fields are admin-editable — spreading raw `body` would let an
        // admin (or a stolen admin token) inflate benefits[].value (the Prime
        // discount %) or change duration/price, which owners then absorb.
        const plan = await SubscriptionPlan.findOneAndUpdate(
            { slug: body.slug },
            {
                $set: {
                    ...allowedPlan,
                    name: body.name ?? allowedPlan.name,
                    highlightText: body.highlightText ?? allowedPlan.highlightText,
                    displayOrder: body.displayOrder ?? allowedPlan.displayOrder,
                    isActive: typeof body.isActive === "boolean" ? body.isActive : allowedPlan.isActive,
                },
            },
            { upsert: true, new: true }
        );

        successResponse(res, plan, 201);
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

// ══════════════════════════════════════════════════
// ── AUTHENTICATED USER ENDPOINTS ──
// ══════════════════════════════════════════════════

/**
 * GET /api/v1/subscriptions/me
 * Current user's subscription status + savings stats.
 */
router.get("/me", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const subscription = await Subscription.findOne({
            userId,
            status: "Active",
            validTo: { $gt: new Date() },
        })
            .populate("planId")
            .lean();

        if (!subscription) {
            // Also check for PENDING subscription
            const pendingSub = await Subscription.findOne({ userId, status: "Pending" })
                .populate("planId")
                .lean();

            // Also fetch any past subscriptions for history
            const pastSubs = await Subscription.find({ userId, status: { $ne: "Pending" } })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate("planId")
                .lean();

            successResponse(res, {
                isPrime: false,
                subscription: null,
                pendingSubscription: pendingSub,
                pastSubscriptions: pastSubs,
            });
            return;
        }

        // Fetch savings stats
        const user = await User.findById(userId).select("name phone avatar totalPrimeSavings").lean();

        // Fetch recent redemptions
        const recentRedemptions = await PrimeRedemption.find({ userId })
            .sort({ redeemedAt: -1 })
            .limit(10)
            .populate("restaurantId", "name slug coverImage area city")
            .lean();

        // Calculate this month's savings
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyStats = await PrimeRedemption.aggregate([
            {
                $match: {
                    userId: (subscription as any).userId,
                    redeemedAt: { $gte: startOfMonth },
                },
            },
            {
                $group: {
                    _id: null,
                    totalSaved: { $sum: "$primeDiscountPaisa" },
                    count: { $sum: 1 },
                },
            },
        ]);

        const daysRemaining = Math.max(
            0,
            Math.ceil(
                ((subscription as any).validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
        );

        const totalDays = Math.ceil(
            ((subscription as any).validTo.getTime() - (subscription as any).validFrom.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        successResponse(res, {
            isPrime: true,
            subscription: {
                ...(subscription as any),
                daysRemaining,
                totalDays,
                progressPercent: Math.round(((totalDays - daysRemaining) / totalDays) * 100),
            },
            user: user ? {
                name: (user as any).name,
                phone: (user as any).phone,
                avatar: (user as any).avatar,
            } : null,
            savings: {
                lifetimePaisa: (user as any)?.totalPrimeSavings || 0,
                thisMonthPaisa: monthlyStats[0]?.totalSaved || 0,
                thisMonthCount: monthlyStats[0]?.count || 0,
            },
            recentRedemptions,
        });
    } catch (err) {
        console.error("[Subscriptions] GET /me error:", err);
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * POST /api/v1/subscriptions/me
 * Subscribe to a plan.
 *
 * Flow:
 * - Creates a PENDING subscription (not Active).
 * - User must complete payment via WhatsApp / bank transfer.
 * - Admin activates via admin/prime endpoint after payment verification.
 * - Returns a pendingId + WhatsApp link for payment instructions.
 */
router.post("/me", authenticate, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    // Distributed lock — prevents two concurrent purchase requests from BOTH
    // passing the active/pending checks and double-charging a saved card.
    const purchaseLockKey = `sub_purchase_lock:${userId}`;
    const purchaseLock = await redis.set(purchaseLockKey, "1", "EX", 20, "NX");
    if (!purchaseLock) {
        errorResponse(res, "A subscription request is already being processed. Please wait a moment.", 409);
        return;
    }
    try {
        await ensurePrimePlanCatalog();
        const { planSlug, paymentMethodId } = req.body;

        if (req.user!.role !== "user") {
            errorResponse(res, "Prime subscription is only available for customer accounts.", 403);
            return;
        }

        if (!planSlug) {
            errorResponse(res, "planSlug is required.", 400);
            return;
        }

        // Check for existing active subscription
        const existing = await Subscription.findOne({
            userId,
            status: "Active",
            validTo: { $gt: new Date() },
        });
        if (existing) {
            errorResponse(res, "You already have an active subscription.", 400);
            return;
        }

        // Check for an existing PENDING subscription. Only block if it is recent —
        // an abandoned PayFast redirect (no callback ever arrives) would otherwise
        // leave a stale Pending row that PERMANENTLY locks the user out of
        // re-subscribing (Subscription has no TTL, unlike Payment).
        const pendingExists = await Subscription.findOne({
            userId,
            status: "Pending",
        }).sort({ createdAt: -1 });
        if (pendingExists) {
            const ageMs = Date.now() - new Date((pendingExists as any).createdAt).getTime();
            if (ageMs < 30 * 60 * 1000) {
                errorResponse(res, "You already have a pending subscription request. Please complete payment or contact support.", 400);
                return;
            }
            // Stale (>30 min, never completed) — expire it so the user can retry.
            pendingExists.status = "Failed";
            await pendingExists.save();
        }

        const plan = await SubscriptionPlan.findOne({ slug: planSlug, isActive: true });
        if (!plan) {
            errorResponse(res, "Plan not found.", 404);
            return;
        }

        // Calculate validity (will be set properly upon admin activation)
        const validFrom = new Date();
        const validTo = new Date();
        const durationMonths = Number((plan as any).durationMonths) || 0;
        if (durationMonths > 0) {
            validTo.setMonth(validTo.getMonth() + durationMonths);
        } else {
            switch (plan.duration) {
                case "Monthly":
                    validTo.setMonth(validTo.getMonth() + 1);
                    break;
                case "Quarterly":
                    validTo.setMonth(validTo.getMonth() + 3);
                    break;
                case "SemiAnnual":
                    validTo.setMonth(validTo.getMonth() + 6);
                    break;
                case "Annual":
                    validTo.setFullYear(validTo.getFullYear() + 1);
                    break;
            }
        }

        // Create a PENDING subscription — NOT Active
        const subscription = await Subscription.create({
            userId,
            planId: plan._id,
            plan: plan.duration,
            status: "Pending",
            priceAtPurchase: plan.price,
            currency: plan.currency,
            validFrom,
            validTo,
            autoRenew: false,
            paymentGateway: "payfast",
            welcomeBonusGranted: false,
        });

        const user = await User.findById(userId).select("name phone email").lean() as any;
        const idempotencyKey = `${userId}_sub_${subscription._id}_${Date.now()}`;

        const payment = await Payment.create({
            userId,
            type: "subscription",
            amountPaisa: plan.price * 100,
            status: "INITIATED",
            txnRefNo: `SUB_${Date.now().toString(36).toUpperCase()}`,
            orderId: subscription._id.toString(),
            description: `Foodies Prime ${plan.name || plan.duration}`,
            idempotencyKey,
            metadata: { subscriptionId: subscription._id.toString() },
        });

        if (paymentMethodId) {
            const savedCard = await PaymentMethod.findOne({ _id: paymentMethodId, userId });
            if (!savedCard) {
                await subscription.deleteOne();
                await payment.deleteOne();
                errorResponse(res, "Saved card not found.", 404);
                return;
            }

            const chargeResult = await chargeTokenizedCard({
                instrumentToken: savedCard.payfastInstrumentToken,
                amountPaisa: plan.price * 100,
                orderId: subscription._id.toString(),
                description: `Foodies Prime ${plan.name || plan.duration} Subscription`,
                customerEmail: user?.email,
                customerPhone: user?.phone,
            });

            payment.txnRefNo = chargeResult.data?.TXNREFNO || payment.txnRefNo;
            payment.gatewayRef = chargeResult.data?.RETRIEVAL_REF_NO || payment.txnRefNo;
            payment.gatewayResponseCode = chargeResult.responseCode;
            payment.gatewayResponseMessage = chargeResult.message;
            payment.callbackPayload = chargeResult.data;
            payment.completedAt = new Date();
            payment.status = chargeResult.success ? "SUCCESS" : "FAILED";
            await payment.save();

            if (!chargeResult.success) {
                subscription.status = "Failed" as any;
                await subscription.save();
                errorResponse(res, chargeResult.message || "Saved-card payment failed.", 400);
                return;
            }

            subscription.status = "Active";
            await subscription.save();
            await User.findByIdAndUpdate(userId, {
                isPrime: true,
                primeValidTo: subscription.validTo,
            });

            successResponse(
                res,
                {
                    message: "Prime activated successfully.",
                    pending: false,
                    subscriptionId: subscription._id,
                    payment: {
                        txnRefNo: payment.txnRefNo,
                    },
                },
                201
            );
            return;
        }

        const payfastData = await initiatePayment({
            amountPaisa: plan.price * 100,
            orderId: subscription._id.toString(),
            description: `Foodies Prime ${plan.name || plan.duration} Subscription`,
            customerEmail: user?.email,
            customerPhone: user?.phone,
        });

        payment.txnRefNo = payfastData.txnRefNo;
        await payment.save();

        successResponse(
            res,
            {
                message: "Subscription initiated. Redirecting to secure payment.",
                pending: true,
                whatsappUrl: null, // Keep for backward compatibility of frontend type
                payment: {
                    redirectUrl: payfastData.redirectUrl,
                    formData: payfastData.formData,
                }
            },
            201
        );
    } catch (err: any) {
        console.error("[Subscriptions] POST /me error:", err);
        errorResponse(res, "Internal server error", 500);
    } finally {
        await redis.del(purchaseLockKey);
    }
});

/**
 * POST /api/v1/subscriptions/me/cancel/otp
 * Request an OTP to cancel the subscription.
 */
router.post("/me/cancel/otp", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const user = await User.findById(userId).select("email").lean() as any;

        if (!user || !user.email) {
            errorResponse(res, "Your account does not have an associated email address.", 400);
            return;
        }

        const subscription = await Subscription.findOne({
            userId,
            status: "Active",
            validTo: { $gt: new Date() },
        });

        if (!subscription) {
            errorResponse(res, "No active subscription found to cancel.", 404);
            return;
        }

        const result = await sendCancelEmailOTP(userId, user.email);
        if (!result.success) {
            errorResponse(res, result.message, result.code === "RATE_LIMIT" ? 429 : 500);
            return;
        }

        successResponse(res, {
            message: `Cancellation code sent to ${maskEmail(user.email)}.`,
            expiresInSeconds: PRIME_EMAIL_OTP_TTL_SECONDS,
            destination: maskEmail(user.email),
        });
    } catch (err: any) {
        console.error("[Subscriptions] POST /me/cancel/otp error:", err);
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * POST /api/v1/subscriptions/me/cancel
 * Cancel active subscription using OTP.
 */
router.post("/me/cancel", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { reason, otp } = req.body;

        if (!otp) {
            errorResponse(res, "OTP is required to cancel your subscription.", 400);
            return;
        }

        // Verify OTP first
        const otpResult = await verifyCancelEmailOTP(userId, otp);
        if (!otpResult.success) {
            errorResponse(res, otpResult.message, 400);
            return;
        }

        const subscription = await Subscription.findOne({
            userId,
            status: "Active",
            validTo: { $gt: new Date() },
        });

        if (!subscription) {
            errorResponse(res, "No active subscription found.", 404);
            return;
        }

        // Don't delete — mark as cancelled, let it run until validTo
        subscription.status = "Cancelled";
        subscription.cancelledAt = new Date();
        subscription.cancelReason = reason || "User cancelled";
        subscription.autoRenew = false;
        await subscription.save();

        // Note: isPrime stays true until validTo is reached (CRON handles expiry)

        successResponse(res, {
            message: "Subscription cancelled. Your Prime benefits remain active until " +
                subscription.validTo.toLocaleDateString("en-PK", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                }),
            validTo: subscription.validTo,
        });
    } catch (err) {
        console.error("[Subscriptions] POST /me/cancel error:", err);
        errorResponse(res, "Internal server error", 500);
    }
});

/**
 * GET /api/v1/subscriptions/me/redemptions
 * User's Prime usage history (paginated).
 */
router.get("/me/redemptions", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const [redemptions, total] = await Promise.all([
            PrimeRedemption.find({ userId })
                .sort({ redeemedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("restaurantId", "name slug coverImage area city")
                .lean(),
            PrimeRedemption.countDocuments({ userId }),
        ]);

        successResponse(res, {
            redemptions,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

// ══════════════════════════════════════════════════
// ── OWNER WALK-IN VERIFICATION ENDPOINTS ──
// ══════════════════════════════════════════════════

/**
 * POST /api/v1/subscriptions/verify-walkin/check
 * Step 1: Owner enters customer ID, phone, or email — check if user is Prime.
 */
router.post(
    "/verify-walkin/check",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const lookup = String(req.body.query || req.body.phone || req.body.userId || req.body.email || "").trim();
            if (!lookup) {
                errorResponse(res, "Customer ID, phone, or email is required.", 400);
                return;
            }
            const user = await findPrimeLookupUser(lookup);

            if (!user) {
                successResponse(res, {
                    isPrime: false,
                    message: "No user found for that customer ID, phone, or email.",
                });
                return;
            }

            // Check active subscription first
            const subscription = await Subscription.findOne({
                userId: (user as any)._id,
                status: { $in: ["Active", "Cancelled"] },
                validTo: { $gt: new Date() },
            })
                .populate("planId", "name duration")
                .lean();

            if (subscription) {
                const plan = (subscription as any).planId;
                const validToDate = new Date((subscription as any).validTo);

                successResponse(res, {
                    isPrime: true,
                    user: {
                        id: (user as any)._id,
                        name: (user as any).name,
                        phone: (user as any).phone,
                        emailMasked: maskEmail((user as any).email || ""),
                        avatar: (user as any).avatar,
                    },
                    subscription: {
                        planName: plan?.name || (subscription as any).plan || "Prime",
                        duration: plan?.duration || (subscription as any).plan || "—",
                        validTo: validToDate.toISOString(),
                        daysRemaining: Math.max(
                            0,
                            Math.ceil(
                                (validToDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                            )
                        ),
                    },
                    message: "Prime member found. Send a 4-digit OTP to the account email to confirm identity.",
                });
                return;
            }

            // Fallback: check User.isPrime + primeValidTo (admin-granted via flag)
            if ((user as any).isPrime && (user as any).primeValidTo && new Date((user as any).primeValidTo) > new Date()) {
                const validToDate = new Date((user as any).primeValidTo);
                successResponse(res, {
                    isPrime: true,
                    user: {
                        id: (user as any)._id,
                        name: (user as any).name,
                        phone: (user as any).phone,
                        emailMasked: maskEmail((user as any).email || ""),
                        avatar: (user as any).avatar,
                    },
                    subscription: {
                        planName: "Prime",
                        duration: "—",
                        validTo: validToDate.toISOString(),
                        daysRemaining: Math.max(
                            0,
                            Math.ceil(
                                (validToDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                            )
                        ),
                    },
                    message: "Prime member found. Send a 4-digit OTP to the account email to confirm identity.",
                });
                return;
            }

            // Not Prime
            successResponse(res, {
                isPrime: false,
                message: "This user does not have an active Prime subscription.",
                user: {
                    name: (user as any).name,
                    avatar: (user as any).avatar,
                },
            });
        } catch (err) {
            console.error("[Subscriptions] verify-walkin/check error:", err);
            errorResponse(res, "Internal server error", 500);
        }
    }
);

/**
 * POST /api/v1/subscriptions/verify-walkin/otp
 * Step 2: Send OTP to the Prime user's account email.
 */
router.post(
    "/verify-walkin/otp",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const { userId, restaurantId } = req.body;
            if (!userId) {
                errorResponse(res, "userId is required.", 400);
                return;
            }
            // restaurantId is REQUIRED — it is the only key the anti-abuse cooldown
            // is scoped by. Without it the 12h "one redemption per restaurant"
            // limit can never be armed, allowing unlimited Prime redemptions.
            if (!restaurantId) {
                errorResponse(res, "restaurantId is required for walk-in verification.", 400);
                return;
            }

            // Platform policy: Prime discounts apply ONLY at Prime Partner
            // restaurants. Enforce it here so the walk-in flow matches the
            // checkout engine (which gates the subscription discount on
            // isPrimePartner) instead of granting 15% everywhere.
            const otpRestaurant = (await Restaurant.findById(restaurantId)
                .select("bookingSettings.isPrimePartner")
                .lean()) as any;
            if (!otpRestaurant?.bookingSettings?.isPrimePartner) {
                errorResponse(res, "Prime discounts are only available at Prime Partner restaurants.", 400);
                return;
            }

            const user = await User.findById(userId)
                .select("_id email")
                .lean();

            if (!user) {
                errorResponse(res, "User not found.", 404);
                return;
            }
            if (!(user as any).email) {
                errorResponse(res, "This account does not have an email address for Prime verification.", 400);
                return;
            }

            // Enforce the per-restaurant cooldown (12h) — always, not conditionally.
            const cooldown = await checkPrimeCooldown(
                (user as any)._id.toString(),
                restaurantId
            );
            if (!cooldown.allowed) {
                errorResponse(res, cooldown.message, 429);
                return;
            }

            const result = await sendPrimeEmailOTP((user as any)._id.toString(), (user as any).email);

            if (!result.success) {
                // If it's a standard rate limit, return 429 Too Many Requests
                if (result.code === "RATE_LIMIT") {
                    errorResponse(res, result.message, 429);
                    return;
                }
                errorResponse(res, result.message, 500);
                return;
            }

            successResponse(res, {
                message: `OTP sent to ${maskEmail((user as any).email)}. Ask the customer to read the 4-digit code from their email.`,
                expiresInSeconds: 120,
                destination: maskEmail((user as any).email),
            });
        } catch (err) {
            console.error("[Subscriptions] verify-walkin/otp error:", err);
            errorResponse(res, "Internal server error", 500);
        }
    }
);

/**
 * POST /api/v1/subscriptions/verify-walkin/confirm
 * Step 3: Owner enters the OTP the customer read aloud.
 */
router.post(
    "/verify-walkin/confirm",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const { userId, otp, restaurantId, billAmountPaisa } = req.body;

            if (!userId || !otp) {
                errorResponse(res, "userId and OTP are required.", 400);
                return;
            }
            if (!restaurantId) {
                errorResponse(res, "restaurantId is required for walk-in verification.", 400);
                return;
            }

            // Defense-in-depth: Prime discounts apply only at Prime Partner
            // restaurants (consistent with the checkout engine + the /otp gate).
            const confirmRestaurant = (await Restaurant.findById(restaurantId)
                .select("bookingSettings.isPrimePartner")
                .lean()) as any;
            if (!confirmRestaurant?.bookingSettings?.isPrimePartner) {
                errorResponse(res, "Prime discounts are only available at Prime Partner restaurants.", 400);
                return;
            }

            // Verify OTP
            const result = await verifyPrimeEmailOTP(userId, otp);

            if (!result.success) {
                errorResponse(res, result.message, 400);
                return;
            }

            const user = await User.findById(userId)
                .select("_id name phone isPrime primeValidTo")
                .lean();
            if (!user) {
                errorResponse(res, "User not found.", 404);
                return;
            }

            const subscription = await Subscription.findOne({
                userId: (user as any)._id,
                status: { $in: ["Active", "Cancelled"] },
                validTo: { $gt: new Date() },
            })
                .populate("planId")
                .lean();

            // Mirror /check: honour an admin-granted isPrime flag even when there is
            // no qualifying Subscription doc, otherwise the owner is told the guest
            // is Prime at /check but /confirm fails with "Subscription expired".
            const flagPrime =
                !subscription &&
                (user as any).isPrime &&
                (user as any).primeValidTo &&
                new Date((user as any).primeValidTo) > new Date();

            if (!subscription && !flagPrime) {
                errorResponse(res, "This customer's Prime membership is no longer active.", 400);
                return;
            }

            const plan = (subscription as any)?.planId;
            const discountBenefit = plan?.benefits?.find(
                (b: any) => b.type === "ExtraDiscount"
            );
            const discountPercent = discountBenefit?.value || PRIME_EXTRA_DISCOUNT_PERCENT;

            // ── Record the redemption: immutable audit trail + user savings +
            //    anti-fraud history. Without this the "You saved Rs. X with Prime"
            //    dashboard is permanently zero and there is no per-restaurant audit
            //    of which owner approved which discount. billAmountPaisa is optional;
            //    when supplied we can compute the actual rupees saved.
            const billPaisa = Number.isInteger(billAmountPaisa) && billAmountPaisa > 0 ? billAmountPaisa : 0;
            const savedPaisa = Math.round(billPaisa * (discountPercent / 100));

            if (subscription) {
                try {
                    await PrimeRedemption.create({
                        userId: (user as any)._id,
                        restaurantId,
                        subscriptionId: (subscription as any)._id,
                        originalBillPaisa: billPaisa,
                        primeDiscountPercent: discountPercent,
                        primeDiscountPaisa: savedPaisa,
                        verificationMethod: "walk-in-otp",
                        verifiedByOwnerId: req.user!.id,
                        redeemedAt: new Date(),
                    });
                    if (savedPaisa > 0) {
                        await Promise.all([
                            User.findByIdAndUpdate((user as any)._id, { $inc: { totalPrimeSavings: savedPaisa } }),
                            Subscription.findByIdAndUpdate((subscription as any)._id, {
                                $inc: { totalSavingsPaisa: savedPaisa },
                                $set: { lastRedemptionAt: new Date() },
                            }),
                        ]);
                    } else {
                        await Subscription.findByIdAndUpdate((subscription as any)._id, {
                            $set: { lastRedemptionAt: new Date() },
                        });
                    }
                } catch (ledgerErr) {
                    console.error("[Subscriptions] Failed to record PrimeRedemption:", ledgerErr);
                    // Don't fail the in-store verification on a ledger write error.
                }
            }

            // Arm the per-restaurant cooldown (12h) so the same membership cannot be
            // redeemed again here. restaurantId is guaranteed present (validated above).
            await setPrimeCooldown((user as any)._id.toString(), restaurantId);

            successResponse(res, {
                verified: true,
                message: `Prime verified. ${(user as any).name} gets ${discountPercent}% Prime discount.`,
                user: {
                    id: (user as any)._id,
                    name: (user as any).name,
                    phone: (user as any).phone,
                },
                discount: {
                    percent: discountPercent,
                    subscriptionId: (subscription as any)?._id,
                    savedPaisa,
                },
            });
        } catch (err) {
            console.error("[Subscriptions] verify-walkin/confirm error:", err);
            errorResponse(res, "Internal server error", 500);
        }
    }
);

// ══════════════════════════════════════════════════
// ── ADMIN ENDPOINTS ──
// ══════════════════════════════════════════════════

/**
 * POST /api/v1/subscriptions/admin/prime
 * Admin grants or cancels Prime for any user.
 * Body: { userId, action: "grant" | "cancel", durationMonths?: number }
 */
router.post(
    "/admin/prime",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const { userId, action, durationMonths } = req.body;

            if (!userId || !["grant", "cancel"].includes(action)) {
                errorResponse(res, "userId and action (grant/cancel) are required.", 400);
                return;
            }

            const user = await User.findById(userId);
            if (!user) {
                errorResponse(res, "User not found.", 404);
                return;
            }

            if (action === "grant") {
                await ensurePrimePlanCatalog();
                const months = Number(durationMonths) === 12 ? 12 : 6;

                // Cancel any existing active subscription first
                await Subscription.updateMany(
                    { userId, status: { $in: ["Active", "Pending"] }, validTo: { $gt: new Date() } },
                    { status: "Cancelled", cancelledAt: new Date(), cancelReason: "Replaced by admin grant" }
                );

                const validFrom = new Date();
                const validTo = new Date();
                validTo.setMonth(validTo.getMonth() + months);

                const plan = await SubscriptionPlan.findOne({ durationMonths: months, isActive: true });

                if (!plan) {
                    errorResponse(res, "Prime plan not found.", 500);
                    return;
                }

                await Subscription.create({
                    userId,
                    planId: plan._id,
                    plan: plan.duration,
                    status: "Active",
                    priceAtPurchase: 0,
                    currency: "PKR",
                    validFrom,
                    validTo,
                    autoRenew: false,
                    paymentGateway: "admin-granted",
                });

                user.isPrime = true;
                user.primeValidTo = validTo;
                await user.save();

                successResponse(res, {
                    message: `Prime granted to ${user.name} for ${months === 12 ? "1 year" : "6 months"} until ${validTo.toLocaleDateString("en-PK")}.`,
                    isPrime: true,
                    validTo,
                    durationMonths: months,
                });
                return;
            } else {
                // Cancel all active subscriptions
                await Subscription.updateMany(
                    { userId, status: "Active", validTo: { $gt: new Date() } },
                    { status: "Cancelled", cancelledAt: new Date(), cancelReason: "Admin cancelled" }
                );

                user.isPrime = false;
                user.primeValidTo = undefined;
                await user.save();

                successResponse(res, {
                    message: `Prime cancelled for ${user.name}.`,
                    isPrime: false,
                });
            }
        } catch (err: any) {
            console.error("[Subscriptions] admin/prime error:", err);
            errorResponse(res, `Internal server error: ${err.message}`, 500);
        }
    }
);

/**
 * GET /api/v1/subscriptions/admin/active
 * List all active Prime subscribers (admin only).
 */
router.get(
    "/admin/active",
    authenticate,
    authorize("admin"),
    async (_req: Request, res: Response) => {
        try {
            const active = await Subscription.find({
                status: "Active",
                validTo: { $gt: new Date() },
            })
                .populate("userId", "name email phone avatar")
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();

            successResponse(res, active);
        } catch (err) {
            console.error("[Subscriptions] admin/active error:", err);
            errorResponse(res, "Internal server error", 500);
        }
    }
);

/**
 * GET /api/v1/subscriptions/admin/search-users?q=...
 * Search users by name/email/phone for admin grant flow.
 */
router.get(
    "/admin/search-users",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const q = String(req.query.q || "").trim();
            if (!q || q.length < 2) {
                successResponse(res, []);
                return;
            }

            const regex = new RegExp(q, "i");
            const conditions: any[] = [{ name: regex }, { email: regex }, { phone: regex }];
            if (/^[a-f\d]{24}$/i.test(q)) {
                conditions.unshift({ _id: q });
            }

            const users = await User.find({
                $or: conditions,
            })
                .select("name email phone avatar isPrime")
                .limit(10)
                .lean();

            successResponse(res, users);
        } catch (err) {
            errorResponse(res, "Internal server error", 500);
        }
    }
);

export default router;
