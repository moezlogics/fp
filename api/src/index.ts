/**
 * Foodies Core API Server — Express Bootstrap
 *
 * Central backend for the Foodies Pakistan platform.
 * Serves both the Next.js frontend and Flutter mobile apps.
 *
 * Route Structure:
 *   /api/v1/auth         → Login, Register, Refresh, Logout
 *   /api/v1/restaurants   → CRUD + public search
 *   /api/v1/reservations  → Booking + state machine
 *   /api/v1/wallet        → Ledger balance + history
 *   /health               → Health check for monitoring
 */

import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { corsMiddleware, requireOriginForWrites } from "./middleware/cors";
import { generalRateLimiter } from "./middleware/rate-limiter";
import compression from "compression";
import { cdnClient } from "./services/cdn-client";
import { initCronJobs } from "./services/cron-jobs";

// Route imports
import authRoutes from "./routes/v1/auth";
import restaurantRoutes from "./routes/v1/restaurants";
import reservationRoutes from "./routes/v1/reservations";
import walletRoutes from "./routes/v1/wallet";
import homeRoutes from "./routes/v1/home";
import searchRoutes from "./routes/v1/search";
import dealRoutes from "./routes/v1/deals";
// Removed: voucherRoutes (SEC-03)
import yieldRuleRoutes from "./routes/v1/yield-rules";
import settlementRoutes from "./routes/v1/settlements";
import yieldCalendarRoutes from "./routes/v1/yield-calendar";
import userRoutes from "./routes/v1/users";
import commissionRoutes from "./routes/v1/commissions";
import escrowRoutes from "./routes/v1/escrow";
import categoriesRoutes from "./routes/v1/categories";
import citiesRoutes from "./routes/v1/cities";
import areasRoutes from "./routes/v1/areas";
import banksRoutes from "./routes/v1/banks";
import bannersRoutes from "./routes/v1/banners";
import articlesRoutes from "./routes/v1/articles";
import waitlistRoutes from "./routes/v1/waitlist";
import referralsRoutes from "./routes/v1/referrals";
import subscriptionRoutes from "./routes/v1/subscriptions";
import paymentMethodRoutes from "./routes/v1/payment-methods";
import reviewsRoutes from "./routes/v1/reviews";
import rewardsRoutes from "./routes/v1/rewards";
import analyticsRoutes from "./routes/v1/analytics";
import paymentsRoutes from "./routes/v1/payments";
import ownersRoutes from "./routes/v1/owners";
import cronRoutes from "./routes/v1/cron";
import discountRoutes from "./routes/v1/discounts";
import surgeRoutes from "./routes/v1/surge";
// Removed: splitBillRoutes (split-bill feature removed)
// Removed: giftCardRoutes (SEC-02)
import menuItemRoutes from "./routes/v1/menu-items";
import tableOrderRoutes from "./routes/v1/table-orders";
import seoPagesRoutes from "./routes/v1/seo-pages";
import siteReviewsRoutes from "./routes/v1/site-reviews";
import settingsRoutes from "./routes/v1/settings";
import bookingSettingsRoutes from "./routes/v1/booking-settings";
import bookingSlotsRoutes from "./routes/v1/booking-slots";
import billsRoutes from "./routes/v1/bills";
import branchAuthRoutes from "./routes/v1/branch-auth";
import merchantWalletRoutes from "./routes/v1/merchant-wallet";
import restaurantSubscriptionRoutes from "./routes/v1/restaurant-subscriptions";
import profileRoutes from "./routes/v1/profiles";
import storiesRoutes from "./routes/v1/stories";
import mediaRoutes from "./routes/v1/media";
import contactLeadRoutes from "./routes/v1/contact-leads";

const app = express();

// ── Security Hardening ──
app.use(helmet());
app.use(corsMiddleware);
app.use(requireOriginForWrites);
app.set("trust proxy", 1);

// ── Payload Compression (Saves 80% Bandwidth) ──
app.use(compression({
    level: 6, // Balance between CPU load and compression ratio
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
        if (req.headers["x-no-compression"]) return false;
        return compression.filter(req, res);
    }
}));

// ── Body Parsers ──
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ── NoSQL Injection Prevention ──
import mongoSanitize from "express-mongo-sanitize";
app.use(mongoSanitize());

// ── Global Rate Limiter (100 req/min) ──
app.use(generalRateLimiter);

// ── API v1 Routes ──
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/restaurants", restaurantRoutes);
app.use("/api/v1/reservations", reservationRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/home", homeRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/deals", dealRoutes);
// app.use("/api/v1/vouchers", voucherRoutes); // Removed (SEC-03)
app.use("/api/v1/yield-rules", yieldRuleRoutes);
app.use("/api/v1/settlements", settlementRoutes);
app.use("/api/v1/yield-calendar", yieldCalendarRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/commissions", commissionRoutes);
app.use("/api/v1/escrow", escrowRoutes);
app.use("/api/v1/categories", categoriesRoutes);
app.use("/api/v1/cities", citiesRoutes);
app.use("/api/v1/areas", areasRoutes);
app.use("/api/v1/seo-pages", seoPagesRoutes);
app.use("/api/v1/site-reviews", siteReviewsRoutes);
app.use("/api/v1/banks", banksRoutes);
app.use("/api/v1/banners", bannersRoutes);
app.use("/api/v1/articles", articlesRoutes);
app.use("/api/v1/waitlist", waitlistRoutes);
app.use("/api/v1/referrals", referralsRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/payment-methods", paymentMethodRoutes);
app.use("/api/v1/reviews", reviewsRoutes);
app.use("/api/v1/rewards", rewardsRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/payments", paymentsRoutes);
app.use("/api/v1/owners", ownersRoutes);
app.use("/api/v1/cron", cronRoutes);
app.use("/api/v1/discounts", discountRoutes);
app.use("/api/v1/surge", surgeRoutes);
// Removed: /api/v1/split-bill (split-bill feature removed)
// app.use("/api/v1/gift-cards", giftCardRoutes); // Removed (SEC-02)
app.use("/api/v1/menu-items", menuItemRoutes);
app.use("/api/v1/table-orders", tableOrderRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/booking-settings", bookingSettingsRoutes);
app.use("/api/v1/booking-slots", bookingSlotsRoutes);
app.use("/api/v1/bills", billsRoutes);
app.use("/api/v1/branch-auth", branchAuthRoutes);
app.use("/api/v1/merchant-wallet", merchantWalletRoutes);
import virtualTourRoutes from "./routes/v1/virtual-tour";
app.use("/api/v1/virtual-tour", virtualTourRoutes);
app.use("/api/v1/restaurant-subscriptions", restaurantSubscriptionRoutes);
app.use("/api/v1/profiles", profileRoutes);
app.use("/api/v1/stories", storiesRoutes);
app.use("/api/v1/media", mediaRoutes);
app.use("/api/v1/contact-leads", contactLeadRoutes);
// ── Health Check ──
app.get("/health", async (_req, res) => {
    const cdnHealthy = await cdnClient.healthCheck();
    const memUsage = process.memoryUsage();

    res.json({
        status: "ok",
        service: "foodies-api",
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        dependencies: {
            cdn: cdnHealthy ? "healthy" : "unreachable",
            mongodb: "connected",
        },
        memory: {
            rssBytes: memUsage.rss,
            heapUsedBytes: memUsage.heapUsed,
        },
    });
});

// ── 404 Handler ──
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found. All API routes are prefixed with /api/v1/",
    });
});

// ── Global Error Handler ──
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[API] Unhandled error:", err);

    if (err.message?.includes("CORS")) {
        res.status(403).json({ success: false, error: "CORS policy violation. This origin is not allowed." });
        return;
    }

    res.status(500).json({ success: false, error: "Internal server error." });
});

import { refreshSearchIndex, startSearchIndexRefresh } from "./services/fuse-search";

// ── Bootstrap ──
async function bootstrap() {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Initialize Fuse.js search index (loads all restaurants into memory)
    await refreshSearchIndex();
    startSearchIndexRefresh(); // Auto-refresh every 5 minutes

    // 3. Initialize scheduled CRON jobs
    initCronJobs();

    // 3. Check CDN connectivity (non-blocking)
    const cdnHealthy = await cdnClient.healthCheck();

    // 3. Start Express
    app.listen(env.PORT, () => {
        console.log("");
        console.log("╔══════════════════════════════════════════════════════╗");
        console.log("║          🚀 Foodies Core API Server Started          ║");
        console.log("╠══════════════════════════════════════════════════════╣");
        console.log(`║  Port:         ${String(env.PORT).padEnd(38)}║`);
        console.log(`║  Environment:  ${env.NODE_ENV.padEnd(38)}║`);
        console.log(`║  MongoDB:      ${"✅ Connected".padEnd(38)}║`);
        console.log(`║  CDN:          ${(cdnHealthy ? "✅ Healthy" : "⚠️  Unreachable").padEnd(38)}║`);
        console.log(`║  CORS Origins: ${env.CORS_ORIGINS.join(", ").substring(0, 38).padEnd(38)}║`);
        console.log("╠══════════════════════════════════════════════════════╣");
        console.log("║  Routes:                                             ║");
        console.log("║    POST   /api/v1/auth/login                         ║");
        console.log("║    POST   /api/v1/auth/register                      ║");
        console.log("║    POST   /api/v1/auth/refresh                       ║");
        console.log("║    GET    /api/v1/restaurants                         ║");
        console.log("║    GET    /api/v1/restaurants/:slug                   ║");
        console.log("║    POST   /api/v1/reservations                       ║");
        console.log("║    GET    /api/v1/wallet/balance                     ║");
        console.log("║    GET    /health                                    ║");
        console.log("╚══════════════════════════════════════════════════════╝");
        console.log("");

        // CRITICAL FOR ZERO-DOWNTIME: Tell PM2 we are ready to receive traffic
        if (process.send) {
            process.send("ready");
        }
    });

    // Graceful Shutdown for Zero-Downtime
    process.on("SIGINT", () => {
        console.log("Shutting down gracefully...");
        process.exit(0);
    });
}

bootstrap().catch((err) => {
    console.error("Fatal: Server failed to start:", err);
    process.exit(1);
});

export default app;
