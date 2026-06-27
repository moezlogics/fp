import "server-only";
import Redis from "ioredis";

// Ensure a single redis connection instance to prevent connection leaks
const globalForRedis = global as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying
      return Math.min(times * 50, 2000);
    },
  });

redis.on("error", (error) => {
  // Swallow background Redis connection errors to prevent unhandled process crashes
  console.warn("[Redis] Connection error:", error.message);
});

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

/**
 * Checks redis for cached data. Implements Stale-While-Revalidate pattern.
 * If data is stale (remaining TTL < staleTolerance), it serves the stale data instantly
 * and triggers a background fetch to update the cache.
 */
export async function withRedisCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 3600,
  staleTolerance: number = 1800 // Serve stale for up to 30 min while refreshing
): Promise<T> {
  try {
    if (redis.status === "ready") {
      const [cached, ttlInfo] = await Promise.all([
        redis.get(key),
        redis.ttl(key)
      ]);

      if (cached) {
        // If remaining TTL is less than stale tolerance, trigger a background refresh
        if (ttlInfo !== -1 && ttlInfo < staleTolerance && ttlInfo > 0) {
          fetcher()
            .then(async (freshData) => {
              if (freshData !== undefined && redis.status === "ready") {
                await redis.setex(key, ttlSeconds, JSON.stringify(freshData));
              }
            })
            .catch((e) => console.error(`[Redis] Background refresh error for ${key}:`, e));
        }

        return JSON.parse(cached) as T;
      }
    }
  } catch (error) {
    console.error(`[Redis] Error getting key ${key}:`, error);
  }

  // Cache miss -> fetch synchronously
  const data = await fetcher();

  if (data !== undefined) {
    try {
      if (redis.status === "ready") {
        await redis.setex(key, ttlSeconds, JSON.stringify(data));
      }
    } catch (error) {
      console.error(`[Redis] Error setting key ${key}:`, error);
    }
  }

  return data;
}
