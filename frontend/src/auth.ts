import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import CredentialsProvider from "next-auth/providers/credentials";

// The absolute URL of our new decoupled Core API
const API_BASE_URL = process.env.CORE_API_URL || "http://localhost:4000/api/v1";

export const { auth, signIn, signOut, handlers, unstable_update } = NextAuth({
    ...authConfig,
    session: { 
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 Days persistence (Facebook-like)
        updateAge: 24 * 60 * 60,   // Refresh NextAuth cookie daily
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                loginType: { label: "Login Type", type: "text" },
                // Token-based login (post-registration auto-login)
                tokenData: { label: "Token Data", type: "text" },
            },
            async authorize(credentials) {
                // ─── Mode 1: Token-based login (post-registration) ───
                // If tokenData is provided, skip backend login and use pre-generated tokens
                if (credentials?.tokenData && credentials.tokenData !== "") {
                    try {
                        const parsed = JSON.parse(credentials.tokenData as string);
                        const { user, tokens } = parsed;

                        if (!user || !tokens) {
                            console.error("[NextAuth] Token login: missing user or tokens");
                            return null;
                        }

                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            phone: user.phone || null,
                            city: user.city || null,
                            avatar: user.avatar || null,
                            profileCompleted: user.profileCompleted || false,
                            isApproved: user.isApproved ?? true,
                            businessName: user.businessName || null,
                            branchType: user.branchType || "single",
                            accessToken: tokens.accessToken,
                            refreshToken: tokens.refreshToken,
                        } as any;
                    } catch (e) {
                        console.error("[NextAuth] Token login parse error:", e);
                        return null;
                    }
                }

                // ─── Mode 2: Standard email/password login ───
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    const res = await fetch(`${API_BASE_URL}/auth/login`, {
                        method: "POST",
                        headers: { 
                            "Content-Type": "application/json",
                            "Origin": process.env.NEXTAUTH_URL || "https://foodiespakistan.pk",
                            "x-app-internal-secret": process.env.INTERNAL_SECRET || "",
                        },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                            loginType: credentials.loginType || "user"
                        }),
                    });

                    const data = await res.json();

                    if (!res.ok || !data.success) {
                        throw new Error(data.error || "Invalid credentials");
                    }

                    const { user, tokens } = data.data;

                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        phone: user.phone,
                        city: user.city,
                        avatar: user.avatar || null,
                        profileCompleted: user.profileCompleted,
                        isApproved: user.isApproved,
                        businessName: user.businessName,
                        branchType: user.branchType,
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken
                    } as any;

                } catch (error: any) {
                    console.error("[NextAuth] Login failed:", error.message);
                    throw new Error(error.message || "Failed to authenticate");
                }
            },
        }),
    ],
});
