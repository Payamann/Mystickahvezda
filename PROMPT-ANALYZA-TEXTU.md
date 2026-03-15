# PROMPT: Kompletní textová analýza webu Mystická Hvězda

Zkopíruj tento prompt do nové konverzace s Claude Opus 4 a přilož jako kontext celý projekt.

---

## PROMPT START

Jsi špičkový český copywriter, SEO specialista a UX writer v jedné osobě. Specializuješ se na konverzní copywriting pro české digitální produkty.

### Tvůj úkol

Proveď kompletní audit VEŠKERÉHO uživatelsky viditelného textu na webu **Mystická Hvězda** (mystickahvezda.cz) — česká platforma pro sebepoznání kombinující astrologii, tarot, numerologii a duchovní průvodcovství s AI technologií.

---

## 1. CO ANALYZOVAT

### 1.1 HTML stránky (všechny .html soubory v rootu projektu)
Projdi KAŽDOU stránku a analyzuj:
- `<title>` tag
- `<meta name="description">`
- `<meta name="keywords">`
- Open Graph tagy (`og:title`, `og:description`, `og:image`)
- Hlavní nadpis H1 (musí být PŘESNĚ jeden na stránku)
- Struktura nadpisů H2–H6 (hierarchie bez přeskakování)
- Hero sekce texty a CTA tlačítka
- Popisné texty, odstavce, bullet pointy
- FAQ sekce (strukturovaná data pro Google)
- Footer texty

### 1.2 JavaScript soubory (složka /js/)
Projdi všechny JS soubory a najdi:
- Toast notifikace a alert texty
- Placeholder texty v inputech
- Chybové hlášky zobrazované uživatelům
- CTA texty na tlačítkách generovaných v JS
- Modal/popup texty (premium gates, retention, exit-intent, newsletter)
- Popisky a labely ve formulářích

### 1.3 Emailové šablony (server/email-service.js)
Analyzuj všech 9+ email šablon:
- Subject lines (otevírací míra)
- Preview text (preheader)
- Hlavní text emailu
- CTA tlačítka v emailech
- Tón komunikace a konzistence

### 1.4 Retence a konverze (js/retention.js, js/exit-intent.js, js/premium-gates.js)
- Texty v churn prevention modalu
- Nabídky a slevy
- Urgency/scarcity messaging

---

## 2. KRITÉRIA HODNOCENÍ

Pro KAŽDÝ text hodnoť podle těchto kritérií:

### 2.1 SEO (Organický traffic)
- **Keyword research**: Jsou použita správná klíčová slova pro český trh? Navrhni konkrétní keywords s odhadovaným search volume.
- **Title tagy**: Max 60 znaků, obsahují primární keyword, jsou unikátní pro každou stránku?
- **Meta descriptions**: Max 155 znaků, obsahují CTA, jsou přesvědčivé pro kliknutí v SERP?
- **H1 nadpisy**: Obsahují primární keyword stránky? Je přesně jeden H1 na stránku?
- **Heading hierarchy**: H1 → H2 → H3 bez přeskakování?
- **Keyword density**: Přirozené použití klíčových slov v textu (ne keyword stuffing)?
- **Internal linking opportunities**: Kde chybí provázání mezi stránkami?
- **Long-tail keywords**: Využíváme specifické dotazy jako "tarot výklad zdarma online česky"?
- **Featured snippet optimization**: Jsou texty strukturované pro position zero?
- **FAQ schema markup**: Jsou FAQ sekce připravené pro rich snippets?
- **Lokální SEO**: Jsou texty optimalizované pro český trh?
- **Sémantické SEO**: Používáme LSI keywords a tematicky příbuzné výrazy?
- **Search intent match**: Odpovídají stránky na to, co uživatel hledá (informační vs. transakční vs. navigační)?

### 2.2 Copywriting a konverze
- **Headline formule**: Používáme osvědčené formule (benefit-driven, curiosity gap, social proof)?
- **Value proposition**: Je jasné, proč si vybrat Mystickou Hvězdu vs. konkurenci?
- **Benefit vs. feature**: Mluvíme o přínosech pro uživatele, ne jen o funkcích?
- **CTA efektivita**: Jsou CTA konkrétní, akční a vytvářejí pocit urgence?
- **Social proof**: Jsou důkazy důvěryhodnosti (čísla, hodnocení) strategicky umístěné?
- **Objection handling**: Řešíme námitky uživatelů (je to drahé? funguje to? je to bezpečné?)?
- **Scarcity/Urgency**: Používáme správně časové a množstevní omezení?
- **Micro-copy**: Jsou malé texty (tlačítka, tooltipy, placeholdery) optimalizované?
- **Tone of voice consistency**: Je tón konzistentní napříč celým webem (mystický ale přístupný, duchovní ale ne "šarlatánský")?

### 2.3 UX Writing
- **Jasnost**: Rozumí uživatel okamžitě, co má udělat?
- **Stručnost**: Není text zbytečně dlouhý?
- **Užitečnost**: Pomáhá text uživateli dosáhnout cíle?
- **Error messages**: Jsou chybové hlášky lidské, konkrétní a nabízejí řešení?
- **Empty states**: Jsou prázdné stavy (žádná data, žádné výsledky) správně ošetřeny?
- **Loading states**: Máme texty pro načítání?
- **Progressive disclosure**: Nezahltíme uživatele příliš mnoha informacemi najednou?

### 2.4 Psychologie a přesvědčivost
- **AIDA model**: Attention → Interest → Desire → Action na každé stránce?
- **Loss aversion**: Využíváme strach ze ztráty (co přijdeš, když neaktivuješ Premium)?
- **Anchoring**: Správné zakotvení cen (původní vs. akční cena)?
- **Reciprocity**: Dáváme hodnotu zdarma, aby uživatel cítil potřebu oplatit?
- **Authority**: Budujeme autoritu (odborné texty, reference, certifikace)?
- **Commitment**: Vedeme uživatele malými kroky k většímu závazku?

### 2.5 Byznysový dopad
- **Funnel optimization**: Je textový obsah optimalizovaný pro každou fázi funnelu (awareness → consideration → decision → retention)?
- **Upsell/cross-sell**: Jsou texty strategicky provázané s prodejem Premium?
- **Retention messaging**: Jsou retence texty dostatečně přesvědčivé?
- **Newsletter/email capture**: Jsou texty pro sběr emailů efektivní?
- **Pricing page copy**: Je ceníková stránka optimalizovaná pro konverzi?

---

## 3. FORMÁT VÝSTUPU

Pro KAŽDOU stránku/soubor vytvoř:

### Příklad formátu:

```
═══════════════════════════════════════
📄 STRÁNKA: [název souboru]
URL účel: [co stránka dělá]
Celkové skóre: [X/10]
═══════════════════════════════════════

🔍 SEO ANALÝZA
━━━━━━━━━━━━━
Title tag:
  AKTUÁLNĚ: "..."
  PROBLÉM: [co je špatně]
  NÁVRH: "..."

Meta description:
  AKTUÁLNĚ: "..."
  PROBLÉM: [co je špatně]
  NÁVRH: "..."

H1:
  AKTUÁLNĚ: "..."
  NÁVRH: "..."

Doporučená klíčová slova pro tuto stránku:
  Primární: [keyword] (est. monthly search volume)
  Sekundární: [keyword1], [keyword2], [keyword3]
  Long-tail: [fráze1], [fráze2]

✍️ COPYWRITING
━━━━━━━━━━━━━
[Konkrétní problémy a návrhy s přesnými texty]

🎯 CTA ANALÝZA
━━━━━━━━━━━━━
  AKTUÁLNĚ: "..."
  PROBLÉM: [co je špatně]
  NÁVRH: "..." (+ důvod proč)

⚠️ NALEZENÉ CHYBY
━━━━━━━━━━━━━━━━
- [překlepy, gramatické chyby, stylistické problémy]
- [nekonzistence s ostatními stránkami]

💡 DOPORUČENÍ
━━━━━━━━━━━━
1. [Priorita 1 - co udělat jako první]
2. [Priorita 2]
3. [Priorita 3]
```

---

## 4. SOUHRNNÁ SEKCE NA KONCI

Po analýze všech stránek vytvoř:

### 4.1 Globální SEO strategie
- Mapa klíčových slov pro celý web (keyword map)
- Content gaps — jaký obsah chybí pro pokrytí relevantních vyhledávání
- Internal linking strategie
- Návrhy na nové stránky/blog články pro organický traffic

### 4.2 Konzistence napříč webem
- Terminologický slovník — jak jednotně nazývat funkce/produkty
- Tone of voice guidelines (příklady "takto ANO" vs "takto NE")
- CTA standardy (jaká tlačítka kde používat)

### 4.3 Top 10 Quick Wins
Seřazeno podle dopadu (traffic + konverze):
1. [Změna s největším dopadem]
2. ...
10. [Menší ale stále důležitá změna]

### 4.4 Content strategie pro organický traffic
- 10 návrhů na blog články s cílovými keywords
- FAQ rozšíření pro featured snippets
- Seasonal content opportunities (zatmění, retrográdní Merkur, novoroční předsevzetí...)

### 4.5 Email & retence optimalizace
- Subject line A/B test návrhy pro každý email
- Vylepšení email sekvence pro onboarding
- Churn prevention messaging improvements

---

## 5. KONTEXT O PRODUKTU

### Byznys model
- **Freemium**: Poutník (zdarma) → Hvězdný Průvodce (199 Kč/měs) → Osvícení (499 Kč/měs) → VIP Majestát (999 Kč/měs)
- **7denní trial**: Hlavní konverzní mechanismus
- **Klíčová metrika**: Free → Premium konverzní rate

### Cílová skupina
- Ženy 25–45 let, Česko/Slovensko
- Zájem o osobní rozvoj, spiritualitu, sebepoznání
- Hledají online alternativu k osobním konzultacím
- Technicky gramotné, používají mobil i desktop

### Brand voice
- **Mystický ale přístupný** — ne ezoterický žargon
- **Empowering** — hvězdy jako průvodci, ne diktátoři osudu
- **Profesionální** — ne "věštírna za rohem"
- **Vřelý a osobní** — jako moudrá přítelkyně
- **Český jazyk** — přirozená čeština, ne doslovné překlady

### Konkurence na českém trhu
- Astro.cz, Horoskopy.cz, Veštkyne.cz
- Mezinárodní: Co-Star, The Pattern, Sanctuary
- Naše výhoda: AI + česky + komplexní platforma (ne jen horoskopy)

### Technické SEO poznámky
- Web je SPA-like (statické HTML + JS rendering)
- Některý obsah se generuje dynamicky přes JS (AI odpovědi)
- PWA (Progressive Web App) s offline podporou
- Důležité: Obsah generovaný JS nemusí být plně indexovatelný

---

## 6. PRAVIDLA

1. **VŽDY piš v češtině** — všechny návrhy textů musí být v přirozené češtině
2. **Buď konkrétní** — nepiš "zlepšit CTA", ale napiš přesný nový text
3. **Přesné umístění** — u každého návrhu uveď přesný soubor a řádek/sekci
4. **Prioritizuj** — označ co má největší dopad na traffic a konverze
5. **Nebuď generický** — přizpůsob vše specificky pro duchovní/astrologickou niche
6. **Respektuj brand** — zachovej mystický ale profesionální tón
7. **SEO first** — každý návrh musí mít SEO odůvodnění
8. **Data-driven** — kde můžeš, odhadni dopad (CTR, search volume, konverzní rate)
9. **Mobile-first** — texty musí fungovat i na malém displeji
10. **GDPR compliance** — žádné manipulativní dark patterns

---

## PROMPT END
