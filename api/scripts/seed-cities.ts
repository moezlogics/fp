/**
 * Seed Cities — ensures cities exist with proper coordinates
 * Updates existing cities with lat/lng if missing
 * Run: npx tsx scripts/seed-cities.ts
 */

import mongoose from "mongoose";
import { config } from "dotenv";
config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/foodiespk";

const cities = [
    { name: "Lahore", slug: "lahore", latitude: 31.5204, longitude: 74.3587, isActive: true },
    { name: "Islamabad", slug: "islamabad", latitude: 33.6844, longitude: 73.0479, isActive: true },
    { name: "Multan", slug: "multan", latitude: 30.1575, longitude: 71.5249, isActive: true },
    { name: "Karachi", slug: "karachi", latitude: 24.8607, longitude: 67.0011, isActive: true },
];

async function seed() {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    if (!db) { console.error("No DB"); process.exit(1); }
    const col = db.collection("cities");

    for (const c of cities) {
        const result = await col.updateOne(
            { slug: c.slug },
            {
                $set: {
                    name: c.name,
                    latitude: c.latitude,
                    longitude: c.longitude,
                    isActive: c.isActive,
                    updatedAt: new Date(),
                },
                $setOnInsert: {
                    createdAt: new Date(),
                },
            },
            { upsert: true }
        );
        if (result.upsertedCount > 0) {
            console.log(`✅ Created city: ${c.name} (${c.latitude}, ${c.longitude})`);
        } else if (result.modifiedCount > 0) {
            console.log(`🔄 Updated city: ${c.name} with coordinates (${c.latitude}, ${c.longitude})`);
        } else {
            console.log(`⏭️  ${c.name} already up to date`);
        }
    }

    console.log("🎉 Cities seed complete!");
    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
