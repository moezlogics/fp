import express from "express";
import { Restaurant } from "../../models/Restaurant";
import { Category } from "../../models/Category";
import { Area } from "../../models/Area";
import { successResponse, errorResponse } from "../../utils/api-response";
import { autocompleteSearch, fuzzySearch, getPaginatedRestaurants } from "../../services/fuse-search";

const router = express.Router();

/**
 * GET /api/v1/search/autocomplete
 * Fuse.js fuzzy autocomplete — handles typos like "brger" → "burger"
 * Query: ?q=burger
 */
router.get("/autocomplete", async (req, res) => {
    try {
        const q = req.query.q as string;
        if (!q || q.length < 2) {
            successResponse(res, { restaurants: [], categories: [], areas: [] });
            return;
        }

        // Fuse.js fuzzy search for restaurants
        const restaurants = await autocompleteSearch(q, 5);

        // Categories & Areas — still regex (small dataset, fuzzy not critical)
        const regex = new RegExp(q, "i");
        const [categories, areas] = await Promise.all([
            Category.find({ name: regex, isActive: true })
                .select("name slug icon image")
                .limit(3)
                .lean(),
            Area.find({ name: regex, isActive: true })
                .select("name slug citySlug")
                .limit(3)
                .lean(),
        ]);

        successResponse(res, { restaurants, categories, areas });
    } catch (error: any) {
        console.error("[Search] Autocomplete error:", error);
        errorResponse(res, "Search failed", 500);
    }
});

/**
 * GET /api/v1/search
 * Fuse.js full fuzzy search — typo-tolerant, relevance-ranked
 * Query: ?q=burger&limit=8
 */
router.get("/", async (req, res) => {
    try {
        const q = req.query.q as string;
        const limitStr = req.query.limit as string;
        const limit = parseInt(limitStr || "8", 10);
        const preferCity = (req.query.city as string) || undefined;

        if (!q || !q.trim()) {
            successResponse(res, []);
            return;
        }

        const { results } = await fuzzySearch(q, limit, preferCity);
        successResponse(res, results);
    } catch (error: any) {
        console.error("[Search] Full search error:", error);
        errorResponse(res, "Search failed", 500);
    }
});

/**
 * GET /api/v1/search/load-more
 * Paginated restaurant fetch for AJAX load-more on archive pages
 * Query: ?city=lahore&page=2&limit=12&sort=rating&minRating=4&area=dha&cuisine=pizza
 */
router.get("/load-more", async (req, res) => {
    try {
        const city = (req.query.city as string) || "";
        const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || "12", 10)));
        const sort = (req.query.sort as string) || "";
        const minRating = parseFloat(req.query.minRating as string || "0");
        const area = (req.query.area as string) || "";
        const cuisine = (req.query.cuisine as string) || "";

        const result = await getPaginatedRestaurants({
            city: city || undefined,
            area: area || undefined,
            cuisine: cuisine || undefined,
            page,
            limit,
            sort: sort || undefined,
            minRating: minRating > 0 ? minRating : undefined,
        });

        successResponse(res, result);
    } catch (error: any) {
        console.error("[Search] Load-more error:", error);
        errorResponse(res, "Load more failed", 500);
    }
});

/**
 * GET /api/v1/search/city/:city/tag/:tag
 * Public: Get restaurants by city and tag (Category or Area)
 * Also returns: areas list for sidebar, SeoPage custom content
 */
router.get("/city/:city/tag/:tag", async (req, res) => {
    try {
        const { city, tag } = req.params;
        const { City } = require("../../models/City");
        const { SeoPage } = require("../../models/SeoPage");

        const cityDoc = await City.findOne({ slug: city }).lean() as any;
        if (!cityDoc) {
            errorResponse(res, "City not found", 404);
            return;
        }

        const category = await Category.findOne({ slug: tag }).lean() as any;
        const area = await Area.findOne({ slug: tag, citySlug: city }).lean() as any;

        if (!category && !area) {
            errorResponse(res, "Tag not found", 404);
            return;
        }

        const query: any = { city: { $regex: new RegExp(city, "i") }, isApproved: true, isActive: true };
        if (category) query.cuisines = { $regex: new RegExp(category.name, "i") };
        if (area) {
            const areaRegex = new RegExp(area.name, "i");
            query.$or = [{ area: { $regex: areaRegex } }, { areas: { $regex: areaRegex } }];
        }

        const seoSlug = area
            ? `${city}/${area.slug}/${tag}`
            : `${city}/${tag}`;

        const [restaurants, cityAreas, seoPage] = await Promise.all([
            Restaurant.find(query).sort({ isFeatured: -1, averageRating: -1 }).lean(),
            Area.find({ citySlug: city, isActive: true }).sort({ name: 1 }).select("name slug latitude longitude").lean(),
            SeoPage.findOne({ combinationSlug: seoSlug, isPublished: true }).lean(),
        ]);

        // Return total count for load-more
        successResponse(res, { cityDoc, category, area, restaurants, total: restaurants.length, areas: cityAreas, seoPage });
    } catch (error: any) {
        console.error("[Search] Tag search error:", error);
        errorResponse(res, "Tag search failed", 500);
    }
});

/**
 * GET /api/v1/search/city/:city/area/:area/category/:category
 * Public: Get restaurants filtered by BOTH area AND category in a city
 * For combo pages like /lahore/gulberg/bbq
 */
router.get("/city/:city/area/:area/category/:category", async (req, res) => {
    try {
        const { city, area: areaSlug, category: catSlug } = req.params;
        const { City } = require("../../models/City");
        const { SeoPage } = require("../../models/SeoPage");

        const cityDoc = await City.findOne({ slug: city }).lean() as any;
        if (!cityDoc) {
            errorResponse(res, "City not found", 404);
            return;
        }

        const [category, area] = await Promise.all([
            Category.findOne({ slug: catSlug }).lean() as any,
            Area.findOne({ slug: areaSlug, citySlug: city }).lean() as any,
        ]);

        if (!category || !area) {
            errorResponse(res, "Area or category not found", 404);
            return;
        }

        const areaRegex = new RegExp(area.name, "i");
        // Combined query: both area AND cuisine
        const query: any = {
            city: { $regex: new RegExp(city, "i") },
            $or: [{ area: { $regex: areaRegex } }, { areas: { $regex: areaRegex } }],
            cuisines: { $regex: new RegExp(category.name, "i") },
            isApproved: true,
            isActive: true,
        };

        const seoSlug = `${city}/${areaSlug}/${catSlug}`;

        const [restaurants, cityAreas, seoPage, allCategories] = await Promise.all([
            Restaurant.find(query).sort({ isFeatured: -1, averageRating: -1 }).lean(),
            Area.find({ citySlug: city, isActive: true }).sort({ name: 1 }).select("name slug latitude longitude").lean(),
            SeoPage.findOne({ combinationSlug: seoSlug, isPublished: true }).lean(),
            Category.find({ isActive: true }).sort({ name: 1 }).select("name slug icon").lean(),
        ]);

        successResponse(res, {
            cityDoc,
            category,
            area,
            restaurants,
            total: restaurants.length,
            areas: cityAreas,
            categories: allCategories,
            seoPage,
        });
    } catch (error: any) {
        console.error("[Search] Area+Category combo error:", error);
        errorResponse(res, "Combo search failed", 500);
    }
});

/**
 * GET /api/v1/search/sitemap-data
 * Public: Get data for sitemap generation
 */
router.get("/sitemap-data", async (req, res) => {
    try {
        const { City } = require("../../models/City");
        const { Article } = require("../../models/Article");
        const { SeoPage } = require("../../models/SeoPage");
        const { Deal } = require("../../models/Deal");
        const { Bank } = require("../../models/Bank");

        const [cities, categories, areas, restaurants, articles, seoPages, deals, banks] = await Promise.all([
            City.find({ isActive: true }).lean(),
            Category.find({ isActive: true }).lean(),
            Area.find({ isActive: true }).select("slug citySlug updatedAt").lean(),
            Restaurant.find({ isApproved: true, isActive: true }).select("slug city citySlug area areas cuisines updatedAt").lean(),
            Article.find({ isPublished: true }).select("slug updatedAt").lean(),
            SeoPage.find({ isPublished: true }).select("combinationSlug updatedAt type").lean(),
            Deal.find({ isActive: true }).select("restaurantId bankId updatedAt").lean(),
            Bank.find({ isActive: true }).select("name slug").lean(),
        ]);

        successResponse(res, { cities, categories, areas, restaurants, articles, seoPages, deals, banks });
    } catch (error: any) {
        console.error("[Search] Sitemap data error:", error);
        errorResponse(res, "Sitemap data fetch failed", 500);
    }
});

export default router;
