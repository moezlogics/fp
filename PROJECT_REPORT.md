# 🍽️ Foodies Pakistan — Complete Project Structure Report

> **Generated:** April 2026  
> **Purpose:** Full technical documentation of all four sub-projects  
> **Coverage:** Backend · Frontend · FastAPI · CDN

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Visual Folder Structure](#2-visual-folder-structure)
3. [Backend (Node.js + Express)](#3-backend-nodejs--express)
4. [Frontend (Next.js 15)](#4-frontend-nextjs-15)
5. [FastAPI (Python Microservice)](#5-fastapi-python-microservice)
6. [CDN (Node.js Image Server)](#6-cdn-nodejs-image-server)
7. [Inter-Service Communication](#7-inter-service-communication)
8. [Environment Configuration](#8-environment-configuration)
9. [Architecture Patterns & Conventions](#9-architecture-patterns--conventions)
10. [Technology Stack Summary](#10-technology-stack-summary)

---

## 1. Project Overview

**Foodies Pakistan** is a full-stack restaurant discovery, booking, and fintech platform for Pakistan. It supports restaurant browsing, table reservations with dynamic pricing, bank card discounts, FoodiePay digital payments, loyalty coins, restaurant owner dashboards, 360° virtual tours, and a self-hosted CDN.

| Service | Framework | Port | Role |
|---|---|---|---|
| **Backend** | Node.js · Express · MongoDB | 4000 | Core API — auth, bookings, payments, data |
| **Frontend** | Next.js 15 · React 19 | 3000 | Web UI — customers, owners, admin |
| **FastAPI** | Python · FastAPI · OpenCV | 8500 | VR Tour stitching microservice |
| **CDN** | Node.js · Express · Sharp | 3001 | Media upload, WebP conversion, static serving |

---

## 2. Visual Folder Structure

```
foodies pakistan/
│
├── backend/                          ← Node.js Express Core API
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app.ts                    ← Express app setup & middleware registration
│   │   ├── server.ts                 ← HTTP server entry point
│   │   ├── config/
│   │   │   ├── db.ts                 ← MongoDB connection pool
│   │   │   ├── env.ts                ← Environment variable loader
│   │   │   └── redis.ts              ← ioredis client singleton
│   │   ├── middleware/
│   │   │   ├── authenticate.ts       ← JWT Bearer verification
│   │   │   ├── authorize.ts          ← Role-based access control (RBAC)
│   │   │   ├── cors.ts               ← CORS + write-origin enforcement
│   │   │   └── rate-limiter.ts       ← Redis-backed rate limiting
│   │   ├── models/                   ← Mongoose schemas (60 models)
│   │   │   ├── User.ts
│   │   │   ├── Restaurant.ts
│   │   │   ├── Review.ts
│   │   │   ├── MenuItem.ts
│   │   │   ├── Reservation.ts
│   │   │   ├── Payment.ts
│   │   │   ├── Transaction.ts
│   │   │   ├── Deal.ts
│   │   │   ├── Subscription.ts
│   │   │   ├── SubscriptionPlan.ts
│   │   │   ├── RestaurantSubscription.ts
│   │   │   ├── Voucher.ts
│   │   │   ├── VoucherPurchase.ts
│   │   │   ├── GiftCard.ts
│   │   │   ├── MerchantWallet.ts
│   │   │   ├── WalletLedger.ts
│   │   │   ├── BankOffer.ts
│   │   │   ├── Bank.ts
│   │   │   ├── Settlement.ts
│   │   │   ├── City.ts
│   │   │   ├── Area.ts
│   │   │   ├── Category.ts
│   │   │   ├── Banner.ts
│   │   │   ├── Article.ts
│   │   │   ├── Story.ts
│   │   │   ├── TableOrder.ts
│   │   │   ├── TimeSlot.ts
│   │   │   ├── YieldRule.ts
│   │   │   ├── TableInventory.ts
│   │   │   ├── RewardConfig.ts
│   │   │   ├── PrimeRedemption.ts
│   │   │   ├── Waitlist.ts
│   │   │   ├── ContactLead.ts
│   │   │   ├── SiteReview.ts
│   │   │   ├── SeoPage.ts
│   │   │   ├── Media.ts
│   │   │   ├── CommissionProfile.ts
│   │   │   ├── AuditLog.ts
│   │   │   ├── NotificationLog.ts
│   │   │   ├── PaymentMethod.ts
│   │   │   ├── PlatformSettings.ts
│   │   │   ├── BillSubmission.ts
│   │   │   ├── RestaurantInvoice.ts
│   │   │   ├── WithdrawalRequest.ts
│   │   │   └── SplitBill.ts
│   │   ├── routes/
│   │   │   └── v1/                   ← All API routes (46 route files)
│   │   │       ├── auth.ts
│   │   │       ├── restaurants.ts
│   │   │       ├── reservations.ts
│   │   │       ├── payments.ts
│   │   │       ├── wallet.ts
│   │   │       ├── home.ts
│   │   │       ├── search.ts
│   │   │       ├── deals.ts
│   │   │       ├── yield-rules.ts
│   │   │       ├── yield-calendar.ts
│   │   │       ├── users.ts
│   │   │       ├── profiles.ts
│   │   │       ├── subscriptions.ts
│   │   │       ├── restaurant-subscriptions.ts
│   │   │       ├── reviews.ts
│   │   │       ├── menu-items.ts
│   │   │       ├── table-orders.ts
│   │   │       ├── categories.ts
│   │   │       ├── cities.ts
│   │   │       ├── areas.ts
│   │   │       ├── banks.ts
│   │   │       ├── banners.ts
│   │   │       ├── articles.ts
│   │   │       ├── waitlist.ts
│   │   │       ├── referrals.ts
│   │   │       ├── rewards.ts
│   │   │       ├── analytics.ts
│   │   │       ├── owners.ts
│   │   │       ├── commissions.ts
│   │   │       ├── settlements.ts
│   │   │       ├── escrow.ts
│   │   │       ├── discounts.ts
│   │   │       ├── surge.ts
│   │   │       ├── split-bill.ts
│   │   │       ├── booking-settings.ts
│   │   │       ├── booking-slots.ts
│   │   │       ├── bills.ts
│   │   │       ├── merchant-wallet.ts
│   │   │       ├── payment-methods.ts
│   │   │       ├── virtual-tour.ts
│   │   │       ├── branch-auth.ts
│   │   │       ├── stories.ts
│   │   │       ├── media.ts
│   │   │       ├── contact-leads.ts
│   │   │       ├── seo-pages.ts
│   │   │       ├── site-reviews.ts
│   │   │       ├── settings.ts
│   │   │       └── cron.ts
│   │   ├── controllers/
│   │   │   ├── ProfileController.ts
│   │   │   └── RestaurantFollowController.ts
│   │   ├── services/
│   │   │   ├── auth-service.ts
│   │   │   ├── email-service.ts
│   │   │   ├── wallet-service.ts
│   │   │   ├── otp-service.ts
│   │   │   ├── sms-service.ts
│   │   │   ├── cron-jobs.ts
│   │   │   ├── cron-service.ts
│   │   │   ├── fuse-search.ts
│   │   │   ├── security-logger.ts
│   │   │   ├── cdn-client.ts
│   │   │   ├── restaurant-subscription-service.ts
│   │   │   ├── surge-engine.ts
│   │   │   ├── virtual-tour-processor.ts
│   │   │   ├── ai-menu-service.ts
│   │   │   ├── ai-alt-service.ts
│   │   │   └── payment/
│   │   │       ├── payfast.ts
│   │   │       ├── jazzcash.ts
│   │   │       ├── checkout-engine.ts
│   │   │       └── compounding-engine.ts
│   │   └── utils/
│   │       ├── api-response.ts
│   │       ├── redis-cache.ts
│   │       ├── bank-slug.ts
│   │       ├── content-moderation.ts
│   │       └── seo-page-generator.ts
│   └── scripts/
│       └── reset-admin.ts            ← Admin account reset utility
│
├── frontend/                         ← Next.js 15 Web Application
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/
│       │   ├── layout.tsx            ← Root layout (fonts, GA4, JSON-LD)
│       │   ├── not-found.tsx         ← Global 404 page
│       │   ├── robots.ts             ← robots.txt generator
│       │   ├── (main)/               ← Public-facing website
│       │   │   ├── layout.tsx        ← Shell with header/footer/bottom-nav
│       │   │   ├── page.tsx          ← Homepage
│       │   │   ├── [city]/
│       │   │   │   ├── page.tsx      ← City landing page
│       │   │   │   ├── deals/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   └── [bankSlug]/page.tsx
│       │   │   │   └── [...slug]/
│       │   │   │       ├── page.tsx          ← Restaurant / Archive / Virtual Tour
│       │   │   │       ├── restaurant-view.tsx
│       │   │   │       ├── archive-view.tsx
│       │   │   │       ├── virtual-tour-view.tsx
│       │   │   │       └── loading.tsx
│       │   │   ├── about-us/page.tsx
│       │   │   ├── account/
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── page.tsx
│       │   │   │   ├── actions.ts
│       │   │   │   ├── login-form.tsx
│       │   │   │   └── payment-methods/page.tsx
│       │   │   ├── articles/
│       │   │   │   ├── page.tsx
│       │   │   │   └── [slug]/page.tsx
│       │   │   ├── contact-us/
│       │   │   │   ├── layout.tsx
│       │   │   │   └── page.tsx
│       │   │   ├── disclaimer/page.tsx
│       │   │   ├── foodiepay/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── pay/page.tsx
│       │   │   │   └── split/page.tsx
│       │   │   ├── forgot-password/page.tsx
│       │   │   ├── my-bookings/page.tsx
│       │   │   ├── my-reviews/page.tsx
│       │   │   ├── near-me/page.tsx
│       │   │   ├── order/
│       │   │   │   ├── layout.tsx
│       │   │   │   └── [slug]/page.tsx
│       │   │   ├── payment/
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── success/page.tsx
│       │   │   │   └── failed/page.tsx
│       │   │   ├── payment-options/page.tsx
│       │   │   ├── prime/
│       │   │   │   ├── layout.tsx
│       │   │   │   └── page.tsx
│       │   │   ├── privacy-policy/page.tsx
│       │   │   ├── profile/[username]/page.tsx
│       │   │   ├── refer/
│       │   │   │   ├── layout.tsx
│       │   │   │   └── page.tsx
│       │   │   ├── saved/
│       │   │   │   ├── layout.tsx
│       │   │   │   └── page.tsx
│       │   │   ├── terms-conditions/page.tsx
│       │   │   └── wallet/
│       │   │       ├── layout.tsx
│       │   │       └── page.tsx
│       │   ├── moezlogin/            ← Admin panel (protected)
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx          ← Admin dashboard
│       │   │   ├── articles/page.tsx
│       │   │   ├── banks/page.tsx
│       │   │   ├── banners/page.tsx
│       │   │   ├── categories/page.tsx
│       │   │   ├── cities/page.tsx
│       │   │   ├── contact-leads/page.tsx
│       │   │   ├── deals/page.tsx
│       │   │   ├── finance/page.tsx
│       │   │   ├── media/page.tsx
│       │   │   ├── owners/page.tsx
│       │   │   ├── posts/page.tsx
│       │   │   ├── reservations/page.tsx
│       │   │   ├── restaurants/page.tsx
│       │   │   ├── reviews/page.tsx
│       │   │   ├── rewards/page.tsx
│       │   │   ├── settings/page.tsx
│       │   │   ├── site-reviews/page.tsx
│       │   │   ├── subscriptions/page.tsx
│       │   │   └── users/page.tsx
│       │   ├── owner/                ← Restaurant owner dashboard (protected)
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── bank-details/page.tsx
│       │   │   ├── bookings/page.tsx
│       │   │   ├── deals/page.tsx
│       │   │   ├── gallery/page.tsx
│       │   │   ├── menu/page.tsx
│       │   │   ├── new-branch/page.tsx
│       │   │   ├── prime/page.tsx
│       │   │   ├── prime-verify/page.tsx
│       │   │   ├── profile/page.tsx
│       │   │   ├── reviews/page.tsx
│       │   │   ├── settlements/page.tsx
│       │   │   ├── stories/page.tsx
│       │   │   ├── table-management/page.tsx
│       │   │   ├── timings/page.tsx
│       │   │   ├── virtual-tour/
│       │   │   │   ├── page.tsx
│       │   │   │   └── hotspot-editor/page.tsx
│       │   │   ├── vouchers/page.tsx
│       │   │   └── yield/page.tsx
│       │   ├── login/
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── register/
│       │   │   ├── page.tsx
│       │   │   └── owner/page.tsx
│       │   ├── admin/page.tsx
│       │   └── api/                  ← Next.js API Routes (proxy layer)
│       │       ├── auth/
│       │       │   ├── [...nextauth]/route.ts
│       │       │   ├── register/route.ts
│       │       │   ├── send-otp/route.ts
│       │       │   ├── verify-otp/route.ts
│       │       │   ├── login-guard/route.ts
│       │       │   ├── check-username/route.ts
│       │       │   ├── complete-profile/route.ts
│       │       │   ├── forgot-password/route.ts
│       │       │   ├── reset-password/route.ts
│       │       │   └── impersonate/route.ts
│       │       ├── restaurants/
│       │       │   ├── admin/route.ts
│       │       │   ├── [slug]/slots/route.ts
│       │       │   ├── check-name/route.ts
│       │       │   ├── load-more/route.ts
│       │       │   └── nearby/route.ts
│       │       ├── users/
│       │       │   ├── profile/route.ts
│       │       │   ├── admin/route.ts
│       │       │   ├── saved/route.ts
│       │       │   └── reviews/route.ts
│       │       ├── reservations/
│       │       │   ├── hold/route.ts
│       │       │   ├── my/route.ts
│       │       │   └── [id]/route.ts
│       │       ├── reviews/
│       │       │   ├── route.ts
│       │       │   ├── upload/route.ts
│       │       │   └── [id]/reply/route.ts
│       │       ├── site-reviews/
│       │       │   ├── route.ts
│       │       │   ├── me/route.ts
│       │       │   └── [id]/route.ts
│       │       ├── deals/
│       │       │   ├── route.ts
│       │       │   └── [id]/route.ts
│       │       ├── banks/
│       │       │   ├── route.ts
│       │       │   └── [id]/route.ts
│       │       ├── vouchers/
│       │       │   ├── route.ts
│       │       │   ├── redeem/route.ts
│       │       │   └── [id]/route.ts
│       │       ├── payments/
│       │       │   ├── initiate/route.ts
│       │       │   ├── callback/route.ts
│       │       │   └── status/[txnId]/route.ts
│       │       ├── payment-methods/route.ts
│       │       ├── wallet/
│       │       │   ├── balance/route.ts
│       │       │   ├── history/route.ts
│       │       │   └── redeem/route.ts
│       │       ├── subscriptions/
│       │       │   ├── plans/route.ts
│       │       │   ├── me/route.ts
│       │       │   ├── scan/route.ts
│       │       │   ├── verify-walkin/route.ts
│       │       │   └── [...path]/route.ts
│       │       ├── table-orders/
│       │       │   ├── create/route.ts
│       │       │   └── [orderCode]/route.ts
│       │       ├── split-bill/
│       │       │   ├── mine/route.ts
│       │       │   └── [splitCode]/route.ts
│       │       ├── owner/
│       │       │   ├── restaurant/route.ts
│       │       │   ├── reservations/route.ts
│       │       │   ├── analytics/[restaurantId]/route.ts
│       │       │   ├── deals/route.ts
│       │       │   ├── vouchers/route.ts
│       │       │   ├── settlements/route.ts
│       │       │   ├── branch-auth/route.ts
│       │       │   ├── check-name/route.ts
│       │       │   ├── booking-settings/route.ts
│       │       │   ├── yield-rules/route.ts
│       │       │   ├── yield-calendar/route.ts
│       │       │   ├── bills/submit/route.ts
│       │       │   ├── merchant-wallet/[...path]/route.ts
│       │       │   └── prime/[...path]/route.ts
│       │       ├── admin/
│       │       │   ├── reviews/route.ts
│       │       │   ├── reviews/[id]/route.ts
│       │       │   ├── analytics/reservations/route.ts
│       │       │   ├── commissions/route.ts
│       │       │   ├── rewards/route.ts
│       │       │   └── settlements/route.ts
│       │       ├── menu-items/[restaurantId]/route.ts
│       │       ├── categories/route.ts
│       │       ├── cities/
│       │       │   ├── route.ts
│       │       │   ├── detect/route.ts
│       │       │   └── [id]/route.ts
│       │       ├── areas/
│       │       │   ├── route.ts
│       │       │   └── [id]/route.ts
│       │       ├── articles/
│       │       │   ├── route.ts
│       │       │   └── [id]/route.ts
│       │       ├── seo-pages/
│       │       │   ├── route.ts
│       │       │   └── [id]/route.ts
│       │       ├── banners/route.ts
│       │       ├── search/route.ts
│       │       ├── media/route.ts
│       │       ├── upload/route.ts
│       │       ├── initial-data/route.ts
│       │       ├── settings/
│       │       │   ├── route.ts
│       │       │   └── public/route.ts
│       │       ├── geo/ip/route.ts
│       │       ├── waitlist/join/route.ts
│       │       ├── contact-leads/route.ts
│       │       ├── referrals/route.ts
│       │       ├── escrow/
│       │       │   ├── calculate/route.ts
│       │       │   └── initiate/route.ts
│       │       ├── owners/route.ts
│       │       └── cron/reservations/route.ts
│       │
│       ├── sitemap-index.xml/route.ts
│       ├── sitemap-restaurants.xml/route.ts
│       ├── sitemap-cities.xml/route.ts
│       ├── sitemap-areas.xml/route.ts
│       ├── sitemap-categories.xml/route.ts
│       ├── sitemap-deals.xml/route.ts
│       └── sitemap-pages.xml/route.ts
│
│       ├── components/
│       │   ├── ui-shell/
│       │   │   ├── app-header.tsx
│       │   │   ├── bottom-nav.tsx
│       │   │   ├── footer.tsx
│       │   │   └── animated-logo.tsx
│       │   ├── restaurant/
│       │   │   ├── restaurant-detail-client.tsx
│       │   │   ├── restaurant-menu.tsx
│       │   │   ├── restaurant-reviews-tab.tsx
│       │   │   ├── restaurant-gallery.tsx
│       │   │   ├── cuisines-link.tsx
│       │   │   ├── dynamic-open-badge.tsx
│       │   │   ├── follow-button.tsx
│       │   │   ├── location-button.tsx
│       │   │   ├── lightbox.tsx
│       │   │   ├── review-modal.tsx
│       │   │   ├── similar-card.tsx
│       │   │   ├── time-deals.tsx
│       │   │   └── vouchers.tsx
│       │   ├── archive/
│       │   │   ├── archive-map.tsx
│       │   │   ├── archive-map-inner.tsx
│       │   │   ├── archive-map-toggle.tsx
│       │   │   ├── filter-sidebar.tsx
│       │   │   ├── deals-filter-sidebar.tsx
│       │   │   ├── restaurant-grid.tsx
│       │   │   ├── mobile-archive-controls.tsx
│       │   │   ├── mobile-deals-controls.tsx
│       │   │   └── nearby-page-content.tsx
│       │   ├── home/
│       │   │   ├── home-content.tsx
│       │   │   ├── homepage-cards.tsx
│       │   │   └── nearby-restaurants.tsx
│       │   ├── auth/
│       │   │   └── auth-modal.tsx
│       │   ├── owner/
│       │   │   ├── owner-login.tsx
│       │   │   ├── digital-menu-manager.tsx
│       │   │   ├── menu-item-editor.tsx
│       │   │   ├── image-gallery-modal.tsx
│       │   │   ├── branch-map.tsx
│       │   │   ├── category-autocomplete.tsx
│       │   │   ├── ai-menu-review-modal.tsx
│       │   │   ├── Guided360Camera.tsx
│       │   │   └── branch-selector.tsx
│       │   ├── admin/
│       │   │   ├── admin-login.tsx
│       │   │   ├── admin-booking-modal.tsx
│       │   │   ├── app-sidebar.tsx
│       │   │   └── data-table.tsx
│       │   ├── shared/
│       │   │   └── VirtualTourViewer.tsx
│       │   ├── stories/
│       │   │   ├── StoryFeed.tsx
│       │   │   ├── StoryRing.tsx
│       │   │   └── StoryViewer.tsx
│       │   ├── search/
│       │   │   └── search-dropdown.tsx
│       │   ├── subscription/
│       │   │   └── totp-qr.tsx
│       │   ├── profile/
│       │   │   └── profile-client-tabs.tsx
│       │   ├── map/
│       │   │   └── map-view.tsx
│       │   ├── layouts/
│       │   │   └── main-layout.tsx
│       │   ├── review-popup.tsx
│       │   ├── review-schema.tsx
│       │   ├── prime-popup.tsx
│       │   └── ui/                   ← Shadcn/ui base components
│       │       ├── animate-in.tsx
│       │       ├── avatar.tsx
│       │       ├── button.tsx
│       │       ├── dropdown-menu.tsx
│       │       ├── faq-section.tsx
│       │       ├── hero-slider.tsx
│       │       ├── input.tsx
│       │       ├── restaurant-card.tsx
│       │       ├── separator.tsx
│       │       ├── sheet.tsx
│       │       ├── sidebar.tsx
│       │       ├── skeleton.tsx
│       │       ├── skeletons.tsx
│       │       ├── table.tsx
│       │       ├── tooltip.tsx
│       │       └── verified-badge.tsx
│       │
│       ├── lib/
│       │   ├── api-client.ts
│       │   ├── api-proxy.ts
│       │   ├── api-route-error.ts
│       │   ├── api-route-guards.ts
│       │   ├── auth-redirect.ts
│       │   ├── blur-data-url.ts
│       │   ├── constants.ts
│       │   ├── deals-archive.ts
│       │   ├── get-open-status.ts
│       │   ├── public-site-settings.ts
│       │   ├── redis-cache.ts
│       │   ├── restaurant-faqs.ts
│       │   ├── sitemap-builder.ts
│       │   ├── sitemap-utils.ts
│       │   └── utils.ts
│       │
│       ├── hooks/
│       │   ├── use-mobile.ts
│       │   └── use-login-guard.ts
│       │
│       ├── types/
│       │   └── next-auth.d.ts
│       │
│       └── auth.ts / auth.config.ts  ← NextAuth configuration
│
├── fastapi/                           ← Python VR Tour Microservice
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── common/
│   │   └── security.py
│   ├── modules/vr_tour/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── cdn_client.py
│   │   └── stitcher.py
│   ├── templates/vr_tour/
│   │   ├── capture.html
│   │   ├── processing.html
│   │   ├── viewer.html
│   │   └── error.html
│   └── static/vr_tour/
│       ├── css/capture.css
│       └── js/capture.js
│
└── cdn/                               ← Node.js Image CDN Server
    ├── package.json
    ├── tsconfig.json
    ├── .env
    └── src/
        ├── index.ts
        ├── config/env.ts
        ├── routes/media.ts
        ├── middleware/
        │   ├── auth-guard.ts
        │   └── rate-limiter.ts
        ├── services/image-processor.ts
        └── utils/file-signature.ts
```

---

## 3. Backend (Node.js + Express)

### 3.1 Config Files

#### `config/db.ts`
MongoDB connection with pooling and auto-reconnect.
| Export | Description |
|---|---|
| `connectDB()` | Connect to MongoDB (pool: max 25, min 5). Exponential backoff reconnect on disconnect |

#### `config/env.ts`
Typed environment loader with validation.
| Export | Description |
|---|---|
| `env` | Config object with: PORT, NODE_ENV, MONGODB_URI, JWT_SECRET, CDN_BASE_URL, CDN_API_KEY, REDIS_URL, CORS_ORIGINS, SMTP settings, Twilio SMS credentials, PayFast gateway keys, VR Tour secret |

#### `config/redis.ts`
| Export | Description |
|---|---|
| `redis` | ioredis singleton for rate limiting, OTP storage, response caching |

---

### 3.2 Middleware

#### `middleware/authenticate.ts`
| Export | Description |
|---|---|
| `authenticate(req, res, next)` | Verifies JWT Bearer token. Attaches user to `req.user`. Internal services bypass via `x-app-internal-secret` header |

#### `middleware/authorize.ts`
| Export | Description |
|---|---|
| `authorize(...roles)` | Factory: returns middleware that enforces role membership (user \| owner \| admin) |

#### `middleware/cors.ts`
| Export | Description |
|---|---|
| `corsMiddleware` | Configured CORS with allowlist-based origin validation |
| `requireOriginForWrites(req, res, next)` | Enforces `Origin` header on POST/PUT/PATCH/DELETE — blocks cross-origin form submissions |

#### `middleware/rate-limiter.ts`
| Export | Limit |
|---|---|
| `authRateLimiter` | 10 requests / minute |
| `generalRateLimiter` | 100 requests / minute |
| `otpRateLimiter` | 3 requests / 5 minutes |

---

### 3.3 Models (Database Schemas)

#### `models/User.ts`
Complete user document with authentication, profile, gamification, and fintech fields.

| Field Group | Fields |
|---|---|
| **Identity** | name, email, password (hashed), phone, avatar, city |
| **Role** | role (user\|admin\|owner), isEmailVerified, isPhoneVerified, profileCompleted |
| **Owner fields** | businessName, cnicNumber, branchType, restaurantIds, isApproved |
| **Community** | username (unique, sparse), bio, socialLinks, isPublicProfile |
| **Gamification** | foodieLevel, points, badges, reviewCount, photoCount |
| **Loyalty** | savedRestaurants, referralCode, referredBy, noShowCount, totalCoinsEarned |
| **Prime** | isPrime, primeValidTo, totalPrimeSavings, followedRestaurants |
| **Preferences** | dietaryPreferences, favoriteCuisines, notificationPreferences, themePreference |
| **Security** | refreshToken (hashed), failedLoginAttempts, lockedUntil |

**Indexes:** email, username, role+isApproved

---

#### `models/Restaurant.ts`
Core restaurant listing model with multi-branch, fintech, and VR tour support.

| Field Group | Fields |
|---|---|
| **Brand** | brandName, branchName, parentBrandId, isHeadOffice, name (computed), slug (unique) |
| **Content** | description, logo, coverImage, galleryImages (categorized), menuImages, menuPdf |
| **Location** | location (GeoJSON Point), address, city, area, areas[], citySlug |
| **Contact** | phone, whatsapp, website, email, social links |
| **Attributes** | priceRange (1-4), cuisines[], restaurantType[], vibes[], facilities[] |
| **Hours** | openingHours (day, open, close, isClosed), specialOverrides[] |
| **Ratings** | averageRating, totalReviews, ratings.food/ambiance/service |
| **Ownership** | ownerId, isApproved, isFeatured, isVerifiedPartner, isActive |
| **SEO** | metaTitle, metaDescription |
| **Analytics** | viewCount, menuViewCount, directionClickCount, phoneRevealCount, shareCount |
| **Booking** | bookingSettings (30+ sub-fields: slots, discounts, caps, bank deals on cash) |
| **Fintech** | platformFeeRate (3%), allowDiscountStacking, maxStackedDiscountPercentage |
| **Surge** | surgeEnabled, surgeIntensity |
| **VR Tour** | virtualTour.status, defaultSceneId, scenes[] (panoramaUrl, hotspots, initialView) |
| **Social** | followersCount, branchAccessPin (hashed) |

**Indexes:** location (2dsphere), city+cuisines, slug, ownerId, parentBrandId, averageRating

---

#### `models/Reservation.ts`
State-machine driven booking with escrow and multi-discount support.

**Status Flow:**
```
Draft (3-min hold) → Confirmed → Seated → Completed
                   ↘ CancelledByUser / CancelledByOwner
                   ↘ NoShow
```

| Field Group | Fields |
|---|---|
| **Identity** | reservationCode (unique, auto), userId, restaurantId |
| **Booking** | date, timeSlot (HH:MM), pax (1-50), status |
| **Timing** | lockExpiresAt (Draft: +3 min), confirmedAt, seatedAt, completedAt, cancelledAt |
| **Discounts** | appliedYieldDiscount(%), appliedBankDiscount(%), appliedPrimeDiscount(%), appliedCoinsDiscount(PKR) |
| **Billing** | estimatedBillBeforeDiscount, estimatedBillAfterDiscount, billAmountPaisa |
| **Guest** | guestName, guestPhone, guestEmail, specialRequests, occasion |
| **Payment** | paymentMode (FoodiePay\|AtRestaurant\|Pending), billSubmittedAt |
| **Loyalty** | coinsEarned (awarded at Completed), isNoShowPenaltyApplied |

**Indexes:** userId+status, restaurantId+date+timeSlot, status+lockExpiresAt, reservationCode

---

#### `models/Transaction.ts`
Immutable financial ledger (FoodiePay).

| Field | Description |
|---|---|
| userId, merchantId, reservationId | Links |
| originalBillPaisa | Total before discounts |
| tableDealDiscountPaisa, subscriptionDiscountPaisa, bankDiscountPaisa, coinDiscountPaisa | Each discount layer |
| totalDiscountPaisa, amountPaidPaisa | Computed totals |
| platformFeePaisa, netMerchantPaisa | Commission split |
| discountMethod | exclusive \| stacked |
| status | PENDING, SUCCESS, FAILED, REFUNDED |
| idempotencyKey (unique) | Prevents duplicate charges |

---

#### `models/Payment.ts`
JazzCash gateway payment tracking.

| Field | Description |
|---|---|
| txnRefNo (unique) | Our internal reference |
| gatewayRef | JazzCash pp_TxnRefNo |
| status | INITIATED, SUCCESS, FAILED, REFUNDED |
| idempotencyKey | Duplicate prevention |
| TTL index | INITIATED payments auto-delete after 24h |

---

#### `models/WalletLedger.ts`
Double-entry accounting for Foodie Coins loyalty system.

**Rule:** Balance = Σ(Credits) − Σ(Debits). Never stored as a snapshot.

| Field | Description |
|---|---|
| userId | Owner |
| direction | Credit \| Debit |
| source | Signup, Booking, Review, PhotoReview, Referral, Redemption, Expiry, AdminAdjustment, Refund, PromoBonus |
| balanceAfter | Point-in-time snapshot |
| expiresAt | 12-month rolling expiry |

---

#### `models/MerchantWallet.ts`
Restaurant owner escrow wallet with T+2 settlement.

| Field | Description |
|---|---|
| availableBalancePaisa | Ready for withdrawal |
| pendingClearancePaisa | T+2 clearing cycle |
| totalEarnedPaisa | Lifetime earnings |
| bankDetails | bankName, accountTitle, accountNumber, IBAN |

---

#### `models/YieldRule.ts`
Owner-defined dynamic pricing automation (read by CRON).

| Field | Description |
|---|---|
| daysOfWeek[] | Which days rule applies |
| timeSlotStart/End | HH:MM range |
| discountPercent | Discount to apply |
| priority | Higher = wins conflicts |
| validFrom/validTo | Date range |

---

#### `models/Story.ts`
Instagram-style 24h restaurant stories.

| Field | Description |
|---|---|
| mediaUrl, mediaType | image \| video |
| likes[], viewsCount, viewers[] | Engagement |
| expiresAt | TTL index: auto-delete after 24h |

---

#### `models/GiftCard.ts`
Digital gift card with PIN-based redemption.

| Field | Description |
|---|---|
| pin (unique) | GC-{nanoid} format |
| originalBalancePaisa (min 10,000) | Face value |
| remainingBalancePaisa | After partial redemptions |
| designTemplate | birthday, eid, corporate, default |
| validTo (default +1 year) | Expiry |
| isCorporate, batchId | Bulk issuance support |

---

#### Other Models (Quick Reference)

| Model | Purpose |
|---|---|
| `MenuItem` | Digital menu items (categories: 20+ types), availability, dietary tags |
| `Deal` | Restaurant bank deals (BIN-matched discounts, daysValid, capPaisa) |
| `Subscription` | User Prime subscriptions (SemiAnnual, Annual), status state machine |
| `SubscriptionPlan` | Admin-configurable plan definitions with benefit types |
| `RestaurantSubscription` | Owner subscription to Prime/Featured plans |
| `Voucher` | Prepay dining voucher with quantity tracking |
| `VoucherPurchase` | Voucher purchase transaction |
| `BankOffer` | BIN-matched bank card discounts |
| `Bank` | Bank master data (logo, colors, card types) |
| `Settlement` | Weekly restaurant financial settlement records |
| `City` | City master with SEO content, geo coords |
| `Area` | Geographic area within city, linked to citySlug |
| `Category` | Restaurant cuisine taxonomy |
| `Banner` | Homepage/city promotional banners |
| `Article` | Blog/content with linked restaurants |
| `TableOrder` | QR-initiated table order (Cart→Placed→Served→Completed) |
| `TimeSlot` | Pre-generated booking slot with yield discount |
| `TableInventory` | Availability snapshot per slot (CRON-generated) |
| `RewardConfig` | Loyalty point configuration per restaurant |
| `PrimeRedemption` | Prime benefit usage history |
| `Waitlist` | User waitlist entries for booked restaurants |
| `ContactLead` | Contact form submissions |
| `SiteReview` | Platform-level user feedback |
| `SeoPage` | Admin-managed SEO content pages |
| `Media` | Uploaded media file tracking |
| `CommissionProfile` | Per-restaurant commission rate tiers |
| `AuditLog` | Immutable security event log |
| `NotificationLog` | Sent email/SMS history |
| `PaymentMethod` | Saved user payment cards |
| `PlatformSettings` | Global platform configuration |
| `BillSubmission` | Post-dining bill submission for FoodiePay |
| `RestaurantInvoice` | Generated restaurant invoices |
| `WithdrawalRequest` | Merchant wallet withdrawal requests |
| `SplitBill` | Multi-user bill splitting |

---

### 3.4 API Routes

#### `routes/v1/auth.ts`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Public | Email/password login → JWT pair |
| POST | `/api/v1/auth/register-user` | Public | User signup with OTP verification |
| POST | `/api/v1/auth/register-owner` | Public | Owner signup with business details |
| POST | `/api/v1/auth/refresh` | Public | Rotate refresh token → new pair |
| POST | `/api/v1/auth/logout` | Public | Invalidate refresh token |
| POST | `/api/v1/auth/send-otp` | Public | Send 6-digit OTP to email (rate: 10/min) |
| POST | `/api/v1/auth/verify-otp` | Public | Verify OTP (rate: 3/5min) |
| POST | `/api/v1/auth/forgot-password` | Public | Send password reset link |
| POST | `/api/v1/auth/reset-password` | Public | Reset password with token |
| POST | `/api/v1/auth/complete-profile` | User | Finish profile setup after signup |
| POST | `/api/v1/auth/impersonate` | Admin | Impersonate any user for testing |

---

#### `routes/v1/restaurants.ts`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/restaurants` | Public | List restaurants (city/cuisine/vibe/priceRange/search filters, paginated) |
| GET | `/api/v1/restaurants/admin` | Admin | All restaurants regardless of status (search, status filter) |
| GET | `/api/v1/restaurants/:slug` | Public | Single restaurant detail by slug |
| GET | `/api/v1/restaurants/id/:id` | Owner | Restaurant by ObjectId (owner dashboard) |
| GET | `/api/v1/restaurants/nearby` | Public | Geo-search by lat/lng (2dsphere) |
| POST | `/api/v1/restaurants` | Admin/Owner | Create restaurant |
| PUT | `/api/v1/restaurants/:id` | Admin/Owner | Update restaurant |
| DELETE | `/api/v1/restaurants/:id` | Admin | Delete restaurant |
| PATCH | `/api/v1/restaurants/update-all-dates` | Admin | Bulk update all restaurants' updatedAt (single DB call) |
| POST | `/api/v1/restaurants/:id/follow` | User | Follow / unfollow restaurant |
| GET | `/api/v1/restaurants/:id/follow-status` | User | Check follow status |

---

#### `routes/v1/reservations.ts`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/reservations` | User | Create reservation (3-min Draft hold) |
| GET | `/api/v1/reservations/my` | User | User's reservation history (paginated) |
| GET | `/api/v1/reservations/restaurant/:restaurantId` | Owner/Admin | Restaurant reservations |
| GET | `/api/v1/reservations/:id` | User | Single reservation detail |
| PATCH | `/api/v1/reservations/:id/status` | Owner/Admin | State machine transitions |
| PATCH | `/api/v1/reservations/:id/cancel` | Any | Cancel reservation |

---

#### `routes/v1/payments.ts`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/payments/initiate` | User | Create JazzCash payment, return form data |
| POST | `/api/v1/payments/callback` | Public | PayFast webhook (idempotent) |
| GET | `/api/v1/payments/:txnRefNo` | User | Check payment status |
| POST | `/api/v1/payments/:txnRefNo/refund` | Admin | Issue refund |

---

#### `routes/v1/reviews.ts`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/reviews/:restaurantId` | Public | Restaurant reviews (paginated, sortable) |
| POST | `/api/v1/reviews` | User/Guest | Submit review with photo support |
| GET | `/api/v1/reviews/:id` | Public | Single review detail |
| PATCH | `/api/v1/reviews/:id` | User | Edit own review |
| POST | `/api/v1/reviews/:id/helpful` | Public | Mark review helpful |
| POST | `/api/v1/reviews/:id/reply` | Owner/Admin | Owner reply to review |

---

#### `routes/v1/deals.ts`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/deals` | Public | List active deals (filterable) |
| GET | `/api/v1/deals/:id` | Public | Deal detail |
| POST | `/api/v1/deals` | Owner/Admin | Create deal |
| PUT | `/api/v1/deals/:id` | Owner/Admin | Update deal |
| DELETE | `/api/v1/deals/:id` | Owner/Admin | Deactivate deal |

---

#### Other Route Files (Quick Reference)

| Route File | Key Endpoints |
|---|---|
| `menu-items.ts` | GET (public), POST/PUT/DELETE (owner), bulk insert/sort, AI extract |
| `categories.ts` | GET list (cached), POST create (admin) |
| `cities.ts` | GET list, GET /:slug with SEO content |
| `areas.ts` | GET ?citySlug=X, GET /:slug |
| `banks.ts` | GET list (logos, card types) |
| `banners.ts` | GET ?citySlug=X, POST create (admin) |
| `articles.ts` | GET list (paginated), GET /:slug, POST create (admin) |
| `search.ts` | GET ?q=keyword (Fuse.js), GET /sitemap-data |
| `users.ts` | GET/PUT /me, GET /:username, POST check-username |
| `profiles.ts` | GET /:username, GET /:username/reviews |
| `subscriptions.ts` | GET plans, GET me, POST purchase, POST cancel |
| `restaurant-subscriptions.ts` | GET, GET /my, POST purchase, PATCH status |
| `wallet.ts` | GET balance, GET ledger, POST redeem |
| `home.ts` | GET /feed, GET /banners |
| `yield-rules.ts` | CRUD for dynamic pricing rules |
| `yield-calendar.ts` | GET calendar view of discounts |
| `table-orders.ts` | POST create, GET /:orderCode, PATCH status |
| `waitlist.ts` | POST join, GET /my |
| `referrals.ts` | GET stats, POST apply |
| `rewards.ts` | GET config, POST claim |
| `analytics.ts` | GET restaurant/:id, GET platform (admin) |
| `owners.ts` | GET /me, POST update, GET /:id/restaurants |
| `commissions.ts` | GET list, POST create (admin) |
| `settlements.ts` | GET list, GET /:id, PATCH approve (admin) |
| `escrow.ts` | GET balance, POST transfer |
| `discounts.ts` | GET available discounts at checkout |
| `surge.ts` | GET /:restaurantId surge status |
| `split-bill.ts` | POST create, GET /:id, PATCH settle |
| `booking-settings.ts` | GET /:restaurantId, PUT update (owner) |
| `booking-slots.ts` | GET available slots, GET calendar view |
| `bills.ts` | POST submit, GET /:id, PATCH pay |
| `merchant-wallet.ts` | GET balance, GET ledger, POST withdraw |
| `payment-methods.ts` | GET list, POST add, DELETE remove |
| `virtual-tour.ts` | GET /:id, POST upload panorama, POST hotspot |
| `branch-auth.ts` | POST unlock POS device |
| `stories.ts` | GET list, POST upload, POST like, DELETE |
| `media.ts` | POST upload (CDN integration), DELETE |
| `contact-leads.ts` | POST submit form, GET list (admin) |
| `seo-pages.ts` | GET /:slug, POST create, PUT update |
| `site-reviews.ts` | GET list, POST submit |
| `settings.ts` | GET platform settings, PUT update (admin) |

---

### 3.5 Controllers

#### `controllers/ProfileController.ts`
| Function | Description |
|---|---|
| `generateUniqueUsername(name, id)` | Generates slug-based username with collision-safe suffix |
| `checkUsernameAvailability(req, res)` | API handler: username availability check with reserved word list |
| `checkRestaurantNameAvailability(req, res)` | Checks restaurant name uniqueness per city |

#### `controllers/RestaurantFollowController.ts`
| Function | Description |
|---|---|
| `checkFollowRateLimit(userId, restaurantId)` | Anti-spam: 1 toggle/3s per restaurant, 30/min global |
| `toggleFollowRestaurant(req, res)` | Atomic follow/unfollow with followerCount update |
| `checkFollowStatus(req, res)` | Returns whether user follows a restaurant |

---

### 3.6 Services

#### `services/auth-service.ts`
| Function | Description |
|---|---|
| `hashPassword(plain)` | bcrypt hash (cost: 12) |
| `verifyPassword(plain, hash)` | bcrypt compare |
| `hashRefreshToken(token)` | SHA-256 hash for DB storage |
| `generateAccessToken(payload)` | 24h JWT |
| `generateRefreshToken(payload)` | 90d JWT |
| `generateTokenPair(payload)` | Returns {accessToken, refreshToken, accessExpiresIn} |
| `verifyAccessToken(token)` | Decode + verify JWT |
| `verifyRefreshToken(token)` | Decode refresh, return userId |

---

#### `services/email-service.ts`
| Function | Description |
|---|---|
| `sendOTPEmail(to, code)` | 5-minute expiry OTP with branded HTML template |
| `sendPasswordResetEmail(to, token)` | Password reset link |
| `sendAdminAlertEmail(to, message)` | Security alerts to admin |

---

#### `services/wallet-service.ts`
| Function | Description |
|---|---|
| `generateReferralCode(userId)` | FP + 6 hex chars, unique, stored on User |
| `creditCoins(userId, source, description, amount)` | Add loyalty coins to WalletLedger |
| `debitCoins(userId, amount, reason)` | Deduct coins; returns false if insufficient |

---

#### `services/otp-service.ts`
| Function | Description |
|---|---|
| `generateOTP()` | 6-digit numeric OTP |
| `storeOTP(email, code)` | Redis storage, 5-minute TTL |
| `verifyOTP(email, code)` | Verify and consume (one-time use) |

---

#### `services/cron-jobs.ts`
| Job | Schedule | Description |
|---|---|---|
| `clearPendingFunds` | Daily 6:00 AM | Move T+2 cleared funds to available merchant balance |
| `expireFoodiePayBills` | Every hour | Mark unpaid FoodiePay bills after 24h |
| `generateWeeklySettlements` | Sunday midnight | Auto-generate restaurant weekly settlement records |
| `expireOldHeldReservations` | Every 5 min | Release expired Draft slot holds |

---

#### `services/fuse-search.ts`
| Function | Description |
|---|---|
| `refreshSearchIndex()` | Load all restaurants into Fuse.js in-memory index |
| `startSearchIndexRefresh()` | Auto-refresh index every 5 minutes |

---

#### `services/security-logger.ts`
| Function | Description |
|---|---|
| `logSecurityEvent(event)` | Write to AuditLog collection |
| `getClientIP(req)` | Extract IP with X-Forwarded-For proxy support |

---

#### `services/payment/payfast.ts`
| Function | Description |
|---|---|
| `initiatePayment(params)` | Create PayFast payment form data |
| `verifyCallbackSignature(sig, data)` | Validate webhook HMAC signature |
| `isTransactionSuccessful(response)` | Check payment success status |

---

### 3.7 Utilities

#### `utils/api-response.ts`
| Function | Description |
|---|---|
| `successResponse(res, data, statusCode?)` | `{success: true, data}` |
| `errorResponse(res, error, statusCode, code?)` | `{success: false, error, code?}` |
| `paginatedResponse(res, data, total, page, limit)` | `{success: true, data, pagination: {total, page, limit, totalPages, hasMore}}` |

#### `utils/redis-cache.ts`
| Function | Description |
|---|---|
| `withRedisCache(key, ttl, fn)` | Execute async function, cache result with TTL |
| `invalidateCache(key)` | Delete cached key |

---

## 4. Frontend (Next.js 15)

### 4.1 Root Configuration

#### `auth.ts` — NextAuth Configuration
| Export | Description |
|---|---|
| `auth` | Session accessor (server-side) |
| `signIn` | Programmatic login |
| `signOut` | Logout and session clear |
| `handlers` | GET/POST handlers for `[...nextauth]` route |
| `unstable_update` | Update session without re-login |

**Features:**
- Token-based login for post-registration auto-signin
- Proactive token refresh 5 min before expiry
- Mutex lock prevents race-condition double-refresh
- Session persistence: 30 days
- Role-based route protection (admin, owner, user)
- Force logout on `RefreshTokenExpired` error

---

### 4.2 Library (`lib/`)

| File | Key Exports | Description |
|---|---|---|
| `utils.ts` | `cn()`, `getDeviceId()`, `formatPaisa()` | Tailwind merge, device fingerprint, PKR formatter |
| `api-client.ts` | `apiClient(path, options)` | HTTP client proxying to Core API; auto-refresh on 401; Redis GET caching |
| `api-route-guards.ts` | `requireAdmin()`, `requireOwner()`, `requireUser()`, `requireAnyAuth()`, `requireSession()` | Role guards returning GuardResult for API routes |
| `constants.ts` | `FACILITIES`, `VIBES`, `SERVICE_TYPES` | Restaurant attribute enums with label mappings |
| `redis-cache.ts` | `redis`, `withRedisCache(key, fetcher, ttl, staleTolerance)` | Stale-While-Revalidate caching; background refresh; Redis graceful degradation |
| `public-site-settings.ts` | `getPublicSiteSettings(ttl)` | Fetch+cache site branding, logo, social links |
| `sitemap-builder.ts` | `fetchSitemapData()`, `buildUrlsetXml()`, `addEntry()`, `buildCitySlugMap()`, `buildActiveCombinations()` | Full XML sitemap generation pipeline |
| `sitemap-utils.ts` | `toLastModified()`, `normalizePath()`, `buildSiteUrl()`, `deriveCitySlug()` | Sitemap URL helpers |
| `get-open-status.ts` | `getOpenStatus(openingHours)` | Compute open/closed status from hours array |
| `deals-archive.ts` | — | Bank deals filtering logic |
| `restaurant-faqs.ts` | — | Restaurant FAQ data structure |
| `blur-data-url.ts` | — | Blur placeholder base64 for next/image |
| `auth-redirect.ts` | — | Post-login redirect helpers |
| `api-proxy.ts` | — | HTTP proxy utilities for API routes |
| `api-route-error.ts` | `toApiErrorResponse(error, fallback)` | Standardized API error response formatter |

---

### 4.3 Hooks

#### `hooks/use-mobile.ts`
| Export | Description |
|---|---|
| `useIsMobile()` | Returns `boolean` — true if viewport < 768px (media query hook) |

#### `hooks/use-login-guard.ts`
| Export | Description |
|---|---|
| `useLoginGuard(loginType)` | Math CAPTCHA + IP rate limiting. Returns: blocked, attemptsRemaining, blockedUntil, mathQuestion, captchaInput, setCaptchaInput, validateCaptcha(), recordFailure(), recordSuccess(), warningMessage |

---

### 4.4 Pages

#### Public Pages `app/(main)/`

| Route | File | Description |
|---|---|---|
| `/` | `page.tsx` | **Homepage** — Banners, stories, categories, featured restaurants, bank deals carousel, articles, FAQ, admin-editable HTML content. ISR 60s |
| `/[city]` | `[city]/page.tsx` | **City Landing** — Restaurant archive for selected city |
| `/[city]/[slug]` | `[...slug]/page.tsx` | **Restaurant Detail** — Menu, reviews, booking, gallery, virtual tour. Dynamic route for restaurant/archive/combo views |
| `/[city]/deals` | `deals/page.tsx` | **Bank Deals Archive** — All active deals with filter |
| `/[city]/deals/[bankSlug]` | `deals/[bankSlug]/page.tsx` | **Bank-specific deals** |
| `/about-us` | `about-us/page.tsx` | Static about page with admin-editable content |
| `/account` | `account/page.tsx` | User login/signup with OTP and CAPTCHA |
| `/account/payment-methods` | `payment-methods/page.tsx` | Saved card management |
| `/articles` | `articles/page.tsx` | Blog listing |
| `/articles/[slug]` | `[slug]/page.tsx` | Article detail with JSON-LD schema |
| `/contact-us` | `contact-us/page.tsx` | Contact form |
| `/disclaimer` | `disclaimer/page.tsx` | Static page |
| `/foodiepay` | `foodiepay/page.tsx` | FoodiePay overview |
| `/foodiepay/pay` | `pay/page.tsx` | FoodiePay single payment |
| `/foodiepay/split` | `split/page.tsx` | Split bill flow |
| `/forgot-password` | `forgot-password/page.tsx` | Password reset request |
| `/my-bookings` | `my-bookings/page.tsx` | Reservation history (upcoming/past tabs, cancel, pay bill) |
| `/my-reviews` | `my-reviews/page.tsx` | User's posted reviews |
| `/near-me` | `near-me/page.tsx` | Geolocation nearby search |
| `/order/[slug]` | `order/[slug]/page.tsx` | QR-based table order interface |
| `/payment/success` | `success/page.tsx` | Payment success confirmation |
| `/payment/failed` | `failed/page.tsx` | Payment failure page |
| `/payment-options` | `payment-options/page.tsx` | Payment method selection |
| `/prime` | `prime/page.tsx` | Prime subscription landing |
| `/privacy-policy` | `privacy-policy/page.tsx` | Static legal page |
| `/profile/[username]` | `[username]/page.tsx` | Public user profile (reviews, badges) |
| `/refer` | `refer/page.tsx` | Referral program |
| `/saved` | `saved/page.tsx` | Bookmarked restaurants |
| `/terms-conditions` | `terms-conditions/page.tsx` | Static legal page |
| `/wallet` | `wallet/page.tsx` | Coin balance + transaction history |

---

#### Admin Panel `app/moezlogin/`

| Page | Description |
|---|---|
| `/moezlogin` | **Dashboard** — Stats overview (restaurants, users, reviews, revenue) |
| `/moezlogin/articles` | Article CMS — create, edit, publish |
| `/moezlogin/banks` | Bank master data management |
| `/moezlogin/banners` | Homepage/city banner management |
| `/moezlogin/categories` | Restaurant category taxonomy |
| `/moezlogin/cities` | City management with SEO content editor |
| `/moezlogin/contact-leads` | Contact form submissions inbox |
| `/moezlogin/deals` | Restaurant deal management |
| `/moezlogin/finance` | Financial analytics and reporting |
| `/moezlogin/media` | Media library browser |
| `/moezlogin/owners` | Owner application review and approval |
| `/moezlogin/posts` | Content posts management |
| `/moezlogin/reservations` | Platform-wide reservation analytics |
| `/moezlogin/restaurants` | Restaurant moderation (approve, feature, edit, **Update All Dates** button) |
| `/moezlogin/reviews` | Review moderation and flagging |
| `/moezlogin/rewards` | Loyalty reward program configuration |
| `/moezlogin/settings` | Platform settings (branding, commission rates, feature flags) |
| `/moezlogin/site-reviews` | Customer platform reviews aggregation |
| `/moezlogin/subscriptions` | Prime subscription management |
| `/moezlogin/users` | User management and admin actions |

---

#### Owner Dashboard `app/owner/`

| Page | Description |
|---|---|
| `/owner` | **Dashboard** — Revenue, bookings, reviews summary |
| `/owner/bank-details` | Bank account info for settlements |
| `/owner/bookings` | Reservation management (confirm, seat, complete, cancel) |
| `/owner/deals` | Create and manage bank card deals |
| `/owner/gallery` | Photo gallery uploader |
| `/owner/menu` | Digital menu editor (drag-drop, AI review, bulk upload) |
| `/owner/new-branch` | Add a new branch to existing brand |
| `/owner/prime` | Prime partnership subscription |
| `/owner/prime-verify` | QR-based Prime membership verification at door |
| `/owner/profile` | Restaurant profile editor (SEO, hours, attributes) |
| `/owner/reviews` | Review management + owner replies |
| `/owner/settlements` | Weekly payment settlement tracking |
| `/owner/stories` | Instagram-style story uploader (24h TTL) |
| `/owner/table-management` | Table inventory and capacity |
| `/owner/timings` | Operating hours editor with special overrides |
| `/owner/virtual-tour` | 360° tour manager |
| `/owner/virtual-tour/hotspot-editor` | Hotspot placement editor |
| `/owner/vouchers` | Digital dining vouchers |
| `/owner/yield` | Dynamic pricing rules (yield management) |

---

### 4.5 Frontend API Routes (Proxy Layer)

All Next.js API routes proxy authenticated calls to the Core backend. Auth is checked via NextAuth session.

#### Auth Routes
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/[...nextauth]` | NextAuth handler |
| POST | `/api/auth/register` | User registration proxy |
| POST | `/api/auth/send-otp` | OTP sending |
| POST | `/api/auth/verify-otp` | OTP verification |
| POST | `/api/auth/login-guard` | CAPTCHA + rate limit record |
| POST | `/api/auth/forgot-password` | Reset link |
| POST | `/api/auth/reset-password` | Confirm reset |
| POST | `/api/auth/impersonate` | Admin impersonation |

#### Restaurant Routes
| Method | Route | Description |
|---|---|---|
| GET | `/api/restaurants/admin` | Admin restaurant list |
| PUT | `/api/restaurants/admin` | Update restaurant |
| POST | `/api/restaurants/admin` | Create restaurant |
| DELETE | `/api/restaurants/admin` | Delete restaurant |
| PATCH | `/api/restaurants/admin` | **Bulk update all dates** (update-all-dates) |
| GET | `/api/restaurants/load-more` | Pagination |
| GET | `/api/restaurants/nearby` | Geolocation search |
| GET | `/api/restaurants/[slug]/slots` | Available slots |

#### Reservation Routes
| Method | Route | Description |
|---|---|---|
| POST | `/api/reservations/hold` | Create reservation hold |
| GET | `/api/reservations/my` | User's bookings |
| GET/PATCH | `/api/reservations/[id]` | Detail + status update |

#### Review Routes
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/reviews` | List + create |
| POST | `/api/reviews/upload` | Upload review images |
| POST | `/api/reviews/[id]/reply` | Owner reply |
| GET/POST | `/api/site-reviews` | Platform reviews |

#### Owner Routes
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/owner/restaurant` | Owner restaurant CRUD |
| GET | `/api/owner/reservations` | Restaurant reservations |
| GET | `/api/owner/analytics/[restaurantId]` | Analytics data |
| GET/POST | `/api/owner/deals` | Deal management |
| GET/POST | `/api/owner/booking-settings` | Booking config |
| GET/POST | `/api/owner/yield-rules` | Dynamic pricing |
| GET | `/api/owner/yield-calendar` | Yield calendar |
| POST | `/api/owner/bills/submit` | Submit post-dining bill |

#### Sitemap Routes
| Route | Content |
|---|---|
| `/sitemap-index.xml` | Master index of all sitemaps |
| `/sitemap-restaurants.xml` | All restaurant URLs with lastmod |
| `/sitemap-cities.xml` | City pages |
| `/sitemap-areas.xml` | Area pages |
| `/sitemap-categories.xml` | Category pages |
| `/sitemap-deals.xml` | Deal pages |
| `/sitemap-pages.xml` | Static + SEO pages |

---

### 4.6 Components

#### UI Shell Components
| Component | Description |
|---|---|
| `ui-shell/app-header.tsx` | Main nav with city selector, search bar, user menu, auth state |
| `ui-shell/bottom-nav.tsx` | Mobile bottom tab navigation (4 tabs) |
| `ui-shell/footer.tsx` | Footer with links, social icons, branding |
| `ui-shell/animated-logo.tsx` | Animated brand logo component |

#### Restaurant Components
| Component | Description |
|---|---|
| `restaurant/restaurant-detail-client.tsx` | Main restaurant page: tabs (overview, menu, reviews, gallery), booking widget |
| `restaurant/restaurant-menu.tsx` | Categorized digital menu display |
| `restaurant/restaurant-reviews-tab.tsx` | Reviews list with filter/sort, pagination |
| `restaurant/restaurant-gallery.tsx` | Categorized photo gallery with lightbox |
| `restaurant/review-modal.tsx` | Star rating + text review submission modal |
| `restaurant/follow-button.tsx` | Heart button — follow/unfollow with optimistic update |
| `restaurant/dynamic-open-badge.tsx` | Real-time open/closed status badge |
| `restaurant/lightbox.tsx` | Custom full-screen image viewer |
| `restaurant/similar-card.tsx` | Compact restaurant card for "Similar restaurants" |
| `restaurant/time-deals.tsx` | Time-based discount deals display |
| `restaurant/vouchers.tsx` | Voucher display and purchase flow |
| `restaurant/cuisines-link.tsx` | Clickable cuisine filter tags |
| `restaurant/location-button.tsx` | "Get Directions" map launcher |

#### Archive/Search Components
| Component | Description |
|---|---|
| `archive/filter-sidebar.tsx` | Filter panel (cuisine, area, rating, price, facilities) |
| `archive/restaurant-grid.tsx` | Responsive grid of restaurant cards |
| `archive/archive-map.tsx` | Map view with Leaflet clustering |
| `archive/archive-map-inner.tsx` | Leaflet map internals |
| `archive/archive-map-toggle.tsx` | List ↔ Map view toggle |
| `archive/mobile-archive-controls.tsx` | Mobile-optimized filter/sort sheet |
| `archive/deals-filter-sidebar.tsx` | Bank/card type filter for deals |
| `archive/nearby-page-content.tsx` | Geolocation-based restaurant results |

#### Owner Components
| Component | Description |
|---|---|
| `owner/digital-menu-manager.tsx` | Drag-drop menu editor with category management |
| `owner/menu-item-editor.tsx` | Single menu item form (price, dietary tags, availability) |
| `owner/ai-menu-review-modal.tsx` | GPT-powered menu review from image |
| `owner/Guided360Camera.tsx` | Mobile camera controller for 360° capture |
| `owner/branch-map.tsx` | Leaflet map for branch GPS coordinate selection |
| `owner/branch-selector.tsx` | Multi-branch switcher dropdown |
| `owner/image-gallery-modal.tsx` | CDN image picker modal |

#### Admin Components
| Component | Description |
|---|---|
| `admin/admin-login.tsx` | Admin login form with math CAPTCHA |
| `admin/app-sidebar.tsx` | Collapsible admin sidebar nav |
| `admin/data-table.tsx` | Reusable sortable/filterable data table |
| `admin/admin-booking-modal.tsx` | Manual booking creation on behalf of user |

#### Story Components
| Component | Description |
|---|---|
| `stories/StoryFeed.tsx` | Horizontal story ring carousel (followed restaurants) |
| `stories/StoryRing.tsx` | Single story ring with seen/unseen indicator |
| `stories/StoryViewer.tsx` | Full-screen story viewer with progress bar |

#### Popup Components
| Component | Description |
|---|---|
| `review-popup.tsx` | Floating post-visit review prompt widget |
| `prime-popup.tsx` | Prime subscription upsell popup |
| `review-schema.tsx` | Injects Review JSON-LD structured data |

#### Map Components
| Component | Description |
|---|---|
| `map/map-view.tsx` | Restaurant location map (Leaflet) |
| `archive/archive-map-inner.tsx` | Clustered map for archive pages |

#### Shared Components
| Component | Description |
|---|---|
| `shared/VirtualTourViewer.tsx` | Pannellum.js 360° tour embed |
| `search/search-dropdown.tsx` | Typeahead search results dropdown |
| `subscription/totp-qr.tsx` | QR code display for Prime verification |
| `profile/profile-client-tabs.tsx` | User profile tab switcher |
| `components/providers.tsx` | SessionProvider + QueryClient + AuthModal + ImpersonateHandler |

---

## 5. FastAPI (Python Microservice)

**Purpose:** 360° VR Tour capture, stitching, and serving  
**Port:** 8500  
**Dependencies:** FastAPI, Uvicorn, OpenCV, Pillow, httpx, Jinja2

### 5.1 App Setup (`main.py`)

| Feature | Description |
|---|---|
| Route prefix | `/vr-tour` |
| CORS | Configurable origins from env |
| Static files | `/static` → `static/` directory |
| Health check | `GET /health` → `{status: "ok", version}` |
| Startup | CDN health check on boot |
| Error handling | Global exception handler with JSON response |

---

### 5.2 Security (`common/security.py`)

| Function | Description |
|---|---|
| `create_capture_token(restaurant_id, user_id, scene_name, callback_url)` | HMAC-SHA256 signed token: `base64(payload).signature`. Payload: {rid, uid, sid, name, cb, exp} |
| `verify_capture_token(token)` | Verify signature + expiry + anti-replay. Returns payload or None |
| `mark_session_used(session_id, expiry)` | Register session ID to prevent replay attacks |
| `verify_internal_secret(secret)` | Constant-time comparison for service auth |
| `_cleanup_expired_sessions()` | Hourly cleanup of expired session IDs |

---

### 5.3 VR Tour Routes (`modules/vr_tour/routes.py`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/vr-tour/api/create-session` | Internal secret | Create capture session, return signed URL for owner's phone |
| GET | `/vr-tour/capture/{token}` | Token verification | Serve Guided 360° Capture UI (HTML) to mobile |
| POST | `/vr-tour/api/upload-frame` | Session | Upload single capture frame (max 8MB, max 40 frames) |
| POST | `/vr-tour/api/complete-capture` | Session | Trigger async stitching pipeline (min 8 frames) |
| GET | `/vr-tour/api/status/{session_id}` | Public | Poll stitching/upload progress |
| GET | `/vr-tour/processing/{session_id}` | Public | Serve progress HTML page |
| GET | `/vr-tour/view/{restaurant_id}` | Public | Serve Pannellum.js viewer to customers |

**Background Pipeline (`_process_session`):**
1. Sort frames by index
2. Stitch with OpenCV (PANORAMA mode)
3. Upload panorama + thumbnail to CDN
4. POST to Node.js backend `/api/v1/virtual-tour/{id}/save-tour`
5. Set session status: `done` or `failed`

---

### 5.4 Panorama Stitcher (`modules/vr_tour/stitcher.py`)

| Method | Description |
|---|---|
| `stitch(image_paths, output_dir, quality=88)` | Full stitching pipeline: load → resize (max 2400px) → OpenCV stitch → crop borders → save WebP + thumbnail |
| `_crop_black_borders(img)` | Detects and crops stitching artifacts (> 2% of image) |

**Error Codes:**
- Code 1: Not enough overlapping features
- Code 2: Cannot estimate camera geometry  
- Code 3: Camera adjustment failed

---

### 5.5 CDN Client (`modules/vr_tour/cdn_client.py`)

| Method | Description |
|---|---|
| `upload_image(file_path, filename, slug)` | POST multipart to CDN `/api/media/upload` with `x-cdn-key`. Timeout: 120s |
| `health_check()` | GET `/health` — Returns bool |

---

## 6. CDN (Node.js Image Server)

**Purpose:** Self-hosted media server with WebP conversion and immutable caching  
**Port:** 3001  
**Dependencies:** Express, Sharp, Multer, Helmet, nanoid

### 6.1 Server Setup (`src/index.ts`)

| Feature | Description |
|---|---|
| Static serving | `/uploads/*` → immutable cache (365 days, ETag + Last-Modified) |
| Security | Helmet with cross-origin policy |
| Health check | `GET /health` → `{status: "ok", uptime, memory}` |
| Trust proxy | Enabled for nginx/reverse proxy rate limiting |

---

### 6.2 Media Routes (`routes/media.ts`)

#### `POST /api/media/upload`
Full middleware chain: Rate limit → Auth guard → Multer → Magic byte check → Sharp → Disk write

| Input | Description |
|---|---|
| `image` or `media` field | File (image or video) |
| `slug` | SEO-friendly slug (required, min 2 chars) |
| `originalFilename` | Optional, used for SEO filename |

| Output | Description |
|---|---|
| `url` | Full CDN URL |
| `thumbUrl` | Thumbnail CDN URL |
| `width`, `height` | Image dimensions |
| `sizeBytes`, `thumbSizeBytes` | File sizes |
| `format` | Detected format (JPEG, PNG, WebP, etc.) |
| `type` | image \| video |

---

#### `DELETE /api/media/delete`
- Auth: `x-cdn-key` required
- Body: `{filename}`
- Deletes file and `-thumb` variant
- Idempotent (200 even if not found)

#### `GET /api/media/list`
- Auth: `x-cdn-key` required
- Query: `page`, `limit` (max 100)
- Returns paginated file list with URLs and metadata

---

### 6.3 Image Processor (`services/image-processor.ts`)

**Function: `processImage(buffer, slug, uploadDir, originalFilename?)`**

| Step | Action |
|---|---|
| 1 | Resize to max 1920px width (aspect preserved, no upscaling) |
| 2 | Convert to WebP quality 80, effort 4 |
| 3 | Save full-size with nanoid(8) filename |
| 4 | Resize thumbnail to 400px, WebP quality 70 |
| 5 | Save thumbnail with `-thumb` suffix |

**Filename pattern:** `{sanitized-slug}-{nanoid8}.webp`

---

### 6.4 File Signature Validator (`utils/file-signature.ts`)

**Function: `validateFileSignature(buffer)` → `{valid, format, type}`**

Validates magic bytes (not MIME type) to prevent executable uploads:

| Format | Magic Bytes |
|---|---|
| JPEG | `FF D8 FF` |
| PNG | `89 50 4E 47 0D 0A 1A 0A` |
| WebP | `52 49 46 46` + `57 45 42 50` at offset 8 |
| GIF | `47 49 46 38` |
| MP4 | `66 74 79 70` at offset 4 |
| WebM | `1A 45 DF A3` |
| MOV | `6D 6F 6F 76` at offset 4 |

---

### 6.5 Middleware

#### `middleware/auth-guard.ts`
| Header | Value | Behavior |
|---|---|---|
| `x-cdn-key` | Missing | 401 Unauthorized |
| `x-cdn-key` | Invalid | 403 Forbidden |
| `x-cdn-key` | Correct | Pass (constant-time compare) |

#### `middleware/rate-limiter.ts`
- Window: 60 seconds
- Limit: 30 uploads/window/IP
- Key: X-Forwarded-For or socket IP

---

## 7. Inter-Service Communication

```
┌─────────────────────────────────────────────────────────┐
│                    FOODIES PAKISTAN                      │
│                                                          │
│   Browser/Mobile                                         │
│       │                                                  │
│       ▼                                                  │
│   ┌──────────┐    HTTP Proxy    ┌──────────┐            │
│   │ Frontend │ ────────────────► │ Backend  │            │
│   │ Next.js  │   JWT Bearer     │ Express  │            │
│   │ :3000    │ ◄──────────────── │ :4000    │            │
│   └──────────┘   JSON Response  └────┬─────┘            │
│                                      │                   │
│                              x-app-internal-secret       │
│                                      │                   │
│                          ┌───────────▼──────────┐        │
│                          │  FastAPI Microservice │        │
│                          │  Python + OpenCV     │        │
│                          │  :8500               │        │
│                          └───────────┬──────────┘        │
│                                      │                   │
│                               x-cdn-key                  │
│                                      │                   │
│                          ┌───────────▼──────────┐        │
│                          │   CDN Server         │        │
│                          │   Node.js + Sharp    │        │
│                          │   :3001              │        │
│                          └──────────────────────┘        │
│                                                          │
│   ┌──────────┐    x-cdn-key      ┌──────────────┐       │
│   │ Backend  │ ─────────────────► │ CDN Server   │       │
│   │          │ ◄───────────────── │              │       │
│   └──────────┘    {url, thumbUrl} └──────────────┘       │
└─────────────────────────────────────────────────────────┘
```

| From | To | Auth Header | Usage |
|---|---|---|---|
| Frontend (Next.js) | Backend (Express) | `Authorization: Bearer JWT` | All authenticated API calls |
| Backend | FastAPI | `x-app-internal-secret` | Trigger VR tour session creation |
| FastAPI | Backend | `x-app-internal-secret` | Save completed tour data |
| Backend | CDN | `x-cdn-key` | Upload restaurant images |
| FastAPI | CDN | `x-cdn-key` | Upload panoramas and thumbnails |
| Frontend API Routes | Backend | `Authorization: Bearer JWT` | Server-side proxy calls |

---

## 8. Environment Configuration

### Backend (`.env`)
```env
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb://127.0.0.1:27017/foodiespk
JWT_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
CDN_BASE_URL=https://cdn.foodiespakistan.pk
CDN_API_KEY=<cdn api key>
REDIS_URL=redis://127.0.0.1:6379
CORS_ORIGINS=https://foodiespakistan.pk,https://www.foodiespakistan.pk
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@foodiespakistan.pk
SMTP_PASS=<app password>
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
TWILIO_FROM=+1234567890
PAYFAST_MERCHANT_ID=<id>
PAYFAST_MERCHANT_KEY=<key>
PAYFAST_PASSPHRASE=<passphrase>
VR_TOUR_URL=http://localhost:8500
APP_INTERNAL_SECRET=<min 32 chars>
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_SITE_URL=https://foodiespakistan.pk
CORE_API_URL=http://localhost:4000/api/v1
NEXTAUTH_URL=https://foodiespakistan.pk
NEXTAUTH_SECRET=<min 32 chars>
REDIS_URL=redis://127.0.0.1:6379
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### FastAPI (`.env`)
```env
PORT=8500
ENV=production
VR_TOUR_SECRET=<min 16 chars>
INTERNAL_SECRET=<min 16 chars>
ALLOWED_ORIGINS=https://foodiespakistan.pk,http://localhost:4000
CDN_BASE_URL=https://cdn.foodiespakistan.pk
CDN_API_KEY=<cdn api key>
API_BASE_URL=http://localhost:4000
MAX_SESSIONS_PER_HOUR=5
MAX_FRAMES_PER_SESSION=40
MAX_SCENES_PER_RESTAURANT=20
CAPTURE_TOKEN_EXPIRY_MINUTES=20
MAX_FRAME_SIZE_MB=8
PANORAMA_QUALITY=88
THUMBNAIL_WIDTH=640
```

### CDN (`.env`)
```env
PORT=3001
NODE_ENV=production
CDN_PUBLIC_URL=https://cdn.foodiespakistan.pk
CDN_API_KEY=<api key>
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
WEBP_QUALITY=80
MAX_WIDTH=1920
THUMB_WIDTH=400
CORS_ORIGINS=https://foodiespakistan.pk,http://localhost:4000,http://localhost:8500
```

---

## 9. Architecture Patterns & Conventions

### 💰 Monetary Values
All currency stored as **Paisa** (integer). 1 PKR = 100 Paisa. Never floats.  
Example: PKR 2,500 = `250000` in database.

---

### 🔐 Authentication Strategy
```
Access Token:  24h JWT  (long for UX, short enough for security)
Refresh Token: 90d JWT  (hashed with SHA-256 before DB storage)
Password:      bcrypt   (cost factor: 12)
Internal:      x-app-internal-secret header (service-to-service)
```
- Brute force: 5 failed logins → 1 hour account lock
- Admin lockout triggers email alert

---

### 🏷️ Authorization (RBAC)
Three roles: `user` | `owner` | `admin`  
Factory pattern: `authorize("admin", "owner")` returns middleware

---

### ⚡ Rate Limiting
Redis-backed per-IP limits:
- Auth endpoints: 10 req/min
- General API: 100 req/min  
- OTP verification: 3 req/5min
- CDN uploads: 30/min

---

### 🔄 Reservation State Machine
```
Draft ──(owner confirms)──► Confirmed ──(guest arrives)──► Seated ──(meal done)──► Completed
  │                              │
  ├──(3 min hold expires)──► [auto released]
  └──(cancel)──► CancelledByUser / CancelledByOwner
                 Confirmed ──(no show)──► NoShow
```

---

### 💸 Discount Stacking System (FoodiePay)
4-layer discount system:
1. **Yield discount** — Time-based dynamic pricing (owner-defined rules)
2. **Prime discount** — Subscription benefit
3. **Bank card discount** — BIN-matched bank offers
4. **Coins redemption** — Loyalty coins → PKR

**Modes:**
- `exclusive` — Choose highest single discount
- `stacked` — Apply all sequentially (capped at restaurant's maxStackedDiscountPercentage)

---

### 📅 CRON Jobs
| Job | Schedule | Action |
|---|---|---|
| Clear pending funds | Daily 6:00 AM | T+2 merchant balance settlement |
| Expire FoodiePay bills | Every hour | Mark 24h-old bills as expired |
| Generate settlements | Sunday midnight | Create weekly restaurant settlement records |
| Release held slots | Every 5 min | Free expired Draft reservation holds |

---

### 🔍 Search Architecture
- **Fuse.js** in-memory fuzzy search (restaurants, cuisines, areas)
- Index refreshes every 5 minutes
- Fast client-side matching, no DB query per search

---

### 🗺️ Sitemap Strategy
- 7 separate XML sitemaps (index + 6 content types)
- Restaurant `lastmod` = `updatedAt` from MongoDB
- Admin "Update All Dates" → single `updateMany` call → all sitemaps auto-update
- Cache: 1-hour HTTP, 60s in-memory

---

### 📦 Caching Layers
| Layer | Technology | TTL | Usage |
|---|---|---|---|
| Redis (backend) | ioredis | 5–300s | Restaurant lists, search index |
| Redis (frontend) | ioredis | 60–3600s | Restaurant data, sitemap data |
| Stale-While-Revalidate | Custom | Variable | Serve stale, refresh in background |
| HTTP headers | Cache-Control | 3600s | Sitemap responses |
| CDN static files | immutable | 365 days | Uploaded media |

---

### 🖼️ Image Pipeline
```
Upload → Magic Byte Validation → Sharp Resize (max 1920px) 
       → WebP Conversion (q:80) → Save + Thumbnail (400px, q:70)
       → Immutable URL (nanoid filename) → 365-day cache
```

---

### 🌐 Virtual Tour Flow
```
Admin/Owner click "Start VR Tour"
    │
    ▼
Backend creates session (POST /vr-tour/api/create-session)
    │
    ▼
Owner opens URL on phone (GET /vr-tour/capture/{token})
    │
    ▼
JavaScript auto-snaps frames every 10° (40 frames total)
    │
    ▼
FastAPI stitches with OpenCV PANORAMA mode
    │
    ▼
Panorama + thumbnail uploaded to CDN
    │
    ▼
Tour data saved to MongoDB via backend webhook
    │
    ▼
Customers view at /vr-tour/view/{restaurantId} (Pannellum.js)
```

---

## 10. Technology Stack Summary

### Backend
| Category | Technology |
|---|---|
| Runtime | Node.js (LTS) |
| Framework | Express.js 4.x |
| Language | TypeScript |
| Database | MongoDB with Mongoose 8.x |
| Cache | Redis (ioredis 5.x) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Search | Fuse.js (in-memory fuzzy) |
| Scheduling | node-cron |
| Email | Nodemailer |
| SMS | Twilio |
| Payment | JazzCash, PayFast |
| AI | OpenAI SDK (GPT for menu OCR) |
| Images | Sharp |

### Frontend
| Category | Technology |
|---|---|
| Framework | Next.js 15.3.3 (App Router) |
| Language | TypeScript + React 19 |
| Auth | NextAuth.js v5 (JWT + Credentials) |
| State | TanStack React Query v5 |
| Styling | Tailwind CSS 4 + Shadcn/ui + Radix UI |
| Forms | React Hook Form + Zod |
| Animation | Framer Motion |
| Maps | Leaflet.js + React-Leaflet + Supercluster |
| Rich Text | React Quill |
| Drag-Drop | @hello-pangea/dnd |
| Gallery | yet-another-react-lightbox |
| Icons | Lucide React |
| Cache | Redis (ioredis) — Stale-While-Revalidate |
| Toasts | react-hot-toast |

### FastAPI
| Category | Technology |
|---|---|
| Language | Python 3.11+ |
| Framework | FastAPI + Uvicorn |
| Stitching | OpenCV (cv2.Stitcher PANORAMA mode) |
| Images | Pillow |
| HTTP Client | httpx (async) |
| Templates | Jinja2 |
| Security | HMAC-SHA256 token signing |

### CDN
| Category | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| Image Processing | Sharp (WebP conversion) |
| Upload | Multer (memory storage) |
| Security | Helmet, magic byte validation |
| Rate Limiting | express-rate-limit |
| Unique IDs | nanoid |

---

*Report generated by automated project crawl — covers all 4 sub-projects, 60+ models, 46 backend routes, 129 frontend API routes, 7 FastAPI endpoints, and 6 CDN endpoints.*
