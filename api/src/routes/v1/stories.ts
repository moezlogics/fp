import { Router } from "express";
import { authenticate as requireAuth } from "../../middleware/authenticate";
import multer from "multer";
import { Story } from "../../models/Story";
import { Restaurant } from "../../models/Restaurant";
import { User } from "../../models/User";
import { cdnClient } from "../../services/cdn-client";
import mongoose from "mongoose";

const router = Router();

// Memory storage for multer (buffer to upload directly to CDN)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024, // 20 MB max file
    },
});

// POST /api/v1/stories
// Owner creates a story
router.post("/", requireAuth, upload.single("media"), async (req: any, res: any) => {
    try {
        const { restaurantId, caption, mediaType } = req.body;
        const file = req.file;

        if (!restaurantId || !mediaType || !file) {
            return res.status(400).json({ error: "Missing required fields: restaurantId, mediaType, or file" });
        }

        // Verify that user is owner of the restaurant
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ error: "Restaurant not found" });
        }

        if (restaurant.ownerId.toString() !== req.user.id) {
            return res.status(403).json({ error: "Forbidden: You are not the owner of this restaurant" });
        }
        
        let cdnType = "image";
        if (mediaType === "video") cdnType = "video";

        // Upload to CDN
        const cdnRes = await cdnClient.uploadImage(file.buffer, file.originalname, `restaurants/${restaurant.slug}/stories`);
        if (!cdnRes || !cdnRes.url) {
            return res.status(500).json({ error: "Failed to upload media to CDN" });
        }
        const cdnUrl = cdnRes.url;

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        const story = new Story({
            restaurantId: restaurant._id,
            ownerId: req.user.id,
            mediaUrl: cdnUrl,
            mediaType,
            caption: caption || "",
            expiresAt,
        });

        await story.save();

        res.status(201).json({ success: true, story });
    } catch (error) {
        console.error("Story creation error:", error);
        res.status(500).json({ error: "Failed to create story" });
    }
});

// GET /api/v1/stories/restaurant/:restaurantId
// Get active stories for a specific restaurant
router.get("/restaurant/:restaurantId", async (req: any, res: any) => {
    try {
        const stories = await Story.find({
            restaurantId: req.params.restaurantId,
            expiresAt: { $gt: new Date() },
        }).sort({ createdAt: 1 });

        res.json({ success: true, stories });
    } catch (error) {
        console.error("Fetch stories error:", error);
        res.status(500).json({ error: "Failed to fetch stories" });
    }
});

// GET /api/v1/stories/feed
// Get feed of stories for restaurants the logged-in user follows
router.get("/feed", requireAuth, async (req: any, res: any) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.followedRestaurants) {
            return res.json({ success: true, feed: [] });
        }

        // Group active stories by restaurantId
        const activeStories = await Story.find({
            restaurantId: { $in: user.followedRestaurants },
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: 1 }).populate("restaurantId", "name slug brandName logoUrl");

        const grouped = activeStories.reduce((acc: any, story: any) => {
            const rId = story.restaurantId._id.toString();
            if (!acc[rId]) {
                acc[rId] = { restaurant: story.restaurantId, stories: [] };
            }
            acc[rId].stories.push({
                _id: story._id,
                mediaUrl: story.mediaUrl,
                mediaType: story.mediaType,
                thumbnailUrl: story.thumbnailUrl,
                caption: story.caption,
                createdAt: story.createdAt,
            });
            return acc;
        }, {});

        res.json({ success: true, feed: Object.values(grouped) });
    } catch (error) {
        console.error("Fetch feed error:", error);
        res.status(500).json({ error: "Failed to fetch stories feed" });
    }
});

// POST /api/v1/stories/:storyId/view
// Record a view
router.post("/:storyId/view", requireAuth, async (req: any, res: any) => {
    try {
        const storyId = req.params.storyId;
        const result = await Story.updateOne(
            { _id: storyId, viewers: { $ne: req.user.id } },
            { 
               $addToSet: { viewers: req.user.id },
               $inc: { viewsCount: 1 } 
            }
        );

        res.json({ success: true, recorded: result.modifiedCount > 0 });
    } catch (error) {
         console.error("View story error:", error);
         res.status(500).json({ error: "Failed to view story" });
    }
});

// POST /api/v1/stories/:storyId/like
router.post("/:storyId/like", requireAuth, async (req: any, res: any) => {
    try {
        const storyId = req.params.storyId;
        const story: any = await Story.findById(storyId);
        
        if (!story) return res.status(404).json({ error: "Story not found" });

        const hasLiked = story.likes.includes(req.user.id);
        
        if (hasLiked) {
            await Story.updateOne(
                { _id: storyId },
                { $pull: { likes: req.user.id }, $inc: { likesCount: -1 } }
            );
        } else {
            await Story.updateOne(
                { _id: storyId },
                { $addToSet: { likes: req.user.id }, $inc: { likesCount: 1 } }
            );
        }

        res.json({ success: true, liked: !hasLiked });
    } catch (error) {
         console.error("Like story error:", error);
         res.status(500).json({ error: "Failed to toggle like on story" });
    }
});

// GET /api/v1/stories/owner/my-stories
// Owner sees their active stories
router.get("/owner/my-stories/:restaurantId", requireAuth, async (req: any, res: any) => {
    try {
         const restaurant = await Restaurant.findById(req.params.restaurantId);
         if (!restaurant || restaurant.ownerId.toString() !== req.user.id) {
             return res.status(403).json({ error: "Forbidden" });
         }

         const stories = await Story.find({
            restaurantId: restaurant._id,
            expiresAt: { $gt: new Date() }
         }).sort({ createdAt: -1 });

         res.json({ success: true, stories });
    } catch (error) {
         console.error("Owner fetch stories error:", error);
         res.status(500).json({ error: "Failed to fetch owner stories" });
    }
});

// DELETE /api/v1/stories/:storyId
// Owner deletes their story
router.delete("/:storyId", requireAuth, async (req: any, res: any) => {
    try {
        const story = await Story.findById(req.params.storyId);
        if (!story) return res.status(404).json({ error: "Story not found" });

        if (story.ownerId.toString() !== req.user.id) {
             return res.status(403).json({ error: "Forbidden" });
        }

        // Try soft-deleting from CDN
        try {
            await cdnClient.deleteImage(story.mediaUrl);
        } catch (e) {
            console.warn("Soft delete check warning - could not delete from CDN", e);
        }

        await story.deleteOne();
        res.json({ success: true });
    } catch (error) {
        console.error("Delete story error:", error);
        res.status(500).json({ error: "Failed to delete story" });
    }
});

export default router;
