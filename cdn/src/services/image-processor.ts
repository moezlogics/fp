/**
 * Image Processor — Sharp-based WebP Conversion Pipeline
 *
 * Architecture:
 * 1. Receives raw Buffer from Multer (memory storage).
 * 2. Converts to WebP at configurable quality (default 80).
 * 3. Resizes to max width while preserving aspect ratio.
 * 4. Generates a 400px-wide thumbnail for listing pages.
 * 5. Saves both files to disk with SEO-friendly filenames.
 *
 * Naming Convention (SEO-optimized):
 *   Full:  {sanitized-original-name}-{shortId}.webp
 *   Thumb: {sanitized-original-name}-{shortId}-thumb.webp
 *
 *   Example: chicken-karahi-dha-abc123.webp
 */

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { nanoid } from "nanoid";
import { env } from "../config/env";

export interface ProcessedImage {
    filename: string;
    thumbFilename: string;
    fullPath: string;
    thumbPath: string;
    fullUrl: string;
    thumbUrl: string;
    widthPx: number;
    heightPx: number;
    sizeBytes: number;
    thumbSizeBytes: number;
}

/**
 * Sanitize a filename into an SEO-friendly slug.
 * Strips extension, lowercases, replaces non-alphanumeric with hyphens.
 */
function sanitizeFilename(raw: string): string {
    // Remove file extension
    const withoutExt = raw.replace(/\.[^.]+$/, "");
    return withoutExt
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 80) || "image";
}

/**
 * Processes, compresses, and saves an uploaded image.
 *
 * @param buffer           - Raw file buffer from Multer
 * @param slug             - Fallback slug (e.g., "salt-n-pepper-dha")
 * @param uploadDir        - Absolute path to the uploads directory
 * @param originalFilename - Original filename from the uploader (optional, for SEO)
 * @returns ProcessedImage with URLs and metadata
 */
export async function processImage(
    buffer: Buffer,
    slug: string,
    uploadDir: string,
    originalFilename?: string
): Promise<ProcessedImage> {
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate SEO-friendly unique filename
    const shortId = nanoid(8);
    const baseName = originalFilename
        ? sanitizeFilename(originalFilename)
        : slug;
    const filename = `${baseName}-${shortId}.webp`;
    const thumbFilename = `${baseName}-${shortId}-thumb.webp`;
    const fullPath = path.join(uploadDir, filename);
    const thumbPath = path.join(uploadDir, thumbFilename);

    // ── Pipeline 1: Full-size WebP ──
    const fullResult = await sharp(buffer)
        .resize({
            width: env.MAX_WIDTH,
            withoutEnlargement: true, // Don't upscale small images
            fit: "inside",
        })
        .webp({
            quality: env.WEBP_QUALITY,
            effort: 4, // Balance between speed and compression
        })
        .toFile(fullPath);

    // ── Pipeline 2: Thumbnail WebP ──
    const thumbResult = await sharp(buffer)
        .resize({
            width: env.THUMB_WIDTH,
            withoutEnlargement: true,
            fit: "inside",
        })
        .webp({
            quality: Math.max(env.WEBP_QUALITY - 10, 50), // Slightly lower quality for thumbs
            effort: 4,
        })
        .toFile(thumbPath);

    return {
        filename,
        thumbFilename,
        fullPath,
        thumbPath,
        fullUrl: `${env.CDN_PUBLIC_URL}/uploads/${filename}`,
        thumbUrl: `${env.CDN_PUBLIC_URL}/uploads/${thumbFilename}`,
        widthPx: fullResult.width,
        heightPx: fullResult.height,
        sizeBytes: fullResult.size,
        thumbSizeBytes: thumbResult.size,
    };
}
