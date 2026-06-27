import {
  API_BASE_URL,
  buildSiteUrl,
  deriveCitySlug,
  getRequestSiteUrl,
  normalizePath,
  toLastModified,
} from "@/lib/sitemap-utils";
import { NextResponse } from "next/server";

// ── Types ──

export type SitemapApiData = {
  articles?: Array<{ slug?: string; updatedAt?: string }>;
  categories?: Array<{ slug?: string }>;
  areas?: Array<{ slug?: string; citySlug?: string; updatedAt?: string }>;
  cities?: Array<{ name?: string; slug?: string; updatedAt?: string }>;
  banks?: Array<{ _id?: string; slug?: string; name?: string }>;
  restaurants?: Array<{
    _id?: string;
    city?: string;
    citySlug?: string;
    slug?: string;
    area?: string;
    areas?: string[];
    cuisines?: string[];
    updatedAt?: string;
  }>;
  seoPages?: Array<{
    combinationSlug?: string;
    type?: string;
    updatedAt?: string;
  }>;
  deals?: Array<{
    restaurantId?: string;
    bankId?: string;
    updatedAt?: string;
  }>;
};

type SitemapUrlEntry = {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
};

// ── In-memory cache (prevents 429 rate limiting from concurrent requests) ──

let cachedData: { data: SitemapApiData; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

export async function fetchSitemapData(): Promise<SitemapApiData> {
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL_MS) {
    return cachedData.data;
  }

  const url = `${API_BASE_URL}/search/sitemap-data`;
  console.log("[Sitemap] Fetching sitemap-data from:", url);

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`[Sitemap] API returned ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as {
    data?: SitemapApiData;
    error?: string;
    success?: boolean;
  };

  if (!json.success) {
    throw new Error(
      `[Sitemap] API returned success=false: ${json.error || "unknown"}`,
    );
  }

  cachedData = { data: json.data || {}, timestamp: Date.now() };
  return cachedData.data;
}

// ── Helpers ──

function lookupKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function buildCitySlugMap(
  cities: SitemapApiData["cities"],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const city of cities || []) {
    const citySlug = normalizePath(city.slug);
    if (!citySlug) continue;
    for (const key of [city.name, city.slug]) {
      const k = lookupKey(key);
      if (k) map.set(k, citySlug);
    }
  }
  return map;
}

export function resolveCitySlug(
  restaurant: { city?: string; citySlug?: string },
  citySlugMap: Map<string, string>,
): string | null {
  return (
    normalizePath(restaurant.citySlug) ||
    citySlugMap.get(lookupKey(restaurant.city)) ||
    deriveCitySlug(restaurant.city)
  );
}

export function buildActiveCombinations(data: SitemapApiData, citySlugMap: Map<string, string>) {
  const activeCities = new Set<string>();
  const activeCityCategory = new Set<string>();
  const activeCityArea = new Set<string>();
  const activeCityAreaCategory = new Set<string>();

  for (const r of data.restaurants || []) {
    const citySlug = resolveCitySlug(r, citySlugMap);
    if (!citySlug) continue;

    activeCities.add(citySlug);

    // categories
    for (const cuisine of r.cuisines || []) {
      const cSlug = normalizePath(cuisine);
      if (cSlug) activeCityCategory.add(`${citySlug}/${cSlug}`);
    }

    // areas
    const allAreas = new Set<string>();
    if (r.area) allAreas.add(r.area);
    if (r.areas) r.areas.forEach(a => allAreas.add(a));

    for (const area of allAreas) {
      const aSlug = normalizePath(area);
      if (aSlug) {
        activeCityArea.add(`${citySlug}/${aSlug}`);
        
        // combos
        for (const cuisine of r.cuisines || []) {
          const cSlug = normalizePath(cuisine);
          if (cSlug) activeCityAreaCategory.add(`${citySlug}/${aSlug}/${cSlug}`);
        }
      }
    }
  }

  // Calculate active deals per city and bank
  const activeCityDeals = new Set<string>();
  const activeCityBankDeals = new Set<string>();

  // Map restaurantId to citySlug
  const restaurantCityMap = new Map<string, string>();
  for (const r of data.restaurants || []) {
    const slug = resolveCitySlug(r, citySlugMap);
    if (slug && r._id) {
       restaurantCityMap.set(String(r._id), slug);
    }
  }

  for (const deal of data.deals || []) {
    if (!deal.restaurantId) continue;
    const citySlug = restaurantCityMap.get(String(deal.restaurantId));
    if (!citySlug) continue;

    activeCityDeals.add(citySlug);
    if (deal.bankId) {
      const bank = (data.banks || []).find(b => String(b._id) === String(deal.bankId));
      if (bank) {
        // Fallback to slugify if slug is missing, but bank.slug should be there
        const bankSlug = bank.slug || bank.name?.toLowerCase().replace(/\s+/g, '-');
        if (bankSlug) {
          activeCityBankDeals.add(`${citySlug}_${bankSlug}`);
        }
      }
    }
  }

  return { activeCities, activeCityCategory, activeCityArea, activeCityAreaCategory, activeCityDeals, activeCityBankDeals, restaurantCityMap };
}

// ── XML Builder ──

export function buildUrlsetXml(entries: SitemapUrlEntry[]): string {
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Entry Builder ──

export function addEntry(
  entries: SitemapUrlEntry[],
  siteUrl: string,
  path: string | null | undefined,
  options: {
    changefreq: string;
    lastModified?: unknown;
    priority: number;
    trailingSlash?: boolean;
  },
): void {
  if (path == null) return;
  if (path !== "" && !normalizePath(path)) return;

  entries.push({
    loc: buildSiteUrl(path, {
      siteUrl,
      trailingSlash: options.trailingSlash,
    }),
    lastmod: toLastModified(options.lastModified).toISOString(),
    changefreq: options.changefreq,
    priority: String(options.priority),
  });
}

// ── Response Helper ──

export function xmlResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

// Re-export for convenience
export { getRequestSiteUrl, normalizePath };
