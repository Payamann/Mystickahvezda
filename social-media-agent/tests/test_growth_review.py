import csv
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from growth_review import (
    build_growth_review,
    load_content_memory_summary,
    load_funnel_segments,
    load_pinterest_inventory,
    parse_number,
)


def write_csv(path, fieldnames, rows):
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def test_parse_number_handles_admin_export_formats():
    assert parse_number("33.3") == 33.3
    assert parse_number("33,3%") == 33.3
    assert parse_number("1,234") == 1234
    assert parse_number("") == 0


def test_load_funnel_segments_parses_rates_and_score(tmp_path):
    path = tmp_path / "funnel.csv"
    write_csv(
        path,
        [
            "source",
            "feature",
            "total_events",
            "paywall_viewed",
            "checkout_started",
            "purchase_completed",
            "failures",
            "paywall_to_checkout_rate",
            "checkout_to_purchase_rate",
        ],
        [
            {
                "source": "tarot_teaser_banner",
                "feature": "tarot_multi_card",
                "total_events": "12",
                "paywall_viewed": "10",
                "checkout_started": "3",
                "purchase_completed": "1",
                "failures": "0",
                "paywall_to_checkout_rate": "30.0",
                "checkout_to_purchase_rate": "33.3",
            }
        ],
    )

    segments = load_funnel_segments(path)

    assert len(segments) == 1
    assert segments[0].source == "tarot_teaser_banner"
    assert segments[0].purchase_completed == 1
    assert segments[0].checkout_to_purchase_rate == 33.3
    assert segments[0].score > 0


def test_load_pinterest_inventory_detects_source_feature_and_stale_dates(tmp_path):
    path = tmp_path / "pins.csv"
    write_csv(
        path,
        ["title", "description", "link", "board", "image_path", "scheduled"],
        [
            {
                "title": "Tarot",
                "description": "",
                "link": (
                    "https://www.mystickahvezda.cz/tarot.html?"
                    "utm_source=pinterest&utm_medium=organic&utm_campaign=tool_tarot"
                    "&utm_content=v1&source=tarot_teaser_banner&feature=tarot_multi_card"
                ),
                "board": "Tarot",
                "image_path": "tarot.png",
                "scheduled": "2026-05-01",
            },
            {
                "title": "Partner match",
                "description": "",
                "link": (
                    "https://www.mystickahvezda.cz/partnerska-shoda.html?"
                    "utm_source=pinterest&utm_medium=organic&utm_campaign=tool_partner&utm_content=v1"
                ),
                "board": "Love",
                "image_path": "partner.png",
                "scheduled": "2026-05-10",
            },
        ],
    )

    items = load_pinterest_inventory(path, today=date(2026, 5, 7))

    assert len(items) == 2
    assert items[0].has_source_feature is True
    assert items[0].is_stale is True
    assert items[0].inferred_feature == "tarot_multi_card"
    assert items[1].has_required_utms is True
    assert items[1].has_source_feature is False
    assert items[1].inferred_feature == "partnerska_detail"


def test_content_memory_summary_flags_missing_recent_pillars(tmp_path):
    path = tmp_path / "memory.json"
    path.write_text(
        json.dumps(
            {
                "approved_posts": [
                    {
                        "date": "2026-05-06",
                        "type": "educational",
                        "topic": "tarot",
                        "quality_score": 8.5,
                    },
                    {
                        "date": "2026-05-05",
                        "type": "blog_promo",
                        "topic": "numerologie",
                        "quality_score": 8.0,
                    },
                ],
                "hook_scores": {"question": {"avg_score": 8.7, "count": 3}},
                "engagement_log": [],
            }
        ),
        encoding="utf-8",
    )

    summary = load_content_memory_summary(path, days=14, today=date(2026, 5, 7))

    assert summary.recent_count == 2
    assert summary.avg_quality == 8.2
    assert summary.pillar_counts["education"] == 1
    assert summary.pillar_counts["promotion"] == 1
    assert "engagement" in summary.missing_pillars
    assert summary.top_hooks[0]["hook"] == "question"


def test_growth_review_prioritizes_measured_loop_and_flags_ambiguous_pins(tmp_path):
    funnel_path = tmp_path / "funnel.csv"
    pins_path = tmp_path / "pins.csv"
    memory_path = tmp_path / "memory.json"

    write_csv(
        funnel_path,
        [
            "source",
            "feature",
            "total_events",
            "paywall_viewed",
            "checkout_started",
            "purchase_completed",
            "failures",
            "paywall_to_checkout_rate",
            "checkout_to_purchase_rate",
        ],
        [
            {
                "source": "tarot_teaser_banner",
                "feature": "tarot_multi_card",
                "total_events": "12",
                "paywall_viewed": "10",
                "checkout_started": "3",
                "purchase_completed": "1",
                "failures": "0",
                "paywall_to_checkout_rate": "30.0",
                "checkout_to_purchase_rate": "33.3",
            },
            {
                "source": "partner_match_result",
                "feature": "partnerska_detail",
                "total_events": "9",
                "paywall_viewed": "9",
                "checkout_started": "2",
                "purchase_completed": "0",
                "failures": "0",
                "paywall_to_checkout_rate": "22.2",
                "checkout_to_purchase_rate": "0",
            },
        ],
    )
    write_csv(
        pins_path,
        ["title", "description", "link", "board", "image_path", "scheduled"],
        [
            {
                "title": "Tarot",
                "description": "",
                "link": (
                    "https://www.mystickahvezda.cz/tarot.html?"
                    "utm_source=pinterest&utm_medium=organic&utm_campaign=tool_tarot"
                    "&utm_content=v1&source=tarot_teaser_banner&feature=tarot_multi_card"
                ),
                "board": "Tarot",
                "image_path": "tarot.png",
                "scheduled": "2026-05-10",
            },
            {
                "title": "Partner match",
                "description": "",
                "link": (
                    "https://www.mystickahvezda.cz/partnerska-shoda.html?"
                    "utm_source=pinterest&utm_medium=organic&utm_campaign=tool_partner&utm_content=v1"
                ),
                "board": "Love",
                "image_path": "partner.png",
                "scheduled": "2026-05-10",
            },
        ],
    )
    memory_path.write_text(
        json.dumps(
            {
                "approved_posts": [
                    {"date": "2026-05-06", "type": "educational", "quality_score": 8.0}
                ],
                "hook_scores": {},
                "engagement_log": [],
            }
        ),
        encoding="utf-8",
    )

    report = build_growth_review(
        load_funnel_segments(funnel_path),
        load_pinterest_inventory(pins_path, today=date(2026, 5, 7)),
        load_content_memory_summary(memory_path, days=14, today=date(2026, 5, 7)),
    )

    assert report["funnel"]["top_segments"][0]["feature"] == "tarot_multi_card"
    assert report["pinterest"]["ambiguous_pins"] == 1
    assert report["pinterest"]["top_campaigns"][0]["campaign"] == "tool_tarot"
    assert any("Scale the strongest measured loop" in action for action in report["recommended_actions"])
