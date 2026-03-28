# /gdpr-check — GDPR compliance audit

Zkontroluj soulad s GDPR pro českou SaaS aplikaci.

---

## Kontroly

### 1. Cookie consent
```bash
# Hledej cookie consent banner/script
grep -rl 'cookie.*consent\|cookie.*banner\|cookieConsent\|gdpr' *.html js/*.js | head -10
```
Ověř, že cookie consent se zobrazuje na VŠECH stránkách.

### 2. Odkaz na ochranu soukromí
```bash
# Každá stránka by měla mít odkaz na privacy policy v patičce
for f in *.html; do
  case "$f" in 404*|admin*|offline*|GA-*|GA4-*) continue;; esac
  if ! grep -q 'ochrana-soukromi\|soukromi\|privacy' "$f"; then
    echo "CHYBÍ privacy odkaz: $f"
  fi
done
```

### 3. Formuláře a souhlas
```bash
# Formuláře by měly mít checkbox/text o souhlasu se zpracováním
grep -l '<form' *.html | while read f; do
  if ! grep -q 'souhlas\|consent\|gdpr\|zpracov' "$f"; then
    echo "FORMULÁŘ BEZ SOUHLASU: $f"
  fi
done
```

### 4. Smazání účtu
```bash
# Možnost smazat účet / data
grep -rn 'delete.*account\|smazat.*účet\|delete.*user\|removeUser' server/*.js js/*.js | head -5
```

### 5. Data export (právo na přenositelnost)
```bash
grep -rn 'export.*data\|download.*data\|GDPR\|portability' server/*.js | head -5
```

### 6. Google Analytics nastavení
```bash
# GA by měl být anonymizovaný a respektovat cookie consent
grep -rn 'gtag\|analytics\|GA_MEASUREMENT' *.html js/*.js | head -10
```

### 7. Třetí strany
```bash
# Jaké třetí strany dostávají data?
grep -rn 'stripe\|supabase\|google\|facebook\|meta' server/*.js | grep -v 'node_modules' | head -15
```
Ověř, že privacy policy zmiňuje všechny třetí strany.

### 8. Data retention
```bash
# Jak dlouho se data uchovávají?
grep -rn 'expire\|retention\|cleanup\|purge\|delete.*old' server/*.js | head -10
```

### 9. Souhlas při registraci
```bash
grep -rn 'register\|signup\|registrace' server/*.js | head -5
```
Ověř, že registrace vyžaduje souhlas s podmínkami a ochranou soukromí.

---

## Výstupní formát

```markdown
### GDPR Compliance Report

| Požadavek | Stav | Detail |
|-----------|------|--------|
| Cookie consent | ✅/❌ | Na všech/X stránkách |
| Privacy policy odkaz | ✅/❌ | V patičce všech/X stránek |
| Souhlas ve formulářích | ✅/❌ | X formulářů bez souhlasu |
| Smazání účtu | ✅/❌ | Implementováno/chybí |
| Data export | ✅/❌ | Implementováno/chybí |
| GA anonymizace | ✅/❌ | ... |
| Třetí strany dokumentovány | ✅/❌ | ... |
| Data retention policy | ✅/❌ | ... |
| Souhlas při registraci | ✅/❌ | ... |

**Celková GDPR shoda: X/9**

### Kritické nedostatky (opravit IHNED):
1. ...

### Doporučení:
1. ...
```
