import { auth, unstable_update } from "@/auth";
import { redirect } from "next/navigation";
import { cache } from "react";

const API_BASE_URL = process.env.CORE_API_URL || "http://localhost:4000/api/v1";

async function forceLogoutRedirect(role?: string) {
    if (typeof window === "undefined") {
        if (!role) {
            const session = await auth();
            role = (session as any)?.role || (session as any)?.user?.role;
        }
        if (role === "admin") redirect("/moezlogin?error=SessionExpired");
        else if (role === "owner") redirect("/owner?error=SessionExpired");
        else redirect("/account?error=SessionExpired");
    }
}

async function persistTokenPair(tokens: { accessToken: string; refreshToken: string }) {
    if (typeof window !== "undefined") return;
    try {
        await unstable_update({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } as any);
    } catch (err: any) {
        console.warn("[apiClient] Failed to persist refreshed tokens:", err?.message || err);
    }
}

interface FetchOptions extends RequestInit {
    requireAuth?: boolean;
    next?: { revalidate?: number | false; tags?: string[] };
}

type ApiPayload = {
    success?: boolean;
    error?: string;
    code?: string;
    data?: unknown;
    [key: string]: unknown;
};

class ApiClientError extends Error {
    status: number;
    code?: string;
    response: {
        status: number;
        data?: ApiPayload;
    };

    constructor(status: number, payload: ApiPayload, fallbackMessage: string) {
        super((typeof payload.error === "string" && payload.error) || fallbackMessage);
        this.name = "ApiClientError";
        this.status = status;
        this.code = typeof payload.code === "string" ? payload.code : undefined;
        this.response = { status };
        // Optimization: Don't attach large payload body to error object unless it's a dev environment
        if (process.env.NODE_ENV === "development") {
            this.response.data = payload;
        }
    }
}

// React cache to ensure multiple apiClient calls in same render pass don't invoke auth() repeatedly
const getSession = cache(async () => {
    try {
        return await auth();
    } catch {
        return null;
    }
});

// Mutex for token refresh.
// Prevents concurrent refresh attempts from racing and invalidating the token pair.
let activeRefreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

async function refreshTokenPairSafe(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    if (activeRefreshPromise) {
        return activeRefreshPromise;
    }

    activeRefreshPromise = (async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
                cache: "no-store",
            });

            if (!res.ok) return null;

            const json = await res.json();
            if (!json.success || !json.data?.tokens) return null;

            return json.data.tokens;
        } catch {
            return null;
        }
    })();

    try {
        return await activeRefreshPromise;
    } finally {
        activeRefreshPromise = null;
    }
}

async function parseApiPayload(response: Response): Promise<ApiPayload> {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        try {
            return await response.json();
        } catch {
            return {};
        }
    }

    try {
        const text = await response.text();
        return text ? { error: text } : {};
    } catch {
        return {};
    }
}

export async function apiClient(endpoint: string, options: FetchOptions = {}) {
    const { requireAuth = true, ...fetchOptions } = options;
    const headers = new Headers(fetchOptions.headers || {});

    // Inject Origin and Internal Secret for server-side calls (Fixes 403 Forbidden)
    if (typeof window === "undefined") {
        // For server-side calls, we don't send an Origin header unless absolutely necessary.
        // Direct server-to-server calls are generally exempt from CORS if no Origin is present.
        // const origin = process.env.NEXTAUTH_URL || "https://foodiespakistan.pk";
        // headers.set("Origin", origin);
        
        if (process.env.INTERNAL_SECRET) {
            headers.set("x-app-internal-secret", process.env.INTERNAL_SECRET);
        }
    }

    if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    let currentRefreshToken: string | undefined;

    if (requireAuth) {
        const session = await getSession();
        let accessToken =
            (session as any)?.accessToken ||
            (session as any)?.user?.accessToken;

        currentRefreshToken =
            (session as any)?.refreshToken ||
            (session as any)?.user?.refreshToken;

        if (!accessToken) {
            console.warn(`[apiClient] Warning: accessToken missing in session for ${endpoint}. Session user:`, !!session?.user);
        }

        if (!accessToken && currentRefreshToken) {
            console.log(`[apiClient] accessToken missing but refreshToken found for ${endpoint}. Attempting silent recovery...`);
            const newTokens = await refreshTokenPairSafe(currentRefreshToken);
            if (newTokens) {
                await persistTokenPair(newTokens);
                accessToken = newTokens.accessToken;
                currentRefreshToken = newTokens.refreshToken;
                headers.set("Authorization", `Bearer ${accessToken}`);
            }
        }

        if (!accessToken) {
            // Do NOT force redirect — let the calling page handle this gracefully.
            // The user should never be forcefully kicked out.
            throw new ApiClientError(
                401,
                {
                    success: false,
                    error: "Your session has expired. Please sign in again.",
                    code: "SESSION_EXPIRED",
                },
                "Your session has expired. Please sign in again."
            );
        }

        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

    try {
        const fetchConfig: RequestInit = {
            ...fetchOptions,
            headers,
        };

        // Only force no-store for authenticated requests (user-specific data).
        // Public/unauthenticated requests should leverage Next.js fetch caching + deduplication.
        if (fetchOptions.cache) {
            fetchConfig.cache = fetchOptions.cache;
        } else if (!fetchOptions.next && requireAuth) {
            fetchConfig.cache = "no-store";
        }

        const response = await fetch(url, fetchConfig);
        const json = await parseApiPayload(response);

        if (response.status === 401 && json.code === "TOKEN_EXPIRED" && currentRefreshToken) {
            console.log(`[apiClient] Token expired for ${endpoint}, attempting mutex-protected refresh...`);

            const newTokens = await refreshTokenPairSafe(currentRefreshToken);

            if (newTokens) {
                console.log(`[apiClient] Token refreshed successfully, retrying ${endpoint}`);
                await persistTokenPair(newTokens);
                
                headers.set("Authorization", `Bearer ${newTokens.accessToken}`);
                const retryConfig = { ...fetchConfig, headers };
                const retryResponse = await fetch(url, retryConfig);
                const retryJson = await parseApiPayload(retryResponse);

                if (!retryResponse.ok || !retryJson.success) {
                    throw new ApiClientError(
                        retryResponse.status,
                        retryJson,
                        "An API error occurred after token refresh"
                    );
                }

                return { data: retryJson, status: retryResponse.status };
            } else {
                // Refresh failed — but do NOT force redirect.
                // Let the error propagate so the calling page can handle it gracefully.
                console.warn(`[apiClient] Refresh failed for ${endpoint}. Letting error propagate.`);
                
                throw new ApiClientError(
                    401,
                    {
                        success: false,
                        error: "Your session has expired. Please sign in again.",
                        code: "SESSION_EXPIRED",
                    },
                    "Your session has expired. Please sign in again."
                );
            }
        }

        if (!response.ok || !json.success) {
            // Do NOT redirect on 401 — let the error propagate naturally.
            // The JWT callback will handle token refresh on subsequent requests.
            if (response.status === 401) {
                console.warn(`[apiClient] 401 on ${endpoint}. Token may need refresh on next request.`);
            }
            throw new ApiClientError(response.status, json, "An API error occurred");
        }

        return { data: json, status: response.status };
    } catch (error: any) {
        console.error(`[apiClient] Request to ${endpoint} failed:`, error.message);
        throw error;
    }
}

