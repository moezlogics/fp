import { City } from "../models/City";
import { Area } from "../models/Area";
import { Category } from "../models/Category";
import { Bank } from "../models/Bank";
import { SeoPage } from "../models/SeoPage";
import { ensureAllBankSlugs, slugifyBankValue } from "./bank-slug";

type SeoPageType =
    | "city-category"
    | "city-area"
    | "area-category"
    | "city-deals"
    | "city-bank-deals";

/**
 * Generate default SEO title/description for a combination.
 */
function defaultTitle(
    type: SeoPageType,
    cityName: string,
    categoryName?: string,
    areaName?: string,
    bankName?: string,
): string {
    if (type === "city-deals") {
        return `Best Bank Deals in ${cityName} - Credit Card Discounts | Foodies Pakistan`;
    }
    if (type === "city-bank-deals" && bankName) {
        return `${bankName} Deals in ${cityName} - Best Restaurant Discounts | Foodies Pakistan`;
    }
    if (type === "city-area" && areaName) {
        return `Best Restaurants in ${areaName}, ${cityName} - Deals & Discounts | Foodies Pakistan`;
    }
    if (type === "area-category" && areaName && categoryName) {
        return `Best ${categoryName} Restaurants in ${areaName}, ${cityName} - Deals & Discounts | Foodies Pakistan`;
    }
    if (categoryName) {
        return `Best ${categoryName} Restaurants in ${cityName} - Deals & Discounts | Foodies Pakistan`;
    }
    return `Best Restaurants in ${cityName} | Foodies Pakistan`;
}

function defaultMeta(
    type: SeoPageType,
    cityName: string,
    categoryName?: string,
    areaName?: string,
    bankName?: string,
): string {
    if (type === "city-deals") {
        return `Discover the best bank deals in ${cityName}. Compare restaurant discounts, credit card offers, and live dining promotions on Foodies Pakistan.`;
    }
    if (type === "city-bank-deals" && bankName) {
        return `Explore ${bankName} bank deals in ${cityName}. Find top restaurants offering exclusive ${bankName} card discounts and updated dining offers on Foodies Pakistan.`;
    }
    if (type === "city-area" && areaName) {
        return `Discover the best restaurants in ${areaName}, ${cityName}. Compare menus, read reviews, and find exclusive deals on Foodies Pakistan.`;
    }
    const location = type === "area-category" && areaName ? `${areaName}, ${cityName}` : cityName;
    if (categoryName) {
        return `Discover the best ${categoryName.toLowerCase()} restaurants in ${location}. Compare menus, read reviews, and find exclusive deals on Foodies Pakistan.`;
    }
    return `Discover the best restaurants in ${location}. Compare menus, read reviews, and find exclusive deals on Foodies Pakistan.`;
}

function buildComboSlug(
    type: SeoPageType,
    citySlug: string,
    categorySlug?: string,
    areaSlug?: string,
    bankSlug?: string,
): string {
    if (type === "city-deals") {
        return `${citySlug}/deals`;
    }
    if (type === "city-bank-deals" && bankSlug) {
        return `${citySlug}/deals/${bankSlug}`;
    }
    if (type === "city-area" && areaSlug) {
        return `${citySlug}/${areaSlug}`;
    }
    if (type === "area-category" && areaSlug && categorySlug) {
        // Format: city/area/category — matches Next.js route [city]/[...slug]
        return `${citySlug}/${areaSlug}/${categorySlug}`;
    }
    if (categorySlug) {
        return `${citySlug}/${categorySlug}`;
    }
    return citySlug;
}

function buildCityDealsUpsert(city: any) {
    const combo = buildComboSlug("city-deals", city.slug);
    return {
        updateOne: {
            filter: { combinationSlug: combo },
            update: {
                $setOnInsert: {
                    type: "city-deals",
                    citySlug: city.slug,
                    cityName: city.name,
                    areaSlug: null,
                    areaName: null,
                    categorySlug: null,
                    categoryName: null,
                    bankSlug: null,
                    bankName: null,
                    combinationSlug: combo,
                    title: defaultTitle("city-deals", city.name),
                    metaDescription: defaultMeta("city-deals", city.name),
                    content: "",
                    isPublished: true,
                    isCustomized: false,
                },
            },
            upsert: true,
        },
    };
}

function buildCityBankDealsUpsert(city: any, bank: any) {
    const bankSlug = bank.slug || slugifyBankValue(bank.name);
    const combo = buildComboSlug("city-bank-deals", city.slug, undefined, undefined, bankSlug);

    return {
        updateOne: {
            filter: { combinationSlug: combo },
            update: {
                $setOnInsert: {
                    type: "city-bank-deals",
                    citySlug: city.slug,
                    cityName: city.name,
                    areaSlug: null,
                    areaName: null,
                    categorySlug: null,
                    categoryName: null,
                    bankSlug,
                    bankName: bank.name,
                    combinationSlug: combo,
                    title: defaultTitle("city-bank-deals", city.name, undefined, undefined, bank.name),
                    metaDescription: defaultMeta("city-bank-deals", city.name, undefined, undefined, bank.name),
                    content: "",
                    isPublished: true,
                    isCustomized: false,
                },
            },
            upsert: true,
        },
    };
}

/**
 * Generate SeoPage entries for a newly created AREA.
 * Creates one area-category combo for each active category.
 */
export async function generateSeoPagesForArea(area: { name: string; slug: string; citySlug: string }) {
    try {
        const city = (await City.findOne({ slug: area.citySlug }).lean()) as any;
        if (!city) return;

        const categories = (await Category.find({ isActive: true }).lean()) as any[];
        const ops: any[] = [];

        // 1. Standalone city-area page (e.g., /lahore/gulberg)
        const areaSlug = buildComboSlug("city-area", city.slug, undefined, area.slug);
        ops.push({
            updateOne: {
                filter: { combinationSlug: areaSlug },
                update: {
                    $setOnInsert: {
                        type: "city-area",
                        citySlug: city.slug,
                        cityName: city.name,
                        areaSlug: area.slug,
                        areaName: area.name,
                        categorySlug: null,
                        categoryName: null,
                        bankSlug: null,
                        bankName: null,
                        combinationSlug: areaSlug,
                        title: defaultTitle("city-area", city.name, undefined, area.name),
                        metaDescription: defaultMeta("city-area", city.name, undefined, area.name),
                        content: "",
                        isPublished: true,
                        isCustomized: false,
                    },
                },
                upsert: true,
            },
        });

        // 2. Area + Category combos
        for (const cat of categories) {
            const combo = buildComboSlug("area-category", city.slug, cat.slug, area.slug);
            ops.push({
                updateOne: {
                    filter: { combinationSlug: combo },
                    update: {
                        $setOnInsert: {
                            type: "area-category",
                            citySlug: city.slug,
                            cityName: city.name,
                            areaSlug: area.slug,
                            areaName: area.name,
                            categorySlug: cat.slug,
                            categoryName: cat.name,
                            bankSlug: null,
                            bankName: null,
                            combinationSlug: combo,
                            title: defaultTitle("area-category", city.name, cat.name, area.name),
                            metaDescription: defaultMeta("area-category", city.name, cat.name, area.name),
                            content: "",
                            isPublished: true,
                            isCustomized: false,
                        },
                    },
                    upsert: true,
                },
            });
        }

        if (ops.length > 0) {
            await SeoPage.bulkWrite(ops, { ordered: false });
        }
        console.log(`[SeoPage] Generated ${ops.length} pages for area: ${area.name} (1 standalone + ${categories.length} combos)`);
    } catch (err) {
        console.error("[SeoPage] Area generation error:", err);
    }
}

/**
 * Generate SeoPage entries for a newly created CATEGORY.
 * Creates city-category combos for each active city +
 * area-category combos for each active area in each city.
 */
export async function generateSeoPagesForCategory(category: { name: string; slug: string }) {
    try {
        const cities = (await City.find({ isActive: true }).lean()) as any[];
        const areas = (await Area.find({ isActive: true }).lean()) as any[];

        const ops: any[] = [];

        // City + Category combos
        for (const city of cities) {
            const combo = buildComboSlug("city-category", city.slug, category.slug);
            ops.push({
                updateOne: {
                    filter: { combinationSlug: combo },
                    update: {
                        $setOnInsert: {
                            type: "city-category",
                            citySlug: city.slug,
                            cityName: city.name,
                            areaSlug: null,
                            areaName: null,
                            categorySlug: category.slug,
                            categoryName: category.name,
                            bankSlug: null,
                            bankName: null,
                            combinationSlug: combo,
                            title: defaultTitle("city-category", city.name, category.name),
                            metaDescription: defaultMeta("city-category", city.name, category.name),
                            content: "",
                            isPublished: true,
                            isCustomized: false,
                        },
                    },
                    upsert: true,
                },
            });
        }

        // Area + Category combos
        for (const area of areas) {
            const city = cities.find((c: any) => c.slug === area.citySlug);
            if (!city) continue;
            const combo = buildComboSlug("area-category", city.slug, category.slug, area.slug);
            ops.push({
                updateOne: {
                    filter: { combinationSlug: combo },
                    update: {
                        $setOnInsert: {
                            type: "area-category",
                            citySlug: city.slug,
                            cityName: city.name,
                            areaSlug: area.slug,
                            areaName: area.name,
                            categorySlug: category.slug,
                            categoryName: category.name,
                            bankSlug: null,
                            bankName: null,
                            combinationSlug: combo,
                            title: defaultTitle("area-category", city.name, category.name, area.name),
                            metaDescription: defaultMeta("area-category", city.name, category.name, area.name),
                            content: "",
                            isPublished: true,
                            isCustomized: false,
                        },
                    },
                    upsert: true,
                },
            });
        }

        if (ops.length > 0) {
            await SeoPage.bulkWrite(ops, { ordered: false });
        }
        console.log(`[SeoPage] Generated ${ops.length} combos for category: ${category.name}`);
    } catch (err) {
        console.error("[SeoPage] Category generation error:", err);
    }
}

/**
 * Generate bank-related SEO pages for one bank across all cities.
 */
export async function generateSeoPagesForBank(bank: { name: string; slug?: string | null }) {
    try {
        await ensureAllBankSlugs();

        const cities = (await City.find({ isActive: true }).lean()) as any[];
        const bankSlug = slugifyBankValue(bank.slug || bank.name);
        if (!bankSlug || cities.length === 0) return;

        const ops: any[] = [];

        for (const city of cities) {
            ops.push(buildCityDealsUpsert(city));
            ops.push(
                buildCityBankDealsUpsert(city, {
                    name: bank.name,
                    slug: bankSlug,
                }),
            );
        }

        if (ops.length > 0) {
            await SeoPage.bulkWrite(ops, { ordered: false });
        }

        console.log(`[SeoPage] Generated ${ops.length} bank-deals SEO pages for bank: ${bank.name}`);
    } catch (err) {
        console.error("[SeoPage] Bank generation error:", err);
    }
}

/**
 * Regenerate missing city-deals and city-bank-deals pages.
 */
export async function regenerateBankDealsSeoPages(): Promise<number> {
    await ensureAllBankSlugs();

    const [cities, banks] = await Promise.all([
        City.find({ isActive: true }).lean(),
        Bank.find({ isActive: true }).select("name slug").lean(),
    ]);

    const ops: any[] = [];

    for (const city of cities as any[]) {
        ops.push(buildCityDealsUpsert(city));

        for (const bank of banks as any[]) {
            ops.push(buildCityBankDealsUpsert(city, bank));
        }
    }

    if (ops.length > 0) {
        await SeoPage.bulkWrite(ops, { ordered: false });
    }

    console.log(`[SeoPage] Regenerated ${ops.length} total bank-deals combinations (city-deals + city-bank-deals)`);
    return ops.length;
}

/**
 * Regenerate ALL missing combinations (admin manual trigger).
 * Uses $setOnInsert so existing customized pages are never overwritten.
 */
export async function regenerateAllSeoPages(): Promise<number> {
    const cities = (await City.find({ isActive: true }).lean()) as any[];
    const areas = (await Area.find({ isActive: true }).lean()) as any[];
    const categories = (await Category.find({ isActive: true }).lean()) as any[];

    const ops: any[] = [];

    for (const city of cities) {
        // 1. City + Category pages (e.g., /lahore/bbq)
        for (const cat of categories) {
            const cityCatCombo = buildComboSlug("city-category", city.slug, cat.slug);
            ops.push({
                updateOne: {
                    filter: { combinationSlug: cityCatCombo },
                    update: {
                        $setOnInsert: {
                            type: "city-category",
                            citySlug: city.slug,
                            cityName: city.name,
                            areaSlug: null,
                            areaName: null,
                            categorySlug: cat.slug,
                            categoryName: cat.name,
                            bankSlug: null,
                            bankName: null,
                            combinationSlug: cityCatCombo,
                            title: defaultTitle("city-category", city.name, cat.name),
                            metaDescription: defaultMeta("city-category", city.name, cat.name),
                            content: "",
                            isPublished: true,
                            isCustomized: false,
                        },
                    },
                    upsert: true,
                },
            });
        }
    }

    // 2. Standalone Area pages (e.g., /lahore/gulberg)
    for (const area of areas) {
        const city = cities.find((c: any) => c.slug === area.citySlug);
        if (!city) continue;

        const areaCombo = buildComboSlug("city-area", city.slug, undefined, area.slug);
        ops.push({
            updateOne: {
                filter: { combinationSlug: areaCombo },
                update: {
                    $setOnInsert: {
                        type: "city-area",
                        citySlug: city.slug,
                        cityName: city.name,
                        areaSlug: area.slug,
                        areaName: area.name,
                        categorySlug: null,
                        categoryName: null,
                        bankSlug: null,
                        bankName: null,
                        combinationSlug: areaCombo,
                        title: defaultTitle("city-area", city.name, undefined, area.name),
                        metaDescription: defaultMeta("city-area", city.name, undefined, area.name),
                        content: "",
                        isPublished: true,
                        isCustomized: false,
                    },
                },
                upsert: true,
            },
        });

        // 3. Area + Category combos (e.g., /lahore/gulberg/bbq)
        for (const cat of categories) {
            const areaCatCombo = buildComboSlug("area-category", city.slug, cat.slug, area.slug);
            ops.push({
                updateOne: {
                    filter: { combinationSlug: areaCatCombo },
                    update: {
                        $setOnInsert: {
                            type: "area-category",
                            citySlug: city.slug,
                            cityName: city.name,
                            areaSlug: area.slug,
                            areaName: area.name,
                            categorySlug: cat.slug,
                            categoryName: cat.name,
                            bankSlug: null,
                            bankName: null,
                            combinationSlug: areaCatCombo,
                            title: defaultTitle("area-category", city.name, cat.name, area.name),
                            metaDescription: defaultMeta("area-category", city.name, cat.name, area.name),
                            content: "",
                            isPublished: true,
                            isCustomized: false,
                        },
                    },
                    upsert: true,
                },
            });
        }
    }

    if (ops.length > 0) {
        await SeoPage.bulkWrite(ops, { ordered: false });
    }

    const bankOps = await regenerateBankDealsSeoPages();

    const total = ops.length + bankOps;
    console.log(`[SeoPage] Regenerated ${total} total combinations (archive + bank-deals)`);
    return total;
}
