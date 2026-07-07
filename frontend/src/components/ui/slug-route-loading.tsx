"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArchivePageSkeleton, RestaurantDetailSkeleton } from "@/components/ui/skeletons";

const ROUTE_TYPE_KEY = "next_route_type";

function resolveFromPathname(pathname: string): "restaurant" | "archive" {
  const slugParts = pathname.split("/").filter(Boolean).slice(1);

  if (slugParts.length === 0) return "archive";
  if (slugParts.length === 1) return "restaurant";
  if (slugParts[slugParts.length - 1] === "virtual-tour") return "restaurant";
  return "archive";
}

function resolveSkeletonKind(pathname: string): "restaurant" | "archive" {
  if (typeof window !== "undefined") {
    const hinted = sessionStorage.getItem(ROUTE_TYPE_KEY);
    if (hinted === "restaurant" || hinted === "archive") {
      return hinted;
    }
  }
  return resolveFromPathname(pathname);
}

export default function SlugRouteLoading() {
  const pathname = usePathname() || "";
  const [kind] = useState(() => resolveSkeletonKind(pathname));

  useEffect(() => {
    return () => {
      sessionStorage.removeItem(ROUTE_TYPE_KEY);
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      {kind === "archive" ? <ArchivePageSkeleton /> : <RestaurantDetailSkeleton />}
    </div>
  );
}
