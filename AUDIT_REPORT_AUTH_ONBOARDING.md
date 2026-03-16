# Audit & Evaluace Autentizačních a Onboardingových Toků
## MystickaHvezda - Komplexní Security Report
**Datum auditů**: 2026-03-15
**Verze**: 1.0

---

## 1. REGISTRACE (server/auth.js, js/auth-client.js, prihlaseni.html)

### 1.1 Validace vstupů

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **Email validace** - Server-side RFC regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) provádí základní kontrolu. Lowercase & trim normalizace. Max délka 254 znaků. | server/utils/validation.js:50-68 | - |
| ✅ OK | **Password validace** - 8-128 znaků, 3 ze 4 typů (upper/lower/num/special) - identická pravidla na obou stranách | server/utils/validation.js:121-150, js/auth-client.js:351-355 | - |
| ⚠️ Varování | **Password confirmation - POUZE client-side** - Server NEKONTROLUJE, zda byl poslán field `confirm_password`. Pohlcuje libovolná data v `additionalData`. Útočník by mohl poslat jiné heslo než potvrzení ukazuje. | server/auth.js:83-113, js/auth-client.js:351-355 | **Střední** |
| ✅ OK | **Name sanitizace** - HTML znaky `<>{}[]` se odstraňují, max 100 znaků | server/utils/validation.js:31-48 | - |
| ✅ OK | **Birth_date validace** - Kontrola validity data, musí být v minulosti, po roce 1900 | server/utils/validation.js:6-29 | - |
| ✅ OK | **Birth_place sanitizace** - HTML znaky se odstraňují, max 100 znaků (`substring(0, 100)` v auth.js:110) | server/auth.js:110 | - |
| ✅ OK | **Birth_time** - Formát kontrolován na klientu i serveru (HH:MM regex) | server/utils/validation.js:89-101, js/auth-client.js |  |

**Doporučení 1.1**: Přidat server-side validaci povinného pole `password_confirm` při registraci a porovnání s heslem - alespoň jako warning.

---

### 1.2 Chybové stavy

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **Email enumeration prevention** - Při registraci se vrací generic chyba "Registrace se nezdařila" místo specifické informace o existujícím emailu | server/auth.js:115-128 | - |
| ✅ OK | **Chybové hlášky v češtině** - Všechny odpovědi jsou v českém jazyce | server/auth.js | - |
| ✅ OK | **Supabase error handling** - Zachycují se chyby a vracejí se generic zprávy | server/auth.js:138-144 | - |
| ✅ OK | **Rate limiting** - 10 pokusů/hod na `/register` přes `authLimiter` | server/auth.js:49-55, 83 | - |
| ✅ OK | **Rate limit messages** - V češtině: "Příliš mnoho pokusů" | server/auth.js:52 | - |

---

### 1.3 Email verifikace

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **Email verifikace vyžadována** - `signUp()` automaticky odesílá confirmation email, login je blokován bez verify | server/auth.js:98-113 | - |
| ✅ OK | **Redirect URL v emailu** - Nastavuje se na `APP_URL` (flexible, ne hardcoded) | server/auth.js:104-105 | - |
| ⚠️ Varování | **Expired link handling** - Supabase se stará o expirace (default 24h), ale klient nemá explicitní informaci o expiračním čase | js/auth-client.js:40-68 | **Nízká** |
| ✅ OK | **Chybová hlášení** - "Odkaz je neplatný nebo vypršel" i s detektem `otp_expired` | js/auth-client.js:54-67 | - |

**Doporučení 1.3**: Zobrazit čas vypršení verifikačního linku v emailu.

---

### 1.4 UX registračního formuláře

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **Labels & placeholders** - Všechna pole mají labels a placeholders | prihlaseni.html:108-263 | - |
| ✅ OK | **Real-time validace** - Klient-side validace hesla s feedback (3/4 complexity) | js/auth-client.js:169-188 | - |
| ✅ OK | **Aria atributy** - Použíty labels `for=""`, input `id=""` atributy | prihlaseni.html:108-263 | - |
| ✅ OK | **Mobile responsivita** - Media queries, flexbox layout | css/style.v2.min.css | - |
| ⚠️ Varování | **Password strength meter chybí** - Uživatel nevidí vizuální feedback o komplexitě hesla při psaní | - | **Nízká** |
| ✅ OK | **Confirm password field** - Přítomné v registraci, porovnáno na klientu | prihlaseni.html:240-242, js/auth-client.js:351-355 | - |

---

## 2. PŘIHLÁŠENÍ (server/auth.js:149-274)

### 2.1 Autentizace & JWT

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **JWT claims** - Obsahuje: `id`, `email`, `subscription_status`, `isPremium`, `premiumExpires` | server/auth.js:248-254 | - |
| ✅ OK | **JWT expiraci** - 30 dní (`expiresIn: '30d'`) - přiměřené pro typ aplikace | server/auth.js:39, 254 | - |
| ✅ OK | **JWT secret** - Kontrola v produkci (`JWT_SECRET` musí být nastaveno) | server/config/jwt.js:13-16 | - |
| ✅ OK | **Token refresh flow** - `/api/auth/refresh-token` endpoint s `authenticateToken` | server/auth.js:277-315 | - |
| ✅ OK | **JIT repair logika** - Pokud uživatel chybí v DB, automaticky se vytvoří s metadaty | server/auth.js:199-237 | - |
| ✅ OK | **Subscription info caching** - Token obsahuje aktuální `isPremium` status | server/auth.js:244-246 | - |

---

### 2.2 Session management

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ❌ PROBLÉM | **Token v localStorage** - Aktuálně se ukládá v localStorage, což je XSS-prone. Poznámka v kódu ("For future security hardening, move tokens to HttpOnly cookies") | js/auth-client.js:5-7 | **VYSOKÁ** |
| ✅ OK | **Token removal na logout** - Oba klíče se odstraňují: `auth_token`, `auth_user` | js/auth-client.js:200-206 | - |
| ⚠️ Varování | **Token blacklist** - Neexistuje server-side seznam odhlášených tokenů. Vypršelý token bude platný 30 dní. | - | **Střední** |
| ⚠️ Varování | **Změna hesla - starý token** - Při `PUT /api/user/password` se staré sessiony NEVALIDUJÍ. Starý token zůstane platný 30 dní. | server/routes/user.js:164-198 | **Střední** |

**Doporučení 2.2a**: Migrovat na HttpOnly cookies + Secure flag + SameSite=Strict
**Doporučení 2.2b**: Implementovat token blacklist (Redis/DB) pro logout a změnu hesla
**Doporučení 2.2c**: Zkrátit JWT expiraci na 1-7 dní + implementovat refresh token mechanism

---

### 2.3 Brute-force ochrana

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **Rate limiting** - 10 pokusů/hod na `/login` (`authLimiter`) | server/auth.js:49-55, 149 | - |
| ❌ PROBLÉM | **Account lockout** - Neexistuje. Útočník může zkoušet unlimited pokusy (limituje jej jen rate limit 10/h). Po 24h může pokusit znovu. | - | **VYSOKÁ** |
| ✅ OK | **Login attempt logging** - Debug logování přihlášení (v dev mode) | server/auth.js:169, 199 | - |
| ⚠️ Varování | **Neúspěšné pokusy** - Nelogují se neúspěšné pokusy do databáze (nelze sledovat patterns) | - | **Střední** |

**Doporučení 2.3a**: Přidat account lockout po N neúspěšných pokusech
**Doporučení 2.3b**: Logovat neúspěšné pokusy do DB s IP & email
**Doporučení 2.3c**: Implementovat progressivní delay (1s, 2s, 4s, 8s...) po každém neúspěšném pokusu

---

## 3. RESET HESLA (server/auth.js:318-380)

### 3.1 Forgot password flow

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **Email enumeration prevention** - Vždy vrací stejnou zprávu "Pokud účet existuje, odeslali jsme..." | server/auth.js:333-337 | - |
| ✅ OK | **Redirect URL** - Vrací se `?reset=true` v URL | server/auth.js:326 | - |
| ✅ OK | **Rate limiting** - 10 pokusů/hod (`authLimiter`) | server/auth.js:318 | - |
| ✅ OK | **Error handling** - Vrací generickou zprávu i v case error | server/auth.js:340-343 | - |

---

### 3.2 Reset password flow

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **Bearer token validace** - Očekává access token v `Authorization: Bearer` headeru | server/auth.js:350-355 | - |
| ✅ OK | **Nový password validation** - Stejná pravidla jako registrace (8-128 znaků, 3/4 complexity) | server/auth.js:358-359 | - |
| ✅ OK | **Session invalidace** - Supabase automaticky invaliduje ALL sessions při `updateUser()` | server/auth.js:362-365 | - |
| ⚠️ Varování | **Expired/invalid token** - Vrací generic error "Odkaz je neplatný nebo vypršel" (dobré, bez enumeration) | server/auth.js:369 | - |
| ✅ OK | **Response po resetě** - Vrací success, uživatel musí manuálně přejít na login | server/auth.js:372-375 | - |

---

### 3.3 Client-side UX

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **UI pro reset hesla** - Formulář se zobrazuje v prihlaseni.html | prihlaseni.html:192-220 | - |
| ✅ OK | **Password requirements** - HTML má minlength="8", server validuje komplexitu | prihlaseni.html:198-210 | - |
| ✅ OK | **Password confirmation** - Porovnání na klientu | prihlaseni.html:477-501 | - |
| ✅ OK | **Česká hlášení** - Všechny zprávy v češtině | prihlaseni.html | - |

---

## 4. ONBOARDING (onboarding.html, js/auth-client.js)

### 4.1 Flow po registraci

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **Redirect na onboarding** - Po úspěšné registraci se přesměruje na `onboarding.html` | js/auth-client.js:120-122 | - |
| ✅ OK | **localStorage flag** - `mh_onboarded` se kontroluje a nastavuje | js/auth-client.js:120, onboarding.html:617 | - |
| ✅ OK | **Skip opce** - Uživatel může přeskočit onboarding ("přeskočit" link) | onboarding.html:436 | - |
| ⚠️ Varování | **Refresh uprostřed onboardingu** - Při F5 se všechny data ztratí (v localStorage ne, progress ano) | onboarding.html | **Nízká** |

---

### 4.2 Obsah onboardingu

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **Kroky logické** - 3 kroky: Welcome → Zodiac → Interests | onboarding.html:424-543 | - |
| ⚠️ Varování | **Birth data se NESBÍRĀjí** - Onboarding sbírá jen zodiac & interests, nikoliv birth_date/time/place | onboarding.html | **Nízká** |
| ✅ OK | **Česká hlášení** - Všechny texty v češtině | onboarding.html | - |
| ✅ OK | **Mobile responsivita** - Flexbox layout, jednobuňkový design | onboarding.html | - |

---

### 4.3 Dokončení onboardingu

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **mh_onboarded flag** - Nastavuje se na '1' | onboarding.html:617 | - |
| ✅ OK | **Další data v localStorage** - `mh_zodiac` (string), `mh_interests` (JSON array) | onboarding.html:613-615 | - |
| ✅ OK | **Redirect** - Na `index.html` po dokončení | onboarding.html:619 | - |
| ✅ OK | **Opakování** - localStorage flag lze přenastavit pro re-onboarding | - | - |

---

## 5. SECURITY AUDIT

### 5.1 CSRF ochrana

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **HMAC-SHA256** - Token se generuje s `crypto.createHmac('sha256', csrfSecret)` | server/index.js:223-229 | - |
| ✅ OK | **Timing-safe comparison** - Używá `crypto.timingSafeEqual()` | server/index.js:255 | - |
| ✅ OK | **POST/PUT/PATCH/DELETE ochrana** - CSRF middleware aplikován na všechny state-changing operace | server/index.js:292-295 | - |
| ✅ OK | **Token refresh** - Nový token se generuje na každém requestu | server/index.js:298-306 | - |
| ✅ OK | **Endpoint pro načtení tokenu** - `GET /api/csrf-token` vrací nový token | server/index.js:298-306 | - |
| ⚠️ Varování | **Client-side integrace** - auth-client.js volá `window.getCSRFToken()` (není v souboru vidět implementace, ale zavolá se) | js/auth-client.js:99, 171 | **Nízká** |

---

### 5.2 CORS

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **ALLOWED_ORIGINS** - Načítá se z `.env`, fallback na `http://localhost:3001` | server/index.js:44-46 | - |
| ✅ OK | **Production domains** - Hardcoded fallback: `https://mystickahvezda.cz` + `www` variant | server/index.js:60-66 | - |
| ✅ OK | **App URL** - Dynamicky se přidá z `process.env.APP_URL` | server/index.js:49-58 | - |
| ✅ OK | **Credentials flag** - `credentials: true` pro cookies | server/index.js:77 | - |
| ✅ OK | **Origin callback** - Custom callback s explicitní kontrolou | server/index.js:70-75 | - |
| ❌ PROBLÉM | **Localhost origins v produkci?** - Pokud `ALLOWED_ORIGINS` není nastaveno a NODE_ENV=production, bude `http://localhost:3001` v CORS! | server/index.js:44-46 | **VYSOKÁ** |

**Doporučení 5.2**: Přidat kontrolu, že v produkci se localhost NIKDY nepřidá do ALLOWED_ORIGINS.

---

### 5.3 Security headers (Helmet)

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **CSP** - Implementován s defaultSrc, scriptSrc, styleSrc atd. | server/index.js:140-204 | - |
| ⚠️ Varování | **CSP scriptSrc** - `'unsafe-inline'` je povoleno! Nutné pro inline event handlery (onclick) | server/index.js:145-146 | **VYSOKÁ** |
| ✅ OK | **HSTS** - `max-age: 31536000` (1 rok) + includeSubDomains + preload | server/index.js:188-192 | - |
| ✅ OK | **X-Frame-Options** - `deny` (clickjacking prevence) | server/index.js:201 | - |
| ✅ OK | **X-Content-Type-Options** - `nosniff` | server/index.js:202 | - |
| ✅ OK | **X-XSS-Protection** - Povoleno | server/index.js:203 | - |
| ✅ OK | **Permissions-Policy** - Vypnuty všechny: geolocation, microphone, camera, usb | server/index.js:194-198 | - |
| ✅ OK | **Referrer-Policy** - `strict-origin-when-cross-origin` | server/index.js:193 | - |

**Doporučení 5.3a**: Odstranit `'unsafe-inline'` ze scriptSrc a místo toho refaktorovat inline event handlery na data-attributes + event delegation
**Doporučení 5.3b**: Přidat nonce na inline skripty, pokud se odstraní `'unsafe-inline'`

---

### 5.4 Ochrana proti útokům

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **XSS - textContent** - Toast zprávy používají `.textContent` místo `.innerHTML` | js/auth-client.js:144-156 | - |
| ❌ PROBLÉM | **XSS - innerHTML v UI** - Jeden line: `authBtn.innerHTML = \`Odhlásit <span>...\` | js/auth-client.js:232 | **STŘEDNÍ** |
| ✅ OK | **SQL Injection** - Supabase Postgres automaticky parametrizuje, žádné raw queries | server/auth.js | - |
| ✅ OK | **Request size limits** - 10KB JSON, 5KB URL-encoded | server/index.js:106-114 | - |
| ✅ OK | **Error stack traces** - Neposílají se klientovi v produkci (jen v dev) | server/index.js:435-437 | - |
| ✅ OK | **Input sanitizace** - xss-clean middleware na `/api` | server/index.js:309 | - |

**Doporučení 5.4a**: Nahradit innerHTML u Premium buttonu textContenim nebo použít template literal bez HTML.

---

### 5.5 Middleware

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **authenticateToken** - Validuje JWT, vrací 401 bez tokenu, 403 pro invalid | server/middleware.js:25-42 | - |
| ⚠️ Varování | **requirePremium - dev bypass** - V development se middleware skipuje! | server/middleware.js:48-50 | **STŘEDNÍ** |
| ✅ OK | **requireAdmin** - Kontroluje `role === 'admin'` OR email v `ADMIN_EMAILS` | server/middleware.js:85-95 | - |
| ✅ OK | **optionalPremiumCheck** - Bezpečně, jen nastaví req.user pokud je token | server/middleware.js:67-83 | - |

**Doporučení 5.5**: Vyhodnotit, zda je dev bypass pro premium opravdu nutný. Lépe testovat s mock data.

---

### 5.6 Supabase RLS

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **Readings table** - `.eq('user_id', req.user.id)` na každém dotazu | server/routes/user.js:24-160 | - |
| ✅ OK | **Service role key** - Není viditelný v kódu (stored v .env) | server/db-supabase.js | - |
| ⚠️ Varování | **RLS policies** - NENÍ kontrolován v tomto auditu (vyžaduje přístup do Supabase console) | - | - |

**Doporučení 5.6**: Ověřit v Supabase, že všechny RLS policy jsou nastaveny správně (especially na readings, subscriptions, users).

---

## 6. ZMĚNA HESLA (server/routes/user.js:164-198)

| Status | Popis | Řádek | Závažnost |
|--------|-------|-------|-----------|
| ✅ OK | **Aktuální heslo vyžadováno** - `currentPassword` musí být poslán | server/routes/user.js:169-171 | - |
| ✅ OK | **Nové heslo validace** - Stejná pravidla (8-128, 3/4 complexity) | server/routes/user.js:176-179 | - |
| ✅ OK | **Ověření aktuálního hesla** - `signInWithPassword()` se volá a kontroluje se error | server/routes/user.js:181-188 | - |
| ✅ OK | **Rate limiting** - 10 pokusů/hod (`sensitiveOpLimiter`) | server/routes/user.js:15-21, 164 | - |
| ❌ PROBLÉM | **Session invalidace** - Staré sessions NEBUDOU invalidovány! Starý token zůstane platný 30 dní. | server/routes/user.js:190 | **VYSOKÁ** |

**Doporučení 6**: Po změně hesla invalidovat všechny existující JWT tokeny (implementovat blacklist).

---

## SHRNUTÍ & TOP 5 PRIORIT

### Celkové skóre bezpečnosti: **6.5/10**

**Pozitiva:**
- ✅ Validace vstupů comprehensive (email, password, jména, data)
- ✅ CSRF ochrana HMAC-SHA256 s timing-safe comparison
- ✅ Rate limiting na všech kritických endpointech
- ✅ Email enumeration prevence
- ✅ HTTPS enforcement + HSTS
- ✅ Security headers (HSTS, X-Frame-Options, CSP)
- ✅ Error handling bez stack traces v produkci

**Kritická slabá místa:**

### TOP 5 NEJDŮLEŽITĚJŠÍCH VĚCÍ K OPRAVĚ:

1. **❌ KRITICKÁ - Token v localStorage + absence blacklistu**
   - **Problém**: JWT tokeny mají 30 dní expiraci a jsou v localStorage (XSS-prone)
   - **Řešení**: Migrovat na HttpOnly cookies + Secure + SameSite=Strict; implementovat token blacklist (Redis)
   - **Čas**: 8 hodin
   - **Soubory**: js/auth-client.js, server/index.js, server/middleware.js

2. **❌ VYSOKÁ - Account lockout chybí**
   - **Problém**: Útočník může zkoušet unlimited pokusy (rate-limit jen na 10/h, pak znovu za 24h)
   - **Řešení**: Přidat account lockout po 5 neúspěšných pokusech na 15 minut + progressivní delay
   - **Čas**: 4 hodiny
   - **Soubory**: server/auth.js, server/db-supabase.js (nová tabulka `login_attempts`)

3. **❌ VYSOKÁ - Localhost v CORS produkci**
   - **Problém**: Pokud `ALLOWED_ORIGINS` není nastaveno, `http://localhost:3001` bude v CORS v produkci
   - **Řešení**: Přidat validaci, že localhost se nikdy nepřidá v produkci
   - **Čas**: 1 hodina
   - **Soubory**: server/index.js:44-46

4. **⚠️ VYSOKÁ - unsafe-inline CSP**
   - **Problém**: `'unsafe-inline'` v scriptSrc umožňuje inline XSS
   - **Řešení**: Refaktorovat inline event handlery (onclick) na event delegation + data-attributes
   - **Čas**: 6 hodin
   - **Soubory**: onboarding.html, prihlaseni.html, server/index.js

5. **⚠️ STŘEDNÍ - Změna hesla nevaliduje staré sessions**
   - **Problém**: Po změně hesla staré JWT tokeny zůstávají platné 30 dní
   - **Řešení**: Implementovat token blacklist nebo zkrátit expiraci + refresh flow
   - **Čas**: 4 hodiny
   - **Soubory**: server/routes/user.js:190, server/middleware.js

---

## PODROBNÁ DOPORUČENÍ

### Segmentem 1: AUTHENTICATION (Priority 1-2)

#### A. HttpOnly Cookies migration
```
Cíl: Přesunout JWT z localStorage na HttpOnly cookies
Fáze 1: Přidat cookie handling do server/index.js
Fáze 2: Aktualizovat js/auth-client.js na přístup přes /api/auth/me
Fáze 3: Testovat logout, refresh token, XSS injection
Očekávaný dopad: Eliminuje localStorage XSS risk
```

#### B. Token blacklist (Redis/In-memory)
```
Cíl: Invalidovat tokeny při logout & změně hesla
Implementace: Sada (Set) v Node.js paměti (vhodné pro single-instance)
Produkce: Redis pro multi-instance setup
Soubory: server/middleware.js (přidat checkBlacklist), server/auth.js (logout endpoint)
```

#### C. Account lockout
```
Cíl: Lockout účtu po 5 neúspěšných pokusů na 15 minut
Implementace:
  - Nová tabulka `login_attempts(user_id, email, ip, attempts, locked_until)`
  - Kontrola v /api/auth/login
  - Progressivní delay: 1s → 2s → 4s → 8s
Soubory: server/auth.js, server/db-supabase.js (migration)
```

---

### Segmentů 2: CSRF & XSS (Priority 3-4)

#### D. Odstranit unsafe-inline z CSP
```
Kroky:
  1. Refaktorovat prihlaseni.html onclick handlery:
     - Místo: <button onclick="foo()">
     - Na: <button data-action="foo" id="login-button">
  2. Přidat event listeners v prihlaseni.html inline <script>
  3. Přidat nonce ke zbylým inline scriptům
Řádky: prihlaseni.html:226-689, server/index.js:141-204
```

#### E. Validation on server for password_confirm
```
Server-side:
  - Přidat validaci req.body.confirm_password === req.body.password
  - Vrátit 400 pokud se neshodují
Soubor: server/auth.js:83-113
```

---

### Segmentů 3: SESSION & POLICY (Priority 5+)

#### F. JWT expiraci zkrátit
```
Změna: 30 dní → 7 dní (nebo 1 den)
Trade-off: Více refresh tokens, ale lepší security
Refresh token: Implementovat refresh token rotation (1x za 24h)
Soubor: server/auth.js:39, server/config/jwt.js
```

#### G. CORS validation v produkci
```
Přidat guard v server/index.js:44-46:
```javascript
if (process.env.NODE_ENV === 'production' && ALLOWED_ORIGINS.includes('http://localhost')) {
    console.error('❌ FATAL: Localhost found in CORS origins for production!');
    process.exit(1);
}
```

#### H. Logging neúspěšných pokusů
```
Nová tabulka: `auth_logs(id, email, ip, status, timestamp, reason)`
Logovat:
  - Neúspěšné pokusy o login (invalid password)
  - IP & User-Agent
  - Čas
Cíl: Detekce anomálií, forensics
Soubor: server/auth.js:158-174
```

---

## TESTOVACÍ CHECKLIST

- [ ] Pokus o registraci s emailem, který neobsahuje @
- [ ] Pokus o registraci s heslem < 8 znaků
- [ ] Pokus o registraci se 2 rozdílnými hesly (confirm_password)
- [ ] Ověřit, že email enumeration je preventován (/register & /forgot-password)
- [ ] Pokus login 11x za hodinu → ověřit rate limit 429
- [ ] Pokus reset hesla na neexistující email → generic message
- [ ] Logout → token v localStorage by měl chybět
- [ ] Logout → localStorage.getItem('auth_token') === null
- [ ] Change password → staré session by měly být invalidovány (TEST: Otevřít 2 záložky, change v jedné, zkusit fetch v druhé → měl by vrátit 403)
- [ ] Onboarding: Skip → localStorage flag kontrola
- [ ] CSRF token: GET /api/csrf-token → vrací validní token
- [ ] CSRF protection: POST /api/... bez tokenu → 403
- [ ] localStorage inspection: Zkontrolovat, že nejsou citlivá data
- [ ] CSP test: Zkusit inline script bez nonce → Console error
- [ ] Supabase RLS: Pokus přečíst reading jiného uživatele → Query by měla selhat (RLS policy)

---

## ZÁVĚR

Aplikace má **solidní základy** security, ale má **5 kritických do středně-vysokých slabostí**, které je třeba řešit:

1. **localStorage JWT** - Migrovat na HttpOnly cookies (BEZPODMÍNEČNÉ)
2. **Account lockout** - Přidat brute-force ochranu (KRITICKÉ)
3. **CORS localhost** - Validovat v produkci (VYSOKÉ)
4. **CSP unsafe-inline** - Refaktorovat (VYSOKÉ)
5. **Token blacklist** - Invalidovat při logout/change password (STŘEDNÍ-VYSOKÉ)

**Časový odhad na kompletní opravu**: ~25-30 hodin dev práce

**Priorita**: Spustit Phase 1 (cookies + blacklist) PŘED production deploymentem.

---

*Audit completed 2026-03-15*
*Next review: Po implementaci top 5 priorit (Expected: 2026-03-25)*
