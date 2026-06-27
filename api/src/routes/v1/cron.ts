import { Router, Request, Response, NextFunction } from "express";
import { expireStaleHolds, generateInventory, markNoShows, expireUnpaidFoodiePayBills, generateMonthlyInvoices } from "../../services/cron-service";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * Cron Secret Validation Middleware
 * Validates the x-cron-secret header against the CRON_SECRET env variable.
 * Prevents unauthorized external access to cron endpoints.
 */
function validateCronSecret(req: Request, res: Response, next: NextFunction): void {
    const cronSecret = process.env.CRON_SECRET;

    // In production, CRON_SECRET MUST be set
    if (!cronSecret && process.env.NODE_ENV === "production") {
        console.error("[CRON] FATAL: CRON_SECRET is not set in production.");
        res.status(503).json({ success: false, error: "Service misconfigured." });
        return;
    }

    // In development, if CRON_SECRET is not set, allow (with warning)
    if (!cronSecret) {
        console.warn("[CRON] WARNING: CRON_SECRET not set. Allowing request in dev mode.");
        next();
        return;
    }

    const providedSecret = req.headers["x-cron-secret"] as string | undefined;

    if (!providedSecret || providedSecret !== cronSecret) {
        res.status(403).json({ success: false, error: "Forbidden. Invalid cron secret." });
        return;
    }

    next();
}

// GET /api/v1/cron/reservations
router.get("/reservations", validateCronSecret, async (req: Request, res: Response) => {
    try {
        const start = Date.now();
        const results: any = {};

        // 1. Expire stale holds (1-min locks)
        results.expireHolds = await expireStaleHolds();
        results.expireFoodiePay = await expireUnpaidFoodiePayBills();

        const type = req.query.type as string;

        if (type === "daily") {
            results.noShows = await markNoShows();
            results.inventory = await generateInventory();
        }

        if (type === "monthly") {
            results.invoices = await generateMonthlyInvoices();
        }

        const duration = Date.now() - start;
        successResponse(res, { success: true, durationMs: duration, results });
    } catch (error: any) {
        console.error("Cron error:", error);
        errorResponse(res, "Cron failed", 500);
    }
});

// POST /api/v1/cron/reservations
router.post("/reservations", validateCronSecret, async (req: Request, res: Response) => {
    try {
        const start = Date.now();
        const results: any = {};

        results.expireHolds = await expireStaleHolds();
        results.expireFoodiePay = await expireUnpaidFoodiePayBills();

        const type = req.query.type as string;

        if (type === "daily") {
            results.noShows = await markNoShows();
            results.inventory = await generateInventory();
        }

        if (type === "monthly") {
            results.invoices = await generateMonthlyInvoices();
        }

        const duration = Date.now() - start;
        successResponse(res, { success: true, durationMs: duration, results });
    } catch (error: any) {
        console.error("Cron error:", error);
        errorResponse(res, "Cron failed", 500);
    }
});

export default router;
