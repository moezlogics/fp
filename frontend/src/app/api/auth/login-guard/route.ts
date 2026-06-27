/**
 * Login Guard — Redis-backed Brute-Force Protection
 *
 * POST /api/auth/login-guard
 *
 * Actions:
 *   { action: "check",  loginType: "user"|"admin"|"owner" }
 *   { action: "fail",   loginType: "user"|"admin"|"owner" }
 *   { action: "reset",  loginType: "user"|"admin"|"owner" }
 *
 * Architecture:
 * - Redis-backed store keyed by "login_guard:<IP>:<loginType>"
 * - 5 failed attempts → block for 24 hours
 * - Shared across instances/process restarts
 * - Supports user, admin, and owner login portals
 */

import { NextRequest, NextResponse } from "next/server";

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

type LoginType = "user" | "admin" | "owner";

interface RateLimitEntry {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

function getRedisUrl(): string {
  return (
    process.env.REDIS_URL || process.env.KV_URL || "redis://127.0.0.1:6379"
  );
}

function getRedisKey(ip: string, loginType: LoginType): string {
  return `login_guard:${ip}:${loginType}`;
}

async function readEntry(key: string): Promise<RateLimitEntry> {
  const redisUrl = getRedisUrl();

  const { default: Redis } = await import("ioredis");
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    const raw = await redis.get(key);

    if (!raw) {
      return {
        count: 0,
        firstAttemptAt: Date.now(),
        blockedUntil: null,
      };
    }

    const parsed = JSON.parse(raw) as Partial<RateLimitEntry>;
    const now = Date.now();

    if (
      typeof parsed.blockedUntil === "number" &&
      parsed.blockedUntil !== null &&
      parsed.blockedUntil < now
    ) {
      await redis.del(key);
      return {
        count: 0,
        firstAttemptAt: now,
        blockedUntil: null,
      };
    }

    return {
      count: typeof parsed.count === "number" ? parsed.count : 0,
      firstAttemptAt:
        typeof parsed.firstAttemptAt === "number" ? parsed.firstAttemptAt : now,
      blockedUntil:
        typeof parsed.blockedUntil === "number" ? parsed.blockedUntil : null,
    };
  } finally {
    await redis.quit().catch(() => {});
  }
}

async function writeEntry(key: string, entry: RateLimitEntry): Promise<void> {
  const redisUrl = getRedisUrl();

  const { default: Redis } = await import("ioredis");
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  try {
    await redis.connect();

    const ttlSeconds = entry.blockedUntil
      ? Math.max(1, Math.ceil((entry.blockedUntil - Date.now()) / 1000))
      : 25 * 60 * 60; // keep stale failures for up to 25 hours

    await redis.set(key, JSON.stringify(entry), "EX", ttlSeconds);
  } finally {
    await redis.quit().catch(() => {});
  }
}

async function deleteEntry(key: string): Promise<void> {
  const redisUrl = getRedisUrl();

  const { default: Redis } = await import("ioredis");
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    await redis.del(key);
  } finally {
    await redis.quit().catch(() => {});
  }
}

function buildResponse(entry: RateLimitEntry) {
  const blocked =
    entry.blockedUntil !== null && entry.blockedUntil > Date.now();

  return {
    blocked,
    attemptsRemaining: blocked ? 0 : Math.max(0, MAX_ATTEMPTS - entry.count),
    blockedUntil: blocked
      ? new Date(entry.blockedUntil as number).toISOString()
      : null,
    totalAttempts: entry.count,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, loginType } = body as {
      action?: string;
      loginType?: LoginType;
    };

    if (!action || !loginType) {
      return NextResponse.json(
        { error: "Missing action or loginType" },
        { status: 400 },
      );
    }

    if (!["user", "admin", "owner"].includes(loginType)) {
      return NextResponse.json({ error: "Invalid loginType" }, { status: 400 });
    }

    const ip = getClientIP(req);
    const key = getRedisKey(ip, loginType);

    switch (action) {
      case "check": {
        const entry = await readEntry(key);
        return NextResponse.json(buildResponse(entry));
      }

      case "fail": {
        const entry = await readEntry(key);

        if (entry.blockedUntil !== null && entry.blockedUntil > Date.now()) {
          return NextResponse.json(buildResponse(entry));
        }

        entry.count += 1;

        if (entry.count >= MAX_ATTEMPTS) {
          entry.blockedUntil = Date.now() + BLOCK_DURATION_MS;
          console.warn(
            `[LoginGuard] IP ${ip} BLOCKED for loginType=${loginType} after ${entry.count} failed attempts.`,
          );
        }

        await writeEntry(key, entry);
        return NextResponse.json(buildResponse(entry));
      }

      case "reset": {
        await deleteEntry(key);
        return NextResponse.json({
          blocked: false,
          attemptsRemaining: MAX_ATTEMPTS,
          blockedUntil: null,
          totalAttempts: 0,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[LoginGuard] Error:", error?.message || error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
