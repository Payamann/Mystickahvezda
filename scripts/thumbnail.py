#!/usr/bin/env python3
"""
Thumbnail Prompt Generator pro Mystickou Hvězdu
================================================
Vezme datum + snip videa → analyzuje barvy → vygeneruje prompt pro Nano Banana.

Usage:
    python thumbnail.py --date 2026-04-10 --snip snip.png
    python thumbnail.py --date 2026-04-10                    # bez snipu = defaultní barvy
    python thumbnail.py --date 2026-04-10 --preview          # jen rychlý náhled
    python thumbnail.py --date 2026-04-10 --days 7           # batch týden
"""

import sys
import argparse
import hashlib
import json
import random
import colorsys
from datetime import date, timedelta
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPT_DIR / "output"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ─── Konstanty ────────────────────────────────────────────────────────────────

HISTORY_FILE  = OUTPUT_DIR / "thumbnail_history.json"
USED_SIGNS_FILE = OUTPUT_DIR / "used_signs.json"

DEFAULT_COLOR_DESC  = "deep space with swirling fuchsia, teal, orange and purple nebulae"
DEFAULT_WHEEL_COLOR = "deep navy and cosmic purple tones"

# ─── Znamení ──────────────────────────────────────────────────────────────────

ALL_SIGNS = ['Beran', 'Býk', 'Blíženci', 'Rak', 'Lev', 'Panna',
             'Váhy', 'Štír', 'Střelec', 'Kozoroh', 'Vodnář', 'Ryby']

SIGN_EN = {
    'Beran': 'Aries', 'Býk': 'Taurus', 'Blíženci': 'Gemini',
    'Rak': 'Cancer', 'Lev': 'Leo', 'Panna': 'Virgo',
    'Váhy': 'Libra', 'Štír': 'Scorpio', 'Střelec': 'Sagittarius',
    'Kozoroh': 'Capricorn', 'Vodnář': 'Aquarius', 'Ryby': 'Pisces',
}

# Energie každého znamení pro výběr svitku
SIGN_ENERGY = {
    'Beran':    'fire',    'Lev':      'fire',    'Střelec':  'fire',
    'Býk':      'earth',   'Panna':    'earth',   'Kozoroh':  'earth',
    'Blíženci': 'air',     'Váhy':     'air',     'Vodnář':   'air',
    'Rak':      'water',   'Štír':     'water',   'Ryby':     'water',
}

# ─── Texty — svitek podle energie dne ────────────────────────────────────────

SCROLL_BY_ENERGY = {
    'fire': [
        ("Která 3 znamení", "dnes zapálí svůj den?"),
        ("Tvá energie dnes", "překoná vše?"),
        ("3 znamení dnes", "rozhoří svůj osud"),
    ],
    'earth': [
        ("Která 3 znamení", "dnes zakotví svou sílu?"),
        ("Tvůj den se dnes", "pevně usadí"),
        ("3 znamení dnes", "najdou svou cestu"),
    ],
    'air': [
        ("Která 3 znamení", "dnes odhalí pravdu?"),
        ("Tvé myšlenky dnes", "změní vše"),
        ("3 znamení dnes", "ponesou nový vítr"),
    ],
    'water': [
        ("Která 3 znamení", "dnes pocítí průlom?"),
        ("Tvá intuice dnes", "mluví jasně"),
        ("3 znamení dnes", "otevřou svá srdce"),
    ],
}

# Fallback pokud je smíšená energie
SCROLL_FALLBACK = [
    ("Která 3 znamení", "to dnes pocítí?"),
    ("Tvé znamení", "je mezi nimi?"),
    ("Co ti dnes", "hvězdy připravily?"),
    ("Tvůj osud", "se dnes rozhoduje"),
    ("Která znamení", "hvězdy dnes volají?"),
]

# ─── Plaketa — podle astrosezóny ─────────────────────────────────────────────

# (měsíc, den_od) → text
SEASONAL_PLAQUES = [
    ((3, 21), "ENERGIE PRŮKOPNÍKA"),
    ((4, 20), "SÍLA ZEMĚ"),
    ((5, 21), "MAGIE SLOV"),
    ((6, 21), "HLOUBKA DUŠE"),
    ((7, 23), "ZÁŘE HVĚZD"),
    ((8, 23), "MOUDROST VESMÍRU"),
    ((9, 23), "HARMONIE SVĚTŮ"),
    ((10, 23), "TAJEMSTVÍ STÍNŮ"),
    ((11, 22), "SVOBODA DUCHA"),
    ((12, 22), "SÍLA ČASU"),
    ((1, 20), "VIZE BUDOUCNOSTI"),
    ((2, 19), "KOSMICKÁ INTUICE"),
]

EXTRA_PLAQUES = [
    "KOSMICKÝ PRŮLOM",
    "HVĚZDNÁ BRÁNA",
    "OSUDOVÝ OKAMŽIK",
    "VESMÍRNÁ ENERGIE",
    "KOSMICKÁ VIBRACE",
    "HVĚZDNÝ IMPULS",
    "NEBESKÉ ZNAMENÍ",
    "TAJEMNÉ SETKÁNÍ",
]

def get_seasonal_plaque(date_str: str) -> str:
    """Vrátí plaketu odpovídající aktuálnímu astrologickému znamení."""
    d = date.fromisoformat(date_str)
    current = None
    for (month, day), text in SEASONAL_PLAQUES:
        sign_date = date(d.year, month, day)
        if d >= sign_date:
            current = text
    # Leden/únor — porovnej i s předchozím rokem
    if current is None:
        current = SEASONAL_PLAQUES[-1][1]  # Ryby jako fallback
    return current

# ─── Historie ─────────────────────────────────────────────────────────────────

def load_history() -> dict:
    if HISTORY_FILE.exists():
        return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
    return {"plaques": [], "scrolls": []}

def save_history(history: dict):
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    HISTORY_FILE.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")

def pick_fresh(pool: list, used: list, fallback_key: str) -> any:
    """Vybere položku z pool která nebyla použita posledních N dní."""
    available = [x for x in pool if str(x) not in used[-len(pool)+1:]]
    if not available:
        available = pool  # všechny použity — reset
    return random.choice(available)

# ─── Barvy ────────────────────────────────────────────────────────────────────

def analyze_colors(image_path: str) -> tuple[str, str]:
    """Vrátí (bg_color_desc, wheel_color_desc) ze snipu."""
    try:
        from PIL import Image

        img = Image.open(image_path).convert("RGB")
        img = img.resize((100, 100))
        pixels = list(img.getdata())

        r_avg = sum(p[0] for p in pixels) / len(pixels)
        g_avg = sum(p[1] for p in pixels) / len(pixels)
        b_avg = sum(p[2] for p in pixels) / len(pixels)

        h, s, v = colorsys.rgb_to_hsv(r_avg / 255, g_avg / 255, b_avg / 255)
        hue_deg = h * 360

        is_warm   = r_avg > b_avg and r_avg > g_avg
        is_cool   = b_avg > r_avg
        is_purple = 270 < hue_deg < 320 or (r_avg > 100 and b_avg > 100 and g_avg < 80)
        is_teal   = 160 < hue_deg < 200
        is_dark   = v < 0.4

        # Pozadí
        bg = []
        bg.append("deep dark cosmic void" if is_dark else "deep space")
        bg.append("warm amber and golden orange nebulae" if is_warm else
                  "cool blue and silver cosmic clouds" if is_cool else
                  "swirling purple cosmic energy")
        bg.append("rich violet and deep purple mystical haze" if is_purple else "ethereal purple mist")
        bg.append("vibrant teal aurora streaks" if is_teal else "subtle cyan light trails")
        bg.append("intense fuchsia and crimson nebulosity" if r_avg > 150 and g_avg < 100 else "soft fuchsia stardust")
        bg_desc = ", ".join(bg)

        # Kolo — přizpůsob dominantní barvě
        if is_warm:
            wheel_desc = "warm amber and deep bronze tones with golden filigree"
        elif is_purple and is_cool:
            wheel_desc = "deep indigo and cosmic violet tones with silver-gold filigree"
        elif is_cool:
            wheel_desc = "deep navy and glacial blue tones with icy silver filigree"
        else:
            wheel_desc = DEFAULT_WHEEL_COLOR

        print(f"[*] Barvy: R={r_avg:.0f} G={g_avg:.0f} B={b_avg:.0f} | kolo: {wheel_desc}")
        return bg_desc, wheel_desc

    except Exception as e:
        print(f"[!] Nelze analyzovat snip: {e} — defaultní barvy")
        return DEFAULT_COLOR_DESC, DEFAULT_WHEEL_COLOR

# ─── Znamení ──────────────────────────────────────────────────────────────────

def get_signs_for_date(date_str: str, force_random: bool = False) -> list:
    if not force_random and USED_SIGNS_FILE.exists():
        used = json.loads(USED_SIGNS_FILE.read_text(encoding="utf-8"))
        signs = used.get(date_str, [])
        if len(signs) >= 3:
            # Náhodně zvol 3 z dostupných (ne vždy první tři)
            chosen = random.sample(signs[:12], min(3, len(signs)))
            print(f"[*] Znamení z daily_reel (náhodný výběr): {', '.join(chosen)}")
            return chosen
    # Vždy skutečně náhodné — každé spuštění jiná trojice
    chosen = random.sample(ALL_SIGNS, 3)
    print(f"[*] Znamení náhodně: {', '.join(chosen)}")
    return chosen

def get_dominant_energy(signs: list) -> str:
    """Vrátí dominantní energii (fire/earth/air/water) pro sadu znamení."""
    counts = {}
    for s in signs:
        e = SIGN_ENERGY.get(s, 'water')
        counts[e] = counts.get(e, 0) + 1
    return max(counts, key=counts.get)

# ─── Datum ────────────────────────────────────────────────────────────────────

def format_date_cs(date_str: str) -> str:
    months = ["ledna", "února", "března", "dubna", "května", "června",
              "července", "srpna", "září", "října", "listopadu", "prosince"]
    d = date.fromisoformat(date_str)
    return f"{d.day}. {months[d.month - 1]}"

# ─── Prompt builder ───────────────────────────────────────────────────────────

def build_prompt(date_str: str, bg_color: str, wheel_color: str,
                 plaque_sub: str, scroll: tuple, signs: list) -> str:
    date_cs   = format_date_cs(date_str)
    line1, line2 = scroll
    signs_en  = ", ".join(SIGN_EN[s] for s in signs)

    return f"""A mystical video thumbnail. The cosmic nebula background: {bg_color} — dramatic, atmospheric, do not simplify.

The zodiac wheel: ancient dark obsidian material, weathered and worn, {wheel_color}. Golden filigree engraving outlines exactly 12 segments. The wheel has ONE single ring of 12 segments only — no inner ring, no duplicate symbols. Each sign appears exactly once in its correct astrological position, clockwise from the top: Aries (12 o'clock), Taurus (1 o'clock), Gemini (2 o'clock), Cancer (3 o'clock), Leo (4 o'clock), Virgo (5 o'clock), Libra (6 o'clock), Scorpio (7 o'clock), Sagittarius (8 o'clock), Capricorn (9 o'clock), Aquarius (10 o'clock), Pisces (11 o'clock). Each segment contains ONLY the correct astrological glyph symbol for that sign in soft glowing gold — elegant, not harsh. NO animal illustrations, NO pictograms, NO drawings of lions, crabs, bulls or any creatures — ONLY the standard astrological text symbols (♈♉♊♋♌♍♎♏♐♑♒♓). The wheel feels ancient, sacred, mysterious — NOT mechanical or technical.

Exactly three segments glow with a soft ethereal violet-gold light from within — the segments for {signs_en}. These three shine with subtle magical violet-gold light, like moonlight through stained glass, NOT like LED spotlights. The other nine segments remain dark obsidian with faint gold outlines. The contrast is clear but gentle.

The center of the wheel features a large ornate five-pointed star — 3D CGI rendered, solid gold and champagne metallic material, beveled edges with deep relief, smooth reflective golden surface with subtle engraved filigree detail. It glows with warm radiant golden light, casting soft amber light onto the surrounding segments. It sits proudly in the center like an ancient celestial seal — timeless, elegant, powerful.

The wheel occupies the upper 55% of the image and floats slightly, with a soft cosmic aura around its edges blending into the nebula behind it.

Below the wheel, an ornate golden dark metal plaque bearing two lines of inscribed text: '{date_cs}' in stylized elegant gold text, and below it '{plaque_sub}' in bold engraved gold lettering.

Below the plaque, a large ancient parchment scroll — medium warm tone, aged honey and antique tan color, darker than cream but lighter than brown, harmoniously blending with the overall dark cosmic mood — displays two lines of bright glowing gold calligraphic text: '{line1}' on the first line, and '{line2}' on the second line — vivid, luminous gold, clearly legible even on small mobile screens.

absolutely NO star icons. NO logos. NO bottom border. NO corner decorations. The very bottom right corner must be completely empty and dark, no elements whatsoever.

Portrait 9:16."""

# ─── Checklist ────────────────────────────────────────────────────────────────

def print_checklist(signs: list, plaque_sub: str, scroll: tuple):
    print("\n📋 CHECKLIST — zkontroluj po vygenerování:")
    print(f"  [ ] Hvězdička / logo vpravo dole — nesmí být")
    print(f"  [ ] Spodní border — nesmí být")
    print(f"  [ ] Svítí právě 3 segmenty: {', '.join(SIGN_EN[s] for s in signs)}")
    print(f"  [ ] Plaketa čitelná: {plaque_sub}")
    print(f"  [ ] Svitek čitelný: {scroll[0]} / {scroll[1]}")
    print(f"  [ ] Kolo má JEDEN kruh, žádné duplikáty")
    print(f"  [ ] Portál uprostřed kola viditelný")
    print(f"  [ ] Nic useknuté dole (9:16 formát)\n")

# ─── Generování pro jeden den ─────────────────────────────────────────────────

def generate_one(date_str: str, bg_color: str, wheel_color: str,
                 history: dict, preview: bool = False) -> str:
    signs   = get_signs_for_date(date_str)
    energy  = get_dominant_energy(signs)

    # Plaketa — astrosezona + extra pool, vyhni se opakování
    seasonal = get_seasonal_plaque(date_str)
    plaque_pool = [seasonal] + EXTRA_PLAQUES
    plaque_sub  = pick_fresh(plaque_pool, history.get("plaques", []), "plaque")

    # Svitek — podle energie znamení, vyhni se opakování
    scroll_pool = SCROLL_BY_ENERGY.get(energy, []) + SCROLL_FALLBACK
    scroll      = pick_fresh(scroll_pool, history.get("scrolls", []), "scroll")

    print(f"[*] Energie dne: {energy} → svitek přizpůsoben")
    print(f"[*] Plaketa: {plaque_sub}")
    print(f"[*] Svitek: {scroll[0]} / {scroll[1]}")

    # Ulož do historie
    history.setdefault("plaques", []).append(str(plaque_sub))
    history.setdefault("scrolls", []).append(str(scroll))

    if preview:
        return ""

    prompt = build_prompt(date_str, bg_color, wheel_color, plaque_sub, scroll, signs)
    print_checklist(signs, plaque_sub, scroll)
    return prompt

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Thumbnail prompt generator pro Mystickou Hvězdu")
    parser.add_argument("--date",      required=True, help="Datum (YYYY-MM-DD)")
    parser.add_argument("--snip",      default=None,  help="Cesta ke snipu videa")
    parser.add_argument("--color-desc",default=None,  help="Manuální popis barev pozadí")
    parser.add_argument("--preview",   action="store_true", help="Jen náhled bez promptu")
    parser.add_argument("--days",      type=int, default=1, help="Batch: počet dní od --date")
    args = parser.parse_args()

    sep = "=" * 60

    # Barvy — jednou pro celý batch
    if args.color_desc:
        bg_color = args.color_desc
        desc_lower = args.color_desc.lower()
        # Skóre pro každou paletu — vítěz rozhoduje
        warm_score = sum(desc_lower.count(w) for w in ["amber", "orange", "scarlet", "golden", "warm", "sienna", "rust"])
        cool_score = sum(desc_lower.count(w) for w in ["blue", "cobalt", "electric", "glacial", "silver", "ice", "cyan", "teal"])
        purple_score = sum(desc_lower.count(w) for w in ["indigo", "violet", "purple"])
        if cool_score >= warm_score and cool_score >= purple_score:
            wheel_color = "deep navy and glacial blue tones with icy silver-gold filigree"
        elif purple_score > warm_score:
            wheel_color = "deep indigo and cosmic violet tones with silver-gold filigree"
        elif warm_score > 0:
            wheel_color = "warm deep amber and burnt sienna tones with golden filigree"
        else:
            wheel_color = DEFAULT_WHEEL_COLOR
        print(f"[*] Manuální barvy: {bg_color}")
        print(f"[*] Barvy kola: {wheel_color}")
    elif args.snip:
        snip_path = Path(args.snip)
        if not snip_path.exists():
            print(f"[!] Snip nenalezen — defaultní barvy")
            bg_color, wheel_color = DEFAULT_COLOR_DESC, DEFAULT_WHEEL_COLOR
        else:
            bg_color, wheel_color = analyze_colors(str(snip_path))
    else:
        print("[*] Žádný snip — defaultní barvy")
        bg_color, wheel_color = DEFAULT_COLOR_DESC, DEFAULT_WHEEL_COLOR

    history = load_history()
    start   = date.fromisoformat(args.date)

    for i in range(args.days):
        current = str(start + timedelta(days=i))
        print(f"\n=== Thumbnail Generator | datum: {current} ===\n")

        prompt = generate_one(current, bg_color, wheel_color, history, args.preview)

        if args.preview:
            print(f"[preview] {current} — hotovo")
            continue

        print(f"\n{sep}\nNANO BANANA PROMPT\n{sep}")
        print(prompt)
        print(sep)

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        out_path = OUTPUT_DIR / f"thumbnail_{current}.txt"
        out_path.write_text(prompt, encoding="utf-8")
        print(f"[OK] Uloženo: {out_path}")

    save_history(history)


if __name__ == "__main__":
    main()
