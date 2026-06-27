import OpenAI from "openai";
import { MENU_CATEGORIES, DIETARY_TAGS } from "../models/MenuItem";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedMenuItem {
    name: string;
    description: string;
    price: number; // Raw price from menu
    pricePaisa: number; // Converted to paisa
    category: string;
    dietaryTags: string[];
}

export interface ExtractionResult {
    items: ExtractedMenuItem[];
    menuOverview?: string;
    categoryOverviews?: Record<string, string>;
}

/**
 * AI Menu Service — Smart Extraction
 * Uses GPT-4o-mini (vision) to extract structured data from menu images.
 * 
 * Smart Features:
 *  - Handles diverse menu formats (category-level pricing, no-price items, etc.)
 *  - Auto-generates brief descriptions when missing
 *  - Estimates realistic PKR prices when not visible
 *  - Generates menu overview and category summaries
 * 
 * Flow:
 *  1. Send the menu image to GPT-4o-mini with an enhanced structured prompt
 *  2. Parse the JSON response
 *  3. Validate and sanitize each item against our schema
 *  4. Return clean, ready-to-save items with overview metadata
 */
export const extractMenuFromImage = async (imageUrl: string): Promise<ExtractionResult> => {
    try {
        console.log("[AI Menu] Initiating smart extraction with OpenAI...");

        const categoriesList = MENU_CATEGORIES.join(", ");
        const tagsList = DIETARY_TAGS.join(", ");

        // Note: Using gpt-4o-mini which is over 30x cheaper than gpt-4o and supports excellent vision!
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.15, // Low temp for more deterministic structured output
            max_tokens: 4096,
            messages: [
                {
                    role: "system",
                    content: `You are a professional restaurant menu digitizer for Foodies Pakistan — the premier dining discovery platform in Pakistan.

Your task: Extract ALL food and drink items from the provided menu image with maximum intelligence.

Return a JSON object with this EXACT structure:
{
  "items": [
    {
      "name": "Dish Name",
      "description": "Brief appetizing description of the dish",
      "price": 850,
      "priceEstimated": false,
      "category": "Main Course",
      "dietaryTags": ["Spicy"]
    }
  ],
  "menuOverview": "A one-line overview of this restaurant's menu offerings",
  "categoryOverviews": {
    "Appetizers": "A brief one-line summary of the appetizer selection"
  }
}

RULES FOR EXTRACTION:
- "name": The exact dish name as written on the menu.
- "description": Brief appetizing description. IMPORTANT: If the menu does NOT show a description, you MUST still generate a realistic, brief description (15-30 words) based on your knowledge of the dish in Pakistani cuisine context. Never leave description empty.
- "price": Numerical price in Pakistani Rupees (PKR).
  • If price shows "850" or "Rs. 850" or "Rs 850/-", return 850.
  • If the menu has a CATEGORY-LEVEL PRICE (e.g., "Appetizers — Rs. 500" with items listed below without individual prices), assign that category price to EVERY item in that category.
  • If NO price is visible AT ALL for an item, ESTIMATE a realistic PKR price based on:
    - The dish type (e.g., a burger is typically 400-800 PKR, biryani 300-600 PKR, steak 1500-3000 PKR)
    - The restaurant's general price level visible from other items on the menu
    - Current typical Pakistani restaurant pricing (2024-2026 range)
    Set "priceEstimated" to true for estimated prices.
- "priceEstimated": Set to true ONLY if you estimated the price (it wasn't visible on the menu). Set false if the price was on the menu.
- "category": MUST be exactly one of these: [${categoriesList}]. Map the menu section name to the closest matching category. If unsure, use "Main Course".
- "dietaryTags": Array of applicable tags from: [${tagsList}]. Identify based on dish name, icons, or labels. Use empty array [] if none apply.

MENU OVERVIEW RULES:
- "menuOverview": Write ONE compelling line (15-25 words) summarizing the restaurant's menu style. Example: "A diverse Pakistani-Continental menu featuring hearty grills, fresh salads, signature burgers, and traditional biryani dishes."
- "categoryOverviews": For EACH category, write ONE line (10-20 words) highlighting the best items. Example: "Featuring signature chicken tikka, crispy samosas, and refreshing raita appetizers."

IMPORTANT:
- Extract EVERY item visible in the image, even partial ones.
- Do NOT skip items. Do NOT invent items not on the menu.
- If the image is unclear or not a menu, return {"items": [], "menuOverview": "", "categoryOverviews": {}}.
- Always return valid JSON with all required keys.
- Priority: Image data > Your knowledge. Only estimate/generate when data is genuinely missing from the image.`,
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Extract all menu items from this restaurant menu image. Generate descriptions for items missing them, estimate prices where not visible, and provide menu/category overviews:" },
                        {
                            type: "image_url",
                            image_url: { 
                                url: imageUrl,
                                detail: "high" // High detail for better OCR
                            },
                        },
                    ],
                },
            ],
            response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        console.log("[AI Menu] Raw GPT response length:", content?.length || 0);

        if (!content) {
            console.warn("[AI Menu] Empty response from GPT");
            return { items: [], menuOverview: "", categoryOverviews: {} };
        }

        // Parse the response, stripping any possible markdown
        let parsed: any;
        const cleanedContent = content.replace(/^```json/mi, '').replace(/```$/m, '').trim();
        try {
            parsed = JSON.parse(cleanedContent);
        } catch (parseErr) {
            console.error("[AI Menu] Failed to parse GPT JSON:", cleanedContent.substring(0, 200));
            return { items: [], menuOverview: "", categoryOverviews: {} };
        }

        // Robust extraction: GPT might use different key names
        let rawItems: any[] = [];
        if (Array.isArray(parsed)) {
            rawItems = parsed;
        } else if (Array.isArray(parsed.items)) {
            rawItems = parsed.items;
        } else if (Array.isArray(parsed.menu_items)) {
            rawItems = parsed.menu_items;
        } else if (Array.isArray(parsed.menu)) {
            rawItems = parsed.menu;
        } else if (Array.isArray(parsed.data)) {
            rawItems = parsed.data;
        } else {
            // Last resort: find ANY array in the response
            for (const key of Object.keys(parsed)) {
                if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
                    rawItems = parsed[key];
                    console.log(`[AI Menu] Found items under key: "${key}"`);
                    break;
                }
            }
        }

        console.log(`[AI Menu] Extracted ${rawItems.length} raw items`);

        if (rawItems.length === 0) {
            return { items: [], menuOverview: parsed.menuOverview || "", categoryOverviews: parsed.categoryOverviews || {} };
        }

        // Validate and sanitize each item
        const validCategories = new Set(MENU_CATEGORIES as readonly string[]);
        const validTags = new Set(DIETARY_TAGS as readonly string[]);

        // Calculate average price from items that have a real price, for better estimation validation
        const pricesFound = rawItems
            .filter((item: any) => {
                const p = typeof item.price === "number" ? item.price : parseFloat(String(item.price || "0").replace(/[^0-9.]/g, ""));
                return p > 0 && !item.priceEstimated;
            })
            .map((item: any) => typeof item.price === "number" ? item.price : parseFloat(String(item.price).replace(/[^0-9.]/g, "")));
        
        const avgPrice = pricesFound.length > 0 ? pricesFound.reduce((a, b) => a + b, 0) / pricesFound.length : 500;

        const sanitized: ExtractedMenuItem[] = rawItems
            .filter((item: any) => item && typeof item === "object")
            .map((item: any) => {
                const name = item.name || item.title || item.dish || item.dish_name || "Unknown Item";
                
                let price = typeof item.price === "number" ? item.price 
                    : typeof item.price === "string" ? parseFloat(item.price.replace(/[^0-9.]/g, "")) || 0 
                    : 0;

                // If price is unreasonably low (likely estimated badly) or zero, cap it within a sane range
                if (price > 0 && price < 50) {
                    // Probably the AI returned price in hundreds when it should be in units — multiply
                    price = price * 100;
                }

                // Find closest valid category
                let category = "Main Course";
                if (item.category && validCategories.has(item.category)) {
                    category = item.category;
                } else if (item.category) {
                    // Try fuzzy matching
                    const lowerCat = String(item.category).toLowerCase();
                    for (const validCat of MENU_CATEGORIES) {
                        if (validCat.toLowerCase().includes(lowerCat) || lowerCat.includes(validCat.toLowerCase())) {
                            category = validCat;
                            break;
                        }
                    }
                }

                // Validate dietary tags
                const dietaryTags = Array.isArray(item.dietaryTags)
                    ? item.dietaryTags.filter((tag: string) => validTags.has(tag))
                    : [];

                // Ensure description is never empty
                let description = String(item.description || "").trim();
                if (!description || description.length < 5) {
                    // Fallback: generate a minimal description from the name
                    description = `A delicious ${category.toLowerCase()} dish — ${name}. Freshly prepared and served.`;
                }

                return {
                    name: String(name).trim().substring(0, 200),
                    description: description.substring(0, 500),
                    price,
                    pricePaisa: Math.round(price * 100),
                    category,
                    dietaryTags,
                };
            })
            // Filter out items that had no real name extracted
            .filter(item => item.name && item.name !== "Unknown Item");

        console.log(`[AI Menu] Returning ${sanitized.length} sanitized items`);

        // Extract overview data
        const menuOverview = typeof parsed.menuOverview === "string" ? parsed.menuOverview.trim() : "";
        const categoryOverviews: Record<string, string> = {};
        if (parsed.categoryOverviews && typeof parsed.categoryOverviews === "object") {
            for (const [key, val] of Object.entries(parsed.categoryOverviews)) {
                if (typeof val === "string" && val.trim()) {
                    categoryOverviews[key] = val.trim();
                }
            }
        }

        return {
            items: sanitized,
            menuOverview,
            categoryOverviews,
        };
    } catch (error: any) {
        console.error("[AI Menu] Extraction Error:", error?.message || error);
        if (error?.status === 401 || error?.status === 403) {
            throw new Error("OpenAI API authentication failed. Check your API key.");
        }
        if (error?.code === "insufficient_quota") {
            throw new Error("OpenAI API quota exceeded. Please check your billing.");
        }
        throw new Error(`Failed to extract menu: ${error?.message || "Unknown error"}`);
    }
};
