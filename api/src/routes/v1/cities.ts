import { Router, Request, Response } from "express";
import { City } from "../../models/City";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";
import { regenerateAllSeoPages } from "../../utils/seo-page-generator";

const router = Router();

// GET /api/v1/cities/detect
// Detect nearest city from lat/lng using Haversine distance
router.get("/detect", async (req: Request, res: Response) => {
    try {
        const lat = parseFloat(req.query.lat as string || "0");
        const lng = parseFloat(req.query.lng as string || "0");

        if (!lat || !lng) {
            errorResponse(res, "Missing lat/lng", 400);
            return;
        }

        const cities = await City.find({ isActive: true }).lean();
        if (cities.length === 0) {
            successResponse(res, { slug: "lahore", name: "Lahore" });
            return;
        }

        // Haversine formula
        const R = 6371; // Earth radius in km
        let nearest = cities[0] as any;
        let minDist = Infinity;

        for (const c of cities) {
            const city = c as any;
            if (!city.latitude || !city.longitude) continue;

            const dLat = (city.latitude - lat) * Math.PI / 180;
            const dLng = (city.longitude - lng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(city.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
            const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            if (dist < minDist) { minDist = dist; nearest = city; }
        }

        successResponse(res, { slug: nearest.slug, name: nearest.name, distance: Math.round(minDist) });
    } catch {
        successResponse(res, { slug: "lahore", name: "Lahore" });
    }
});

// GET all active cities
router.get("/", async (req: Request, res: Response) => {
    try {
        const cities = await City.find({ isActive: true }).sort({ order: 1 }).lean();
        successResponse(res, cities);
    } catch (err) {
        successResponse(res, []); // Matching original frontend behavior 
    }
});

// POST create new city (Admin)
router.post("/", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const slug = body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const city = await City.create({ ...body, slug });
        regenerateAllSeoPages().catch(() => { });
        successResponse(res, city, 201);
    } catch (err: any) {
        if (err.code === 11000) {
            errorResponse(res, "City already exists", 409);
        } else {
            errorResponse(res, "Failed to create city", 500);
        }
    }
});

// PUT update city (Admin)
router.put("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const body = req.body;
        if (body.name) {
            body.slug = body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        }
        const updated = await City.findByIdAndUpdate(id, body, { new: true });
        if (!updated) {
            errorResponse(res, "Not found", 404);
            return;
        }
        successResponse(res, updated);
    } catch (err) {
        errorResponse(res, "Failed to update", 500);
    }
});

// DELETE city (Admin)
router.delete("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await City.findByIdAndDelete(id);
        successResponse(res, { success: true });
    } catch (err) {
        errorResponse(res, "Failed to delete", 500);
    }
});

export default router;





