# /post-week — Týdenní batch generování Instagram postů

Generuj Instagram posty pro celý týden (7 dní × 3 sloty = 21 postů).
Argument `$ARGUMENTS` = počáteční datum (DD.MM.) nebo "příští týden". Pokud prázdný, začni od zítřka.

---

## Postup

### 1. Načti content memory (stejně jako /post)
```bash
cd "C:/Users/pavel/OneDrive/Desktop/MystickaHvezda/social-media-agent" && node -e "
const fs = require('fs');
const m = JSON.parse(fs.readFileSync('output/content_memory.json', 'utf8'));
const posts = (m.approved_posts || []).slice(-15);
console.log('=== POSLEDNÍCH 15 POSTŮ ===');
posts.forEach(p => console.log('[' + (p.date||'?') + '] ' + (p.type||'?') + ' | ' + (p.hook_formula||'?') + ' | ' + (p.topic||'?')));
const hooks = m.hook_performance || {};
console.log('\n=== HOOK VÝKON ===');
Object.entries(hooks).sort((a,b) => (b[1].avg_score||0) - (a[1].avg_score||0)).slice(0,5).forEach(([h,s]) => console.log(h + ': avg ' + (s.avg_score||0).toFixed(1)));
"
```

### 2. Naplánuj celý týden PŘED generováním

Vytvoř plánovací tabulku:

```markdown
| Den | 🌅 Ráno téma | ☀️ Poledne téma | 🌙 Večer téma | Soft_promo cíl |
|-----|-------------|-----------------|---------------|----------------|
| Po  | ...         | ...             | ...           | /tarot         |
| Út  | ...         | ...             | ...           | —              |
| ...
```

**Pravidla týdenního plánu:**
- 21 různých témat (ŽÁDNÉ opakování)
- Max 3× stejné znamení za týden
- Soft_promo: 7× za týden (1× denně), každý den jiná funkce webu
- Hook typy: každý typ použij min. 2×, max 4× za týden
- CTA typy: rovnoměrné rozložení, žádný typ víc než 4× za týden
- Astro kontext: sleduj postup Slunce, měsíční fáze, dny v týdnu
- Min. 7 mikropříběhů (1 denně)

### 3. Generuj den po dni
Pro každý den vypiš 3 posty ve formátu jako `/post` (caption + hashtagy + image prompt).

### 4. Souhrnná tabulka na konci
```markdown
| Den | Slot | Téma | Typ | Hook | CTA | Intent |
|-----|------|------|-----|------|-----|--------|
| Po  | 🌅   | ...  | ... | ...  | ... | ...    |
| Po  | ☀️   | ...  | ... | ...  | ... | ...    |
| Po  | 🌙   | ...  | ... | ...  | ... | ...    |
| Út  | 🌅   | ...  | ... | ...  | ... | ...    |
...
```

### 5. Logování
Po schválení zaloguj všech 21 postů přes `log_post.py` (viz /post skill pro příkaz).

---

## Všechna pravidla z /post platí i zde
Brand voice, hashtagy (#mystickaHvezda první), image prompt styl, validace, soft_promo URL tabulka — vše identické.
