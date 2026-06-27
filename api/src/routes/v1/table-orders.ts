import { Router, Request, Response } from "express";
import { TableOrder } from "../../models/TableOrder";
import { MenuItem } from "../../models/MenuItem";
import { Restaurant } from "../../models/Restaurant";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * POST /api/v1/table-orders/create
 * Guest scans QR and submits their cart as a TableOrder.
 * Auth is optional — guests can order without an account.
 *
 * Body: {
 *   restaurantId: string,
 *   tableNumber: string,
 *   items: [{ menuItemId: string, quantity: number, specialInstructions?: string }],
 *   kitchenNotes?: string
 * }
 */
router.post("/create", async (req: Request, res: Response) => {
    try {
        const { restaurantId, tableNumber, items, kitchenNotes } = req.body;

        if (!restaurantId || !tableNumber || !items || !Array.isArray(items) || items.length === 0) {
            errorResponse(res, "restaurantId, tableNumber, and items[] are required.", 400);
            return;
        }

        if (items.length > 50) {
            errorResponse(res, "Maximum 50 items per order.", 400);
            return;
        }

        // Verify restaurant exists
        const restaurant = await Restaurant.findById(restaurantId).select("_id brandName").lean();
        if (!restaurant) {
            errorResponse(res, "Restaurant not found.", 404);
            return;
        }

        // Validate and denormalize all items
        const menuItemIds = items.map((i: any) => i.menuItemId);
        const menuItems = await MenuItem.find({
            _id: { $in: menuItemIds },
            restaurantId,
            isAvailable: true,
        }).lean();

        if (menuItems.length !== menuItemIds.length) {
            errorResponse(res, "One or more menu items are unavailable or invalid.", 400);
            return;
        }

        const menuMap = new Map(menuItems.map((m: any) => [m._id.toString(), m]));

        let subtotalPaisa = 0;
        const orderItems = items.map((i: any) => {
            const menuItem = menuMap.get(i.menuItemId);
            if (!menuItem) throw new Error("Invalid item");

            const qty = Math.max(1, Math.min(50, parseInt(i.quantity) || 1));
            const lineTotalPaisa = menuItem.pricePaisa * qty;
            subtotalPaisa += lineTotalPaisa;

            return {
                menuItemId: menuItem._id,
                name: menuItem.name,
                pricePaisa: menuItem.pricePaisa,
                quantity: qty,
                specialInstructions: (i.specialInstructions || "").slice(0, 200),
            };
        });

        // Check if there's an existing Cart for this table (merge or replace)
        const existingCart = await TableOrder.findOne({
            restaurantId,
            tableNumber,
            status: "Cart",
        });

        if (existingCart) {
            // Merge items into existing cart
            existingCart.items.push(...orderItems);
            existingCart.subtotalPaisa += subtotalPaisa;
            if (kitchenNotes) existingCart.kitchenNotes = kitchenNotes;
            await existingCart.save();

            successResponse(res, {
                message: "Items added to existing cart.",
                orderCode: existingCart.orderCode,
                subtotal: existingCart.subtotalPaisa / 100,
                itemCount: existingCart.items.length,
            });
            return;
        }

        // Detect user from auth header (optional)
        let userId: any = undefined;
        try {
            // Attempt to parse auth token if present
            const authHeader = req.headers.authorization;
            if (authHeader) {
                // Simple JWT decode for userId extraction
                const jwt = await import("jsonwebtoken");
                const token = authHeader.replace("Bearer ", "");
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as any;
                userId = decoded.userId || decoded.id;
            }
        } catch { /* No auth — guest ordering */ }

        const order = await TableOrder.create({
            restaurantId,
            userId,
            tableNumber,
            items: orderItems,
            subtotalPaisa,
            status: "Cart",
            kitchenNotes: kitchenNotes || "",
        });

        successResponse(res, {
            message: "Order cart created.",
            orderCode: order.orderCode,
            subtotal: subtotalPaisa / 100,
            itemCount: orderItems.length,
            tableNumber,
        }, 201);
    } catch (err: any) {
        console.error("[TABLE_ORDER_CREATE_ERROR]", err);
        errorResponse(res, "Failed to create order.", 500);
    }
});

/**
 * POST /api/v1/table-orders/:orderCode/place
 * Guest submits the cart to the kitchen.
 */
router.post("/:orderCode/place", async (req: Request, res: Response) => {
    try {
        const orderCode = req.params.orderCode as string;

        const order = await TableOrder.findOne({ orderCode, status: "Cart" });
        if (!order) {
            errorResponse(res, "Order not found or already placed.", 404);
            return;
        }

        if (order.items.length === 0) {
            errorResponse(res, "Cart is empty.", 400);
            return;
        }

        order.status = "Placed";
        order.placedAt = new Date();
        await order.save();

        successResponse(res, {
            message: "Order placed! The kitchen is preparing your food. 🍳",
            orderCode: order.orderCode,
            subtotal: order.subtotalPaisa / 100,
            status: "Placed",
        });
    } catch (err) {
        errorResponse(res, "Failed to place order.", 500);
    }
});

/**
 * GET /api/v1/table-orders/:orderCode
 * Get order details by code (for guest tracking).
 */
router.get("/:orderCode", async (req: Request, res: Response) => {
    try {
        const orderCode = req.params.orderCode as string;

        const order = await TableOrder.findOne({ orderCode })
            .populate("restaurantId", "brandName branchName logo")
            .lean();

        if (!order) {
            errorResponse(res, "Order not found.", 404);
            return;
        }

        successResponse(res, order);
    } catch (err) {
        errorResponse(res, "Failed to fetch order.", 500);
    }
});

/**
 * GET /api/v1/table-orders/restaurant/:restaurantId/live
 * Owner/Admin: Get all live (non-completed) orders for the kitchen display.
 */
router.get(
    "/restaurant/:restaurantId/live",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const restaurantId = req.params.restaurantId as string;

            // Verify ownership
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Not authorized.", 403);
                    return;
                }
            }

            const orders = await TableOrder.find({
                restaurantId,
                status: { $in: ["Placed", "Preparing", "Served"] },
            })
                .sort({ placedAt: 1 }) // Oldest first (FIFO)
                .populate("userId", "name phone")
                .lean();

            successResponse(res, {
                liveOrders: orders.length,
                orders,
            });
        } catch (err) {
            errorResponse(res, "Failed to fetch live orders.", 500);
        }
    }
);

/**
 * PATCH /api/v1/table-orders/:orderCode/status
 * Owner/Admin: Update order status (Preparing → Served → Completed).
 */
router.patch(
    "/:orderCode/status",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const orderCode = req.params.orderCode as string;
            const { status } = req.body;

            const validTransitions: Record<string, string[]> = {
                Placed: ["Preparing", "Cancelled"],
                Preparing: ["Served", "Cancelled"],
                Served: ["Completed"],
            };

            const order = await TableOrder.findOne({ orderCode });
            if (!order) {
                errorResponse(res, "Order not found.", 404);
                return;
            }

            // Verify ownership
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: order.restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Not authorized.", 403);
                    return;
                }
            }

            const allowed = validTransitions[order.status] || [];
            if (!allowed.includes(status)) {
                errorResponse(res, `Cannot transition from ${order.status} to ${status}.`, 400);
                return;
            }

            order.status = status;
            if (status === "Served") order.servedAt = new Date();
            if (status === "Completed") order.completedAt = new Date();
            await order.save();

            successResponse(res, {
                message: `Order ${orderCode} → ${status}`,
                orderCode,
                status,
            });
        } catch (err) {
            errorResponse(res, "Failed to update order status.", 500);
        }
    }
);

export default router;
