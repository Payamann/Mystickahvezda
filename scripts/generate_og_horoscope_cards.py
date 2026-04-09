"""
generate_og_horoscope_cards.py
Vygeneruje 12 OG karet pro horoskopy (1200×630px) — jedna per znamení.
Výstup: img/og/horoskop-{slug}.jpg
"""

import os
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE_DIR = Path(__file__).parent.parent
OUT_DIR  = BASE_DIR / "img" / "og"
FONTS    = BASE_DIR / "fonts"
OUT_DIR.mkdir(parents=True, exist_ok=True)

W, H = 1200, 630

CINZEL_BOLD   = FONTS / "8vIU7ww63mVu7gtR-kwKxNvkNOjw-jHgTYo.ttf"
CINZEL_SEMI   = FONTS / "8vIU7ww63mVu7gtR-kwKxNvkNOjw-gjgTYo.ttf"
INTER_BOLD    = FONTS / "inter-bold.ttf"
INTER_SEMI    = FONTS / "inter-semibold.ttf"
INTER_REG     = FONTS / "inter-regular.ttf"

SIGNS = [
    ("beran",    "Beran",     "♈", (180, 50,  50)),
    ("byk",      "Býk",       "♉", (80,  140, 60)),
    ("blizenci", "Blíženci",  "♊", (60,  160, 180)),
    ("rak",      "Rak",       "♋", (80,  110, 180)),
    ("lev",      "Lev",       "♌", (210, 130, 30)),
    ("panna",    "Panna",     "♍", (140, 180, 100)),
    ("vahy",     "Váhy",      "♎", (180, 100, 180)),
    ("stir",     "Štír",      "♏", (160, 40,  40)),
    ("strelec",  "Střelec",   "♐", (200, 100, 40)),
    ("kozoroh",  "Kozoroh",   "♑", (80,  100, 130)),
    ("vodnar",   "Vodnář",    "♒", (60,  130, 200)),
    ("ryby",     "Ryby",      "♓", (120, 80,  180)),
]

GOLD  = (235, 192, 102)
WHITE = (255, 255, 255)
BG    = (5,   5,   16)

def draw_bg(draw, img):
    """Tmavé kosmické pozadí s gradientem."""
    for y in range(H):
        t = y / H
        r = int(BG[0] + (11 - BG[0]) * t)
        g = int(BG[1] + (4  - BG[1]) * t)
        b = int(BG[2] + (24 - BG[2]) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

def draw_nebula(img, sign_color, seed=42):
    """Jemná mlhovina v barvě znamení."""
    rng = random.Random(seed)
    nebula = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    nd = ImageDraw.Draw(nebula)

    for _ in range(6):
        cx = rng.randint(W // 4, 3 * W // 4)
        cy = rng.randint(H // 4, 3 * H // 4)
        rx = rng.randint(180, 380)
        ry = rng.randint(120, 260)
        alpha = rng.randint(18, 38)
        r, g, b = sign_color
        nd.ellipse([(cx - rx, cy - ry), (cx + rx, cy + ry)],
                   fill=(r, g, b, alpha))

    nebula = nebula.filter(ImageFilter.GaussianBlur(radius=60))
    img.paste(Image.alpha_composite(img.convert("RGBA"), nebula).convert("RGB"),
              (0, 0))

def draw_stars(draw, seed=42):
    """Hvězdičky náhodně rozmístěné."""
    rng = random.Random(seed)
    for _ in range(160):
        x = rng.randint(0, W)
        y = rng.randint(0, H)
        r = rng.uniform(0.4, 1.8)
        alpha = rng.randint(80, 220)
        size = int(r * 2)
        draw.ellipse([(x - size, y - size), (x + size, y + size)],
                     fill=(255, 255, 255, alpha))

def draw_gold_circle(draw, cx, cy, radius):
    """Zlatý kruh za symbolem znamení."""
    # Jemný glow — víc vrstev průhledných kruhů
    for i in range(12, 0, -1):
        alpha = int(8 * (i / 12))
        r_off = radius - i * 3
        if r_off > 0:
            draw.ellipse(
                [(cx - r_off, cy - r_off), (cx + r_off, cy + r_off)],
                fill=(235, 192, 102, alpha)
            )
    # Tenký zlatý okraj
    draw.ellipse(
        [(cx - radius, cy - radius), (cx + radius, cy + radius)],
        outline=(235, 192, 102, 60), width=1
    )

def centered_text(draw, text, font, y, color, max_w=None):
    """Vycentrovaný text."""
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    x = (W - tw) // 2
    draw.text((x, y), text, font=font, fill=color)

def generate_card(slug, sign_name, symbol, sign_color):
    img  = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img, "RGBA")

    # Pozadí
    draw_bg(draw, img)

    # Mlhovina
    draw_nebula(img, sign_color, seed=hash(slug) % 1000)
    draw = ImageDraw.Draw(img, "RGBA")  # Refresh draw after nebula

    # Hvězdy
    draw_stars(draw, seed=hash(slug) % 500)

    # --- Zleva: velký symbol ---
    symbol_cx = W // 3
    symbol_cy = H // 2 - 20

    draw_gold_circle(draw, symbol_cx, symbol_cy, 160)

    # Segoe UI Symbol má zodiac glyphs (Inter nemá)
    try:
        sym_font = ImageFont.truetype('C:/Windows/Fonts/seguisym.ttf', 160)
    except:
        sym_font = ImageFont.truetype(str(INTER_BOLD), 160)

    # Symbol — vycentrovat na kruh
    sb = sym_font.getbbox(symbol)
    sw, sh = sb[2] - sb[0], sb[3] - sb[1]
    draw.text(
        (symbol_cx - sw // 2 - sb[0], symbol_cy - sh // 2 - sb[1] + 10),
        symbol, font=sym_font, fill=(*GOLD, 230)
    )

    # --- Zprava: text blok ---
    tx = W // 2 + 60
    ty_start = H // 2 - 140

    # Badge "DENNÍ HOROSKOP"
    try:
        badge_font = ImageFont.truetype(str(INTER_SEMI), 18)
    except:
        badge_font = ImageFont.load_default()

    badge = "DENNÍ HOROSKOP"
    draw.text((tx, ty_start), badge, font=badge_font,
              fill=(*GOLD, 180))

    # Jemná linka
    badge_bb = badge_font.getbbox(badge)
    line_y = ty_start + badge_bb[3] + 8
    draw.line([(tx, line_y), (tx + 320, line_y)],
              fill=(*GOLD, 60), width=1)

    # Název znamení — Cinzel Bold
    try:
        name_font = ImageFont.truetype(str(CINZEL_BOLD), 88)
    except:
        name_font = ImageFont.load_default()

    draw.text((tx, line_y + 16), sign_name, font=name_font, fill=GOLD)

    # Podtitulek
    try:
        sub_font = ImageFont.truetype(str(INTER_REG), 22)
    except:
        sub_font = ImageFont.load_default()

    name_bb = name_font.getbbox(sign_name)
    sub_y = line_y + 16 + name_bb[3] + 12
    draw.text((tx, sub_y), "Co ti hvězdy přináší dnes?",
              font=sub_font, fill=(255, 255, 255, 150))

    # Branding — vpravo dole
    try:
        brand_font = ImageFont.truetype(str(CINZEL_SEMI), 20)
    except:
        brand_font = ImageFont.load_default()

    brand = "mystickahvezda.cz"
    bb = brand_font.getbbox(brand)
    bw = bb[2] - bb[0]
    draw.text((W - bw - 40, H - 44), brand,
              font=brand_font, fill=(*GOLD, 180))

    # Zlatá linka dole
    draw.line([(40, H - 52), (W - 40, H - 52)],
              fill=(*GOLD, 40), width=1)

    # Uložit
    out_path = OUT_DIR / f"horoskop-{slug}.jpg"
    img.save(out_path, "JPEG", quality=92, optimize=True)
    print(f"  ✅ {out_path.name}")

print("🌟 Generuji OG karty pro 12 znamení...")
for slug, name, sym, color in SIGNS:
    generate_card(slug, name, sym, color)

print(f"\n✅ Hotovo! Karty uloženy v img/og/")
