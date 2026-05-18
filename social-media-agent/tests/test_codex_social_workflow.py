import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from codex_social_workflow import (  # noqa: E402
    build_codex_image_brief,
    build_daily_control_room_html,
    build_daily_operator_context,
    build_daily_operator_report,
    build_facebook_publish_payload,
    build_preview_html,
    build_publish_pack,
    build_traffic_pack,
    build_utm_url,
    build_visual_pack,
    classify_engagement,
    hook_rankings,
    log_draft,
    parse_draft,
    parse_summary_table,
    qa_draft,
    run_entitlement_sync,
    run_google_growth_export,
    run_live_funnel_export,
    main as workflow_main,
)


IMAGE_PROMPT = (
    "Glowing 3D crystal moon, soft violet light, gold rune engravings, "
    "deep navy cosmic starfield background (#050510), premium 3D CGI render, "
    "icon-art style, NO text NO people NO cards NO frames NO borders, portrait 4:5. "
    "Aspect ratio 4:5, 1080x1350px. Plain solid #050510 border ~20% margin all sides, "
    "no decorations in border. Object floats centered inside."
)


GOOD_DRAFT = f"""
### 🌅 RÁNO 08:00 — quote | micro_story | pure_value | CTA: save trigger
Jdeš ulicí. Vidíš 11:11.

Dnes si všimni jedné malé věci, která tě vrací zpátky k sobě.
Ulož si tenhle tichý signál na později.
`#mystickaHvezda #intuice #synchronicita #duchovnirozvoj`
**🖼️ Image prompt:** ```{IMAGE_PROMPT}```

### ☀️ POLEDNE 12:00 — educational | curiosity_gap | soft_promo | CTA: web odkaz
Tarot ti dnes neřekne, co se stane. Ukáže ti, kde už dávno víš odpověď.

Když vytáhneš kartu, zkus se nejdřív ptát: co ve mně tahle karta pojmenovává?
Pro hlubší výklad použij /tarot.html.
`#mystickaHvezda #tarot #vykladkaret #sebepoznani`
**🖼️ Image prompt:** ```{IMAGE_PROMPT}```

### 🌙 VEČER 19:00 — question | fear_reversal | pure_value | CTA: A-B volba
Možná se nebojíš špatné volby. Možná se bojíš, že už víš, která je správná.

Dnes večer si vyber: A ticho, nebo B přímý rozhovor?
Napiš jen A nebo B.
`#mystickaHvezda #otazkadne #intuice #vecernienergie`
**🖼️ Image prompt:** ```{IMAGE_PROMPT}```

Souhrnná tabulka:
| Slot | Téma | Typ | Hook | CTA | Intent |
|---|---|---|---|---|---|
| 08:00 | synchronicita | quote | micro_story | save trigger | pure_value |
| 12:00 | tarot jako zrcadlo | educational | curiosity_gap | web odkaz | soft_promo |
| 19:00 | rozhodnutí | question | fear_reversal | A-B volba | pure_value |
"""


def test_parse_draft_sections():
    sections = parse_draft(GOOD_DRAFT)
    assert len(sections) == 3
    assert sections[0].post_type == "quote"
    assert sections[1].intent == "soft_promo"
    assert sections[2].hook == "fear_reversal"


def test_parse_summary_table():
    rows = parse_summary_table(GOOD_DRAFT)
    assert len(rows) == 3
    assert rows[1]["tema"] == "tarot jako zrcadlo"


def test_qa_good_draft_passes():
    result = qa_draft(GOOD_DRAFT)
    assert result.errors == []


def test_qa_blocks_pure_value_url():
    bad = GOOD_DRAFT.replace("Ulož si tenhle tichý signál na později.", "Mrkni na /tarot.html.")
    result = qa_draft(bad)
    assert any("pure_value" in error for error in result.errors)


def test_hook_rankings_supports_hook_scores():
    ranked = hook_rankings({"hook_scores": {"question": [8, 9], "micro_story": [7]}})
    assert ranked[0] == ("question", 8.5, 2)


def test_build_utm_url_adds_tracking_params():
    url = build_utm_url(
        "/tarot.html",
        source="instagram",
        medium="story_link",
        campaign="daily_reel_2026_05_16",
        content="noon_tarot",
    )
    assert url.startswith("https://www.mystickahvezda.cz/tarot.html?")
    assert "utm_source=instagram" in url
    assert "utm_medium=story_link" in url
    assert "utm_campaign=daily_reel_2026_05_16" in url

    tracked = build_utm_url(
        "/tarot.html",
        source="instagram",
        medium="story_link",
        campaign="daily_reel_2026_05_16",
        content="noon_tarot",
        extra_params={"source": "daily_social_2026_05_16_noon", "feature": "tarot"},
    )
    assert "source=daily_social_2026_05_16_noon" in tracked
    assert "feature=tarot" in tracked


def test_traffic_pack_uses_soft_promo_target():
    import datetime as _dt

    pack = build_traffic_pack(
        GOOD_DRAFT,
        target_date=_dt.date(2026, 5, 16),
        source="instagram",
    )
    assert "Traffic pack" in pack
    assert "Tarot" in pack
    assert "utm_source=instagram" in pack
    assert "utm_source=facebook" in pack
    assert "source=daily_social_2026_05_16_noon" in pack
    assert "Funnel feature: `tarot`" in pack
    assert "IG Story" in pack


def test_publish_pack_is_clear_actionable_output():
    import datetime as _dt

    pack = build_publish_pack(
        GOOD_DRAFT,
        target_date=_dt.date(2026, 5, 16),
        source="instagram",
    )
    assert "Publish pack" in pack
    assert "Instagram Reel / feed caption" in pack
    assert "Facebook link post" in pack
    assert "Není to post k publikování" not in pack
    assert "source=daily_social_2026_05_16_noon" in pack
    assert "Funnel feature: `tarot`" in pack
    assert "Pro hlubší výklad použij odkaz v profilu." in pack
    assert "Pro hlubší výklad použij /tarot.html." not in pack


def test_facebook_publish_payload_photo_moves_long_url_to_first_comment():
    import datetime as _dt

    payload = build_facebook_publish_payload(
        GOOD_DRAFT,
        target_date=_dt.date(2026, 5, 16),
        mode="photo",
        image_path="output/images/test.png",
    )
    assert payload.mode == "photo"
    assert payload.image_path == Path("output/images/test.png")
    assert "https://www.mystickahvezda.cz/tarot.html?" not in payload.message
    assert "Karta ve videu" not in payload.message
    assert "Tenhle symbol je začátek" in payload.message
    assert payload.first_comment is not None
    assert "utm_source=facebook" in payload.first_comment
    assert "source=daily_social_2026_05_16_noon" in payload.first_comment
    assert payload.link in payload.first_comment


def test_facebook_publish_payload_can_put_url_in_caption():
    import datetime as _dt

    payload = build_facebook_publish_payload(
        GOOD_DRAFT,
        target_date=_dt.date(2026, 5, 16),
        mode="photo",
        link_placement="caption",
        image_path="output/images/test.png",
    )
    assert payload.first_comment is None
    assert payload.link in payload.message


def test_facebook_publish_payload_link_uses_link_parameter():
    import datetime as _dt

    payload = build_facebook_publish_payload(
        GOOD_DRAFT,
        target_date=_dt.date(2026, 5, 16),
        mode="link",
    )
    assert payload.mode == "link"
    assert payload.image_path is None
    assert "https://www.mystickahvezda.cz/tarot.html?" not in payload.message
    assert "utm_source=facebook" in payload.link


def test_daily_operator_context_builds_control_room_payload(tmp_path):
    import datetime as _dt

    image = tmp_path / "traffic.png"
    image.write_bytes(b"fake")
    context = build_daily_operator_context(
        GOOD_DRAFT,
        draft_path=Path("output/codex/daily_posts_2026-05-16.md"),
        target_date=_dt.date(2026, 5, 16),
        image_path=image,
    )
    assert context.qa.passed
    assert context.slot_id == "noon"
    assert context.feature == "Tarot"
    assert context.image_exists is True
    assert "utm_source=instagram" in context.story_url
    assert "utm_source=facebook" in context.facebook_payload.link
    assert context.facebook_payload.first_comment is not None

    html = build_daily_control_room_html(context)
    assert "Daily operator" in html
    assert "Facebook post" in html
    assert "Story frames" in html
    assert "Není veřejný post" in html

    report = build_daily_operator_report(context)
    assert "Daily operator" in report
    assert "Traffic cíl" in report
    assert "facebook-publish" in report


def test_visual_pack_defaults_to_traffic_visual_only():
    import datetime as _dt

    pack, generated = build_visual_pack(
        GOOD_DRAFT,
        target_date=_dt.date(2026, 5, 16),
        mode="traffic",
        generate=False,
    )
    assert "Visual pack" in pack
    assert "Počet vizuálů: 1" in pack
    assert "noon" in pack
    assert "1080x1350px" in pack
    assert generated == []


def test_codex_image_brief_targets_one_workspace_file():
    import datetime as _dt

    brief, prompt, destination = build_codex_image_brief(
        GOOD_DRAFT,
        target_date=_dt.date(2026, 5, 16),
        mode="traffic",
    )
    assert "Codex image brief" in brief
    assert "Prompt pro Codex image tool" in brief
    assert "tarot_jako_zrcadlo" in destination
    assert "Use case: stylized-concept" in prompt
    assert "no text" in prompt.lower()


def test_preview_html_contains_three_post_cards():
    import datetime as _dt

    preview = build_preview_html(GOOD_DRAFT, target_date=_dt.date(2026, 5, 16))
    assert "Interní kontrola social série" in preview
    assert "Není to post k publikování" in preview
    assert preview.count('class="post-card') == 3
    assert "tarot jako zrcadlo" in preview
    assert "QA PASS" in preview


def test_log_draft_dry_run_does_not_write(capsys):
    result = log_draft(GOOD_DRAFT, score=8.0, dry_run=True)
    output = capsys.readouterr().out
    assert result == 0
    assert "DRY RUN" in output
    assert "content_memory.json nebyl změněn" in output


def test_classify_engagement_uses_weighted_rate_when_views_exist():
    assert classify_engagement(likes=10, comments=1, shares=1, saves=1, views=1000) == "medium"
    assert classify_engagement(likes=70, comments=10, shares=8, saves=12, views=1000) == "high"
    assert classify_engagement(likes=2, comments=0, shares=0, saves=0, views=1000) == "low"


def test_growth_operator_command_runs_report(tmp_path, capsys):
    funnel = tmp_path / "funnel.csv"
    pinterest = tmp_path / "pins.csv"
    memory = tmp_path / "memory.json"

    funnel.write_text(
        "\n".join(
            [
                "source,feature,total_events,paywall_viewed,checkout_started,purchase_completed,failures,paywall_to_checkout_rate,checkout_to_purchase_rate",
                "tarot_teaser_banner,tarot_multi_card,12,10,3,1,0,30.0,33.3",
            ]
        ),
        encoding="utf-8",
    )
    pinterest.write_text(
        "\n".join(
            [
                "title,link,board,scheduled",
                (
                    "Tarot,"
                    "https://www.mystickahvezda.cz/tarot.html?utm_source=pinterest&utm_medium=organic"
                    "&utm_campaign=tool_tarot&utm_content=v1&source=tarot_teaser_banner&feature=tarot_multi_card,"
                    "Tarot,2026-05-10"
                ),
            ]
        ),
        encoding="utf-8",
    )
    memory.write_text(
        '{"approved_posts":[{"date":"2026-05-06","type":"question","quality_score":8.0}],"hook_scores":{},"engagement_log":[]}',
        encoding="utf-8",
    )

    result = workflow_main(
        [
            "growth-operator",
            "--funnel-csv",
            str(funnel),
            "--pinterest-csv",
            str(pinterest),
            "--memory",
            str(memory),
            "--date",
            "2026-05-07",
        ]
    )
    output = capsys.readouterr().out

    assert result == 0
    assert "REVENUE CONTENT REVIEW" in output
    assert "tool_tarot" in output
    assert "Inputs" in output


def test_live_funnel_export_builds_node_command(tmp_path):
    calls = []

    def fake_runner(command, **kwargs):
        calls.append((command, kwargs))
        return subprocess.CompletedProcess(command, 0, stdout="ok\n", stderr="")

    output = tmp_path / "funnel.csv"
    summary = tmp_path / "summary.json"
    result = run_live_funnel_export(
        days=30,
        output=output,
        summary_json=summary,
        limit=123,
        skip_entitlement_audit=True,
        json_output=True,
        runner=fake_runner,
    )

    assert result.returncode == 0
    command, kwargs = calls[0]
    assert command[:2] == ["node", str(Path(__file__).parents[2] / "scripts" / "export-live-funnel.mjs")]
    assert "--days" in command
    assert "30" in command
    assert "--limit" in command
    assert "123" in command
    assert str(output) in command
    assert str(summary) in command
    assert "--skip-entitlement-audit" in command
    assert "--json" in command
    assert kwargs["cwd"] == Path(__file__).parents[2]
    assert kwargs["capture_output"] is True


def test_entitlement_sync_builds_safe_dry_run_command():
    calls = []

    def fake_runner(command, **kwargs):
        calls.append((command, kwargs))
        return subprocess.CompletedProcess(command, 0, stdout="ok\n", stderr="")

    result = run_entitlement_sync(limit=77, execute=False, json_output=True, runner=fake_runner)

    assert result.returncode == 0
    command, kwargs = calls[0]
    assert command[:2] == ["node", str(Path(__file__).parents[2] / "scripts" / "sync-premium-entitlements.mjs")]
    assert "--limit" in command
    assert "77" in command
    assert "--execute" not in command
    assert "--json" in command
    assert kwargs["cwd"] == Path(__file__).parents[2]


def test_google_growth_export_builds_config_check_command(tmp_path):
    calls = []

    def fake_runner(command, **kwargs):
        calls.append((command, kwargs))
        return subprocess.CompletedProcess(command, 0, stdout="ok\n", stderr="")

    result = run_google_growth_export(
        days=28,
        output_dir=tmp_path,
        credentials="C:/secure/google.json",
        ga4_property_id="123",
        gsc_site_url="sc-domain:mystickahvezda.cz",
        check_config=True,
        json_output=True,
        runner=fake_runner,
    )

    assert result.returncode == 0
    command, kwargs = calls[0]
    assert command[:2] == ["node", str(Path(__file__).parents[2] / "scripts" / "export-google-growth-data.mjs")]
    assert "--days" in command
    assert "28" in command
    assert "--credentials" in command
    assert "C:/secure/google.json" in command
    assert "--ga4-property-id" in command
    assert "123" in command
    assert "--gsc-site-url" in command
    assert "sc-domain:mystickahvezda.cz" in command
    assert "--check-config" in command
    assert "--json" in command
    assert kwargs["cwd"] == Path(__file__).parents[2]
