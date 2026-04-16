"""
Pinterest Bulk Pin Generator
============================
Vygeneruje obrázky (1000x1500px, portrait 2:3) pro každý blog post
a sestaví CSV soubor pro hromadné nahrání na Pinterest.

Použití:
    python pinterest_generator.py                # všechny posty
    python pinterest_generator.py --limit 10     # prvních 10 (test)
    python pinterest_generator.py --only-csv     # jen CSV, bez generování obrázků
"""

import json
import csv
import os
import sys
import time
import argparse
import urllib.request
import urllib.parse
from pathlib import Path
from datetime import datetime

sys.path.append(os.path.dirname(__file__))
import config
from logger import get_logger
from generators.image_generator import generate_image
from pinterest_compositor import composite_pin

log = get_logger(__name__)

# === Konfigurace ===
BASE_DIR      = Path(__file__).parent
BLOG_INDEX    = BASE_DIR.parent / "data" / "blog-index.json"
OUTPUT_DIR    = BASE_DIR / "output" / "pinterest"
IMAGES_DIR    = OUTPUT_DIR / "images"
CSV_PATH      = OUTPUT_DIR / "pinterest_pins.csv"
SITE_URL      = "https://www.mystickahvezda.cz"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# === Board mapping: kategorie → Pinterest nástěnka ===
BOARD_MAP = {
    "Astrologie":     "Astrologie a Horoskopy",
    "Tarot":          "Tarot – výklady a rozkládání",
    "Numerologie":    "Numerologie – tvoje čísla",
    "Spiritualita":   "Spiritualita a Energie",
    "Lunární Magie":  "Lunární rituály a Úplněk",
    "Vztahy":         "Partnerská shoda – kompatibilita",
    "Šamanismus":     "Runy a Šamanství",
    "Sny":            "Sen – výklad snů",
    "Feng Shui":      "Spiritualita a Energie",
    "Krystaly":       "Spiritualita a Energie",
}
DEFAULT_BOARD = "Mystická Hvězda – Spiritualita"

# === Image prompt šablony per kategorie ===
PROMPT_TEMPLATES = {
    "Astrologie": (
        "Elegant astrology {symbol} {detail}, gold filigree engravings of zodiac constellations, "
        "deep navy cosmic starfield background (#050510), glowing purple and gold nebula, "
        "premium 3D CGI render, icon-art style, NO text NO people NO frames NO borders, portrait 2:3"
    ),
    "Tarot": (
        "Mystical tarot {symbol} {detail}, ornate gold and silver engravings, arcane symbols, "
        "deep navy cosmic starfield background (#050510), ethereal purple light, cosmic dust, "
        "premium 3D CGI render, icon-art style, NO text NO people NO frames NO borders, portrait 2:3"
    ),
    "Numerologie": (
        "Sacred geometry {symbol} {detail}, golden numerological symbols, fibonacci spiral, "
        "deep navy cosmic starfield background (#050510), glowing gold light emanating from center, "
        "premium 3D CGI render, icon-art style, NO text NO people NO frames NO borders, portrait 2:3"
    ),
    "Spiritualita": (
        "Spiritual {symbol} {detail}, ethereal energy streams, chakra light, amethyst crystals, "
        "deep navy cosmic starfield background (#050510), soft violet and gold glow, sacred geometry, "
        "premium 3D CGI render, icon-art style, NO text NO people NO frames NO borders, portrait 2:3"
    ),
    "Lunární Magie": (
        "Luminous moon {symbol} {detail}, silver moonbeams, lunar phases engraved in gold, "
        "deep navy cosmic starfield background (#050510), moonlit purple nebula, crystal clear, "
        "premium 3D CGI render, icon-art style, NO text NO people NO frames NO borders, portrait 2:3"
    ),
    "Vztahy": (
        "Twin souls {symbol} {detail}, intertwined golden light, zodiac compatibility symbols, "
        "deep navy cosmic starfield background (#050510), warm rose gold and purple glow, "
        "premium 3D CGI render, icon-art style, NO text NO people NO frames NO borders, portrait 2:3"
    ),
    "Šamanismus": (
        "Ancient runic {symbol} {detail}, Nordic rune carvings glowing in amber gold, "
        "deep navy cosmic starfield background (#050510), mystical forest energy, earthy purple tones, "
        "premium 3D CGI render, icon-art style, NO text NO people NO frames NO borders, portrait 2:3"
    ),
    "Sny": (
        "Dreamlike {symbol} {detail}, surreal floating elements, silver mist, ethereal wisps, "
        "deep navy cosmic starfield background (#050510), moonlit deep blue atmosphere, "
        "premium 3D CGI render, icon-art style, NO text NO people NO frames NO borders, portrait 2:3"
    ),
}
DEFAULT_PROMPT = (
    "Mystical spiritual {symbol} {detail}, sacred gold filigree, cosmic energy, "
    "deep navy cosmic starfield background (#050510), purple and gold ethereal glow, "
    "premium 3D CGI render, icon-art style, NO text NO people NO frames NO borders, portrait 2:3"
)

# === Symbol & detail per slug keywords ===
def _extract_symbol_detail(post: dict) -> tuple[str, str]:
    """Vybere vhodný symbol a detail podle titulku/kategorie postu."""
    title = post["title"].lower()
    slug  = post.get("slug", "")

    mapping = [
        (["tarot", "karta", "karty", "arkána"],  "tarot card",      "floating above velvet cloth, candlelight reflections"),
        (["měsíc", "úplněk", "lunac", "moon"],   "crescent moon",   "surrounded by silver stars and lunar dust"),
        (["čakr", "chakra", "aura"],             "lotus flower",    "with seven glowing chakra orbs rising from center"),
        (["runy", "runa", "nordic"],             "runic stone",     "with amber glowing runes carved in ancient stone"),
        (["numerolog", "číslo", "cislo"],        "sacred number",   "formed by golden geometric light patterns"),
        (["hvězd", "astro", "horoskop", "znamení", "saturn", "merkur", "venuše", "pluto"],
                                                 "celestial sphere","showing constellation map in gold filigree"),
        (["partner", "vztah", "láska", "laska", "spřízn"],
                                                 "infinity symbol", "in rose gold with twin stars orbiting it"),
        (["krystal", "crystal", "koule"],        "crystal ball",    "glowing from within with violet and gold light"),
        (["šaman", "totem", "kolo"],             "medicine wheel",  "carved in ancient stone with golden glyphs"),
        (["sen", "sny", "dream"],                "dreamcatcher",    "woven from silver moonlight threads"),
        (["feng", "energie", "ritual"],          "mandala",         "with intricate gold filigree and gemstone center"),
        (["manifest", "afirmace", "zákon"],      "golden spiral",   "ascending through cosmic nebula"),
        (["angel", "andel", "andělsk"],          "angel feather",   "glowing in pure white and gold light"),
    ]

    for keywords, symbol, detail in mapping:
        if any(kw in title or kw in slug for kw in keywords):
            return symbol, detail

    return "mystical orb", "radiating golden cosmic energy"


def _build_image_prompt(post: dict) -> str:
    category = post.get("category", "")
    template = PROMPT_TEMPLATES.get(category, DEFAULT_PROMPT)
    symbol, detail = _extract_symbol_detail(post)
    return template.format(symbol=symbol, detail=detail)


def _upload_imgbb(image_path: Path) -> str | None:
    """Nahraje obrázek na ImgBB a vrátí veřejnou URL."""
    api_key = config.IMGBB_API_KEY
    if not api_key:
        log.warning("IMGBB_API_KEY není nastaven — obrázek nebude nahrán na ImgBB")
        return None

    with open(image_path, "rb") as f:
        import base64
        image_data = base64.b64encode(f.read()).decode("utf-8")

    data = urllib.parse.urlencode({
        "key": api_key,
        "image": image_data,
        "name": image_path.stem,
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            "https://api.imgbb.com/1/upload",
            data=data,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            url = result["data"]["url"]
            log.info("ImgBB: nahráno → %s", url)
            return url
    except Exception as e:
        log.warning("ImgBB upload selhal: %s", e)
        return None


def _pinterest_keywords(post: dict) -> str:
    """Vygeneruje klíčová slova pro Pinterest pin."""
    category_keywords = {
        "Astrologie":    "astrologie,horoskop,znamení zvěrokruhu,natální karta,spiritualita",
        "Tarot":         "tarot,tarotové karty,výklad tarotu,věštění,spiritualita",
        "Numerologie":   "numerologie,číslo osudu,životní číslo,duchovní rozvoj",
        "Spiritualita":  "spiritualita,duchovní rozvoj,meditace,energie,čakry",
        "Lunární Magie": "lunární magie,úplněk,nový měsíc,lunární rituál,měsíční energie",
        "Vztahy":        "partnerská shoda,kompatibilita,astrologie vztahů,spřízněná duše",
        "Šamanismus":    "runy,šamanství,totemové zvíře,severská magie,duchovní průvodce",
        "Sny":           "výklad snů,snář,sny,podvědomí,spiritualita",
    }
    base = category_keywords.get(post.get("category", ""), "spiritualita,mystika,duchovní rozvoj")
    return f"mystická hvězda,{base}"


def generate_all_pins(limit: int = None, only_csv: bool = False) -> None:
    """Hlavní funkce — generuje obrázky a CSV pro všechny blog posty."""

    # Načti blog posty
    with open(BLOG_INDEX, encoding="utf-8") as f:
        posts = json.load(f)

    if limit:
        posts = posts[:limit]

    log.info("Načteno %d blog postů → generuji Pinterest piny...", len(posts))

    rows = []
    total = len(posts)

    for i, post in enumerate(posts, 1):
        slug     = post["slug"]
        title    = post["title"]
        desc     = post.get("short_description", "")[:500]
        category = post.get("category", "")
        board    = BOARD_MAP.get(category, DEFAULT_BOARD)
        link     = f"{SITE_URL}/blog/{slug}.html"
        keywords = _pinterest_keywords(post)
        filename = f"pin_{slug}"
        image_path = IMAGES_DIR / f"{filename}.png"

        log.info("[%d/%d] %s", i, total, title[:60])

        image_url = ""

        if not only_csv:
            # Vygeneruj obrázek pokud ještě neexistuje
            if image_path.exists():
                log.info("  → obrázek již existuje, přeskakuji generování")
            else:
                prompt = _build_image_prompt(post)
                try:
                    generated = generate_image(
                        prompt=prompt,
                        platform="pinterest",
                        post_type="portrait",  # 4:5 — nejblíže 2:3 v Imagen 3
                        filename=str(IMAGES_DIR / filename),
                    )
                    # Přejmenuj pokud se uložil jinam
                    if generated != image_path and generated.exists():
                        generated.rename(image_path)
                    log.info("  → obrázek vygenerován")
                    time.sleep(2)  # rate limit
                except Exception as e:
                    log.warning("  → generování selhalo: %s", e)

            # Compositor — přidej text overlay
            if image_path.exists():
                pin_path = IMAGES_DIR / f"{filename}_pin.jpg"
                try:
                    composite_pin(
                        bg_image_path=image_path,
                        title=title,
                        category=post.get("category", ""),
                        url="mystickahvezda.cz",
                        output_path=pin_path,
                    )
                    log.info("  → compositor OK: %s", pin_path.name)
                    upload_source = pin_path  # nahraj finální pin, ne surový bg
                except Exception as e:
                    log.warning("  → compositor selhal: %s", e)
                    upload_source = image_path
            else:
                upload_source = image_path

            # Nahraj na ImgBB
            if upload_source.exists() and not image_url:
                image_url = _upload_imgbb(upload_source) or ""

        rows.append({
            "Title":       title[:100],
            "Description": desc,
            "Link":        link,
            "Image URL":   image_url,
            "Board Name":  board,
            "Keywords":    keywords,
        })

    # Zapiš CSV
    with open(CSV_PATH, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["Title", "Description", "Link", "Image URL", "Board Name", "Keywords"])
        writer.writeheader()
        writer.writerows(rows)

    log.info("CSV uloženo → %s (%d pinů)", CSV_PATH, len(rows))
    print(f"\nHotovo! CSV: {CSV_PATH}")
    print(f"   Obrazky: {IMAGES_DIR}")
    print(f"   Pinu celkem: {len(rows)}")

    # Přehled per board
    from collections import Counter
    boards = Counter(r["Board Name"] for r in rows)
    print("\nRozdělení do nástěnek:")
    for board, count in sorted(boards.items(), key=lambda x: -x[1]):
        print(f"  {board}: {count} pinů")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pinterest Bulk Pin Generator")
    parser.add_argument("--limit",    type=int, default=None, help="Počet postů (test)")
    parser.add_argument("--only-csv", action="store_true",    help="Jen CSV, bez generování obrázků")
    args = parser.parse_args()

    generate_all_pins(limit=args.limit, only_csv=args.only_csv)
