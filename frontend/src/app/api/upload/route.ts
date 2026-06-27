import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parseCdnResponse(response: Response) {
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

export async function POST(req: Request) {
    try {
        const session = await auth();

        // Secure the route: Admin or Owner
        if (!session || !["admin", "owner"].includes((session.user as any)?.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        // Accept both 'image' and 'media' field names
        const file = (formData.get("image") || formData.get("media")) as File | null;
        let slug = formData.get("slug") as string | null;
        const context = formData.get("context") as string | null;
        const fieldName = formData.get("image") ? "image" : "media";

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Generate a fallback slug if none provided
        if (!slug) {
            slug = `upload-${Date.now()}`;
        }

        // Extract original filename for SEO-friendly URLs
        const originalFilename = file.name || null;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Forward to the unified Foodies CDN (Port 3001)
        // Make sure to include file.type so that the CDN's multer can correctly identify the mime type
        const cdnFormData = new FormData();
        cdnFormData.append(fieldName, new Blob([buffer], { type: file.type || "application/octet-stream" }), file.name);
        cdnFormData.append("slug", slug);
        // Send original filename for SEO-friendly naming
        if (originalFilename) {
            cdnFormData.append("originalFilename", originalFilename);
        }

        const cdnUrl = process.env.CDN_BASE_URL || "http://localhost:3001";
        const cdnKey = process.env.CDN_API_KEY || "fpk-cdn-secret-key-change-in-production";

        console.log(`[Next.js] Proxying ${fieldName} upload to CDN at ${cdnUrl}...`);

        const cdnResponse = await fetch(`${cdnUrl}/api/media/upload`, {
            method: "POST",
            headers: {
                "x-cdn-key": cdnKey,
            },
            body: cdnFormData,
        });

        const result = await parseCdnResponse(cdnResponse);

        if (!cdnResponse.ok || !result.success) {
            console.error("[Next.js] CDN rejected upload:", result);
            return NextResponse.json(
                { error: result.error || "CDN upload failed" },
                { status: cdnResponse.status || 500 }
            );
        }

        // ── Fire-and-forget: Save to Media collection & trigger AI ALT text ──
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const internalSecret = process.env.INTERNAL_SECRET || "foodies_internal_bypass_secure_key_2024";
        try {
            fetch(`${apiUrl}/api/v1/media/process`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-internal-secret": internalSecret,
                },
                body: JSON.stringify({
                    url: result.data.url,
                    thumbUrl: result.data.thumbUrl || null,
                    filename: result.data.filename,
                    originalFilename: originalFilename,
                    type: result.data.type || "image",
                    format: result.data.format || null,
                    width: result.data.width || null,
                    height: result.data.height || null,
                    sizeBytes: result.data.sizeBytes || null,
                    uploadedBy: (session.user as any)?.id || (session.user as any)?.role || null,
                    context: context || null,
                }),
            }).catch((err) => {
                console.warn("[Next.js] Background media processing request failed:", err.message);
            });
        } catch {
            // Non-blocking — we don't wait for this
        }

        return NextResponse.json({
            url: result.data.url,
            thumbUrl: result.data.thumbUrl || null,
            fileName: result.data.filename,
            type: result.data.type, // "image" or "video"
            format: result.data.format,
        });
    } catch (error) {
        console.error("[Next.js] Proxy Upload error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
