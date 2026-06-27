import type { NextConfig } from "next";
import withBundleAnalyzerBase from "@next/bundle-analyzer";

const withBundleAnalyzer = withBundleAnalyzerBase({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /* config options here */
  compress: true,
  trailingSlash: true,
  experimental: {
    cssChunking: "strict", // Smaller, route-specific CSS chunks
    reactCompiler: true,
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    minimumCacheTTL: 31536000, // 1 year edge cache
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "3001",
      }
    ],
  },
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' blob: data: https://* http://localhost:3001 http://127.0.0.1:3001;
      font-src 'self' https://fonts.gstatic.com;
      connect-src 'self' https://* http://localhost:3001 http://127.0.0.1:3001;
      frame-src 'self' https://fastapi.foodiespakistan.pk http://localhost:8500;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\n/g, "").replace(/\s{2,}/g, " ").trim();

    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
          { key: "Surrogate-Control", value: "no-store" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Content-Security-Policy", value: cspHeader },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/sitemap.xml',
          destination: '/sitemap-index.xml',
        },
      ],
    };
  },
  async redirects() {
    return [
      // NOTE: Do NOT add `/disclaimer` → `/disclaimer/` or `/about-us` → `/about-us/`
      // redirects — `trailingSlash: true` (set above) already handles this automatically.
      // Adding explicit redirects here creates redirect loops (ERR_TOO_MANY_REDIRECTS)
      // because they compete with the built-in trailing-slash handler.
      //
      // ── WordPress legacy category redirects ──
      {
        source: '/category/multan/',
        destination: '/multan/',
        permanent: true,
      },
      {
        source: '/category/lahore/',
        destination: '/lahore/',
        permanent: true,
      },
      {
        source: '/category/lahore',
        destination: '/lahore/',
        permanent: true,
      },
      {
        source: '/uncategorized/crumble-pakistan-menu/',
        destination: '/lahore/crumble-mm-alam/',
        permanent: true,
      },
      {
        source: '/lahore/bistro-noir-lahore-menu-with-prices/',
        destination: '/lahore/bistro-noir/',
        permanent: true,
      },
      {
        source: '/category/islamabad/',
        destination: '/islamabad/',
        permanent: true,
      },
      {
        source: '/category/karachi/',
        destination: '/karachi/',
        permanent: true,
      },
      // ── Broken dollar-sign ($) path redirects ──
      {
        source: '/%24',
        destination: '/',
        permanent: true,
      },
      {
        source: '/%24/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/%24/:path*',
        destination: '/',
        permanent: true,
      },
      // ── index.html variants ──
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/Index.html',
        destination: '/',
        permanent: true,
      },
      // ── WordPress legacy paths ──
      {
        source: '/uncategorized/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/author/:slug*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/feed/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/wp-json/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/wp-admin/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/wp-content/:path*',
        destination: '/',
        permanent: true,
      },
      // ── Old sitemap redirect ──
      {
        source: '/sitemap_index.xml',
        destination: '/sitemap.xml',
        permanent: true,
      },
      {
        source: '/sitemap_index.xml/:path*',
        destination: '/sitemap.xml',
        permanent: true,
      },
      // ── Broken "foodies" prefix pages ──
      {
        source: '/foodies',
        destination: '/',
        permanent: true,
      },
      {
        source: '/foodies/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/foodies/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/Foodies',
        destination: '/',
        permanent: true,
      },
      {
        source: '/Foodies/',
        destination: '/',
        permanent: true,
      },
      // ── Short alias redirects to canonical long paths ──
      {
        source: '/about',
        destination: '/about-us/',
        permanent: true,
      },
      {
        source: '/about/',
        destination: '/about-us/',
        permanent: true,
      },
      {
        source: '/contact',
        destination: '/contact-us/',
        permanent: true,
      },
      {
        source: '/contact/',
        destination: '/contact-us/',
        permanent: true,
      },
      {
        source: '/privacy',
        destination: '/privacy-policy/',
        permanent: true,
      },
      {
        source: '/privacy/',
        destination: '/privacy-policy/',
        permanent: true,
      },
      {
        source: '/terms',
        destination: '/terms-conditions/',
        permanent: true,
      },
      {
        source: '/terms/',
        destination: '/terms-conditions/',
        permanent: true,
      },
      // ── Old deals page without city ──
      {
        source: '/deals',
        destination: '/',
        permanent: true,
      },
      {
        source: '/deals/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/deals/:path*',
        destination: '/',
        permanent: true,
      },
      // ── Register owner without trailing ──
      {
        source: '/register/owner',
        destination: '/register/owner/',
        permanent: true,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);