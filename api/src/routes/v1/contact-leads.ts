import { Router, Request, Response } from "express";
import { ContactLead } from "../../models/ContactLead";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";

const router = Router();

// ── Subject label mapping for display ──
const SUBJECT_LABELS: Record<string, string> = {
    booking: "Booking Issue",
    partnership: "Restaurant Partnership",
    feedback: "Feedback & Suggestions",
    payment: "Payment Query",
    other: "Other",
};

/**
 * POST /api/v1/contact-leads
 * Public: Submit a contact form lead
 * Rate-limited: Max 3 submissions per IP per hour
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { name, email, subject, message } = req.body;
        const ip = (
            (req.headers["x-forwarded-for"] as string) ||
            req.ip ||
            "unknown"
        )
            .split(",")[0]
            .trim();
        const userAgent = req.headers["user-agent"] || "";

        // ── Validation ──
        if (!name || typeof name !== "string" || name.trim().length < 2) {
            errorResponse(res, "Name is required (minimum 2 characters)", 400);
            return;
        }

        if (
            !email ||
            typeof email !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            errorResponse(res, "A valid email address is required", 400);
            return;
        }

        const validSubjects = [
            "booking",
            "partnership",
            "feedback",
            "payment",
            "other",
        ];
        if (!subject || !validSubjects.includes(subject)) {
            errorResponse(
                res,
                "Please select a valid subject topic",
                400
            );
            return;
        }

        if (
            !message ||
            typeof message !== "string" ||
            message.trim().length < 10
        ) {
            errorResponse(
                res,
                "Message is required (minimum 10 characters)",
                400
            );
            return;
        }

        // ── Rate Limiting: 3 submissions per IP per hour ──
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentCount = await ContactLead.countDocuments({
            ip,
            createdAt: { $gte: oneHourAgo },
        });

        if (recentCount >= 3) {
            errorResponse(
                res,
                "You have already submitted multiple messages recently. Please try again later.",
                429
            );
            return;
        }

        // ── Create Lead ──
        const lead = await ContactLead.create({
            name: name.trim().substring(0, 100),
            email: email.trim().toLowerCase().substring(0, 200),
            subject,
            message: message.trim().substring(0, 2000),
            ip,
            userAgent: userAgent.substring(0, 300),
        });

        successResponse(
            res,
            {
                _id: lead._id,
                message: "Thank you! Your message has been received. We'll get back to you soon.",
            },
            201
        );
    } catch (err) {
        console.error("[ContactLead] Create error:", err);
        errorResponse(res, "Failed to submit your message. Please try again.", 500);
    }
});

/**
 * GET /api/v1/contact-leads/stats
 * Admin: Get lead counts by status
 */
router.get(
    "/stats",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const [total, newCount, readCount, repliedCount, archivedCount] =
                await Promise.all([
                    ContactLead.countDocuments(),
                    ContactLead.countDocuments({ status: "new" }),
                    ContactLead.countDocuments({ status: "read" }),
                    ContactLead.countDocuments({ status: "replied" }),
                    ContactLead.countDocuments({ status: "archived" }),
                ]);

            successResponse(res, {
                total,
                new: newCount,
                read: readCount,
                replied: repliedCount,
                archived: archivedCount,
            });
        } catch (err) {
            console.error("[ContactLead] Stats error:", err);
            errorResponse(res, "Failed to fetch lead stats", 500);
        }
    }
);

/**
 * GET /api/v1/contact-leads
 * Admin: List all leads with pagination, filtering, and search
 */
router.get(
    "/",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const {
                page = "1",
                limit = "30",
                status,
                search,
            } = req.query;
            const pageNum = Math.max(1, parseInt(page as string, 10));
            const limitNum = Math.min(100, parseInt(limit as string, 10));

            // Build query filter
            const filter: any = {};
            if (
                status &&
                ["new", "read", "replied", "archived"].includes(
                    status as string
                )
            ) {
                filter.status = status;
            }
            if (search && typeof search === "string" && search.trim()) {
                const searchRegex = new RegExp(search.trim(), "i");
                filter.$or = [
                    { name: searchRegex },
                    { email: searchRegex },
                    { message: searchRegex },
                ];
            }

            const [docs, total] = await Promise.all([
                ContactLead.find(filter)
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .lean(),
                ContactLead.countDocuments(filter),
            ]);

            successResponse(res, {
                docs,
                total,
                page: pageNum,
                limit: limitNum,
            });
        } catch (err) {
            console.error("[ContactLead] List error:", err);
            errorResponse(res, "Failed to fetch leads", 500);
        }
    }
);

/**
 * GET /api/v1/contact-leads/:id
 * Admin: Get single lead detail + auto-mark as "read"
 */
router.get(
    "/:id",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const lead = await ContactLead.findById(req.params.id);
            if (!lead) {
                errorResponse(res, "Lead not found", 404);
                return;
            }

            // Auto-mark as read if currently "new"
            if (lead.status === "new") {
                lead.status = "read";
                lead.readAt = new Date();
                await lead.save();
            }

            successResponse(res, lead);
        } catch (err) {
            console.error("[ContactLead] Get error:", err);
            errorResponse(res, "Failed to fetch lead", 500);
        }
    }
);

/**
 * PATCH /api/v1/contact-leads/:id/status
 * Admin: Update lead status
 */
router.patch(
    "/:id/status",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const { status } = req.body;
            const validStatuses = ["new", "read", "replied", "archived"];

            if (!status || !validStatuses.includes(status)) {
                errorResponse(
                    res,
                    "Invalid status. Must be: new, read, replied, or archived",
                    400
                );
                return;
            }

            const update: any = { status };
            if (status === "read" && !req.body.readAt) {
                update.readAt = new Date();
            }
            if (status === "replied") {
                update.repliedAt = new Date();
            }

            const lead = await ContactLead.findByIdAndUpdate(
                req.params.id,
                update,
                { new: true }
            );

            if (!lead) {
                errorResponse(res, "Lead not found", 404);
                return;
            }

            successResponse(res, lead);
        } catch (err) {
            console.error("[ContactLead] Status update error:", err);
            errorResponse(res, "Failed to update lead status", 500);
        }
    }
);

/**
 * PATCH /api/v1/contact-leads/:id/notes
 * Admin: Update admin notes
 */
router.patch(
    "/:id/notes",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const { adminNotes } = req.body;

            if (typeof adminNotes !== "string") {
                errorResponse(res, "adminNotes must be a string", 400);
                return;
            }

            const lead = await ContactLead.findByIdAndUpdate(
                req.params.id,
                { adminNotes: adminNotes.substring(0, 1000) },
                { new: true }
            );

            if (!lead) {
                errorResponse(res, "Lead not found", 404);
                return;
            }

            successResponse(res, lead);
        } catch (err) {
            console.error("[ContactLead] Notes update error:", err);
            errorResponse(res, "Failed to update notes", 500);
        }
    }
);

/**
 * DELETE /api/v1/contact-leads/:id
 * Admin: Delete a lead permanently
 */
router.delete(
    "/:id",
    authenticate,
    authorize("admin"),
    async (req: Request, res: Response) => {
        try {
            const result = await ContactLead.findByIdAndDelete(req.params.id);
            if (!result) {
                errorResponse(res, "Lead not found", 404);
                return;
            }
            successResponse(res, { success: true });
        } catch (err) {
            console.error("[ContactLead] Delete error:", err);
            errorResponse(res, "Failed to delete lead", 500);
        }
    }
);

export default router;
