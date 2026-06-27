import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file

import mongoose from "mongoose";
import { Restaurant } from "../src/models/Restaurant";
import { MenuItem } from "../src/models/MenuItem";
import Media from "../src/models/Media";

function cleanFilename(url: string): string {
    try {
        const parts = url.split("/");
        return parts[parts.length - 1] || "image.webp";
    } catch {
        return "image.webp";
    }
}

async function run() {
    try {
        const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/foodies-pakistan";
        console.log("Connecting to database...");
        await mongoose.connect(mongoUri);

        console.log("Scanning restaurants and menu items...");
        const [restaurants, menuItems] = await Promise.all([
            Restaurant.find().lean(),
            MenuItem.find().lean()
        ]);

        console.log(`Found ${restaurants.length} restaurants and ${menuItems.length} menu items.`);

        const mediaToInsert: any[] = [];
        const existingUrls = new Set<string>();

        // Pre-fetch all existing media URLs to avoid duplicates
        const existingMedia = await Media.find().select("url").lean();
        existingMedia.forEach(m => existingUrls.add(m.url));
        console.log(`Pre-loaded ${existingUrls.size} existing media URLs from database.`);

        const addMedia = (url: string, filename: string, altText: string, context: string) => {
            if (!url || typeof url !== "string" || !url.startsWith("http")) return;
            if (existingUrls.has(url)) return;

            existingUrls.add(url); // prevent duplicate in this run
            mediaToInsert.push({
                url,
                thumbUrl: null,
                filename: cleanFilename(url),
                originalFilename: filename,
                type: "image",
                format: url.split(".").pop() || "webp",
                width: null,
                height: null,
                sizeBytes: null,
                altTextStatus: "generated", // Mark as generated to avoid OpenAI API costs initially
                altText: altText.substring(0, 150),
                context,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        };

        // 1. Process Restaurants
        for (const r of restaurants) {
            const rName = r.brandName || r.name || "Restaurant";
            
            // Cover Image
            if (r.coverImage) {
                addMedia(r.coverImage, `${rName}-cover`, `Main cover banner of ${rName} restaurant in ${r.city || "Pakistan"}`, "restaurant-cover");
            }
            
            // Logo
            if (r.logo) {
                addMedia(r.logo, `${rName}-logo`, `Logo of ${rName} restaurant`, "restaurant-logo");
            }

            // Gallery Images
            if (r.galleryImages && Array.isArray(r.galleryImages)) {
                r.galleryImages.forEach((img: any, idx: number) => {
                    const category = img.category || "Interior";
                    const imgUrl = typeof img === "string" ? img : img.url;
                    addMedia(imgUrl, `${rName}-gallery-${idx + 1}`, `${category} view of ${rName} restaurant`, "restaurant-gallery");
                });
            }

            // Menu Images
            if (r.menuImages && Array.isArray(r.menuImages)) {
                r.menuImages.forEach((img: string, idx: number) => {
                    addMedia(img, `${rName}-menu-${idx + 1}`, `Digital menu card page ${idx + 1} of ${rName}`, "restaurant-menu");
                });
            }
        }

        // 2. Process Menu Items
        const rMap = new Map<string, string>();
        restaurants.forEach(r => rMap.set(r._id.toString(), r.brandName || r.name || "Restaurant"));

        for (const item of menuItems) {
            if (item.image) {
                const rName = item.restaurantId ? rMap.get(item.restaurantId.toString()) || "Restaurant" : "Restaurant";
                addMedia(item.image, `${item.name}-menu-item`, `${item.name} dish served at ${rName}`, "menu-item");
            }
        }

        console.log(`Inserting ${mediaToInsert.length} new media records...`);
        if (mediaToInsert.length > 0) {
            // Bulk insert
            await Media.insertMany(mediaToInsert);
            console.log("✅ Successfully populated the Media collection!");
        } else {
            console.log("No new media records to insert.");
        }

        process.exit(0);
    } catch (err: any) {
        console.error("❌ Sync Error:", err.message);
        process.exit(1);
    }
}

run();
