# Foodies Pakistan — View-Source / SEO / Performance Audit

**URL analyzed:** https://foodiespakistan.pk/multan/hn-foods-menu-multan/  
**Date:** July 7, 2026  
**Codebase:** `C:\Users\xomoe\Downloads\foodies pakistan\frontend`

---

## Executive summary

Live restaurant page HTML is **~369 KB**. The restaurant name **"HN Foods" appears ~85 times** in a single document. Content is duplicated across **meta tags**, **JSON-LD**, **visible UI**, and a **~97 KB React Server Components (RSC) flight payload** that serializes the full restaurant + menu + reviews + deals object to the browser.

Despite `export const revalidate = 60` on the route, live responses are **`Cache-Control: private, no-store`** and **`Cf-Cache-Status: DYNAMIC`** — Cloudflare cannot cache HTML, so every visitor hits the Next.js origin.

Root causes mirror the mobilestore.pk audit: **cookies in layout**, **entire page as client component**, and **fat props passed into client trees**.

---

## Live HTML measurements

| Signal | Value |
|--------|-------|
| HTML size | 369,060 bytes (~369 KB) |
| `"HN Foods"` occurrences | **85** |
| Meta description snippet occurrences | **6** (title, description, og:*, twitter:*, JSON-LD, visible copy) |
| RSC `__next_f.push` chunks | 14 (~97 KB escaped payload) |
| JSON-LD block | ~1.8 KB (visible) + larger graph built client-side |
| Inline CSS bloat | **None** (no `experimental.inlineCss` — good) |
| `BAILOUT_TO_CLIENT_SIDE_RENDERING` | **Present** |
| CDN cache | **Broken** (`private, no-store`, `DYNAMIC`) |

---

## P0 — Critical (fix first)

### 1. `(main)/layout.tsx` reads `cookies()` → kills ISR + CDN cache

**Status: FIXED** — `cookies()` removed; static Lahore defaults; `AppHeader` hydrates city from `document.cookie` on mount.

```tsx
// BEFORE (broken CDN):
const cookieStore = await cookies();
const citySlug = cookieStore.get("foodies_city")?.value || "lahore";
```

**Effect:** Every page under `(main)` becomes **dynamic per visitor**. ISR (`revalidate = 60`) on `[city]/[...slug]/page.tsx` cannot produce a shared static shell. Cloudflare serves `DYNAMIC` with `no-store`.

**Fix (same pattern as mobilestore.pk):**
- Remove `cookies()` from layout and home page.
- Read `foodies_city` / `foodies_city_name` **client-side** after mount (header already has `initialCity` props — hydrate from `document.cookie` or a tiny client provider).
- Optionally set city via middleware redirect only when missing (no cookie read in RSC).

### 2. Entire restaurant page is `"use client"`

**Status: FIXED** — split into server + client islands:

| Layer | File | Role |
|-------|------|------|
| Server | `restaurant-view.tsx` | JSON-LD, `preload()`, passes slim props |
| Server | `lib/restaurant-schema.ts` | Schema graph built once on server |
| Client | `restaurant-view-client.tsx` | Header, tabs, booking, similar cards |
| Client (deferred) | `restaurant-gallery-client.tsx` | Gallery + lightbox (`ssr: false`) |
| LCP | `restaurant-lcp-cover.tsx` | `fetchPriority="high"` cover paints before gallery JS |

```tsx
// BEFORE — entire page client:
"use client";
export default function RestaurantDetailView() { ... 500 lines + JSON-LD ... }
```

### 3. Triple serialization of the same data

**Status: FIXED (restaurant page)** — `lib/restaurant-client-props.ts` uses one `toPlain()` pass instead of 6× `JSON.parse(JSON.stringify(...))`.

Archive pages still use `JSON.parse(JSON.stringify(...))` in `archive-view.tsx` — optional follow-up.

### 4. `generateMetadata` awaits `searchParams`

**Status: FIXED** — `searchParams` removed from metadata; archive canonicals use clean URLs (pagination `?page=` handled client-side).

```tsx
// BEFORE — could mark route dynamic:
const sp = (searchParams ? await searchParams : {});
const pageQuery = sp.page && Number(sp.page) > 1 ? `?page=${sp.page}` : "";
```

Same ISR footgun as mobilestore: reading `searchParams` in metadata can mark the route dynamic. Pagination query (`?page=2`) should use **middleware `X-Robots-Tag: noindex`** + client-side pagination, not server `searchParams`.

---

## P1 — High impact

### 5. Home page also uses `cookies()`

**Status: FIXED** — static `lahore` default for ISR; city personalization via client header.

```tsx
// BEFORE:
const cookieStore = await cookies();
const userCitySlug = cookieStore.get("foodies_city")?.value || "lahore";
```

Homepage cannot be truly static either. Default to `lahore` in static shell; personalize city client-side.

### 6. JSON-LD inside client component

**Status: FIXED** — moved to `lib/restaurant-schema.ts`, injected from server `restaurant-view.tsx`.

### 7. Heavy client dependencies on critical path

**Status: PARTIALLY FIXED**

| Package | Change |
|---------|--------|
| `framer-motion` | Removed from floating booking CTA (CSS animation) |
| `yet-another-react-lightbox` | Gallery deferred via `dynamic(..., { ssr: false })` |
| `framer-motion` in tabs/booking | Still on critical path — optional next step |

### 8. LCP / images

**Status: FIXED** — `restaurant-lcp-cover.tsx` renders cover with `fetchPriority="high"` + `preload()` from `react-dom`. Interactive gallery loads after paint (`ssr: false`).

---

## P2 — Medium

### 9. AVIF + WebP in `next.config.ts`

**Status: FIXED** — WebP only (less VPS CPU under load).

```ts
formats: ["image/webp"],
```

On a single VPS (frontend + API + CDN), AVIF encoding is CPU-heavy under traffic (same lesson as mobilestore). Consider **WebP only** for on-the-fly optimization.

### 10. Duplicate metadata strings

Title/description logic is duplicated between `generateMetadata()` and `restaurant-view.tsx` (discount tags, branch naming). Centralize in one `buildRestaurantSeo()` helper to avoid drift and repeated strings in source.

### 11. Similar restaurants + branches in HTML

Each card repeats city/area/cuisine strings — contributes to `"multan"` (112×) and `"menu"` (135×) counts. Acceptable for UX; trim card payload fields for view-source size.

---

## P3 — Lower priority

- `ReviewSchema` / commented `ReviewPopup` in layout — verify no hidden duplicate schema sitewide.
- Sitemap routes use `force-dynamic` (fine for sitemaps).
- CSP allows `'unsafe-inline'` scripts — required for some analytics; keep as-is unless moving to nonce-based CSP.

---

## Recommended fix order

| Phase | Work | Status |
|-------|------|--------|
| **1** | Remove `cookies()` from layout + home; client city hydration | **Done** |
| **1b** | Fix skeleton loading mixup | **Done** |
| **2** | Server `RestaurantShell` + client islands; slim props | **Done** |
| **3** | Server-side JSON-LD; remove triple `JSON.parse` | **Done** |
| **4** | LCP hero preload; defer gallery; CSS booking CTA | **Done** |
| **5** | Remove `searchParams` from `generateMetadata` | **Done** |
| **6** | WebP-only image formats | **Done** |
| **7** | Archive view `JSON.parse` cleanup | Pending (low impact) |

---

## Comparison with mobilestore.pk (before fixes)

| Issue | Mobile Store (was) | Foodies (now) |
|-------|-------------------|---------------|
| HTML size | 823 KB | 369 KB |
| inlineCss | ~405 KB | None ✓ |
| cookies in layout | Yes | **Yes** |
| Full page client component | Partial | **Entire restaurant view** |
| CDN cache | DYNAMIC | **DYNAMIC** |
| AdSense / third-party blocking | zmobile | LaraPush N/A; GTM in CSP |

---

## Files to change (implementation reference)

| File | Change |
|------|--------|
| `src/app/(main)/layout.tsx` | ✅ Remove `cookies()` |
| `src/app/(main)/page.tsx` | ✅ Remove `cookies()` |
| `src/app/(main)/[city]/[...slug]/page.tsx` | ✅ Remove `searchParams` from metadata |
| `src/app/(main)/[city]/[...slug]/restaurant-view.tsx` | ✅ Server shell + JSON-LD |
| `src/components/restaurant/restaurant-view-client.tsx` | ✅ Client islands |
| `src/lib/restaurant-schema.ts` | ✅ Server JSON-LD builder |
| `src/lib/restaurant-client-props.ts` | ✅ Single-pass serialization |
| `src/components/restaurant/restaurant-lcp-cover.tsx` | ✅ LCP hero |
| `src/components/restaurant/restaurant-gallery-client.tsx` | ✅ Deferred gallery |
| `src/components/ui/slug-route-loading.tsx` | ✅ Skeleton fix |
| `next.config.ts` | ✅ WebP-only |

---

## Skeleton loading bug (mixup on navigation)

### Symptom

Kabhi kabhi galat skeleton dikhta hai jab user navigate karta hai:

- Archive page (`/lahore/gulberg/fast-food`) par jaate waqt **restaurant detail** skeleton flash hota hai
- Restaurant se wapas archive par **restaurant** skeleton dikhta hai
- Back/forward ya untagged links se **random** skeleton mixup

### Root cause

| Layer | File | Problem |
|-------|------|---------|
| Loading UI | `[city]/[...slug]/loading.tsx` | **Hamesha** `RestaurantDetailSkeleton` render karta tha — archive routes ke liye bhi |
| Click hint | `providers.tsx` → `RouteTypeTracker` | `sessionStorage("next_route_type")` **set** karta tha `data-route-type` links par |
| Missing wire | `loading.tsx` | SessionStorage **kabhi read nahi** hota tha — comment tha lekin code nahi |
| Ambiguous URLs | `/lahore/fast-food` (1 slug segment) | Restaurant **aur** tag-archive dono same pattern — bina hint ke guess galat ho sakta hai |
| Partial tagging | Sirf kuch links par `data-route-type` | Breadcrumb / "See All" links bina tag ke wrong fallback |

### Fix applied (code)

1. **`slug-route-loading.tsx`** (client) — skeleton pick karta hai:
   - Pehle `sessionStorage` hint (`restaurant` / `archive`) — read ke baad clear
   - Phir URL heuristic: `slug.length >= 2` → archive (except `virtual-tour` sub-route)
   - `slug.length === 1` → restaurant default (tag archives ke liye `data-route-type="archive"` zaroori)
2. **`[...slug]/loading.tsx`** — ab `SlugRouteLoading` use karta hai
3. **Extra `data-route-type="archive"`** — archive breadcrumbs + homepage "See All" links

### Remaining edge cases

- Direct URL bar entry on single-segment tag pages → restaurant skeleton briefly (acceptable)
- Full fix: `[city]/deals/*` routes ke liye alag loading boundary ya neutral skeleton
- `my-bookings` / `saved` restaurant links abhi bina `data-route-type` — optional follow-up

---

## Implementation status (speed optimization)

| Fix | Status | File(s) |
|-----|--------|---------|
| Remove `cookies()` from layout | **Done** | `(main)/layout.tsx` |
| Remove `cookies()` from home | **Done** | `(main)/page.tsx` — static `lahore` ISR shell; header client cookie hydrate |
| Remove `searchParams` from `generateMetadata` | **Done** | `[city]/[...slug]/page.tsx` — canonical without `?page=` |
| WebP-only images (drop AVIF CPU) | **Done** | `next.config.ts` |
| Skeleton loading mixup | **Done** | `slug-route-loading.tsx`, `loading.tsx`, archive breadcrumbs |
| Server shell + client islands for restaurant | **Done** | `restaurant-view.tsx` (server), `restaurant-view-client.tsx` |
| Server-side JSON-LD (move out of client) | **Done** | `lib/restaurant-schema.ts` |
| Remove `JSON.parse(JSON.stringify(...))` | **Done** (restaurant) | `lib/restaurant-client-props.ts` — single `toPlain()` pass |
| LCP hero preload + defer gallery/lightbox | **Done** | `restaurant-lcp-cover.tsx`, `restaurant-gallery-client.tsx` (`ssr: false`), `preload()` |
| Defer framer-motion floating button | **Done** | CSS `animate-in` replaces `framer-motion` on mobile booking CTA |

**Note:** Home page ab static Lahore data serve karega jab tak user refresh na kare city change ke baad — header mein sahi city client-side dikhegi.

---

## Verification checklist (after deploy)

1. `curl -I` → `Cache-Control` should include `s-maxage=60` (not `private, no-store`).
2. `Cf-Cache-Status: HIT` on second request.
3. View-source: `"HN Foods"` count should drop from **85** to **~15–25** (meta + H1 + schema once + UI).
4. HTML size target: **< 200 KB** for typical restaurant page.
5. PageSpeed mobile: LCP element = cover image, not logo/spinner.
6. Skeleton: archive link click → **ArchivePageSkeleton**; restaurant card → **RestaurantDetailSkeleton** (no mixup).

---

*Phase 1 + Phase 2 implemented — July 7, 2026. Deploy and run verification checklist.*
