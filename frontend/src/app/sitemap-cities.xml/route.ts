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
    const { activeCities } = buildActiveCombinations(data, citySlugMap);

    for (const city of data.cities || []) {
      const citySlug = normalizePath(city.slug);
      if (!citySlug || !activeCities.has(citySlug)) continue;

      addEntry(entries, siteUrl, citySlug, {
        lastModified: city.updatedAt,
        changefreq: "weekly",
        priority: 0.9,
      });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[sitemap-cities] Failed:", msg);
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
