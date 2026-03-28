# /security-audit — Bezpečnostní audit aplikace

Zkontroluj bezpečnost Express.js backendu a frontendu.

---

## Kontroly

### 1. CSRF ochrana na POST endpointech
```bash
# Najdi všechny POST routy
grep -rn 'router\.post\|app\.post' server/*.js

# Zkontroluj, že všechny mají CSRF middleware
grep -rn 'verifyCsrf\|csrfProtection\|validateCsrf' server/*.js
```
Ověř, že KAŽDÝ POST endpoint má CSRF ochranu.

### 2. Rate limiting
```bash
grep -rn 'rateLimit\|rateLimiter\|rate-limit' server/*.js
```
Ověř, že citlivé endpointy (login, register, contact, API) mají rate limiting.

### 3. Input validace
```bash
# Hledej endpointy, které berou req.body bez validace
grep -rn 'req\.body' server/*.js | head -20
```
Pro každý endpoint ověř, že existuje validace vstupu před zpracováním.

### 4. SQL injection / NoSQL injection
```bash
# Hledej přímé vkládání uživatelského vstupu do queries
grep -rn 'query.*req\.\|where.*req\.\|eq.*req\.' server/*.js | head -10
```

### 5. XSS ochrana
```bash
# Hledej innerHTML nebo přímé vkládání do DOM bez sanitizace
grep -rn 'innerHTML\|outerHTML\|document\.write' js/*.js | head -10
```

### 6. CSP (Content Security Policy)
```bash
grep -rn 'Content-Security-Policy\|helmet\|csp' server/*.js server.js | head -10
```

### 7. Inline scripty (CSP violation)
```bash
grep -rn '<script>' *.html | grep -v 'src=\|type="application/ld+json"' | head -10
```

### 8. Citlivé údaje v kódu
```bash
# API klíče, hesla, tokeny v kódu (ne v .env)
grep -rn 'sk_live\|sk_test\|password.*=.*["\x27]\|secret.*=.*["\x27]\|api_key.*=.*["\x27]' server/*.js js/*.js --include='*.js' | grep -v 'process\.env\|\.env\|placeholder\|test-' | head -10
```

### 9. .env v .gitignore
```bash
grep '\.env' .gitignore
```

### 10. Stripe webhook validace
```bash
grep -rn 'constructEvent\|webhook.*secret\|STRIPE_WEBHOOK_SECRET' server/*.js | head -5
```

### 11. JWT bezpečnost
```bash
grep -rn 'jwt\.\|jsonwebtoken\|JWT_SECRET' server/*.js | head -10
```
Ověř, že JWT_SECRET pochází z env vars a tokeny mají expiraci.

### 12. HTTP Security Headers
```bash
grep -rn 'helmet\|X-Frame-Options\|X-Content-Type\|Strict-Transport' server/*.js server.js | head -10
```

---

## Výstupní formát

```markdown
### Security Audit Report

| Kontrola | Stav | Závažnost | Detail |
|----------|------|-----------|--------|
| CSRF ochrana | ✅/❌ | Kritická | ... |
| Rate limiting | ✅/❌ | Vysoká | ... |
| Input validace | ✅/❌ | Vysoká | ... |
| XSS ochrana | ✅/⚠️ | Vysoká | ... |
| CSP | ✅/❌ | Střední | ... |
| Inline scripty | ✅/❌ | Střední | ... |
| Citlivé údaje | ✅/❌ | Kritická | ... |
| .env gitignore | ✅/❌ | Kritická | ... |
| Stripe webhook | ✅/❌ | Vysoká | ... |
| JWT bezpečnost | ✅/❌ | Vysoká | ... |
| HTTP hlavičky | ✅/❌ | Střední | ... |

**Celkové hodnocení: A/B/C/D/F**
```

Kritické a vysoké problémy vypiš s konkrétním doporučením opravy.
