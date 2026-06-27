/**
 * CDN Client — Axios wrapper for uploading images to the CDN server.
 *
 * Used by the Core API to proxy image uploads from the frontend/Flutter
 * to the CDN server (Port 3001) with the CDN_API_KEY.
 */

import axios, { AxiosInstance } from "axios";
import { env } from "../config/env";
import FormData from "form-data";

class CdnClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: env.CDN_BASE_URL,
            timeout: 30000, // 30 seconds — image processing can be slow
            headers: {
                "x-cdn-key": env.CDN_API_KEY,
            },
        });
    }

    /**
     * Upload an image buffer to the CDN.
     *
     * @param buffer   - Raw image buffer
     * @param filename - Original filename (for Content-Disposition)
     * @param slug     - SEO-friendly slug for the output filename
     * @returns CDN response with url, thumbUrl, etc.
     */
    async uploadImage(
        buffer: Buffer,
        filename: string,
        slug: string
    ): Promise<{
        url: string;
        thumbUrl: string;
        filename: string;
        width: number;
        height: number;
        sizeBytes: number;
    }> {
        const form = new FormData();
        form.append("image", buffer, { filename });
        form.append("slug", slug);

        const response = await this.client.post("/api/media/upload", form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        if (!response.data?.success) {
            throw new Error(response.data?.error || "CDN upload failed");
        }

        return response.data.data;
    }

    /**
     * Delete an image/media from the CDN.
     *
     * @param fileUrl - The full CDN URL of the file to delete
     * @returns true if deleted, false if not found or unsupported
     */
    async deleteImage(fileUrl: string): Promise<boolean> {
        try {
            // Extract the filename from the URL
            const urlObj = new URL(fileUrl);
            const filename = urlObj.pathname.split("/").pop();
            if (!filename) return false;

            const response = await this.client.delete(`/api/media/${filename}`, {
                timeout: 10000,
            });

            return response.data?.success === true;
        } catch (err: any) {
            // If CDN doesn't support delete (404/405), just log and continue
            if (err.response?.status === 404 || err.response?.status === 405) {
                console.warn(`[CDN] Delete not supported or file not found: ${fileUrl}`);
                return false;
            }
            console.warn(`[CDN] Delete failed for ${fileUrl}:`, err.message);
            return false;
        }
    }

    /**
     * Check CDN health.
     */
    async healthCheck(): Promise<boolean> {
        try {
            const res = await this.client.get("/health", { timeout: 5000 });
            return res.data?.status === "ok";
        } catch {
            return false;
        }
    }
}

export const cdnClient = new CdnClient();
