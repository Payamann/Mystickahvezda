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

# 1) Recommended: pull the live Supabase funnel CSV and entitlement audit locally
python codex_social_workflow.py pull-funnel --days 90

# Optional: pull Google Search Console + GA4 data after service-account access is configured
python codex_social_workflow.py pull-google --days 90

# If the report finds premium entitlement drift, review the safe dry-run first
python codex_social_workflow.py entitlement-sync

# 2) Run the review with any manual admin export if needed
python growth_review.py --funnel-csv path/to/admin-funnel-segments.csv

# Optional: run with current local Pinterest/content data only
python growth_review.py

# Recommended Codex wrapper: writes Markdown + JSON into output/codex
python codex_social_workflow.py growth-operator --live-funnel --live-google --days 14 --write
```

Decision rule:
- scale campaigns with checkout starts or purchases first
- fix stale Pinterest schedules before generating more pins
- add `source` + `feature` params when a campaign only has UTMs
- rebalance the next social batch when recent memory misses engagement, promotion, or inspiration
- if the report says the funnel export is empty or legacy, fix measurement before increasing content volume

### Codex Daily Workflow

Use this when Codex is generating the daily 3-post Instagram set from `AGENTS.md`.
It turns the repeated manual process into: brief -> draft -> QA -> memory log.

```bash
cd social-media-agent

# 1) Read memory and create a Codex-ready daily brief + draft template
python codex_social_workflow.py daily

# 2) After Codex writes the posts to a markdown file, validate the draft
python codex_social_workflow.py qa --file output/codex/daily_posts_YYYY-MM-DD.md

# 3) Recommended daily operator: QA + traffic/publish packs + preview + control room
python codex_social_workflow.py daily-operator --file output/codex/daily_posts_YYYY-MM-DD.md --image output/images/IMAGE.png

# 4) Generate the low-effort traffic layer manually: UTM links, IG Story CTA, Facebook post
python codex_social_workflow.py traffic-pack --file output/codex/daily_posts_YYYY-MM-DD.md --write

# 5) Create the exact copy/paste publishing pack for the one traffic post
python codex_social_workflow.py publish-pack --file output/codex/daily_posts_YYYY-MM-DD.md --write

# 6) Optional: publish the Facebook traffic post through Meta API
# Dry-run first. It publishes nothing and shows the exact message/comment/link.
python codex_social_workflow.py facebook-publish --file output/codex/daily_posts_YYYY-MM-DD.md --image output/images/IMAGE.png

# Execute only after review. Default mode is a photo post plus first comment link.
python codex_social_workflow.py facebook-publish --file output/codex/daily_posts_YYYY-MM-DD.md --image output/images/IMAGE.png --execute

# 7) Optional: prepare the visual prompt for the traffic post
python codex_social_workflow.py visual-pack --file output/codex/daily_posts_YYYY-MM-DD.md --write

# Best manual-quality option: create the exact prompt for Codex image generation
python codex_social_workflow.py codex-image-brief --file output/codex/daily_posts_YYYY-MM-DD.md --write

# Optional: actually generate a PNG into output/images
python codex_social_workflow.py visual-pack --file output/codex/daily_posts_YYYY-MM-DD.md --generate --write

# 8) Create an internal review preview, not a publishable post
python codex_social_workflow.py preview --file output/codex/daily_posts_YYYY-MM-DD.md

# 9) When QA passes, log all 3 posts to output/content_memory.json
python codex_social_workflow.py log-draft --file output/codex/daily_posts_YYYY-MM-DD.md --score 8.0

# Weekly strategy review for the next batch
python codex_social_workflow.py weekly --days 14 --write

# Growth operator: content memory + funnel export + Pinterest inventory
python codex_social_workflow.py growth-operator --live-funnel --live-google --days 14 --write

# Repair active premium users after reviewing the dry-run output
python codex_social_workflow.py entitlement-sync --execute

# Check the allowed soft-promo URLs and local files
python codex_social_workflow.py urls
```

Notes:
- `qa` enforces slot types, intent mix, CTA rotation, hashtag count, image prompt requirements, and allowed soft-promo URLs.
- `daily-operator` is the default review workflow once a draft exists. It writes the traffic pack, publish pack, internal preview, and `daily_control_room_YYYY-MM-DD.html`.
- `traffic-pack` keeps Reels focused on reach, then creates one extra Story/link/Facebook layer that points to the matching web tool with UTM tracking plus backend `source` + `feature` params.
- `publish-pack` is the copy/paste output for publishing. It clearly separates the actual traffic post from internal preview screens.
- `facebook-publish` is safe by default: without `--execute` it only prints the payload. In `photo` mode it keeps the generated 4:5 visual in the post and puts the long tracked URL into the first comment.
- `visual-pack` defaults to one graphic for the traffic target. Use `--mode all` only for campaign days, because generating 3 images daily adds review work.
- `codex-image-brief` is the best-quality path when Codex should generate the image directly: it writes one curated prompt and a target workspace filename.
- `preview` is only an internal review dashboard for checking captions, CTA and visual direction. Do not publish it as a social post.
- `pull-funnel` refreshes `output/revenue/funnel-segments-90d.csv` from Supabase and flags active premium subscriptions whose `users.is_premium` flag is not synced.
- `pull-google` refreshes `output/google/google-growth-latest.json` from Search Console and GA4. It needs `GOOGLE_APPLICATION_CREDENTIALS`, `GA4_PROPERTY_ID`, and `GSC_SITE_URL`.
- `entitlement-sync` is dry-run by default. It repairs only active premium subscriptions whose user flag is out of sync when you add `--execute`.
- `growth-operator --live-funnel --live-google` is the weekly business layer. It refreshes funnel and Google data first, then turns social memory, funnel exports, Search Console, GA4 and Pinterest inventory into one ranked action report.
- `log-draft` is duplicate-aware and skips posts whose caption preview already exists unless `--force` is used.
- The allowed `Šamanské kolo` URL is `/shamansko-kolo.html`, matching the actual site file and sitemap.

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
