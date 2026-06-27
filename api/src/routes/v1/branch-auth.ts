/**
 * Branch Auth Routes — /api/v1/branch-auth
 *
 * Handles PIN-based branch access verification for the
 * Multi-Branch Device-Lock system (Netflix-style profile selector).
 *
 * POST /verify-pin   — Verify a branch access PIN and return branchId on success
 * POST /set-pin      — Set/update PIN for a branch (owner only, requires current PIN if exists)
 *
 * Security:
 *   - PINs are bcrypt-hashed with salt rounds = 10
 *   - Rate-limited: max 5 attempts per branch per 15 minutes (via Redis)
 *   - Timing-safe comparison via bcrypt.compare()
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Restaurant } from "../../models/Restaurant";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";
import { redis } from "../../config/redis";

const router = Router();

const PIN_SALT_ROUNDS = 12;
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 900; // 15 minutes

/**
 * POST /api/v1/branch-auth/verify-pin
 * Body: { branchId: string, pin: string }
 *
 * Validates the 4-digit PIN against the hashed PIN stored in the Restaurant document.
 * Returns the branchId on success (frontend stores in localStorage for device lock).
 */
router.post(
    "/verify-pin",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const { branchId, pin } = req.body;

            if (!branchId || !pin) {
                errorResponse(res, "branchId and pin are required.", 400);
                return;
            }

            if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
                errorResponse(res, "PIN must be exactly 4 digits.", 400);
                return;
            }

            // ── Rate limiting: prevent brute-force ──
            const rateLimitKey = `branch_pin_attempts:${branchId}:${req.user!.id}`;
            const attempts = parseInt((await redis.get(rateLimitKey)) || "0", 10);

            if (attempts >= MAX_PIN_ATTEMPTS) {
                errorResponse(
                    res,
                    "Too many incorrect PIN attempts. Please try again in 15 minutes.",
                    429
                );
                return;
            }

            // ── Fetch branch with PIN (select: false requires explicit +branchAccessPin) ──
            const branch = await Restaurant.findById(branchId)
                .select("+branchAccessPin brandName branchName ownerId logo coverImage city area")
                .lean();

            if (!branch) {
                errorResponse(res, "Branch not found.", 404);
                return;
            }

            // ── Ownership check: owner can only access their own branches ──
            if (
                req.user!.role === "owner" &&
                (branch as any).ownerId?.toString() !== req.user!.id
            ) {
                errorResponse(res, "Access denied.", 403);
                return;
            }

            // ── If branch has no PIN set yet, return special status ──
            if (!(branch as any).branchAccessPin) {
                successResponse(res, {
                    requiresPinSetup: true,
                    branchId: (branch as any)._id,
                    brandName: (branch as any).brandName,
                    branchName: (branch as any).branchName,
                });
                return;
            }

            // ── Verify PIN ──
            const isMatch = await bcrypt.compare(pin, (branch as any).branchAccessPin);

            if (!isMatch) {
                // Increment attempt counter with 15-minute TTL
                await redis.set(rateLimitKey, String(attempts + 1), "EX", LOCKOUT_SECONDS);

                errorResponse(
                    res,
                    `Incorrect PIN. ${MAX_PIN_ATTEMPTS - attempts - 1} attempts remaining.`,
                    401
                );
                return;
            }

            // ── Success: clear rate limit counter ──
            await redis.del(rateLimitKey);

            successResponse(res, {
                verified: true,
                branchId: (branch as any)._id,
                brandName: (branch as any).brandName,
                branchName: (branch as any).branchName,
                logo: (branch as any).logo,
                coverImage: (branch as any).coverImage,
                city: (branch as any).city,
                area: (branch as any).area,
            });
        } catch (error: any) {
            console.error("[BRANCH_AUTH] verify-pin error:", error);
            errorResponse(res, "Failed to verify PIN.", 500);
        }
    }
);

/**
 * POST /api/v1/branch-auth/set-pin
 * Body: { branchId: string, pin: string, currentPin?: string }
 *
 * Sets or updates the branch access PIN.
 * If the branch already has a PIN, `currentPin` is required for verification.
 */
router.post(
    "/set-pin",
    authenticate,
    authorize("admin", "owner"),
    async (req: Request, res: Response) => {
        try {
            const { branchId, pin, currentPin } = req.body;

            if (!branchId || !pin) {
                errorResponse(res, "branchId and pin are required.", 400);
                return;
            }

            if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
                errorResponse(res, "PIN must be exactly 4 digits.", 400);
                return;
            }

            // Fetch branch with current PIN
            const branch = await Restaurant.findById(branchId)
                .select("+branchAccessPin ownerId");

            if (!branch) {
                errorResponse(res, "Branch not found.", 404);
                return;
            }

            // Ownership check
            if (
                req.user!.role === "owner" &&
                (branch as any).ownerId?.toString() !== req.user!.id
            ) {
                errorResponse(res, "Access denied.", 403);
                return;
            }

            // If branch already has a PIN, verify the current PIN before allowing change
            if ((branch as any).branchAccessPin) {
                if (!currentPin) {
                    errorResponse(res, "Current PIN is required to change the PIN.", 400);
                    return;
                }

                const isMatch = await bcrypt.compare(currentPin, (branch as any).branchAccessPin);
                if (!isMatch) {
                    errorResponse(res, "Current PIN is incorrect.", 401);
                    return;
                }
            }

            // Hash and save the new PIN
            const hashedPin = await bcrypt.hash(pin, PIN_SALT_ROUNDS);
            (branch as any).branchAccessPin = hashedPin;
            await branch.save();

            successResponse(res, {
                success: true,
                message: "Branch access PIN has been set successfully.",
                branchId: (branch as any)._id,
            });
        } catch (error: any) {
            console.error("[BRANCH_AUTH] set-pin error:", error);
            errorResponse(res, "Failed to set PIN.", 500);
        }
    }
);

export default router;
