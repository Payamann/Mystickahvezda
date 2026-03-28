# /accessibility-audit — Audit přístupnosti (a11y)

Zkontroluj přístupnost HTML souborů podle WCAG 2.1 AA standardu.
Argument `$ARGUMENTS` = konkrétní soubor (volitelné). Pokud prázdný, audituj všechny veřejné stránky.

---

## Kontroly

### 1. ARIA labely na interaktivních prvcích
```bash
# Buttony bez textu nebo aria-label
grep -n '<button' *.html | grep -v 'aria-label\|>[^<]'

# Inputy bez labelu
grep -n '<input' *.html | grep -v 'aria-label\|id=.*'

# Linky bez textu
grep -n '<a ' *.html | grep 'aria-label' | head -5
grep -n '<a [^>]*>[[:space:]]*<' *.html | grep -v 'aria-label'
```

### 2. Alt atributy na obrázcích
```bash
grep -n '<img ' *.html | grep -v ' alt='
```

### 3. Heading hierarchie
Pro každý soubor ověř, že:
- Existuje právě jeden `<h1>`
- Headingy nejdou skokově (h1 → h3 bez h2)
```bash
for f in *.html; do
  h1count=$(grep -c '<h1' "$f" 2>/dev/null)
  if [ "$h1count" != "1" ] && [ "$h1count" != "0" ]; then echo "$f: $h1count x h1"; fi
done
```

### 4. Formuláře
```bash
# Formulářové prvky bez přidruženého labelu
grep -n '<input\|<select\|<textarea' *.html | grep -v 'type="hidden"\|aria-label\|id="csrf'
```
Pro každý nalezený input ověř, že existuje `<label for="...">` se shodným ID.

### 5. Kontrast textu
Zkontroluj CSS pro nízký kontrast:
- Bílý/světlý text na světlém pozadí
- Příliš malé písmo (< 12px) na důležitých prvcích
```bash
grep -n 'color:.*#[a-fA-F0-9]\{3,6\}\|opacity:' css/style.v2.min.css | head -20
```

### 6. Focus styly
```bash
# Zkontroluj, že existují focus styly
grep -c ':focus\|:focus-visible' css/style.v2.min.css
```

### 7. Skip navigation
```bash
# Hlavní stránky by měly mít skip-to-content link
grep -l 'skip' *.html | head -5
```

### 8. Dekorativní prvky
```bash
# aria-hidden na dekorativních prvcích
grep -n 'class="stars"' *.html | grep -v 'aria-hidden'
```

### 9. Language atribut
```bash
grep -L 'lang="cs"' *.html | grep -v 'GA-\|GA4-'
```

---

## Výstupní formát

```markdown
### Accessibility Audit Report

| Kategorie | Stav | Detaily |
|-----------|------|---------|
| Alt atributy | ✅/❌ | X obrázků bez alt |
| ARIA labely | ✅/❌ | X prvků bez labelu |
| Heading hierarchie | ✅/❌ | X stránek s problémem |
| Formuláře | ✅/❌ | X inputů bez labelu |
| Focus styly | ✅/❌ | existuje/chybí |
| Skip nav | ✅/❌ | existuje/chybí |
| Lang atribut | ✅/❌ | X stránek bez lang |

**Celkové skóre: X/Y ✅**

### Doporučené opravy (seřazené podle priority)
1. [VYSOKÁ] ...
2. [STŘEDNÍ] ...
3. [NÍZKÁ] ...
```

Pokud uživatel řekne "oprav", proveď opravy automaticky.
