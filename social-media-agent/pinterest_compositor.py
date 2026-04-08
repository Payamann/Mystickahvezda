"""
Pinterest Pin Compositor v2
============================
Layout:
  [✦ brand icon — vpravo nahoře]
  [AI background — koule nahoře]
  [gradient fade od 40%]
  [hvězdičky v tmavé zóně — subtle]
  ─────────────────────────────
  HOOK       (Cinzel, 96px, gold)
  Subtitle   (Cinzel, 42px, white, title_case_cz)
  Detail     (Cinzel, 30px, white_dim, title_case_cz)
  ── zlatá čára ──
  [ ZJISTI VÍCE ] (Inter Bold, gold pill, dark purple text + glow)
  mystickahvezda.cz (Inter, 42px, white, letter-spaced)
  [safe zone 180px]
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random as _rnd

PIN_W, PIN_H = 1000, 1500

COLOR_BG        = (5, 5, 16)
COLOR_WHITE     = (255, 255, 255)
COLOR_WHITE_DIM = (200, 195, 210)   # krémově bílá — ne zlatá
COLOR_GOLD      = (201, 162, 39)
COLOR_GOLD_LIGHT= (230, 195, 80)
COLOR_CTA_BG    = (201, 162, 39)
COLOR_CTA_TEXT  = (35, 8, 75)       # tmavě fialová

FONTS_DIR = Path(__file__).parent.parent / "fonts"
LOGO_PATH = Path(__file__).parent.parent / "img" / "logo-3d.webp"
# Cinzel — oddělené weights (stejné jako na webu)
# tbnTYo = 400 regular | gjgTYo = 600 semibold | jHgTYo = 700 bold
CINZEL_BOLD  = [FONTS_DIR / "8vIU7ww63mVu7gtR-kwKxNvkNOjw-jHgTYo.ttf"]   # 700
CINZEL_SEMI  = [FONTS_DIR / "8vIU7ww63mVu7gtR-kwKxNvkNOjw-gjgTYo.ttf"]   # 600
CINZEL_FILES = CINZEL_BOLD + CINZEL_SEMI   # fallback chain

# Inter — oddělené weights
INTER_BOLD    = [FONTS_DIR / "inter-bold.ttf"]
INTER_SEMI    = [FONTS_DIR / "inter-semibold.ttf"]
INTER_REGULAR = [FONTS_DIR / "inter-regular.ttf"]
INTER_FILES   = INTER_BOLD + INTER_SEMI + INTER_REGULAR   # fallback chain

# České předložky/spojky které zůstanou malé v title case
CZ_LOWERCASE = {"v", "ve", "na", "do", "ze", "z", "po", "při", "za",
                "nad", "pod", "před", "přes", "pro", "i", "a", "o",
                "u", "k", "ke", "s", "se", "od", "až"}


def _load_logo(height: int) -> Image.Image | None:
    """Načte logo (WebP s vlastní průhledností), škáluje na požadovanou výšku."""
    if not LOGO_PATH.exists():
        return None
    try:
        logo = Image.open(str(LOGO_PATH)).convert("RGBA")
        ratio = height / logo.height
        logo = logo.resize((int(logo.width * ratio), height), Image.LANCZOS)
        return logo
    except Exception:
        return None


def _load_font(files, size):
    for path in files:
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size)
            except Exception:
                continue
    return ImageFont.load_default()


def _text_width(text, font):
    dummy = Image.new("RGB", (1, 1))
    d = ImageDraw.Draw(dummy)
    b = d.textbbox((0, 0), text, font=font)
    return b[2] - b[0]


def _wrap(text, font, max_w):
    words, lines, current = text.split(), [], ""
    for word in words:
        test = (current + " " + word).strip()
        if _text_width(test, font) <= max_w:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _title_case_cz(text):
    """Title case s respektováním českých předložek/spojek."""
    words = text.split()
    result = []
    for i, w in enumerate(words):
        if i == 0:
            result.append(w.capitalize())
        elif w.lower() in CZ_LOWERCASE:
            result.append(w.lower())
        else:
            result.append(w.capitalize())
    return " ".join(result)


def _parse_title(title: str) -> tuple[str, str, str]:
    if ":" in title:
        before, after = title.split(":", 1)
        hook = before.strip().upper()
        after = after.strip()
        if "—" in after:
            sub, det = after.split("—", 1)
            subtitle, detail = sub.strip(), det.strip()
        else:
            words = after.split()
            subtitle = " ".join(words[:5])
            detail   = " ".join(words[5:])
    else:
        words = title.split()
        hook     = " ".join(words[:3]).upper()
        subtitle = " ".join(words[3:8])
        detail   = " ".join(words[8:])
    return hook, subtitle, detail


def _add_gradient(img: Image.Image, start_y: int) -> Image.Image:
    """Plynulý tmavý gradient od start_y dolů. Power 2.0 = pomalý start, plynulý přechod."""
    gradient = Image.new("RGBA", (PIN_W, PIN_H - start_y))
    draw = ImageDraw.Draw(gradient)
    height = PIN_H - start_y
    for y in range(height):
        alpha = int(255 * (y / height) ** 2.0)
        draw.line([(0, y), (PIN_W, y)], fill=(5, 5, 16, alpha))
    img_rgba = img.convert("RGBA")
    img_rgba.paste(gradient, (0, start_y), gradient)
    return img_rgba.convert("RGB")


def _add_side_vignette(img: Image.Image) -> Image.Image:
    """Subtilní tmavý vignette po stranách — text a kompozice lépe drží pohromadě."""
    vignette = Image.new("RGBA", (PIN_W, PIN_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(vignette)
    vw = 180
    for x in range(vw):
        alpha = int(100 * ((1 - x / vw) ** 2))
        draw.line([(x, 0), (x, PIN_H)], fill=(5, 5, 16, alpha))
        draw.line([(PIN_W - 1 - x, 0), (PIN_W - 1 - x, PIN_H)], fill=(5, 5, 16, alpha))
    result = Image.alpha_composite(img.convert("RGBA"), vignette)
    return result.convert("RGB")


def _add_stars(img: Image.Image, zone_start: int, count: int = 120) -> Image.Image:
    """Přidá jemné hvězdičky do tmavé textové zóny."""
    draw = ImageDraw.Draw(img)
    rng = _rnd.Random(42)
    for _ in range(count):
        sx = rng.randint(20, PIN_W - 20)
        sy = rng.randint(zone_start + 20, PIN_H - 250)
        sr = rng.randint(1, 3)
        b  = rng.randint(140, 220)
        draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(b, b, b + 15))
    return img


def _add_cta_glow(img: Image.Image, bx: int, by: int, bw: int, bh: int) -> Image.Image:
    """Přidá zlatý glow efekt kolem CTA tlačítka."""
    glow = Image.new("RGBA", (PIN_W, PIN_H), (0, 0, 0, 0))
    gd   = ImageDraw.Draw(glow)
    gd.rounded_rectangle(
        [bx - 22, by - 22, bx + bw + 22, by + bh + 22],
        radius=56, fill=(201, 162, 39, 90)
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=18))
    result = Image.alpha_composite(img.convert("RGBA"), glow)
    return result.convert("RGB")


def _draw_cta(draw, text, y, font, center_x=500):
    """Nakreslí CTA pilulku. Vrátí (x, y, btn_w, btn_h)."""
    px, py = 78, 28
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    btn_w = tw + px * 2
    btn_h = th + py * 2
    x = center_x - btn_w // 2
    draw.rounded_rectangle([x, y, x + btn_w, y + btn_h], radius=34, fill=COLOR_CTA_BG)
    draw.text((x + px, y + py), text, font=font, fill=COLOR_CTA_TEXT)
    return x, y, btn_w, btn_h


def _draw_spaced_url(draw, text, y, font, spacing=4, center_x=500):
    """Nakreslí URL s letter-spacingem, centrovanou, bílou."""
    total_w = sum(
        (draw.textbbox((0, 0), c, font=font)[2] - draw.textbbox((0, 0), c, font=font)[0]) + spacing
        for c in text
    ) - spacing
    cx = center_x - total_w // 2
    for char in text:
        draw.text((cx, y), char, font=font, fill=COLOR_WHITE)
        cw = draw.textbbox((0, 0), char, font=font)[2] - draw.textbbox((0, 0), char, font=font)[0]
        cx += cw + spacing


def composite_pin(
    bg_image_path: Path,
    title: str,
    category: str = "",
    url: str = "mystickahvezda.cz",
    output_path: Path = None,
) -> Path:

    # ── Crop + resize na 2:3 ──────────────────────────────────────────
    bg = Image.open(bg_image_path).convert("RGB")
    ow, oh = bg.size
    tr = PIN_W / PIN_H
    if ow / oh > tr:
        nw = int(oh * tr)
        bg = bg.crop(((ow - nw) // 2, 0, (ow - nw) // 2 + nw, oh))
    else:
        nh = int(ow / tr)
        bg = bg.crop((0, 0, ow, nh))
    bg = bg.resize((PIN_W, PIN_H), Image.LANCZOS)

    # ── Gradient od 20% — plynulý přechod přes celou kouli ──────────
    gradient_start = int(PIN_H * 0.20)
    bg = _add_gradient(bg, gradient_start)

    # ── Side vignette — tmavé okraje pro lepší kompozici ─────────────
    bg = _add_side_vignette(bg)

    # ── Hvězdičky v tmavé zóně ────────────────────────────────────────
    bg = _add_stars(bg, gradient_start + 80)

    draw = ImageDraw.Draw(bg)

    # ── Fonty ─────────────────────────────────────────────────────────
    f_hook     = _load_font(CINZEL_BOLD,   96)   # Cinzel 700 — hlavní hook
    f_subtitle = _load_font(INTER_SEMI,    40)   # Inter 600  — subtitle (Inter = žádný small caps efekt)
    f_detail   = _load_font(INTER_SEMI,    36)   # Inter 600  — čitelné i na mobilu
    f_cta      = _load_font(INTER_BOLD,    50)   # Inter 700  — CTA button
    f_url      = _load_font(INTER_REGULAR, 42)   # Inter 400  — URL
    f_brand    = _load_font(INTER_SEMI,    36)   # Inter 600  — brand mark

    # ── Brand mark — logo + text, vpravo nahoře ──────────────────────
    brand_label = "Mystick\u00e1Hv\u011bzda"
    bw_label = _text_width(brand_label, f_brand)
    logo_img = _load_logo(68)
    gap = 12
    if logo_img:
        total_bw = logo_img.width + gap + bw_label
        bx = PIN_W - total_bw - 40
        by = 36
        bg_rgba = bg.convert("RGBA")
        bg_rgba.paste(logo_img, (bx, by), logo_img)
        bg = bg_rgba.convert("RGB")
        draw = ImageDraw.Draw(bg)
        # Vertikálně centruj text na střed loga
        ty = by + (logo_img.height - f_brand.size) // 2
        draw.text((bx + logo_img.width + gap, ty), brand_label, font=f_brand, fill=COLOR_GOLD)
    else:
        draw.text((PIN_W - bw_label - 50, 52), brand_label, font=f_brand, fill=COLOR_GOLD)

    # ── Parsuj titulek ────────────────────────────────────────────────
    hook, subtitle, detail = _parse_title(title)

    MARGIN = 60
    MAX_W  = PIN_W - MARGIN * 2
    CX     = PIN_W // 2

    # ── Výpočet výšek ─────────────────────────────────────────────────
    hook_lines = _wrap(hook, f_hook, MAX_W)
    hook_h     = len(hook_lines) * (f_hook.size + 8)

    sub_tc    = subtitle.capitalize()
    sub_lines = _wrap(sub_tc, f_subtitle, MAX_W)
    sub_h     = len(sub_lines) * (f_subtitle.size + 10)

    det_tc    = detail.capitalize() if detail else ""
    det_lines = _wrap(det_tc, f_detail, MAX_W) if det_tc else []
    det_h     = len(det_lines) * (f_detail.size + 10) if det_lines else 0

    cta_h   = f_cta.size + 56
    url_h   = f_url.size + 14
    div_h   = 2
    sp      = 18
    bot_pad = 140   # Pinterest mobile safe zone

    total_h = hook_h + sp + sub_h
    if det_h:
        total_h += sp + det_h
    total_h += sp + div_h + sp + cta_h + sp + url_h
    y = PIN_H - bot_pad - total_h

    # ── HOOK — obří zlatý, vícevrstvý shadow ─────────────────────────
    for line in hook_lines:
        lw = _text_width(line, f_hook)
        x  = CX - lw // 2
        draw.text((x + 4, y + 4), line, font=f_hook, fill=(0, 0, 0))       # hluboký stín
        draw.text((x + 2, y + 2), line, font=f_hook, fill=(15, 5, 35))     # střední stín
        draw.text((x, y),         line, font=f_hook, fill=COLOR_GOLD_LIGHT) # finální zlatá
        y += f_hook.size + 8
    y += sp

    # ── Subtitle — bílý, silný shadow ────────────────────────────────
    for line in sub_lines:
        lw = _text_width(line, f_subtitle)
        x  = CX - lw // 2
        draw.text((x + 3, y + 3), line, font=f_subtitle, fill=(0, 0, 0))
        draw.text((x + 1, y + 1), line, font=f_subtitle, fill=(10, 5, 25))
        draw.text((x, y),         line, font=f_subtitle, fill=COLOR_WHITE)
        y += f_subtitle.size + 10

    # ── Detail — krémově bílý, větší, silný shadow ────────────────────
    if det_lines:
        y += sp
        for line in det_lines:
            lw = _text_width(line, f_detail)
            x  = CX - lw // 2
            draw.text((x + 3, y + 3), line, font=f_detail, fill=(0, 0, 0))
            draw.text((x + 1, y + 1), line, font=f_detail, fill=(10, 5, 25))
            draw.text((x, y),         line, font=f_detail, fill=COLOR_WHITE_DIM)
            y += f_detail.size + 10
    y += sp

    # ── Zlatá dělicí čára ─────────────────────────────────────────────
    draw.line([(MARGIN, y), (PIN_W - MARGIN, y)], fill=COLOR_GOLD, width=3)
    y += div_h + sp

    # ── CTA tlačítko + glow ───────────────────────────────────────────
    cta_text = "ZJISTI V\u00cdCE"
    # Předpočítej pozici pro glow (před vykreslením tlačítka)
    _px, _py_pad = 78, 28
    _bbox = draw.textbbox((0, 0), cta_text, font=f_cta)
    _tw, _th = _bbox[2] - _bbox[0], _bbox[3] - _bbox[1]
    _bw = _tw + _px * 2
    _bh = _th + _py_pad * 2
    _bx = CX - _bw // 2

    # Glow efekt (RGBA compositing)
    bg = _add_cta_glow(bg, _bx, y, _bw, _bh)
    draw = ImageDraw.Draw(bg)  # obnov draw po compositing

    # Nakresli tlačítko
    _draw_cta(draw, cta_text, y, f_cta, center_x=CX)
    y += cta_h + sp

    # ── URL — čistě bílá, letter-spaced ──────────────────────────────
    _draw_spaced_url(draw, url, y, f_url, spacing=4, center_x=CX)

    # ── Uložení ───────────────────────────────────────────────────────
    if output_path is None:
        output_path = bg_image_path.parent / (bg_image_path.stem + "_pin.jpg")
    bg.save(str(output_path), "JPEG", quality=94)
    return output_path


if __name__ == "__main__":
    print("Test compositoru v2...")
    test_bg = Image.new("RGB", (1000, 1500), COLOR_BG)
    d = ImageDraw.Draw(test_bg)
    import random; random.seed(42)
    for _ in range(400):
        x, y = random.randint(0, 1000), random.randint(0, 800)
        r = random.randint(1, 3); b = random.randint(100, 255)
        d.ellipse([x-r, y-r, x+r, y+r], fill=(b, b, b))
    for radius in [220, 160, 110, 70]:
        c = (50 + (220-radius)//2, 15, 120 + (220-radius)//2)
        d.ellipse([500-radius, 320-radius, 500+radius, 320+radius], fill=c)
    bg_path = Path("_test_bg.png")
    test_bg.save(bg_path)
    out = composite_pin(
        bg_path,
        "Chiron: Ran\u011bn\u00fd l\u00e9\u010ditel v tv\u00e9 nat\u00e1ln\u00ed kart\u011b \u2014 kde skr\u00fdv\u00e1 tv\u00e1 nejv\u011bt\u0161\u00ed r\u00e1na i dar",
        "Astrologie",
        output_path=Path("_test_pin.jpg")
    )
    bg_path.unlink()
    print(f"OK: {out}")
