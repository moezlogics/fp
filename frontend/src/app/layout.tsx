  import type { Metadata } from "next";
  import { Inter, Outfit } from "next/font/google";
  import { Providers } from "@/components/providers";
  import { getPublicSiteSettings } from "@/lib/public-site-settings";
  import Script from "next/script";
  import "./globals.css";

  const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    display: "swap",
    preload: true,
    fallback: ["system-ui", "-apple-system", "sans-serif"],
  });

  const outfit = Outfit({
    variable: "--font-outfit",
    subsets: ["latin"],
    display: "swap",
    preload: true,
    fallback: ["system-ui", "-apple-system", "sans-serif"],
  });

  const SITE_URL = "https://foodiespakistan.pk";

  export async function generateMetadata(): Promise<Metadata> {
    const settings = await getPublicSiteSettings(60);
    const title = settings.defaultMetaTitle || settings.siteName;
    const description = settings.defaultMetaDescription;
    const siteName = settings.siteName;

    return {
      metadataBase: new URL(SITE_URL),
      title,
      description,
      manifest: "/manifest.json",
      openGraph: {
        type: "website",
        locale: "en_PK",
        url: SITE_URL,
        siteName,
        title,
        description,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      icons: {
        icon: settings.faviconUrl || "/favicon.png",
        apple: settings.faviconUrl || "/favicon.png",
      },
    };
  }

  import { auth } from "@/auth";

  export default async function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    const session = await auth();
    const settings = await getPublicSiteSettings(60);

    // Build Social Links Array dynamically
    const sameAs: string[] = [];
    if (settings.facebookUrl) sameAs.push(settings.facebookUrl);
    if (settings.instagramUrl) sameAs.push(settings.instagramUrl);
    if (settings.tiktokUrl) sameAs.push(settings.tiktokUrl);
    if (settings.youtubeUrl) sameAs.push(settings.youtubeUrl);

    const siteName = settings.siteName || "Foodies Pakistan";
    const siteDescription =
      settings.defaultMetaDescription ||
      "Find the best restaurant deals, bank discounts, and AI reviews in Pakistan.";
    const logoUrl = settings.logoUrl || `${SITE_URL}/favicon.png`;

    const orgJsonLd: any = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_URL}#organization`,
      name: siteName,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: logoUrl,
      },
      sameAs: sameAs.length > 0 ? sameAs : undefined,
    };

    // Add contact points if available
    if (settings.contactPhone || settings.whatsapp || settings.contactEmail) {
      orgJsonLd.contactPoint = [];
      if (settings.contactPhone) {
        orgJsonLd.contactPoint.push({
          "@type": "ContactPoint",
          telephone: settings.contactPhone,
          contactType: "customer service",
          areaServed: "PK",
          availableLanguage: ["en", "ur"],
        });
      }
      if (settings.whatsapp) {
        orgJsonLd.contactPoint.push({
          "@type": "ContactPoint",
          telephone: settings.whatsapp,
          contactType: "customer support",
          areaServed: "PK",
          availableLanguage: ["en", "ur"],
        });
      }
      if (settings.contactEmail) {
        orgJsonLd.contactPoint.push({
          "@type": "ContactPoint",
          email: settings.contactEmail,
          contactType: "customer service",
          areaServed: "PK",
          availableLanguage: ["en", "ur"],
        });
      }
    }

    const webSiteJsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      url: SITE_URL,
      name: siteName,
      description: siteDescription,
      publisher: {
        "@id": `${SITE_URL}#organization`,
      },
      inLanguage: "en-PK",
    };

    const siteNavigationJsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "SiteNavigationElement",
        name: "Home",
        url: `${SITE_URL}/`,
      },
      {
        "@context": "https://schema.org",
        "@type": "SiteNavigationElement",
        name: "Articles",
        url: `${SITE_URL}/articles/`,
      },

      {
        "@context": "https://schema.org",
        "@type": "SiteNavigationElement",
        name: "Contact",
        url: `${SITE_URL}/contact-us/`,
      },
      {
        "@context": "https://schema.org",
        "@type": "SiteNavigationElement",
        name: "Privacy Policy",
        url: `${SITE_URL}/privacy-policy/`,
      },
      {
        "@context": "https://schema.org",
        "@type": "SiteNavigationElement",
        name: "Terms & Conditions",
        url: `${SITE_URL}/terms-conditions/`,
      },
    ];

    return (
      <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
        <head>
          <meta name="theme-color" content="#e8323b" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="black-translucent"
          />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, viewport-fit=cover"
          />
          {/* DNS prefetch + preconnect for external image CDNs */}
          <link rel="dns-prefetch" href="https://cdn.foodiespakistan.pk" />
          <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
          <link rel="dns-prefetch" href="https://www.google-analytics.com" />
          <link
            rel="preconnect"
            href="https://cdn.foodiespakistan.pk"
            crossOrigin="anonymous"
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify([
                orgJsonLd,
                webSiteJsonLd,
                ...siteNavigationJsonLd,
              ]).replace(/</g, '\\u003c'),
            }}
          />
          {/* Google Site Verification */}
          <meta name="google-site-verification" content="0AlPgLqEBKDyS77tbWzPCixgLhFbGWOpWQQETy0OVv0" />
          <meta name="google-site-verification" content="jgO_1-em9m1ejh-rL1zhrmkkvTYtAnNf5M51IeCtO_Q" />
          <meta name="google-site-verification" content="eC6EAqPwnTIHeuElvUf0nRUUUgTPdiy6qCQXI0CMbQQ" />
          {/* Google AdSense */}
          <meta name="google-adsense-account" content="ca-pub-2571706004681433" />
          {/* Google Analytics (GA4) */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-L8ZP0PZF3S"
            strategy="lazyOnload"
          />
          <Script id="google-analytics" strategy="lazyOnload">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-L8ZP0PZF3S');
            `}
          </Script>
          {/* Handle ChunkLoadError on deployments */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.addEventListener('error', function(e) {
                  if (e.message && (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk'))) {
                    const chunkFailedMessage = /Loading chunk [\\d]+ failed/;
                    if (chunkFailedMessage.test(e.message) || e.message.includes('ChunkLoadError')) {
                      const reloadCount = parseInt(sessionStorage.getItem('chunk_reload_count') || '0', 10);
                      if (reloadCount === 0) {
                        sessionStorage.setItem('chunk_reload_count', '1');
                        window.location.reload(true);
                      }
                    }
                  }
                });
                // Reset reload count on load success
                window.addEventListener('load', function() {
                  sessionStorage.removeItem('chunk_reload_count');
                });
              `
            }}
          />
          {/* LaraPush Push Notification Integration */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  function LoadLaraPush(){
                    if (typeof LaraPush === "function") {
                      console.log("LaraPush initialized successfully.");
                      new LaraPush(
                        JSON.parse(atob('eyJmaXJlYmFzZUNvbmZpZyI6eyJwcm9qZWN0SWQiOiJzY2hvbGFyLXNoaXAtMWYyMjkiLCJtZXNzYWdpbmdTZW5kZXJJZCI6Ijc2NDkzNDY3ODM2OSIsImFwcElkIjoiMTo3NjQ5MzQ2NzgzNjk6d2ViOjZlZTZjZjI4MmYxYzQ4M2JjMDA3MjAiLCJhcGlLZXkiOiJBSXphU3lBSnh2SlRXdEg3MGZXVTExTWxlQ1NyZEhZWmhrOE5LN0UifSwiZG9tYWluIjoiXC8iLCJzaXRlX3VybCI6IlwvIiwiYXBpX3VybCI6Imh0dHBzOlwvXC9wdXNoLmtvbGthdGFmZi50dlwvYXBpXC90b2tlbiIsInNlcnZpY2VXb3JrZXIiOiJcL2ZpcmViYXNlLW1lc3NhZ2luZy1zdy5qcyIsInZhcGlkX3B1YmxpY19rZXkiOiJCR1NDTFZfaGJKWG5zQm1OX1ZBT3Y2b1dQbW1UcDFoRDZuRmIzY2xRN3JOd2kxRmliakhNRFV1U21rdnBmMlJXNmhFS3ZPOXNSdnhfWG90RGotOGxUR3ciLCJyZWZlcnJhbENvZGUiOiJRWFhUTUsifQ==')),
                        JSON.parse(atob('eyJsb2dvIjpudWxsLCJoZWFkaW5nIjpudWxsLCJzdWJoZWFkaW5nIjpudWxsLCJ0aGVtZUNvbG9yIjoiIzAwMDAwMCIsImFsbG93VGV4dCI6bnVsbCwiZGVueVRleHQiOm51bGwsImRlc2t0b3AiOiJkaXNhYmxlIiwibW9iaWxlIjoiZGlzYWJsZSIsIm1vYmlsZUxvY2F0aW9uIjoiYm90dG9tIiwiZGVsYXkiOiIwIiwicmVhcHBlYXIiOiIwIiwiYm90dG9tQnV0dG9uIjoiZGlzYWJsZSIsIm1vYmlsZUxvY2F0aW9uIjoiYm90dG9tIiwiZGVsYXkiOiIwIiwicmVhcHBlYXIiOiIwIiwiYm90dG9tQnV0dG9uIjoiZGlzYWJsZSIsImJ1dHRvblRvVW5zdWJzY3JpYmUiOm51bGwsImxvY2tQYWdlQ29udGVudCI6ImRpc2FibGUiLCJiYWNrZHJvcCI6ImRpc2FibGUiLCJwb3B1cF90eXBlIjoiZGVmYXVsdC1wcm9tcHQifQ=='))
                      );
                    }
                  }

                  var script = document.createElement('script');
                  script.src = 'https://cdn.larapush.com/scripts/larapush-popup-5.0.0.min.js';
                  script.async = true;
                  script.onload = LoadLaraPush;
                  document.head.appendChild(script);
                })();
              `
            }}
          />
        </head>
        <body
          className={`font-sans bg-background text-foreground antialiased pb-16 sm:pb-0`}
          suppressHydrationWarning
        >
          <Providers session={session}>{children}</Providers>
        </body>
      </html>
    );
  }

