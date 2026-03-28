# /env-sync — Synchronizuj .env.example s kódem

Porovnej `process.env.*` v kódu s `.env.example` a najdi nesrovnalosti.

---

## Postup

### 1. Najdi všechny env vars používané v kódu
```bash
grep -rhoP 'process\.env\.(\w+)' server/*.js server.js js/*.js 2>/dev/null | sort -u
```

### 2. Přečti .env.example
```bash
grep -v '^#\|^$' .env.example 2>/dev/null | cut -d= -f1 | sort
```

### 3. Porovnej

**Chybí v .env.example** (v kódu je, v šabloně ne):
- Tyto proměnné musí být přidány do .env.example

**Navíc v .env.example** (v šabloně je, v kódu se nepoužívá):
- Tyto proměnné mohou být zastaralé / odstraněny

### 4. Zkontroluj CI/CD
```bash
grep -A50 'env:' .github/workflows/ci.yml 2>/dev/null | grep -oP '\w+:' | head -20
```
Ověř, že CI má všechny potřebné env vars.

### 5. Zkontroluj playwright.config
```bash
grep 'process\.env\|env:' playwright.config.js 2>/dev/null | head -10
```

---

## Výstupní formát

```markdown
### Env Sync Report

**Chybí v .env.example (PŘIDAT):**
- `VAR_NAME` — používá se v server/file.js:XX

**Navíc v .env.example (ZVÁŽIT ODEBRÁNÍ):**
- `OLD_VAR` — nikde v kódu

**CI/CD env vars:**
- ✅ / ❌ chybí: VAR_NAME

**Playwright config:**
- ✅ / ❌ chybí: VAR_NAME
```

Pokud uživatel řekne "oprav", aktualizuj `.env.example` automaticky.
