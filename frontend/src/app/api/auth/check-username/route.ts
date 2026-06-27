import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const username = url.searchParams.get("username");

        if (!username) {
            return NextResponse.json({ available: false, reason: "invalid_format" }, { status: 400 });
        }

        const res = await fetch(`${process.env.CORE_API_URL || "http://localhost:4000/api/v1"}/profiles/check?username=${encodeURIComponent(username)}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("[check-username] Error:", error);
        return NextResponse.json({ available: false, error: "Failed to check username." }, { status: 500 });
    }
}
