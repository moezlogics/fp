import {
  addEntry,
  buildUrlsetXml,
  fetchSitemapData,
  getRequestSiteUrl,
  normalizePath,
  xmlResponse,
  buildCitySlugMap,
  buildActiveCombinations,
} from "@/lib/sitemap-builder";

export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = await getRequestSiteUrl();
  const entries: Parameters<typeof buildUrlsetXml>[0] = [];

  try {
    const data = await fetchSitemapData();
    const citySlugMap = buildCitySlugMap(data.cities);
    const { activeCityArea, activeCityAreaCategory } = buildActiveCombinations(data, citySlugMap);

    // 1. Single Areas (Only if they have restaurants)
    // Removed per SEO analysis: Area-only pages are set to noindex to save crawl budget.

    // 2. Area + Category Combinations (Only if they have restaurants)
    for (const combo of activeCityAreaCategory) {
       addEntry(entries, siteUrl, combo, {
         lastModified: new Date(),
         changefreq: "weekly",
         priority: 0.7,
       });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[sitemap-areas] Failed:", msg);
  }

  // GSC requires at least one <url> tag to consider the XML valid.
  if (entries.length === 0) {
    addEntry(entries, siteUrl, "", {
      lastModified: new Date(),
      changefreq: "weekly",
      priority: 0.1,
    });
  }

  return xmlResponse(buildUrlsetXml(entries));
}
