# /dead-code — Najdi nepoužívaný kód a soubory

Identifikuj mrtvý kód: soubory, na které nic neodkazuje, nepoužívané JS/CSS, osiřelé routy.

---

## Kontroly

### 1. JS soubory bez reference v HTML
```bash
for f in js/*.js; do
  base=$(basename "$f")
  refs=$(grep -rl "$base" *.html service-worker.js 2>/dev/null | wc -l)
  if [ "$refs" = "0" ]; then echo "NEPOUŽITÝ JS: $f"; fi
done
```

### 2. CSS soubory bez reference v HTML
```bash
for f in css/*.css; do
  base=$(basename "$f")
  refs=$(grep -rl "$base" *.html 2>/dev/null | wc -l)
  if [ "$refs" = "0" ]; then echo "NEPOUŽITÝ CSS: $f"; fi
done
```

### 3. HTML soubory bez odkazů
```bash
for f in *.html; do
  case "$f" in index*|404*|admin*|offline*|GA-*|GA4-*|sitemap*) continue;; esac
  base=$(basename "$f")
  refs=$(grep -rl "$base" *.html sitemap.xml js/*.js 2>/dev/null | grep -v "$f" | wc -l)
  if [ "$refs" = "0" ]; then echo "OSIŘELÉ HTML: $f"; fi
done
```

### 4. Obrázky bez reference
```bash
for f in img/*; do
  base=$(basename "$f")
  refs=$(grep -rl "$base" *.html css/*.css js/*.js service-worker.js 2>/dev/null | wc -l)
  if [ "$refs" = "0" ]; then echo "NEPOUŽITÝ IMG: $f"; fi
done
```

### 5. Express routy bez frontendu
Přečti soubory v `server/` a pro každý `router.post` / `router.get` ověř, že existuje odpovídající fetch/request v JS nebo form action v HTML.

### 6. SW STATIC_ASSETS — neexistující soubory
```bash
node -e "
const fs = require('fs');
const sw = fs.readFileSync('service-worker.js', 'utf8');
const match = sw.match(/STATIC_ASSETS\s*=\s*\[([\s\S]*?)\]/);
if (match) {
  match[1].match(/'([^']+)'/g).map(f => f.replace(/'/g, '')).forEach(f => {
    const p = f.startsWith('/') ? f.slice(1) : f;
    if (!fs.existsSync(p)) console.log('SW PHANTOM: ' + f);
  });
}
"
```

---

## Výstupní formát

```markdown
### Dead Code Report

| Kategorie | Počet | Soubory |
|-----------|-------|---------|
| Nepoužité JS | X | file1.js, file2.js |
| Nepoužité CSS | X | ... |
| Osiřelé HTML | X | ... |
| Nepoužité obrázky | X | ... |
| Phantom SW assets | X | ... |
| Osiřelé routy | X | ... |

**Celkem: X nepoužitých souborů, ~Y KB k uvolnění**
```

NEMAZEJ nic automaticky — vypiš seznam a nech uživatele rozhodnout.
