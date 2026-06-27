/**
 * Gift Cards — REMOVED (Security Audit SEC-02)
 *
 * This module has been permanently disabled due to a critical financial
 * vulnerability: gift cards were created with "Active" status without
 * any payment verification, allowing unlimited free wallet credit.
 *
 * All endpoints now return 410 Gone.
 */

import { Router, Request, Response } from "express";

const router = Router();

// All gift card endpoints permanently removed
router.all("*", (_req: Request, res: Response) => {
    res.status(410).json({
        success: false,
        error: "Gift card system has been permanently removed.",
        code: "FEATURE_REMOVED",
    });
});

export default router;
