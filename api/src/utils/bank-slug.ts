import { Bank } from "../models/Bank";

const EMPTY_SLUG_FILTER = [{ slug: { $exists: false } }, { slug: null }, { slug: "" }];

export function slugifyBankValue(value: string): string {
    return String(value || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

export function escapeRegex(value: string): string {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function resolveUniqueBankSlug(
    name: string,
    requestedSlug?: string,
    excludeId?: string,
): Promise<string> {
    const base =
        slugifyBankValue(requestedSlug || "") ||
        slugifyBankValue(name || "") ||
        "bank";
    let candidate = base;
    let suffix = 2;

    while (true) {
        const existing = await Bank.findOne({
            slug: candidate,
            ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        })
            .select("_id")
            .lean();
        if (!existing) return candidate;
        candidate = `${base}-${suffix++}`;
    }
}

export async function ensureAllBankSlugs(): Promise<number> {
    const banksMissingSlug = (await Bank.find({ $or: EMPTY_SLUG_FILTER })
        .select("_id name slug")
        .sort({ createdAt: 1 })
        .lean()) as any[];

    if (!banksMissingSlug.length) return 0;

    let updatedCount = 0;
    for (const bank of banksMissingSlug) {
        const slug = await resolveUniqueBankSlug(
            bank.name || "bank",
            undefined,
            bank._id?.toString(),
        );
        await Bank.updateOne({ _id: bank._id }, { $set: { slug } });
        updatedCount += 1;
    }

    return updatedCount;
}
