import { Router, Request, Response } from "express";
import { Bank } from "../../models/Bank";
import { SeoPage } from "../../models/SeoPage";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse, errorResponse } from "../../utils/api-response";
import {
    ensureAllBankSlugs,
    resolveUniqueBankSlug,
    slugifyBankValue,
} from "../../utils/bank-slug";
import { generateSeoPagesForBank } from "../../utils/seo-page-generator";

const router = Router();

// GET all banks
router.get("/", async (_req: Request, res: Response) => {
    try {
        await ensureAllBankSlugs();
        const banks = await Bank.find().sort({ order: 1 }).lean();
        successResponse(res, banks);
    } catch (err) {
        errorResponse(res, "Failed", 500);
    }
});

// POST create new bank (Admin)
router.post("/", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const name = String(body.name || "").trim();
        if (!name) {
            errorResponse(res, "Bank name is required", 400);
            return;
        }

        const slug = await resolveUniqueBankSlug(name, body.slug);

        const bank = await Bank.create({
            ...body,
            name,
            slug,
        });

        generateSeoPagesForBank({ name: bank.name, slug: bank.slug }).catch(() => { });

        successResponse(res, bank, 201);
    } catch (err: any) {
        if (err.code === 11000) {
            errorResponse(res, "Bank already exists", 409);
        } else {
            errorResponse(res, "Failed", 500);
        }
    }
});

// PUT update bank (Admin)
router.put("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id || "");
        const body = req.body || {};

        const existing = await Bank.findById(id);
        if (!existing) {
            errorResponse(res, "Not found", 404);
            return;
        }

        const nextName = String(body.name || existing.name || "").trim();
        if (!nextName) {
            errorResponse(res, "Bank name is required", 400);
            return;
        }

        const shouldRecomputeSlug = body.slug !== undefined || !existing.slug;
        const nextSlug = shouldRecomputeSlug
            ? await resolveUniqueBankSlug(nextName, body.slug || nextName, id)
            : existing.slug;

        const updated = await Bank.findByIdAndUpdate(
            id,
            {
                ...body,
                name: nextName,
                slug: nextSlug,
            },
            { new: true },
        );

        if (!updated) {
            errorResponse(res, "Not found", 404);
            return;
        }

        generateSeoPagesForBank({
            name: updated.name,
            slug: updated.slug || slugifyBankValue(updated.name),
        }).catch(() => { });

        successResponse(res, updated);
    } catch (err) {
        errorResponse(res, "Failed to update", 500);
    }
});

// DELETE bank (Admin)
router.delete("/:id", authenticate, authorize("admin"), async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id || "");

        const bank = await Bank.findById(id).select("slug name").lean() as any;
        await Bank.findByIdAndDelete(id);

        if (bank) {
            const bankSlug = bank.slug || slugifyBankValue(bank.name || "");
            if (bankSlug) {
                await SeoPage.deleteMany({ type: "city-bank-deals", bankSlug });
            }
        }

        successResponse(res, { success: true });
    } catch (err) {
        errorResponse(res, "Failed to delete", 500);
    }
});

export default router;

