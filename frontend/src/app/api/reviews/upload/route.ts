import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const CDN_BASE_URL = process.env.CDN_BASE_URL || "http://localhost:3001";
const CDN_API_KEY = process.env.CDN_API_KEY || "";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Only logged-in users can upload review photos." }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("image") as File | null;
        if (!file) {
            return NextResponse.json({ error: "No image file provided." }, { status: 400 });
        }

        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "Each image must be under 5MB." }, { status: 413 });
        }

        const userId = (session.user as any).id || "user";
        const restaurantId = String(formData.get("restaurantId") || "restaurant").trim();
        const safeRestaurantId = restaurantId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "restaurant";

        const cdnFormData = new FormData();
        cdnFormData.append("image", file);
        cdnFormData.append("slug", `review-${safeRestaurantId}-${userId}-${Date.now()}`);

        const cdnRes = await fetch(`${CDN_BASE_URL}/api/media/upload`, {
            method: "POST",
            headers: { "x-cdn-key": CDN_API_KEY },
            body: cdnFormData,
        });

        const cdnData = await cdnRes.json();
        if (!cdnRes.ok || !cdnData.success) {
            return NextResponse.json(
                { error: cdnData?.error || "Failed to upload image." },
                { status: cdnRes.status || 500 }
            );
        }

        return NextResponse.json({
            data: {
                url: cdnData.data.url,
                thumbUrl: cdnData.data.thumbUrl || null,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to upload image." },
            { status: 500 }
        );
    }
}
