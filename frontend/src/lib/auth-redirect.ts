/**
 * Auth Redirect Intent System
 * ─────────────────────────────
 * Saves the user's intended action before redirecting to login,
 * then retrieves and executes it after successful authentication.
 *
 * Examples:
 *  - User clicks heart → saveRedirectIntent({ path: "/lahore/haveli", action: "save", restaurantId: "abc" })
 *  - User clicks "Book Now" → saveRedirectIntent({ path: "/lahore/haveli", action: "book" })
 *  - User is browsing and session expires → saveRedirectIntent({ path: "/lahore/haveli" })
 */

const STORAGE_KEY = "fp_auth_redirect_intent";

export interface RedirectIntent {
    /** The path the user was on */
    path: string;
    /** Optional action to execute after login */
    action?: "save" | "book" | "prime" | "review" | "foodiepay";
    /** Optional restaurant ID for save/book actions */
    restaurantId?: string;
    /** Timestamp to auto-expire stale intents (15 min) */
    timestamp: number;
}

const INTENT_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Save the user's redirect intent before prompting login.
 */
export function saveRedirectIntent(intent: Omit<RedirectIntent, "timestamp">): void {
    try {
        const full: RedirectIntent = {
            ...intent,
            timestamp: Date.now(),
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {
        // sessionStorage not available (SSR, privacy mode) — silently skip
    }
}

/**
 * Retrieve the stored redirect intent (if any, and not expired).
 * Clears it after retrieval so it only fires once.
 */
export function getRedirectIntent(): RedirectIntent | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        sessionStorage.removeItem(STORAGE_KEY);
        const intent: RedirectIntent = JSON.parse(raw);

        // Reject stale intents older than 15 minutes
        if (Date.now() - intent.timestamp > INTENT_MAX_AGE_MS) {
            return null;
        }

        return intent;
    } catch {
        return null;
    }
}

/**
 * Execute a redirect intent after successful login.
 * - If there's a save action, calls the save API
 * - Then navigates to the stored path
 *
 * Returns true if an intent was found and executed, false otherwise.
 */
export async function executeRedirectIntent(
    router: { push: (url: string) => void; refresh: () => void },
): Promise<boolean> {
    const intent = getRedirectIntent();
    if (!intent) return false;

    // Execute the pending action
    if (intent.action === "save" && intent.restaurantId) {
        try {
            await fetch("/api/users/saved", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ restaurantId: intent.restaurantId }),
            });
            // Update local saved cache
            const arr = JSON.parse(localStorage.getItem("fp_saved") || "[]");
            if (!arr.includes(intent.restaurantId)) {
                arr.push(intent.restaurantId);
                localStorage.setItem("fp_saved", JSON.stringify(arr));
            }
        } catch {
            // Non-critical — user can save again manually
        }
    }

    // Navigate back to the original page
    router.push(intent.path);
    return true;
}

/**
 * Check if there's a pending redirect intent without consuming it.
 */
export function hasPendingIntent(): boolean {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const intent: RedirectIntent = JSON.parse(raw);
        return Date.now() - intent.timestamp <= INTENT_MAX_AGE_MS;
    } catch {
        return false;
    }
}
