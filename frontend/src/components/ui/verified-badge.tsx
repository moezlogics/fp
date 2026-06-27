"use client";

import { useState, useRef, useEffect } from "react";

interface VerifiedBadgeProps {
  /** Pixel size of the badge (default 16 = 16×16px) */
  size?: number;
}

/**
 * Blue-tick verified badge using an Inline SVG.
 * 
 * Uses a properly-fitted viewBox so the badge renders crisp at ALL sizes 
 * (12px–24px) without any clipping or overflow.
 * 
 * Security: right-click save disabled, not draggable, pointer-events-none.
 */
export function VerifiedBadge({ size = 16 }: VerifiedBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <span
      ref={containerRef}
      role="img"
      aria-label="Verified Partner"
      className="relative inline-flex items-center justify-center shrink-0 cursor-pointer"
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowTooltip(!showTooltip);
      }}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none drop-shadow-sm"
        style={{ userSelect: 'none' }}
      >
        {/* Shield / starburst background — fully contained within 0 0 22 22 */}
        <path d="M11 0.5C11.96 0.5 12.86 0.82 13.58 1.38L14.54 2.02C15.02 2.34 15.66 2.5 16.3 2.5L17.42 2.42C18.54 2.34 19.58 3.14 19.74 4.26L19.82 5.38C19.86 5.94 20.18 6.5 20.66 6.9L21.54 7.62C22.34 8.26 22.66 9.3 22.34 10.26L21.94 11.3C21.74 11.86 21.74 12.46 21.94 13.02L22.34 14.06C22.66 15.02 22.34 16.06 21.54 16.7L20.66 17.42C20.18 17.82 19.86 18.38 19.82 18.94L19.74 20.06C19.58 21.18 18.54 21.98 17.42 21.9L16.3 21.82C15.66 21.82 15.02 21.98 14.54 22.3L13.58 22.94C12.86 23.5 11.96 23.82 11 23.82C10.04 23.82 9.14 23.5 8.42 22.94L7.46 22.3C6.98 21.98 6.34 21.82 5.7 21.82L4.58 21.9C3.46 21.98 2.42 21.18 2.26 20.06L2.18 18.94C2.14 18.38 1.82 17.82 1.34 17.42L0.46 16.7C-0.34 16.06 -0.66 15.02 -0.34 14.06L0.06 13.02C0.26 12.46 0.26 11.86 0.06 11.3L-0.34 10.26C-0.66 9.3 -0.34 8.26 0.46 7.62L1.34 6.9C1.82 6.5 2.14 5.94 2.18 5.38L2.26 4.26C2.42 3.14 3.46 2.34 4.58 2.42L5.7 2.5C6.34 2.5 6.98 2.34 7.46 2.02L8.42 1.38C9.14 0.82 10.04 0.5 11 0.5Z" fill="#1D9BF0" transform="scale(0.82) translate(1.2, 1.0)"/>
        {/* Checkmark — properly centered */}
        <path d="M9.3 14.6L6.2 11.5L7.3 10.4L9.3 12.4L14.0 7.7L15.1 8.8L9.3 14.6Z" fill="white"/>
      </svg>

      {/* Tooltip */}
      <span
        className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white bg-gray-900/95 backdrop-blur-sm rounded-md shadow-lg whitespace-nowrap z-[100] transition-all duration-200 pointer-events-none
          ${showTooltip ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
      >
        Verified
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95" />
      </span>
    </span>
  );
}
