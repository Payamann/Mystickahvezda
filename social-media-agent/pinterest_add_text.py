"""
Pinterest Add Text Overlay
==========================
Vezme tvůj obrázek + přidá titulek, badge a URL → finální Pinterest pin.

Použití:
    python pinterest_add_text.py --image "cesta/k/obrazku.png" --index 0
    python pinterest_add_text.py --image "cesta/k/obrazku.png" --slug "merkur-v-retrograde-..."
    python pinterest_add_text.py --image "cesta/k/obrazku.png" --title "Vlastní titulek" --category "Astrologie"

Prompty pro Gemini (pro každou kategorii) jsou vypsány na konci souboru.
"""

import argparse
import json
import os
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.append(os.path.dirname(__file__))
from pinterest_compositor import composite_pin
from pinterest_make_pin import PINTEREST_HOOKS

BLOG_INDEX = Path(__file__).parent.parent / "data" / "blog-index.json"
OUTPUT_DIR = Path(__file__).parent / "output" / "pinterest" / "images"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def main():
    parser = argparse.ArgumentParser(description="Pinterest Add Text Overlay")
    parser.add_argument("--image",    required=True, help="Cesta k tvému obrázku (PNG/JPG)")
    parser.add_argument("--index",    type=int, default=None, help="Index postu v blog-index.json")
    parser.add_argument("--slug",     type=str, default=None, help="Slug postu")
    parser.add_argument("--title",    type=str, default=None, help="Vlastní titulek (pokud nepoužíváš blog post)")
    parser.add_argument("--category", type=str, default="",   help="Kategorie (pro badge)")
    parser.add_argument("--out",      type=str, default=None, help="Výstupní soubor (default: vedle vstupního)")
    args = parser.parse_args()

    image_path = Path(args.image)
    if not image_path.exists():
        print(f"Soubor nenalezen: {image_path}")
        sys.exit(1)

    # Získej titulek a kategorii
    title    = args.title
    category = args.category

    if title is None:
        with open(BLOG_INDEX, encoding="utf-8") as f:
            posts = json.load(f)

        if args.slug:
            post = next((p for p in posts if p["slug"] == args.slug), None)
            if not post:
                print(f"Post se slugem '{args.slug}' nenalezen.")
                sys.exit(1)
        elif args.index is not None:
            post = posts[args.index]
        else:
            post = posts[0]

        slug     = post["slug"]
        title    = PINTEREST_HOOKS.get(slug, post["title"])
        category = post.get("category", "")

    # Výstupní cesta
    if args.out:
        out_path = Path(args.out)
    else:
        out_path = OUTPUT_DIR / (image_path.stem + "_pin.jpg")

    print(f"Titulek:   {title[:70]}")
    print(f"Kategorie: {category}")
    print(f"Vstup:     {image_path}")
    print(f"Vystup:    {out_path}")

    composite_pin(
        bg_image_path=image_path,
        title=title,
        category=category,
        url="mystickahvezda.cz",
        output_path=out_path,
    )

    print(f"\nHotovo! Pin ulozen: {out_path}")

    import subprocess
    subprocess.Popen(["explorer", str(out_path.parent)])


if __name__ == "__main__":
    main()
