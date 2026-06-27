import dotenv from "dotenv";
dotenv.config();

import { Redis } from "ioredis";

async function run() {
    try {
        const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
        console.log("Connecting to Redis:", redisUrl);
        const redis = new Redis(redisUrl);

        console.log("Flushing all keys in Redis cache...");
        const result = await redis.flushall();
        console.log(`✅ Redis Flushed successfully: ${result}`);

        redis.disconnect();
        process.exit(0);
    } catch (err: any) {
        console.error("❌ Redis Flush Error:", err.message);
        process.exit(1);
    }
}

run();
