# Security Audit - Comprehensive Test Plan
## MystickaHvezda Authentication & Onboarding
**Datum**: 2026-03-15

---

## 1. REGISTRATION TESTS

### 1.1 Input Validation
- [ ] **Email validation**
  - [ ] Pokus s `invalidemail` → 400 error "Invalid email format"
  - [ ] Pokus s `test@test` → 400 error "Invalid email format"
  - [ ] Pokus s `test@domain.com` → 200 OK
  - [ ] Pokus s e-mailem > 254 znaků → 400 error
  - [ ] Pokus s mezerou v emailu `test @domain.com` → 400 error

- [ ] **Password validation**
  - [ ] Pokus s heslem < 8 znaků → 400 error "at least 8 characters"
  - [ ] Pokus s heslem > 128 znaků → 400 error "too long"
  - [ ] Pokus s `abcdefgh` (jen lowercase) → 400 error "3 of 4"
  - [ ] Pokus s `Abcd1234!` (3 typy) → 200 OK
  - [ ] Pokus s `Abcd1234!@` (4 typy) → 200 OK

- [ ] **Password confirmation** (SERVER-SIDE)
  - [ ] Pokus s `password` ale `confirm_password: wrongpassword` → 400 error
  - [ ] Pokus bez `confirm_password` poля → 400 error (TODO: implementovat)
  - [ ] Pokus s shodným heslem → 200 OK

- [ ] **Name validation**
  - [ ] Pokus s `<script>alert(1)</script>` → vráceno bez tagů
  - [ ] Pokus s jménem > 100 znaků → 400 error
  - [ ] Pokus s prázdným jménem → 200 OK (fallback "User")
  - [ ] Pokus s normálním jménem `Jan Novák` → 200 OK

- [ ] **Birth date validation**
  - [ ] Pokus s budoucím datem → 400 error "future"
  - [ ] Pokus s datem < 1900 → 400 error "after 1900"
  - [ ] Pokus s validním datem `1990-05-15` → 200 OK
  - [ ] Pokus s invaliderá→m formátem `15/05/1990` → 400 error

- [ ] **Birth place validation**
  - [ ] Pokus s `<script>alert(1)</script>` → vráceno bez tagů
  - [ ] Pokus s místem > 100 znaků → 400 error
  - [ ] Pokus s normálním místem `Praha` → 200 OK

### 1.2 Rate Limiting
- [ ] **10 pokusů/hod**
  - [ ] Pokus #1-10 → všechny 200 OK (či 400 s validační chybou)
  - [ ] Pokus #11 → 429 "Příliš mnoho pokusů"
  - [ ] Pokus #12 → 429 "Příliš mnoho pokusů"
  - [ ] Čekej 1 hodinu → Pokus #13 → 200 OK (rate limit reset)

### 1.3 Email Enumeration Prevention
- [ ] **Existující email**
  - [ ] POST /register s emailem `pavel@mystickahvezda.cz` (existuje)
  - [ ] Odpověď: "Registrace se nezdařila. Zkontrolujte email a heslo." (GENERIC)
  - [ ] NE: "Uživatel s tímto emailem již existuje."

- [ ] **Neexistující email**
  - [ ] POST /register s emailem `new-user-xyz@example.com`
  - [ ] Odpověď: "Registrace úspěšná. Zkontrolujte email..."
  - [ ] Email v doručené poště s verification linkem

### 1.4 UX Tests
- [ ] **Form fields přítomna**
  - [ ] Email input s `type="email"` ✓
  - [ ] Password input s `type="password"` ✓
  - [ ] Password confirm s `type="password"` ✓
  - [ ] Name input přítomno ✓
  - [ ] Birth date input s `type="date"` ✓
  - [ ] Birth place input přítomno ✓

- [ ] **Mobile responsivita**
  - [ ] Otevřít na mobilu (375px) → formulář je čitelný
  - [ ] Všechna tlačítka jsou kliknutelná
  - [ ] Není horizontální scroll

- [ ] **Accessibility**
  - [ ] Všechna pole mají `<label>` s `for=""` atributem
  - [ ] Tab navigate skrz pole (bez Skip)
  - [ ] Chybová hlášení se přečtou screen readerem

---

## 2. LOGIN TESTS

### 2.1 Valid Credentials
- [ ] **Úspěšné přihlášení**
  - [ ] POST /login s `email: pavel@mystickahvezda.cz, password: ValidPass123!`
  - [ ] Response code: 200
  - [ ] Response obsahuje `token` a `user` object
  - [ ] Token je JWT (3 části oddělené `.`)

### 2.2 Invalid Credentials
- [ ] **Špatné heslo**
  - [ ] POST /login s `email: pavel@mystickahvezda.cz, password: WrongPassword123!`
  - [ ] Response: 400 "Nesprávné přihlášení"
  - [ ] NE: "Heslo je chybné" (neodhaluje heslo)

- [ ] **Neexistující email**
  - [ ] POST /login s `email: nonexistent@example.com, password: ValidPass123!`
  - [ ] Response: 400 "Nesprávné přihlášení"

### 2.3 Rate Limiting
- [ ] **10 pokusů/hod**
  - [ ] 10x špatný login → všechny vrátí 400
  - [ ] 11. pokus → 429 rate limit

### 2.4 JWT Claims
- [ ] **Ověřit JWT obsah**
  - [ ] Dekóduj token: `jwt.decode(token)`
  - [ ] Claims obsahuje: `id`, `email`, `subscription_status`, `isPremium`
  - [ ] `exp` claim: 30 dní od teď (EXPECTED: měl by být 7 dní)

### 2.5 Session Management
- [ ] **Token v localStorage**
  - [ ] Otevřít DevTools → Application → localStorage
  - [ ] `auth_token` klíč přítomný
  - [ ] `auth_user` (JSON s email, name, atd.)

- [ ] **Token removal na logout**
  - [ ] Přihlásit se
  - [ ] Kliknout "Odhlásit"
  - [ ] localStorage.auth_token === undefined
  - [ ] localStorage.auth_user === undefined
  - [ ] Refresh (F5) → login form se zobrazí

### 2.6 Brute Force (CURRENT STATE - EXPECTED TO FAIL)
- [ ] **Account lockout (CURRENTLY MISSING)**
  - [ ] POST /login 6x s špatným heslem
  - [ ] EXPECTED (po opravě): 429 "Příliš mnoho neúspěšných pokusů"
  - [ ] ACTUAL (nyní): Bude pokračovat v 10/hod rate limit
  - [ ] ✓ Dokončit po implementaci Doporučení #2

---

## 3. PASSWORD RESET TESTS

### 3.1 Forgot Password Flow
- [ ] **Email enumeration prevention**
  - [ ] POST /auth/forgot-password s `pavel@mystickahvezda.cz` (existuje)
  - [ ] Response: "Pokud účet existuje, odeslali jsme..."
  - [ ] Email doručen za 1-5 minut

  - [ ] POST /auth/forgot-password s `nonexistent@example.com` (neexistuje)
  - [ ] Response: "Pokud účet existuje, odeslali jsme..." (IDENTICAL)
  - [ ] Email NE doručen

### 3.2 Reset Password Flow
- [ ] **Validation**
  - [ ] Kliknout reset link v emailu
  - [ ] URL by měla obsahovat `?reset=true#access_token=...`
  - [ ] Form se zobrazí s poli pro nové heslo

- [ ] **New password validation**
  - [ ] Zadej nové heslo < 8 znaků → error
  - [ ] Zadej hesla se neshodují → error "Hesla se neshodují"
  - [ ] Zadej validní heslo 2x → Submit

- [ ] **Success**
  - [ ] Response: "Heslo bylo úspěšně změněno"
  - [ ] Redirect na login
  - [ ] Login s novým heslem → úspěšné

### 3.3 Expired Link (Supabase handled)
- [ ] **Expired link**
  - [ ] Kopírovat reset link z emailu
  - [ ] Čekat 24+ hodin
  - [ ] Kliknout link → error "Odkaz je neplatný nebo vypršel"

---

## 4. ONBOARDING TESTS

### 4.1 Post-registration flow
- [ ] **Redirect na onboarding**
  - [ ] Zaregistruj nový účet
  - [ ] Confirm email
  - [ ] Přihlášení → automatic redirect na `onboarding.html`

### 4.2 Onboarding progress
- [ ] **Step 1 → 2 → 3**
  - [ ] Step 1: "Vítejte" → "Začít nastavení" button
  - [ ] Klik → Step 2: Zodiac selection
  - [ ] Vybrat znamení → "Pokračovat" button enabled
  - [ ] Klik → Step 3: Interests
  - [ ] Vybrat (min 0) interesů → "Hotovo" button
  - [ ] Klik → redirect `index.html`

### 4.3 Data persistence
- [ ] **localStorage dopo onboarding**
  - [ ] Otevřít DevTools → Application
  - [ ] `mh_onboarded` === "1"
  - [ ] `mh_zodiac` === selected sign (e.g., "beran")
  - [ ] `mh_interests` === JSON array (e.g., `["🌌 Horoskopy", "❤️ Vztahy"]`)

### 4.4 Skip functionality
- [ ] **Skip onboarding**
  - [ ] Na Step 1, kliknout "přeskočit" link
  - [ ] Redirect na `index.html`
  - [ ] `localStorage.mh_onboarded` === "1" (nastaveno) ?
  - [ ] NEBO zůstane undefined?

### 4.5 Mobile UX
- [ ] **Mobile (375px) responsivita**
  - [ ] Všechny steps se vejdou na obrazovku
  - [ ] Tlačítka jsou kliknutelná
  - [ ] Žádný horizontal scroll

---

## 5. SECURITY TESTS

### 5.1 CSRF Protection
- [ ] **CSRF token requirement**
  - [ ] GET /api/csrf-token
  - [ ] Response: `{ csrfToken: "xxx.yyy" }`
  - [ ] Token je formátu `<random>.<hmac>`

- [ ] **POST bez CSRF tokenu**
  - [ ] POST /api/auth/logout bez `X-CSRF-Token` header
  - [ ] Response: 403 "CSRF token missing"

- [ ] **POST s platným CSRF tokenem**
  - [ ] Fetch `/api/csrf-token` → get token
  - [ ] POST /api/auth/logout s `X-CSRF-Token: <token>`
  - [ ] Response: 200 OK (nebo 401 pokud není auth)

### 5.2 XSS Protection
- [ ] **localStorage XSS risk (CURRENT)**
  - [ ] Open DevTools Console
  - [ ] Type: `localStorage.getItem('auth_token')`
  - [ ] ⚠️ Returns token in plaintext (XSS RISK)
  - [ ] ✓ Expected to be fixed with HttpOnly cookies

- [ ] **inline innerHTML safety**
  - [ ] DevTools → Sources
  - [ ] Search `innerHTML` → should be minimal/safe
  - [ ] Current: `authBtn.innerHTML = ... Premium` (RISK)
  - [ ] ✓ Expected to be fixed

- [ ] **CSP unsafe-inline (CURRENT)**
  - [ ] DevTools → Network
  - [ ] Reload page
  - [ ] Check response headers for `Content-Security-Policy`
  - [ ] Current: `'unsafe-inline'` present in scriptSrc (RISK)
  - [ ] ✓ Expected to be removed

### 5.3 CORS
- [ ] **CORS headers check**
  - [ ] DevTools → Network → Fetch any API call
  - [ ] Response headers: `Access-Control-Allow-Origin: <origin>`
  - [ ] Should be: `https://mystickahvezda.cz` (or current domain)
  - [ ] Should NOT be: `*` (wildcard)

- [ ] **Localhost in production (RISK)**
  - [ ] Check server startup logs
  - [ ] Current (risk): `ALLOWED_ORIGINS: ['http://localhost:3001', ...]`
  - [ ] Expected: Only production domains

### 5.4 HTTP Security Headers
- [ ] **HSTS header**
  - [ ] DevTools → Network → Any request
  - [ ] Response headers: `Strict-Transport-Security: max-age=31536000`

- [ ] **CSP header**
  - [ ] Response headers: `Content-Security-Policy: ...`
  - [ ] Contains directives (script-src, style-src, etc.)

- [ ] **X-Frame-Options**
  - [ ] Response headers: `X-Frame-Options: DENY`

- [ ] **X-Content-Type-Options**
  - [ ] Response headers: `X-Content-Type-Options: nosniff`

---

## 6. ACCOUNT LOCKOUT TESTS (POST-IMPLEMENTATION)

### 6.1 Lockout mechanism
- [ ] **5 neúspěšné pokusy**
  - [ ] POST /login s špatným heslem (attempt 1)
  - [ ] POST /login s špatným heslem (attempt 2)
  - [ ] POST /login s špatným heslem (attempt 3)
  - [ ] POST /login s špatným heslem (attempt 4)
  - [ ] POST /login s špatným heslem (attempt 5)
  - [ ] Response (attempt 5): 400 "Nesprávné přihlášení" + login_attempts DB record

  - [ ] POST /login s špatným heslem (attempt 6)
  - [ ] Response: 429 "Příliš mnoho neúspěšných pokusů. Zkuste znovu za 15 minut."

### 6.2 Lockout reset
- [ ] **Čekání na unlock**
  - [ ] Čekat 15 minut
  - [ ] POST /login s SPRÁVNÝM heslem
  - [ ] Response: 200 OK

### 6.3 Progressivní delay
- [ ] **Check server delays**
  - [ ] Neimplementováno v Phase 1 (OPTIONAL)
  - [ ] Expected (Phase 2+): 1s → 2s → 4s → 8s

---

## 7. TOKEN BLACKLIST TESTS (POST-IMPLEMENTATION)

### 7.1 Logout invalidation
- [ ] **Token invalidace po logout**
  - [ ] Přihlásit se → get token
  - [ ] GET /api/auth/profile s tokenem → 200 OK
  - [ ] POST /api/auth/logout s tokenem
  - [ ] GET /api/auth/profile s STEJNÝM tokenem → 401 "Token zneplatněn"

### 7.2 Password change invalidation
- [ ] **Session invalidace po změně hesla**
  - [ ] Otevřít 2 tabs s přihlášením (stejný token)
  - [ ] Tab 1: PUT /api/user/password (change password)
  - [ ] Tab 1: Refresh page → login form (session reset expected)
  - [ ] Tab 2: GET /api/auth/profile s STARÝM tokenem → 401

---

## 8. INTEGRATION TESTS

### 8.1 Happy path
- [ ] **Úplný flow: Register → Email verify → Onboard → Login → Profile**
  - [ ] POST /register s novým emailem
  - [ ] Email confirmation link
  - [ ] POST /login po email verifikaci
  - [ ] Redirect na onboarding.html
  - [ ] Onboarding completion
  - [ ] GET /api/auth/profile → vrací user data

### 8.2 Unhappy path
- [ ] **Error recovery**
  - [ ] Register → error (rate limit)
  - [ ] Wait 1 hour → Register again → Success
  - [ ] Login → error (wrong password)
  - [ ] Login → Success (correct password)

---

## 9. PERFORMANCE TESTS

- [ ] **/register latency**: < 2 seconds
- [ ] **/login latency**: < 2 seconds
- [ ] **/auth/profile latency**: < 1 second
- [ ] **Database queries**: All indexed properly (e.g., users.email)

---

## 10. BROWSER COMPATIBILITY

- [ ] **Chrome 90+**
- [ ] **Firefox 88+**
- [ ] **Safari 14+**
- [ ] **Edge 90+**
- [ ] **Mobile Safari (iOS 14+)**
- [ ] **Chrome Mobile (Android)**

---

## TEST RESULTS TEMPLATE

```
Test Suite: [NAME]
Date: 2026-03-15
Tester: [NAME]
Environment: [DEV/STAGING/PROD]

| Test | Status | Notes |
|------|--------|-------|
| 1.1.1 Email validation | ✓ PASS | |
| 1.1.2 Password validation | ✓ PASS | |
| 2.1.1 Valid login | ✓ PASS | Token received |
| 5.1.1 CSRF protection | ✓ PASS | 403 without token |
| 6.1.1 Account lockout | ✗ FAIL | Not implemented |

Total: 15/16 PASS (94%)
Critical issues: 1
Blockers: 0
```

---

## AUTOMATION SCRIPTS

### Postman Collection (TODO)
```json
{
  "info": {
    "name": "MystickaHvezda Auth Security Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register with valid data",
      "request": {
        "method": "POST",
        "url": "{{BASE_URL}}/api/auth/register",
        "body": {
          "email": "{{RANDOM_EMAIL}}",
          "password": "ValidPass123!",
          "confirm_password": "ValidPass123!"
        }
      }
    },
    {
      "name": "Login with valid credentials",
      "request": {
        "method": "POST",
        "url": "{{BASE_URL}}/api/auth/login",
        "body": {
          "email": "test@example.com",
          "password": "ValidPass123!"
        }
      }
    }
  ]
}
```

---

## SUCCESS CRITERIA

### Phase 1 Completion
- [ ] 80% of tests PASS
- [ ] All CRITICAL tests PASS
- [ ] No unresolved blockers
- [ ] Code review approved

### Phase 2 Completion
- [ ] 95% of tests PASS
- [ ] All security tests PASS
- [ ] Performance benchmarks met
- [ ] Ready for production

---

*Test Plan - v1.0*
*Last updated: 2026-03-15*
