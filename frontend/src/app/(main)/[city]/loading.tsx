import { ArchivePageSkeleton } from "@/components/ui/skeletons";

/**
 * City Loading Skeleton — Server Component
 * Shows archive skeleton for city-level routes like /lahore
 * Server-rendered for instant paint — no client JS needed
 */
export default function CityLoading() {
  return <ArchivePageSkeleton />;
}
