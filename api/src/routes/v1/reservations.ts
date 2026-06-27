/**
 * Reservation Routes — /api/v1/reservations
 *
 * GET /my           — User's reservations
 * GET /restaurant/:id — Restaurant's reservations (owner/admin)
 * POST /            — Create reservation (user)
 * PATCH /:id/status — Update status (owner/admin state machine)
 */

import { Router, Request, Response } from "express";
import { Reservation, RESERVATION_STATUSES } from "../../models/Reservation";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import rateLimit from "express-rate-limit";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "../../utils/api-response";

const holdRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many reservation requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// ── Helpers (kept consistent with booking-slots so the write path enforces
//    exactly the same rules that the read/availability path advertises) ──
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function parseDateOnlyLocal(dateStr: string): Date | null {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getKarachiDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function slotToMinutes(slot: string): number | null {
  if (typeof slot !== "string" || !/^\d{1,2}:\d{2}$/.test(slot)) return null;
  const [h, m] = slot.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Recompute the yield discount for a given date + time slot the SAME way
 * booking-slots does. The reservation must store the discount the user was
 * actually shown — not whatever happens to be sitting on a (possibly
 * auto-created, default-0) TableInventory row.
 */
async function computeYieldDiscount(
  restaurantId: string,
  requestedDate: Date,
  slotMinutes: number,
): Promise<number> {
  const dayName = DAY_NAMES[requestedDate.getDay()];
  const yieldRules = (await YieldRule.find({
    restaurantId,
    isActive: true,
    validFrom: { $lte: requestedDate },
    validTo: { $gte: requestedDate },
    daysOfWeek: dayName,
  })
    .sort({ priority: -1 })
    .lean()) as any[];

  for (const rule of yieldRules) {
    const ruleStart = slotToMinutes(rule.timeSlotStart);
    const ruleEnd = slotToMinutes(rule.timeSlotEnd);
    if (ruleStart == null || ruleEnd == null) continue;
    if (slotMinutes >= ruleStart && slotMinutes < ruleEnd) {
      return rule.discountPercent || 0;
    }
  }
  return 0;
}

/**
 * GET /api/v1/reservations/my
 * Protected: authenticated user
 */
router.get("/my", authenticate, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.min(
      50,
      parseInt((req.query.limit as string) || "20", 10),
    );

    const [reservations, total] = await Promise.all([
      Reservation.find({ userId: req.user!.id })
        .populate(
          "restaurantId",
          "name slug brandName branchName logo city area",
        )
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Reservation.countDocuments({ userId: req.user!.id }),
    ]);

    paginatedResponse(res, reservations, total, page, limit);
  } catch (err) {
    errorResponse(res, "Failed to fetch reservations.", 500);
  }
});

/**
 * GET /api/v1/reservations/restaurant/:restaurantId
 * Protected: admin or owning owner
 */
router.get(
  "/restaurant/:restaurantId",
  authenticate,
  authorize("admin", "owner"),
  async (req: Request, res: Response) => {
    try {
      const { restaurantId } = req.params;
      const { status, date } = req.query;

      if (req.user!.role === "owner") {
        const restaurant = await Restaurant.findOne({
          _id: restaurantId,
          ownerId: req.user!.id,
        })
          .select("_id")
          .lean();

        if (!restaurant) {
          errorResponse(res, "Access denied.", 403);
          return;
        }
      }

      const filter: any = { restaurantId };
      if (status) filter.status = status;
      if (date)
        filter.date = {
          $gte: new Date(date as string),
          $lt: new Date(new Date(date as string).getTime() + 86400000),
        };

      const reservations = await Reservation.find(filter)
        .populate("userId", "name email phone")
        .sort({ date: -1, timeSlot: 1 })
        .lean();

      successResponse(res, reservations);
    } catch (err) {
      errorResponse(res, "Failed to fetch reservations.", 500);
    }
  },
);

import { TableInventory } from "../../models/TableInventory";
import { Restaurant } from "../../models/Restaurant";
import { YieldRule } from "../../models/YieldRule";

/**
 * POST /api/v1/reservations/hold
 * Protected: authenticated user
 * ATOMIC booking intent: Checks capacity, increments heldCovers, creates Draft with lock.
 *
 * KEY FIX: booking-slots generates slots DYNAMICALLY from opening hours
 * (no DB rows), so TableInventory row may not exist yet. We auto-create
 * it on demand using the restaurant's bookingSettings capacity.
 */
router.post("/hold", authenticate, holdRateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      restaurantId,
      date,
      timeSlot,
      pax,
      guestName,
      guestPhone,
      specialRequests,
      occasion,
      adminBookingUserId,
    } = req.body;

    // Admin override for booking on behalf of users
    const isAdminBooking = req.user!.role === "admin" && adminBookingUserId;
    const effectiveUserId = isAdminBooking ? adminBookingUserId : req.user!.id;

    if (!restaurantId || !date || !timeSlot || !pax) {
      errorResponse(
        res,
        "restaurantId, date, timeSlot, and pax are required.",
        400,
      );
      return;
    }

    if (pax < 1 || pax > 50) {
      errorResponse(res, "Party size must be between 1 and 50.", 400);
      return;
    }

    // ── Load restaurant + booking settings ONCE (reused below) ──
    const rest = (await Restaurant.findById(restaurantId)
      .select("bookingSettings")
      .lean()) as any;

    if (!rest) {
      errorResponse(res, "Restaurant not found.", 404);
      return;
    }

    const settings = rest.bookingSettings || {};
    const requestedDate = parseDateOnlyLocal(date);
    const slotMinutes = slotToMinutes(timeSlot);

    // ── Enforce the owner's booking rules on the WRITE path ──
    // (booking-slots validates these on read, but a crafted/stale client must
    //  not be able to create reservations that violate the owner's settings.)
    //  Admin bookings-on-behalf are allowed to override these constraints.
    if (!isAdminBooking) {
      if (!settings.isBookingEnabled) {
        errorResponse(res, "Online booking is not available for this restaurant.", 403);
        return;
      }

      const minParty = settings.minPartySize || 1;
      const maxParty = settings.maxPartySize || 10;
      if (pax < minParty || pax > maxParty) {
        errorResponse(res, `Party size must be between ${minParty} and ${maxParty}.`, 400);
        return;
      }

      if (!requestedDate) {
        errorResponse(res, "Invalid date format. Use YYYY-MM-DD.", 400);
        return;
      }

      const todayKarachi = parseDateOnlyLocal(getKarachiDateString())!;
      const maxAdvanceDate = new Date(todayKarachi);
      maxAdvanceDate.setDate(maxAdvanceDate.getDate() + (settings.maxAdvanceBookingDays || 30));

      if (requestedDate < todayKarachi) {
        errorResponse(res, "Cannot book for past dates.", 400);
        return;
      }
      if (requestedDate > maxAdvanceDate) {
        errorResponse(res, `Booking is available only up to ${settings.maxAdvanceBookingDays || 30} days in advance.`, 400);
        return;
      }

      const dayName = DAY_NAMES[requestedDate.getDay()];
      const bookableDays =
        settings.bookableDays && settings.bookableDays.length > 0
          ? settings.bookableDays
          : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      if (!bookableDays.includes(dayName)) {
        errorResponse(res, `Bookings are not available on ${dayName}.`, 400);
        return;
      }

      if (slotMinutes == null) {
        errorResponse(res, "Invalid time slot.", 400);
        return;
      }
      const startMinutes = slotToMinutes(settings.bookableTimeStart || "12:00") ?? 720;
      const endMinutes = slotToMinutes(settings.bookableTimeEnd || "23:00") ?? 1380;
      if (slotMinutes < startMinutes || slotMinutes >= endMinutes) {
        errorResponse(res, "Selected time is outside the restaurant's booking hours.", 400);
        return;
      }
    }

    // --- SEC-26: Daily Booking Limit (Max 5 per user) ---
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const dailyCount = await Reservation.countDocuments({
      userId: effectiveUserId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["CancelledByUser", "CancelledByOwner"] }
    });

    if (dailyCount >= 5) {
      errorResponse(res, "Daily booking limit reached (max 5). Please contact support for bulk bookings.", 429);
      return;
    }

    // Anti-Fraud: Max 3 active reservations per user
    const activeCount = await Reservation.countDocuments({
      userId: effectiveUserId,
      status: { $in: ["Draft", "Confirmed", "Seated"] },
    });

    if (activeCount >= 3) {
      errorResponse(
        res,
        "This user already has 3 active reservations. Please complete or cancel one before booking another.",
        429,
      );
      return;
    }

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    // ATOMIC HOLD: Only succeeds if enough capacity
    let slot = await TableInventory.findOneAndUpdate(
      {
        restaurantId,
        date: dateObj,
        timeSlot,
        isBlocked: false,
        $expr: {
          $lte: [{ $add: ["$bookedCovers", "$heldCovers", pax] }, "$maxCovers"],
        },
      },
      {
        $inc: { heldCovers: pax },
      },
      { new: true },
    );

    // ── AUTO-CREATE: If no TableInventory row exists (dynamic slot generation) ──
    if (!slot) {
      // Check if the slot simply doesn't exist yet (vs. being full)
      const existingSlot = await TableInventory.findOne({
        restaurantId,
        date: dateObj,
        timeSlot,
      }).lean();

      if (!existingSlot) {
        // No row exists — auto-create from restaurant bookingSettings
        // (`rest`/`settings` already loaded above)
        const h = parseInt(timeSlot.split(":")[0], 10);
        const coversPerSlot = settings.coversPerSlot || {
          lunch: 20,
          afternoon: 12,
          dinner: 30,
        };
        const maxCovers =
          h < 15
            ? coversPerSlot.lunch || 20
            : h < 18
              ? coversPerSlot.afternoon || 12
              : coversPerSlot.dinner || 30;

        // Upsert: create the slot row if it doesn't exist
        await TableInventory.findOneAndUpdate(
          { restaurantId, date: dateObj, timeSlot },
          {
            $setOnInsert: {
              maxCovers,
              bookedCovers: 0,
              heldCovers: 0,
              isBlocked: false,
            },
          },
          { upsert: true, new: true },
        );

        // Now retry the atomic hold on the newly created row
        slot = await TableInventory.findOneAndUpdate(
          {
            restaurantId,
            date: dateObj,
            timeSlot,
            isBlocked: false,
            $expr: {
              $lte: [
                { $add: ["$bookedCovers", "$heldCovers", pax] },
                "$maxCovers",
              ],
            },
          },
          { $inc: { heldCovers: pax } },
          { new: true },
        );
      }
    }

    if (!slot) {
      errorResponse(
        res,
        "No availability: This time slot is full or does not have enough capacity.",
        409,
      );
      return;
    }

    const lockExpiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    // Capture the yield discount the customer was actually shown. Slots are
    // generated dynamically from YieldRules (not stored on the inventory row),
    // so recompute from the rules rather than trusting slot.discountPercent
    // (which is 0 on auto-created rows).
    let appliedYieldDiscount = 0;
    const discountDate = requestedDate || dateObj;
    if (slotMinutes != null) {
      appliedYieldDiscount = await computeYieldDiscount(
        restaurantId,
        discountDate,
        slotMinutes,
      );
    }

    const reservation = await Reservation.create({
      userId: effectiveUserId,
      restaurantId,
      date: dateObj,
      timeSlot,
      pax,
      guestName: guestName || req.user!.name || "",
      guestPhone: guestPhone || "",
      specialRequests: specialRequests || "",
      occasion: occasion || "None",
      status: "Draft",
      lockExpiresAt,
      appliedYieldDiscount,
    });

    res.status(201).json({
      success: true,
      data: {
        reservation,
        remainingSeconds: 180,
        message: "Table held for 3 minutes. Please confirm.",
      },
    });
  } catch (err) {
    console.error("[Reservations] Hold error:", err);
    errorResponse(res, "Failed to hold reservation.", 500);
  }
});

/**
 * POST /api/v1/reservations/:id/confirm
 * Protected: authenticated user
 */
router.post(
  "/:id/confirm",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const {
        adminBookingUserId,
        guestName,
        guestPhone,
        specialRequests,
        occasion,
        paymentMode,
      } = req.body;
      const isAdminBooking = req.user!.role === "admin" && adminBookingUserId;
      const effectiveUserId = isAdminBooking
        ? adminBookingUserId
        : req.user!.id;

      const reservation = await Reservation.findOne({
        _id: req.params.id,
        userId: effectiveUserId,
        status: "Draft",
      });

      if (!reservation) {
        errorResponse(res, "Draft reservation not found or unauthorized.", 404);
        return;
      }

      if (reservation.lockExpiresAt! < new Date()) {
        // Lock expired. Atomically claim the Draft→Cancelled transition so we
        // only release heldCovers ONCE (the CRON releaser may also be racing
        // this exact row).
        const expiredClaim = await Reservation.updateOne(
          { _id: reservation._id, status: "Draft" },
          { $set: { status: "CancelledByUser", cancelReason: "Lock Expired" } },
        );
        if (expiredClaim.modifiedCount > 0) {
          await TableInventory.updateOne(
            {
              restaurantId: reservation.restaurantId,
              date: reservation.date,
              timeSlot: reservation.timeSlot,
            },
            { $inc: { heldCovers: -reservation.pax } },
          );
        }

        errorResponse(
          res,
          "Reservation session expired. Please start over.",
          400,
        );
        return;
      }

      // CONFIRM — atomically claim the Draft→Confirmed transition first so a
      // double-tap (two confirm requests) can't shift the same hold twice.
      const confirmClaim = await Reservation.updateOne(
        { _id: reservation._id, status: "Draft" },
        {
          $set: {
            status: "Confirmed",
            confirmedAt: new Date(),
            ...(guestName ? { guestName } : {}),
            ...(guestPhone ? { guestPhone } : {}),
            ...(specialRequests ? { specialRequests } : {}),
            ...(occasion ? { occasion } : {}),
            ...(paymentMode ? { paymentMode } : {}),
          },
        },
        { runValidators: true },
      );

      if (confirmClaim.modifiedCount === 0) {
        errorResponse(res, "Reservation is no longer pending confirmation.", 409);
        return;
      }

      // Atomically shift pax from held to booked
      await TableInventory.updateOne(
        {
          restaurantId: reservation.restaurantId,
          date: reservation.date,
          timeSlot: reservation.timeSlot,
        },
        {
          $inc: { heldCovers: -reservation.pax, bookedCovers: reservation.pax },
        },
      );

      successResponse(res, { reservationCode: reservation.reservationCode });
    } catch (err) {
      errorResponse(res, "Failed to confirm reservation.", 500);
    }
  },
);

/**
 * PATCH /api/v1/reservations/:id/cancel
 * Protected: authenticated user (Cancel their own)
 */
router.patch(
  "/:id/cancel",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      // A user can cancel an active hold (Draft) OR a confirmed booking.
      const reservation = await Reservation.findOne({
        _id: req.params.id,
        userId: req.user!.id,
        status: { $in: ["Draft", "Confirmed"] },
      });

      if (!reservation) {
        errorResponse(res, "Active reservation not found.", 404);
        return;
      }

      const previousStatus = reservation.status;

      // Atomically claim the cancellation so the inventory is only released
      // ONCE — even if the CRON releaser / a duplicate request hits the same
      // row concurrently.
      const claim = await Reservation.updateOne(
        { _id: reservation._id, status: previousStatus },
        {
          $set: {
            status: "CancelledByUser",
            cancelledAt: new Date(),
            cancelReason: req.body?.reason || "User cancelled",
          },
        },
      );

      if (claim.modifiedCount === 0) {
        errorResponse(res, "Reservation has already been updated.", 409);
        return;
      }

      // Free up the inventory capacity. A Draft only ever incremented
      // heldCovers; a Confirmed booking incremented bookedCovers.
      const inventoryInc: Record<string, number> =
        previousStatus === "Draft"
          ? { heldCovers: -reservation.pax }
          : { bookedCovers: -reservation.pax };

      await TableInventory.updateOne(
        {
          restaurantId: reservation.restaurantId,
          date: reservation.date,
          timeSlot: reservation.timeSlot,
        },
        { $inc: inventoryInc },
      );

      successResponse(res, { message: "Cancelled successfully" });
    } catch (err) {
      errorResponse(res, "Failed to cancel reservation.", 500);
    }
  },
);

/**
 * PATCH /api/v1/reservations/:id/status
 * Protected: admin, owner (state machine transitions)
 * Body: { status, cancelReason?, ownerNotes? }
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "owner"),
  async (req: Request, res: Response) => {
    try {
      const { status, cancelReason, ownerNotes } = req.body;

      if (!status || !RESERVATION_STATUSES.includes(status)) {
        errorResponse(
          res,
          `Invalid status. Must be one of: ${RESERVATION_STATUSES.join(", ")}`,
          400,
        );
        return;
      }

      const reservation = await Reservation.findById(req.params.id);
      if (!reservation) {
        errorResponse(res, "Reservation not found.", 404);
        return;
      }

      if (req.user!.role === "owner") {
        const restaurant = await Restaurant.findOne({
          _id: reservation.restaurantId,
          ownerId: req.user!.id,
        })
          .select("_id")
          .lean();

        if (!restaurant) {
          errorResponse(res, "Access denied.", 403);
          return;
        }
      }

      // State machine validation
      const validTransitions: Record<string, string[]> = {
        Draft: ["Confirmed", "CancelledByOwner"],
        Confirmed: ["Seated", "CancelledByUser", "CancelledByOwner", "NoShow"],
        Seated: ["Completed"],
      };

      const allowed = validTransitions[reservation.status] || [];
      if (!allowed.includes(status)) {
        errorResponse(
          res,
          `Cannot transition from ${reservation.status} to ${status}.`,
          400,
        );
        return;
      }

      const oldStatus = reservation.status;

      // Apply transition
      reservation.status = status;
      if (status === "Confirmed") reservation.confirmedAt = new Date();
      if (status === "Seated") reservation.seatedAt = new Date();
      if (status === "Completed") reservation.completedAt = new Date();
      if (status.startsWith("Cancelled") || status === "NoShow") {
        reservation.cancelledAt = new Date();
        reservation.cancelReason = cancelReason || "";
      }
      if (ownerNotes) reservation.ownerNotes = ownerNotes;

      await reservation.save();

      // Adjust inventory if needed
      if (
        oldStatus === "Confirmed" &&
        (status.startsWith("Cancelled") || status === "NoShow")
      ) {
        await TableInventory.updateOne(
          {
            restaurantId: reservation.restaurantId,
            date: reservation.date,
            timeSlot: reservation.timeSlot,
          },
          { $inc: { bookedCovers: -reservation.pax } },
        );
      }

      successResponse(res, reservation);
    } catch (err) {
      errorResponse(res, "Failed to update reservation.", 500);
    }
  },
);

export default router;
