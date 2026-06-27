"use client";

import { useEffect, useState } from "react";
import { getOpenStatus } from "@/lib/get-open-status";

/**
 * DynamicOpenBadge — Client Component
 * Renders a live Open/Closed badge using the shared getOpenStatus utility.
 * Used inside the (Server Component) RestaurantDetailView to ensure the status
 * is always computed from the user's real-time clock, not a stale server value.
 *
 * Refreshes every 60 seconds to stay accurate.
 */
export function DynamicOpenBadge({ openingHours }: { openingHours: any[] }) {
    const [status, setStatus] = useState(() => getOpenStatus(openingHours));

    useEffect(() => {
        // Re-compute every 60s so the badge stays accurate
        const interval = setInterval(() => {
            setStatus(getOpenStatus(openingHours));
        }, 60_000);
        return () => clearInterval(interval);
    }, [openingHours]);

    if (!status.label) return null;

    return (
        <span className={`flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold ${status.isOpen ? "text-green-600" : "text-red-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            {status.label}
        </span>
    );
}
