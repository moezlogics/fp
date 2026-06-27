import * as dotenv from "dotenv";
dotenv.config();
import { Redis } from "ioredis";

async function clearRateLimits() {
    const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

    // Find all rate limit keys and delete them
    const rateKeys = await redis.keys("otp_rate:*");
    const failKeys = await redis.keys("otp_fail:*");
    const cooldownKeys = await redis.keys("prime_cooldown:*");

    const allKeys = [...rateKeys, ...failKeys, ...cooldownKeys];

    if (allKeys.length > 0) {
        console.log(`Clearing ${allKeys.length} rate limit keys...`);
        await redis.del(...allKeys);
        console.log("Keys cleared successfully!");
    } else {
        console.log("No rate limit keys found.");
    }

    redis.disconnect();
}

clearRateLimits().catch(console.error);
