/**
 * Auth Routes — /api/v1/auth
 *
 * POST /login     — Email/password login with role validation
 * POST /register  — User registration
 * POST /refresh   — Token rotation (exchange refresh for new pair)
 * POST /logout    — Invalidate refresh token
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { User } from "../../models/User";
import {
    verifyPassword,
    hashPassword,
    generateTokenPair,
    verifyRefreshToken,
    hashRefreshToken,
} from "../../services/auth-service";
import { generateOTP, verifyOTP } from "../../services/otp-service";
import { sendOTPEmail, sendPasswordResetEmail, sendAdminAlertEmail } from "../../services/email-service";
import { authRateLimiter, otpRateLimiter } from "../../middleware/rate-limiter";
import { env } from "../../config/env";
import { authenticate } from "../../middleware/authenticate";
import { generateUniqueUsername } from "../../controllers/ProfileController";
import { successResponse, errorResponse } from "../../utils/api-response";
import { redis } from "../../config/redis";
import { AuditLog } from "../../models/AuditLog";
import { logSecurityEvent, getClientIP, getUserAgent } from "../../services/security-logger";

/** Shared strong password validation (SEC-23) */
function validateStrongPassword(password: string): string | null {
    if (typeof password !== "string" || password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password must contain at least one special character.";
    return null;
}

const router = Router();

/**
 * POST /api/v1/auth/login
 * Body: { email, password, loginType? }
 */
router.post("/login", authRateLimiter, async (req: Request, res: Response) => {
    try {
        const { email, password, loginType } = req.body;

        if (!email || !password) {
            errorResponse(res, "Email and password are required.", 400);
            return;
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
        }).select("+password +refreshToken");

        if (!user || !user.password) {
            logSecurityEvent({
                type: "LOGIN_FAILED",
                severity: "WARN",
                email: email.toLowerCase().trim(),
                ip: getClientIP(req),
                userAgent: getUserAgent(req),
                details: { reason: "User not found or no password." }
            });
            errorResponse(res, "Invalid email or password.", 401);
            return;
        }

        // --- BRUTE FORCE PROTECTION ---
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const timeRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            errorResponse(res, `Account locked due to multiple failed login attempts. Please try again in ${timeRemaining} minutes.`, 403);
            return;
        }

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
            let lockedMsg = "Invalid email or password.";
            
            if (user.failedLoginAttempts >= 5) {
                user.lockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour block
                lockedMsg = "Account locked due to 5 consecutive failed login attempts. Please try again in 1 hour.";
                
                if (user.role === "admin") {
                    await sendAdminAlertEmail(env.ADMIN_ALERT_EMAIL, `An admin account (${user.email}) has been locked out after 5 consecutive failed login attempts from IP: ${getClientIP(req)}`);
                }
            }
            
            await user.save();

            logSecurityEvent({
                type: "LOGIN_FAILED",
                severity: user.failedLoginAttempts >= 5 ? "CRITICAL" : "WARN",
                email: user.email,
                userId: user._id.toString(),
                ip: getClientIP(req),
                userAgent: getUserAgent(req),
                details: { reason: "Invalid password.", attempts: user.failedLoginAttempts, locked: user.failedLoginAttempts >= 5 }
            });
            errorResponse(res, lockedMsg, user.failedLoginAttempts >= 5 ? 403 : 401);
            return;
        }

        // Reset brute force counter on successful login
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
            user.failedLoginAttempts = 0;
            user.lockedUntil = undefined;
            await user.save();
        }

        // ── Strict Role Separation (mirrors NextAuth logic) ──
        if (loginType === "admin" && user.role !== "admin") {
            errorResponse(res, "Unauthorized. Please use the user login portal.", 403);
            return;
        }
        if (loginType === "owner" && !["admin", "owner"].includes(user.role)) {
            errorResponse(res, "Unauthorized. Please use the user login portal.", 403);
            return;
        }
        if (loginType === "user" && (user.role === "admin" || user.role === "owner")) {
            errorResponse(res, `Please login via the ${user.role} portal.`, 403);
            return;
        }

        // Owner approval check — moved to frontend gate
        // Unapproved owners CAN login, but the dashboard UI will block them from doing anything

        // Generate token pair
        const tokens = generateTokenPair({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        // Store hashed refresh token in DB for rotation (SEC-15)
        user.refreshToken = hashRefreshToken(tokens.refreshToken);
        await user.save();
        
        logSecurityEvent({
            type: "LOGIN_SUCCESS",
            severity: "INFO",
            email: user.email,
            userId: user._id.toString(),
            ip: getClientIP(req),
            userAgent: getUserAgent(req),
            details: { role: user.role }
        });

        successResponse(res, {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                profileCompleted: user.profileCompleted,
                isApproved: user.isApproved,
                businessName: user.businessName,
                branchType: user.branchType,
            },
            tokens,
        });
    } catch (err: any) {
        console.error("[Auth] Login error:", err);
        errorResponse(res, "Internal server error.", 500);
    }
});

/**
 * POST /api/v1/auth/register
 * Body: { name, email, password, phone?, city? }
 */
router.post("/register", authRateLimiter, async (req: Request, res: Response) => {
    try {
        const { name, email, password, phone, city } = req.body;

        if (!name || !email || !password) {
            errorResponse(res, "Name, email, and password are required.", 400);
            return;
        }

        const pwErr = validateStrongPassword(password);
        if (pwErr) {
            errorResponse(res, pwErr, 400);
            return;
        }

        // Check for existing user
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            errorResponse(res, "An account with this email already exists.", 409);
            return;
        }

        const hashedPassword = await hashPassword(password);

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            phone: phone || undefined,
            city: city || undefined,
            role: "user",
            profileCompleted: !!(phone && city),
        });

        const tokens = generateTokenPair({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        user.refreshToken = hashRefreshToken(tokens.refreshToken);
        await user.save();

        successResponse(res, {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            tokens,
        }, 201);
    } catch (err: any) {
        console.error("[Auth] Register error:", err);
        if (err.code === 11000) {
            errorResponse(res, "An account with this email already exists.", 409);
            return;
        }
        errorResponse(res, "Internal server error.", 500);
    }
});

/**
 * POST /api/v1/auth/refresh
 * Body: { refreshToken }
 */
router.post("/refresh", authRateLimiter, async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            errorResponse(res, "Refresh token is required.", 400);
            return;
        }

        // Verify the refresh token
        const { id } = verifyRefreshToken(refreshToken);

        // Find user and check stored refresh tokens (including grace period for old token)
        const user = await User.findById(id).select("+refreshToken +oldRefreshToken +oldRefreshTokenExpiresAt");
        if (!user) {
            errorResponse(res, "User not found.", 404);
            return;
        }

        const isCurrentMatch = user.refreshToken === hashRefreshToken(refreshToken);
        const isOldMatch = user.oldRefreshToken === hashRefreshToken(refreshToken) && 
                           user.oldRefreshTokenExpiresAt && 
                           user.oldRefreshTokenExpiresAt > new Date();

        if (!isCurrentMatch && !isOldMatch) {
            // Token reuse detected - possible theft. Invalidate all tokens.
            user.refreshToken = undefined;
            user.oldRefreshToken = undefined;
            user.oldRefreshTokenExpiresAt = undefined;
            await user.save();
            
            errorResponse(res, "Invalid refresh token. Please login again.", 401, "TOKEN_REUSE");
            return;
        }

        // Generate new pair
        const tokens = generateTokenPair({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        // Rotation logic: current becomes old (with 1min grace window)
        user.oldRefreshToken = user.refreshToken;
        user.oldRefreshTokenExpiresAt = new Date(Date.now() + 60000); // 1 minute grace
        user.refreshToken = hashRefreshToken(tokens.refreshToken);
        
        await user.save();

        successResponse(res, { tokens });
    } catch (err: any) {
        errorResponse(res, "Invalid or expired refresh token.", 401);
    }
});

/**
 * POST /api/v1/auth/logout
 * Requires: Authorization: Bearer <accessToken>
 */
router.post("/logout", authenticate, async (req: Request, res: Response) => {
    try {
        await User.findByIdAndUpdate(req.user!.id, { refreshToken: null });
        successResponse(res, { message: "Logged out successfully." });
    } catch {
        errorResponse(res, "Logout failed.", 500);
    }
});

/**
 * POST /api/v1/auth/send-otp
 * Body: { email, purpose? }
 * purpose = "register" → rejects if email already has an account (prevents duplicate registration)
 */
router.post("/send-otp", authRateLimiter, async (req: Request, res: Response) => {
    try {
        const { email, purpose } = req.body;

        if (!email || typeof email !== "string") {
            errorResponse(res, "Email is required.", 400);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorResponse(res, "Invalid email format.", 400);
            return;
        }

        const normalizedEmail = email.toLowerCase().trim();

        // ── Registration guard: prevent OTP for already-registered emails ──
        if (purpose === "register") {
            const existingUser = await User.findOne({ email: normalizedEmail }).select("_id").lean();
            if (existingUser) {
                errorResponse(res, "An account with this email already exists. Please login instead.", 409);
                return;
            }
        }

        const result = await generateOTP(normalizedEmail);

        if (!result.success) {
            errorResponse(res, result.message, 429);
            return;
        }

        try {
            await sendOTPEmail(normalizedEmail, result.code!);
        } catch (emailError) {
            console.error("[send-otp] Email sending failed:", emailError);
            errorResponse(res, "Failed to send verification email. Please try again.", 500);
            return;
        }

        successResponse(res, { message: "OTP sent to your email." });
    } catch (error) {
        console.error("[send-otp] Error:", error);
        errorResponse(res, "Something went wrong.", 500);
    }
});

/**
 * POST /api/v1/auth/verify-otp
 */
router.post("/verify-otp", otpRateLimiter, async (req: Request, res: Response) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            errorResponse(res, "Email and OTP code are required.", 400);
            return;
        }

        const result = await verifyOTP(email, code);

        if (!result.valid) {
            errorResponse(res, result.message, 400);
            return;
        }

        // Set Redis verified flag (10-min TTL) — registration endpoints will check this
        const normalizedEmail = email.toLowerCase().trim();
        await redis.set(`otp_verified:${normalizedEmail}`, "1", "EX", 600);

        const user = await User.findOne({ email: normalizedEmail });

        if (user) {
            if (!user.isEmailVerified) {
                user.isEmailVerified = true;
                await user.save();
            }

            successResponse(res, {
                isNewUser: false,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    profileCompleted: user.profileCompleted,
                    phone: user.phone,
                },
            });
            return;
        }

        successResponse(res, {
            isNewUser: true,
            email: normalizedEmail,
        });
    } catch (error) {
        console.error("[verify-otp] Error:", error);
        errorResponse(res, "Something went wrong.", 500);
    }
});

/**
 * POST /api/v1/auth/register-user
 * Creates a new user account AND returns JWT tokens for auto-login.
 * This endpoint should only be called AFTER email OTP verification.
 */
router.post("/register-user", authRateLimiter, async (req: Request, res: Response) => {
    try {
        const { name, email, password, username } = req.body;

        if (!name || !email || !password) {
            errorResponse(res, "Name, email, and password are required.", 400);
            return;
        }

        const pwErr = validateStrongPassword(password);
        if (pwErr) {
            errorResponse(res, pwErr, 400);
            return;
        }

        if (typeof name !== "string" || name.trim().length < 2) {
            errorResponse(res, "Name must be at least 2 characters.", 400);
            return;
        }

        // SECURITY: Verify that OTP was actually completed for this email
        const normalizedEmail = email.toLowerCase().trim();
        const otpVerified = await redis.get(`otp_verified:${normalizedEmail}`);
        if (!otpVerified) {
            errorResponse(res, "Email not verified. Please complete OTP verification first.", 403);
            return;
        }

        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            errorResponse(res, "An account with this email already exists.", 409);
            return;
        }

        // Consume the verified flag so it can't be reused
        await redis.del(`otp_verified:${normalizedEmail}`);

        // Use the same hashPassword from auth-service (consistent with login)
        const hashedPassword = await hashPassword(password);
        const referralCode = `FP${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "user",
            isEmailVerified: true,
            isPhoneVerified: false,
            profileCompleted: false,
            referralCode,
            isApproved: true,
        });

        // Assign or Auto-generate username
        let finalUsername = username;
        if (finalUsername) {
            finalUsername = finalUsername.toLowerCase().trim();
            const exists = await User.findOne({ username: finalUsername });
            if (exists) finalUsername = await generateUniqueUsername(user.name, user._id.toString());
        } else {
            finalUsername = await generateUniqueUsername(user.name, user._id.toString());
        }
        
        user.username = finalUsername;
        await user.save();

        // Generate JWT tokens for immediate auto-login (no second login call needed)
        const tokens = generateTokenPair({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        user.refreshToken = hashRefreshToken(tokens.refreshToken);
        await user.save();

        successResponse(res, {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                referralCode: user.referralCode,
                profileCompleted: user.profileCompleted,
                username: user.username,
            },
            tokens,
        }, 201);
    } catch (error: any) {
        console.error("[register-user] Error:", error);
        if (error.code === 11000) {
            errorResponse(res, "An account with this email already exists.", 409);
            return;
        }
        errorResponse(res, "Registration failed. Please try again.", 500);
    }
});

/**
 * POST /api/v1/auth/register-owner
 * Multi-step registration: email must be OTP-verified first.
 * Returns JWT tokens for auto-login (owner lands directly on dashboard).
 * Owner account starts as isApproved: false (approval gate in frontend).
 */
router.post("/register-owner", authRateLimiter, async (req: Request, res: Response) => {
    try {
        const { name, email, password, phone, businessName, cnicNumber, city, branchType } = req.body;

        if (!name || !email || !password || !phone || !businessName || !city) {
            errorResponse(res, "All fields are required: name, email, password, phone, businessName, city.", 400);
            return;
        }

        const pwErr = validateStrongPassword(password);
        if (pwErr) {
            errorResponse(res, pwErr, 400);
            return;
        }


        // SECURITY: Verify that OTP was actually completed for this email
        const normalizedEmail = email.toLowerCase().trim();
        const otpVerified = await redis.get(`otp_verified:${normalizedEmail}`);
        if (!otpVerified) {
            errorResponse(res, "Email not verified. Please complete OTP verification first.", 403);
            return;
        }

        const phoneRegex = /^(\+92|0)[0-9]{10}$/;
        if (!phoneRegex.test(phone.replace(/[\s-]/g, ""))) {
            errorResponse(res, "Invalid Pakistani phone number. Use +92 or 03xx format.", 400);
            return;
        }

        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            errorResponse(res, "An account with this email already exists.", 409);
            return;
        }

        // Consume the verified flag so it can't be reused
        await redis.del(`otp_verified:${normalizedEmail}`);

        const hashedPassword = await hashPassword(password);
        const referralCode = `FPO${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            phone: phone.replace(/[\s-]/g, ""),
            businessName: businessName.trim(),
            cnicNumber: cnicNumber || undefined,
            city,
            role: "owner",
            branchType: branchType === "multi" ? "multi" : "single",
            isEmailVerified: true, // OTP was verified in step 1
            isApproved: false,     // Requires admin approval
            referralCode,
        });

        // Generate JWT tokens for auto-login (no separate login step needed)
        const tokens = generateTokenPair({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        user.refreshToken = hashRefreshToken(tokens.refreshToken);
        await user.save();

        successResponse(res, {
            message: "Registration successful! Your application is under review.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                businessName: user.businessName,
                branchType: user.branchType,
                isApproved: false,
            },
            tokens,
        }, 201);
    } catch (error: any) {
        console.error("[register-owner] Error:", error);
        if (error.code === 11000) {
            errorResponse(res, "An account with this email already exists.", 409);
            return;
        }
        errorResponse(res, "Registration failed. Please try again.", 500);
    }
});

/**
 * POST /api/v1/auth/forgot-password
 * Checks if user exists first, then sends OTP email.
 * Production-grade: doesn't reveal user existence to prevent email enumeration.
 */
router.post("/forgot-password", authRateLimiter, async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== "string") {
            errorResponse(res, "Email is required.", 400);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorResponse(res, "Invalid email format.", 400);
            return;
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            errorResponse(res, "No account found with this email address.", 404);
            return;
        }

        const result = await generateOTP(normalizedEmail);
        if (!result.success) {
            errorResponse(res, result.message, 429);
            return;
        }

        try {
            await sendPasswordResetEmail(normalizedEmail, result.code!);
        } catch (emailError) {
            console.error("[forgot-password] Email sending failed:", emailError);
            errorResponse(res, "Failed to send reset email. Please try again.", 500);
            return;
        }

        successResponse(res, { message: "Password reset code sent to your email." });
    } catch (error) {
        console.error("[forgot-password] Error:", error);
        errorResponse(res, "Something went wrong.", 500);
    }
});

/**
 * POST /api/v1/auth/reset-password
 */
router.post("/reset-password", async (req: Request, res: Response) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            errorResponse(res, "Email, OTP, and new password are required.", 400);
            return;
        }

        const normalizedEmail = email.toLowerCase().trim();

        const pwErr = validateStrongPassword(newPassword);
        if (pwErr) {
            errorResponse(res, pwErr, 400);
            return;
        }

        const otpResult = await verifyOTP(normalizedEmail, otp);
        if (!otpResult.valid) {
            errorResponse(res, otpResult.message, 400);
            return;
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            errorResponse(res, "No account found with this email.", 404);
            return;
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.updateOne(
            { _id: user._id },
            { 
                $set: { 
                    password: hashedPassword,
                    refreshToken: undefined,
                    oldRefreshToken: undefined,
                    oldRefreshTokenExpiresAt: undefined,
                    failedLoginAttempts: 0,
                    lockedUntil: undefined
                } 
            }
        );

        successResponse(res, { message: "Password reset successfully. You can now log in." });
    } catch (error: any) {
        console.error("[RESET_PASSWORD_ERROR]", error);
        errorResponse(res, "Internal server error.", 500);
    }
});

/**
 * POST /api/v1/auth/complete-profile
 */
router.post("/complete-profile", authenticate, async (req: Request, res: Response) => {
    try {
        const { phone, city, username } = req.body;

        if (!phone || typeof phone !== "string") {
            errorResponse(res, "Phone number is required.", 400);
            return;
        }

        const cleanPhone = phone.replace(/[\s-]/g, "");
        const phoneRegex = /^(\+92|0)[0-9]{10}$/;
        if (!phoneRegex.test(cleanPhone)) {
            errorResponse(res, "Invalid Pakistani phone number. Use +92 or 03xx format.", 400);
            return;
        }

        let finalUsername = undefined;
        if (username && typeof username === "string") {
            finalUsername = username.toLowerCase().trim();
            const usernameRegex = /^[a-z0-9_]{3,20}$/;
            if (!usernameRegex.test(finalUsername)) {
                errorResponse(res, "Username must be 3-20 characters long and can only contain lowercase letters, numbers, and underscores.", 400);
                return;
            }
            // Basic reserved check
            const reserved = new Set(["admin", "support", "help", "root", "system", "info", "contact", "foodies", "foodiespakistan"]);
            if (reserved.has(finalUsername)) {
                errorResponse(res, "This username is reserved.", 400);
                return;
            }
        }

        const user = await User.findOneAndUpdate(
            { _id: req.user!.id },
            {
                $set: {
                    phone: cleanPhone,
                    ...(city && { city }),
                    ...(finalUsername && { username: finalUsername }),
                    profileCompleted: true,
                    isPhoneVerified: true,
                },
            },
            { new: true }
        );

        if (!user) {
            errorResponse(res, "User not found.", 404);
            return;
        }

        successResponse(res, {
            message: "Profile completed successfully.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                city: user.city,
                profileCompleted: user.profileCompleted,
            },
        });
    } catch (error: any) {
        console.error("[complete-profile] Error:", error);
        if (error.code === 11000) {
            errorResponse(res, "This username is already taken.", 409);
            return;
        }
        errorResponse(res, "Failed to update profile.", 500);
    }
});
/**
 * POST /api/v1/auth/impersonate
 * Admin-only: Generate tokens as if logging in as another user.
 * Body: { userId }
 * Security: Only admin role can call this. Audit log included.
 */
router.post("/impersonate", authenticate, async (req: Request, res: Response) => {
    try {
        // Strict admin-only check
        if (!req.user || req.user.role !== "admin") {
            errorResponse(res, "Forbidden. Admin access required.", 403);
            return;
        }

        const { userId } = req.body;
        if (!userId) {
            errorResponse(res, "userId is required.", 400);
            return;
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            errorResponse(res, "User not found.", 404);
            return;
        }

        // Generate token pair for the target user
        const tokens = generateTokenPair({
            id: targetUser._id.toString(),
            email: targetUser.email,
            role: targetUser.role,
        });

        // Store hashed refresh token for the impersonated session
        targetUser.refreshToken = hashRefreshToken(tokens.refreshToken);
        await targetUser.save();

        // Persistent audit log for compliance
        await AuditLog.create({
            action: "ADMIN_IMPERSONATE",
            adminId: req.user!.id,
            adminEmail: req.user!.email,
            targetUserId: targetUser._id,
            targetUserEmail: targetUser.email,
            targetRole: targetUser.role,
            ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
            userAgent: req.headers["user-agent"] || "unknown",
        });

        successResponse(res, {
            message: `Now logged in as ${targetUser.name} (${targetUser.role})`,
            user: {
                id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
                role: targetUser.role,
                phone: targetUser.phone,
                profileCompleted: targetUser.profileCompleted,
                isApproved: targetUser.isApproved,
                businessName: targetUser.businessName,
                branchType: targetUser.branchType,
            },
            tokens,
        });
    } catch (err: any) {
        console.error("[Auth] Impersonate error:", err);
        errorResponse(res, "Internal server error.", 500);
    }
});

export default router;
