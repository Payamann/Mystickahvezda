import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).parent.parent))

from pinterest_batch import build_tool_link, ensure_tool_tracking_params


def query(url):
    return parse_qs(urlparse(url).query)


def test_build_tool_link_adds_revenue_tracking_params():
    campaign = {
        "slug": "tool-tarot-ano-ne",
        "path": "/tarot-ano-ne.html",
        "utm_campaign": "tool_tarot_yes_no",
    }

    params = query(build_tool_link(campaign, variant_idx=1))

    assert params["utm_source"] == ["pinterest"]
    assert params["utm_medium"] == ["organic"]
    assert params["utm_campaign"] == ["tool_tarot_yes_no"]
    assert params["utm_content"] == ["tool-tarot-ano-ne_v2"]
    assert params["source"] == ["pinterest"]
    assert params["feature"] == ["tarot_multi_card"]


def test_ensure_tool_tracking_params_preserves_override_utms_and_adds_source_feature():
    campaign = {
        "slug": "tool-partner",
        "path": "/partnerska-shoda.html",
        "utm_campaign": "tool_compatibility",
    }
    old_override_link = (
        "https://www.mystickahvezda.cz/partnerska-shoda.html?"
        "utm_source=pinterest&utm_medium=organic&utm_campaign=legacy_campaign&utm_content=custom"
    )

    params = query(ensure_tool_tracking_params(old_override_link, campaign))

    assert params["utm_campaign"] == ["legacy_campaign"]
    assert params["utm_content"] == ["custom"]
    assert params["source"] == ["pinterest"]
    assert params["feature"] == ["partnerska_detail"]
