import express from "express";
import { getPublicProfile, checkUsernameAvailability, checkRestaurantNameAvailability, updateProfileSettings } from "../../controllers/ProfileController";
import { authenticate } from "../../middleware/authenticate";

const router = express.Router();

/**
 * @route   GET /api/v1/profiles/check
 * @desc    Check if a username is available
 * @access  Public
 */
router.get("/check", checkUsernameAvailability);

/**
 * @route   GET /api/v1/profiles/check-restaurant-name
 * @desc    Check if a restaurant name is available during owner account creation
 * @access  Public
 */
router.get("/check-restaurant-name", checkRestaurantNameAvailability);

/**
 * @route   GET /api/v1/profiles/:username
 * @desc    Get a user's public profile
 * @access  Public
 */
router.get("/:username", getPublicProfile);

/**
 * @route   PUT /api/v1/profiles/settings
 * @desc    Update public profile settings (username, bio, visibility)
 * @access  Private
 */
router.put("/settings", authenticate, updateProfileSettings);

export default router;
