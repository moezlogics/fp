import type { NextAuthConfig } from "next-auth";

const API_BASE_URL = process.env.CORE_API_URL || "http://localhost:4000/api/v1";

function decodeJwtExpiry(token: string): number | null {
    try {
        if (typeof token !== "string" || !token.includes(".")) return null;
        const payload = token.split(".")[1];
        if (!payload) return null;
        // JWTs are base64url encoded (not plain base64). Normalize + pad for Buffer decoding.
        const base64 = payload
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(Math.ceil(payload.length / 4) * 4, "=");
        const decoded = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
        return decoded.exp || null;
    } catch {
        return null;
    }
}

type CoreTokenPair = { accessToken: string; refreshToken: string };

// Per-refreshToken mutex + short-lived cache to prevent refresh-token rotation races.
const coreRefreshLocks = new Map<string, Promise<CoreTokenPair | null>>();
const coreRefreshRecent = new Map<string, { tokens: CoreTokenPair | null; expiresAt: number }>();
const CORE_REFRESH_RECENT_TTL_MS = 5000;

async function refreshCoreTokensDirect(
    refreshToken: string,
    retries = 2
): Promise<CoreTokenPair | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
                cache: "no-store",
            });

            if (!res.ok) {
                if (attempt < retries) { await new Promise(r => setTimeout(r, 500 * (attempt + 1))); continue; }
                return null;
            }

            const json = await res.json();
            if (!json.success || !json.data?.tokens) return null;

            return json.data.tokens;
        } catch {
            if (attempt < retries) { await new Promise(r => setTimeout(r, 500 * (attempt + 1))); continue; }
            return null;
        }
    }
    return null;
}

async function refreshCoreTokens(refreshToken: string): Promise<CoreTokenPair | null> {
    const now = Date.now();
    const cached = coreRefreshRecent.get(refreshToken);
    if (cached && cached.expiresAt > now) return cached.tokens;

    const inflight = coreRefreshLocks.get(refreshToken);
    if (inflight) return inflight;

    const promise = (async () => {
        const tokens = await refreshCoreTokensDirect(refreshToken);
        coreRefreshRecent.set(refreshToken, { tokens, expiresAt: Date.now() + CORE_REFRESH_RECENT_TTL_MS });
        return tokens;
    })();

    coreRefreshLocks.set(
        refreshToken,
        promise.finally(() => {
            coreRefreshLocks.delete(refreshToken);
        })
    );

    return coreRefreshLocks.get(refreshToken)!;
}

async function fetchUserProfile(accessToken: string): Promise<any | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/users/profile`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        if (!res.ok) return null;

        const json = await res.json();
        return json.data || null;
    } catch {
        return null;
    }
}

export const authConfig = {
    pages: {
        signIn: "/account",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const role = (auth?.user as any)?.role;
            const path = nextUrl.pathname;

            if (nextUrl.searchParams.get("impersonate") === "true") {
                return true;
            }

            // CRITICAL: Do NOT redirect on error states like RefreshTokenExpired.
            // The JWT callback now handles retry logic internally.
            // Redirecting here was the #2 cause of premature logouts.

            const isOwnerRoute = path.startsWith("/owner");
            const isAdminRoute = path.startsWith("/moezlogin");
            const isAccountRoute = path.startsWith("/account");
            const isUserProtectedRoute =
                path.startsWith("/foodiepay");

            if (isOwnerRoute) {
                if (isLoggedIn && (role === "owner" || role === "admin")) return true;
                if (isLoggedIn && role === "user") return Response.redirect(new URL("/account", nextUrl));
                return false; // Redirect to signIn page (/account)
            }

            if (isAdminRoute) {
                if (isLoggedIn && role === "admin") return true;
                if (isLoggedIn && role === "owner") return Response.redirect(new URL("/owner", nextUrl));
                if (isLoggedIn && role === "user") return Response.redirect(new URL("/account", nextUrl));
                return false; // Redirect to signIn page (/account)
            }

            if (isAccountRoute) {
                // If already logged in and at /account, redirect to appropriate dashboard
                if (isLoggedIn) {
                    if (role === "admin") return Response.redirect(new URL("/moezlogin", nextUrl));
                    if (role === "owner") return Response.redirect(new URL("/owner", nextUrl));
                }
                return true;
            }

            if (isUserProtectedRoute) {
                if (isLoggedIn && role === "user") return true;
                if (isLoggedIn && role === "owner") return Response.redirect(new URL("/owner", nextUrl));
                if (isLoggedIn && role === "admin") return Response.redirect(new URL("/moezlogin", nextUrl));
                return false; // Redirect to signIn page (/account)
            }

            const isAuthRoute = path.startsWith("/register");
            if (isAuthRoute && isLoggedIn) {
                if (role === "admin") return Response.redirect(new URL("/moezlogin", nextUrl));
                if (role === "owner") return Response.redirect(new URL("/owner", nextUrl));
                return Response.redirect(new URL("/account", nextUrl));
            }

            if (path === "/login") {
                return Response.redirect(new URL("/account", nextUrl));
            }

            return true;
        },
        async jwt({ token, user, trigger, session }) {
            try {
                if (user) {
                    token.id = (user as any).id;
                    token.role = (user as any).role;
                    token.phone = (user as any).phone;
                    token.city = (user as any).city;
                    token.avatar = (user as any).avatar;
                    token.profileCompleted = (user as any).profileCompleted;
                    token.isApproved = (user as any).isApproved;
                    token.businessName = (user as any).businessName;
                    token.branchType = (user as any).branchType;
                    token.accessToken = (user as any).accessToken;
                    token.refreshToken = (user as any).refreshToken;
                    // Reset any previous error state on fresh login
                    delete token.error;
                    token.refreshFailCount = 0;
                }

                if (trigger === "update" && session) {
                    token.name = session.name || token.name;
                    token.profileCompleted = session.profileCompleted ?? token.profileCompleted;
                    token.phone = session.phone ?? token.phone;
                    token.city = session.city ?? token.city;
                    token.avatar = session.avatar ?? token.avatar;

                    if (session.id) token.id = session.id;
                    if (session.role) token.role = session.role;
                    if (session.email) token.email = session.email;
                    if (typeof session.isApproved === "boolean") token.isApproved = session.isApproved;
                    if (session.accessToken) token.accessToken = session.accessToken;
                    if (session.refreshToken) token.refreshToken = session.refreshToken;
                    if (session.businessName) token.businessName = session.businessName;
                    if (session.branchType) token.branchType = session.branchType;
                    // If tokens were manually updated, clear error state
                    if (session.accessToken && session.refreshToken) {
                        delete token.error;
                        token.refreshFailCount = 0;
                    }
                }

                // ── Proactive token refresh ──
                // Only attempt if we have BOTH tokens and the access token is nearing expiry
                if (token.accessToken && token.refreshToken) {
                    const exp = decodeJwtExpiry(token.accessToken as string);
                    const now = Math.floor(Date.now() / 1000);

                    // Refresh 5 minutes before expiry
                    if (exp && exp - now < 300) {
                        console.log("[NextAuth JWT] Access token expiring within 5min, refreshing proactively...");

                        const newTokens = await refreshCoreTokens(token.refreshToken as string);

                        if (newTokens) {
                            // Success — update tokens & clear any error state
                            token.accessToken = newTokens.accessToken;
                            token.refreshToken = newTokens.refreshToken;
                            token.refreshFailCount = 0;
                            delete token.error;

                            // Optionally refresh profile data
                            const profile = await fetchUserProfile(newTokens.accessToken);
                            if (profile) {
                                if (typeof profile.isApproved === "boolean") {
                                    token.isApproved = profile.isApproved;
                                }
                                if (profile.businessName) token.businessName = profile.businessName;
                                if (profile.branchType) token.branchType = profile.branchType;
                                if (typeof profile.profileCompleted === "boolean") {
                                    token.profileCompleted = profile.profileCompleted;
                                }
                            }
                        } else {
                            // Refresh failed — likely a transient issue (server restart,
                            // network blip, deploy). Keep ALL tokens intact. The existing
                            // access token may still work, and the refresh token is still
                            // valid on the backend. Next request will retry automatically.
                            // We NEVER mark the session as expired from here.
                            // Session only ends when the user explicitly logs out.
                            console.warn("[NextAuth JWT] Proactive refresh failed. Keeping existing tokens — will retry on next request.");
                        }
                    }
                }

                return token;
            } catch (error) {
                console.error("[NextAuth JWT] Callback crashed:", error);
                // CRITICAL: Do NOT clear tokens on crash. The crash might be a transient issue.
                // Just log it and return the token as-is.
                return token;
            }
        },
        async session({ session, token }) {
            if (token && session.user) {
                return {
                    ...session,
                    user: {
                        ...session.user,
                        id: token.id as string,
                        role: token.role as string,
                        phone: token.phone as string | null,
                        city: token.city as string | null,
                        avatar: token.avatar as string | null,
                        profileCompleted: token.profileCompleted as boolean,
                        isApproved: token.isApproved as boolean,
                        businessName: token.businessName as string | null,
                        branchType: token.branchType as string,
                    },
                    accessToken: token.accessToken as string,
                    refreshToken: token.refreshToken as string,
                    error: token.error as string | undefined,
                };
            }

            return session;
        },
    },
    providers: [],
} satisfies NextAuthConfig;

