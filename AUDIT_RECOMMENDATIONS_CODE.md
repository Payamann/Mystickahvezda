# Security Audit - Konkrétní Code Recommendations
## MystickaHvezda Authentication & Onboarding
**Datum**: 2026-03-15

---

## DOPORUČENÍ 1: Server-side Password Confirmation Validation

### Problém
V `server/auth.js` se `confirm_password` nekontroluje na serveru. Útočník by mohl poslat jiné heslo než klient zobrazuje.

### Řešení
```javascript
// FILE: server/auth.js (řádek 83-113)

// BEFORE:
router.post('/register', authLimiter, async (req, res) => {
    const { email, password, first_name, birth_date, birth_time, birth_place } = req.body;
    // ... nepřítomná kontrola confirm_password

// AFTER:
router.post('/register', authLimiter, async (req, res) => {
    const { email, password, confirm_password, first_name, birth_date, birth_time, birth_place } = req.body;

    try {
        // Validate input using centralized validators
        const validatedEmail = validateEmail(email);
        const validatedPassword = validatePassword(password);

        // NEW: Validate password confirmation
        if (!confirm_password || confirm_password !== password) {
            return res.status(400).json({ error: 'Hesla se neshodují.' });
        }

        const validatedFirstName = first_name ? validateName(first_name) : 'User';
        // ... rest of code
```

**Dopad**: Eliminuje risk neshody hesel mezi client-side a server-side.

---

## DOPORUČENÍ 2: Account Lockout System

### Problém
Neexistuje lockout po neúspěšných pokusech. Útočník může zkoušet brute-force.

### Řešení

#### Krok 1: Vytvořit Supabase migration
```sql
-- Migration: 2026-03-15_create_login_attempts.sql
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT
);

-- Index pro queries
CREATE INDEX idx_login_attempts_email_created ON login_attempts(email, created_at DESC);
```

#### Krok 2: Přidat helper funkci v `server/auth.js`
```javascript
// FILE: server/auth.js (na konci souboru)

// Helper: Record login attempt
async function recordLoginAttempt(email, ip, success, userAgent) {
    try {
        await supabase.from('login_attempts').insert({
            email,
            ip_address: ip,
            success,
            user_agent: userAgent
        });
    } catch (err) {
        console.error('Failed to record login attempt:', err);
    }
}

// Helper: Check if account is locked
async function isAccountLocked(email) {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('login_attempts')
            .select('success', { count: 'exact' })
            .eq('email', email)
            .eq('success', false)
            .gt('created_at', fiveMinutesAgo);

        if (error) throw error;

        // Lock if 5+ failed attempts in last 5 minutes
        const failedAttempts = data?.length || 0;
        return failedAttempts >= 5;
    } catch (err) {
        console.error('Failed to check account lock:', err);
        return false; // Default to NOT locked on error (fail-open)
    }
}

// Helper: Clear old login attempts (cleanup)
async function clearOldLoginAttempts() {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase
            .from('login_attempts')
            .delete()
            .lt('created_at', thirtyDaysAgo);
    } catch (err) {
        console.error('Failed to clear old login attempts:', err);
    }
}
```

#### Krok 3: Upravit login endpoint
```javascript
// FILE: server/auth.js (řádky 149-274)

// Login (Supabase Auth)
router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;
    const clientIp = req.ip;
    const userAgent = req.headers['user-agent'];

    try {
        // Validate input
        const validatedEmail = validateEmail(email);
        const validatedPassword = validatePassword(password);

        // NEW: Check if account is locked
        const accountLocked = await isAccountLocked(validatedEmail);
        if (accountLocked) {
            recordLoginAttempt(validatedEmail, clientIp, false, userAgent);
            return res.status(429).json({
                error: 'Příliš mnoho neúspěšných pokusů. Zkuste znovu za 5 minut.'
            });
        }

        // 1. Sign In via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: validatedEmail,
            password: validatedPassword,
        });

        if (authError) {
            // NEW: Record failed attempt
            await recordLoginAttempt(validatedEmail, clientIp, false, userAgent);
            console.error('Auth Error:', authError);
            return res.status(400).json({ error: 'Nesprávné přihlášení nebo neověřený email.' });
        }

        // NEW: Record successful attempt
        await recordLoginAttempt(validatedEmail, clientIp, true, userAgent);

        const authUser = authData.user;
        logDebug(`Login attempt for: ${authUser.email} (ID: ${authUser.id})`);

        // ... rest of code remains the same
```

**Dopad**:
- Blokuje účet po 5 neúspěšných pokusech na 5 minut
- Loguje všechny pokusy (security audit trail)
- Automaticky se vyčistí po 30 dnech

---

## DOPORUČENÍ 3: CORS Validation v Produkci

### Problém
Pokud `ALLOWED_ORIGINS` není nastaveno, bude `http://localhost:3001` v CORS v produkci.

### Řešení
```javascript
// FILE: server/index.js (řádky 44-66)

// BEFORE:
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3001', 'http://localhost:3000'];

// AFTER:
let ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3001', 'http://localhost:3000'];

// NEW: SECURITY CHECK - ensure no localhost in production
if (process.env.NODE_ENV === 'production') {
    const hasLocalhost = ALLOWED_ORIGINS.some(origin =>
        origin.includes('localhost') || origin.includes('127.0.0.1')
    );

    if (hasLocalhost) {
        console.error('❌ FATAL SECURITY ERROR: Localhost found in ALLOWED_ORIGINS for production!');
        console.error('ALLOWED_ORIGINS:', ALLOWED_ORIGINS);
        process.exit(1);
    }
}

// Always allow APP_URL in production (even if ALLOWED_ORIGINS is misconfigured)
if (process.env.APP_URL && !ALLOWED_ORIGINS.includes(process.env.APP_URL)) {
    ALLOWED_ORIGINS.push(process.env.APP_URL);
}
// ... rest of code
```

**Dopad**: Zabrání akcidenálnímu exposure v produkci.

---

## DOPORUČENÍ 4: Odstranit unsafe-inline ze CSP

### Problém
CSP má `'unsafe-inline'` v scriptSrc, což umožňuje inline XSS.

### Řešení: Refaktorovat inline event handlery

#### Krok 1: Update prihlaseni.html
```html
<!-- FILE: prihlaseni.html -->

<!-- BEFORE: -->
<button id="forgot-password-link" class="btn btn--text"
    style="color: var(--color-silver-mist); font-size: 0.9rem;"
    onclick="forgotPasswordForm.style.display='block';">
    Zapomněli jste heslo?
</button>

<!-- AFTER: -->
<button id="forgot-password-link" class="btn btn--text"
    style="color: var(--color-silver-mist); font-size: 0.9rem;"
    data-action="show-forgot-password">
    Zapomněli jste heslo?
</button>
```

#### Krok 2: Přidat event listener do inline `<script>` v prihlaseni.html
```javascript
// FILE: prihlaseni.html (v existující <script> bloku na konci)

// Přidat do DOMContentLoaded event listeneru:
document.addEventListener('DOMContentLoaded', () => {
    // ... existující kód ...

    // NEW: Event delegation pro data-action
    document.addEventListener('click', (e) => {
        const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;

        if (action === 'show-forgot-password') {
            loginForm.style.display = 'none';
            forgotPasswordForm.style.display = 'block';
            forgotPasswordLink.style.display = 'none';
            document.getElementById('auth-mode-toggle').parentElement.style.display = 'none';
            loginHeader.textContent = 'Zapomenuté heslo';
            loginSubtitle.textContent = 'Zadejte svůj email';
        }
    });
});
```

#### Krok 3: Nahradit innerHTML v js/auth-client.js
```javascript
// FILE: js/auth-client.js (řádka 232)

// BEFORE:
if (this.isPremium()) {
    authBtn.innerHTML = `Odhlásit <span style="font-size:0.8em; color:gold;">(Premium)</span>`;
}

// AFTER:
if (this.isPremium()) {
    // Create elements safely
    const premiumSpan = document.createElement('span');
    premiumSpan.style.fontSize = '0.8em';
    premiumSpan.style.color = 'gold';
    premiumSpan.textContent = '(Premium)';

    authBtn.textContent = 'Odhlásit ';
    authBtn.appendChild(premiumSpan);
}
```

#### Krok 4: Update CSP v server/index.js
```javascript
// FILE: server/index.js (řádky 140-204)

// BEFORE:
scriptSrc: [
    "'self'",
    "'unsafe-inline'",          // Removed
    'https://js.stripe.com',
    // ...
],

// AFTER:
scriptSrc: [
    "'self'",
    // "'unsafe-inline'",  // REMOVED
    'https://js.stripe.com',
    'https://cdn.jsdelivr.net',
    'https://cdnjs.cloudflare.com',
    'https://unpkg.com',
],
```

**Dopad**: Eliminuje XSS risk z inline scripts. CSP bude 'self' + trusted domains.

---

## DOPORUČENÍ 5: Token Blacklist (Quick Implementation)

### Problém
Po logout & změně hesla, staré JWT tokeny zůstávají platné 30 dní.

### Řešení: In-memory blacklist (single-instance) + Redis option

#### Krok 1: Vytvořit token blacklist service
```javascript
// FILE: server/utils/token-blacklist.js (NEW FILE)

// In-memory blacklist (pro development & single-instance)
// Pro production multi-instance: použít Redis
let blacklistedTokens = new Set();

// Cleanup expired tokens every hour
setInterval(() => {
    console.log('[TokenBlacklist] Cleanup job started');
    // V produkci by to bylo v Redis s TTL
}, 60 * 60 * 1000);

export function blacklistToken(token, expiresAt = null) {
    blacklistedTokens.add(token);

    // Optional: Remove from blacklist when JWT expires (if we know expiresAt)
    if (expiresAt) {
        const timeUntilExpiry = expiresAt - Date.now();
        setTimeout(() => {
            blacklistedTokens.delete(token);
        }, timeUntilExpiry);
    }
}

export function isTokenBlacklisted(token) {
    return blacklistedTokens.has(token);
}

export function clearBlacklist() {
    blacklistedTokens.clear();
}

export function getBlacklistSize() {
    return blacklistedTokens.size;
}
```

#### Krok 2: Update authenticateToken middleware
```javascript
// FILE: server/middleware.js (řádky 25-42)

import { isTokenBlacklisted } from './utils/token-blacklist.js';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Chybí přístupový token.' });
    }

    // NEW: Check blacklist
    if (isTokenBlacklisted(token)) {
        return res.status(401).json({ error: 'Token byl zneplatněn. Přihlaste se znovu.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Neplatný nebo vypršený token.' });
        }
        req.user = user;
        req.token = token; // Store for later blacklist operations
        req.isPremium = !!user.isPremium;
        next();
    });
};
```

#### Krok 3: Update logout endpoint (NEW)
```javascript
// FILE: server/auth.js (na konci, před export)

import { blacklistToken } from './utils/token-blacklist.js';

// NEW: Logout endpoint
router.post('/logout', authenticateToken, (req, res) => {
    try {
        // Blacklist the token
        blacklistToken(req.token, new Date(req.user.exp * 1000));

        res.json({
            success: true,
            message: 'Byli jste úspěšně odhlášeni.'
        });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Logout failed' });
    }
});

export default router;
```

#### Krok 4: Update password change endpoint
```javascript
// FILE: server/routes/user.js (řádky 164-198)

import { blacklistToken } from '../utils/token-blacklist.js';

router.put('/password', sensitiveOpLimiter, authenticateToken, async (req, res) => {
    try {
        const { currentPassword, password } = req.body;

        // ... validation code ...

        const { error } = await supabase.auth.admin.updateUserById(req.user.id, { password: validatedPassword });
        if (error) throw error;

        // NEW: Blacklist old token
        blacklistToken(req.token, new Date(req.user.exp * 1000));

        res.json({
            success: true,
            message: 'Heslo bylo úspěšně změněno. Přihlaste se s novým heslem.',
            // Suggest logout
            requiresRelogin: true
        });
    } catch (error) {
        console.error('Password Change Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se změnit heslo.' });
    }
});
```

#### Krok 5: Update client logout
```javascript
// FILE: js/auth-client.js (řádka 199-206)

// BEFORE:
logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.updateUI();
    window.location.reload();
},

// AFTER:
async logout() {
    try {
        // NEW: Call logout endpoint to blacklist token
        if (this.token) {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });
        }
    } catch (e) {
        console.warn('Logout request failed:', e);
    }

    // Clear client-side
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.updateUI();
    window.location.reload();
},
```

**Dopad**:
- Tokeny jsou invalidovány okamžitě po logout
- Tokeny jsou invalidovány ihned po změně hesla
- Staré sessiony se již nebudou akceptovat

---

## DOPORUČENÍ 6: Logging neúspěšných pokusů (Audit Trail)

### Problém
Neexistuje audit trail neúspěšných login pokusů.

### Řešení
```sql
-- Migration: 2026-03-15_create_auth_log.sql
CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'login_success', 'login_failed', 'password_reset', etc.
    email TEXT,
    user_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    status_code INT,
    error_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_auth_logs_email ON auth_logs(email);
CREATE INDEX idx_auth_logs_created ON auth_logs(created_at DESC);
```

```javascript
// FILE: server/utils/audit.js (NEW FILE)

export async function logAuthEvent(supabase, {
    eventType,     // 'login_success', 'login_failed', 'password_reset'
    email,
    userId = null,
    ipAddress,
    userAgent,
    statusCode = null,
    errorReason = null
}) {
    try {
        await supabase.from('auth_logs').insert({
            event_type: eventType,
            email,
            user_id: userId,
            ip_address: ipAddress,
            user_agent: userAgent,
            status_code: statusCode,
            error_reason: errorReason
        });
    } catch (err) {
        console.error('Failed to log auth event:', err);
    }
}
```

**Dopad**: Vytváří audit trail pro forensics a anomaly detection.

---

## DOPORUČENÍ 7: Zkrátit JWT expiraci (Optional, ale doporučované)

### Problém
30-denní JWT expiraci je dlouhá. Lepší by bylo 7 dní + refresh token.

### Řešení
```javascript
// FILE: server/config/jwt.js

export const JWT_CONFIG = {
    accessToken: {
        expiresIn: '7d'        // CHANGED from 30d
    },
    refreshToken: {
        expiresIn: '30d'       // Refresh token má delší expiraci
    }
};
```

```javascript
// FILE: server/auth.js (řádka 39)

// BEFORE:
const token = jwt.sign({...}, JWT_SECRET, { expiresIn: '30d' });

// AFTER:
const token = jwt.sign({...}, JWT_SECRET, { expiresIn: '7d' });
```

**Dopad**: Omezuje expozici v případě token theft. Vyžaduje refresh flow (už implementován).

---

## PRIORITNÍ POŘADÍ IMPLEMENTACE

1. **DNEŠNÍ DEN**: Doporučení 3 (CORS validation) - 15 minut
2. **DEN 1**: Doporučení 1 (Password confirm) + Doporučení 2 (Account lockout) - 4-5 hodin
3. **DEN 2**: Doporučení 5 (Token blacklist) - 3 hodiny
4. **DEN 3**: Doporučení 4 (Remove unsafe-inline) - 4-5 hodin
5. **DEN 4**: Doporučení 6 (Audit logging) - 2 hodiny
6. **OPTIONAL**: Doporučení 7 (Zkrátit JWT) - 1 hodina

**Celkový čas**: ~20 hodindev práce

---

## TESTING CHECKLIST

- [ ] Account lockout: 6 neúspěšných pokusů → 429 error
- [ ] Logout: Token je v blacklistu → 401 error
- [ ] Change password: Staré session -> 401 error
- [ ] CORS: localhost zablokován v produkci (výstup v server logs)
- [ ] CSP: Žádné "Refused to execute inline script" v dev tools
- [ ] Password confirm: Server vrátí error pokud se neshoduje

---

*Implementation Guide - v1.0*
*Last updated: 2026-03-15*
