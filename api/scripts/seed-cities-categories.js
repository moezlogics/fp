const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load backend env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Models (Mongoose Schema definition)
const CitySchema = new mongoose.Schema({
    name: String, slug: String, latitude: Number, longitude: Number,
    image: String, order: Number, isActive: Boolean,
});
const CategorySchema = new mongoose.Schema({
    name: String, slug: String, image: String, icon: String, order: Number, isActive: Boolean,
});
const AreaSchema = new mongoose.Schema({
    name: String, slug: String, citySlug: String, isActive: Boolean,
});

const City = mongoose.model("City", CitySchema);
const Category = mongoose.model("Category", CategorySchema);
const Area = mongoose.model("Area", AreaSchema);

const CITIES = [
    { name: "Lahore", slug: "lahore", latitude: 31.5204, longitude: 74.3587, order: 1 },
    { name: "Karachi", slug: "karachi", latitude: 24.8607, longitude: 67.0011, order: 2 },
    { name: "Islamabad", slug: "islamabad", latitude: 33.6844, longitude: 73.0479, order: 3 },
    { name: "Rawalpindi", slug: "rawalpindi", latitude: 33.5973, longitude: 73.0479, order: 4 },
    { name: "Faisalabad", slug: "faisalabad", latitude: 31.4504, longitude: 73.1350, order: 5 },
    { name: "Multan", slug: "multan", latitude: 30.1575, longitude: 71.5249, order: 6 },
    { name: "Peshawar", slug: "peshawar", latitude: 34.0151, longitude: 71.5249, order: 7 },
    { name: "Quetta", slug: "quetta", latitude: 30.1798, longitude: 66.9750, order: 8 },
    { name: "Sialkot", slug: "sialkot", latitude: 32.4945, longitude: 74.5229, order: 9 },
    { name: "Gujranwala", slug: "gujranwala", latitude: 32.1617, longitude: 74.1883, order: 10 },
];

const CATEGORIES = [
    { name: "Desi Food", slug: "desi-food", icon: "🍛", order: 1 },
    { name: "Fast Food", slug: "fast-food", icon: "🍔", order: 2 },
    { name: "BBQ & Grill", slug: "bbq-grill", icon: "🍢", order: 3 },
    { name: "Chinese", slug: "chinese", icon: "🍜", order: 4 },
    { name: "Continental", slug: "continental", icon: "🥩", order: 5 },
    { name: "Café & Coffee", slug: "cafe-coffee", icon: "☕", order: 6 },
    { name: "Pizza", slug: "pizza", icon: "🍕", order: 7 },
    { name: "Seafood", slug: "seafood", icon: "🍤", order: 8 },
    { name: "Biryani", slug: "biryani", icon: "🥘", order: 9 },
    { name: "Sweet & Bakery", slug: "sweet-bakery", icon: "🍰", order: 10 },
];

const AREAS = [
    { name: "Gulberg", slug: "gulberg", citySlug: "lahore" },
    { name: "DHA Lahore", slug: "dha-lahore", citySlug: "lahore" },
    { name: "Johar Town", slug: "johar-town", citySlug: "lahore" },
    { name: "Model Town", slug: "model-town", citySlug: "lahore" },
    { name: "Liberty", slug: "liberty", citySlug: "lahore" },
    { name: "Clifton", slug: "clifton", citySlug: "karachi" },
    { name: "DHA Karachi", slug: "dha-karachi", citySlug: "karachi" },
    { name: "Saddar", slug: "saddar", citySlug: "karachi" },
    { name: "Gulshan-e-Iqbal", slug: "gulshan-e-iqbal", citySlug: "karachi" },
    { name: "North Nazimabad", slug: "north-nazimabad", citySlug: "karachi" },
    { name: "F-7 Markaz", slug: "f-7-markaz", citySlug: "islamabad" },
    { name: "F-6 Markaz", slug: "f-6-markaz", citySlug: "islamabad" },
    { name: "Blue Area", slug: "blue-area", citySlug: "islamabad" },
    { name: "F-10 Markaz", slug: "f-10-markaz", citySlug: "islamabad" },
    { name: "I-8 Markaz", slug: "i-8-markaz", citySlug: "islamabad" },
];

async function seed() {
    const MONGO_URI = process.env.MONGODB_URI;
    if (!MONGO_URI) {
        console.error("No MONGODB_URI found. Check .env file path.");
        process.exit(1);
    }
    console.log("Connecting to:", MONGO_URI);

    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB.");

        console.log("Seeding Cities...");
        for (const city of CITIES) {
            await City.findOneAndUpdate(
                { slug: city.slug },
                { $set: { ...city, isActive: true } },
                { upsert: true, new: true }
            );
        }
        console.log(`  ✅ ${CITIES.length} cities seeded`);

        console.log("Seeding Categories...");
        for (const cat of CATEGORIES) {
            await Category.findOneAndUpdate(
                { slug: cat.slug },
                { $set: { ...cat, isActive: true } },
                { upsert: true, new: true }
            );
        }
        console.log(`  ✅ ${CATEGORIES.length} categories seeded`);

        console.log("Seeding Areas...");
        for (const area of AREAS) {
            await Area.findOneAndUpdate(
                { slug: area.slug, citySlug: area.citySlug },
                { $set: { ...area, isActive: true } },
                { upsert: true, new: true }
            );
        }
        console.log(`  ✅ ${AREAS.length} areas seeded`);

        console.log("\n🎉 Seed completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Seed error:", err);
        process.exit(1);
    }
}

seed();
