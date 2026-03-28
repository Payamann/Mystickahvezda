# /test-gen — Generuj Playwright E2E testy

Vygeneruj Playwright E2E testy pro zadanou stránku nebo API endpoint.
Argument `$ARGUMENTS` = název stránky (např. `runy`) nebo API cesta (např. `/api/tarot`).

---

## Postup

### 1. Analyzuj skutečný stav

**Pro HTML stránku:**
- Přečti HTML soubor a zjisti: formuláře, interaktivní prvky, selektory, meta tagy
- Přečti odpovídající JS soubor (pokud existuje)
- Zkontroluj, zda stránka vyžaduje auth (hledej `authenticateToken`, `optionalPremiumCheck`)

**Pro API endpoint:**
- Přečti odpovídající soubor v `server/`
- Zjisti: HTTP metodu, middleware (auth, CSRF, rate-limit), validaci, očekávané odpovědi
- Zkontroluj `server.js` pro mounting path (`app.use('/api/...', ...)`)

### 2. Zjisti existující testovací vzory
```bash
ls tests/e2e/
```
Přečti jeden existující spec soubor pro referenci stylu a helperů.

### 3. Ověř helpers
Přečti `tests/e2e/helpers/` pro dostupné utility:
- `getCsrfToken(page)` — pro POST requesty
- `smokeTest(page, path, titleContains)` — základní page load test
- Další helpery

### 4. Generuj testy

Používej tyto vzory:

**Smoke test stránky:**
```js
test('stránka se načte', async ({ page }) => {
  await page.goto('/stranka.html');
  await expect(page).toHaveTitle(/očekávaný titulek/i);
});
```

**Meta tagy:**
```js
test('meta description existuje', async ({ page }) => {
  await page.goto('/stranka.html');
  const desc = await page.evaluate(() => {
    const el = document.querySelector('meta[name="description"]');
    return el ? el.getAttribute('content') : null;
  });
  expect(desc).toBeTruthy();
});
```

**API testy:**
```js
test('POST bez CSRF vrátí 403', async ({ page }) => {
  const res = await page.request.post('/api/endpoint', {
    data: { key: 'value' }
  });
  expect(res.status()).toBe(403);
});

test('POST s CSRF a validními daty', async ({ page }) => {
  await page.goto('/');
  const csrf = await getCsrfToken(page);
  const res = await page.request.post('/api/endpoint', {
    headers: { 'x-csrf-token': csrf },
    data: { key: 'value' }
  });
  // Podle autentizace: 200, 400, 401, nebo 429
  expect([200, 400, 401, 429]).toContain(res.status());
});
```

**Premium wall test:**
```js
test('premium wall se zobrazí nepřihlášeným', async ({ page }) => {
  await page.goto('/stranka.html');
  const wall = await page.evaluate(() => {
    const el = document.querySelector('#mw-premium-wall, .mw-premium-wall');
    return el !== null;
  });
  // Záleží na implementaci — optionalPremiumCheck vs authenticateToken
});
```

### 5. DŮLEŽITÁ pravidla

- **Používej `page.evaluate()`** pro dotazy na DOM místo `page.getAttribute()` (ten timeoutuje když element neexistuje)
- **Rate limiting**: přidej 429 do očekávaných statusů u endpointů s rate limitem
- **Auth vs optional auth**: `optionalPremiumCheck` neblokuje → neočekávej 401
- **CSRF**: všechny POST testy potřebují test bez CSRF (→ 403) i test s CSRF
- **Mounting path**: ověř skutečnou cestu (`app.use('/api/X', router)` + `router.post('/')` = `/api/X`, NE `/api/X/X`)

---

## Výstupní formát

Vytvoř soubor `tests/e2e/[nazev].spec.js` s kompletními testy. Na konci vypiš shrnutí:

```markdown
Vytvořeno: tests/e2e/[nazev].spec.js
- X smoke testů
- X API testů
- X security testů (CSRF, XSS)
- X UI testů
```
