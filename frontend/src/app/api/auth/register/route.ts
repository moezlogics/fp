import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const res = await fetch(`${process.env.CORE_API_URL || "http://localhost:4000/api/v1"}/auth/register-owner`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Origin": process.env.NEXTAUTH_URL || "https://foodiespakistan.pk",
                "x-app-internal-secret": process.env.INTERNAL_SECRET || "",
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        console.error("Owner registration error:", error);
        return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
    }
}
