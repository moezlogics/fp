import {
  addEntry,
  buildUrlsetXml,
  fetchSitemapData,
  getRequestSiteUrl,
  normalizePath,
  xmlResponse,
} from "@/lib/sitemap-builder";

export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = await getRequestSiteUrl();
  const entries: Parameters<typeof buildUrlsetXml>[0] = [];

  // ── Static pages ──
  addEntry(entries, siteUrl, "", {
    lastModified: new Date(),
    changefreq: "daily",
    priority: 1.0,
  });
  addEntry(entries, siteUrl, "about-us", {
    lastModified: new Date(),
    changefreq: "monthly",
    priority: 0.3,
  });
  addEntry(entries, siteUrl, "contact-us", {
    lastModified: new Date(),
    changefreq: "monthly",
    priority: 0.3,
  });
  addEntry(entries, siteUrl, "terms-conditions", {
    lastModified: new Date(),
    changefreq: "monthly",
    priority: 0.3,
  });
  addEntry(entries, siteUrl, "privacy-policy", {
    lastModified: new Date(),
    changefreq: "monthly",
    priority: 0.3,
  });
  addEntry(entries, siteUrl, "disclaimer", {
    lastModified: new Date(),
    changefreq: "monthly",
    priority: 0.3,
  });
  addEntry(entries, siteUrl, "prime", {
    lastModified: new Date(),
    changefreq: "weekly",
    priority: 0.8,
  });
  addEntry(entries, siteUrl, "payment-options", {
    lastModified: new Date(),
    changefreq: "monthly",
    priority: 0.3,
  });

  // ── Articles ──
  try {
    const data = await fetchSitemapData();
    for (const article of data.articles || []) {
      const articleSlug = normalizePath(article.slug);
      if (!articleSlug) continue;

      addEntry(entries, siteUrl, `articles/${articleSlug}`, {
        lastModified: article.updatedAt,
        changefreq: "monthly",
        priority: 0.6,
      });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[sitemap-pages] Failed:", msg);
  }

  return xmlResponse(buildUrlsetXml(entries));
}
