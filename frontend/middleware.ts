import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const nextAuth = NextAuth(authConfig);

// Patterns that indicate a garbage/broken URL path segment
const GARBAGE_PATH_PATTERNS = [
  /\]/, // bracket-in-URL like /]foodies/
  /\)/, // parenthesis-in-URL like /)/
  /\*/, // wildcard-in-URL like /wp-content/*/
  /\$/, // dollar-sign like /$/
  /\.php$/, // PHP files
  /\.asp$/, // ASP files
  /wp-login/, // WordPress login
  /wp-includes/, // WordPress includes
  /xmlrpc/, // WordPress XML-RPC
];

// Legacy/WordPress paths that should return 410 Gone (tells Google: "permanently removed")
// Using 410 instead of 404 makes Google deindex faster.
const GONE_PREFIXES = [
  "/wp-admin/admin-ajax.php",
  "/wp-login.php",
  "/xmlrpc.php",
  "/wp-includes/",
  "/wp-json/",            // WordPress REST API (old CMS)
  "/wp-json",             // without trailing slash
  "/uncategorized/",      // WordPress default category
  "/uncategorized",       // without trailing slash
];

// Exact legacy URLs that should be 410 Gone
const GONE_EXACT = new Set<string>([
  "/wp-json",
  "/uncategorized",
  "/index.html/cafe",
  "/index.html/fast-food",
  "/index.html/chinese",
  "/index.html/desi",
]);

// Prefixes that are internal and should never be rewritten by slug normalization
const NORMALIZE_SKIP_PREFIXES = [
  "/api",
  "/_next",
  "/moezlogin",
  "/owner",
  "/admin",
  "/account",
  "/my-bookings",
  "/my-reviews",
  "/saved",
  "/wallet",
  "/foodiepay",
  "/payment",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/profile",
  "/refer",
  "/order",
  "/search",
];

function needsSlugNormalization(pathname: string): boolean {
  // Skip internal/auth/api paths
  if (NORMALIZE_SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return false;
  }
  // Skip file paths (anything with a dot in last segment — favicon.ico, sitemap.xml etc.)
  const lastSegment = pathname.split("/").filter(Boolean).pop() || "";
  if (/\.[a-z0-9]{2,5}$/i.test(lastSegment)) return false;

  // Decode URL-encoded chars (%20 = space) to detect spaces
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { return false; }

  // Detect: uppercase letters, spaces, or multiple consecutive dashes in any segment
  if (/[A-Z]/.test(decoded)) return true;
  if (/\s/.test(decoded)) return true;
  return false;
}

function normalizeSlug(pathname: string): string {
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { return pathname; }

  const segments = decoded.split("/").filter(Boolean).map((seg) =>
    seg
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")       // spaces → dash
      .replace(/-+/g, "-")        // collapse multiple dashes
      .replace(/^-|-$/g, ""),     // trim leading/trailing dashes
  );

  const hadTrailingSlash = pathname.endsWith("/");
  const result = "/" + segments.join("/") + (hadTrailingSlash ? "/" : "");
  return result;
}

function handleSEO(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;

  // 1. Exact legacy 410 Gone URLs
  if (GONE_EXACT.has(pathname) || GONE_EXACT.has(pathname.replace(/\/$/, ""))) {
    return new NextResponse("Gone", { status: 410 });
  }

  // 2. Garbage path patterns → return 404
  for (const pattern of GARBAGE_PATH_PATTERNS) {
    if (pattern.test(pathname)) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  // 3. WordPress legacy path prefixes → return 410 Gone
  for (const prefix of GONE_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return new NextResponse("Gone", { status: 410 });
    }
  }

  // 4. Legacy /index.html/* sub-paths → 410 Gone (WordPress holdover)
  if (pathname.startsWith("/index.html/") || pathname === "/index.html") {
    return new NextResponse("Gone", { status: 410 });
  }

  // 5. Strip ?v=arch from URLs — 301 redirect to clean canonical
  if (search.includes("v=arch")) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("v");
    const cleanUrl = url.searchParams.toString()
      ? `${url.pathname}?${url.searchParams.toString()}`
      : url.pathname;
    return NextResponse.redirect(new URL(cleanUrl, request.url), 301);
  }

  // 6. Strip deals filter query params for SEO (?sort, ?minDiscount) →
  //    301 redirect bare deals URL to itself without the filter params
  //    Googlebot requests shouldn't see filtered content; human users still work because
  //    the client-side filter UI uses JS navigation, not full-page loads.
  if (/\/deals\/?$/.test(pathname) || /\/deals\/[^/]+\/?$/.test(pathname)) {
    const url = request.nextUrl.clone();
    let stripped = false;
    if (url.searchParams.has("sort")) { url.searchParams.delete("sort"); stripped = true; }
    if (url.searchParams.has("minDiscount")) { url.searchParams.delete("minDiscount"); stripped = true; }
    if (stripped) {
      const ua = request.headers.get("user-agent") || "";
      // Only redirect for bots — let human users keep their filter in the URL
      if (/bot|crawl|spider|slurp|google|bing|yandex|duckduck/i.test(ua)) {
        const cleanUrl = url.searchParams.toString()
          ? `${url.pathname}?${url.searchParams.toString()}`
          : url.pathname;
        return NextResponse.redirect(new URL(cleanUrl, request.url), 301);
      }
    }
  }

  // 7. Block ?feed= and ?s= WordPress query patterns
  if (search.includes("feed=") || /[?&]s=/.test(search)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // 8. Block ?referrer=saleboard and ?code= spam
  if (search.includes("referrer=saleboard") || /[?&]code=PD-/i.test(search)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // 9. Slug normalization — 301 redirect URLs with spaces/uppercase/double-dashes
  //    to their canonical lowercase-dashed form.
  //    This fixes GSC errors like `/multan/Billi Wala/Chinese/` → `/multan/billi-wala/chinese/`
  if (needsSlugNormalization(pathname)) {
    const normalized = normalizeSlug(pathname);
    if (normalized !== pathname && normalized.length > 1) {
      const cleanUrl = search ? `${normalized}${search}` : normalized;
      return NextResponse.redirect(new URL(cleanUrl, request.url), 301);
    }
  }

  return null;
}

// Wrap the NextAuth middleware to add SEO handling
export default async function middleware(request: NextRequest) {
  // Run SEO checks first
  const seoResponse = handleSEO(request);
  if (seoResponse) return seoResponse;

  // Then run NextAuth
  // @ts-expect-error - NextAuth types
  return nextAuth.auth(request);
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$|.*\\.avif$|.*\\.svg$|.*\\.ico$|.*\\.woff2?$|favicon.ico|manifest.json|robots.txt|sitemap).*)",
  ],
};