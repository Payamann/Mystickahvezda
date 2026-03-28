# /smoke-test — Rychlý health check aplikace

Ověř, že všechny stránky a API endpointy odpovídají správně.
Argument `$ARGUMENTS` = URL produkce (výchozí: http://localhost:3000) nebo "prod" pro https://www.mystickahvezda.cz

---

## Postup

### 1. Urči base URL
- Pokud argument = "prod" → `https://www.mystickahvezda.cz`
- Pokud argument = URL → použij to
- Pokud prázdný → `http://localhost:3000` (ověř, že server běží)

### 2. Testuj HTML stránky
```bash
BASE_URL="http://localhost:3000"  # nebo produkce

# Seznam klíčových stránek
pages=(
  "/"
  "/horoskopy.html"
  "/tarot.html"
  "/numerologie.html"
  "/natalni-karta.html"
  "/runy.html"
  "/angelske-karty.html"
  "/partner-compatibility.html"
  "/lunar-calendar.html"
  "/blog.html"
  "/cenik.html"
  "/faq.html"
  "/kontakt.html"
  "/mentor.html"
)

for page in "${pages[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$page" 2>/dev/null)
  if [ "$status" = "200" ]; then
    echo "✅ $status $page"
  else
    echo "❌ $status $page"
  fi
done
```

### 3. Testuj API endpointy (GET)
```bash
api_gets=(
  "/api/horoscope?sign=beran&period=daily"
  "/api/health"
)

for endpoint in "${api_gets[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
  echo "[$status] GET $endpoint"
done
```

### 4. Testuj API endpointy (POST — expect 403 bez CSRF)
```bash
api_posts=(
  "/api/contact"
  "/api/natal-chart"
  "/api/numerology"
  "/api/tarot/reading"
)

for endpoint in "${api_posts[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "$BASE_URL$endpoint" 2>/dev/null)
  if [ "$status" = "403" ]; then
    echo "✅ $status POST $endpoint (CSRF chrání)"
  else
    echo "⚠️ $status POST $endpoint (očekáváno 403)"
  fi
done
```

### 5. Testuj statické assety
```bash
assets=(
  "/css/style.v2.min.css"
  "/js/main.js"
  "/img/hero-3d.webp"
  "/manifest.json"
  "/service-worker.js"
)

for asset in "${assets[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$asset" 2>/dev/null)
  if [ "$status" = "200" ]; then echo "✅ $status $asset"
  else echo "❌ $status $asset"; fi
done
```

---

## Výstupní formát

```markdown
### Smoke Test Report — [BASE_URL] — [DATUM]

| Kategorie | Celkem | ✅ OK | ❌ Fail |
|-----------|--------|-------|---------|
| HTML stránky | X | X | X |
| API GET | X | X | X |
| API POST (CSRF) | X | X | X |
| Statické assety | X | X | X |

**Výsledek: ✅ ALL PASS / ❌ X FAILURES**

Detaily failures:
- ...
```
