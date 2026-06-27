/**
 * Restaurant Seed Script — Creates test restaurants for Lahore, Multan, Islamabad
 * 
 * Run: npx tsx scripts/seed-test-restaurants.ts
 */

import mongoose from "mongoose";
import { config } from "dotenv";
config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/foodiespk";

const testRestaurants = [
    // ── Lahore ──
    {
        name: "Butt Karahi Tikka",
        slug: "butt-karahi-tikka-lahore",
        brandName: "Butt Karahi",
        city: "lahore",
        area: "Lakshmi Chowk",
        address: "McLeod Road, Lakshmi Chowk, Lahore",
        cuisines: ["Pakistani", "BBQ", "Karahi"],
        averageRating: 4.5,
        totalReviews: 342,
        priceRange: 2,
        isApproved: true,
        isActive: true,
        isFeatured: true,
        coverImage: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600",
        logo: "https://ui-avatars.com/api/?name=BK&background=f97316&color=fff&size=128",
        location: { type: "Point", coordinates: [74.3436, 31.5615] },
        openingHours: [
            { day: "Monday", open: "12:00", close: "01:00" },
            { day: "Tuesday", open: "12:00", close: "01:00" },
            { day: "Wednesday", open: "12:00", close: "01:00" },
            { day: "Thursday", open: "12:00", close: "01:00" },
            { day: "Friday", open: "12:00", close: "02:00" },
            { day: "Saturday", open: "12:00", close: "02:00" },
            { day: "Sunday", open: "12:00", close: "01:00" },
        ],
    },
    {
        name: "Café Aylanto",
        slug: "cafe-aylanto-lahore",
        brandName: "Café Aylanto",
        city: "lahore",
        area: "Gulberg",
        address: "8-B, Main Boulevard, Gulberg III, Lahore",
        cuisines: ["Continental", "Italian", "Fine Dining"],
        averageRating: 4.3,
        totalReviews: 218,
        priceRange: 4,
        isApproved: true,
        isActive: true,
        isFeatured: true,
        coverImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600",
        logo: "https://ui-avatars.com/api/?name=CA&background=2d6a4f&color=fff&size=128",
        location: { type: "Point", coordinates: [74.3432, 31.5182] },
        openingHours: [
            { day: "Monday", open: "12:00", close: "00:00" },
            { day: "Tuesday", open: "12:00", close: "00:00" },
            { day: "Wednesday", open: "12:00", close: "00:00" },
            { day: "Thursday", open: "12:00", close: "00:00" },
            { day: "Friday", open: "12:00", close: "01:00" },
            { day: "Saturday", open: "12:00", close: "01:00" },
            { day: "Sunday", open: "12:00", close: "00:00" },
        ],
    },
    {
        name: "Monal Lahore",
        slug: "monal-lahore",
        brandName: "Monal",
        city: "lahore",
        area: "DHA",
        address: "Sector Y, DHA Phase 3, Lahore",
        cuisines: ["Pakistani", "Chinese", "BBQ"],
        averageRating: 4.1,
        totalReviews: 567,
        priceRange: 3,
        isApproved: true,
        isActive: true,
        coverImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
        logo: "https://ui-avatars.com/api/?name=ML&background=ea580c&color=fff&size=128",
        location: { type: "Point", coordinates: [74.3795, 31.4757] },
        openingHours: [
            { day: "Monday", open: "11:00", close: "00:00" },
            { day: "Tuesday", open: "11:00", close: "00:00" },
            { day: "Wednesday", open: "11:00", close: "00:00" },
            { day: "Thursday", open: "11:00", close: "00:00" },
            { day: "Friday", open: "11:00", close: "01:00" },
            { day: "Saturday", open: "11:00", close: "01:00" },
            { day: "Sunday", open: "11:00", close: "00:00" },
        ],
    },

    // ── Multan ──
    {
        name: "Lal Qila Restaurant",
        slug: "lal-qila-restaurant-multan",
        brandName: "Lal Qila",
        city: "multan",
        area: "Bosan Road",
        address: "Bosan Road, near Nishtar Hospital, Multan",
        cuisines: ["Pakistani", "Desi", "Karahi"],
        averageRating: 4.2,
        totalReviews: 156,
        priceRange: 2,
        isApproved: true,
        isActive: true,
        isFeatured: true,
        coverImage: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600",
        logo: "https://ui-avatars.com/api/?name=LQ&background=dc2626&color=fff&size=128",
        location: { type: "Point", coordinates: [71.4768, 30.1984] },
        openingHours: [
            { day: "Monday", open: "11:00", close: "23:00" },
            { day: "Tuesday", open: "11:00", close: "23:00" },
            { day: "Wednesday", open: "11:00", close: "23:00" },
            { day: "Thursday", open: "11:00", close: "23:00" },
            { day: "Friday", open: "11:00", close: "00:00" },
            { day: "Saturday", open: "11:00", close: "00:00" },
            { day: "Sunday", open: "11:00", close: "23:00" },
        ],
    },
    {
        name: "Shahjahan Grill",
        slug: "shahjahan-grill-multan",
        brandName: "Shahjahan Grill",
        city: "multan",
        area: "Cantt",
        address: "Mall Road, Multan Cantt",
        cuisines: ["BBQ", "Steaks", "Continental"],
        averageRating: 4.4,
        totalReviews: 89,
        priceRange: 3,
        isApproved: true,
        isActive: true,
        coverImage: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600",
        logo: "https://ui-avatars.com/api/?name=SG&background=7c3aed&color=fff&size=128",
        location: { type: "Point", coordinates: [71.4693, 30.1825] },
        openingHours: [
            { day: "Monday", open: "12:00", close: "23:00" },
            { day: "Tuesday", open: "12:00", close: "23:00" },
            { day: "Wednesday", open: "12:00", close: "23:00" },
            { day: "Thursday", open: "12:00", close: "23:00" },
            { day: "Friday", open: "12:00", close: "00:00" },
            { day: "Saturday", open: "12:00", close: "00:00" },
            { day: "Sunday", open: "12:00", close: "23:00" },
        ],
    },
    {
        name: "Multani Sohan Halwa House",
        slug: "multani-sohan-halwa-house",
        brandName: "Sohan Halwa House",
        city: "multan",
        area: "Hussain Agahi",
        address: "Hussain Agahi Bazaar, Multan",
        cuisines: ["Dessert", "Sweets", "Pakistani"],
        averageRating: 4.6,
        totalReviews: 423,
        priceRange: 1,
        isApproved: true,
        isActive: true,
        isFeatured: true,
        coverImage: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600",
        logo: "https://ui-avatars.com/api/?name=SH&background=d97706&color=fff&size=128",
        location: { type: "Point", coordinates: [71.4672, 30.1958] },
        openingHours: [
            { day: "Monday", open: "08:00", close: "22:00" },
            { day: "Tuesday", open: "08:00", close: "22:00" },
            { day: "Wednesday", open: "08:00", close: "22:00" },
            { day: "Thursday", open: "08:00", close: "22:00" },
            { day: "Friday", open: "08:00", close: "23:00" },
            { day: "Saturday", open: "08:00", close: "23:00" },
            { day: "Sunday", open: "08:00", close: "22:00" },
        ],
    },

    // ── Islamabad ──
    {
        name: "Monal Restaurant Islamabad",
        slug: "monal-restaurant-islamabad",
        brandName: "Monal",
        city: "islamabad",
        area: "Pir Sohawa",
        address: "Pir Sohawa Road, Margalla Hills, Islamabad",
        cuisines: ["Pakistani", "BBQ", "Continental"],
        averageRating: 4.7,
        totalReviews: 1240,
        priceRange: 4,
        isApproved: true,
        isActive: true,
        isFeatured: true,
        coverImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
        logo: "https://ui-avatars.com/api/?name=MN&background=059669&color=fff&size=128",
        location: { type: "Point", coordinates: [73.0694, 33.7478] },
        openingHours: [
            { day: "Monday", open: "11:00", close: "00:00" },
            { day: "Tuesday", open: "11:00", close: "00:00" },
            { day: "Wednesday", open: "11:00", close: "00:00" },
            { day: "Thursday", open: "11:00", close: "00:00" },
            { day: "Friday", open: "11:00", close: "01:00" },
            { day: "Saturday", open: "11:00", close: "01:00" },
            { day: "Sunday", open: "11:00", close: "00:00" },
        ],
    },
    {
        name: "Tuscany Courtyard",
        slug: "tuscany-courtyard-islamabad",
        brandName: "Tuscany",
        city: "islamabad",
        area: "F-7",
        address: "F-7/2 Jinnah Super Market, Islamabad",
        cuisines: ["Italian", "Pizza", "Pasta"],
        averageRating: 4.3,
        totalReviews: 387,
        priceRange: 3,
        isApproved: true,
        isActive: true,
        coverImage: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
        logo: "https://ui-avatars.com/api/?name=TC&background=b91c1c&color=fff&size=128",
        location: { type: "Point", coordinates: [73.0551, 33.7215] },
        openingHours: [
            { day: "Monday", open: "12:00", close: "23:00" },
            { day: "Tuesday", open: "12:00", close: "23:00" },
            { day: "Wednesday", open: "12:00", close: "23:00" },
            { day: "Thursday", open: "12:00", close: "23:00" },
            { day: "Friday", open: "12:00", close: "00:00" },
            { day: "Saturday", open: "12:00", close: "00:00" },
            { day: "Sunday", open: "12:00", close: "23:00" },
        ],
    },
    {
        name: "Chaaye Khana",
        slug: "chaaye-khana-islamabad",
        brandName: "Chaaye Khana",
        city: "islamabad",
        area: "F-6",
        address: "Kohsar Market, F-6/3, Islamabad",
        cuisines: ["Cafe", "Dessert", "Pakistani"],
        averageRating: 4.5,
        totalReviews: 892,
        priceRange: 2,
        isApproved: true,
        isActive: true,
        isFeatured: true,
        coverImage: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600",
        logo: "https://ui-avatars.com/api/?name=CK&background=166534&color=fff&size=128",
        location: { type: "Point", coordinates: [73.0392, 33.7280] },
        openingHours: [
            { day: "Monday", open: "09:00", close: "23:00" },
            { day: "Tuesday", open: "09:00", close: "23:00" },
            { day: "Wednesday", open: "09:00", close: "23:00" },
            { day: "Thursday", open: "09:00", close: "23:00" },
            { day: "Friday", open: "09:00", close: "00:00" },
            { day: "Saturday", open: "09:00", close: "00:00" },
            { day: "Sunday", open: "10:00", close: "23:00" },
        ],
    },
];

async function seed() {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected");

    const db = mongoose.connection.db;
    if (!db) { console.error("No DB"); process.exit(1); }
    const col = db.collection("restaurants");

    for (const r of testRestaurants) {
        const exists = await col.findOne({ slug: r.slug });
        if (exists) {
            console.log(`⏭️  Skipping ${r.name} (already exists)`);
            continue;
        }
        await col.insertOne({
            ...r,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        console.log(`✅ Created: ${r.name} (${r.city})`);
    }

    console.log("\n🎉 Seed complete!");
    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => {
    console.error("Seed failed:", err);
    process.exit(1);
});
