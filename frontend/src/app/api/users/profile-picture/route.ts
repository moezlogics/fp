import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const CDN_BASE_URL = process.env.CDN_BASE_URL || "http://localhost:3001";
const CDN_API_KEY = process.env.CDN_API_KEY || "";
const API_BASE_URL = process.env.CORE_API_URL || "http://localhost:4000/api/v1";

/**
 * POST /api/users/profile-picture
 *
 * Receives an image file from the client, uploads it to the CDN,
 * then updates the user's profile with the new avatar URL.
 * If the user had an old avatar, deletes it from CDN to save space.
 *
 * Accepts: FormData with field "image"
 * Returns: { data: { avatarUrl, thumbUrl } }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const accessToken = (session as any)?.accessToken;
        if (!accessToken) {
            return NextResponse.json({ error: "No access token" }, { status: 401 });
        }

        // 1. Get the uploaded file from the client
        const formData = await req.formData();
        const file = formData.get("image") as File | null;
        if (!file) {
            return NextResponse.json({ error: "No image file provided" }, { status: 400 });
        }

        // Validate: only images, max 5MB
        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
        }
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "Image must be under 5MB" }, { status: 413 });
        }

        // 2. Get current user profile to find old avatar
        let oldAvatarFilename: string | null = null;
        try {
            const profileRes = await fetch(`${API_BASE_URL}/users/profile`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                cache: "no-store",
            });
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                const currentAvatar = profileData?.data?.avatar || profileData?.avatar;
                if (currentAvatar && currentAvatar.includes("/uploads/")) {
                    oldAvatarFilename = currentAvatar.split("/uploads/").pop();
                }
            }
        } catch {
            // Non-critical — proceed with upload even if we can't get old avatar
        }

        // 3. Upload to CDN
        const cdnFormData = new FormData();
        cdnFormData.append("image", file);
        cdnFormData.append("slug", `profile-${userId}`);

        const cdnRes = await fetch(`${CDN_BASE_URL}/api/media/upload`, {
            method: "POST",
            headers: { "x-cdn-key": CDN_API_KEY },
            body: cdnFormData,
        });

        const cdnData = await cdnRes.json();
        if (!cdnRes.ok || !cdnData.success) {
            console.error("[PROFILE_PIC] CDN upload failed:", cdnData);
            return NextResponse.json(
                { error: cdnData?.error || "CDN upload failed" },
                { status: cdnRes.status }
            );
        }

        const avatarUrl = cdnData.data.url;
        const thumbUrl = cdnData.data.thumbUrl;

        // 4. Update user profile with new avatar URL
        try {
            await fetch(`${API_BASE_URL}/users/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ avatar: avatarUrl }),
            });
        } catch (err) {
            console.error("[PROFILE_PIC] Failed to update profile with avatar:", err);
            // Non-critical — image is uploaded, user can retry
        }

        // 5. Delete old avatar from CDN (fire-and-forget)
        if (oldAvatarFilename) {
            try {
                await fetch(`${CDN_BASE_URL}/api/media/delete`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "x-cdn-key": CDN_API_KEY,
                    },
                    body: JSON.stringify({ filename: oldAvatarFilename }),
                });
                console.log(`[PROFILE_PIC] Deleted old avatar: ${oldAvatarFilename}`);
            } catch {
                // Non-critical — old file remains, can be cleaned up later
            }
        }

        return NextResponse.json({
            data: { avatarUrl, thumbUrl },
        });
    } catch (error: any) {
        console.error("[PROFILE_PIC_ERROR]", error?.message || error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/users/profile-picture
 *
 * Removes the user's current avatar from CDN and clears the avatar field.
 */
export async function DELETE() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const accessToken = (session as any)?.accessToken;
        if (!accessToken) {
            return NextResponse.json({ error: "No access token" }, { status: 401 });
        }

        // Get current avatar to know what to delete
        let avatarFilename: string | null = null;
        try {
            const profileRes = await fetch(`${API_BASE_URL}/users/profile`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                cache: "no-store",
            });
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                const currentAvatar = profileData?.data?.avatar || profileData?.avatar;
                if (currentAvatar && currentAvatar.includes("/uploads/")) {
                    avatarFilename = currentAvatar.split("/uploads/").pop();
                }
            }
        } catch {
            // Non-critical
        }

        // Clear avatar from profile
        try {
            await fetch(`${API_BASE_URL}/users/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ avatar: "" }),
            });
        } catch (err) {
            console.error("[PROFILE_PIC_DEL] Failed to clear profile avatar:", err);
        }

        // Delete from CDN
        if (avatarFilename) {
            try {
                await fetch(`${CDN_BASE_URL}/api/media/delete`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "x-cdn-key": CDN_API_KEY,
                    },
                    body: JSON.stringify({ filename: avatarFilename }),
                });
            } catch {
                // Non-critical
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[PROFILE_PIC_DEL_ERROR]", error?.message || error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
