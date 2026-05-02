"""
Generate Pinterest campaigns for all tarot card meaning detail pages.

The base tool campaigns stay manually curated. Card-detail campaigns are derived
from data/tarot-cards.json so the Pinterest system scales with the tarot catalog.
"""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).parent
REPO_DIR = BASE_DIR.parent
CAMPAIGNS_PATH = BASE_DIR / "pinterest_tool_campaigns.json"
CARDS_PATH = REPO_DIR / "data" / "tarot-cards.json"

BOARD_TAROT = "Výklady karet, arcana a tarotová rozložení"

MAJOR_ARCANA = {
    "Blázen",
    "Mág",
    "Velekněžka",
    "Císařovna",
    "Císař",
    "Velekněz",
    "Milenci",
    "Vůz",
    "Síla",
    "Poustevník",
    "Kolo štěstí",
    "Spravedlnost",
    "Viselec",
    "Smrt",
    "Mírnost",
    "Ďábel",
    "Věž",
    "Hvězda",
    "Luna",
    "Slunce",
    "Soud",
    "Svět",
}


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    ascii_value = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    slug = []
    previous_dash = False
    for char in ascii_value.lower():
        if char.isalnum():
            slug.append(char)
            previous_dash = False
        elif not previous_dash:
            slug.append("-")
            previous_dash = True
    return "".join(slug).strip("-")


def card_group(name: str) -> str:
    if name in MAJOR_ARCANA:
        return "velká arkána"
    if "holí" in name:
        return "hůlky"
    if "pohárů" in name:
        return "poháry"
    if "mečů" in name:
        return "meče"
    if "pentáklů" in name:
        return "pentákly"
    return "tarot"


def compact(value: str, max_length: int = 500) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= max_length:
        return text
    return f"{text[:max_length - 1].rstrip()}…"


def build_card_campaign(name: str, card: dict) -> dict:
    slug = slugify(name)
    name_upper = name.upper()
    group = card_group(name)
    meaning = str(card.get("meaning") or "osobní vhled").strip()
    meaning_lower = meaning[:1].lower() + meaning[1:] if meaning else "osobní vhled"

    return {
        "slug": f"tool-tarot-vyznam-{slug}",
        "category": "Tarot",
        "path": f"/tarot-vyznam/{slug}.html",
        "utm_campaign": f"tarot_card_{slug.replace('-', '_')}",
        "board": BOARD_TAROT,
        "description": compact(
            f"Význam tarotové karty {name}: {meaning_lower}. "
            "Krátký výklad pro lásku, práci i dnešní krok, s přímým pokračováním do online tarotu."
        ),
        "keywords": (
            f"{name} tarot význam, karta {name}, tarot {meaning_lower}, "
            f"{group}, výklad tarotu online"
        ),
        "hooks": [
            f"{name_upper}: co ti tahle tarotová karta opravdu říká?",
            f"KARTA {name_upper}: význam pro lásku, práci i dnešní krok",
            f"VYTÁHL SIS {name_upper}?: pochop symbol a pokračuj do výkladu",
        ],
        "image_prompt": (
            f"Premium mystical 3D tarot symbolism scene inspired by the tarot card {name}, "
            f"visual metaphor for {meaning_lower}, ornate gold arcana details, deep navy cosmic background, "
            "elegant centered object in the top area, clean dark bottom negative space, no readable text."
        ),
    }


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def build_campaigns() -> list[dict]:
    existing = load_json(CAMPAIGNS_PATH) if CAMPAIGNS_PATH.exists() else []
    base_campaigns = [
        campaign
        for campaign in existing
        if not str(campaign.get("path", "")).startswith("/tarot-vyznam/")
    ]
    cards = load_json(CARDS_PATH)
    card_campaigns = [
        build_card_campaign(name, card)
        for name, card in cards.items()
    ]
    return base_campaigns + card_campaigns


def write_campaigns(campaigns: list[dict]) -> None:
    CAMPAIGNS_PATH.write_text(
        json.dumps(campaigns, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Pinterest campaigns for all tarot card detail pages.")
    parser.add_argument("--check", action="store_true", help="Fail if pinterest_tool_campaigns.json is not up to date.")
    args = parser.parse_args()

    campaigns = build_campaigns()
    next_content = json.dumps(campaigns, ensure_ascii=False, indent=2) + "\n"
    current_content = CAMPAIGNS_PATH.read_text(encoding="utf-8") if CAMPAIGNS_PATH.exists() else ""

    if args.check:
        if current_content != next_content:
            print(f"Out of date: {CAMPAIGNS_PATH}")
            raise SystemExit(1)
        print(f"OK: {CAMPAIGNS_PATH} has {len(campaigns)} campaigns.")
        return

    write_campaigns(campaigns)
    detail_count = sum(1 for campaign in campaigns if str(campaign.get("path", "")).startswith("/tarot-vyznam/"))
    print(f"Generated {len(campaigns)} Pinterest campaigns ({detail_count} tarot card detail campaigns).")


if __name__ == "__main__":
    main()
