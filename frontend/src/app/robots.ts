import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { buildSiteUrl, getRequestSiteUrl } from "@/lib/sitemap-utils";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const siteUrl = await getRequestSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // ── Private / auth areas ──
          "/api/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/account",
          "/account/",
          "/my-bookings",
          "/my-bookings/",
          "/my-reviews",
          "/my-reviews/",
          "/saved",
          "/saved/",
          "/wallet",
          "/wallet/",
          "/order/",
          "/refer",
          "/refer/",
          "/foodiepay",
          "/foodiepay/",
          "/payment/",
          "/moezlogin/",
          "/moezlogin",
          "/owner/",
          "/owner",
          "/admin",
          "/admin/",
          "/search",
          "/search/",
          "/profile/",
          "/profile",
          // ── Internal-only pages (not linked publicly) ──
          "/gift-cards",
          "/gift-cards/",
          // ── Virtual tour sub-pages (noindex on-page, but also block to save crawl budget) ──
          "/*/virtual-tour/",
          "/*/virtual-tour",
          // ── Query-param duplicate URL prevention ──
          "/*?v=arch",
          "/*?*&v=arch*",
          "/*?sort=*",
          "/*?*&sort=*",
          "/*?minDiscount=*",
          "/*?*&minDiscount=*",
          "/*?area=*",
          "/*?cuisine=*",
          "/*?filter=*",
          "/*?page=*",
          "/*?*&page=*",
          "/*?feed=*",
          "/*?s=*",
          "/*?referrer=*",
          "/*?*&referrer=*",
          "/*?code=*",
          "/*?*&code=*",
          // ── WordPress legacy paths ──
          "/wp-admin/",
          "/wp-content/",
          "/wp-json/",
          "/wp-json",
          "/wp-includes/",
          "/wp-login.php",
          "/xmlrpc.php",
          "/author/",
          "/feed/",
          "/category/",
          "/uncategorized/",
          "/uncategorized",
          "/index.html",
          "/Index.html",
          "/index.html/*",
          // ── Pagination (thin content for page 2+) ──
          "/*/page/",
          // ── Broken URL patterns ──
          "/$",
          "/$/",
          "/*$*",
          "/sitemap_index.xml",
        ],
      },
      { userAgent: "CCBot", disallow: ["/"] },
      { userAgent: "AhrefsBot", disallow: ["/"] },
      { userAgent: "SemrushBot", disallow: ["/"] },
      { userAgent: "MJ12bot", disallow: ["/"] },
      { userAgent: "DotBot", disallow: ["/"] },
      { userAgent: "BLEXBot", disallow: ["/"] },
      { userAgent: "DataForSeoBot", disallow: ["/"] },
      { userAgent: "PetalBot", disallow: ["/"] },
      { userAgent: "Seekport", disallow: ["/"] },
      { userAgent: "magpie-crawler", disallow: ["/"] },
      { userAgent: "Bytedance", disallow: ["/"] },
    ],
    sitemap: buildSiteUrl("sitemap.xml", { siteUrl, trailingSlash: false }),
  };
}