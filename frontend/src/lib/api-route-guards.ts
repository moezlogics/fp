import { auth } from "@/auth";
import { NextResponse } from "next/server";

type AllowedRole = "admin" | "owner" | "user";

type GuardResult =
    | { ok: true; session: any; role: AllowedRole }
    | { ok: false; response: NextResponse };

function unauthorized(message = "Unauthorized", status = 401) {
    return NextResponse.json({ error: message }, { status });
}

function extractRole(session: any): AllowedRole | null {
    const role = session?.user?.role;
    if (role === "admin" || role === "owner" || role === "user") {
        return role;
    }
    return null;
}

/**
 * Require any authenticated session.
 */
export async function requireSession(): Promise<GuardResult> {
    const session = await auth();
    const role = extractRole(session);

    if (!session?.user?.id || !role) {
        return {
            ok: false,
            response: unauthorized(),
        };
    }

    return {
        ok: true,
        session,
        role,
    };
}

/**
 * Require exactly admin role.
 */
export async function requireAdmin(): Promise<GuardResult> {
    const base = await requireSession();
    if (!base.ok) return base;

    if (base.role !== "admin") {
        return {
            ok: false,
            response: unauthorized("Admin access required.", 403),
        };
    }

    return base;
}

/**
 * Require owner or admin.
 * Useful for owner portal routes where admins may also need access.
 */
export async function requireOwnerOrAdmin(): Promise<GuardResult> {
    const base = await requireSession();
    if (!base.ok) return base;

    if (base.role !== "owner" && base.role !== "admin") {
        return {
            ok: false,
            response: unauthorized("Owner access required.", 403),
        };
    }

    return base;
}

/**
 * Require exactly owner role.
 * Use this only where admin access should be blocked too.
 */
export async function requireOwner(): Promise<GuardResult> {
    const base = await requireSession();
    if (!base.ok) return base;

    if (base.role !== "owner") {
        return {
            ok: false,
            response: unauthorized("Owner access required.", 403),
        };
    }

    return base;
}

/**
 * Require exactly user role.
 */
export async function requireUser(): Promise<GuardResult> {
    const base = await requireSession();
    if (!base.ok) return base;

    if (base.role !== "user") {
        return {
            ok: false,
            response: unauthorized("User access required.", 403),
        };
    }

    return base;
}
