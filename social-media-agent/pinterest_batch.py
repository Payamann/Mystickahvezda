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
import sys
from datetime import date, timedelta
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from pinterest_compositor import composite_pin
from pinterest_make_pin import IMAGE_PROMPTS, PINTEREST_HOOKS

BASE_DIR   = Path(__file__).parent
REPO_DIR   = BASE_DIR.parent
BLOG_INDEX = REPO_DIR / "data" / "blog-index.json"
OUT_DIR    = BASE_DIR / "output" / "pinterest"
INBOX_DIR  = OUT_DIR / "inbox"
IMAGES_DIR = OUT_DIR / "images"
LOG_PATH   = OUT_DIR / "pinterest_log.json"
PROMPTS_TXT = OUT_DIR / "prompts.txt"
CSV_PATH   = OUT_DIR / "pinterest_pins.csv"

for d in (INBOX_DIR, IMAGES_DIR):
    d.mkdir(parents=True, exist_ok=True)

# Nástěnky per kategorie
BOARD_MAP = {
    "Astrologie":    "Astrologie a Horoskopy",
    "Tarot":         "Tarot - vyklady a rozkladani",
    "Numerologie":   "Numerologie - tvoje cisla",
    "Spiritualita":  "Spiritualita a Energie",
    "Lunární Magie": "Lunarni ritualy a Uplnek",
    "Vztahy":        "Partnerskа shoda - kompatibilita",
    "Šamanismus":    "Runy a Samanstvi",
    "Sny":           "Sen - vyklad snu",
    "Kompatibilita": "Partnerskа shoda - kompatibilita",
}
DEFAULT_BOARD = "Mysticka Hvezda - Spiritualita"

SITE_URL = "https://www.mystickahvezda.cz"


def load_log() -> dict:
    if LOG_PATH.exists():
        return json.loads(LOG_PATH.read_text(encoding="utf-8"))
    return {"published": [], "stats": {}}


def save_log(log: dict):
    LOG_PATH.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")


def load_posts() -> list:
    return json.loads(BLOG_INDEX.read_text(encoding="utf-8"))


def find_inbox_image(slug: str):
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        p = INBOX_DIR / f"{slug}{ext}"
        if p.exists():
            return p
    return None


def get_pending(posts, log) -> list:
    published = {e["slug"] for e in log.get("published", [])}
    done = {f.stem.replace("_pin", "") for f in IMAGES_DIR.glob("*_pin.jpg")}
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

def cmd_compose():
    posts   = load_posts()
    post_by_slug = {p["slug"]: p for p in posts}
    images  = list(INBOX_DIR.glob("*"))
    images  = [f for f in images if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")]

    if not images:
        print(f"Zadne obrazky v inbox/: {INBOX_DIR}")
        print("Uloz obrazky jako: inbox/<slug>.png")
        return

    done = 0
    for img in sorted(images):
        slug = img.stem
        post = post_by_slug.get(slug)
        if not post:
            print(f"  SKIP: '{slug}' neni v blog-index.json")
            continue

        out_path = IMAGES_DIR / f"{slug}_pin.jpg"
        if out_path.exists():
            print(f"  SKIP: {slug} uz ma pin")
            continue

        hook     = PINTEREST_HOOKS.get(slug, post["title"])
        category = post.get("category", "")
        print(f"  Compositor: {slug}")
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

def cmd_csv():
    posts = load_posts()
    log   = load_log()
    post_by_slug = {p["slug"]: p for p in posts}
    published = {e["slug"] for e in log.get("published", [])}

    # Najdi vsechny hotove piny
    pins = sorted(IMAGES_DIR.glob("*_pin.jpg"))
    if not pins:
        print("Zadne piny v images/. Nejpriv spust --compose.")
        return

    rows = []
    start_date = date.today()
    slot_times = ["08:00", "14:00", "20:00"]
    slot_idx = 0

    for pin_path in pins:
        slug = pin_path.stem.replace("_pin", "")
        if slug in published:
            continue

        post     = post_by_slug.get(slug, {})
        hook     = PINTEREST_HOOKS.get(slug, post.get("title", slug))
        category = post.get("category", "")
        board    = BOARD_MAP.get(category, DEFAULT_BOARD)
        url      = f"{SITE_URL}/blog/{slug}.html"

        # Rozloz piny — 3/den
        day_offset = slot_idx // 3
        time_str   = slot_times[slot_idx % 3]
        sched_date = start_date + timedelta(days=day_offset)
        scheduled  = f"{sched_date.isoformat()} {time_str}"
        slot_idx  += 1

        rows.append({
            "title":       hook[:100],
            "description": post.get("short_description", "")[:500],
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


# ─────────────────────────────────────────────
# Status
# ─────────────────────────────────────────────

def cmd_status():
    posts   = load_posts()
    log     = load_log()
    published = {e["slug"] for e in log.get("published", [])}
    done_pins = {f.stem.replace("_pin", "") for f in IMAGES_DIR.glob("*_pin.jpg")}
    in_inbox  = {f.stem for f in INBOX_DIR.glob("*") if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")}

    total      = len(posts)
    pub_count  = len(published)
    pin_count  = len(done_pins)
    inbox_count = len(in_inbox)
    pending    = total - pub_count

    print(f"\nSTATUS PINTEREST PINU")
    print(f"{'='*40}")
    print(f"  Celkem blog postu:    {total}")
    print(f"  Publikovano:          {pub_count}")
    print(f"  Pin vygenerovan:      {pin_count}")
    print(f"  Ceka na compositor:   {inbox_count} (v inbox/)")
    print(f"  Ceka na obrazek:      {pending - inbox_count - pin_count}")
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
    parser.add_argument("--compose",  action="store_true", help="Compositor na vse co je v inbox/")
    parser.add_argument("--csv",      action="store_true", help="Export CSV pro Pinterest bulk upload")
    parser.add_argument("--status",   action="store_true", help="Zobrazi stav")
    parser.add_argument("--log-done", action="store_true", help="Oznac slug jako publikovany")
    parser.add_argument("--slug",     type=str, default=None)
    args = parser.parse_args()

    if args.prompts:
        cmd_prompts()
    elif args.compose:
        cmd_compose()
    elif args.csv:
        cmd_csv()
    elif args.log_done:
        if not args.slug:
            print("Zadej --slug")
            sys.exit(1)
        cmd_log_done(args.slug)
    else:
        cmd_status()


if __name__ == "__main__":
    main()
