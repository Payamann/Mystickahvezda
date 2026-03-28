# /brand-check — Audit konzistence brandu

Zkontroluj vizuální a textovou konzistenci napříč celým webem.

---

## Kontroly

### 1. Název — vždy "Mystická Hvězda"
```bash
# Hledej nesprávné varianty
grep -rni 'mysticka hvezda\|Mysticka Hvezda\|mystická hvězda\b' *.html | grep -vi 'Mystická Hvězda\|mystickahvezda\|mystickáhvězda' | head -10
```

### 2. CSS verze konzistentní
```bash
grep -ohP 'style\.v2\.min\.css\?v=\K[0-9]+' *.html | sort | uniq -c | sort -rn
```

### 3. Navigace — stejná na všech stránkách
Přečti navigaci z `index.html` a porovnej s 5 dalšími stránkami. Hledej:
- Chybějící položky menu
- Různé pořadí
- Jiné URL

### 4. Patička — stejná na všech stránkách
Podobně jako navigaci — porovnej footer z `index.html` s dalšími stránkami.

### 5. Font stack
```bash
# Ověř, že všechny stránky načítají stejné fonty
grep -c 'Cinzel.*Inter' *.html | grep ':0$'
```

### 6. Barevné schéma v CSS
```bash
# Primární barvy projektu
grep -oP '#[0-9a-fA-F]{3,8}' css/style.v2.min.css | sort | uniq -c | sort -rn | head -20
```
Hlavní barvy by měly být:
- Zlatá: `#D4AF37` (nebo variace)
- Navy: `#050510`
- Bílá/světlá pro text

### 7. Logo/favicon konzistence
```bash
# Stejný favicon na všech stránkách
grep -c 'rel="icon"' *.html | grep ':0$'
```

### 8. Meta theme-color
```bash
grep -ohP 'theme-color.*?content="([^"]+)"' *.html | sort -u
```
Měla by být jen jedna hodnota.

### 9. CTA styl
Prohledej hlavní CTA (call-to-action) buttony na klíčových stránkách:
- Používají stejnou CSS třídu?
- Mají konzistentní text ("Zjistit zdarma" vs "Vyzkoušet" vs "Začít")?

---

## Výstupní formát

```markdown
### Brand Consistency Report

| Oblast | Stav | Detail |
|--------|------|--------|
| Název | ✅/❌ | X nesprávných variant |
| CSS verze | ✅/❌ | verze: ... |
| Navigace | ✅/❌ | X stránek liší |
| Patička | ✅/❌ | X stránek liší |
| Fonty | ✅/❌ | X stránek chybí |
| Barvy | ✅/❌ | konzistentní/nekonzistentní |
| Favicon | ✅/❌ | X stránek chybí |
| Theme-color | ✅/❌ | X různých hodnot |

**Celková konzistence: X/8**
```
