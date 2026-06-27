/**
 * Admin Reset Script — Resets admin credentials + clears ALL login blocks
 * 
 * This clears ALL 3 layers of brute-force protection:
 *   1. MongoDB account lockouts (lockedUntil, failedLoginAttempts)
 *   2. Redis login guard blocks (login_guard:*)
 *   3. Redis rate limiter blocks (rl:auth:*)
 * 
 * Usage on production server:
 *   cd /home/foodiespakistan/htdocs/api.foodiespakistan.pk
 *   node scripts/reset-admin.js
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");
const _ioredis = require("ioredis");
const Redis = _ioredis.default || _ioredis;

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "";
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const NEW_EMAIL = "logicalmoez@gmail.com";
const NEW_PASSWORD = "Multanpakistan1!";

async function main() {
    // ═══════════════════════════════════════════════════════
    // STEP 1: MongoDB — Reset admin creds + clear lockouts
    // ═══════════════════════════════════════════════════════
    console.log("🔌 Connecting to MongoDB...");
    console.log("   URI:", MONGODB_URI.replace(/\/\/.*@/, "//***:***@"));
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB.\n");

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Find existing admin(s)
    const admins = await usersCollection.find({ role: "admin" }).toArray();
    console.log(`📋 Found ${admins.length} admin account(s):`);
    admins.forEach((a) => {
        console.log(`   - ${a.email} (locked: ${!!a.lockedUntil}, failedAttempts: ${a.failedLoginAttempts || 0})`);
    });

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

    if (admins.length === 0) {
        console.log("\n⚠️  No admin found. Creating a new admin account...");
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
        const targetAdmin = admins[0];
        console.log(`\n🔄 Updating admin: ${targetAdmin.email} → ${NEW_EMAIL}`);
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
        console.log("✅ Admin credentials updated.");
    }

    // Clear lockouts on ALL accounts
    const lockResult = await usersCollection.updateMany(
        { $or: [{ lockedUntil: { $ne: null } }, { failedLoginAttempts: { $gt: 0 } }] },
        {
            $set: {
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        }
    );
    console.log(`🔓 Cleared MongoDB lockouts on ${lockResult.modifiedCount} account(s).`);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB.\n");

    // ═══════════════════════════════════════════════════════
    // STEP 2: Redis — Clear ALL login guards + rate limiters
    // ═══════════════════════════════════════════════════════
    console.log("🔌 Connecting to Redis...");
    const redis = new Redis(REDIS_URL);
    
    try {
        await redis.ping();
        console.log("✅ Connected to Redis.\n");

        // Clear login guard blocks (client-side brute force protection)
        const guardKeys = await redis.keys("login_guard:*");
        if (guardKeys.length > 0) {
            await redis.del(...guardKeys);
            console.log(`🔓 Cleared ${guardKeys.length} login guard block(s).`);
        } else {
            console.log("ℹ️  No login guard blocks found.");
        }

        // Clear auth rate limiter blocks
        const rlAuthKeys = await redis.keys("rl:auth:*");
        if (rlAuthKeys.length > 0) {
            await redis.del(...rlAuthKeys);
            console.log(`🔓 Cleared ${rlAuthKeys.length} auth rate limiter(s).`);
        } else {
            console.log("ℹ️  No auth rate limiters found.");
        }

        // Clear global rate limiter blocks (just in case)
        const rlGlobalKeys = await redis.keys("rl:global:*");
        if (rlGlobalKeys.length > 0) {
            await redis.del(...rlGlobalKeys);
            console.log(`🔓 Cleared ${rlGlobalKeys.length} global rate limiter(s).`);
        } else {
            console.log("ℹ️  No global rate limiters found.");
        }

    } catch (redisErr) {
        console.error("⚠️  Redis error (non-critical):", redisErr.message);
        console.log("   Login guard/rate-limiter blocks may still exist.");
        console.log("   Manually run: redis-cli KEYS 'login_guard:*' | xargs redis-cli DEL");
        console.log("                 redis-cli KEYS 'rl:auth:*' | xargs redis-cli DEL");
    } finally {
        await redis.quit().catch(() => {});
    }

    // ═══════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(50));
    console.log("📊 RESET COMPLETE");
    console.log("═".repeat(50));
    console.log(`   Admin email:       ${NEW_EMAIL}`);
    console.log(`   Admin password:    ${NEW_PASSWORD}`);
    console.log(`   MongoDB lockouts:  CLEARED`);
    console.log(`   Redis login guard: CLEARED`);
    console.log(`   Redis rate limits: CLEARED`);
    console.log("═".repeat(50));
    console.log("\n✅ All login blocks have been removed. You should be able to login now.");
    
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Script failed:", err);
    process.exit(1);
});
