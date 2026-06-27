import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Media from "../src/models/Media";

async function run() {
    try {
        const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/foodies-pakistan";
        console.log("Connecting to database...");
        await mongoose.connect(mongoUri);
        
        const count = await Media.countDocuments();
        console.log(`\nFound ${count} total media documents.`);
        
        if (count > 0) {
            const docs = await Media.find().sort({ createdAt: -1 }).limit(10).lean();
            docs.forEach((m: any, idx: number) => {
                console.log(`\n[${idx + 1}] Filename: ${m.filename}`);
                console.log(`    URL: ${m.url}`);
                console.log(`    Type: ${m.type}`);
                console.log(`    AltText: "${m.altText}"`);
                console.log(`    AltStatus: ${m.altTextStatus}`);
            });
        }
        process.exit(0);
    } catch (err: any) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}

run();
