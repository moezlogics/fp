import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const res = await apiClient("/referrals/me", { requireAuth: true });

        // Frontend overrides the root URL dynamically since server is decoupled
        const payload = (res.data as any).data;
        if (payload?.referralCode) {
            payload.referralLink = `${process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk"}/signup?ref=${payload.referralCode}`;
        }

        return NextResponse.json(payload);
    } catch (error: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const res = await apiClient("/referrals/apply", {
            method: "POST",
            body: JSON.stringify(body),
            requireAuth: true,
        });

        return NextResponse.json((res.data as any).data);
    } catch (error: any) {
        if (error.response?.data?.error) {
            return NextResponse.json({ error: error.response.data.error }, { status: error.response.status });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
