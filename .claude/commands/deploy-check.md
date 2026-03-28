# /deploy-check — Pre-push validace před deployem

Zkontroluj vše, co by mohlo způsobit problémy v produkci, PŘED `git push origin main`.

---

## Kontroly

### 1. Service Worker — STATIC_ASSETS existují
```bash
node -e "
const fs = require('fs');
const sw = fs.readFileSync('service-worker.js', 'utf8');
const assets = sw.match(/STATIC_ASSETS\s*=\s*\[([\s\S]*?)\]/);
if (!assets) { console.log('WARN: STATIC_ASSETS nenalezeny'); process.exit(0); }
const files = assets[1].match(/'([^']+)'/g).map(f => f.replace(/'/g, ''));
let missing = 0;
files.forEach(f => {
  const path = f.startsWith('/') ? f.slice(1) : f;
  if (!fs.existsSync(path)) { console.log('CHYBÍ: ' + f); missing++; }
});
if (missing === 0) console.log('✅ Všechny STATIC_ASSETS existují');
"
```

### 2. CSS verze konzistentní
```bash
grep -ohP 'style\.v2\.min\.css\?v=\K[0-9]+' *.html | sort -u
```
Pokud výstup má víc než 1 řádek, verze nejsou konzistentní.

### 3. Žádné console.log v produkčním JS
```bash
grep -rn 'console\.log' js/*.js | grep -v '// debug\|// TODO\|service-worker'
```

### 4. Žádné TODO/FIXME v commitovaných změnách
```bash
git diff origin/main...HEAD -- '*.js' '*.html' | grep -i 'TODO\|FIXME\|HACK\|XXX' | head -10
```

### 5. Sitemap v syncu
Spusť kontrolu ze `/sitemap-sync` skill.

### 6. Environment proměnné
```bash
# Zkontroluj, že .env.example existuje a je aktuální
if [ ! -f .env.example ]; then echo "❌ Chybí .env.example"; fi
```

### 7. Package.json — žádné security issues
```bash
npm audit --audit-level=high 2>/dev/null | tail -5
```

### 8. Git stav
```bash
git status --short
git log origin/main..HEAD --oneline
```

---

## Výstupní formát

```markdown
### Deploy Check Report

| Kontrola | Výsledek |
|----------|----------|
| SW STATIC_ASSETS | ✅ / ❌ chybí X souborů |
| CSS verze | ✅ v=N / ❌ nekonzistentní |
| console.log | ✅ čisto / ⚠️ nalezeno X |
| TODO/FIXME | ✅ čisto / ⚠️ nalezeno X |
| Sitemap sync | ✅ / ❌ chybí X stránek |
| .env.example | ✅ / ❌ chybí |
| npm audit | ✅ / ⚠️ X vulnerabilities |
| Git | X commitů k push |

**Verdikt: ✅ SAFE TO DEPLOY / ❌ OPRAV NEJDŘÍVE**
```

Pokud je verdikt ❌, vypiš konkrétní kroky k opravě.
Pokud uživatel řekne "push" a vše je ✅, proveď `git push origin main`.
