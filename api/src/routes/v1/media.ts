/**
 * Media API Routes — Admin Media Library backend.
 *
 * Provides CRUD operations for the Media collection:
 * - List all media (paginated, searchable)
 * - Get single media item
 * - Delete media (removes from CDN + DB)
 * - Get ALT text for a URL
 * - Trigger ALT text regeneration
 */

import { Router, Request, Response } from "express";
import Media from "../../models/Media";
import { cdnClient } from "../../services/cdn-client";
import { generateAltText, processMediaUpload } from "../../services/ai-alt-service";

const router = Router();

/**
 * POST /api/v1/media/process — Internal endpoint called by Next.js after CDN upload.
 * Creates a Media document and triggers AI ALT text generation.
 * Secured by x-internal-secret header.
 */
router.post("/process", async (req: Request, res: Response) => {
    try {
        const secret = req.headers["x-internal-secret"] as string;
        const expectedSecret = process.env.INTERNAL_SECRET || "foodies_internal_bypass_secure_key_2024";
        if (secret !== expectedSecret) {
            res.status(403).json({ success: false, error: "Forbidden" });
            return;
        }

        // Fire-and-forget — respond immediately
        res.json({ success: true, message: "Processing started." });

        // Process in background
        await processMediaUpload(req.body);
    } catch (err: any) {
        console.error("[Media API] Process error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: "Failed to process media." });
        }
    }
});

/**
 * GET /api/v1/media — List all media (paginated)
 * Query: page, limit, search, type
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || "40", 10)));
        const search = (req.query.search as string || "").trim();
        const type = req.query.type as string;

        const filter: any = {};
        if (search) {
            filter.$text = { $search: search };
        }
        if (type && ["image", "video"].includes(type)) {
            filter.type = type;
        }

        const [items, total] = await Promise.all([
            Media.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Media.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: {
                items,
                total,
                page,
                limit,
                hasMore: page * limit < total,
            },
        });
    } catch (err: any) {
        console.error("[Media API] List error:", err);
        res.status(500).json({ success: false, error: "Failed to list media." });
    }
});

/**
 * GET /api/v1/media/alt — Get ALT text for a URL
 * Query: url
 */
router.get("/alt", async (req: Request, res: Response) => {
    try {
        const url = req.query.url as string;
        if (!url) {
            res.status(400).json({ success: false, error: "Missing url parameter." });
            return;
        }

        const media = await Media.findOne({ url }).select("altText altTextStatus").lean();
        res.json({
            success: true,
            data: {
                altText: media?.altText || "",
                status: media?.altTextStatus || "unknown",
            },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: "Failed to get alt text." });
    }
});

/**
 * POST /api/v1/media/:id/regenerate-alt — Re-generate ALT text
 */
router.post("/:id/regenerate-alt", async (req: Request, res: Response) => {
    try {
        const media = await Media.findById(req.params.id);
        if (!media) {
            res.status(404).json({ success: false, error: "Media not found." });
            return;
        }

        if (media.type === "video") {
            res.status(400).json({ success: false, error: "Cannot generate alt text for videos." });
            return;
        }

        await Media.updateOne({ _id: media._id }, { $set: { altTextStatus: "pending" } });

        // Fire-and-forget
        generateAltText(media.url)
            .then(async (altText) => {
                await Media.updateOne(
                    { _id: media._id },
                    { $set: { altText, altTextStatus: "generated" } }
                );
            })
            .catch(async () => {
                await Media.updateOne(
                    { _id: media._id },
                    { $set: { altTextStatus: "failed" } }
                );
            });

        res.json({ success: true, message: "ALT text regeneration started." });
    } catch (err: any) {
        res.status(500).json({ success: false, error: "Failed to regenerate alt text." });
    }
});

/**
 * GET /api/v1/media/:id — Get single media item
 */
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const media = await Media.findById(req.params.id).lean();
        if (!media) {
            res.status(404).json({ success: false, error: "Media not found." });
            return;
        }
        res.json({ success: true, data: media });
    } catch (err: any) {
        res.status(500).json({ success: false, error: "Failed to get media." });
    }
});

/**
 * DELETE /api/v1/media/:id — Delete media from CDN + DB
 */
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const media = await Media.findById(req.params.id);
        if (!media) {
            res.status(404).json({ success: false, error: "Media not found." });
            return;
        }

        // Delete from CDN
        try {
            await cdnClient.deleteImage(media.url);
            if (media.thumbUrl) {
                await cdnClient.deleteImage(media.thumbUrl);
            }
        } catch (cdnErr: any) {
            console.warn("[Media API] CDN delete warning:", cdnErr.message);
            // Continue even if CDN delete fails
        }

        // Delete from DB
        await Media.deleteOne({ _id: media._id });

        res.json({ success: true, message: "Media deleted." });
    } catch (err: any) {
        console.error("[Media API] Delete error:", err);
        res.status(500).json({ success: false, error: "Failed to delete media." });
    }
});

export default router;
