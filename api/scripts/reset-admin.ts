/**
 * Admin Reset Script
 * 
 * Resets admin credentials and clears any lockout state.
 * 
 * Usage (from foodies backend root):
 *   npx ts-node scripts/reset-admin.ts
 * 
 * Or on production server:
 *   node -e "require('./dist/scripts/reset-admin.js')"
 */

import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "";
const NEW_EMAIL = "logicalmoez@gmail.com";
const NEW_PASSWORD = "Multanpakistan1!";

async function main() {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected.\n");

    const db = mongoose.connection.db!;
    const usersCollection = db.collection("users");

    // 1. Find existing admin(s)
    const admins = await usersCollection.find({ role: "admin" }).toArray();
    console.log(`📋 Found ${admins.length} admin account(s):`);
    admins.forEach((a) => {
        console.log(`   - ${a.email} (locked: ${!!a.lockedUntil}, failedAttempts: ${a.failedLoginAttempts || 0})`);
    });

    if (admins.length === 0) {
        // No admin exists — create one
        console.log("\n⚠️  No admin found. Creating a new admin account...");
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

        await usersCollection.insertOne({
            name: "Admin",
            email: NEW_EMAIL.toLowerCase().trim(),
            password: hashedPassword,
            role: "admin",
            isEmailVerified: true,
            isApproved: true,
            profileCompleted: true,
            failedLoginAttempts: 0,
            lockedUntil: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        console.log(`✅ Admin created: ${NEW_EMAIL}`);
    } else {
        // Update the first admin's credentials
        const targetAdmin = admins[0];
        console.log(`\n🔄 Updating admin: ${targetAdmin.email} → ${NEW_EMAIL}`);

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

        await usersCollection.updateOne(
            { _id: targetAdmin._id },
            {
                $set: {
                    email: NEW_EMAIL.toLowerCase().trim(),
                    password: hashedPassword,
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                    refreshToken: null,
                    oldRefreshToken: null,
                    oldRefreshTokenExpiresAt: null,
                    updatedAt: new Date(),
                },
            }
        );

        console.log("✅ Admin credentials updated successfully.");
    }

    // 2. Also clear lockouts on ALL accounts (in case everyone is locked)
    const lockResult = await usersCollection.updateMany(
        { $or: [{ lockedUntil: { $ne: null } }, { failedLoginAttempts: { $gt: 0 } }] },
        {
            $set: {
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        }
    );
    console.log(`\n🔓 Cleared lockouts on ${lockResult.modifiedCount} account(s).`);

    // 3. Check Redis rate limiter keys (informational)
    console.log("\n📊 Summary:");
    console.log(`   Admin email:    ${NEW_EMAIL}`);
    console.log(`   Admin password: ${NEW_PASSWORD}`);
    console.log(`   All lockouts:   CLEARED`);
    console.log(`\n💡 If login still fails, also flush Redis rate limit keys:`);
    console.log(`   redis-cli KEYS "rl:auth:*" | xargs redis-cli DEL`);

    await mongoose.disconnect();
    console.log("\n✅ Done. Disconnected from MongoDB.");
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Script failed:", err);
    process.exit(1);
});
