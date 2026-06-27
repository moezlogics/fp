/**
 * Performance Indexes Migration Script
 * Run: npx ts-node scripts/add-performance-indexes.ts
 */

import mongoose from "mongoose";
import { Restaurant } from "../src/models/Restaurant";
import { Review } from "../src/models/Review";
import { Deal } from "../src/models/Deal";
import { YieldRule } from "../src/models/YieldRule";
import { TableInventory } from "../src/models/TableInventory";
import { Reservation } from "../src/models/Reservation";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/foodies";

async function addIndexes() {
    try {
        console.log("🔌 Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB\n");

        // Restaurant Indexes
        console.log("📊 Adding Restaurant indexes...");
        await Restaurant.collection.createIndex({ city: 1, isApproved: 1, isActive: 1 });
        console.log("  ✓ city + isApproved + isActive");
        
        await Restaurant.collection.createIndex({ brandName: 1, city: 1 });
        console.log("  ✓ brandName + city");
        
        await Restaurant.collection.createIndex({ cuisines: 1 });
        console.log("  ✓ cuisines");
        
        await Restaurant.collection.createIndex({ averageRating: -1 });
        console.log("  ✓ averageRating (desc)");
        
        await Restaurant.collection.createIndex({ isFeatured: -1, averageRating: -1 });
        console.log("  ✓ isFeatured + averageRating (compound)");
        
        await Restaurant.collection.createIndex({ viewCount: -1 });
        console.log("  ✓ viewCount (desc)");
        
        await Restaurant.collection.createIndex({ location: "2dsphere" });
        console.log("  ✓ location (2dsphere for geo queries)");
        
        await Restaurant.collection.createIndex({ city: 1, cuisines: 1, isApproved: 1, isActive: 1 });
        console.log("  ✓ city + cuisines + isApproved + isActive (compound)");
        
        await Restaurant.collection.createIndex({ city: 1, priceRange: 1, isApproved: 1, isActive: 1 });
        console.log("  ✓ city + priceRange + isApproved + isActive (compound)");

        // Review Indexes
        console.log("\n📊 Adding Review indexes...");
        await Review.collection.createIndex({ restaurantId: 1, isVisible: 1, createdAt: -1 });
        console.log("  ✓ restaurantId + isVisible + createdAt");
        
        await Review.collection.createIndex({ userId: 1, createdAt: -1 });
        console.log("  ✓ userId + createdAt");

        // Deal Indexes
        console.log("\n📊 Adding Deal indexes...");
        await Deal.collection.createIndex({ restaurantId: 1, isActive: 1 });
        console.log("  ✓ restaurantId + isActive");
        
        await Deal.collection.createIndex({ bankId: 1, isActive: 1 });
        console.log("  ✓ bankId + isActive");
        
        await Deal.collection.createIndex({ restaurantId: 1, isActive: 1, validFrom: 1, validTo: 1 });
        console.log("  ✓ restaurantId + isActive + validFrom + validTo (compound)");

        // YieldRule Indexes
        console.log("\n📊 Adding YieldRule indexes...");
        await YieldRule.collection.createIndex({ restaurantId: 1, isActive: 1, validFrom: 1, validTo: 1 });
        console.log("  ✓ restaurantId + isActive + validFrom + validTo");
        
        await YieldRule.collection.createIndex({ restaurantId: 1, priority: -1 });
        console.log("  ✓ restaurantId + priority (desc)");

        // TableInventory Indexes
        console.log("\n📊 Adding TableInventory indexes...");
        await TableInventory.collection.createIndex({ restaurantId: 1, date: 1, timeSlot: 1 });
        console.log("  ✓ restaurantId + date + timeSlot");
        
        await TableInventory.collection.createIndex({ restaurantId: 1, date: 1, isBlocked: 1 });
        console.log("  ✓ restaurantId + date + isBlocked");

        // Reservation Indexes
        console.log("\n📊 Adding Reservation indexes...");
        await Reservation.collection.createIndex({ restaurantId: 1, status: 1, date: 1 });
        console.log("  ✓ restaurantId + status + date");
        
        await Reservation.collection.createIndex({ userId: 1, status: 1, createdAt: -1 });
        console.log("  ✓ userId + status + createdAt");
        
        await Reservation.collection.createIndex({ status: 1, lockExpiresAt: 1 });
        console.log("  ✓ status + lockExpiresAt (for cron cleanup)");

        console.log("\n✅ All indexes created successfully!");
        
        // Show index stats
        console.log("\n📈 Index Statistics:");
        const restaurantIndexes = await Restaurant.collection.indexes();
        console.log(`  Restaurant: ${restaurantIndexes.length} indexes`);
        
        const reviewIndexes = await Review.collection.indexes();
        console.log(`  Review: ${reviewIndexes.length} indexes`);
        
        const dealIndexes = await Deal.collection.indexes();
        console.log(`  Deal: ${dealIndexes.length} indexes`);
        
        const yieldIndexes = await YieldRule.collection.indexes();
        console.log(`  YieldRule: ${yieldIndexes.length} indexes`);
        
        const inventoryIndexes = await TableInventory.collection.indexes();
        console.log(`  TableInventory: ${inventoryIndexes.length} indexes`);
        
        const reservationIndexes = await Reservation.collection.indexes();
        console.log(`  Reservation: ${reservationIndexes.length} indexes`);

    } catch (error) {
        console.error("❌ Error adding indexes:", error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log("\n🔌 Disconnected from MongoDB");
        process.exit(0);
    }
}

addIndexes();
