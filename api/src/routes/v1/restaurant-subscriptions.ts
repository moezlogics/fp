import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { Payment } from "../../models/Payment";
import { Restaurant } from "../../models/Restaurant";
import { RestaurantSubscription } from "../../models/RestaurantSubscription";
import { successResponse, errorResponse } from "../../utils/api-response";
import { initiatePayment } from "../../services/payment/payfast";
import { OWNER_PLAN_DEFINITIONS, getOwnerPlanDefinition, syncRestaurantSubscriptionState } from "../../services/restaurant-subscription-service";

const router = Router();

router.get("/plans", authenticate, authorize("owner", "admin"), async (_req: Request, res: Response) => {
    successResponse(res, OWNER_PLAN_DEFINITIONS.map((plan) => ({
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        pricePaisa: plan.pricePaisa,
        priceRs: plan.pricePaisa / 100,
        durationMonths: plan.durationMonths,
        billingCycle: "Monthly",
        features: plan.features,
    })));
});

router.get("/me", authenticate, authorize("owner", "admin"), async (req: Request, res: Response) => {
    try {
        const restaurantId = String(req.query.restaurantId || "").trim();
        if (!restaurantId) {
            errorResponse(res, "restaurantId is required.", 400);
            return;
        }

        if (req.user!.role === "owner") {
            const ownedRestaurant = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id }).lean();
            if (!ownedRestaurant) {
                errorResponse(res, "Branch not found or not yours.", 403);
                return;
            }
        }

        await syncRestaurantSubscriptionState(restaurantId);

        const [activeSubscription, recentSubscriptions] = await Promise.all([
            RestaurantSubscription.findOne({
                restaurantId,
                status: { $in: ["Active", "Cancelled"] },
                validTo: { $gt: new Date() },
            }).sort({ validTo: -1, createdAt: -1 }).lean(),
            RestaurantSubscription.find({ restaurantId })
                .sort({ createdAt: -1 })
                .limit(6)
                .lean(),
        ]);

        successResponse(res, {
            activeSubscription,
            recentSubscriptions,
        });
    } catch (err: any) {
        console.error("[RestaurantSubscriptions] GET /me error:", err);
        errorResponse(res, "Failed to load branch subscription.", 500);
    }
});

router.post("/me", authenticate, authorize("owner"), async (req: Request, res: Response) => {
    try {
        const { restaurantId, planSlug } = req.body;
        if (!restaurantId || !planSlug) {
            errorResponse(res, "restaurantId and planSlug are required.", 400);
            return;
        }

        const plan = getOwnerPlanDefinition(planSlug);
        if (!plan) {
            errorResponse(res, "Invalid branch plan selected.", 400);
            return;
        }

        const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id }).select("brandName branchName ownerId").lean() as any;
        if (!restaurant) {
            errorResponse(res, "Branch not found or not yours.", 403);
            return;
        }

        const activeSubscription = await RestaurantSubscription.findOne({
            restaurantId,
            status: { $in: ["Active", "Cancelled"] },
            validTo: { $gt: new Date() },
        });
        if (activeSubscription) {
            errorResponse(res, "This branch already has an active plan.", 409);
            return;
        }

        const pendingSubscription = await RestaurantSubscription.findOne({
            restaurantId,
            status: "Pending",
        });
        if (pendingSubscription) {
            errorResponse(res, "A branch plan payment is already pending for this branch.", 409);
            return;
        }

        const validFrom = new Date();
        const validTo = new Date();
        validTo.setMonth(validTo.getMonth() + plan.durationMonths);

        const subscription = await RestaurantSubscription.create({
            restaurantId,
            ownerId: req.user!.id,
            planSlug: plan.slug,
            planName: plan.name,
            billingCycle: "Monthly",
            amountPaisa: plan.pricePaisa,
            status: "Pending",
            validFrom,
            validTo,
            features: plan.features,
            paymentGateway: "payfast",
        });

        const branchName = [restaurant.brandName, restaurant.branchName].filter(Boolean).join(" - ");
        const idempotencyKey = `${req.user!.id}_branch_plan_${subscription._id}_${Date.now()}`;
        const payment = await Payment.create({
            userId: req.user!.id,
            type: "restaurant_subscription",
            amountPaisa: plan.pricePaisa,
            status: "INITIATED",
            txnRefNo: `RSP_${Date.now().toString(36).toUpperCase()}`,
            orderId: subscription._id.toString(),
            description: `${plan.name} for ${branchName || "branch"}`,
            idempotencyKey,
            metadata: {
                restaurantSubscriptionId: subscription._id.toString(),
                restaurantId,
                planSlug: plan.slug,
            },
        });

        subscription.paymentId = payment._id as any;
        await subscription.save();

        const payfastData = await initiatePayment({
            amountPaisa: plan.pricePaisa,
            orderId: subscription._id.toString(),
            description: `${plan.name} for ${branchName || "branch"}`,
            customerEmail: req.user!.email,
            customerPhone: (req.user as any).phone,
        });

        payment.txnRefNo = payfastData.txnRefNo;
        await payment.save();

        successResponse(
            res,
            {
                pending: true,
                subscriptionId: subscription._id,
                payment: {
                    redirectUrl: payfastData.redirectUrl,
                    formData: payfastData.formData,
                    txnRefNo: payfastData.txnRefNo,
                },
            },
            201
        );
    } catch (err: any) {
        console.error("[RestaurantSubscriptions] POST /me error:", err);
        errorResponse(res, "Failed to initiate branch plan payment.", 500);
    }
});

router.post("/me/cancel", authenticate, authorize("owner"), async (req: Request, res: Response) => {
    try {
        const { restaurantId, reason } = req.body;
        if (!restaurantId) {
            errorResponse(res, "restaurantId is required.", 400);
            return;
        }

        const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id }).lean();
        if (!restaurant) {
            errorResponse(res, "Branch not found or not yours.", 403);
            return;
        }

        const subscription = await RestaurantSubscription.findOne({
            restaurantId,
            status: "Active",
            validTo: { $gt: new Date() },
        }).sort({ validTo: -1, createdAt: -1 });

        if (!subscription) {
            errorResponse(res, "No active branch plan found.", 404);
            return;
        }

        subscription.status = "Cancelled";
        subscription.cancelledAt = new Date();
        subscription.cancelReason = reason || "Owner cancelled";
        await subscription.save();

        await syncRestaurantSubscriptionState(restaurantId);

        successResponse(res, {
            message: `Branch plan cancelled. Benefits remain active until ${subscription.validTo.toLocaleDateString("en-PK")}.`,
            validTo: subscription.validTo,
        });
    } catch (err: any) {
        console.error("[RestaurantSubscriptions] POST /me/cancel error:", err);
        errorResponse(res, "Failed to cancel branch plan.", 500);
    }
});

export default router;
