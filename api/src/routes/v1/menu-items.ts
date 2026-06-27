import { Router, Request, Response } from "express";
import { MenuItem, MENU_CATEGORIES } from "../../models/MenuItem";
import { Restaurant } from "../../models/Restaurant";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";
import { extractMenuFromImage } from "../../services/ai-menu-service";


const router = Router();

/**
 * GET /api/v1/menu-items/restaurant/:restaurantId
 * Owner/Admin: Fetch ALL items for management.
 */
router.get(
    "/restaurant/:restaurantId",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const { restaurantId } = req.params;

            // Verify ownership
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Not authorized.", 403);
                    return;
                }
            }

            const items = await MenuItem.find({ restaurantId }).sort({ category: 1, name: 1 });
            successResponse(res, items);
        } catch (err) {
            errorResponse(res, "Failed to fetch restaurant items.", 500);
        }
    }
);

/**
 * GET /api/v1/menu-items/:restaurantId
 * Public: Fetch the full digital menu for a restaurant (used by QR ordering page).
 */
router.get("/:restaurantId", async (req: Request, res: Response) => {
    try {
        const restaurantId = req.params.restaurantId as string;

        const items = await MenuItem.find({
            restaurantId,
            isAvailable: true,
        })
            .sort({ category: 1, sortOrder: 1, name: 1 })
            .lean();

        // Group by category for frontend
        const grouped: Record<string, any[]> = {};
        for (const item of items) {
            const cat = item.category;
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({
                _id: item._id,
                name: item.name,
                description: item.description,
                price: item.pricePaisa / 100,
                pricePaisa: item.pricePaisa,
                image: item.image,
                dietaryTags: item.dietaryTags,
                isPopular: item.isPopular,
            });
        }

        successResponse(res, {
            restaurantId,
            totalItems: items.length,
            menu: grouped,
        });
    } catch (err) {
        errorResponse(res, "Failed to fetch menu.", 500);
    }
});


/**
 * POST /api/v1/menu-items
 * Owner/Admin: Create a menu item.
 */
router.post(
    "/",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const { restaurantId, name, description, pricePaisa, category, image, dietaryTags, isPopular, sortOrder } = req.body;

            if (!restaurantId || !name || !pricePaisa) {
                errorResponse(res, "restaurantId, name, and pricePaisa are required.", 400);
                return;
            }

            // Verify ownership
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Restaurant not found or not yours.", 403);
                    return;
                }
            }

            const item = await MenuItem.create({
                restaurantId,
                name,
                description: description || "",
                pricePaisa,
                category: category || "Main Course",
                image: image || "",
                dietaryTags: dietaryTags || [],
                isPopular: isPopular || false,
                sortOrder: sortOrder || 0,
            });

            successResponse(res, item, 201);
        } catch (err) {
            errorResponse(res, "Failed to create menu item.", 500);
        }
    }
);

/**
 * PATCH /api/v1/menu-items/:id
 * Owner/Admin: Update a menu item.
 */
router.patch(
    "/:id",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const item = await MenuItem.findById(id);
            if (!item) {
                errorResponse(res, "Item not found.", 404);
                return;
            }

            // Verify ownership
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: item.restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Not authorized.", 403);
                    return;
                }
            }

            const allowedFields = ["name", "description", "pricePaisa", "category", "image", "dietaryTags", "isAvailable", "isPopular", "sortOrder"];
            const update: any = {};
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) update[field] = req.body[field];
            }

            const updated = await MenuItem.findByIdAndUpdate(id, { $set: update }, { new: true });
            successResponse(res, updated);
        } catch (err) {
            errorResponse(res, "Failed to update menu item.", 500);
        }
    }
);

/**
 * DELETE /api/v1/menu-items/:id
 * Owner/Admin: Delete a menu item.
 */
router.delete(
    "/:id",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const item = await MenuItem.findById(id);
            if (!item) {
                errorResponse(res, "Item not found.", 404);
                return;
            }

            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: item.restaurantId, ownerId: req.user!.id });
                if (!rest) {
                    errorResponse(res, "Not authorized.", 403);
                    return;
                }
            }

            await MenuItem.findByIdAndDelete(id);
            successResponse(res, { message: "Menu item deleted." });
        } catch (err) {
            errorResponse(res, "Failed to delete menu item.", 500);
        }
    }
);

/**
 * POST /api/v1/menu-items/extract
 * Owner/Admin: Extract menu items from image URL using AI.
 */
router.post(
    "/extract",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const { imageUrl } = req.body;
            if (!imageUrl) return errorResponse(res, "imageUrl is required.", 400);

            console.log(`[Menu Extract] User ${req.user!.id} requesting extraction for: ${imageUrl.substring(0, 80)}...`);
            const result = await extractMenuFromImage(imageUrl);
            console.log(`[Menu Extract] Successfully extracted ${result.items.length} items`);
            successResponse(res, {
                items: result.items,
                menuOverview: result.menuOverview || "",
                categoryOverviews: result.categoryOverviews || {},
            });
        } catch (err: any) {
            console.error("[Menu Extract] Failed:", err.message);
            errorResponse(res, err.message || "AI extraction failed due to an internal error.", 500);
        }
    }
);



/**
 * POST /api/v1/menu-items/bulk
 * Owner/Admin: Save multiple menu items (from AI extraction).
 */
router.post(
    "/bulk",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const { restaurantId, items } = req.body;
            if (!restaurantId || !Array.isArray(items) || items.length === 0) {
                return errorResponse(res, "restaurantId and a non-empty items array are required.", 400);
            }

            // Verify ownership
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) return errorResponse(res, "Unauthorized.", 403);
            }

            const validCategories = new Set(MENU_CATEGORIES as readonly string[]);

            const itemsToCreate = items
                .filter((item: any) => item && item.name)
                .map((item: any) => {
                    // Ensure category is valid — fall back to "Main Course"
                    const category = validCategories.has(item.category) ? item.category : "Main Course";

                    // Ensure pricePaisa is set
                    const pricePaisa = item.pricePaisa || (item.price ? Math.round(item.price * 100) : 0);

                    return {
                        restaurantId,
                        name: String(item.name).trim(),
                        description: String(item.description || "").trim(),
                        pricePaisa,
                        category,
                        image: item.image || undefined,
                        dietaryTags: Array.isArray(item.dietaryTags) ? item.dietaryTags : [],
                        isAvailable: true,
                        isPopular: item.isPopular || false,
                        sortOrder: item.sortOrder || 0,
                    };
                });

            if (itemsToCreate.length === 0) {
                return errorResponse(res, "No valid items to save.", 400);
            }

            console.log(`[Menu Bulk] Saving ${itemsToCreate.length} items for restaurant ${restaurantId}`);
            const created = await MenuItem.insertMany(itemsToCreate, { ordered: false });
            console.log(`[Menu Bulk] Successfully saved ${created.length} items`);
            successResponse(res, { count: created.length, items: created }, 201);
        } catch (err: any) {
            console.error("[Menu Bulk] Save failed:", err.message);
            errorResponse(res, err.message || "Bulk save failed.", 500);
        }
    }
);

/**
 * PATCH /api/v1/menu-items/bulk-sort
 * Owner/Admin: Bulk update sort orders.
 */
router.patch(
    "/bulk-sort",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const { restaurantId, sortedItems } = req.body;
            if (!restaurantId || !Array.isArray(sortedItems)) {
                return errorResponse(res, "restaurantId and sortedItems array are required.", 400);
            }

            // Verify ownership
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) return errorResponse(res, "Unauthorized.", 403);
            }

            // Perform bulk write
            // sortedItems = [{ _id: '...', sortOrder: 0 }, { _id: '...', sortOrder: 1 }]
            const bulkOps = sortedItems.map((item: any) => ({
                updateOne: {
                    filter: { _id: item._id, restaurantId },
                    update: { $set: { sortOrder: item.sortOrder } }
                }
            }));

            if (bulkOps.length > 0) {
                await MenuItem.bulkWrite(bulkOps);
            }

            successResponse(res, { message: "Sort orders updated successfully." });
        } catch (err) {
            errorResponse(res, "Bulk sort update failed.", 500);
        }
    }
);

/**
 * POST /api/v1/menu-items/bulk-delete
 * Owner/Admin: Bulk delete menu items.
 */
router.post(
    "/bulk-delete",
    authenticate,
    authorize("owner", "admin"),
    async (req: Request, res: Response) => {
        try {
            const { restaurantId, itemIds } = req.body;
            if (!restaurantId || !Array.isArray(itemIds) || itemIds.length === 0) {
                return errorResponse(res, "restaurantId and itemIds array are required.", 400);
            }

            // Verify ownership
            if (req.user!.role === "owner") {
                const rest = await Restaurant.findOne({ _id: restaurantId, ownerId: req.user!.id });
                if (!rest) return errorResponse(res, "Unauthorized.", 403);
            }

            const result = await MenuItem.deleteMany({ _id: { $in: itemIds }, restaurantId });

            successResponse(res, { message: `${result.deletedCount} menu items deleted successfully.` });
        } catch (err) {
            errorResponse(res, "Bulk delete failed.", 500);
        }
    }
);

export default router;
