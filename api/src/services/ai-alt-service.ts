/**
 * AI ALT Text Service — OpenAI Vision-based image description generator.
 *
 * Uses gpt-4o-mini with vision to analyze uploaded images and generate
 * concise, SEO-optimized ALT text. Runs asynchronously after upload —
 * the user never waits for this.
 *
 * Flow:
 * 1. Upload completes → CDN returns URL
 * 2. This service is called async (fire-and-forget)
 * 3. Downloads the image from CDN URL
 * 4. Sends to OpenAI vision for analysis
 * 5. Updates the Media document with the generated ALT text
 */

import OpenAI from "openai";
import Media from "../models/Media";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate SEO-optimized ALT text for an image.
 *
 * @param imageUrl - Public CDN URL of the image
 * @returns Generated ALT text string
 */
export async function generateAltText(imageUrl: string): Promise<string> {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "You are an SEO expert. Generate a concise, descriptive alt text for images used on a Pakistani food and restaurant discovery platform. " +
                        "The alt text should be in English, describe what is visible in the image accurately, and be optimized for Google Image Search. " +
                        "Keep it under 125 characters. Do NOT include phrases like 'image of' or 'photo of'. " +
                        "Focus on the food, restaurant ambiance, interior, or whatever the main subject is. " +
                        "If it's a menu, describe it as a menu card. If it's food, name the dish if identifiable.",
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Generate alt text for this image:",
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl,
                                detail: "low", // Use low detail to minimize cost
                            },
                        },
                    ],
                },
            ],
            max_tokens: 100,
            temperature: 0.3,
        });

        const altText = response.choices[0]?.message?.content?.trim() || "";
        // Clean up any quotes the model might add
        return altText.replace(/^["']|["']$/g, "").substring(0, 150);
    } catch (err: any) {
        console.error("[AI ALT] Failed to generate alt text:", err.message);
        throw err;
    }
}

/**
 * Process a newly uploaded media file:
 * 1. Save it to the Media collection
 * 2. If it's an image, generate AI ALT text asynchronously
 *
 * This should be called AFTER the CDN upload succeeds.
 * It is fire-and-forget — errors are logged but don't affect the upload response.
 *
 * @param data - Media upload data from CDN response
 */
export async function processMediaUpload(data: {
    url: string;
    thumbUrl?: string | null;
    filename: string;
    originalFilename?: string | null;
    type?: "image" | "video";
    format?: string | null;
    width?: number | null;
    height?: number | null;
    sizeBytes?: number | null;
    uploadedBy?: string | null;
    context?: string | null;
}): Promise<void> {
    try {
        // 1. Upsert the Media document (in case of duplicate URL)
        const media = await Media.findOneAndUpdate(
            { url: data.url },
            {
                $set: {
                    url: data.url,
                    thumbUrl: data.thumbUrl || null,
                    filename: data.filename,
                    originalFilename: data.originalFilename || null,
                    type: data.type || "image",
                    format: data.format || null,
                    width: data.width || null,
                    height: data.height || null,
                    sizeBytes: data.sizeBytes || null,
                    uploadedBy: data.uploadedBy || null,
                    context: data.context || null,
                    altTextStatus: data.type === "video" ? "generated" : "pending",
                    altText: data.type === "video" ? (data.originalFilename || data.filename) : "",
                },
            },
            { upsert: true, new: true }
        );

        // 2. If it's an image, generate ALT text asynchronously
        if (data.type !== "video" && media) {
            // Fire-and-forget — don't await in the main flow
            generateAltText(data.url)
                .then(async (altText) => {
                    await Media.updateOne(
                        { _id: media._id },
                        { $set: { altText, altTextStatus: "generated" } }
                    );
                    console.log(`[AI ALT] ✅ Generated for ${data.filename}: "${altText}"`);
                })
                .catch(async (err) => {
                    await Media.updateOne(
                        { _id: media._id },
                        { $set: { altTextStatus: "failed" } }
                    );
                    console.error(`[AI ALT] ❌ Failed for ${data.filename}:`, err.message);
                });
        }
    } catch (err: any) {
        console.error("[AI ALT] processMediaUpload error:", err.message);
    }
}
