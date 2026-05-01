"""
Pinterest Batch Workflow
========================
Zpracuje vsechny posty bez pinu najednou.

KROK 1 — vygeneruj prompty pro vsechny cekajici posty:
    python pinterest_batch.py --prompts

    Vypise prompty do output/pinterest/prompts.txt
    Ty je batch-vygenerujes v Midjourney/Flux/Ideogram.

KROK 2 — uloz obrazky do inbox/:
    output/pinterest/inbox/<slug>.png  (nebo .jpg)

KROK 3 — spust compositor na vse co je v inbox/:
    python pinterest_batch.py --compose

KROK 4 — export CSV pro Pinterest bulk upload:
    python pinterest_batch.py --csv

Dalsi prikazy:
    python pinterest_batch.py --status     # kolik je hotovo / ceka
    python pinterest_batch.py --log-done --slug "chiron..."  # oznac jako publikovano
"""

import argparse
import csv
import json
import shutil
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from pinterest_compositor import composite_pin
from pinterest_make_pin import IMAGE_PROMPTS, PINTEREST_HOOKS

BASE_DIR   = Path(__file__).parent
REPO_DIR   = BASE_DIR.parent
BLOG_INDEX = REPO_DIR / "data" / "blog-index.json"
TOOL_CAMPAIGNS_PATH = BASE_DIR / "pinterest_tool_campaigns.json"
OUT_DIR    = BASE_DIR / "output" / "pinterest"
INBOX_DIR  = OUT_DIR / "inbox"
IMAGES_DIR = OUT_DIR / "images"
LOG_PATH   = OUT_DIR / "pinterest_log.json"
PROMPTS_TXT = OUT_DIR / "prompts.txt"
TOOL_PROMPTS_TXT = OUT_DIR / "tool_prompts.txt"
CSV_PATH   = OUT_DIR / "pinterest_pins.csv"
SITE_URL = "https://www.mystickahvezda.cz"
METADATA_PATH = OUT_DIR / "pin_metadata.json"
PINTEREST_BULK_CSV_PATH = OUT_DIR / "pinterest_bulk_upload.csv"
PUBLIC_PIN_DIR = REPO_DIR / "img" / "pinterest"
PUBLIC_PIN_URL_BASE = f"{SITE_URL}/img/pinterest"
LOCAL_TZ = ZoneInfo("Europe/Prague")
UTC_TZ = ZoneInfo("UTC")

IMAGE_PROMPT_SUFFIX = (
    " STRICT OUTPUT RULES: create a background image only. "
    "No readable words, no alphabet letters, no UI, no watermark, no logo, no frame. "
    "If symbols are needed, use abstract mystical glyphs instead of readable text. "
    "Keep the main object in the top 60 percent and keep the bottom 40 percent clean, dark, and low-detail for the text overlay."
)

for d in (INBOX_DIR, IMAGES_DIR):
    d.mkdir(parents=True, exist_ok=True)

# Nástěnky per kategorie — názvy musí přesně odpovídat názvům na Pinterest účtu
BOARD_MAP = {
    "Astrologie":    "Horoskopy, natální karta a planety v retro",
    "Tarot":         "Výklady karet, arcana a tarotová rozložení",
    "Numerologie":   "Životní číslo, jméno a kompatibilita párů",
    "Spiritualita":  "Čakry, aura, ochrana a duchovní rovnováha",
    "Lunární Magie": "Úplněk, nov a lunární rituály každý měsíc",
    "Vztahy":        "Synastrie, kompatibilita a spřízněné duše",
    "Šamanismus":    "Severské runy, totemová zvířata a rituály",
    "Sny":           "Výklad snů a symboly tvého podvědomí",
    "Kompatibilita": "Synastrie, kompatibilita a spřízněné duše",
}
DEFAULT_BOARD = "Astrologie, tarot a spiritualita v češtině"

def load_log() -> dict:
    if LOG_PATH.exists():
        return json.loads(LOG_PATH.read_text(encoding="utf-8"))
    return {"published": [], "stats": {}}


def load_pin_metadata() -> dict:
    if METADATA_PATH.exists():
        return json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    return {}


def save_log(log: dict):
    LOG_PATH.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")


def load_posts() -> list:
    return json.loads(BLOG_INDEX.read_text(encoding="utf-8"))


def load_tool_campaigns() -> list:
    if not TOOL_CAMPAIGNS_PATH.exists():
        return []
    campaigns = json.loads(TOOL_CAMPAIGNS_PATH.read_text(encoding="utf-8"))
    for campaign in campaigns:
        campaign.setdefault("type", "tool")
    return campaigns


def tool_campaign_by_slug() -> dict:
    return {campaign["slug"]: campaign for campaign in load_tool_campaigns()}


def find_inbox_image(slug: str):
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        p = INBOX_DIR / f"{slug}{ext}"
        if p.exists():
            return p
    return None


def pin_files() -> list[Path]:
    files = []
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        files.extend(IMAGES_DIR.glob(f"*_pin{ext}"))
    return sorted(files)


def resolve_hooks(slug: str) -> list:
    """Vrátí list hooků pro daný slug (vždy list, i když je jen jeden)."""
    tool_campaign = tool_campaign_by_slug().get(slug)
    if tool_campaign:
        return tool_campaign.get("hooks", [])
    val = PINTEREST_HOOKS.get(slug)
    if val is None:
        return []
    return val if isinstance(val, list) else [val]


def build_tool_link(campaign: dict, variant_idx: int = 0) -> str:
    params = {
        "utm_source": "pinterest",
        "utm_medium": "organic",
        "utm_campaign": campaign.get("utm_campaign", campaign["slug"]),
        "utm_content": f"{campaign['slug']}_v{variant_idx + 1}",
    }
    return f"{SITE_URL}{campaign['path']}?{urlencode(params)}"


def variant_output_path(slug: str, idx: int) -> Path:
    """idx=0 → slug_pin.jpg, idx=1 → slug_v2_pin.jpg, ..."""
    if idx == 0:
        return IMAGES_DIR / f"{slug}_pin.jpg"
    return IMAGES_DIR / f"{slug}_v{idx + 1}_pin.jpg"


def get_pending(posts, log) -> list:
    """Post čeká pokud nemá ani jeden vygenerovaný pin (žádnou variantu)."""
    published = {e["slug"] for e in log.get("published", [])}
    done = set()
    for f in pin_files():
        # slug_pin.jpg nebo slug_v2_pin.jpg → extrahuj slug
        stem = f.stem  # např. "slug_pin" nebo "slug_v2_pin"
        slug = stem.replace("_pin", "")
        slug = slug.rsplit("_v", 1)[0] if "_v" in slug else slug
        done.add(slug)
    return [p for p in posts if p["slug"] not in published and p["slug"] not in done]


# ─────────────────────────────────────────────
# KROK 1: Vygeneruj prompty
# ─────────────────────────────────────────────

def cmd_prompts():
    posts = load_posts()
    log   = load_log()
    pending = get_pending(posts, log)

    if not pending:
        print("Vsechny posty maji pin.")
        return

    lines = []
    lines.append(f"PINTEREST IMAGE PROMPTS — {len(pending)} postu")
    lines.append("=" * 60)
    lines.append("Uloz kazdy obrazek jako: output/pinterest/inbox/<slug>.png")
    lines.append("Pomer stran: 2:3 (portrait), doporucena velikost: 1024x1536px")
    lines.append("=" * 60)
    lines.append("")

    for i, post in enumerate(pending, 1):
        slug   = post["slug"]
        hook   = PINTEREST_HOOKS.get(slug, post["title"])
        prompt = IMAGE_PROMPTS.get(slug, "")
        if prompt:
            prompt = f"{prompt} {IMAGE_PROMPT_SUFFIX}"
        lines.append(f"[{i}/{len(pending)}] {slug}")
        lines.append(f"HOOK: {hook}")
        lines.append(f"PROMPT: {prompt}")
        lines.append(f"SOUBOR: inbox/{slug}.png")
        lines.append("")

    PROMPTS_TXT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Prompty ulozeny: {PROMPTS_TXT}")
    print(f"Celkem: {len(pending)} postu ceka na obrazek.")
    print()
    # Vypis prvnich 5 promptu rovnou
    for post in pending[:5]:
        slug = post["slug"]
        print(f"--- {slug} ---")
        print(IMAGE_PROMPTS.get(slug, ""))
        print()


# ─────────────────────────────────────────────
# KROK 3: Compositor — zpracuj vse co je v inbox
# ─────────────────────────────────────────────

def cmd_tool_prompts():
    campaigns = load_tool_campaigns()
    if not campaigns:
        print(f"Zadne tool kampane: {TOOL_CAMPAIGNS_PATH}")
        return

    done_slugs = set()
    for pin_path in pin_files():
        slug, _ = _slug_and_variant_from_stem(pin_path.stem)
        done_slugs.add(slug)

    lines = []
    lines.append(f"PINTEREST TOOL IMAGE PROMPTS - {len(campaigns)} kampani")
    lines.append("=" * 60)
    lines.append("Uloz kazdy obrazek jako: output/pinterest/inbox/<slug>.png")
    lines.append("Jedno pozadi kampane se pouzije pro vice hook variant.")
    lines.append("Pomer stran: 2:3 (portrait), doporucena velikost: 1024x1536px")
    lines.append("=" * 60)
    lines.append("")

    waiting = 0
    for i, campaign in enumerate(campaigns, 1):
        slug = campaign["slug"]
        prompt = f"{campaign.get('image_prompt', '')} {IMAGE_PROMPT_SUFFIX}".strip()
        status = "DONE" if slug in done_slugs else "NEEDS_IMAGE"
        if status == "NEEDS_IMAGE":
            waiting += 1
        lines.append(f"[{i}/{len(campaigns)}] {slug} - {status}")
        lines.append(f"URL: {SITE_URL}{campaign['path']}")
        lines.append(f"HOOKS: {len(campaign.get('hooks', []))}")
        lines.append(f"PROMPT: {prompt}")
        lines.append(f"SOUBOR: inbox/{slug}.png")
        lines.append("")

    TOOL_PROMPTS_TXT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Tool prompty ulozeny: {TOOL_PROMPTS_TXT}")
    print(f"Celkem kampani: {len(campaigns)}, ceka na obrazek: {waiting}")
    print()
    for campaign in campaigns[:5]:
        print(f"--- {campaign['slug']} ---")
        print(campaign.get("image_prompt", ""))
        print()


def cmd_compose():
    posts        = load_posts()
    post_by_slug = {p["slug"]: p for p in posts}
    tool_by_slug = tool_campaign_by_slug()
    images       = [f for f in INBOX_DIR.glob("*") if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")]

    if not images:
        print(f"Zadne obrazky v inbox/: {INBOX_DIR}")
        print("Uloz obrazky jako: inbox/<slug>.png")
        return

    done = 0
    for img in sorted(images):
        slug = img.stem
        post = post_by_slug.get(slug)
        tool_campaign = tool_by_slug.get(slug)
        if not post and not tool_campaign:
            print(f"  SKIP: '{slug}' neni v blog-index.json ani pinterest_tool_campaigns.json")
            continue

        hooks    = resolve_hooks(slug) or [post["title"] if post else tool_campaign["hooks"][0]]
        category = post.get("category", "") if post else tool_campaign.get("category", "")

        for idx, hook in enumerate(hooks):
            out_path = variant_output_path(slug, idx)
            if out_path.exists():
                print(f"  SKIP: {out_path.name} uz existuje")
                continue
            label = f"{slug}" if len(hooks) == 1 else f"{slug} [v{idx + 1}/{len(hooks)}]"
            print(f"  Compositor: {label}")
            try:
                composite_pin(
                    bg_image_path=img,
                    title=hook,
                    category=category,
                    url="mystickahvezda.cz",
                    output_path=out_path,
                )
                print(f"  OK: {out_path.name}")
                done += 1
            except Exception as e:
                print(f"  CHYBA: {e}")

    print(f"\nHotovo: {done} pinu vytvoreno.")


# ─────────────────────────────────────────────
# KROK 4: Export CSV pro Pinterest bulk upload
# ─────────────────────────────────────────────

def _slug_and_variant_from_stem(stem: str) -> tuple[str, int]:
    """
    'slug_pin'      → ('slug', 0)
    'slug_v2_pin'   → ('slug', 1)
    'slug_v3_pin'   → ('slug', 2)
    """
    stem = stem.replace("_pin", "")          # "slug" nebo "slug_v2"
    if "_v" in stem:
        base, v = stem.rsplit("_v", 1)
        try:
            return base, int(v) - 1
        except ValueError:
            return stem, 0
    return stem, 0


def cmd_csv():
    posts        = load_posts()
    log          = load_log()
    metadata     = load_pin_metadata()
    post_by_slug = {p["slug"]: p for p in posts}
    tool_by_slug = tool_campaign_by_slug()
    published    = {e["slug"] for e in log.get("published", [])}

    pins = pin_files()
    if not pins:
        print("Zadne piny v images/. Nejpriv spust --compose.")
        return

    rows = []
    slot_times = ["08:00", "14:00", "20:00"]
    now = datetime.now()
    slot_datetimes = []
    day_offset = 0
    while len(slot_datetimes) < len(pins):
        current_date = date.today() + timedelta(days=day_offset)
        for slot in slot_times:
            hour, minute = map(int, slot.split(":"))
            scheduled_at = datetime.combine(current_date, time(hour, minute))
            if scheduled_at > now:
                slot_datetimes.append(scheduled_at)
                if len(slot_datetimes) >= len(pins):
                    break
        day_offset += 1
    slot_idx = 0

    for pin_path in pins:
        slug, var_idx = _slug_and_variant_from_stem(pin_path.stem)
        if slug in published:
            continue

        post = post_by_slug.get(slug)
        tool_campaign = tool_by_slug.get(slug)
        if not post and not tool_campaign:
            print(f"  SKIP CSV: '{slug}' neni v blog-index.json ani pinterest_tool_campaigns.json")
            continue
        hooks    = resolve_hooks(slug) or [post.get("title", slug) if post else slug]
        hook     = hooks[var_idx] if var_idx < len(hooks) else hooks[0]
        category = post.get("category", "") if post else tool_campaign.get("category", "")
        board    = tool_campaign.get("board") if tool_campaign else BOARD_MAP.get(category, DEFAULT_BOARD)
        url      = f"{SITE_URL}/blog/{slug}.html" if post else build_tool_link(tool_campaign, var_idx)
        override = metadata.get(pin_path.name) or metadata.get(pin_path.stem) or {}
        hook = override.get("title", hook)
        board = override.get("board", board)
        url = override.get("link", url)
        description = override.get(
            "description",
            post.get("short_description", "") if post else tool_campaign.get("description", "")
        )

        scheduled_at = slot_datetimes[slot_idx]
        scheduled = scheduled_at.strftime("%Y-%m-%d %H:%M")
        slot_idx += 1

        rows.append({
            "title":       hook[:100],
            "description": description[:500],
            "link":        url,
            "board":       board,
            "image_path":  str(pin_path),
            "scheduled":   scheduled,
        })

    if not rows:
        print("Vsechny hotove piny jsou uz oznacene jako publikovane.")
        return

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["title", "description", "link", "board", "image_path", "scheduled"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"CSV ulozeno: {CSV_PATH}")
    print(f"Celkem: {len(rows)} pinu, rozlozeno do {(len(rows) + 2) // 3} dni (3 piny/den)")


def _pinterest_keywords(category: str) -> str:
    keywords = {
        "Astrologie": "astrologie, horoskop, natalni karta, znameni zverokruhu, spiritualita",
        "Tarot": "tarot, tarotove karty, vyklad tarotu, duchovni vyklad, spiritualita",
        "Numerologie": "numerologie, jmeno, zivotni cislo, cislo osudu, duchovni rozvoj",
        "Spiritualita": "spiritualita, duchovni rozvoj, energie, cakry, ritual",
        "Lunární Magie": "lunarni magie, uplnek, nov, lunarni ritual, mesicni energie",
        "Vztahy": "partnerska shoda, kompatibilita, laska, vztahy, synastrie",
        "Šamanismus": "runy, samanismus, totemove zvire, duchovni pruvodce",
        "Sny": "vyklad snu, snar, sny, podvedomi, spiritualita",
        "Kompatibilita": "partnerska shoda, kompatibilita, laska, vztahy, synastrie",
    }
    return keywords.get(category, "mystika, spiritualita, duchovni rozvoj, astrologie, tarot")


def _public_media_url(pin_path: Path) -> str:
    PUBLIC_PIN_DIR.mkdir(parents=True, exist_ok=True)
    public_path = PUBLIC_PIN_DIR / pin_path.name
    shutil.copy2(pin_path, public_path)
    return f"{PUBLIC_PIN_URL_BASE}/{pin_path.name}"


def _publish_date_utc(scheduled: str) -> str:
    local_dt = datetime.strptime(scheduled, "%Y-%m-%d %H:%M").replace(tzinfo=LOCAL_TZ)
    return local_dt.astimezone(UTC_TZ).strftime("%Y-%m-%dT%H:%M:%S")


def cmd_bulk_csv():
    """
    Exportuje CSV ve formatu pro Pinterest Bulk Create.
    Pinterest vyzaduje verejne dostupne Media URL, proto se piny kopiruji do /img/pinterest/.
    """
    posts        = load_posts()
    log          = load_log()
    metadata     = load_pin_metadata()
    post_by_slug = {p["slug"]: p for p in posts}
    tool_by_slug = tool_campaign_by_slug()
    published    = {e["slug"] for e in log.get("published", [])}

    if not CSV_PATH.exists():
        cmd_csv()

    pins = pin_files()
    if not pins:
        print("Zadne piny v images/. Nejpriv spust --compose nebo uloz finalni piny do images/.")
        return

    rows = []
    # Reuse scheduling from the internal CSV so the two exports stay aligned.
    cmd_csv()
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        internal_rows = list(csv.DictReader(f))
    internal_by_image = {
        Path(row["image_path"]).name: row for row in internal_rows
        if row.get("image_path")
    }

    for pin_path in pins:
        slug, var_idx = _slug_and_variant_from_stem(pin_path.stem)
        if slug in published:
            continue
        post = post_by_slug.get(slug)
        tool_campaign = tool_by_slug.get(slug)
        internal = internal_by_image.get(pin_path.name)
        if (not post and not tool_campaign) or not internal:
            print(f"  SKIP BULK CSV: {pin_path.name} nema metadata.")
            continue

        category = post.get("category", "") if post else tool_campaign.get("category", "")
        override = metadata.get(pin_path.name) or metadata.get(pin_path.stem) or {}
        media_url = _public_media_url(pin_path)
        link = override.get("link", f"{SITE_URL}/blog/{slug}.html" if post else build_tool_link(tool_campaign, var_idx))

        rows.append({
            "Title": internal["title"][:100],
            "Media URL": media_url,
            "Pinterest board": internal["board"],
            "Thumbnail": "",
            "Description": internal["description"][:500],
            "Link": link,
            "Publish date": _publish_date_utc(internal["scheduled"]),
            "Keywords": override.get("keywords", tool_campaign.get("keywords") if tool_campaign else _pinterest_keywords(category)),
        })

    if not rows:
        print("Zadne piny k exportu.")
        return

    with open(PINTEREST_BULK_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "Title",
                "Media URL",
                "Pinterest board",
                "Thumbnail",
                "Description",
                "Link",
                "Publish date",
                "Keywords",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Pinterest bulk CSV ulozeno: {PINTEREST_BULK_CSV_PATH}")
    print(f"Verejne obrazky zkopirovany do: {PUBLIC_PIN_DIR}")
    print(f"Celkem: {len(rows)} pinu")


# ─────────────────────────────────────────────
# Status
# ─────────────────────────────────────────────

def cmd_status():
    posts   = load_posts()
    tools   = load_tool_campaigns()
    log     = load_log()
    published = {e["slug"] for e in log.get("published", [])}
    done_pin_files = pin_files()
    done_slugs = set()
    for f in done_pin_files:
        stem = f.stem.replace("_pin", "")
        slug = stem.rsplit("_v", 1)[0] if "_v" in stem else stem
        done_slugs.add(slug)
    in_inbox  = {f.stem for f in INBOX_DIR.glob("*") if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")}
    waiting_inbox = in_inbox - done_slugs

    total      = len(posts)
    tool_total = len(tools)
    pub_count  = len(published)
    pin_count  = len(done_pin_files)
    blog_slugs = {post["slug"] for post in posts}
    tool_slugs = {tool["slug"] for tool in tools}
    done_tool_count = len(done_slugs & tool_slugs)
    done_blog_count = len(done_slugs & blog_slugs)
    blog_inbox_count = len(waiting_inbox & blog_slugs)
    tool_inbox_count = len(waiting_inbox & tool_slugs)
    inbox_count = len(waiting_inbox)
    pending    = total - pub_count

    print(f"\nSTATUS PINTEREST PINU")
    print(f"{'='*40}")
    print(f"  Celkem blog postu:    {total}")
    print(f"  Tool kampane:         {tool_total}")
    print(f"  Publikovano:          {pub_count}")
    print(f"  Pin vygenerovan:      {pin_count}")
    print(f"  Pokryte clanky:       {done_blog_count}")
    print(f"  Pokryte tool kampane: {done_tool_count}")
    print(f"  Ceka na compositor:   {inbox_count} (v inbox/)")
    print(f"  Blog ceka na obrazek: {pending - blog_inbox_count - done_blog_count}")
    print(f"  Tool ceka na obrazek: {tool_total - tool_inbox_count - done_tool_count}")
    print(f"{'='*40}")
    if pin_count > 0:
        days = (pin_count + 2) // 3
        print(f"  {pin_count} pinu = {days} dni obsahu (3/den)")


# ─────────────────────────────────────────────
# Oznac jako publikovano
# ─────────────────────────────────────────────

def cmd_log_done(slug: str):
    log = load_log()
    if any(e["slug"] == slug for e in log["published"]):
        print(f"'{slug}' uz je oznacen jako publikovany.")
        return
    log["published"].append({"slug": slug, "date": date.today().isoformat()})
    save_log(log)
    print(f"Zaznamenano: {slug}")


def main():
    parser = argparse.ArgumentParser(description="Pinterest Batch Workflow")
    parser.add_argument("--prompts",  action="store_true", help="Vypise image prompty pro cekajici posty")
    parser.add_argument("--tool-prompts", action="store_true", help="Vypise image prompty pro konverzni tool kampane")
    parser.add_argument("--compose",  action="store_true", help="Compositor na vse co je v inbox/")
    parser.add_argument("--csv",      action="store_true", help="Export CSV pro Pinterest bulk upload")
    parser.add_argument("--bulk-csv", action="store_true", help="Export oficialniho Pinterest Bulk Create CSV s Media URL")
    parser.add_argument("--status",   action="store_true", help="Zobrazi stav")
    parser.add_argument("--log-done", action="store_true", help="Oznac slug jako publikovany")
    parser.add_argument("--slug",     type=str, default=None)
    args = parser.parse_args()

    if args.prompts:
        cmd_prompts()
    elif args.tool_prompts:
        cmd_tool_prompts()
    elif args.compose:
        cmd_compose()
    elif args.csv:
        cmd_csv()
    elif args.bulk_csv:
        cmd_bulk_csv()
    elif args.log_done:
        if not args.slug:
            print("Zadej --slug")
            sys.exit(1)
        cmd_log_done(args.slug)
    else:
        cmd_status()


if __name__ == "__main__":
    main()
