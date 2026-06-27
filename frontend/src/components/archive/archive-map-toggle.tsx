"use client";

import { useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { ArchiveMap } from "./archive-map";

interface ArchiveMapToggleProps {
    restaurants: any[];
    city: string;
}

export function ArchiveMapToggle({ restaurants, city }: ArchiveMapToggleProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={`relative w-full overflow-hidden transition-all duration-500 ease-in-out hidden lg:block ${expanded ? "h-[70vh]" : "h-[180px] md:h-[220px]"
                }`}
        >
            <ArchiveMap restaurants={restaurants} city={city} />

            {/* Expand / Collapse toggle */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="absolute bottom-3 right-3 z-20 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg border border-gray-200 rounded-lg p-2 transition-all hover:scale-105 active:scale-95"
                title={expanded ? "Collapse Map" : "Expand Map"}
            >
                {expanded ? (
                    <Minimize2 className="w-4 h-4 text-gray-700" />
                ) : (
                    <Maximize2 className="w-4 h-4 text-gray-700" />
                )}
            </button>

            {/* Bottom fade when collapsed */}
            {!expanded && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
            )}
        </div>
    );
}
