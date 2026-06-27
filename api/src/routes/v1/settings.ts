/**
 * Platform Settings Routes — /api/v1/settings
 *
 * GET  /  — Read current platform settings (admin only)
 * PUT  /  — Update platform settings (admin only)
 *
 * Uses singleton pattern: always reads/upserts the single `key: "global"` document.
 * This avoids any risk of creating duplicate settings records.
 */

import { Router, Request, Response } from "express";
import { PlatformSettings } from "../../models/PlatformSettings";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * GET /api/v1/settings/public
 * Public — no auth. Returns only branding fields (logo, siteName).
 * Cached heavily by CDN/browser.
 */
router.get(
    "/public",
    async (_req: Request, res: Response) => {
        try {
            const settings: any = await PlatformSettings.findOneAndUpdate(
                { key: "global" },
                { $setOnInsert: { key: "global" } },
                { upsert: true, new: true, lean: true }
            );

            // Only expose public-safe branding, SEO, and contact/social fields
            successResponse(res, {
                siteName: settings?.siteName,
                faviconUrl: settings?.faviconUrl,
                logoUrl: settings?.logoUrl,
                logoWidthDesktop: settings?.logoWidthDesktop,
                logoHeightDesktop: settings?.logoHeightDesktop,
                logoWidthMobile: settings?.logoWidthMobile,
                logoHeightMobile: settings?.logoHeightMobile,
                homeContent: settings?.homeContent,
                defaultMetaTitle: settings?.defaultMetaTitle,
                defaultMetaDescription: settings?.defaultMetaDescription,
                homepageTitle: settings?.homepageTitle,
                homepageMetaDescription: settings?.homepageMetaDescription,
                contactEmail: settings?.contactEmail,
                contactPhone: settings?.contactPhone,
                whatsapp: settings?.whatsapp,
                facebookUrl: settings?.facebookUrl,
                instagramUrl: settings?.instagramUrl,
                tiktokUrl: settings?.tiktokUrl,
                youtubeUrl: settings?.youtubeUrl,
            });
        } catch (err) {
            console.error("[Settings] Public GET error:", err);
            errorResponse(res, "Failed to fetch branding.", 500);
        }
    }
);

/**
 * GET /api/v1/settings
 * Returns the current platform settings. Creates defaults if none exist.
 */
router.get(
    "/",
    authenticate,
    authorize("admin"),
    async (_req: Request, res: Response) => {
        try {
            const settings = await PlatformSettings.findOneAndUpdate(
                { key: "global" },
                { $setOnInsert: { key: "global" } },
                { upsert: true, new: true, lean: true }
            );

            successResponse(res, settings);
        } catch (err) {
            console.error("[Settings] GET error:", err);
            errorResponse(res, "Failed to fetch settings.", 500);
        }
    }
);

/**
 * PUT /api/v1/settings
 * Updates the platform settings. Only whitelisted fields are accepted.
 */
router.put(
    "/",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            // Whitelist allowed fields to prevent injection of arbitrary fields
            const allowedFields = [
                "siteName", "tagline", "faviconUrl",
                "logoUrl", "logoWidthDesktop", "logoHeightDesktop", "logoWidthMobile", "logoHeightMobile",
                "contactEmail", "contactPhone", "whatsapp",
                "facebookUrl", "instagramUrl", "tiktokUrl", "youtubeUrl",
                "defaultMetaTitle", "defaultMetaDescription",
                "homepageTitle", "homepageMetaDescription",
                "defaultCommissionPercent", "maintenanceMode",
                "homeContent",
            ];

            const updates: Record<string, any> = {};
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            }

            // Validate commission range
            if (updates.defaultCommissionPercent !== undefined) {
                const val = Number(updates.defaultCommissionPercent);
                if (isNaN(val) || val < 0 || val > 100) {
                    errorResponse(res, "Commission must be between 0 and 100.", 400);
                    return;
                }
                updates.defaultCommissionPercent = val;
            }

            const settings = await PlatformSettings.findOneAndUpdate(
                { key: "global" },
                { $set: updates },
                { upsert: true, new: true, lean: true }
            );

            console.log(`[AUDIT] Admin updated platform settings. Fields: ${Object.keys(updates).join(", ")}`);
            successResponse(res, settings);
        } catch (err) {
            console.error("[Settings] PUT error:", err);
            errorResponse(res, "Failed to update settings.", 500);
        }
    }
);

export default router;
