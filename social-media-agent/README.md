# 🔮 Mystická Hvězda — Social Media Agent

Automatický agent pro správu sociálních sítí. Generuje posty, obrázky a odpovídá na komentáře.

## Technologie
- **Gemini Flash** — generování textů (captions, hashtags, odpovědi)
- **Imagen 3** — generování obrázků (přes Gemini API)
- **Meta Graph API** — publikace na Facebook & Instagram (připraveno, aktivuje se po vytvoření FB stránky)

## Rychlý Start

### 1. Instalace
```bash
cd social-media-agent
python setup.py
```
Setup se tě zeptá na Gemini API klíč a vše nastaví automaticky.

### 2. Použití

```bash
# Interaktivní generování postu
python agent.py generate

# Automatické generování (bez dotazů)
python agent.py generate --auto

# Promo post pro nejnovější blog článek
python agent.py blog

# Týdenní plán obsahu
python agent.py plan

# Zobrazit všechny uložené posty
python agent.py list

# Odpovědět na komentář
python agent.py reply "Jak si zjistím číslo osudu?"
```

## Adresářová Struktura

```
social-media-agent/
├── agent.py              # Hlavní CLI agent
├── config.py             # Konfigurace a nastavení
├── blog_reader.py        # Čte blog-index.json
├── post_saver.py         # Ukládá posty + HTML náhledy
├── meta_publisher.py     # Facebook/Instagram publikace (fáze 2)
├── setup.py              # Instalační skript
├── generators/
│   ├── text_generator.py # Gemini Flash - texty
│   └── image_generator.py # Imagen 3 - obrázky
├── output/
│   ├── posts/            # Uložené posty (JSON + HTML náhled)
│   └── images/           # Vygenerované obrázky
└── .env                  # API klíče (neverzovat!)
```

## Workflow

```
1. Generování → 2. Review HTML náhled → 3. Approve → 4. Publikace
```

### Weekly Revenue Content Review

Use this before creating more social/Pinterest assets. It connects content output,
Pinterest inventory, and admin funnel data so the next batch scales the best
measured loop instead of the loudest content idea.

```bash
cd social-media-agent

# 1) Export the admin funnel CSV from:
# /api/admin/funnel?format=csv&view=segments

# 2) Run the review with the export
python growth_review.py --funnel-csv path/to/admin-funnel-segments.csv

# Optional: run with current local Pinterest/content data only
python growth_review.py
```

Decision rule:
- scale campaigns with checkout starts or purchases first
- fix stale Pinterest schedules before generating more pins
- add `source` + `feature` params when a campaign only has UTMs
- rebalance the next social batch when recent memory misses engagement, promotion, or inspiration

### Fáze 1 (nyní): Content Generation
- Generuj posty lokálně
- Prohlíž HTML náhledy v prohlížeči
- Manuálně zkopíruj a zveřejni

### Fáze 2 (po vytvoření FB stránky): Auto-Publishing
1. Vytvoř [Facebook Business Stránku](https://www.facebook.com/pages/create)
2. Vytvoř [Instagram Professional účet](https://www.instagram.com/) a propoj s FB
3. Vytvoř [Meta Developer App](https://developers.facebook.com/)
4. Získej Page Access Token
5. Vlož do `.env`: `META_ACCESS_TOKEN` a `META_PAGE_ID`
6. Spusť `python meta_publisher.py` pro test

## Typy Postů

| Typ | Popis | Nejlepší čas |
|-----|-------|-------------|
| `educational` | Vzdělávací obsah o mystice | 12:00-13:00 |
| `quote` | Inspirativní citát | 7:00-9:00 |
| `question` | Otázka pro komunitu | 19:00-21:00 |
| `tip` | Praktický ritual/tip | 18:00-20:00 |
| `daily_energy` | Denní energie/předpověď | 7:00-8:00 |
| `blog_promo` | Propagace blog článku | 14:00-16:00 |

## Témata

tarot • numerologie • astrologie • duchovní rozvoj • meditace • energie a čakry • sny • feng shui • lunární cykly • andělé

## .env Konfigurace

```env
# Povinné
GEMINI_API_KEY=your_key_here

# Fáze 2 (Facebook/Instagram)
META_ACCESS_TOKEN=
META_PAGE_ID=
INSTAGRAM_ACCOUNT_ID=
```
