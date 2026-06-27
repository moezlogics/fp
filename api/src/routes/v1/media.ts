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
import { env } from "../../config/env";
import axios from "axios";
import mongoose from "mongoose";

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

        // 1. Fetch files from CDN first (WordPress-like library behaviour)
        const cdnUrl = env.CDN_BASE_URL || "https://cdn.foodiespakistan.pk";
        const cdnKey = env.CDN_API_KEY || "fpk-cdn-secret-key-change-in-production";

        let files: any[] = [];
        let total = 0;
        let hasMore = false;

        try {
            const queryParams = new URLSearchParams({ page: String(page), limit: String(limit) });
            const cdnRes = await axios.get(`${cdnUrl}/api/media/list?${queryParams}`, {
                headers: { "x-cdn-key": cdnKey }
            });
            if (cdnRes.data && cdnRes.data.success) {
                files = cdnRes.data.data.files || [];
                total = cdnRes.data.data.total || 0;
                hasMore = cdnRes.data.data.hasMore || false;
            }
        } catch (err: any) {
            console.error("[Media API] Failed to fetch list from CDN:", err.message);
        }

        if (files.length === 0) {
            // Fallback to database query if CDN is unreachable or empty
            const filter: any = {};
            if (search) filter.$text = { $search: search };
            if (type && ["image", "video"].includes(type)) filter.type = type;

            const [dbItems, dbTotal] = await Promise.all([
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
                    items: dbItems,
                    total: dbTotal,
                    page,
                    limit,
                    hasMore: page * limit < dbTotal,
                },
            });
            return;
        }

        // 2. Query MongoDB for existing media details for these URLs
        const urls = files.map(f => f.url);
        const dbMedia = await Media.find({ url: { $in: urls } }).lean();
        const dbMediaMap = new Map<string, any>();
        dbMedia.forEach(m => dbMediaMap.set(m.url, m));

        // 3. For any files not present in MongoDB, register them in background (Auto-Sync!)
        const missingMedia: any[] = [];
        const enrichedItems = files.map(file => {
            const dbItem = dbMediaMap.get(file.url);
            if (dbItem) {
                return {
                    ...file,
                    _id: dbItem._id,
                    altText: dbItem.altText || "",
                    altTextStatus: dbItem.altTextStatus || "pending",
                };
            } else {
                // Prepare to auto-register
                const newDoc = {
                    url: file.url,
                    thumbUrl: file.thumbUrl || null,
                    filename: file.filename,
                    originalFilename: file.filename,
                    type: file.type || "image",
                    format: file.filename.split(".").pop() || "webp",
                    width: null,
                    height: null,
                    sizeBytes: file.sizeBytes || null,
                    altTextStatus: "pending", // let AI alt service generate in background
                    altText: "",
                    createdAt: new Date(file.createdAt || Date.now()),
                    updatedAt: new Date(),
                };
                missingMedia.push(newDoc);
                return {
                    ...file,
                    _id: new mongoose.Types.ObjectId().toString(), // temp ID for UI key
                    altText: "",
                    altTextStatus: "pending",
                };
            }
        });

        if (missingMedia.length > 0) {
            // Auto-register asynchronously (fire-and-forget)
            Media.insertMany(missingMedia)
                .then(async (docs) => {
                    console.log(`[Media API] Auto-registered ${docs.length} missing files from CDN.`);
                    // Trigger AI Alt Text generation for each newly registered image
                    for (const doc of docs) {
                        if (doc.type === "image") {
                            generateAltText(doc.url)
                                .then(async (altText: string) => {
                                    await Media.updateOne({ _id: doc._id }, { $set: { altText, altTextStatus: "generated" } });
                                    console.log(`[AI ALT] ✅ Auto-generated for ${doc.filename}: "${altText}"`);
                                })
                                .catch((e: any) => {
                                    console.error(`[AI ALT] ❌ Auto-failed for ${doc.filename}:`, e.message);
                                    Media.updateOne({ _id: doc._id }, { $set: { altTextStatus: "failed" } }).exec();
                                });
                        }
                    }
                })
                .catch(err => {
                    console.error("[Media API] Auto-register failed:", err.message);
                });
        }

        // 4. Return enriched items matching the frontend structure
        res.json({
            success: true,
            data: {
                items: enrichedItems,
                total,
                page,
                limit,
                hasMore,
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
