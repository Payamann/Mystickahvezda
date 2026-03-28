# /sitemap-sync — Synchronizuj sitemap.xml s HTML soubory

Porovnej všechny veřejné HTML soubory s `sitemap.xml` a najdi nesrovnalosti.

---

## Postup

### 1. Najdi HTML soubory, které chybí v sitemap
```bash
for f in *.html; do
  case "$f" in 404*|admin*|offline*|GA-*|GA4-*|onboarding*|profil*|prihlaseni*) continue;; esac
  if ! grep -q "$f" sitemap.xml 2>/dev/null; then echo "CHYBÍ v sitemap: $f"; fi
done
```

### 2. Najdi záznamy v sitemap, které odkazují na neexistující soubory
```bash
grep -oP '<loc>[^<]+</loc>' sitemap.xml | sed 's|</?loc>||g' | while read url; do
  file=$(basename "$url")
  if [ ! -f "$file" ] && [ "$file" != "" ]; then echo "MRTVÝ odkaz v sitemap: $url"; fi
done
```

### 3. Zkontroluj lastmod data
```bash
grep -oP '<url>.*?</url>' sitemap.xml | head -5
```
Ověř, jestli lastmod data nejsou příliš stará (víc než 6 měsíců).

---

## Výstupní formát

```markdown
### Sitemap Sync Report

**Chybí v sitemap (přidat):**
- soubor1.html
- soubor2.html

**Mrtvé odkazy v sitemap (odebrat):**
- https://...

**Zastaralé lastmod (aktualizovat):**
- soubor.html: 2024-01-01 → doporučeno aktualizovat

✅ Ostatní: X souborů v pořádku
```

Pokud uživatel řekne "oprav" nebo "fix", proveď opravy v sitemap.xml automaticky.
