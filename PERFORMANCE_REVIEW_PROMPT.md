# Performance Review Prompt — Mystická Hvězda

Níže je prompt, který můžeš použít (např. v Claude, ChatGPT, nebo interně) k provedení kompletního performance auditu webu.

---

## Prompt

```
Proveď kompletní performance review webu Mystická Hvězda (mystickahvezda.cz) — české spirituální platformy nabízející astrologii, tarot, numerologii a další věštecké služby. Web je postaven na vanilla HTML/CSS/JS frontendu s Node.js/Express backendem, Supabase databází a Stripe platbami. Je hostován na Railway.

Zaměř se na následující oblasti:

### 1. Frontend Performance
- Analýza Core Web Vitals (LCP, FID/INP, CLS)
- Velikost a optimalizace CSS/JS bundlů (web nepoužívá bundler, pouze vanilla soubory)
- Načítání fontů (Google Fonts: Cinzel, Inter) — jsou správně preloadovány?
- Optimalizace obrázků (formáty, lazy loading, responsive images)
- Render-blocking resources
- Cache strategie (Service Worker / PWA manifest)
- Výkon animací a přechodů (CSS transitions, scroll efekty)
- Mobile performance (web je responsive, cílí na mobilní uživatele)

### 2. Backend Performance
- Rychlost API endpointů (Express.js routes)
- Databázové dotazy do Supabase (N+1 queries, chybějící indexy)
- Rate limiting konfigurace
- Middleware stack efektivita (Helmet, CORS, XSS-clean)
- Stripe webhook zpracování
- Email queue (Resend API) — fronta a retry logika
- JWT autentizace overhead

### 3. SEO & Discoverability
- Meta tagy, Open Graph, structured data (JSON-LD)
- Správnost heading hierarchy (H1-H6)
- Canonical URLs a duplicitní obsah
- Sitemap.xml a robots.txt
- Mobile-friendliness
- Rychlost načtení stránky jako SEO faktor
- Interní prolinkování mezi 20+ stránkami
- Alt texty u obrázků

### 4. Bezpečnost & Best Practices
- HTTPS a SSL konfigurace
- Content Security Policy (CSP)
- XSS a injection ochrana
- Rate limiting na citlivé endpointy (login, platby)
- Stripe PCI compliance
- Supabase Row Level Security (RLS)
- Environment variables a secrets management

### 5. UX & Konverze
- Time to Interactive na klíčových stránkách (hlavní stránka, ceník, tarot)
- Funnel od free uživatele k premium předplatiteli (4 úrovně: Poutník → Hvězdný Průvodce → Osvícení → VIP)
- CTA viditelnost a efektivita
- Formuláře (kontakt, newsletter) — validace a UX
- Error handling a fallback stavy
- Loading stavy a skeleton screens

### 6. Mobile Experience (prioritní oblast — většina návštěvníků přichází z mobilu)
- Viewport a meta viewport konfigurace
- Touch target velikosti (min. 48x48px pro interaktivní prvky)
- Tap delay a touch responsiveness
- Mobilní navigace — hamburger menu, swipe gesta, sticky header
- Scroll performance na slabších zařízeních (Android low-end)
- Velikost textu a čitelnost bez zoomování (min. 16px base font)
- Formuláře na mobilu — input types (tel, email, number), autofill, klávesnice
- Modální okna a popupy na malých obrazovkách
- Horizontální scroll bugs (overflow-x)
- Offline režim a PWA instalace na mobilu (Add to Home Screen)
- Mobilní platební flow (Stripe Checkout na mobilu)
- Obrázky a média — srcset, sizes, art direction pro malé displeje
- CSS media queries — breakpointy a plynulost přechodů mezi velikostmi
- Spotřeba dat — celková velikost stránky na mobilních datech (3G/4G)
- Baterie — náročnost animací a JS na spotřebu baterie
- Testování na reálných zařízeních (iPhone SE, Samsung Galaxy A-série jako low-end reference)
- Google Mobile-Friendly Test a mobilní Lighthouse skóre

### 7. Infrastruktura & Monitoring
- Railway deployment konfigurace
- Cold start times
- Logging a error tracking
- Uptime monitoring
- Database connection pooling
- CDN využití pro statické assety

### Formát výstupu
Pro každou oblast uveď:
1. **Aktuální stav** — co funguje dobře
2. **Problémy** — konkrétní nálezy s prioritou (Critical / High / Medium / Low)
3. **Doporučení** — konkrétní kroky k nápravě s odhadovaným dopadem
4. **Quick wins** — co lze opravit rychle s velkým efektem

Na závěr vytvoř souhrnnou tabulku všech nálezů seřazenou podle priority a odhadovaného dopadu na uživatelský zážitek a konverze.
```

---

## Jak prompt použít

1. **S přístupem ke kódu** — vlož prompt do Claude Code a nech ho analyzovat přímo soubory v repozitáři
2. **Bez přístupu ke kódu** — použij prompt společně s výsledky z nástrojů jako Lighthouse, PageSpeed Insights, GTmetrix
3. **Jako checklist** — použij jednotlivé sekce jako manuální checklist pro tým
