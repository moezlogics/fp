"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ArchivePageSkeleton, RestaurantDetailSkeleton } from "@/components/ui/skeletons";

const ROUTE_TYPE_KEY = "next_route_type";

function resolveSkeletonKind(pathname: string): "restaurant" | "archive" {
  if (typeof window !== "undefined") {
    const hinted = sessionStorage.getItem(ROUTE_TYPE_KEY);
    if (hinted === "restaurant" || hinted === "archive") {
      sessionStorage.removeItem(ROUTE_TYPE_KEY);
      return hinted;
    }
  }

  const parts = pathname.split("/").filter(Boolean);
  const slugParts = parts.slice(1);

  if (slugParts.length === 0) return "archive";
  if (slugParts.length >= 2) {
    if (slugParts[slugParts.length - 1] === "virtual-tour") return "restaurant";
    return "archive";
  }

  return "restaurant";
}

export default function SlugRouteLoading() {
  const pathname = usePathname() || "";
  const kindRef = useRef<"restaurant" | "archive" | null>(null);
  if (kindRef.current === null) {
    kindRef.current = resolveSkeletonKind(pathname);
  }

  return (
    <div className="min-h-screen bg-transparent">
      {kindRef.current === "archive" ? <ArchivePageSkeleton /> : <RestaurantDetailSkeleton />}
    </div>
  );
}
