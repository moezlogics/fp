import { headers } from "next/headers";

const RAW_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";
const RAW_API_BASE_URL =
  process.env.CORE_API_URL || "http://localhost:4000/api/v1";

export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, "");
export const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");

export const SITEMAP_SHARDS = [0, 1, 2, 3, 4, 5] as const;

export type SitemapShardId = (typeof SITEMAP_SHARDS)[number];
export type SitemapShardParam =
  | SitemapShardId
  | string
  | Promise<SitemapShardId | string>;

function firstHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.split(",")[0]?.trim() || null;
}

export async function getRequestSiteUrl(): Promise<string> {
  const headerStore = await headers();
  const forwardedHost = firstHeaderValue(headerStore.get("x-forwarded-host"));
  const host = forwardedHost || firstHeaderValue(headerStore.get("host"));

  if (!host) {
    return SITE_URL;
  }

  const forwardedProto = firstHeaderValue(
    headerStore.get("x-forwarded-proto"),
  );
  const protocol =
    forwardedProto ||
    (host.includes("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`.replace(/\/+$/, "");
}

export function normalizePath(value: unknown): string | null {
  const path = String(value ?? "").trim().replace(/^\/+|\/+$/g, "");
  return path || null;
}

export function deriveCitySlug(value: unknown): string | null {
  const citySlug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  return normalizePath(citySlug);
}

export function buildSiteUrl(
  path?: string | null,
  options: { siteUrl?: string; trailingSlash?: boolean } = {},
): string {
  const baseSiteUrl = (options.siteUrl || SITE_URL).replace(/\/+$/, "");
  const normalizedPath = normalizePath(path);
  const wantsSlash = options.trailingSlash !== false;

  if (!normalizedPath) {
    return wantsSlash ? `${baseSiteUrl}/` : baseSiteUrl;
  }

  const pathname = wantsSlash ? `${normalizedPath}/` : normalizedPath;

  return new URL(pathname, `${baseSiteUrl}/`).toString();
}

export function toLastModified(value: unknown): Date {
  const lastModified = value ? new Date(String(value)) : new Date();
  return Number.isNaN(lastModified.getTime()) ? new Date() : lastModified;
}

export async function resolveSitemapShardId(
  idParam: SitemapShardParam,
): Promise<SitemapShardId | null> {
  const rawId = await idParam;
  const shardId =
    typeof rawId === "number" ? rawId : Number.parseInt(String(rawId), 10);

  if (!Number.isInteger(shardId)) {
    return null;
  }

  return SITEMAP_SHARDS.includes(shardId as SitemapShardId)
    ? (shardId as SitemapShardId)
    : null;
}
