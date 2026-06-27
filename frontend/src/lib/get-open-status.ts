/**
 * getOpenStatus — Determines if a restaurant is currently open or closed
 * based on the user's local device time and the restaurant's opening hours.
 *
 * This is the single source of truth for open/closed across:
 *   - Restaurant Card
 *   - Restaurant Detail Page Header
 *   - Archive Map markers
 *
 * All times are compared in Pakistan Standard Time (UTC+5).
 */

export interface OpenStatus {
    isOpen: boolean;
    label: string;          // "Open" | "Closed" | "Closed today" | ""
    closesAt?: string;      // e.g. "11:00 PM"
    opensAt?: string;       // e.g. "12:00 PM"
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const SHORT_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function toMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + (m || 0);
}

export function getOpenStatus(openingHours: any[] | undefined | null): OpenStatus {
    if (!openingHours || openingHours.length === 0) return { isOpen: true, label: "" };

    // Use Pakistan Standard Time (UTC+5) for consistency
    const now = new Date();
    const pktOffset = 5 * 60; // Pakistan is UTC+5
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const pktDate = new Date(utcMs + pktOffset * 60000);

    const dayIndex = pktDate.getDay();
    const todayFull = DAY_NAMES[dayIndex];
    const todayShort = SHORT_DAYS[dayIndex];
    const currentMinutes = pktDate.getHours() * 60 + pktDate.getMinutes();

    const todayHours = openingHours.find(
        (h: any) => {
            const d = (h.day || "").toLowerCase();
            return d === todayFull || d === todayShort;
        }
    );

    if (!todayHours) return { isOpen: true, label: "" };
    if (todayHours.isClosed) return { isOpen: false, label: "Closed today" };

    const openTime = todayHours.open;
    const closeTime = todayHours.close;
    if (!openTime || !closeTime) return { isOpen: true, label: "" };

    const openMinutes = toMinutes(openTime);
    const closeMinutes = toMinutes(closeTime);

    // Handle overnight hours (e.g., 18:00 - 02:00)
    if (closeMinutes < openMinutes) {
        const isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
        return {
            isOpen,
            label: isOpen ? "Open" : "Closed",
            closesAt: isOpen ? closeTime : undefined,
            opensAt: isOpen ? undefined : openTime,
        };
    }

    const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    return {
        isOpen,
        label: isOpen ? "Open" : "Closed",
        closesAt: isOpen ? closeTime : undefined,
        opensAt: isOpen ? undefined : openTime,
    };
}
