"use client";

/**
 * CuisinesLink — Client component that renders clickable cuisine text.
 * Clicking dispatches a custom event to switch to the About tab and scroll
 * to the cuisines section. Extracted from the server component page.tsx
 * to avoid using onClick handlers in Server Components (which causes the
 * "An error occurred in the Server Components render" production error).
 */
export function CuisinesLink({ cuisines }: { cuisines: string[] }) {
    if (!cuisines || cuisines.length === 0) return null;

    const handleClick = () => {
        // Switch to About tab
        window.dispatchEvent(new CustomEvent("switchTab", { detail: "about" }));
        // After tab switch, scroll to the cuisines/details section
        setTimeout(() => {
            document.getElementById("about-details")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
    };

    return (
        <button
            onClick={handleClick}
            className="truncate max-w-[220px] md:max-w-none hover:text-primary transition-colors text-left cursor-pointer"
            title="View Details"
        >
            {cuisines.slice(0, 3).join(", ")}
        </button>
    );
}
