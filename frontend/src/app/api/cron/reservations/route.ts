import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "all";

        // Call the core API cron endpoint
        const res = await fetch(`${process.env.CORE_API_URL || "http://localhost:4000/api/v1"}/cron/reservations?type=${type}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // In production, pass the cron secret as header to authenticate
                "x-cron-secret": process.env.CRON_SECRET || "",
                "Origin": process.env.NEXTAUTH_URL || "https://foodiespakistan.pk",
            },
        });

        const data = await res.json();

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results: data.results,
        });
    } catch (err: any) {
        console.error("CRON error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
