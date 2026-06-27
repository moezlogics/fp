/**
 * Media Upload Route — POST /api/media/upload
 *
 * Unified media upload endpoint for images AND videos.
 *
 * Flow:
 * 1. Multer receives the file into memory (buffer).
 * 2. File signature is validated (magic bytes — blocks executables).
 * 3. Images: Sharp converts to WebP with full-size + thumbnail.
 *    Videos: Saved as-is with sanitized filename.
 * 4. Returns the public URL for the database to store.
 *
 * Body (form-data):
 *   - image OR media: File (required, max 50MB for video, 10MB for images)
 *   - slug: String (required, e.g. "salt-n-pepper-dha")
 *
 * Response:
 *   {
 *     success: true,
 *     data: {
 *       url:       "http://localhost:3001/uploads/slug-timestamp.webp",
 *       thumbUrl:  "http://localhost:3001/uploads/slug-timestamp-thumb.webp",  // images only
 *       filename:  "slug-timestamp.webp",
 *       type:      "image" | "video",
 *       format:    "JPEG" | "PNG" | "MP4" | etc.
 *     }
 *   }
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { nanoid } from "nanoid";
import { env } from "../config/env";
import { authGuard } from "../middleware/auth-guard";
import { uploadRateLimiter } from "../middleware/rate-limiter";
import { validateFileSignature } from "../utils/file-signature";
import { processImage } from "../services/image-processor";

const router = Router();

// Multer with memory storage — file buffer stays in RAM
// Limit synced with env.MAX_FILE_SIZE_MB for consistency
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, // Synced with env config
        files: 1,
    },
    fileFilter: (req, file, cb) => {
        // Basic MIME type validation
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm', 'video/quicktime'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed`));
        }
    }
});

/**
 * Sanitize slug to prevent path traversal and ensure SEO-friendly filenames.
 * Only allows lowercase letters, numbers, and hyphens.
 */
function sanitizeSlug(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 100);
}

/**
 * Map detected format to file extension
 */
function formatToExtension(format: string): string {
    const map: Record<string, string> = {
        JPEG: "jpg", PNG: "png", WebP: "webp", GIF: "gif", BMP: "bmp",
        MP4: "mp4", MOV: "mov", WebM: "webm", AVI: "avi",
    };
    return map[format] || "bin";
}

router.post(
    "/upload",
    uploadRateLimiter,
    authGuard,
    // Accept both 'image' and 'media' field names for backwards compat
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "media", maxCount: 1 },
    ]),
    async (req: Request, res: Response): Promise<void> => {
        try {
            // ── 1. Extract file from either field ──
            const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
            const file = files?.["image"]?.[0] || files?.["media"]?.[0];

            if (!file) {
                res.status(400).json({
                    success: false,
                    error: 'No file uploaded. Send a file with field name "image" or "media".',
                });
                return;
            }

            // ── 2. Validate slug ──
            const rawSlug = req.body?.slug as string;
            if (!rawSlug || typeof rawSlug !== "string" || rawSlug.trim().length < 2) {
                res.status(400).json({
                    success: false,
                    error: 'Missing or invalid "slug" parameter. Must be at least 2 characters.',
                });
                return;
            }

            const slug = sanitizeSlug(rawSlug);
            if (slug.length < 2) {
                res.status(400).json({
                    success: false,
                    error: "Slug contains no valid characters after sanitization.",
                });
                return;
            }

            // ── 3. Validate file signature (magic bytes) ──
            const signatureCheck = validateFileSignature(file.buffer);
            if (!signatureCheck.valid) {
                res.status(400).json({
                    success: false,
                    error: signatureCheck.error,
                });
                return;
            }

            // ── 4. Extract original filename for SEO ──
            const originalFilename = (req.body?.originalFilename as string) || file.originalname || undefined;

            // ── 5. Process based on type ──
            if (signatureCheck.type === "image") {
                // Enforce image size limit (10MB)
                if (file.buffer.length > env.MAX_FILE_SIZE_MB * 1024 * 1024) {
                    res.status(413).json({
                        success: false,
                        error: `Image exceeds maximum size of ${env.MAX_FILE_SIZE_MB}MB.`,
                    });
                    return;
                }

                const result = await processImage(file.buffer, slug, env.UPLOAD_DIR, originalFilename);

                res.status(201).json({
                    success: true,
                    data: {
                        url: result.fullUrl,
                        thumbUrl: result.thumbUrl,
                        filename: result.filename,
                        thumbFilename: result.thumbFilename,
                        width: result.widthPx,
                        height: result.heightPx,
                        sizeBytes: result.sizeBytes,
                        thumbSizeBytes: result.thumbSizeBytes,
                        format: signatureCheck.format,
                        type: "image",
                        originalFilename: originalFilename || null,
                    },
                });
            } else {
                // ── VIDEO UPLOAD — save raw, no conversion ──
                const maxVideoMB = 100; // Increased to 100MB for better video support
                if (file.buffer.length > maxVideoMB * 1024 * 1024) {
                    res.status(413).json({
                        success: false,
                        error: `Video exceeds maximum size of ${maxVideoMB}MB.`,
                    });
                    return;
                }

                await fs.mkdir(env.UPLOAD_DIR, { recursive: true });

                const shortId = nanoid(8);
                const ext = formatToExtension(signatureCheck.format);
                // Use original filename for SEO-friendly video names
                const videoBaseName = originalFilename
                    ? originalFilename.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").substring(0, 80) || slug
                    : slug;
                const filename = `${videoBaseName}-${shortId}.${ext}`;
                const filePath = path.join(env.UPLOAD_DIR, filename);

                await fs.writeFile(filePath, file.buffer);

                res.status(201).json({
                    success: true,
                    data: {
                        url: `${env.CDN_PUBLIC_URL}/uploads/${filename}`,
                        thumbUrl: null, // No thumbnail for videos
                        filename,
                        sizeBytes: file.buffer.length,
                        format: signatureCheck.format,
                        type: "video",
                        originalFilename: originalFilename || null,
                    },
                });
            }
        } catch (err: any) {
            console.error("[CDN] Upload processing failed:", err);

            if (err.code === "LIMIT_FILE_SIZE") {
                res.status(413).json({
                    success: false,
                    error: "File exceeds maximum allowed size.",
                });
                return;
            }

            res.status(500).json({
                success: false,
                error: "Internal server error during media processing.",
            });
        }
    }
);

/**
 * DELETE /api/media/delete
 *
 * Removes a file and its thumbnail from the uploads directory.
 * Used when replacing profile pictures or cleaning up unused media.
 *
 * Body (JSON):
 *   - filename: String (e.g. "profile-abc123-1709472000000.webp")
 *
 * Security:
 *   - Auth-guarded (x-cdn-key)
 *   - Filename sanitized to prevent path traversal
 *   - Only deletes from the uploads directory
 */
router.delete(
    "/delete",
    authGuard,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { filename } = req.body;

            if (!filename || typeof filename !== "string") {
                res.status(400).json({
                    success: false,
                    error: 'Missing "filename" in request body.',
                });
                return;
            }

            // Sanitize: only allow safe characters, prevent path traversal
            const safeName = path.basename(filename);
            if (safeName !== filename || filename.includes("..")) {
                res.status(400).json({
                    success: false,
                    error: "Invalid filename. Path traversal detected.",
                });
                return;
            }

            const fullPath = path.join(env.UPLOAD_DIR, safeName);
            const thumbName = safeName.replace(/(\.\w+)$/, "-thumb$1");
            const thumbPath = path.join(env.UPLOAD_DIR, thumbName);

            let deleted = false;

            try {
                await fs.unlink(fullPath);
                deleted = true;
                console.log(`[CDN] Deleted: ${safeName}`);
            } catch {
                // File may not exist — that's okay
            }

            try {
                await fs.unlink(thumbPath);
                console.log(`[CDN] Deleted thumb: ${thumbName}`);
            } catch {
                // Thumb may not exist — that's okay
            }

            res.json({
                success: true,
                message: deleted ? "File deleted." : "File not found (may already be deleted).",
            });
        } catch (err: any) {
            console.error("[CDN] Delete failed:", err);
            res.status(500).json({
                success: false,
                error: "Internal server error during file deletion.",
            });
        }
    }
);

/**
 * GET /api/media/list
 *
 * Lists all uploaded media files, sorted by newest first.
 *
 * Query:
 *   - page: number (default 1)
 *   - limit: number (default 50)
 *
 * Security:
 *   - Auth-guarded (x-cdn-key)
 */
router.get(
    "/list",
    authGuard,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
            const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || "50", 10)));
            
            await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
            const allFiles = await fs.readdir(env.UPLOAD_DIR);
            
            // Filter out thumbnails and hidden files
            const mainFiles = allFiles.filter(f => !f.includes("-thumb.") && !f.startsWith("."));
            
            // Get stats to sort by date (newest first)
            const fileStatsPromises = mainFiles.map(async (filename) => {
                const filePath = path.join(env.UPLOAD_DIR, filename);
                try {
                    const stats = await fs.stat(filePath);
                    const isImage = /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(filename);
                    const thumbName = isImage ? filename.replace(/(\.\w+)$/, "-thumb$1") : null;
                    
                    // Check if thumb actually exists
                    let thumbUrl = null;
                    if (thumbName) {
                        try {
                            await fs.stat(path.join(env.UPLOAD_DIR, thumbName));
                            thumbUrl = `${env.CDN_PUBLIC_URL}/uploads/${thumbName}`;
                        } catch {
                            thumbUrl = null; // No thumbnail
                        }
                    }
                    
                    return {
                        filename,
                        url: `${env.CDN_PUBLIC_URL}/uploads/${filename}`,
                        thumbUrl,
                        sizeBytes: stats.size,
                        createdAt: (stats.birthtimeMs || stats.mtimeMs) || 0,
                        type: isImage ? "image" : "video",
                    };
                } catch (e) {
                    return null;
                }
            });
            
            let fileStats = (await Promise.all(fileStatsPromises)).filter(Boolean) as any[];
            fileStats.sort((a, b) => b.createdAt - a.createdAt);
            
            const total = fileStats.length;
            const start = (page - 1) * limit;
            const paginated = fileStats.slice(start, start + limit);
            
            res.json({
                success: true,
                data: {
                    files: paginated,
                    total,
                    page,
                    limit,
                    hasMore: start + limit < total
                }
            });
        } catch (err: any) {
            console.error("[CDN] List media failed:", err);
            res.status(500).json({
                success: false,
                error: "Internal server error reading media directory.",
            });
        }
    }
);

export default router;
