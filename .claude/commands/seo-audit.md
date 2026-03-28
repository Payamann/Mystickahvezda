# /seo-audit — Kompletní SEO audit HTML souborů

Projdi všechny veřejné HTML soubory v projektu a zkontroluj SEO kompletnost.
Argument `$ARGUMENTS` = konkrétní soubor (volitelné). Pokud prázdný, audituj všechny.

---

## Co kontrolovat

Pro každý veřejný HTML soubor (vynech: 404.html, admin.html, offline.html, GA-*.html, onboarding.html) zkontroluj:

### 1. Meta tagy
Spusť tyto kontroly:
```bash
# Soubory bez meta description
grep -rL 'name="description"' *.html | grep -v '404\|admin\|offline\|GA-\|onboarding'

# Soubory bez og:title
grep -rL 'og:title' *.html | grep -v '404\|admin\|offline\|GA-\|onboarding'

# Soubory bez og:description
grep -rL 'og:description' *.html | grep -v '404\|admin\|offline\|GA-\|onboarding'

# Soubory bez og:image
grep -rL 'og:image' *.html | grep -v '404\|admin\|offline\|GA-\|onboarding'

# Soubory bez og:url
grep -rL 'og:url' *.html | grep -v '404\|admin\|offline\|GA-\|onboarding'
```

### 2. Canonical links
```bash
grep -rL 'rel="canonical"' *.html | grep -v '404\|admin\|offline\|GA-\|onboarding'
```

### 3. Favicon a apple-touch-icon
```bash
grep -rL 'apple-touch-icon' *.html | grep -v '404\|admin\|offline\|GA-\|onboarding'
grep -rL 'rel="icon"' *.html | grep -v '404\|admin\|offline\|GA-\|onboarding'
```

### 4. JSON-LD strukturovaná data
```bash
grep -rL 'application/ld+json' *.html | grep -v '404\|admin\|offline\|GA-\|onboarding'
```

### 5. Noindex na neveřejných stránkách
Tyto stránky MUSÍ mít `noindex`: profil.html, prihlaseni.html, admin.html, onboarding.html
```bash
for f in profil.html prihlaseni.html admin.html onboarding.html; do
  if [ -f "$f" ] && ! grep -q 'noindex' "$f"; then echo "CHYBÍ noindex: $f"; fi
done
```

### 6. Alt atributy na obrázcích
```bash
grep -n '<img ' *.html | grep -v ' alt='
```

### 7. Sitemap pokrytí
```bash
# HTML soubory co nejsou v sitemap (veřejné stránky)
for f in *.html; do
  if echo "$f" | grep -qE '404|admin|offline|GA-|onboarding|profil|prihlaseni'; then continue; fi
  if ! grep -q "$f" sitemap.xml 2>/dev/null; then echo "CHYBÍ v sitemap: $f"; fi
done
```

---

## Výstupní formát

Vypiš tabulku:

```markdown
| Soubor | description | og:title | og:image | canonical | favicon | JSON-LD | sitemap |
|--------|:-----------:|:--------:|:--------:|:---------:|:-------:|:-------:|:-------:|
| index.html | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| blog.html  | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
...
```

Na konci shrnutí:
- Celkové skóre: X/Y kontrol projde
- Seznam konkrétních oprav s prioritou (vysoká/střední/nízká)

Pokud uživatel řekne "oprav" nebo "fix", rovnou proveď opravy.
