# /broken-links — Najdi rozbité odkazy a reference

Zkontroluj všechny `href`, `src`, `action` atributy v HTML a ověř, že cíle existují.

---

## Kontroly

### 1. Interní HTML odkazy
```bash
node -e "
const fs = require('fs');
const path = require('path');
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const broken = [];
htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Match href to local .html files
  const hrefs = content.matchAll(/href=[\"']([^\"'#?]+\.html)[\"']/g);
  for (const m of hrefs) {
    const target = m[1].replace(/^\//, '');
    if (!fs.existsSync(target)) broken.push(file + ' → ' + m[1]);
  }
});
if (broken.length === 0) console.log('✅ Všechny HTML odkazy v pořádku');
else broken.forEach(b => console.log('❌ ' + b));
"
```

### 2. JS a CSS reference
```bash
node -e "
const fs = require('fs');
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const broken = [];
htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Match src for JS files
  const srcs = content.matchAll(/src=[\"']([^\"'?#]+\.(js|css))[\"']/g);
  for (const m of srcs) {
    const target = m[1].replace(/^\//, '');
    if (!target.startsWith('http') && !fs.existsSync(target)) broken.push(file + ' → ' + m[1]);
  }
  // Match href for CSS files
  const cssRefs = content.matchAll(/href=[\"']([^\"'?#]+\.css)[^\"']*[\"']/g);
  for (const m of cssRefs) {
    const target = m[1].replace(/^\//, '');
    if (!target.startsWith('http') && !fs.existsSync(target)) broken.push(file + ' → ' + m[1]);
  }
});
if (broken.length === 0) console.log('✅ Všechny JS/CSS reference v pořádku');
else broken.forEach(b => console.log('❌ ' + b));
"
```

### 3. Obrázky
```bash
node -e "
const fs = require('fs');
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const broken = [];
htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const imgs = content.matchAll(/src=[\"']([^\"'?#]+\.(webp|png|jpg|jpeg|svg|gif))[\"']/g);
  for (const m of imgs) {
    const target = m[1].replace(/^\//, '');
    if (!target.startsWith('http') && !target.startsWith('data:') && !fs.existsSync(target))
      broken.push(file + ' → ' + m[1]);
  }
});
if (broken.length === 0) console.log('✅ Všechny obrázky existují');
else broken.forEach(b => console.log('❌ ' + b));
"
```

### 4. Service Worker STATIC_ASSETS
```bash
node -e "
const fs = require('fs');
const sw = fs.readFileSync('service-worker.js', 'utf8');
const match = sw.match(/STATIC_ASSETS\s*=\s*\[([\s\S]*?)\]/);
if (!match) { console.log('WARN: STATIC_ASSETS nenalezeny'); process.exit(0); }
const files = match[1].match(/'([^']+)'/g).map(f => f.replace(/'/g, ''));
let ok = 0, bad = 0;
files.forEach(f => {
  const p = f.startsWith('/') ? f.slice(1) : f;
  if (fs.existsSync(p)) ok++; else { console.log('❌ SW: ' + f); bad++; }
});
if (bad === 0) console.log('✅ SW STATIC_ASSETS: všech ' + ok + ' souborů existuje');
"
```

---

## Výstupní formát

```markdown
### Broken Links Report

| Typ | Stav | Počet |
|-----|------|-------|
| HTML odkazy | ✅/❌ | X broken |
| JS/CSS reference | ✅/❌ | X broken |
| Obrázky | ✅/❌ | X broken |
| SW STATIC_ASSETS | ✅/❌ | X broken |

**Detaily (pokud ❌):**
- soubor.html → chybejici-odkaz.html
- ...
```

Pokud uživatel řekne "oprav", navrhni řešení pro každý rozbitý odkaz.
