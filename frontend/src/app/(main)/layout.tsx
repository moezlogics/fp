import { AppHeader } from "@/components/ui-shell/app-header";
import { BottomNav } from "@/components/ui-shell/bottom-nav";
import { AppFooter } from "@/components/ui-shell/footer";
import { getPublicSiteSettings } from "@/lib/public-site-settings";

export default async function RootShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cookie-free layout — reading cookies() forced `private, no-store` on every
  // page and broke ISR/CDN cache. City hydrates client-side in AppHeader.
  const citySlug = "lahore";
  const cityName = "Lahore";

  const branding = await getPublicSiteSettings(300);
  const initialBranding = {
    logoUrl: branding.logoUrl || "",
    logoWidthDesktop: branding.logoWidthDesktop || 140,
    logoHeightDesktop: branding.logoHeightDesktop || 40,
    logoWidthMobile: branding.logoWidthMobile || 100,
    logoHeightMobile: branding.logoHeightMobile || 32,
    siteName: branding.siteName || "Foodies Pakistan",
    tagline: branding.tagline || "Pakistan's #1 Restaurant Discovery Platform",
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f3f4f6]">
      <AppHeader
        initialCity={cityName}
        initialCitySlug={citySlug}
        initialBranding={initialBranding}
      />
      <main className="flex-1 w-full">{children}</main>
      <AppFooter siteName={initialBranding.siteName} tagline={initialBranding.tagline} />
      <BottomNav />
    </div>
  );
}
