import { cookies } from "next/headers";
import { AppHeader } from "@/components/ui-shell/app-header";
import { BottomNav } from "@/components/ui-shell/bottom-nav";
import { AppFooter } from "@/components/ui-shell/footer";
import { ReviewPopup } from "@/components/review-popup";
import { ReviewSchema } from "@/components/review-schema";
import { PrimePopup } from "@/components/prime-popup";
import { getPublicSiteSettings } from "@/lib/public-site-settings";

export default async function RootShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side cookie read â€” prevents FOUC (Flash of Unstyled Content)
  const cookieStore = await cookies();
  const citySlug = cookieStore.get("foodies_city")?.value || "lahore";
  const cityName = cookieStore.get("foodies_city_name")?.value
    ? decodeURIComponent(cookieStore.get("foodies_city_name")!.value)
    : "Lahore";

  // Fetch branding server-side â€” prevents logo flash
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
      {/* <ReviewPopup /> */}
      {/* <PrimePopup /> */}
    </div>
  );
}

