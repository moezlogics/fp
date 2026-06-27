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
    const { activeCityDeals, activeCityBankDeals } = buildActiveCombinations(data, citySlugMap);

    // 1. City Deals Pages — only include cities that have active deals
    for (const citySlug of activeCityDeals) {
      addEntry(entries, siteUrl, `${citySlug}/deals`, {
        lastModified: new Date(),
        changefreq: "weekly",
        priority: 0.8,
        trailingSlash: true,
      });
    }

    // 2. City + Bank Deals Pages — only include combinations where the bank has active deals in that city
    for (const combo of activeCityBankDeals) {
      // combo format is "citySlug_bankSlug"
      const [citySlug, bankSlug] = combo.split("_");
      if (!citySlug || !bankSlug) continue;

      addEntry(entries, siteUrl, `${citySlug}/deals/${bankSlug}`, {
        lastModified: new Date(),
        changefreq: "weekly",
        priority: 0.75,
        trailingSlash: true,
      });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[sitemap-deals] Failed:", msg);
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
