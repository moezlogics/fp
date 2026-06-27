import {
  addEntry,
  buildCitySlugMap,
  buildUrlsetXml,
  fetchSitemapData,
  getRequestSiteUrl,
  normalizePath,
  resolveCitySlug,
  xmlResponse,
} from "@/lib/sitemap-builder";

export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = await getRequestSiteUrl();
  const entries: Parameters<typeof buildUrlsetXml>[0] = [];

  try {
    const data = await fetchSitemapData();
    const citySlugMap = buildCitySlugMap(data.cities);

    for (const restaurant of data.restaurants || []) {
      const restaurantSlug = normalizePath(restaurant.slug);
      const citySlug = resolveCitySlug(restaurant, citySlugMap);

      if (!citySlug || !restaurantSlug) continue;

      addEntry(entries, siteUrl, `${citySlug}/${restaurantSlug}`, {
        lastModified: restaurant.updatedAt,
        changefreq: "weekly",
        priority: 0.7,
        trailingSlash: true,
      });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[sitemap-restaurants] Failed:", msg);
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
