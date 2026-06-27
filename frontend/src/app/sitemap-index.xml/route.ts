import { NextResponse } from "next/server";
import {
  buildSiteUrl,
  getRequestSiteUrl,
} from "@/lib/sitemap-utils";

export const dynamic = "force-dynamic";

const SUB_SITEMAPS = [
  "sitemap-pages.xml",
  "sitemap-cities.xml",
  "sitemap-restaurants.xml",
  "sitemap-categories.xml",
  "sitemap-areas.xml",
  "sitemap-deals.xml",
] as const;

export async function GET() {
  const siteUrl = await getRequestSiteUrl();
  const lastModified = new Date().toISOString();

  const sitemaps = SUB_SITEMAPS.map(
    (name) => `  <sitemap>
    <loc>${buildSiteUrl(name, { siteUrl, trailingSlash: false })}</loc>
    <lastmod>${lastModified}</lastmod>
  </sitemap>`,
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
