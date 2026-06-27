import { Router, Request, Response } from "express";
import { Waitlist } from "../../models/Waitlist";
import { Subscription } from "../../models/Subscription";
import { authenticate } from "../../middleware/authenticate";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

/**
 * POST /api/v1/waitlist/join
 * User joins the waitlist for a fully-booked slot.
 */
router.post("/join", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { restaurantId, date, timeSlot, pax, guestName, guestPhone } = req.body;

        if (!restaurantId || !date || !timeSlot || !pax) {
            errorResponse(res, "restaurantId, date, timeSlot, pax required", 400);
            return;
        }

        // Check if already on waitlist for this slot
        const existing = await Waitlist.findOne({
            userId,
            restaurantId,
            date: new Date(date),
            timeSlot,
            status: { $in: ["Waiting", "Offered"] },
        });
        if (existing) {
            errorResponse(res, "You are already on the waitlist for this slot", 400);
            return;
        }

        // Check if user is Prime (for priority positioning)
        const isPrime = !!(await Subscription.findOne({
            userId,
            status: "Active",
            validTo: { $gt: new Date() },
        }));

        // Calculate position
        const currentWaitlistCount = await Waitlist.countDocuments({
            restaurantId,
            date: new Date(date),
            timeSlot,
            status: "Waiting",
        });

        // Prime members get position 0 (front of queue), others get next position
        const position = isPrime ? 0 : currentWaitlistCount + 1;

        const entry = await Waitlist.create({
            restaurantId,
            date: new Date(date),
            timeSlot,
            userId,
            pax,
            isPrime,
            position,
            status: "Waiting",
            guestName: guestName || req.user!.name || "",
            guestPhone: guestPhone || "",
        });

        successResponse(res, {
            message: isPrime
                ? "You've been added to the PRIORITY waitlist! 🌟 We'll notify you first when a table opens."
                : `You're #${position} on the waitlist. We'll notify you when a table opens.`,
            entry: {
                _id: entry._id,
                position: entry.position,
                isPrime: entry.isPrime,
            },
        }, 201);
    } catch (err) {
        errorResponse(res, "Internal server error", 500);
    }
});

export default router;
