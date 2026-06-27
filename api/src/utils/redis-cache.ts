import { redis } from "../config/redis";

/**
 * withRedisCache — High-performance caching wrapper with Fail-Soft support.
 * If Redis is unavailable, it seamlessly falls back to the database.
 * 
 * @param key Cache key
 * @param ttlSeconds Time-to-live in seconds
 * @param fetcher Async function to fetch data from source (DB)
 */
export async function withRedisCache<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
): Promise<T> {
    try {
        // 1. Attempt to fetch from Redis
        const cached = await redis.get(key);
        if (cached) {
            return JSON.parse(cached) as T;
        }
    } catch (err) {
        // Fail-soft: Log error and fall back to fetcher
        console.warn(`[Redis Cache] GET Error for key ${key}:`, err);
    }

    // 2. Fetch from source (DB)
    const data = await fetcher();

    // 3. Incrementally update Redis (don't await to keep response fast)
    if (data) {
        redis.set(key, JSON.stringify(data), "EX", ttlSeconds).catch((err) => {
            console.warn(`[Redis Cache] SET Error for key ${key}:`, err);
        });
    }

    return data;
}

/**
 * invalidateCache — Purges specific keys or patterns
 */
export async function invalidateCache(key: string): Promise<void> {
    try {
        await redis.del(key);
    } catch (err) {
        console.warn(`[Redis Cache] DEL Error for key ${key}:`, err);
    }
}
