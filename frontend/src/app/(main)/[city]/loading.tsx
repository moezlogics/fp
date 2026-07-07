"use client";

import { usePathname } from "next/navigation";
import { ArchivePageSkeleton } from "@/components/ui/skeletons";

/**
 * Only show city/archive skeleton for pure city routes (/lahore).
 * For /lahore/restaurant-slug or /lahore/area/category, return null so
 * [...slug]/loading.tsx handles the correct skeleton (avoids archive flash).
 */
export default function CityLoading() {
  const pathname = usePathname() || "";
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length !== 1) {
    return null;
  }

  return <ArchivePageSkeleton />;
}
