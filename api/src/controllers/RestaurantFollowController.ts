import { Request, Response } from "express";
import { User } from "../models/User";
import { Restaurant } from "../models/Restaurant";
import { redis } from "../config/redis";

/**
 * Anti-spam: Rate-limit follow toggles.
 * Max 1 toggle per restaurant per 3 seconds per user.
 * Max 30 follow toggles per minute globally per user.
 */
async function checkFollowRateLimit(userId: string, restaurantId: string): Promise<string | null> {
    try {
        // Per-restaurant cooldown (3 seconds)
        const perRestKey = `follow:cd:${userId}:${restaurantId}`;
        const existing = await redis.get(perRestKey);
        if (existing) return "Please wait a few seconds before toggling again.";

        // Global per-minute limit (30 actions)
        const globalKey = `follow:global:${userId}`;
        const count = await redis.incr(globalKey);
        if (count === 1) await redis.expire(globalKey, 60);
        if (count > 30) return "Too many follow actions. Please wait a minute.";

        // Set per-restaurant cooldown
        await redis.set(perRestKey, "1", "EX", 3);
        return null;
    } catch {
        // If Redis is down, allow the action (graceful degradation)
        return null;
    }
}

export const toggleFollowRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const restaurantId = id as string;

        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        // Anti-spam rate limit
        const rateLimitMsg = await checkFollowRateLimit(userId, restaurantId);
        if (rateLimitMsg) {
            res.status(429).json({ error: rateLimitMsg });
            return;
        }

        const restaurant = await Restaurant.findById(restaurantId).select("_id followersCount") as any;
        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found." });
            return;
        }

        const user = await User.findById(userId).select("followedRestaurants") as any;
        if (!user) {
            res.status(404).json({ error: "User not found." });
            return;
        }

        const isFollowing = user.followedRestaurants.some(
            (id: any) => id.toString() === restaurantId
        );

        if (isFollowing) {
            // Unfollow — atomic operations
            await Promise.all([
                User.updateOne(
                    { _id: userId },
                    { $pull: { followedRestaurants: restaurantId } }
                ),
                Restaurant.updateOne(
                    { _id: restaurantId, followersCount: { $gt: 0 } },
                    { $inc: { followersCount: -1 } }
                ),
            ]);

            // Get fresh count
            const updated = await Restaurant.findById(restaurantId).select("followersCount").lean() as any;

            res.status(200).json({
                message: "Unfollowed successfully",
                isFollowing: false,
                followersCount: Math.max(0, updated?.followersCount || 0),
            });
        } else {
            // Follow — atomic operations, prevent duplicates
            await Promise.all([
                User.updateOne(
                    { _id: userId },
                    { $addToSet: { followedRestaurants: restaurantId } }
                ),
                Restaurant.updateOne(
                    { _id: restaurantId },
                    { $inc: { followersCount: 1 } }
                ),
            ]);

            // Get fresh count
            const updated = await Restaurant.findById(restaurantId).select("followersCount").lean() as any;

            res.status(200).json({
                message: "Followed successfully",
                isFollowing: true,
                followersCount: updated?.followersCount || 0,
            });
        }
    } catch (error: any) {
        console.error("Error toggling restaurant follow:", error);
        res.status(500).json({ error: "Failed to update follow status." });
    }
};

export const checkFollowStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const restaurantId = id as string;

        if (!userId) {
            res.status(200).json({ isFollowing: false });
            return;
        }

        const user = await User.findById(userId).select("followedRestaurants").lean() as any;
        if (!user) {
            res.status(200).json({ isFollowing: false });
            return;
        }

        const isFollowing = (user.followedRestaurants || []).some(
            (id: any) => id.toString() === restaurantId
        );

        // Get current followers count
        const restaurant = await Restaurant.findById(restaurantId).select("followersCount").lean() as any;

        res.status(200).json({
            isFollowing,
            followersCount: restaurant?.followersCount || 0,
        });
    } catch (error: any) {
        console.error("Error checking follow status:", error);
        res.status(500).json({ error: "Failed to check follow status." });
    }
};
