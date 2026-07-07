"use client";

import { useEffect, Suspense } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AuthModalProvider } from "@/components/auth/auth-modal";

/**
 * RouteTypeTracker — Global click interceptor for skeleton loading
 * 
 * Listens for clicks on <a> tags with data-route-type attribute.
 * Sets sessionStorage("next_route_type") so the [..slug]/loading.tsx
 * can show the correct skeleton BEFORE paint.
 * 
 * IMPORTANT: Only SETS on tagged links. Does NOT clear on untagged links
 * because that would break back/forward and archive→restaurant navigation.
 */
function RouteTypeTracker() {
    useEffect(() => {
        const handleIntent = (e: Event) => {
            const target = e.target as HTMLElement;
            const link = target.closest("a");
            if (!link) return;

            const routeType = link.getAttribute("data-route-type");
            if (routeType === "restaurant" || routeType === "archive") {
                sessionStorage.setItem("next_route_type", routeType);
            }
        };

        document.addEventListener("pointerdown", handleIntent, true);
        document.addEventListener("click", handleIntent, true);
        return () => {
            document.removeEventListener("pointerdown", handleIntent, true);
            document.removeEventListener("click", handleIntent, true);
        };
    }, []);
    return null;
}

function ImpersonateHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { update } = useSession();

    useEffect(() => {
        if (searchParams.get("impersonate") === "true") {
            const accessToken = searchParams.get("accessToken");
            const refreshToken = searchParams.get("refreshToken");
            const id = searchParams.get("id");
            const name = searchParams.get("name");
            const email = searchParams.get("email");
            const role = searchParams.get("role");

            if (accessToken && refreshToken) {
                update({
                    accessToken,
                    refreshToken,
                    id,
                    name,
                    email,
                    role,
                }).then(() => {
                    // Strip the query parameters to clean the URL
                    router.replace(pathname, { scroll: false });
                });
            }
        }
    }, [searchParams, update, router, pathname]);

    return null;
}

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children, session }: { children: React.ReactNode, session: any }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5, // 5 minutes
                retry: 2,
                refetchOnWindowFocus: false,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <SessionProvider session={session} refetchInterval={180} refetchOnWindowFocus={true}>
                {/* 180s interval prevents token expiry during long form filling */}
                <Suspense fallback={null}>
                    <ImpersonateHandler />
                </Suspense>
                <AuthModalProvider>
                    <RouteTypeTracker />
                    {children}
                </AuthModalProvider>
            </SessionProvider>
        </QueryClientProvider>
    );
}
