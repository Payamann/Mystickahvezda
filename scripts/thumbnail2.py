#!/usr/bin/env python3
"""
Thumbnail Prompt Generator — Daily Reel 2 (1 znamení, velký glyf)
===================================================================
Generuje Nano Banana prompt pro denní reel 2 s jedním znamením.
Pozadí je kosmické a synergické s energií daného znamení.

Usage:
    python thumbnail2.py --date 2026-04-15
    python thumbnail2.py --date 2026-04-15 --sign Štír
    python thumbnail2.py --date 2026-04-15 --text "Tvé srdce ví." --text2 "Neptej se rozumu."
    python thumbnail2.py --date 2026-04-15 --preview
"""

import sys
import re
import unicodedata
import argparse
import json
import random
from datetime import date
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPT_DIR / "output"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ─── Soubory ──────────────────────────────────────────────────────────────────

USED_SIGNS2_FILE  = OUTPUT_DIR / "used_signs2.json"
HISTORY2_FILE     = OUTPUT_DIR / "thumbnail2_history.json"

# ─── Znamení ──────────────────────────────────────────────────────────────────

ALL_SIGNS = ['Beran', 'Býk', 'Blíženci', 'Rak', 'Lev', 'Panna',
             'Váhy', 'Štír', 'Střelec', 'Kozoroh', 'Vodnář', 'Ryby']

SIGN_EN = {
    'Beran': 'Aries', 'Býk': 'Taurus', 'Blíženci': 'Gemini',
    'Rak': 'Cancer', 'Lev': 'Leo', 'Panna': 'Virgo',
    'Váhy': 'Libra', 'Štír': 'Scorpio', 'Střelec': 'Sagittarius',
    'Kozoroh': 'Capricorn', 'Vodnář': 'Aquarius', 'Ryby': 'Pisces',
}

SIGN_GLYPH = {
    'Beran': '♈', 'Býk': '♉', 'Blíženci': '♊',
    'Rak': '♋', 'Lev': '♌', 'Panna': '♍',
    'Váhy': '♎', 'Štír': '♏', 'Střelec': '♐',
    'Kozoroh': '♑', 'Vodnář': '♒', 'Ryby': '♓',
}

# ─── Kosmické pozadí podle znamení ────────────────────────────────────────────
# Každé znamení má jiný vesmírný charakter — synergický s jeho energií

SIGN_COSMIC_BG = {
    'Beran': (
        "blazing crimson and scarlet nebula with intense orange plasma bursts, "
        "fiery red cosmic energy surging like solar flares, deep red void with "
        "streaks of hot amber light — powerful, ignited, unstoppable"
    ),
    'Býk': (
        "deep emerald and forest-green nebula with warm golden stardust, "
        "rich earthen cosmic clouds in amber and jade tones, grounded cosmic "
        "terrain of green and brown stellar dust — lush, fertile, timeless"
    ),
    'Blíženci': (
        "electric gold and violet dual-tone nebula with twin light streams, "
        "shimmering silver and yellow cosmic sparks, two converging light ribbons "
        "of lavender and gold — quicksilver, dazzling, mercurial"
    ),
    'Rak': (
        "silver and pale blue lunar nebula with moonlit cosmic mist, "
        "soft silver-white stardust glowing like reflected moonlight, "
        "deep indigo void with cool silver light trails — gentle, lunar, oceanic"
    ),
    'Lev': (
        "deep royal burgundy and dark copper nebula with dramatic sunburst corona in the distance, "
        "rich dark amber and deep maroon cosmic clouds, majestic dark regal tones — "
        "powerful, solar, commanding — dark enough to contrast with a gold glyph"
    ),
    'Panna': (
        "deep teal and sage green nebula with cool earthy cosmic dust, "
        "forest emerald and silver stardust with precise geometric light patterns, "
        "refined cosmic clarity — cool, analytical, crystalline"
    ),
    'Váhy': (
        "soft rose and lavender nebula with balanced pastel cosmic tones, "
        "delicate pink and lilac stardust, harmonious dual-color aurora in "
        "rose gold and violet hues — graceful, balanced, romantic"
    ),
    'Štír': (
        "deep crimson and obsidian black nebula with dark violet undertones, "
        "intense blood-red plasma in a near-total cosmic darkness, "
        "smoldering maroon and deep purple void — mysterious, intense, transformative"
    ),
    'Střelec': (
        "expansive turquoise and royal purple nebula with golden arrow-light streaks, "
        "deep violet cosmic horizon with teal aurora and warm gold bursts, "
        "wide open cosmic vista — adventurous, expansive, philosophical"
    ),
    'Kozoroh': (
        "dark glacial blue and granite grey nebula with icy silver stellar clouds, "
        "cold deep navy void with frost-white star clusters, "
        "stoic cosmic terrain of dark blue and charcoal — disciplined, ancient, enduring"
    ),
    'Vodnář': (
        "electric cyan and ultraviolet nebula with futuristic plasma currents, "
        "neon aqua and deep violet cosmic energy fields, electric blue lightning "
        "traces in a dark space — visionary, electric, revolutionary"
    ),
    'Ryby': (
        "deep aqua and indigo nebula with dreamy ocean-deep cosmic mist, "
        "teal and midnight blue stardust blending into purple void, "
        "ethereal underwater cosmic light — mystical, fluid, transcendent"
    ),
}

# Barva glyfového kamene — synergická se znamením
SIGN_GLYPH_MATERIAL = {
    'Beran':    "polished crimson obsidian with molten gold filigree inlay, ember-glow from within",
    'Býk':      "deep green jade with warm gold filigree inlay, earthy emerald glow",
    'Blíženci': "shimmering mercury-silver with electrum (gold-silver) filigree inlay, dual shimmer",
    'Rak':      "moonstone white with silver filigree inlay, soft lunar inner glow",
    'Lev':      "burnished solar gold with champagne filigree relief, warm radiant glow",
    'Panna':    "cool dark teal with silver-green filigree inlay, precise crystalline edges",
    'Váhy':     "rose quartz pink with rose gold filigree inlay, soft balanced glow",
    'Štír':     "pitch-black obsidian with deep crimson filigree inlay, dark pulsing glow",
    'Střelec':  "deep purple lapis with gold filigree inlay, adventurous warm glow",
    'Kozoroh':  "dark grey granite with ice-silver filigree inlay, cold enduring glow",
    'Vodnář':   "electric blue sapphire with neon cyan filigree inlay, electric crackling glow",
    'Ryby':     "deep teal aquamarine with silver-blue filigree inlay, dreamy oceanic glow",
}

# ─── Texty svitku — záložní pokud uživatel nedá --text ────────────────────────

SCROLL_BY_SIGN = {
    'Beran':    [("Dnes nic nezastaví", "tvůj průlom."), ("Tvůj oheň", "hoří nejsilněji.")],
    'Býk':      [("Dnes zakotvíš", "svou sílu."), ("Trpělivost", "přináší plody.")],
    'Blíženci': [("Dvě cesty, jedno srdce.", "Které si vybereš?"), ("Tvé slovo", "mění vše.")],
    'Rak':      [("Intuice nemluví nahlas.", "Ale slyšíš ji?"), ("Dnes pocítíš", "kosmický průlom.")],
    'Lev':      [("Tvé světlo", "osvítí ostatní.", ), ("Dnes zazáříš", "naplno.")],
    'Panna':    [("Detaily odhalí", "skrytou pravdu."), ("Tvůj klid", "je tvá síla.")],
    'Váhy':     [("Rovnováha", "přichází dnes."), ("Volba, která", "změní vše.")],
    'Štír':     [("Hlubiny skrývají", "tvůj dar."), ("Transformace", "začíná dnes.")],
    'Střelec':  [("Horizont volá", "tvé jméno."), ("Svoboda", "je tvé právo.")],
    'Kozoroh':  [("Každý krok", "buduje horu."), ("Čas pracuje", "pro tebe.")],
    'Vodnář':   [("Budoucnost", "začíná v tobě."), ("Revolta", "je láska.")],
    'Ryby':     [("Sny jsou", "tvůj kompas."), ("Oceán duše", "nemá dno.")],
}

# ─── Pomocné funkce ───────────────────────────────────────────────────────────

def load_history() -> dict:
    if HISTORY2_FILE.exists():
        return json.loads(HISTORY2_FILE.read_text(encoding="utf-8"))
    return {"scrolls": []}

def save_history(history: dict):
    HISTORY2_FILE.parent.mkdir(parents=True, exist_ok=True)
    HISTORY2_FILE.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")

def pick_fresh(pool: list, used: list) -> any:
    available = [x for x in pool if str(x) not in used[-(len(pool)-1):]]
    if not available:
        available = pool
    return random.choice(available)

def format_date_cs(date_str: str) -> str:
    months = ["ledna", "února", "března", "dubna", "května", "června",
              "července", "srpna", "září", "října", "listopadu", "prosince"]
    d = date.fromisoformat(date_str)
    return f"{d.day}. {months[d.month - 1]}"

def sign_to_slug(sign: str) -> str:
    """Převede české jméno znamení na ASCII slug pro název souboru."""
    nfkd = unicodedata.normalize("NFKD", sign.lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c))

def get_scroll_from_voiceover(date_str: str, sign: str) -> tuple[str, str] | None:
    """
    Načte text svitku z voiceover2_{date}_{slug}.txt generovaného daily_reel2.py.
    Hledá sekci THUMBNAIL PROMPT → Line 1 / Line 2.
    Vrátí (line1, line2) nebo None pokud soubor neexistuje.
    """
    slug = sign_to_slug(sign)
    path = OUTPUT_DIR / f"voiceover2_{date_str}_{slug}.txt"
    if not path.exists():
        print(f"[!] Voiceover soubor nenalezen: {path.name} — použiji záložní text")
        return None

    text = path.read_text(encoding="utf-8")

    # Najdi sekci THUMBNAIL PROMPT
    section = re.search(r"THUMBNAIL PROMPT.*?(?=\n[A-Z ]{4,}\n|$)", text, re.DOTALL)
    if not section:
        print(f"[!] Sekce THUMBNAIL PROMPT nenalezena v {path.name}")
        return None

    block = section.group(0)

    # Najdi sekci svitku (parchment scroll) — hledej Line 1/2 AŽ za klíčovým slovem scroll
    scroll_section = re.search(r'(?:scroll|pergamen).*', block, re.DOTALL | re.IGNORECASE)
    search_in = scroll_section.group(0) if scroll_section else block

    line1_match = re.search(r'Line 1:\s*"([^"]+)"', search_in)
    line2_match = re.search(r'Line 2:\s*"([^"]+)"', search_in)

    if line1_match and line2_match:
        l1 = line1_match.group(1).strip()
        l2 = line2_match.group(1).strip()
        print(f"[*] Svitek z voiceoveru: '{l1}' / '{l2}'")
        return l1, l2

    print(f"[!] Line 1/Line 2 nenalezeny v THUMBNAIL PROMPT — použiji záložní text")
    return None

def get_sign_for_date(date_str: str, forced: str = None) -> str:
    if forced:
        return forced
    # Zkus načíst ze used_signs2.json (výstup daily_reel2.py)
    if USED_SIGNS2_FILE.exists():
        data = json.loads(USED_SIGNS2_FILE.read_text(encoding="utf-8"))
        entry = data.get(date_str)
        if entry:
            sign = entry[0] if isinstance(entry, list) else entry
            print(f"[*] Znamení z used_signs2.json: {sign}")
            return sign
    # Fallback — náhodné
    sign = random.choice(ALL_SIGNS)
    print(f"[*] Znamení náhodně (used_signs2.json nenalezen): {sign}")
    return sign

# ─── Prompt builder ───────────────────────────────────────────────────────────

def build_prompt(date_str: str, sign: str, scroll_line1: str, scroll_line2: str) -> str:
    date_cs  = format_date_cs(date_str)
    sign_en  = SIGN_EN[sign]
    glyph    = SIGN_GLYPH[sign]
    bg       = SIGN_COSMIC_BG[sign]

    return f"""A mystical video thumbnail for zodiac sign {sign_en}.

BACKGROUND: deep dark space with soft subtle {bg} — gentle and atmospheric, NOT aggressive. Rich dense star field with thousands of tiny stars. Dark and deep — moody and calm, serving as a backdrop without competing with the foreground. Deep navy and dark indigo tones dominate. NO harsh lightning, NO aggressive neon.

COMPOSITION: Three elements stacked as one tight unified group, vertically centered in the image. The group fills roughly 80% of the image height. Minimal gap between elements — they feel like one connected unit.

ELEMENT 1 — glyph: large ornate {sign_en} symbol ({glyph}) in solid gold — rich champagne gold with deep amber shadows — surface of each stroke covered in intricate engraved filigree scrollwork and decorative patterns. Beveled polished 3D edges catching light. Small ornamental flourishes where strokes meet. Clear 3D depth and volume. Premium, ancient — NOT plain, NOT flat, NOT simple geometry.

ELEMENT 2 — immediately below, small gap: dark stone plaque with ornate gold border frame. '{date_cs}' in elegant gold lettering on the first line, '{sign.upper()}' in bold engraved gold capitals on the second line.

ELEMENT 3 — immediately below, small gap: compact parchment scroll, aged honey color. Bold serif text in dark brown (#2a1500), NOT cursive, NOT italic: '{scroll_line1}' on the first line, '{scroll_line2}' on the second line.

NO zodiac wheel. NO star icons. NO logos. NO borders. NO corner decorations. NO animals. NO human figures. Bottom corners completely clean.

Portrait 9:16."""

# ─── Checklist ────────────────────────────────────────────────────────────────

def print_checklist(sign: str, scroll_line1: str, scroll_line2: str):
    sign_en = SIGN_EN[sign]
    glyph   = SIGN_GLYPH[sign]
    print("\n📋 CHECKLIST — zkontroluj po vygenerování:")
    print(f"  [ ] Glyf správný: {glyph} ({sign_en}) — POUZE symbol, žádné zvíře/ilustrace")
    print(f"  [ ] Glyf velký a dominantní — zabírá horních 60%")
    print(f"  [ ] Pozadí kosmické — odpovídá energii {sign}")
    print(f"  [ ] Plaketa čitelná se správným datem a '{sign.upper()}'")
    print(f"  [ ] Svitek dole — bold serif, tmavě hnědý text (NE cursive/italic)")
    print(f"  [ ] Svitek text: '{scroll_line1}' / '{scroll_line2}'")
    print(f"  [ ] Žádné logo, hvězdička, border, rohové dekorace")
    print(f"  [ ] Formát 9:16, nic useknuté\n")

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Thumbnail2 prompt generator — Daily Reel 2")
    parser.add_argument("--date",    required=True, help="Datum (YYYY-MM-DD)")
    parser.add_argument("--sign",    default=None,  help="Znamení (česky), např. Štír")
    parser.add_argument("--text",    default=None,  help="1. řádek svitku (z voiceoveru)")
    parser.add_argument("--text2",   default=None,  help="2. řádek svitku (z voiceoveru)")
    parser.add_argument("--preview", action="store_true", help="Jen náhled bez promptu")
    args = parser.parse_args()

    sign = get_sign_for_date(args.date, args.sign)

    if sign not in ALL_SIGNS:
        print(f"[CHYBA] Neznámé znamení: {sign}. Použij: {', '.join(ALL_SIGNS)}")
        return

    history = load_history()

    # Svitek — priorita: 1) argumenty, 2) voiceover soubor, 3) záložní texty
    if args.text and args.text2:
        scroll_line1 = args.text
        scroll_line2 = args.text2
        print(f"[*] Svitek z argumentů: '{scroll_line1}' / '{scroll_line2}'")
    else:
        voiceover = get_scroll_from_voiceover(args.date, sign)
        if voiceover:
            scroll_line1, scroll_line2 = voiceover
        else:
            pool = SCROLL_BY_SIGN.get(sign, [("Co ti hvězdy", "dnes připravily?")])
            scroll = pick_fresh(pool, history.get("scrolls", []))
            scroll_line1, scroll_line2 = scroll
            print(f"[*] Svitek záložní: '{scroll_line1}' / '{scroll_line2}'")
            history.setdefault("scrolls", []).append(str(scroll))

    print(f"[*] Znamení: {sign} ({SIGN_EN[sign]}) {SIGN_GLYPH[sign]}")
    print(f"[*] Kosmické pozadí: {SIGN_COSMIC_BG[sign][:60]}...")

    if args.preview:
        print_checklist(sign, scroll_line1, scroll_line2)
        save_history(history)
        return

    prompt = build_prompt(args.date, sign, scroll_line1, scroll_line2)
    print_checklist(sign, scroll_line1, scroll_line2)

    sep = "=" * 60
    print(f"\n{sep}\nNANO BANANA PROMPT\n{sep}")
    print(prompt)
    print(sep)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / f"thumbnail2_{args.date}.txt"
    out_path.write_text(prompt, encoding="utf-8")
    print(f"[OK] Uloženo: {out_path}")

    save_history(history)


if __name__ == "__main__":
    main()
