# Performance Review Report — Mystická Hvězda

**Datum:** 2026-03-15
**Verze:** 1.0

---

## Souhrnná tabulka nálezů

| # | Nález | Oblast | Priorita | Dopad | Effort |
|---|-------|--------|----------|-------|--------|
| 1 | CSS "minifikace" nefunguje — style.v2.min.css je identický s neminifikovaným (134 KB) | Frontend | **Critical** | Vysoký | Quick win |
| 2 | CSRF_SECRET má hardcoded fallback v produkci | Security | **Critical** | Vysoký | Quick win |
| 3 | Three.js (590 KB) + Chart.js (201 KB) načítány globálně na všech stránkách | Frontend | **Critical** | Vysoký | Střední |
| 4 | Blog obrázky 600–840 KB každý (6 ks = 4.5 MB) | Frontend | **High** | Vysoký | Quick win |
| 5 | PNG obrázky elena.png (613 KB) a jan.png (660 KB) nejsou WebP | Frontend | **High** | Střední | Quick win |
| 6 | Payment webhook zbytečně volá Stripe API místo dat z payloadu | Backend | **High** | Střední | Quick win |
| 7 | Angel messages — race condition na like counteru | Backend | **High** | Střední | Quick win |
| 8 | Mentor chat — 3 separátní DB dotazy (N+1 pattern) | Backend | **High** | Střední | Střední |
| 9 | Admin listing načítá VŠECHNY uživatele bez paginace | Backend | **High** | Vysoký | Quick win |
| 10 | JWT token expiry 30 dní — premium status může být stale | Security | **High** | Vysoký | Vysoký |
| 11 | Hardcoded admin email v kódu | Security | **High** | Střední | Quick win |
| 12 | CSP používá `unsafe-inline` pro scripty i styly | Security | **High** | Vysoký | Vysoký |
| 13 | Email queue interval 1 minuta — latence až 60s | Backend | **Medium** | Střední | Quick win |
| 14 | Chybějící DB indexy (user_id+created_at, stripe_subscription_id) | Backend | **Medium** | Vysoký | Quick win |
| 15 | Backdrop-filter na 6+ elementech — pomalé na low-end mobilu | Mobile | **Medium** | Střední | Střední |
| 16 | error-boundary.js bez `defer` atributu — blokuje rendering | Frontend | **Medium** | Střední | Quick win |
| 17 | Service Worker cache jen 26 statických assetů z 80+ | Frontend | **Medium** | Střední | Střední |
| 18 | Duplicitní preconnect na fonts.googleapis.com | Frontend | **Low** | Nízký | Quick win |
| 19 | Crystal ball daily limit check přes DB místo rate-limiter | Backend | **Low** | Nízký | Střední |
| 20 | Stripe webhook idempotency má race condition | Backend | **Medium** | Střední | Střední |
| 21 | Duplicitní horoskop stránky (vodnar vs vodnár) | SEO | **Medium** | Střední | Quick win |
| 22 | autocomplete="off" na jméno inputu blokuje autofill | Mobile | **Low** | Nízký | Quick win |
| 23 | Token refresh endpoint bez rate limitingu | Security | **Medium** | Střední | Quick win |
| 24 | XSS middleware aplikován AŽ PO routes | Security | **Medium** | Střední | Quick win |
| 25 | Žádný globální request timeout | Backend | **Low** | Nízký | Quick win |
| 26 | Background obrázky 700–800 KB bez media queries | Mobile | **Medium** | Střední | Střední |

---

## 1. Frontend Performance

### Aktuální stav — co funguje dobře
- Fonty (Cinzel, Inter) správně preloadovány s `font-display: swap`
- Hero image má `fetchpriority="high"`, srcset a sizes
- Všechny obrázky mají width/height atributy (prevence CLS)
- Lazy loading s `decoding="async"` na sekundárních obrázcích
- Většina JS souborů má `defer` atribut
- IntersectionObserver pro scroll animace (ne scroll events)
- `prefers-reduced-motion` respektováno

### Problémy

**Critical:**
- **style.v2.min.css není minifikovaný** — 134 KB, identický s neminifikovanou verzí (11 493 řádků). Potenciální úspora 30–50 KB.
- **Three.js (590 KB) a Chart.js (201 KB) načítány na všech stránkách** — přitom Three.js se používá jen pro 3D efekty a Chart.js jen pro grafy. Zbytečných ~791 KB na většině stránek.

**High:**
- **Blog obrázky nepřiměřeně velké** — 6 category obrázků po 600–840 KB (celkem 4.5 MB). Měly by být 200–300 KB.
- **PNG obrázky nekonvertovány** — elena.png (613 KB) a jan.png (660 KB) stále v PNG formátu.
- **Background obrázky 700–800 KB** — natal-bg.webp, synastry-bg.webp, crystal-ball-bg.webp bez mobilních variant.

**Medium:**
- **error-boundary.js** nemá `defer` — blokuje rendering
- **Service Worker cachuje jen 26 assetů** z 80+ (limit 80 položek)
- **21 keyframe animací** — většina OK (transform-based), ale backdrop-filter na 6+ elementech je náročný

### Quick wins
1. Skutečně minifikovat CSS (úspora ~30–50 KB)
2. Přidat `defer` na error-boundary.js
3. Konvertovat elena.png a jan.png na WebP (úspora ~1 MB)
4. Zmenšit blog obrázky na 200–300 KB (úspora ~2.5 MB)
5. Odstranit duplicitní preconnect tag
6. Lazy loadovat Three.js a Chart.js jen na stránkách kde jsou potřeba

---

## 2. Backend Performance

### Aktuální stav — co funguje dobře
- Async/await konzistentně napříč celým backendem
- Performance logging na všech endpointech (response time)
- Paginace implementována na readings a angel messages
- Gemini API má 30s timeout s retry logikou
- Compression middleware aktivní
- Webhook správně zpracovává raw body pro Stripe verifikaci

### Problémy

**High:**
- **N+1 pattern v mentor chatu** — 3 separátní dotazy (profil, zprávy, readings) místo joinů
- **Payment webhook volá `stripe.subscriptions.retrieve()`** — data jsou již ve webhook payloadu
- **Admin user listing bez paginace** — načítá všechny uživatele do paměti
- **Race condition na angel message likes** — SELECT + UPDATE místo atomického incrementu

**Medium:**
- **Email queue běží co minutu** — latence až 60s pro urgentní emaily (welcome email po registraci)
- **Chybějící DB indexy** — `(user_id, created_at)` na readings, `stripe_subscription_id` na subscriptions
- **Readings fetch a count jsou 2 separátní dotazy** — lze spojit pomocí `count: 'exact'`
- **Webhook idempotency check má race condition** — dva webhooky mohou projít kontrolou současně

### Doporučení
1. Spojit mentor chat dotazy do jednoho joinu (úspora 2 DB roundtripů na zprávu)
2. Použít webhook payload data místo dalšího Stripe API callu
3. Přidat `.range()` paginaci na admin endpoint
4. Opravit angel likes na atomický increment (RPC `increment()`)
5. Přidat composite indexy v Supabase
6. Snížit email queue interval na 10s nebo implementovat immediate send pro urgentní emaily

---

## 3. SEO & Discoverability

### Aktuální stav — co funguje dobře (9/10)
- Kompletní meta tagy na všech stránkách (title, description, keywords)
- Open Graph a Twitter Card tagy na všech stránkách
- Pokročilé structured data (WebApplication, BlogPosting, FAQPage schema)
- Správná heading hierarchie — jeden H1 na stránku, logické H2–H4
- Kompletní sitemap.xml (400+ URL s prioritami a changefreq)
- robots.txt správně konfigurován
- Canonical URL na všech stránkách
- Hreflang tagy pro cs/sk verze
- Alt texty na 110+ obrázcích
- Hustá síť interních odkazů

### Problémy

**Medium:**
- **Duplicitní horoskop stránky** — `/horoskop/vodnar.html` a `/horoskop/vodnár.html` (s/bez diakritiky) — možný duplicitní obsah
- **Index.html je 89 KB** — velký HTML soubor, ale přijatelný

### Quick wins
1. Konsolidovat vodnar/vodnár s 301 redirectem
2. Přidat structured data `SpeakableSpecification` na zbývající stránky

---

## 4. Bezpečnost & Best Practices

### Aktuální stav — co funguje dobře
- Input validace centralizovaná (utils/validation.js)
- Supabase SDK = parametrizované dotazy (žádná SQL injection)
- CSRF ochrana s HMAC-SHA256 a timing-safe comparison
- HSTS hlavička (1 rok, včetně subdomén)
- Helmet správně konfigurován
- CORS whitelist-based
- Rate limiting na většině endpointů
- Password complexity vyžaduje 3 ze 4 kritérií

### Problémy

**Critical:**
- **CSRF_SECRET fallback** — v produkci padá na hardcoded string `'dev-csrf-secret-fallback-2026'` pokud env var chybí. Útočník může predikovat CSRF tokeny. **Fix: process.exit(1) v produkci pokud chybí.**

**High:**
- **CSP `unsafe-inline`** — scriptSrc i styleSrc povolují inline skripty. Jakýkoli XSS může spustit libovolný kód.
- **Hardcoded admin email** — `pavel@mystickahvezda.cz` v kódu middleware. Mělo by být v DB.
- **JWT 30denní expiry** — uniknutý token platí měsíc. Premium status v tokenu může být stale (uživatel zruší předplatné, ale token říká isPremium).

**Medium:**
- **XSS middleware za routes** — `app.use('/api', xss())` aplikován po mountování routes
- **Token refresh bez rate limitu** — endpoint `/api/refresh-token` lze zahlcovat
- **CSRF token generování bez rate limitu**

### Doporučení
1. **Okamžitě:** Odstranit CSRF_SECRET fallback, crashnout v produkci bez něj
2. **Okamžitě:** Přesunout admin emaily do databáze
3. **Brzy:** Přejít na access/refresh token pattern (15min access + 7d refresh)
4. **Brzy:** Nahradit `unsafe-inline` CSP nonces
5. Přidat rate limit na token refresh
6. Přesunout XSS middleware před routes

---

## 5. UX & Konverze

### Aktuální stav — co funguje dobře
- Jasný pricing funnel (4 úrovně: Poutník → Hvězdný Průvodce → Osvícení → VIP)
- CTA tlačítka viditelná s kontrastními barvami
- Formuláře mají validaci na frontendu i backendu
- Error handling s uživatelsky přívětivými hláškami
- FAQ sekce s expandovatelnými odpověďmi
- Breadcrumb navigace v blogu
- Related content sekce

### Problémy
- **Upgrade modal** existuje, ale UX na mobilu není ověřen
- **Newsletter popup timing** — exit-intent může způsobit CLS
- **Free → Premium funnel** spoléhá na soft wall (402 response) místo jasného upgrade promptu

### Doporučení
1. A/B testovat CTA texty a umístění
2. Přidat skeleton screens pro loading stavy
3. Implementovat upgrade prompt inline (ne modal) pro lepší mobilní UX

---

## 6. Mobile Experience (Prioritní oblast)

### Aktuální stav — co funguje dobře (9/10)
- Viewport s `viewport-fit=cover` (iPhone notch podpora)
- 6 responsive breakpointů (480, 600, 768, 900, 992, 1024px)
- `@media (pointer: coarse)` pro touch zařízení
- Touch targety splňují WCAG 2.5 (min. 48px)
- Base font 16px (prevence iOS auto-zoom)
- Fluid typography s `clamp()` pro headings
- `overflow-x: hidden` na body (žádný horizontální scroll)
- Input types optimalizovány pro mobilní klávesnice (date, time, email, numeric)
- PWA manifest s maskable icon a standalone display
- Apple-specific meta tagy (mobile-web-app-capable, status-bar-style)

### Problémy

**Medium:**
- **Backdrop-filter na 6+ elementech** — header, buttony, karty. Není GPU-composited na všech prohlížečích, pomalé na low-end Android zařízeních (Samsung Galaxy A-série).
- **Background obrázky 700–800 KB** bez mobilních variant — natal-bg.webp, synastry-bg.webp. Na 3G/4G to znamená 2–3s navíc.
- **Service Worker vypnutý** — žádná offline podpora, žádné cachování na mobilu
- **Index.html 89 KB** — velký initial download na pomalém připojení

**Low:**
- **autocomplete="off"** na jméno inputu (jmena/index.html) — blokuje mobilní autofill
- **Ikony bez srcset** pro 2x density displeje (80x80 fixed)

### Quick wins
1. Odstranit `autocomplete="off"`, nahradit `autocomplete="name"`
2. Přidat mobilní varianty background obrázků (400px šířka, ~200 KB)
3. Zapnout Service Worker pro offline support a cache
4. Snížit backdrop-filter na mobilu (nahradit solid background s opacity)

### Doporučení s dopadem
- **Celková velikost stránky** — po optimalizaci obrázků a CSS minifikaci: úspora ~5–8 MB na initial load
- **3G load time odhad** — aktuálně ~8–12s, po optimalizaci ~4–6s
- **Testovat na:** iPhone SE (malý displej), Samsung Galaxy A14 (low-end Android), Xiaomi Redmi (populární v ČR)

---

## 7. Infrastruktura & Monitoring

### Aktuální stav
- Railway deployment
- Compression middleware aktivní
- CORS a HTTPS redirect v produkci
- Performance logging (response time) na všech endpointech

### Problémy

**Medium:**
- **Žádný globální request timeout** — dlouhé requesty mohou viset neomezeně
- **Žádný error tracking** (Sentry, LogRocket) — chyby jdou jen do console.log
- **Žádný uptime monitoring**
- **CDN nevyužito** pro statické assety (obrázky, JS, CSS servovány přímo z Railway)
- **Database connection pooling** — závisí na Supabase defaults

### Doporučení
1. Přidat Sentry pro error tracking
2. Nastavit uptime monitoring (UptimeRobot, Better Uptime)
3. Přidat CDN (Cloudflare) pro statické assety
4. Přidat express-timeout-middleware (60s)
5. Monitorovat Railway cold start times

---

## Top 10 Quick Wins (seřazeno podle dopadu)

| # | Akce | Úspora/Dopad | Effort |
|---|------|-------------|--------|
| 1 | Skutečně minifikovat CSS | ~40 KB | 5 min |
| 2 | Konvertovat PNG → WebP (elena, jan) | ~1 MB | 10 min |
| 3 | Zmenšit blog obrázky na 200–300 KB | ~2.5 MB | 30 min |
| 4 | Lazy loadovat Three.js/Chart.js jen kde potřeba | ~791 KB na většině stránek | 1h |
| 5 | Přidat `defer` na error-boundary.js | Rychlejší first paint | 1 min |
| 6 | Opravit CSRF_SECRET fallback | Bezpečnost | 5 min |
| 7 | Přidat paginaci na admin endpoint | Stabilita při růstu | 15 min |
| 8 | Přidat DB indexy v Supabase | Rychlejší dotazy | 15 min |
| 9 | Mobilní varianty background obrázků | ~3 MB na mobilu | 30 min |
| 10 | Zapnout Service Worker | Offline + cache | 10 min |

**Celkový potenciál:** ~8 MB úspora na initial load, ~50% rychlejší mobile load time, vyšší bezpečnost.

---

## Celkové hodnocení

| Oblast | Skóre | Komentář |
|--------|-------|----------|
| SEO | **9/10** | Výborné — structured data, meta tagy, sitemap kompletní |
| Mobile UX | **8/10** | Velmi dobré — breakpointy, touch, fonty OK. Backdrop-filter a velké obrázky na mobilu |
| Security | **7/10** | Solidní základ, ale CSRF fallback a unsafe-inline CSP jsou rizika |
| Frontend Performance | **6/10** | Neminifikované CSS, obří knihovny globálně, velké obrázky |
| Backend Performance | **7/10** | Funkční, ale N+1 queries a chybějící indexy |
| Infrastruktura | **5/10** | Chybí error tracking, CDN, monitoring |

**Celkové hodnocení: B (7/10)** — Solidní základ s výborným SEO a mobile UX. Hlavní prostor pro zlepšení je ve frontend optimalizaci (obrázky, code splitting) a bezpečnosti (CSRF, CSP).
