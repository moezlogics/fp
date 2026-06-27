import { Request, Response } from "express";
import { User, RESERVED_USERNAMES } from "../models/User";
import { Review } from "../models/Review";
import { Restaurant } from "../models/Restaurant";
import mongoose from "mongoose";

// Helper to generate a unique username
export const generateUniqueUsername = async (name: string, id: string): Promise<string> => {
    const baseName = name.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const idFragment = id.substring(id.length - 5);
    let proposedUsername = `${baseName}${idFragment}`;

    // Ensure uniqueness and not reserved
    let exists = await User.findOne({ username: proposedUsername });
    let counter = 1;
    while (exists || RESERVED_USERNAMES.has(proposedUsername)) {
        proposedUsername = `${baseName}${idFragment}${counter}`;
        exists = await User.findOne({ username: proposedUsername });
        counter++;
    }
    return proposedUsername;
};

export const checkUsernameAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username } = req.query;
        if (!username || typeof username !== "string") {
            res.status(400).json({ error: "Username query parameter is required." });
            return;
        }

        const usernameLower = username.toLowerCase().trim();

        // Validate format (alphanumeric and underscores, 3-20 chars)
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(usernameLower)) {
            res.status(200).json({
                available: false,
                message: "Username must be 3-20 characters: letters, numbers, underscores only.",
            });
            return;
        }

        // Check reserved list
        if (RESERVED_USERNAMES.has(usernameLower)) {
            res.status(200).json({ available: false, message: "This username is reserved." });
            return;
        }

        // Check DB
        const user: any = await User.findOne({ username: usernameLower }).select("_id").lean();

        // If the current user owns it, it's "available" for them
        if (user && req.user && user._id.toString() === req.user.id.toString()) {
            res.status(200).json({ available: true, message: "This is your current username." });
            return;
        }

        if (user) {
            res.status(200).json({ available: false, message: "Username is already taken." });
            return;
        }

        res.status(200).json({ available: true, message: "Username is available!" });
    } catch (error: any) {
        console.error("Error checking username:", error);
        res.status(500).json({ error: "Failed to check username availability." });
    }
};

export const checkRestaurantNameAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name } = req.query;
        if (!name || typeof name !== "string") {
            res.status(400).json({ error: "Name query parameter is required." });
            return;
        }

        const nameLower = name.toLowerCase().trim();

        if (nameLower.length < 2) {
            res.status(200).json({
                available: false,
                message: "Restaurant name must be at least 2 characters.",
            });
            return;
        }

        // Check Restaurant collection using lean for speed
        const existingRestaurant: any = await Restaurant.findOne({
            $or: [
                { name: { $regex: new RegExp(`^${nameLower}$`, "i") } },
                { brandName: { $regex: new RegExp(`^${nameLower}$`, "i") } },
            ],
        }).select("_id").lean();

        if (existingRestaurant) {
            res.status(200).json({ available: false, message: "This restaurant name is already taken." });
            return;
        }

        // Check if an owner is currently claiming it but restaurant not yet approved
        const existingOwner: any = await User.findOne({
            role: "owner",
            businessName: { $regex: new RegExp(`^${nameLower}$`, "i") },
        }).select("_id").lean();

        if (existingOwner && req.user && existingOwner._id.toString() === req.user.id.toString()) {
            res.status(200).json({ available: true, message: "This is your current restaurant name." });
            return;
        }

        if (existingOwner) {
            res.status(200).json({ available: false, message: "This restaurant name is currently being claimed." });
            return;
        }

        res.status(200).json({ available: true, message: "Restaurant name is available!" });
    } catch (error: any) {
        console.error("Error checking restaurant name:", error);
        res.status(500).json({ error: "Failed to check restaurant name availability." });
    }
};

export const getPublicProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username } = req.params;

        if (!username) {
            res.status(400).json({ error: "Username is required." });
            return;
        }

        const usernameStr = Array.isArray(username) ? username[0] : username;
        const usernameLower = usernameStr.toLowerCase().trim();
        const user = await User.findOne({ username: usernameLower });

        if (!user) {
            res.status(404).json({ error: "User not found." });
            return;
        }

        if (!user.isPublicProfile) {
            res.status(403).json({ error: "This profile is private." });
            return;
        }

        // Fetch user's recent reviews with proper field names
        let recentReviews: any[] = [];
        try {
            recentReviews = await Review.find({ userId: user._id })
                .populate("restaurantId", "brandName branchName name coverImage slug city area")
                .sort({ createdAt: -1 })
                .limit(10)
                .select("overallRating text photos createdAt restaurantId foodRating ambianceRating serviceRating")
                .lean();

            // Map to consistent format
            recentReviews = recentReviews.map((r: any) => ({
                _id: r._id,
                rating: r.overallRating || r.foodRating || 0,
                text: r.text,
                photos: r.photos || [],
                createdAt: r.createdAt,
                restaurant: r.restaurantId ? {
                    _id: r.restaurantId._id,
                    name: r.restaurantId.name || r.restaurantId.brandName,
                    coverImage: r.restaurantId.coverImage,
                    slug: r.restaurantId.slug,
                    location: {
                        address: r.restaurantId.area || r.restaurantId.city || "",
                    },
                } : null,
            }));
        } catch (e) {
            console.log("Could not fetch reviews:", e);
        }

        // Fetch followed restaurants
        let followedRestaurants: any[] = [];
        try {
            followedRestaurants = await Restaurant.find({
                _id: { $in: user.followedRestaurants || [] },
                isActive: true,
            })
                .select("brandName branchName name coverImage slug city area cuisines averageRating followersCount")
                .lean();

            followedRestaurants = followedRestaurants.map((r: any) => ({
                _id: r._id,
                name: r.name || r.brandName,
                coverImage: r.coverImage,
                slug: r.slug,
                category: r.cuisines?.[0] || "Restaurant",
                averageRating: r.averageRating || 0,
                followersCount: r.followersCount || 0,
                location: { area: r.area || r.city },
            }));
        } catch (e) {
            console.log("Could not fetch followed restaurants:", e);
        }

        // Fetch saved/favorite restaurants (for public display)
        let savedRestaurants: any[] = [];
        try {
            savedRestaurants = await Restaurant.find({
                _id: { $in: user.savedRestaurants || [] },
                isActive: true,
            })
                .select("brandName branchName name coverImage slug city area cuisines averageRating")
                .lean();

            savedRestaurants = savedRestaurants.map((r: any) => ({
                _id: r._id,
                name: r.name || r.brandName,
                coverImage: r.coverImage,
                slug: r.slug,
                category: r.cuisines?.[0] || "Restaurant",
                averageRating: r.averageRating || 0,
                followersCount: r.followersCount || 0,
                location: { area: r.area || r.city },
            }));
        } catch (e) {
            console.log("Could not fetch saved restaurants:", e);
        }

        // Calculate profile completeness score
        let completenessPoints = 0;
        if (user.name) completenessPoints += 15;
        if (user.avatar) completenessPoints += 20;
        if (user.bio) completenessPoints += 15;
        if (user.phone) completenessPoints += 10;
        if (user.city) completenessPoints += 10;
        if (user.username) completenessPoints += 10;
        if (user.socialLinks && Object.values(user.socialLinks).some(v => v)) completenessPoints += 10;
        if ((user.reviewCount || 0) > 0) completenessPoints += 10;

        // Prepare public data
        const publicProfileData = {
            id: user._id,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            bio: user.bio,
            socialLinks: user.socialLinks,
            dietaryPreferences: (user as any).dietaryPreferences || [],
            favoriteCuisines: (user as any).favoriteCuisines || [],
            stats: {
                foodieLevel: user.foodieLevel || 1,
                reviewCount: user.reviewCount || 0,
                photoCount: user.photoCount || 0,
                followingCount: user.followedRestaurants?.length || 0,
                followersCount: 0, // User-to-user following not yet implemented
                savedCount: user.savedRestaurants?.length || 0,
                completenessScore: Math.min(100, completenessPoints),
            },
            badges: user.badges || [],
            recentReviews,
            followedRestaurants,
            savedRestaurants,
            joinedAt: (user as any).createdAt,
        };

        res.status(200).json(publicProfileData);
    } catch (error: any) {
        console.error("Error fetching public profile:", error);
        res.status(500).json({ error: "Failed to fetch public profile." });
    }
};

export const updateProfileSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const {
            username, bio, socialLinks, isPublicProfile,
            dietaryPreferences, favoriteCuisines,
            notificationPreferences, themePreference,
        } = req.body;

        const updateData: any = {};

        if (username !== undefined) {
            const usernameLower = username.toLowerCase().trim();
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(usernameLower)) {
                res.status(400).json({ error: "Username must be 3-20 characters: letters, numbers, underscores only." });
                return;
            }
            if (RESERVED_USERNAMES.has(usernameLower)) {
                res.status(400).json({ error: "This username is reserved." });
                return;
            }
            const existing: any = await User.findOne({ username: usernameLower }).select("_id").lean();
            if (existing && existing._id.toString() !== userId.toString()) {
                res.status(400).json({ error: "Username is already taken." });
                return;
            }
            updateData.username = usernameLower;
        }

        if (bio !== undefined) {
            if (bio.length > 160) {
                res.status(400).json({ error: "Bio cannot exceed 160 characters." });
                return;
            }
            updateData.bio = bio;
        }

        if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
        if (isPublicProfile !== undefined) updateData.isPublicProfile = typeof isPublicProfile === "string" ? isPublicProfile === "true" : Boolean(isPublicProfile);

        // New community fields
        if (dietaryPreferences !== undefined) {
            updateData.dietaryPreferences = Array.isArray(dietaryPreferences) ? dietaryPreferences.slice(0, 5) : [];
        }
        if (favoriteCuisines !== undefined) {
            updateData.favoriteCuisines = Array.isArray(favoriteCuisines) ? favoriteCuisines.slice(0, 10) : [];
        }
        if (notificationPreferences !== undefined) {
            updateData.notificationPreferences = {
                deals: notificationPreferences.deals !== false,
                stories: notificationPreferences.stories !== false,
                reviews: notificationPreferences.reviews !== false,
            };
        }
        if (themePreference !== undefined && ["light", "dark", "system"].includes(themePreference)) {
            updateData.themePreference = themePreference;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true })
            .select("-password -refreshToken -oldRefreshToken -oldRefreshTokenExpiresAt");

        res.status(200).json({
            message: "Profile updated successfully.",
            user: {
                username: updatedUser?.username,
                bio: updatedUser?.bio,
                socialLinks: updatedUser?.socialLinks,
                isPublicProfile: updatedUser?.isPublicProfile,
                dietaryPreferences: (updatedUser as any)?.dietaryPreferences,
                favoriteCuisines: (updatedUser as any)?.favoriteCuisines,
                notificationPreferences: (updatedUser as any)?.notificationPreferences,
                themePreference: (updatedUser as any)?.themePreference,
            },
        });
    } catch (error: any) {
        console.error("Error updating profile settings:", error);
        res.status(500).json({ error: "Failed to update profile settings." });
    }
};


