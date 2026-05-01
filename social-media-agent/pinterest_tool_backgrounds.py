"""
Generate fallback Pinterest backgrounds for conversion-focused tool campaigns.

The compositor remains the only source of readable text. This script creates
clean 2:3 mystical backgrounds in output/pinterest/inbox/<slug>.png so each
tool campaign can immediately produce several pin variants.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).parent
CAMPAIGNS_PATH = BASE_DIR / "pinterest_tool_campaigns.json"
OUT_DIR = BASE_DIR / "output" / "pinterest" / "inbox"

W, H = 1000, 1500
NAVY = (5, 5, 16)
GOLD = (215, 176, 70)
GOLD_SOFT = (246, 215, 126)
SILVER = (210, 225, 245)
VIOLET = (95, 60, 170)
ROSE = (235, 145, 190)


def load_campaigns() -> list[dict]:
    return json.loads(CAMPAIGNS_PATH.read_text(encoding="utf-8"))


def glow_layer(base: Image.Image, draw_fn, blur: int = 22, opacity: int = 150) -> None:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw_fn(draw, opacity)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)


def draw_background(seed: int) -> Image.Image:
    rng = random.Random(seed)
    img = Image.new("RGBA", (W, H), NAVY + (255,))
    draw = ImageDraw.Draw(img)

    for y in range(H):
        t = y / H
        r = int(5 + 18 * (1 - t))
        g = int(5 + 8 * (1 - t))
        b = int(16 + 44 * (1 - t))
        draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

    for _ in range(520):
        x = rng.randint(18, W - 18)
        y = rng.randint(20, int(H * 0.72))
        radius = rng.choice([1, 1, 1, 2, 2, 3])
        brightness = rng.randint(125, 255)
        color = (brightness, brightness, min(255, brightness + 25), rng.randint(120, 230))
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color)

    for _ in range(65):
        x = rng.randint(0, W)
        y = rng.randint(60, int(H * 0.56))
        alpha = rng.randint(18, 45)
        draw.ellipse([x - 120, y - 48, x + 120, y + 48], fill=(80, 50, 155, alpha))

    return img


def add_sacred_circle(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int) -> None:
    for offset, alpha in [(0, 150), (42, 70), (-42, 70)]:
        draw.ellipse(
            [cx - radius + offset, cy - radius, cx + radius + offset, cy + radius],
            outline=GOLD + (alpha,),
            width=3,
        )
    for angle in range(0, 360, 30):
        x1 = cx + math.cos(math.radians(angle)) * (radius - 15)
        y1 = cy + math.sin(math.radians(angle)) * (radius - 15)
        x2 = cx + math.cos(math.radians(angle)) * (radius + 20)
        y2 = cy + math.sin(math.radians(angle)) * (radius + 20)
        draw.line([(x1, y1), (x2, y2)], fill=GOLD + (90,), width=2)


def draw_tarot_card(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float = 1.0) -> None:
    w, h = int(210 * scale), int(330 * scale)
    x0, y0 = cx - w // 2, cy - h // 2
    draw.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=24, fill=(11, 12, 34, 240), outline=GOLD + (230,), width=5)
    draw.rounded_rectangle([x0 + 18, y0 + 18, x0 + w - 18, y0 + h - 18], radius=18, outline=GOLD + (140,), width=3)
    add_sacred_circle(draw, cx, cy, int(70 * scale))
    draw.polygon([(cx, y0 + 62), (cx + 18, cy), (cx, y0 + h - 62), (cx - 18, cy)], fill=GOLD_SOFT + (230,))


def draw_crystal_ball(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int) -> None:
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=(30, 45, 90, 130), outline=SILVER + (220,), width=5)
    draw.ellipse([cx - radius + 35, cy - radius + 30, cx - 10, cy - 5], fill=(255, 255, 255, 55))
    draw.arc([cx - radius // 2, cy - radius // 3, cx + radius // 2, cy + radius // 2], 15, 330, fill=GOLD + (170,), width=5)
    draw.rounded_rectangle([cx - 120, cy + radius - 8, cx + 120, cy + radius + 42], radius=22, fill=(18, 10, 38, 245), outline=GOLD + (160,), width=3)


def draw_heart(draw: ImageDraw.ImageDraw, cx: int, cy: int, size: int, color: tuple[int, int, int]) -> None:
    pts = []
    for i in range(220):
        t = math.pi * 2 * i / 220
        x = 16 * math.sin(t) ** 3
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((cx + x * size / 18, cy + y * size / 18))
    draw.polygon(pts, fill=color + (115,), outline=GOLD + (180,))


def draw_moon_dial(draw: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    draw.ellipse([cx - 225, cy - 225, cx + 225, cy + 225], outline=GOLD + (180,), width=5)
    for idx, angle in enumerate(range(0, 360, 45)):
        x = cx + math.cos(math.radians(angle)) * 165
        y = cy + math.sin(math.radians(angle)) * 165
        r = 28
        fill = SILVER + (210 if idx in {0, 4} else 130,)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=fill, outline=GOLD + (130,), width=2)
    add_sacred_circle(draw, cx, cy, 90)


def draw_symbol_for_slug(draw: ImageDraw.ImageDraw, slug: str) -> None:
    cx, cy = W // 2, 420
    add_sacred_circle(draw, cx, cy, 245)

    if "ano-ne" in slug:
        draw_tarot_card(draw, cx, cy + 20, 0.95)
        draw.line([(cx, cy - 230), (cx, cy - 40)], fill=GOLD_SOFT + (220,), width=4)
        draw.ellipse([cx - 28, cy - 42, cx + 28, cy + 14], fill=SILVER + (190,), outline=GOLD + (220,), width=3)
        draw.arc([cx - 250, cy - 85, cx + 10, cy + 260], 105, 245, fill=GOLD + (140,), width=5)
        draw.arc([cx - 10, cy - 85, cx + 250, cy + 260], -65, 75, fill=SILVER + (140,), width=5)
    elif "karta-dne" in slug:
        draw_tarot_card(draw, cx, cy, 1.08)
        draw.ellipse([cx - 165, cy - 165, cx + 165, cy + 165], outline=GOLD_SOFT + (130,), width=10)
    elif "tarot-laska" in slug or "partnerska" in slug:
        draw_heart(draw, cx - 60, cy, 110, ROSE)
        draw_heart(draw, cx + 70, cy + 8, 110, (155, 190, 255))
        if "partnerska" in slug:
            draw.ellipse([cx - 185, cy - 185, cx - 15, cy - 15], outline=GOLD + (180,), width=4)
            draw.ellipse([cx + 15, cy - 165, cx + 185, cy + 5], outline=SILVER + (160,), width=4)
    elif "numerologie" in slug:
        for idx, angle in enumerate(range(0, 360, 45)):
            r = 145 + (idx % 2) * 45
            x = cx + math.cos(math.radians(angle)) * r
            y = cy + math.sin(math.radians(angle)) * r
            draw.ellipse([x - 34, y - 34, x + 34, y + 34], fill=(20, 16, 55, 210), outline=GOLD + (180,), width=3)
        draw_crystal_ball(draw, cx, cy, 98)
    elif "lunace" in slug:
        draw_moon_dial(draw, cx, cy)
    elif "andelske" in slug:
        draw.ellipse([cx - 95, cy - 80, cx + 95, cy + 80], fill=(255, 255, 255, 35), outline=SILVER + (170,), width=3)
        for side in (-1, 1):
            pts = [(cx, cy), (cx + side * 245, cy - 130), (cx + side * 170, cy + 95)]
            draw.polygon(pts, fill=(235, 240, 255, 80), outline=GOLD + (110,))
        draw.ellipse([cx - 78, cy - 78, cx + 78, cy + 78], outline=GOLD_SOFT + (190,), width=5)
    elif "natalni" in slug:
        draw.ellipse([cx - 210, cy - 210, cx + 210, cy + 210], outline=GOLD + (210,), width=6)
        for angle in range(0, 360, 30):
            x = cx + math.cos(math.radians(angle)) * 210
            y = cy + math.sin(math.radians(angle)) * 210
            draw.line([(cx, cy), (x, y)], fill=GOLD + (70,), width=2)
        for angle in range(15, 360, 60):
            x = cx + math.cos(math.radians(angle)) * 140
            y = cy + math.sin(math.radians(angle)) * 140
            draw.ellipse([x - 18, y - 18, x + 18, y + 18], fill=SILVER + (180,), outline=GOLD + (150,), width=2)
    elif "kristalova" in slug:
        draw_crystal_ball(draw, cx, cy, 155)
    elif "runy" in slug:
        for i, dx in enumerate([-145, 0, 145]):
            x = cx + dx
            y = cy + (40 if i == 1 else 0)
            draw.rounded_rectangle([x - 68, y - 88, x + 68, y + 88], radius=30, fill=(18, 20, 34, 235), outline=GOLD + (190,), width=4)
            draw.line([(x, y - 48), (x, y + 48)], fill=GOLD_SOFT + (210,), width=7)
            draw.line([(x, y - 22), (x + 32, y - 50)], fill=GOLD_SOFT + (210,), width=6)
            draw.line([(x, y + 5), (x + 34, y + 40)], fill=GOLD_SOFT + (210,), width=6)
    else:
        draw_crystal_ball(draw, cx, cy, 135)


def generate(campaign: dict, force: bool = False) -> Path | None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{campaign['slug']}.png"
    if out_path.exists() and not force:
        return None

    seed = sum(ord(char) for char in campaign["slug"])
    img = draw_background(seed)

    def halo(draw: ImageDraw.ImageDraw, opacity: int) -> None:
        draw.ellipse([210, 120, 790, 700], fill=(95, 60, 170, opacity))
        draw.ellipse([290, 170, 710, 610], fill=(215, 176, 70, opacity // 3))

    glow_layer(img, halo, blur=55, opacity=95)
    draw = ImageDraw.Draw(img)
    draw_symbol_for_slug(draw, campaign["slug"])
    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120, threshold=3))
    img.convert("RGB").save(out_path, "PNG")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate fallback Pinterest tool backgrounds.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing inbox backgrounds.")
    args = parser.parse_args()

    created = 0
    skipped = 0
    for campaign in load_campaigns():
        out = generate(campaign, force=args.force)
        if out:
            created += 1
            print(f"OK: {out.name}")
        else:
            skipped += 1
            print(f"SKIP: {campaign['slug']}.png exists")

    print(f"Created: {created}, skipped: {skipped}, inbox: {OUT_DIR}")


if __name__ == "__main__":
    main()
