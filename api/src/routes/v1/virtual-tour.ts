/**
 * Virtual Tour Routes — Session creation + webhook endpoints
 *
 * The heavy lifting (capture, stitch, view) is handled by the Python FastAPI
 * microservice at fastapi.foodiespakistan.pk. This Node.js backend:
 *  1. Creates HMAC-signed capture sessions for the Python app
 *  2. Receives webhook callbacks from Python app after stitching
 *  3. Manages tour data (publish/unpublish, delete scenes)
 *  4. Serves tour data for the public viewer
 */

import express from "express";
import crypto from "crypto";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { Restaurant } from "../../models/Restaurant";
import { env } from "../../config/env";

const router = express.Router();

// ── HMAC Token Creation ──
function createCaptureToken(
    restaurantId: string,
    userId: string,
    sceneName: string,
    callbackUrl: string
): string {
    const sessionId = crypto.randomUUID().replace(/-/g, "");
    const expiry = Math.floor(Date.now() / 1000) + 20 * 60; // 20 min

    const payload: Record<string, any> = {
        cb: callbackUrl,
        exp: expiry,
        name: sceneName,
        rid: restaurantId,
        sid: sessionId,
        uid: userId,
    };

    // Sort keys for deterministic JSON (must match Python)
    const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());

    const signature = crypto
        .createHmac("sha256", env.VR_TOUR_SECRET)
        .update(payloadJson)
        .digest("hex");

    const tokenPayload = Buffer.from(payloadJson).toString("base64url");
    return `${tokenPayload}.${signature}`;
}

/**
 * @route   POST /api/v1/virtual-tour/:restaurantId/create-session
 * @desc    Create a capture session and return redirect URL to Python app
 * @access  Private (Owner/Admin)
 */
router.post(
    "/:restaurantId/create-session",
    authenticate,
    authorize("owner", "admin"),
    async (req: express.Request, res: express.Response) => {
        try {
            const { restaurantId } = req.params;
            const { sceneName } = req.body;

            const restaurant = await Restaurant.findById(restaurantId);
            if (!restaurant) {
                return res.status(404).json({ success: false, error: "Restaurant not found" });
            }

            // Check scene limit (max 20 scenes)
            const currentScenes = (restaurant as any).virtualTour?.scenes?.length || 0;
            if (currentScenes >= 20) {
                return res.status(400).json({
                    success: false,
                    error: "Maximum 20 scenes per restaurant. Please delete existing scenes first.",
                });
            }

            const userId = req.user?.id || "unknown";
            const callbackUrl = `${req.headers.origin || ""}/owner/virtual-tour`;

            const token = createCaptureToken(
                restaurantId as string,
                userId,
                sceneName || "New Scene",
                callbackUrl
            );

            const captureUrl = `${env.VR_TOUR_APP_URL}/vr-tour/capture/${token}`;

            res.json({
                success: true,
                captureUrl,
                message: "Redirect to capture URL to start 360° capture.",
            });
        } catch (error) {
            console.error("[Virtual Tour] Create session error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }
);

/**
 * @route   POST /api/v1/virtual-tour/:restaurantId/save-tour
 * @desc    Webhook from Python app — saves stitched scene data to MongoDB
 * @access  Internal (x-app-internal-secret)
 */
router.post(
    "/:restaurantId/save-tour",
    authenticate, // This checks x-app-internal-secret header
    async (req: express.Request, res: express.Response) => {
        try {
            const { restaurantId } = req.params;
            const { sceneId, name, panoramaUrl, thumbnailUrl, width, height } = req.body;

            if (!panoramaUrl || !sceneId) {
                return res.status(400).json({ success: false, error: "Missing required fields" });
            }

            const restaurant = await Restaurant.findById(restaurantId);
            if (!restaurant) {
                return res.status(404).json({ success: false, error: "Restaurant not found" });
            }

            // Initialize virtualTour if not exists
            if (!restaurant.virtualTour) {
                (restaurant as any).virtualTour = { status: "ready", scenes: [] };
            }

            // Add scene
            (restaurant as any).virtualTour.scenes.push({
                id: sceneId,
                name: name || "Scene",
                panoramaUrl,
                thumbnailUrl: thumbnailUrl || "",
                hotspots: [],
                initialView: { pitch: 0, yaw: 0, hfov: 110 },
                createdAt: new Date(),
            });

            // Set default scene if this is the first one
            if (!(restaurant as any).virtualTour.defaultSceneId) {
                (restaurant as any).virtualTour.defaultSceneId = sceneId;
            }

            (restaurant as any).virtualTour.status = "ready";
            await restaurant.save();

            console.log(`[Virtual Tour] Scene "${name}" saved for restaurant ${restaurantId}`);

            res.json({ success: true, message: "Scene saved successfully" });
        } catch (error) {
            console.error("[Virtual Tour] Save tour error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }
);

/**
 * @route   GET /api/v1/virtual-tour/:restaurantId/tour-data
 * @desc    Get full tour data for the viewer (used by Python app and frontend)
 * @access  Public (but only returns published tours) or Internal
 */
router.get("/:restaurantId/tour-data", async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.restaurantId)
            .select("virtualTour name brandName branchName")
            .lean();

        if (!restaurant) {
            return res.status(404).json({ success: false, error: "Restaurant not found" });
        }

        const tour = (restaurant as any).virtualTour;

        // Allow internal access (Python app) to any status
        const isInternal = req.headers["x-app-internal-secret"] === env.INTERNAL_SECRET;

        if (!tour || (!isInternal && tour.status !== "published")) {
            return res.status(404).json({ success: false, error: "No published tour" });
        }

        if (!tour.scenes || tour.scenes.length === 0) {
            return res.status(404).json({ success: false, error: "No scenes available" });
        }

        res.json({
            success: true,
            data: {
                restaurantName: (restaurant as any).name ||
                    `${(restaurant as any).brandName} — ${(restaurant as any).branchName}`,
                status: tour.status,
                defaultSceneId: tour.defaultSceneId || tour.scenes[0]?.id,
                scenes: tour.scenes.map((s: any) => ({
                    id: s.id || s._id?.toString(),
                    name: s.name,
                    panoramaUrl: s.panoramaUrl,
                    thumbnailUrl: s.thumbnailUrl,
                    hotspots: s.hotspots || [],
                    initialView: s.initialView || { pitch: 0, yaw: 0, hfov: 110 },
                })),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

/**
 * @route   GET /api/v1/virtual-tour/:restaurantId/status
 * @desc    Get tour status and scenes for owner dashboard
 * @access  Public (read-only status check)
 */
router.get("/:restaurantId/status", async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.restaurantId)
            .select("virtualTour")
            .lean();

        if (!restaurant) {
            return res.status(404).json({ success: false, error: "Restaurant not found" });
        }

        const tour = (restaurant as any).virtualTour;

        res.json({
            success: true,
            status: tour?.status || "idle",
            scenes: (tour?.scenes || []).map((s: any) => ({
                id: s.id || s._id?.toString(),
                name: s.name,
                panoramaUrl: s.panoramaUrl,
                thumbnailUrl: s.thumbnailUrl,
                createdAt: s.createdAt,
            })),
            defaultSceneId: tour?.defaultSceneId || null,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

/**
 * @route   PUT /api/v1/virtual-tour/:restaurantId/publish
 * @desc    Publish or unpublish the virtual tour
 * @access  Private (Owner/Admin)
 */
router.put(
    "/:restaurantId/publish",
    authenticate,
    authorize("owner", "admin"),
    async (req: express.Request, res: express.Response) => {
        try {
            const { restaurantId } = req.params;
            const { publish } = req.body;

            const restaurant = await Restaurant.findById(restaurantId);
            if (!restaurant) {
                return res.status(404).json({ success: false, error: "Restaurant not found" });
            }
            if (!(restaurant as any).virtualTour?.scenes?.length) {
                return res.status(400).json({ success: false, error: "No scenes available to publish" });
            }

            (restaurant as any).virtualTour.status = publish ? "published" : "ready";
            await restaurant.save();

            res.json({
                success: true,
                message: publish ? "Tour published successfully!" : "Tour unpublished.",
                status: (restaurant as any).virtualTour.status,
            });
        } catch (error) {
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }
);

/**
 * @route   DELETE /api/v1/virtual-tour/:restaurantId/scene/:sceneId
 * @desc    Delete a single scene by ID
 * @access  Private (Owner/Admin)
 */
router.delete(
    "/:restaurantId/scene/:sceneId",
    authenticate,
    authorize("owner", "admin"),
    async (req: express.Request, res: express.Response) => {
        try {
            const { restaurantId, sceneId } = req.params;

            const restaurant = await Restaurant.findById(restaurantId);
            if (!restaurant || !(restaurant as any).virtualTour?.scenes) {
                return res.status(404).json({ success: false, error: "Not found" });
            }

            const before = (restaurant as any).virtualTour.scenes.length;
            (restaurant as any).virtualTour.scenes = (restaurant as any).virtualTour.scenes
                .filter((s: any) => {
                    const sid = s.id || s._id?.toString();
                    return sid !== sceneId;
                });

            if ((restaurant as any).virtualTour.scenes.length === before) {
                return res.status(404).json({ success: false, error: "Scene not found" });
            }

            if ((restaurant as any).virtualTour.scenes.length === 0) {
                (restaurant as any).virtualTour.status = "idle";
                (restaurant as any).virtualTour.defaultSceneId = undefined;
            } else if ((restaurant as any).virtualTour.defaultSceneId === sceneId) {
                // Set new default
                (restaurant as any).virtualTour.defaultSceneId =
                    (restaurant as any).virtualTour.scenes[0]?.id;
            }

            await restaurant.save();

            res.json({ success: true, message: "Scene deleted" });
        } catch (error) {
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }
);

/**
 * @route   PUT /api/v1/virtual-tour/:restaurantId/scene/:sceneId/hotspots
 * @desc    Save hotspot array for a scene (from hotspot editor)
 * @access  Private (Owner/Admin)
 */
router.put(
    "/:restaurantId/scene/:sceneId/hotspots",
    authenticate,
    authorize("owner", "admin"),
    async (req: express.Request, res: express.Response) => {
        try {
            const { restaurantId, sceneId } = req.params;
            const { hotspots } = req.body;

            if (!Array.isArray(hotspots)) {
                return res.status(400).json({ success: false, error: "hotspots must be an array" });
            }

            // Validate each hotspot
            for (const hs of hotspots) {
                if (!hs.type || !["scene", "info"].includes(hs.type)) {
                    return res.status(400).json({ success: false, error: "Invalid hotspot type" });
                }
                if (hs.type === "scene" && !hs.targetSceneId) {
                    return res.status(400).json({ success: false, error: "Scene hotspot requires targetSceneId" });
                }
                if (typeof hs.pitch !== "number" || typeof hs.yaw !== "number") {
                    return res.status(400).json({ success: false, error: "Hotspot requires pitch and yaw" });
                }
            }

            const restaurant = await Restaurant.findById(restaurantId);
            if (!restaurant || !(restaurant as any).virtualTour?.scenes) {
                return res.status(404).json({ success: false, error: "Not found" });
            }

            const scene = (restaurant as any).virtualTour.scenes.find(
                (s: any) => (s.id || s._id?.toString()) === sceneId
            );
            if (!scene) {
                return res.status(404).json({ success: false, error: "Scene not found" });
            }

            // Save hotspots
            scene.hotspots = hotspots.map((hs: any, i: number) => ({
                id: hs.id || `hs_${Date.now()}_${i}`,
                type: hs.type,
                pitch: hs.pitch,
                yaw: hs.yaw,
                targetSceneId: hs.targetSceneId || undefined,
                text: hs.text || "",
            }));

            await restaurant.save();

            console.log(`[Virtual Tour] ${hotspots.length} hotspots saved for scene ${sceneId}`);

            res.json({
                success: true,
                message: `${hotspots.length} hotspots saved`,
                hotspots: scene.hotspots,
            });
        } catch (error) {
            console.error("[Virtual Tour] Save hotspots error:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }
);

/**
 * @route   PUT /api/v1/virtual-tour/:restaurantId/scene/:sceneId/initial-view
 * @desc    Save initial camera angle for a scene
 * @access  Private (Owner/Admin)
 */
router.put(
    "/:restaurantId/scene/:sceneId/initial-view",
    authenticate,
    authorize("owner", "admin"),
    async (req: express.Request, res: express.Response) => {
        try {
            const { restaurantId, sceneId } = req.params;
            const { pitch, yaw, hfov } = req.body;

            const restaurant = await Restaurant.findById(restaurantId);
            if (!restaurant || !(restaurant as any).virtualTour?.scenes) {
                return res.status(404).json({ success: false, error: "Not found" });
            }

            const scene = (restaurant as any).virtualTour.scenes.find(
                (s: any) => (s.id || s._id?.toString()) === sceneId
            );
            if (!scene) {
                return res.status(404).json({ success: false, error: "Scene not found" });
            }

            scene.initialView = {
                pitch: typeof pitch === "number" ? pitch : 0,
                yaw: typeof yaw === "number" ? yaw : 0,
                hfov: typeof hfov === "number" ? Math.min(120, Math.max(50, hfov)) : 110,
            };

            await restaurant.save();

            res.json({ success: true, message: "Initial view saved", initialView: scene.initialView });
        } catch (error) {
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }
);

/**
 * @route   PUT /api/v1/virtual-tour/:restaurantId/default-scene
 * @desc    Set which scene loads first
 * @access  Private (Owner/Admin)
 */
router.put(
    "/:restaurantId/default-scene",
    authenticate,
    authorize("owner", "admin"),
    async (req: express.Request, res: express.Response) => {
        try {
            const { restaurantId } = req.params;
            const { sceneId } = req.body;

            if (!sceneId) {
                return res.status(400).json({ success: false, error: "sceneId required" });
            }

            const restaurant = await Restaurant.findById(restaurantId);
            if (!restaurant || !(restaurant as any).virtualTour?.scenes) {
                return res.status(404).json({ success: false, error: "Not found" });
            }

            const sceneExists = (restaurant as any).virtualTour.scenes.some(
                (s: any) => (s.id || s._id?.toString()) === sceneId
            );
            if (!sceneExists) {
                return res.status(404).json({ success: false, error: "Scene not found" });
            }

            (restaurant as any).virtualTour.defaultSceneId = sceneId;
            await restaurant.save();

            res.json({ success: true, message: "Default scene updated" });
        } catch (error) {
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }
);

/**
 * @route   GET /api/v1/virtual-tour/:restaurantId/scene/:sceneId
 * @desc    Get single scene data (for hotspot editor)
 * @access  Private (Owner/Admin)
 */
router.get(
    "/:restaurantId/scene/:sceneId",
    authenticate,
    authorize("owner", "admin"),
    async (req: express.Request, res: express.Response) => {
        try {
            const { restaurantId, sceneId } = req.params;

            const restaurant = await Restaurant.findById(restaurantId)
                .select("virtualTour name brandName branchName")
                .lean();

            if (!restaurant || !(restaurant as any).virtualTour?.scenes) {
                return res.status(404).json({ success: false, error: "Not found" });
            }

            const scene = (restaurant as any).virtualTour.scenes.find(
                (s: any) => (s.id || s._id?.toString()) === sceneId
            );
            if (!scene) {
                return res.status(404).json({ success: false, error: "Scene not found" });
            }

            // Return scene data + all other scene names for the hotspot target dropdown
            const otherScenes = (restaurant as any).virtualTour.scenes
                .filter((s: any) => (s.id || s._id?.toString()) !== sceneId)
                .map((s: any) => ({
                    id: s.id || s._id?.toString(),
                    name: s.name,
                    thumbnailUrl: s.thumbnailUrl || "",
                }));

            res.json({
                success: true,
                scene: {
                    id: scene.id || scene._id?.toString(),
                    name: scene.name,
                    panoramaUrl: scene.panoramaUrl,
                    thumbnailUrl: scene.thumbnailUrl || "",
                    hotspots: scene.hotspots || [],
                    initialView: scene.initialView || { pitch: 0, yaw: 0, hfov: 110 },
                },
                otherScenes,
            });
        } catch (error) {
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }
);

export default router;
