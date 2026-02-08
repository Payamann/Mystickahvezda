# Mystická Hvězda - Deep Improvement Analysis

A comprehensive deep-dive beyond the initial security/bug fixes, covering
frontend code quality, HTML/SEO, CSS architecture, AI prompt effectiveness,
data models, and product-level improvements.

---

## 1. CRITICAL FRONTEND BUGS

### 1.1 `synastry.js` - Undefined Auth Method
**File:** `js/synastry.js:174`
```js
Auth.fetchProtected()  // undefined - should be window.Auth.fetchProtected()
```
Crashes when calculating compatibility for non-premium users. The `Auth` object
is attached to `window` but referenced without the prefix.

### 1.2 `numerology.js` - Undefined Premium Object
**File:** `js/numerology.js:193`
```js
window.Premium.checkStatus()  // Premium is never defined
```
Will throw `ReferenceError` every time the numerology page loads.

### 1.3 `favorites-helper.js` - Wrong localStorage Key
**File:** `js/favorites-helper.js:15`
```js
const token = localStorage.getItem('token');  // Should be 'auth_token'
```
All other modules use `'auth_token'`. Favorites will silently fail to
authenticate every request.

### 1.4 `favorites-helper.js` - Hardcoded API Path
**File:** `js/favorites-helper.js:11`
```js
fetch('/api/user/readings/...')  // Ignores window.API_CONFIG.BASE_URL
```
Won't work if the API is hosted on a different domain/port than the frontend.

### 1.5 `astro-map.js` - XSS via innerHTML
**File:** `js/astro-map.js:302`
```js
resultsContainer.innerHTML = `... ${formattedResponse} ...`
```
AI-generated response is inserted as raw HTML. A crafted API response could
inject scripts.

### 1.6 `profile.js` - XSS via innerHTML
**File:** `js/profile.js:326`
```js
'<a href="javascript:location.reload()">Zkusit znovu</a>'
```
Uses `javascript:` protocol in href - XSS vector.

### 1.7 `tarot.js` - Broken Audio Data URI
**File:** `js/tarot.js:251`
The audio data URI is truncated/incomplete. Will fail silently when attempting
to play the card-flip sound.

### 1.8 `natal-chart.js` - Wrong Zodiac Date Boundaries
**File:** `js/natal-chart.js:573-584`
Hardcoded zodiac date boundaries don't match astronomical reality. Example:
Capricorn boundary set to Dec 22 but should be ~Dec 21 depending on year.
Should use the same data from `data/zodiac-matrix.json`.

---

## 2. FRONTEND ARCHITECTURE ISSUES

### 2.1 No Error Boundaries
If any JS module fails to initialize in `main.js`, subsequent modules won't
load. There's no try/catch around the initialization chain.

**Fix:** Wrap each module init in try/catch:
```js
try { initHeader(); } catch(e) { console.error('Header init failed:', e); }
try { initAnimations(); } catch(e) { console.error('Animations init failed:', e); }
```

### 2.2 Duplicate `escapeHtml()` Function
Defined identically in `tarot.js`, `profile.js`, and `utils/helpers.js`.
Should be imported from one location.

### 2.3 Duplicate API Call Logic
`gemini-service.js` duplicates the `callAPI()` function that exists in
`api-config.js`. Should use one centralized API client.

### 2.4 No API Timeout
No frontend API calls have a timeout. If the Gemini API hangs, users see
a spinner forever with no recovery option.

**Fix:** Use `AbortController` with a 30-second timeout on all fetch calls.

### 2.5 `main.js` - Duplicate Initialization
`initSmoothScroll()` is called twice (lines 18 and 31).

### 2.6 Animations Memory Leak
**File:** `js/ui/animations.js:154`
The custom cursor canvas animation runs `requestAnimationFrame()` in an
infinite loop that never stops, even when the page isn't visible. No cleanup
on page navigation.

**Fix:** Use `document.hidden` check or `Page Visibility API` to pause.

### 2.7 localStorage Without try/catch
Multiple modules access `localStorage` without error handling. In private
browsing mode or when storage is full, this throws.

**Files:** `crystal-ball.js:29,113`, `mentor.js:234-242`, `profile.js:738`

### 2.8 Mentor Rate Limit Race Condition
**File:** `js/mentor.js:234-242`
The 3-message daily limit uses localStorage without atomic operations.
Concurrent requests could bypass the limit.

---

## 3. HTML & SEO ISSUES

### 3.1 Missing SEO on Key Pages

| Page | Meta Description | OG Tags | JSON-LD | Issue |
|------|:---:|:---:|:---:|-------|
| mentor.html | Yes | **NO** | **NO** | Critical: Premium page has no social sharing metadata |
| prihlaseni.html | **NO** | **NO** | **NO** | No SEO metadata at all + broken favicon tag |

### 3.2 Broken Favicon Tag
**File:** `prihlaseni.html:10-12`
The `<link rel="icon">` tag is malformed - the `href` attribute floats
without a proper opening tag.

### 3.3 ~900 Lines of Inline CSS
Page-specific CSS is embedded in `<style>` blocks instead of external files:

| Page | Inline CSS Lines |
|------|:---:|
| astro-mapa.html | 250 |
| numerologie.html | 220 |
| mentor.html | 212 |
| kristalova-koule.html | 130 |
| partnerska-shoda.html | 54 |
| natalni-karta.html | 35 |
| **Total** | **~900** |

This prevents caching, minification, and reuse across pages.

### 3.4 Render-Blocking Stripe.js
**Files:** `index.html`, `cenik.html`
```html
<script src="https://js.stripe.com/v3/"></script>  <!-- In <head>, no async -->
```
Blocks page rendering while waiting for third-party script to download.

**Fix:** Move to end of `<body>` or add `async` attribute.

### 3.5 Cache-Busting Version Mismatch
**File:** `numerologie.html:55`
```html
<script type="module" src="js/numerology.js?v=9999999"></script>
```
All other pages use `?v=5`. This forces re-download on every visit.

### 3.6 Script Load Order Inconsistency
Some pages (e.g., `tarot.html`) load page-specific scripts BEFORE common
scripts (`api-config.js`, `templates.js`). This can cause undefined references
if the page script runs before config is available.

### 3.7 Missing `author` Meta Tag
Only `index.html` has `<meta name="author">`. The other 14 pages are missing it.

### 3.8 Missing Twitter Meta Tags
No pages include `twitter:site` or `twitter:creator` meta tags.

### 3.9 No Image Preloading
Only `index.html` uses `<link rel="preload">` for its hero image.
Other pages with hero images don't preload them, causing layout shift.

### 3.10 Service Worker Registration Duplicated
The same 6-line service worker registration block is copy-pasted into all
15 HTML files. Should be in a shared JS file.

### 3.11 Accessibility Gaps
- **mentor.html**: No skip-to-main-content link, chat messages lack ARIA live
  regions for screen readers
- **prihlaseni.html**: No skip link, `<main>` has no `id`
- **faq.html**: Accordion items missing `aria-expanded` attributes
- **forms.js:85**: Uses `alert()` for errors instead of the app's toast system
- **horoscope.js:59**: Uses `confirm()` dialog instead of app's modal system

---

## 4. CSS ARCHITECTURE ISSUES

### 4.1 Monolithic Stylesheet (3,936 Lines)
`css/style.v2.css` is a single file containing everything. No code splitting,
no per-page loading. Every page downloads styles for every other page.

### 4.2 Missing Reduced-Motion Support
No `@media (prefers-reduced-motion: reduce)` query anywhere. The app has
heavy animations (aurora pulses, floating elements, particle cursors) that
could cause accessibility issues for motion-sensitive users.

**Fix:**
```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

### 4.3 `cursor: none` on All Elements
**File:** `css/style.v2.css:96`
Custom cursor is implemented by hiding the real cursor globally, then
selectively restoring it. This causes flickering and breaks accessibility
for users who rely on visible cursors.

### 4.4 Inconsistent Breakpoints
Three different breakpoint strategies used: 600px, 768px, and 900px.
Should standardize to a consistent set.

### 4.5 `!important` Overuse
Multiple instances of `!important` (lines 495, 3589, 3686, 3718) indicating
specificity battles. Symptom of unstructured CSS architecture.

### 4.6 Missing Grid Column Classes
Only `.col-1, .col-3, .col-4, .col-6` exist. Missing `.col-2, .col-5,
.col-7` through `.col-12` for flexible layouts.

### 4.7 Heavy Background Effects
Two aurora gradient animations run continuously via `body::before` and
`body::after` with 120vh dimensions and blur filters. Impacts battery
life on mobile devices.

---

## 5. AI PROMPT IMPROVEMENTS

### 5.1 No Output Validation
All prompts request specific formats (HTML, JSON, specific paragraph counts)
but there's no validation that Gemini actually follows the format. A malformed
response is passed directly to the frontend.

**Fix:** Add response validation/sanitization after each Gemini call.

### 5.2 Mentor "Memory" is Illusory
**File:** `server/config/prompts.js:95-103`
The mentor prompt tells the AI to "remember" conversations, but Gemini has
no session memory. Context is limited to the last 10 messages loaded from DB.
Users may expect the mentor to remember things discussed weeks ago.

**Fix:** Add explicit context window note: "You have access to the last 10
messages only. If asked about older conversations, explain this limitation."

### 5.3 maxOutputTokens Too Low
**File:** `server/services/gemini.js:70`
```js
maxOutputTokens: 1024
```
For complex readings (natal chart, monthly horoscope), 1024 tokens may
truncate the response mid-sentence. Natal chart prompts request HTML with
multiple sections - this needs at least 2048 tokens.

### 5.4 No Prompt Versioning
Prompts are hardcoded with no A/B testing capability. Can't compare
effectiveness of different prompt variations.

### 5.5 Natal Chart Prompt Requests HTML Output
The natal chart prompt asks Gemini to generate HTML (`<h4>`, `<p>`, `<ul>`).
LLMs are unreliable HTML generators - could produce malformed tags that
break the page layout.

**Fix:** Request structured text/markdown and convert to HTML on the server.

---

## 6. DATABASE & INFRASTRUCTURE

### 6.1 Missing Database Migrations (CRITICAL)
Only ONE migration file exists (`20240130_create_mentor_messages.sql`).
The following tables are used in code but have NO migration:

- `users`
- `subscriptions`
- `readings`
- `profiles`
- `cache_horoscopes`
- `cache_numerology`
- `newsletter_subscribers`

This means: **a new deployment cannot recreate the database from code.**

### 6.2 Missing Database Indexes
No indexes defined for frequently-queried fields:
- `readings.user_id` (queried on every profile page load)
- `mentor_messages.user_id + created_at` (queried on every chat)
- `cache_horoscopes.cache_key` (queried on every horoscope request)
- `subscriptions.user_id` (queried on every authenticated request)

### 6.3 No RLS for UPDATE/DELETE
**File:** `supabase/migrations/20240130_create_mentor_messages.sql`
Only SELECT and INSERT RLS policies exist. No UPDATE or DELETE policies,
meaning these operations may be silently blocked or fully open.

### 6.4 Supabase Credentials Optional
**File:** `server/db-supabase.js:20-25`
If Supabase credentials are missing, the app warns but continues running.
All database operations will fail silently.

**Fix:** Fail fast like the JWT secret does - `process.exit(1)` in production.

### 6.5 SQLite Dependency Ghost
**File:** `server/db.js:1`
Imports `sqlite3` which is NOT in `server/package.json`. If this file is
ever imported, it will crash.

### 6.6 Admin Subscription Expiry Bug
**File:** `server/admin.js:43`
```js
expiryDate.setFullYear(expiryDate.getFullYear() + 10);  // 10 YEARS!
```
Admin-granted subscriptions are set to expire in 10 years regardless of
plan type. Should respect the plan's actual duration.

### 6.7 CORS Wide Open
**File:** `server/index.js:35`
```js
app.use(cors());  // No origin restrictions
```
Any domain can make API calls. In production, should restrict to the
app's own domain(s).

### 6.8 CSP Allows `unsafe-inline`
**File:** `server/index.js:53-54`
```js
scriptSrc: ["'self'", "'unsafe-inline'", ...],
styleSrc: ["'self'", "'unsafe-inline'", ...],
```
This weakens the Content Security Policy significantly. The inline styles
from issue 3.3 (900 lines of inline CSS) are the reason this is needed.
Extracting inline CSS to external files would allow removing `unsafe-inline`.

---

## 7. PAYMENT & BUSINESS LOGIC

### 7.1 No Subscription Lifecycle
The current payment flow only handles initial purchase. Missing:
- **Cancellation flow** - no way for users to cancel
- **Upgrade/downgrade** - no plan switching
- **Renewal reminders** - no emails before expiration
- **Grace period** - instant cutoff when subscription expires
- **Refund handling** - no refund webhook processing

### 7.2 No Usage Analytics
No tracking of:
- Which features are most used (tarot vs horoscope vs mentor)
- Free-to-premium conversion rates
- Paywall hit frequency per feature
- User retention/churn metrics

The `trackPaywallHit` function exists in the old middleware but was removed
as dead code. Should be reimplemented with a real analytics backend.

### 7.3 No Email System
Newsletter subscription endpoint exists but there's no actual email
sending implementation. No welcome emails, no reading summaries, no
subscription reminders.

---

## 8. PERFORMANCE OPTIMIZATIONS

### 8.1 No Script Bundling
Every page loads 5-8 separate JavaScript files as individual HTTP requests.
No bundler (Vite, esbuild) is configured for production builds.

### 8.2 No Lazy Loading for Heavy Libraries
**File:** `profil.html:37`
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```
Chart.js (200KB+) loaded unconditionally even though the biorhythm chart
is below the fold and may not be visible.

### 8.3 Profile Loads ALL Readings
**File:** `js/profile.js:259-330`
Fetches all readings without pagination. With thousands of readings,
this will freeze the UI.

**Fix:** Add cursor-based pagination with "load more" button.

### 8.4 SVG Regeneration on Every Calculation
**File:** `js/natal-chart.js:166-346`
The `generatePlanets()` function destroys and recreates the entire SVG
chart on every calculation instead of updating changed elements.

### 8.5 World Map Image Format
**File:** `astro-mapa.html:382`
```html
<img src="img/world-map-flat.png">  <!-- PNG instead of WebP -->
```
All other images use WebP. This PNG should be converted for consistency
and smaller file size.

---

## 9. SECURITY HARDENING

### 9.1 Stripe Test Key in Source Code
**File:** `js/api-config.js:16`
```js
STRIPE_PUBLISHABLE_KEY: 'pk_test_51SvhkJPMTd...'
```
While publishable keys are safe to expose, test keys reveal infrastructure
details. Should use environment-based injection.

### 9.2 Weak Password Requirements
**File:** `server/auth.js:46`
Only requires 6 characters. NIST recommends 12+ characters minimum.

### 9.3 `confirm()` and `alert()` in Production
**Files:** `js/horoscope.js:59`, `js/ui/forms.js:85`
Native browser dialogs are used instead of the app's own UI components.
These can be suppressed by browsers and break the user experience.

---

## 10. PRODUCT & UX IMPROVEMENTS

### 10.1 Typewriter Effect Too Slow
**Files:** `js/tarot.js`, `js/synastry.js:263`
Character-by-character typewriter animation with 15ms delay. For a 500-char
response, this takes 7.5 seconds of forced waiting after the API already
responded.

**Fix:** Use word-by-word animation or streaming API response.

### 10.2 No Offline Reading History
The PWA caches static assets but reading history requires API calls.
Users can't view their saved readings offline.

**Fix:** Cache readings in IndexedDB for offline access.

### 10.3 No Loading Skeleton States
API calls show a generic spinner. Modern apps use skeleton screens that
match the expected content layout.

### 10.4 Astrocartography Map Uses Fake Coordinates
**File:** `js/astro-map.js:25-57`
City positions are percentage-based guesses, not actual lat/long coordinates:
```js
'praha': { x: 52, y: 34 }  // Arbitrary percentages, not real coordinates
```
This makes the map decorative, not informative.

### 10.5 Moon Phase Hardcoded Reference Date
**File:** `js/moon-phase.js:19`
```js
const knownNewMoon = new Date('2026-01-18T19:51:00Z');
```
This becomes less accurate over time. Should use an astronomical algorithm
that works for any date.

### 10.6 No Shareable Readings
Users cannot share their tarot readings, horoscopes, or compatibility
results on social media. This is a significant growth mechanism for
spiritual apps.

### 10.7 No Push Notifications
The app is a PWA but doesn't use push notifications for daily horoscopes
or new features. This could significantly improve retention.

---

## PRIORITY MATRIX

### Tier 1 - Fix Before Production
| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1.1 | `synastry.js` - Auth undefined | Feature broken | Low |
| 1.2 | `numerology.js` - Premium undefined | Page crash | Low |
| 1.3 | `favorites-helper.js` - Wrong key | Favorites broken | Low |
| 1.5 | `astro-map.js` - XSS | Security | Low |
| 1.6 | `profile.js` - XSS | Security | Low |
| 3.2 | Broken favicon tag | Visual bug | Low |
| 6.1 | Missing DB migrations | Cannot redeploy | High |
| 6.4 | Supabase credentials optional | Silent failures | Low |
| 6.7 | CORS wide open | Security | Low |

### Tier 2 - High Priority
| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 2.4 | No API timeout | UX hang | Medium |
| 3.1 | Missing SEO on mentor/login | Discoverability | Low |
| 3.4 | Render-blocking Stripe.js | Performance | Low |
| 4.2 | No reduced-motion support | Accessibility | Low |
| 5.3 | maxOutputTokens too low | Truncated readings | Low |
| 6.2 | Missing DB indexes | Query performance | Medium |
| 6.6 | Admin 10-year expiry bug | Business logic | Low |
| 9.2 | Weak password requirements | Security | Low |

### Tier 3 - Important
| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 2.1 | No error boundaries | Resilience | Medium |
| 3.3 | 900 lines inline CSS | Performance/cache | High |
| 4.1 | Monolithic CSS (3,936 lines) | Maintainability | High |
| 5.1 | No AI output validation | Data integrity | Medium |
| 7.1 | No subscription lifecycle | Revenue | High |
| 8.1 | No script bundling | Performance | Medium |
| 8.3 | Profile loads all readings | Scalability | Medium |

### Tier 4 - Nice to Have
| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 7.2 | No usage analytics | Business insight | Medium |
| 7.3 | No email system | Engagement | High |
| 10.2 | No offline reading history | PWA quality | Medium |
| 10.4 | Fake map coordinates | Feature quality | High |
| 10.6 | No shareable readings | Growth | Medium |
| 10.7 | No push notifications | Retention | High |
