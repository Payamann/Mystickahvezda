import json
from pathlib import Path

import generate_tarot_pinterest_campaigns as campaigns


REPO_DIR = Path(__file__).resolve().parents[2]


def test_tarot_pinterest_campaigns_cover_all_card_details():
    cards = json.loads((REPO_DIR / "data" / "tarot-cards.json").read_text(encoding="utf-8"))
    generated = campaigns.build_campaigns()
    details = [
        campaign
        for campaign in generated
        if campaign.get("path", "").startswith("/tarot-vyznam/")
    ]
    detail_by_path = {campaign["path"]: campaign for campaign in details}

    assert len(details) == len(cards) == 78

    for name in cards:
        slug = campaigns.slugify(name)
        path = f"/tarot-vyznam/{slug}.html"
        campaign = detail_by_path[path]

        assert campaign["slug"] == f"tool-tarot-vyznam-{slug}"
        assert campaign["utm_campaign"] == f"tarot_card_{slug.replace('-', '_')}"
        assert len(campaign["hooks"]) == 3
        assert name in campaign["description"]
        assert (REPO_DIR / path.lstrip("/")).exists()
