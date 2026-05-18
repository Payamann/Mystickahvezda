#!/usr/bin/env python3
"""
Codex workflow helper for Mysticka Hvezda social content.

It does not replace agent.py. It prepares the context Codex needs, checks
drafts against AGENTS.md rules, and logs finished 3-post batches.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import html
import io
import json
import re
import subprocess
import sys
import unicodedata
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import urlencode


if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
MEMORY_FILE = OUTPUT_DIR / "content_memory.json"
CODEX_DIR = OUTPUT_DIR / "codex"
ROOT_DIR = BASE_DIR.parent
REVENUE_DIR = OUTPUT_DIR / "revenue"
GOOGLE_DIR = OUTPUT_DIR / "google"
DEFAULT_FUNNEL_CSV = REVENUE_DIR / "funnel-segments-90d.csv"
DEFAULT_FUNNEL_SUMMARY_JSON = REVENUE_DIR / "funnel-live-summary.json"
DEFAULT_GOOGLE_GROWTH_JSON = GOOGLE_DIR / "google-growth-latest.json"
LIVE_FUNNEL_SCRIPT = ROOT_DIR / "scripts" / "export-live-funnel.mjs"
GOOGLE_GROWTH_SCRIPT = ROOT_DIR / "scripts" / "export-google-growth-data.mjs"
ENTITLEMENT_SYNC_SCRIPT = ROOT_DIR / "scripts" / "sync-premium-entitlements.mjs"

ENGAGEMENT_TEMPLATE_FIELDS = [
    "date",
    "post_type",
    "topic",
    "caption_preview",
    "likes",
    "comments",
    "shares",
    "saves",
    "views",
    "engagement",
    "notes",
]

SLOTS = [
    {
        "id": "morning",
        "label": "RANO",
        "emoji": "🌅",
        "time": "08:00",
        "types": ["quote", "tip", "daily_energy"],
        "intent": "pure_value",
        "tone": "kratky, motivacni",
        "cta": "save trigger / ticho / kratka otazka",
        "hook_mood": "poeticky/tichy",
    },
    {
        "id": "noon",
        "label": "POLEDNE",
        "emoji": "☀️",
        "time": "12:00",
        "types": ["educational", "story", "blog_promo"],
        "intent": "soft_promo",
        "tone": "hloubkovy",
        "cta": "web odkaz",
        "hook_mood": "ostry/prekvapivy",
    },
    {
        "id": "evening",
        "label": "VECER",
        "emoji": "🌙",
        "time": "19:00",
        "types": ["question", "challenge", "myth_bust"],
        "intent": "pure_value",
        "tone": "engagement",
        "cta": "otazka / A-B volba",
        "hook_mood": "provokativni/primy",
    },
]

WEB_FEATURES = {
    "Natální karta": "/natalni-karta.html",
    "Horoskopy": "/horoskopy.html",
    "Tarot": "/tarot.html",
    "Partnerská shoda": "/partnerska-shoda.html",
    "Numerologie": "/numerologie.html",
    "Lunární kalendář": "/lunace.html",
    "Runy": "/runy.html",
    "Andělské karty": "/andelske-karty.html",
    "Šamanské kolo": "/shamansko-kolo.html",
    "Hvězdný průvodce": "/mentor.html",
    "Křišťálová koule": "/kristalova-koule.html",
    "Minulý život": "/minuly-zivot.html",
}

WEB_FEATURE_TRACKING = {
    "Natální karta": "natalni_interpretace",
    "Horoskopy": "horoskopy",
    "Tarot": "tarot",
    "Partnerská shoda": "partnerska_detail",
    "Numerologie": "numerologie_vyklad",
    "Lunární kalendář": "lunar_calendar",
    "Runy": "runy_hluboky_vyklad",
    "Andělské karty": "andelske_karty_hluboky_vhled",
    "Šamanské kolo": "shamanske_kolo_plne_cteni",
    "Hvězdný průvodce": "mentor",
    "Křišťálová koule": "kristalova_koule",
    "Minulý život": "minuly_zivot",
}

LEGACY_URL_FIXES = {
    "/shamanske-kolo.html": "/shamansko-kolo.html",
}

TRAFFIC_COPY = {
    "Natální karta": {
        "keyword": "KARTA",
        "promise": "uvidíš, jak se dnešní energie propisuje do tvého vlastního horoskopu",
        "story": "Nečti jen obecnou předpověď. Podívej se, co říká tvoje vlastní mapa.",
    },
    "Horoskopy": {
        "keyword": "HOROSKOP",
        "promise": "získáš výklad pro svoje znamení",
        "story": "Dnešní energie se každého znamení dotýká jinak. Najdi to svoje.",
    },
    "Tarot": {
        "keyword": "TAROT",
        "promise": "vytáhneš si vlastní kartu a dostaneš konkrétní směr",
        "story": "Karta ve videu je začátek. Teď si vytáhni tu svoji.",
    },
    "Partnerská shoda": {
        "keyword": "SHODA",
        "promise": "uvidíš, kde mezi vámi vzniká tah i napětí",
        "story": "Někdy nejde o lásku nebo nelásku. Jde o vzorec mezi vámi.",
    },
    "Numerologie": {
        "keyword": "CISLO",
        "promise": "spočítáš si vlastní číslo a jeho praktický význam",
        "story": "Čísla nejsou dekorace. Zkus zjistit, které téma teď neseš ty.",
    },
    "Lunární kalendář": {
        "keyword": "LUNA",
        "promise": "zjistíš, co dnešní Luna podporuje a co raději netlačit",
        "story": "Když víš, v jaké fázi je Luna, přestaneš tlačit proti proudu.",
    },
    "Runy": {
        "keyword": "RUNY",
        "promise": "vytáhneš si runu jako stručné znamení pro dnešek",
        "story": "Jedna runa někdy řekne víc než dlouhý rozbor.",
    },
    "Andělské karty": {
        "keyword": "ANDEL",
        "promise": "vytáhneš si jemné poselství pro dnešní rozhodnutí",
        "story": "Když potřebuješ klidnější odpověď, začni jednou kartou.",
    },
    "Šamanské kolo": {
        "keyword": "KOLO",
        "promise": "najdeš symbolický směr, kterým se teď podívat",
        "story": "Někdy nepotřebuješ další plán. Potřebuješ změnit směr pohledu.",
    },
    "Hvězdný průvodce": {
        "keyword": "PRUVODCE",
        "promise": "dostaneš jemné vedení pro další krok",
        "story": "Když je v hlavě moc hluku, nech si ukázat jen další krok.",
    },
    "Křišťálová koule": {
        "keyword": "KOULE",
        "promise": "položíš otázku a dostaneš intuitivní odpověď",
        "story": "Otázka, kterou si nechceš položit nahlas, často potřebuje zrcadlo.",
    },
    "Minulý život": {
        "keyword": "KARMA",
        "promise": "prozkoumáš vzorec, který se může opakovat z minulosti",
        "story": "Některé reakce jsou starší než dnešní situace.",
    },
}

TOPIC_FEATURE_RULES = [
    (("natal", "birth chart", "radix"), "Natální karta"),
    (("horoskop", "astrolog", "znameni", "zverokruh"), "Horoskopy"),
    (("tarot", "karta", "vyklad"), "Tarot"),
    (("partners", "vztah", "kompatibil", "shoda"), "Partnerská shoda"),
    (("numerolog", "cislo", "11:11"), "Numerologie"),
    (("lunar", "luna", "mesic", "uplnek", "novoluni"), "Lunární kalendář"),
    (("run", "runa"), "Runy"),
    (("andel", "andelsk"), "Andělské karty"),
    (("saman", "totem"), "Šamanské kolo"),
    (("mentor", "pruvodce", "afirmac", "zamer"), "Hvězdný průvodce"),
    (("kristal", "koule", "vesten"), "Křišťálová koule"),
    (("minul", "karma", "karmick"), "Minulý život"),
]

QUIET_HOOKS = {"micro_story", "vulnerability", "celebration"}
SHARP_HOOKS = {"pattern_interrupt", "curiosity_gap", "myth_bust", "contrarian"}
DIRECT_HOOKS = {"question", "contrarian", "fear_reversal", "milestone"}
ALLOWED_HOOKS = QUIET_HOOKS | SHARP_HOOKS | DIRECT_HOOKS
ALLOWED_HOOKS |= {"pattern_interrupt", "micro_story"}

ALLOWED_TYPES = {
    "educational", "question", "tip", "story", "quote", "blog_promo",
    "myth_bust", "carousel_plan", "daily_energy", "challenge",
}

MICRO_STORY_RE = re.compile(
    r"\b(jdeš|vidíš|sedíš|stojíš|vcházíš|držíš|cítíš|slyšíš|bereš|máš|díváš)\b",
    re.IGNORECASE,
)
SLASH_FORM_RE = re.compile(r"\b[A-Za-zÁ-ž]+/[A-Za-zÁ-ž]+\b")
URL_RE = re.compile(
    r"(?:https?://(?:www\.)?mystickahvezda\.cz)?/[a-z0-9-]+\.html|"
    r"(?:https?://)?(?:www\.)?mystickahvezda\.cz/[a-z0-9-]+\.html",
    re.IGNORECASE,
)
PLACEHOLDER_RE = re.compile(r"\[(?:caption|3D object|tag\d+|material and light|engravings/symbols)\]", re.IGNORECASE)


@dataclass
class DraftSection:
    slot_title: str
    post_type: str
    hook: str
    intent: str
    cta: str
    body: str
    hashtags: list[str]
    image_prompt: str
    caption: str
    first_sentence: str


@dataclass
class QaResult:
    errors: list[str]
    warnings: list[str]

    @property
    def passed(self) -> bool:
        return not self.errors


@dataclass
class FacebookPublishPayload:
    mode: str
    message: str
    link: str
    first_comment: str | None
    image_path: Path | None
    feature: str
    topic: str
    slot_id: str
    tracking_source: str
    tracking_feature: str


@dataclass
class DailyOperatorContext:
    draft_path: Path
    target_date: date
    qa: QaResult
    slot_id: str
    topic: str
    feature: str
    clean_url: str
    story_url: str
    profile_url: str
    facebook_payload: FacebookPublishPayload
    instagram_caption: str
    story_frames: list[str]
    image_path: Path
    image_exists: bool
    campaign: str


def strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch)).lower()


def load_memory(path: Path = MEMORY_FILE) -> dict[str, Any]:
    if not path.exists():
        return {
            "approved_posts": [],
            "used_topics": [],
            "hook_scores": {},
            "hook_performance": {},
        }
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def post_type_of(post: dict[str, Any]) -> str:
    return post.get("post_type") or post.get("type") or "?"


def hook_of(post: dict[str, Any]) -> str:
    return post.get("hook_formula") or post.get("hook") or "?"


def posts_in_window(posts: list[dict[str, Any]], days: int, today: date) -> list[dict[str, Any]]:
    cutoff = today - timedelta(days=days)
    filtered = []
    for post in posts:
        post_date = parse_date(post.get("date"))
        if post_date and post_date >= cutoff:
            filtered.append(post)
    return filtered


def hook_rankings(memory: dict[str, Any]) -> list[tuple[str, float, int]]:
    performance = memory.get("hook_performance") or {}
    ranked: list[tuple[str, float, int]] = []
    for hook, stats in performance.items():
        avg = stats.get("avg_score")
        if isinstance(avg, (int, float)):
            ranked.append((hook, float(avg), int(stats.get("count", 0) or 0)))

    if not ranked:
        for hook, scores in (memory.get("hook_scores") or {}).items():
            if scores:
                ranked.append((hook, round(sum(scores) / len(scores), 1), len(scores)))

    return sorted(ranked, key=lambda item: item[1], reverse=True)


def allowed_urls() -> set[str]:
    urls = set(WEB_FEATURES.values())
    urls.update(f"https://www.mystickahvezda.cz{url}" for url in WEB_FEATURES.values())
    urls.update(f"https://mystickahvezda.cz{url}" for url in WEB_FEATURES.values())
    urls.update(f"mystickahvezda.cz{url}" for url in WEB_FEATURES.values())
    return urls


def normalize_url(url: str) -> str:
    lowered = url.strip().lower()
    lowered = lowered.replace("https://www.mystickahvezda.cz", "")
    lowered = lowered.replace("https://mystickahvezda.cz", "")
    lowered = lowered.replace("http://www.mystickahvezda.cz", "")
    lowered = lowered.replace("http://mystickahvezda.cz", "")
    lowered = lowered.replace("www.mystickahvezda.cz", "")
    lowered = lowered.replace("mystickahvezda.cz", "")
    return lowered


def absolute_url(path_or_url: str) -> str:
    path = normalize_url(path_or_url)
    if not path.startswith("/"):
        path = "/" + path
    return f"https://www.mystickahvezda.cz{path}"


def feature_for_url(path_or_url: str) -> tuple[str, str] | None:
    path = normalize_url(path_or_url)
    path = LEGACY_URL_FIXES.get(path, path)
    for feature, feature_path in WEB_FEATURES.items():
        if feature_path == path:
            return feature, feature_path
    return None


def slugify(text: str) -> str:
    compact = strip_accents(text)
    compact = re.sub(r"[^a-z0-9]+", "_", compact)
    return compact.strip("_") or "post"


def campaign_for_date(target_date: date) -> str:
    return f"daily_reel_{target_date.strftime('%Y_%m_%d')}"


def tracking_source_for(target_date: date, slot_id: str) -> str:
    return f"daily_social_{target_date.strftime('%Y_%m_%d')}_{slot_id}"


def tracking_feature_for(feature: str) -> str:
    return WEB_FEATURE_TRACKING.get(feature, slugify(feature))


def build_utm_url(
    path_or_url: str,
    *,
    source: str,
    medium: str,
    campaign: str,
    content: str,
    extra_params: dict[str, str] | None = None,
) -> str:
    base = absolute_url(path_or_url)
    params = urlencode(
        {
            "utm_source": source,
            "utm_medium": medium,
            "utm_campaign": campaign,
            "utm_content": content,
            **{key: value for key, value in (extra_params or {}).items() if value},
        }
    )
    separator = "&" if "?" in base else "?"
    return f"{base}{separator}{params}"


def feature_for_topic(topic: str) -> tuple[str, str] | None:
    compact = strip_accents(topic)
    for keywords, feature in TOPIC_FEATURE_RULES:
        if any(keyword in compact for keyword in keywords):
            return feature, WEB_FEATURES[feature]
    return None


def top_recent_topics(memory: dict[str, Any], days: int, today: date) -> list[str]:
    sources = memory.get("approved_posts", []) + memory.get("used_topics", [])
    recent = posts_in_window(sources, days, today)
    seen: list[str] = []
    for post in recent:
        topic = post.get("topic")
        if topic and topic not in seen:
            seen.append(topic)
    return seen


def last_intents(memory: dict[str, Any], limit: int = 5) -> list[str]:
    intents = []
    for post in memory.get("approved_posts", [])[-limit:]:
        intents.append(post.get("content_intent") or post.get("intent") or "unknown")
    return intents


def recent_summary_lines(memory: dict[str, Any], today: date) -> list[str]:
    approved = memory.get("approved_posts", [])[-15:]
    lines = []
    for post in approved:
        lines.append(
            f"[{post.get('date', '?')}] {post_type_of(post)} | "
            f"{hook_of(post)} | {post.get('topic', '?')}"
        )
    if not lines:
        lines.append("(zatím nejsou uložené schválené posty)")
    return lines


def build_brief(target_date: date) -> str:
    memory = load_memory()
    avoid_topics = top_recent_topics(memory, 7, target_date)
    top_hooks = hook_rankings(memory)[:5]
    intents = last_intents(memory, 5)
    last_intent = intents[-1] if intents else "unknown"
    recent_topic_text = ", ".join(avoid_topics) if avoid_topics else "nic v posledních 7 dnech"
    hook_text = ", ".join(f"{hook} ({score:.1f})" for hook, score, _ in top_hooks) or "bez dat"

    noon_feature = choose_noon_feature(memory, target_date)
    lines = [
        f"# Codex social brief — {target_date.isoformat()}",
        "",
        "## Paměť",
        *[f"- {line}" for line in recent_summary_lines(memory, target_date)],
        "",
        "## Rozhodnutí pro dnešek",
        f"- Vyhni se tématům posledních 7 dní: {recent_topic_text}.",
        f"- Preferuj top hooky: {hook_text}.",
        f"- Poslední intent: {last_intent}. Netlač promo dvakrát za sebou.",
        "- Vygeneruj 3 různá témata, minimálně 1 soft_promo.",
        "- Brand voice: tykání, bez lomených tvarů, min. 1 mikropříběh ve 2. osobě.",
        "- Hashtagy: #mystickaHvezda první, celkem 4-6.",
        "- Traffic vrstva: Reel stále dělá dosah. Web CTA formuluj jako vlastní odpověď/výklad, ne jako reklamu.",
        "",
        "## Sloty",
    ]

    for slot in SLOTS:
        feature_hint = ""
        if slot["id"] == "noon" and noon_feature:
            feature_hint = f" | doporučený web odkaz: {noon_feature[0]} {noon_feature[1]}"
        lines.append(
            f"- {slot['emoji']} {slot['time']} {slot['label']}: "
            f"{' / '.join(slot['types'])} | {slot['intent']} | CTA: {slot['cta']} | "
            f"hook mood: {slot['hook_mood']}{feature_hint}"
        )

    lines.extend(
        [
            "",
            "## Prompt pro Codex",
            "Vygeneruj 3 IG posty podle AGENTS.md a tohoto briefu. "
            "Na konci přidej souhrnnou tabulku: Slot | Téma | Typ | Hook | CTA | Intent. "
            "Po vytvoření výstupu spusť QA přes `python codex_social_workflow.py qa --file <draft>` "
            "potom traffic pack přes `python codex_social_workflow.py traffic-pack --file <draft> --write` "
            "a publikační balíček přes `python codex_social_workflow.py publish-pack --file <draft> --write`. "
            "Po schválení log přes `python codex_social_workflow.py log-draft --file <draft>`.",
        ]
    )
    return "\n".join(lines) + "\n"


def choose_noon_feature(memory: dict[str, Any], today: date) -> tuple[str, str] | None:
    recent_topics = [strip_accents(topic) for topic in top_recent_topics(memory, 14, today)]
    used_features: set[str] = set()
    for topic in recent_topics:
        match = feature_for_topic(topic)
        if match:
            used_features.add(match[0])

    ranked_candidates = [
        "Tarot",
        "Numerologie",
        "Natální karta",
        "Lunární kalendář",
        "Partnerská shoda",
        "Runy",
        "Andělské karty",
        "Minulý život",
    ]
    for feature in ranked_candidates:
        if feature not in used_features:
            return feature, WEB_FEATURES[feature]
    feature = ranked_candidates[0]
    return feature, WEB_FEATURES[feature]


def write_daily_brief(target_date: date) -> Path:
    CODEX_DIR.mkdir(parents=True, exist_ok=True)
    path = CODEX_DIR / f"daily_brief_{target_date.isoformat()}.md"
    path.write_text(build_brief(target_date), encoding="utf-8")
    return path


def build_draft_template(target_date: date) -> str:
    prompt = (
        "Replace placeholders with final posts, then run:\n"
        f"python codex_social_workflow.py qa --file output/codex/daily_posts_{target_date.isoformat()}.md\n"
        f"python codex_social_workflow.py traffic-pack --file output/codex/daily_posts_{target_date.isoformat()}.md --write\n"
        f"python codex_social_workflow.py log-draft --file output/codex/daily_posts_{target_date.isoformat()}.md --score 8.0"
    )
    rows = [
        f"# Daily posts — {target_date.isoformat()}",
        "",
        f"<!-- {prompt} -->",
        "",
    ]
    for slot in SLOTS:
        default_type = slot["types"][0]
        default_hook = {
            "morning": "micro_story",
            "noon": "curiosity_gap",
            "evening": "question",
        }[slot["id"]]
        rows.extend(
            [
                (
                    f"### {slot['emoji']} {slot['label']} {slot['time']} — "
                    f"{default_type} | {default_hook} | {slot['intent']} | CTA: {slot['cta']}"
                ),
                "[caption]",
                "`#mystickaHvezda #tag2 #tag3 #tag4`",
                f"**🖼️ Image prompt:** ```{IMAGE_PROMPT_TEMPLATE}```",
                "",
            ]
        )
    rows.extend(
        [
            "Souhrnná tabulka:",
            "| Slot | Téma | Typ | Hook | CTA | Intent |",
            "|---|---|---|---|---|---|",
            "| 08:00 |  |  |  |  |  |",
            "| 12:00 |  |  |  |  |  |",
            "| 19:00 |  |  |  |  |  |",
            "",
        ]
    )
    return "\n".join(rows)


def write_daily_draft_template(target_date: date) -> Path:
    CODEX_DIR.mkdir(parents=True, exist_ok=True)
    path = CODEX_DIR / f"daily_posts_{target_date.isoformat()}.md"
    if not path.exists():
        path.write_text(build_draft_template(target_date), encoding="utf-8")
    return path


IMAGE_PROMPT_TEMPLATE = (
    "[3D object], [material and light], [engravings/symbols], [nebula/stardust], "
    "deep navy cosmic starfield background (#050510), premium 3D CGI render, "
    "icon-art style, NO text NO people NO cards NO frames NO borders, portrait 4:5. "
    "Aspect ratio 4:5, 1080x1350px. Plain solid #050510 border ~20% margin all sides, "
    "no decorations in border. Object floats centered inside."
)


SECTION_RE = re.compile(
    r"^###\s*(?P<slot>.+?)\s+[—-]\s+"
    r"(?P<type>[a-z_]+)\s*\|\s*(?P<hook>[a-z_]+)\s*\|\s*"
    r"(?P<intent>[a-z_]+)\s*\|\s*CTA:\s*(?P<cta>[^\n]+)\n"
    r"(?P<body>.*?)(?=^###\s|\nSouhrnná tabulka|\n\*\*Souhrnná tabulka|\Z)",
    re.MULTILINE | re.DOTALL | re.IGNORECASE,
)


def extract_hashtags(text: str) -> list[str]:
    before_prompt = re.split(r"\*\*.*?Image prompt.*?\*\*", text, flags=re.IGNORECASE | re.DOTALL)[0]
    inline_tag_lines = [
        line for line in before_prompt.splitlines()
        if line.strip().startswith("`#") or line.strip().startswith("#")
    ]
    return re.findall(r"#[\wÁ-ž]+", "\n".join(inline_tag_lines), flags=re.UNICODE)


def extract_image_prompt(text: str) -> str:
    match = re.search(r"Image prompt.*?```(?P<prompt>.*?)```", text, re.IGNORECASE | re.DOTALL)
    if match:
        return match.group("prompt").strip()
    return ""


def extract_caption(body: str) -> tuple[str, str]:
    before_prompt = re.split(r"\*\*.*?Image prompt.*?\*\*", body, flags=re.IGNORECASE | re.DOTALL)[0]
    cleaned_lines = []
    for line in before_prompt.splitlines():
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append("")
            continue
        if stripped.startswith("`#"):
            continue
        if stripped.startswith("**"):
            continue
        cleaned_lines.append(line.rstrip())
    caption = "\n".join(cleaned_lines).strip()
    first = ""
    for line in caption.splitlines():
        if line.strip():
            first = line.strip()
            break
    return caption, first


def parse_draft(text: str) -> list[DraftSection]:
    sections = []
    for match in SECTION_RE.finditer(text):
        body = match.group("body").strip()
        caption, first = extract_caption(body)
        sections.append(
            DraftSection(
                slot_title=match.group("slot").strip(),
                post_type=match.group("type").strip(),
                hook=match.group("hook").strip(),
                intent=match.group("intent").strip(),
                cta=match.group("cta").strip(),
                body=body,
                hashtags=extract_hashtags(body),
                image_prompt=extract_image_prompt(body),
                caption=caption,
                first_sentence=first,
            )
        )
    return sections


def parse_summary_table(text: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    header_seen = False
    headers: list[str] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line.startswith("|") or "|" not in line[1:]:
            if header_seen and rows:
                break
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        normalized = [strip_accents(cell) for cell in cells]
        if "tema" in normalized and "slot" in normalized:
            headers = normalized
            header_seen = True
            continue
        if header_seen and all(set(cell) <= {"-", ":"} for cell in cells if cell):
            continue
        if header_seen and headers and len(cells) >= len(headers):
            rows.append({headers[i]: cells[i] for i in range(len(headers))})
    return rows


def section_slot_id(section: DraftSection) -> str | None:
    title = section.slot_title.lower()
    if "08:00" in title or "rano" in strip_accents(title) or "ráno" in title:
        return "morning"
    if "12:00" in title or "poledne" in strip_accents(title):
        return "noon"
    if "19:00" in title or "vecer" in strip_accents(title) or "večer" in title:
        return "evening"
    return None


def urls_in_text(text: str) -> list[str]:
    return [match.group(0).rstrip(".,)") for match in URL_RE.finditer(text)]


def validate_image_prompt(prompt: str) -> list[str]:
    required = [
        "3d",
        "#050510",
        "premium 3d cgi render",
        "icon-art",
        "no text",
        "no people",
        "no cards",
        "no frames",
        "no borders",
        "portrait 4:5",
        "1080x1350",
        "20% margin",
        "object floats centered",
    ]
    prompt_l = prompt.lower()
    return [item for item in required if item not in prompt_l]


def qa_draft(text: str) -> QaResult:
    errors: list[str] = []
    warnings: list[str] = []
    sections = parse_draft(text)
    summary_rows = parse_summary_table(text)

    if len(sections) != 3:
        errors.append(f"Výstup musí mít přesně 3 sekce, nalezeno {len(sections)}.")

    seen_slots = {section_slot_id(section) for section in sections}
    for expected in {"morning", "noon", "evening"}:
        if expected not in seen_slots:
            errors.append(f"Chybí slot {expected}.")

    ctas = []
    hooks = []
    found_micro_story = False
    soft_promo_count = 0
    all_allowed = {normalize_url(url) for url in allowed_urls()}

    for index, section in enumerate(sections, 1):
        slot_id = section_slot_id(section)
        slot = next((item for item in SLOTS if item["id"] == slot_id), None)
        label = f"sekce {index} ({section.slot_title})"

        if section.post_type not in ALLOWED_TYPES:
            errors.append(f"{label}: nepovolený typ `{section.post_type}`.")
        if slot and section.post_type not in slot["types"]:
            errors.append(
                f"{label}: typ `{section.post_type}` nepatří do slotu {slot['time']} "
                f"({', '.join(slot['types'])})."
            )
        if slot and section.intent != slot["intent"]:
            errors.append(f"{label}: intent má být `{slot['intent']}`, je `{section.intent}`.")
        if section.intent == "soft_promo":
            soft_promo_count += 1

        if section.hook not in ALLOWED_HOOKS:
            warnings.append(f"{label}: hook `{section.hook}` není v hlavním AGENTS seznamu.")
        hooks.append(section.hook)
        ctas.append(strip_accents(section.cta))

        if not section.caption:
            errors.append(f"{label}: chybí caption.")
        if SLASH_FORM_RE.search(re.sub(r"https?://\S+", "", section.caption)):
            errors.append(f"{label}: obsahuje lomený tvar typu šel/šla.")
        if re.search(r"\b(vám|váš|vaše|vy)\b", section.caption, re.IGNORECASE):
            warnings.append(f"{label}: možná používá vykání, zkontroluj tykání.")
        if MICRO_STORY_RE.search(section.caption):
            found_micro_story = True

        if not section.hashtags:
            errors.append(f"{label}: chybí hashtagy.")
        elif section.hashtags[0] != "#mystickaHvezda":
            errors.append(f"{label}: první hashtag musí být #mystickaHvezda.")
        if section.hashtags and not (4 <= len(section.hashtags) <= 6):
            errors.append(f"{label}: hashtagů má být 4-6, je {len(section.hashtags)}.")

        section_urls = urls_in_text(section.caption)
        if section.intent == "pure_value" and section_urls:
            errors.append(f"{label}: pure_value nesmí obsahovat web odkaz ({', '.join(section_urls)}).")
        if section.intent == "soft_promo" and not section_urls:
            errors.append(f"{label}: soft_promo musí obsahovat logicky navazující web odkaz.")
        for url in section_urls:
            normalized = normalize_url(url)
            if normalized in LEGACY_URL_FIXES:
                errors.append(
                    f"{label}: URL {normalized} je překlep, použij {LEGACY_URL_FIXES[normalized]}."
                )
            elif normalized not in all_allowed:
                errors.append(f"{label}: URL `{url}` není v povoleném seznamu web funkcí.")

        if not section.image_prompt:
            errors.append(f"{label}: chybí image prompt.")
        else:
            missing = validate_image_prompt(section.image_prompt)
            if missing:
                errors.append(f"{label}: image promptu chybí: {', '.join(missing)}.")

        astro_terms = ("luna", "měsíc", "mesic", "astro", "znamení", "znameni", "hvězdy", "hvezdy")
        caption_l = strip_accents(section.caption)
        if any(strip_accents(term) in caption_l for term in astro_terms):
            if "dnes" not in caption_l:
                warnings.append(f"{label}: astro kontext nezmiňuje konkrétní dnešek.")
            if not any(marker in caption_l for marker in ("zkus", "vsimni", "napi", "poloz", "podivej", "vyber")):
                warnings.append(f"{label}: astro kontext možná neříká, co dnes konkrétně udělat.")

    if soft_promo_count < 1:
        errors.append("Série musí mít minimálně 1 soft_promo.")
    if len(set(ctas)) < len(ctas):
        errors.append("CTA se v sérii opakuje.")
    if not found_micro_story:
        errors.append("Chybí mikropříběh v přítomném čase ve 2. osobě.")

    hook_set = set(hooks)
    if not (hook_set & QUIET_HOOKS):
        warnings.append("V hookách chybí poetický/tichý mood (např. micro_story nebo vulnerability).")
    if not (hook_set & SHARP_HOOKS):
        warnings.append("V hookách chybí ostrý/překvapivý mood (např. pattern_interrupt nebo curiosity_gap).")
    if not (hook_set & DIRECT_HOOKS):
        warnings.append("V hookách chybí provokativní/přímý mood (např. question nebo fear_reversal).")

    if summary_rows:
        topics = [row.get("tema", "") for row in summary_rows if row.get("tema")]
        if len(topics) >= 3 and len({strip_accents(topic) for topic in topics}) < 3:
            errors.append("Souhrnná tabulka nemá 3 různá témata.")
    else:
        warnings.append("Chybí souhrnná tabulka nebo nejde parsovat.")

    return QaResult(errors=errors, warnings=warnings)


def print_qa(result: QaResult) -> None:
    status = "PASS" if result.passed else "FAIL"
    print(f"QA {status}")
    if result.errors:
        print("\nChyby:")
        for item in result.errors:
            print(f"- {item}")
    if result.warnings:
        print("\nVarování:")
        for item in result.warnings:
            print(f"- {item}")
    if result.passed and not result.warnings:
        print("- Bez nalezených problémů.")


def infer_date_from_path(path: Path) -> date:
    match = re.search(r"(\d{4}-\d{2}-\d{2})", path.name)
    if match:
        return date.fromisoformat(match.group(1))
    return date.today()


def topic_for_section(rows: list[dict[str, str]], index: int, section: DraftSection) -> str:
    if index < len(rows):
        return rows[index].get("tema") or rows[index].get("téma") or section.first_sentence
    return section.first_sentence


def pick_traffic_target(
    sections: list[DraftSection],
    rows: list[dict[str, str]],
    target_date: date,
) -> tuple[int, DraftSection, str, str]:
    for index, section in enumerate(sections):
        if section.intent != "soft_promo":
            continue
        urls = urls_in_text(section.caption)
        if urls:
            match = feature_for_url(urls[0])
            if match:
                feature, path = match
                return index, section, feature, path

    for index, section in enumerate(sections):
        if section.intent == "soft_promo":
            topic = topic_for_section(rows, index, section)
            match = feature_for_topic(topic)
            if match:
                feature, path = match
                return index, section, feature, path

    for index, section in enumerate(sections):
        if section_slot_id(section) == "noon":
            topic = topic_for_section(rows, index, section)
            match = feature_for_topic(topic) or choose_noon_feature(load_memory(), target_date)
            if match:
                feature, path = match
                return index, section, feature, path

    if not sections:
        raise ValueError("Draft neobsahuje žádné parsovatelné sekce.")
    feature, path = choose_noon_feature(load_memory(), target_date) or ("Tarot", "/tarot.html")
    return 0, sections[0], feature, path


def build_traffic_pack(
    text: str,
    *,
    target_date: date,
    source: str = "instagram",
) -> str:
    sections = parse_draft(text)
    rows = parse_summary_table(text)
    index, section, feature, path = pick_traffic_target(sections, rows, target_date)
    slot_id = section_slot_id(section) or f"slot_{index + 1}"
    topic = topic_for_section(rows, index, section)
    copy = TRAFFIC_COPY.get(
        feature,
        {
            "keyword": "VYKLAD",
            "promise": "dostaneš vlastní výklad",
            "story": "Post je začátek. Vlastní odpověď najdeš na webu.",
        },
    )
    campaign = campaign_for_date(target_date)
    content_base = f"{slot_id}_{slugify(feature)}"
    tracking_source = tracking_source_for(target_date, slot_id)
    tracking_feature = tracking_feature_for(feature)
    funnel_params = {
        "source": tracking_source,
        "feature": tracking_feature,
    }
    story_url = build_utm_url(
        path,
        source=source,
        medium="story_link",
        campaign=campaign,
        content=content_base,
        extra_params=funnel_params,
    )
    bio_url = build_utm_url(
        path,
        source=source,
        medium="profile_link",
        campaign=campaign,
        content=content_base,
        extra_params=funnel_params,
    )
    facebook_url = build_utm_url(
        path,
        source="facebook",
        medium="page_post",
        campaign=campaign,
        content=content_base,
        extra_params=funnel_params,
    )
    comment_url = build_utm_url(
        path,
        source=source,
        medium="comment",
        campaign=campaign,
        content=content_base,
        extra_params=funnel_params,
    )

    hook = section.first_sentence.rstrip(".")
    story_frame_1 = hook if hook else copy["story"]
    story_frame_2 = f"{copy['story']} Tady je tvůj další krok."
    story_frame_3 = f"Link: {feature}"
    fb_post = (
        f"{hook}.\n\n"
        f"{copy['story']}\n\n"
        f"Jestli chceš vlastní odpověď, otevři {feature}: {facebook_url}\n\n"
        "#mystickaHvezda"
    )

    lines = [
        f"# Traffic pack — {target_date.isoformat()}",
        "",
        "## Primární cíl",
        f"- Slot: {slot_id} ({section.slot_title})",
        f"- Téma: {topic}",
        f"- Web funkce: {feature}",
        f"- Čistá URL: {absolute_url(path)}",
        f"- Campaign: `{campaign}`",
        f"- Funnel source: `{tracking_source}`",
        f"- Funnel feature: `{tracking_feature}`",
        "",
        "## Odkazy",
        f"- IG Story link sticker: {story_url}",
        f"- IG bio/profil na 24 h: {bio_url}",
        f"- IG komentář, pokud ho použiješ: {comment_url}",
        f"- Facebook link post: {facebook_url}",
        "",
        "## IG Story po Reelu",
        f"1. {story_frame_1}",
        f"2. {story_frame_2}",
        f"3. {story_frame_3}",
        "",
        "## Caption/Comment CTA",
        f"- Jemné CTA: Chceš vlastní odpověď? Dej si {feature} přes odkaz v profilu.",
        f"- DM keyword varianta: Napiš `{copy['keyword']}` a pošli si odkaz později.",
        "",
        "## Facebook post",
        fb_post,
        "",
        "## Minimum práce",
        "- Reels nech jako hlavní růstový obsah.",
        "- Po publikaci Reelu přidej jednu Story s link stickerem.",
        "- Stejný den pošli Facebook link post přes API nebo ručně.",
        "- Neměň celý bio link každý den, pokud je to otrava. Stačí 2-3 traffic dny týdně.",
        "",
    ]
    return "\n".join(lines)


def write_traffic_pack(draft_path: Path, content: str, target_date: date) -> Path:
    CODEX_DIR.mkdir(parents=True, exist_ok=True)
    output = CODEX_DIR / f"traffic_pack_{target_date.isoformat()}.md"
    output.write_text(content, encoding="utf-8")
    return output


def instagram_ready_caption(section: DraftSection) -> str:
    caption = section.caption
    urls = urls_in_text(caption)
    for url in sorted(urls, key=len, reverse=True):
        caption = caption.replace(url, "odkaz v profilu")
    caption = re.sub(r"tady:\s+odkaz v profilu", "přes odkaz v profilu", caption, flags=re.IGNORECASE)
    caption = re.sub(r"(přes odkaz v profilu)(?![.!?])", r"\1.", caption, flags=re.IGNORECASE)
    caption = re.sub(r"\n{3,}", "\n\n", caption).strip()
    hashtags = " ".join(section.hashtags)
    return f"{caption}\n\n{hashtags}".strip()


def publish_caption(section: DraftSection) -> str:
    hashtags = " ".join(section.hashtags)
    return f"{section.caption}\n\n{hashtags}".strip()


def facebook_story_copy(feature: str, copy: dict[str, str]) -> str:
    if feature == "Tarot":
        return "Tenhle symbol je začátek. Teď si vytáhni vlastní kartu."
    return copy["story"]


def build_facebook_publish_payload(
    text: str,
    *,
    target_date: date,
    mode: str = "photo",
    link_placement: str = "first-comment",
    image_path: str | Path | None = None,
) -> FacebookPublishPayload:
    if mode not in {"photo", "link"}:
        raise ValueError("Facebook mode musí být 'photo' nebo 'link'.")
    if link_placement not in {"first-comment", "caption", "none"}:
        raise ValueError("Facebook link placement musí být 'first-comment', 'caption' nebo 'none'.")

    sections = parse_draft(text)
    rows = parse_summary_table(text)
    index, section, feature, path = pick_traffic_target(sections, rows, target_date)
    slot_id = section_slot_id(section) or f"slot_{index + 1}"
    topic = topic_for_section(rows, index, section)
    copy = TRAFFIC_COPY.get(
        feature,
        {
            "keyword": "VYKLAD",
            "promise": "dostaneš vlastní výklad",
            "story": "Post je začátek. Vlastní odpověď najdeš na webu.",
        },
    )
    campaign = campaign_for_date(target_date)
    content_base = f"{slot_id}_{slugify(feature)}"
    tracking_source = tracking_source_for(target_date, slot_id)
    tracking_feature = tracking_feature_for(feature)
    facebook_url = build_utm_url(
        path,
        source="facebook",
        medium="page_post",
        campaign=campaign,
        content=content_base,
        extra_params={"source": tracking_source, "feature": tracking_feature},
    )
    hook = section.first_sentence.rstrip(".")
    fb_story = facebook_story_copy(feature, copy)

    first_comment = None
    if mode == "photo":
        if link_placement == "caption":
            link_cta = f"Jestli chceš vlastní odpověď, otevři {feature}:\n{facebook_url}"
        elif link_placement == "first-comment":
            link_cta = f"Jestli chceš vlastní odpověď, otevři {feature}. Odkaz najdeš v prvním komentáři."
            first_comment = f"Tady si vytáhneš vlastní kartu:\n{facebook_url}"
        else:
            link_cta = f"Jestli chceš vlastní odpověď, otevři {feature}."

        message = f"{hook}.\n\n{fb_story}\n\n{link_cta}\n\n#mystickaHvezda"
        if image_path:
            resolved_image_path: Path | None = Path(image_path)
        else:
            _, _, image_destination = build_codex_image_brief(
                text,
                target_date=target_date,
                mode="traffic",
            )
            resolved_image_path = Path(image_destination)
    else:
        message = (
            f"{hook}.\n\n"
            f"{fb_story}\n\n"
            f"Jestli chceš vlastní odpověď, otevři {feature}.\n\n"
            "#mystickaHvezda"
        )
        resolved_image_path = None

    return FacebookPublishPayload(
        mode=mode,
        message=message,
        link=facebook_url,
        first_comment=first_comment,
        image_path=resolved_image_path,
        feature=feature,
        topic=topic,
        slot_id=slot_id,
        tracking_source=tracking_source,
        tracking_feature=tracking_feature,
    )


def build_publish_pack(
    text: str,
    *,
    target_date: date,
    source: str = "instagram",
) -> str:
    sections = parse_draft(text)
    rows = parse_summary_table(text)
    index, section, feature, path = pick_traffic_target(sections, rows, target_date)
    slot_id = section_slot_id(section) or f"slot_{index + 1}"
    topic = topic_for_section(rows, index, section)
    copy = TRAFFIC_COPY.get(
        feature,
        {
            "keyword": "VYKLAD",
            "promise": "dostaneš vlastní výklad",
            "story": "Post je začátek. Vlastní odpověď najdeš na webu.",
        },
    )
    campaign = campaign_for_date(target_date)
    content_base = f"{slot_id}_{slugify(feature)}"
    tracking_source = tracking_source_for(target_date, slot_id)
    tracking_feature = tracking_feature_for(feature)
    funnel_params = {
        "source": tracking_source,
        "feature": tracking_feature,
    }
    story_url = build_utm_url(
        path,
        source=source,
        medium="story_link",
        campaign=campaign,
        content=content_base,
        extra_params=funnel_params,
    )
    profile_url = build_utm_url(
        path,
        source=source,
        medium="profile_link",
        campaign=campaign,
        content=content_base,
        extra_params=funnel_params,
    )
    facebook_url = build_utm_url(
        path,
        source="facebook",
        medium="page_post",
        campaign=campaign,
        content=content_base,
        extra_params=funnel_params,
    )
    _, image_prompt, image_destination = build_codex_image_brief(
        text,
        target_date=target_date,
        mode="traffic",
    )
    image_status = "hotový soubor existuje" if Path(image_destination).exists() else "čeká na vygenerování"
    hook = section.first_sentence.rstrip(".")
    story_frame_1 = hook if hook else copy["story"]
    story_frame_2 = f"{copy['story']} Tady je tvůj další krok."
    story_frame_3 = f"Link sticker: {feature}"
    fb_message = (
        f"{hook}.\n\n"
        f"{copy['story']}\n\n"
        f"Jestli chceš vlastní odpověď, otevři {feature}.\n\n"
        "#mystickaHvezda"
    )

    return f"""# Publish pack — {target_date.isoformat()}

## Co dnes publikovat
- Hlavní publikační výstup: polední traffic post, ne celý interní preview dashboard.
- Slot: {slot_id} ({section.slot_title})
- Téma: {topic}
- Web funkce: {feature}
- Cílová URL: {absolute_url(path)}
- Campaign: `{campaign}`
- Funnel source: `{tracking_source}`
- Funnel feature: `{tracking_feature}`
- Obrázek: `{image_destination}` ({image_status})

## 1) Instagram Reel / feed caption
```text
{instagram_ready_caption(section)}
```

## 2) Instagram Story po Reelu
Frame 1:
```text
{story_frame_1}
```

Frame 2:
```text
{story_frame_2}
```

Frame 3:
```text
{story_frame_3}
```

Link sticker URL:
{story_url}

Profil link na 24 h:
{profile_url}

Poznámka: Story s link stickerem ber jako ruční krok v Instagram appce. API může publikovat Story asset, ale link sticker se přidává nativně.

## 3) Facebook link post
Message:
```text
{fb_message}
```

Link:
{facebook_url}

## 4) Obrázek pro traffic post
Prompt pro finální obrázek:
```text
{image_prompt}
```

## 5) Checklist
- Vygeneruj jeden finální obrázek pro polední traffic slot.
- Zkopíruj Instagram caption z části 1.
- Po publikaci Reelu přidej Story a ručně vlož link sticker URL.
- Facebook pošli jako link post s message + linkem.
- Po schválení/logování spusť `python codex_social_workflow.py log-draft --file output/codex/daily_posts_{target_date.isoformat()}.md --score 8.0`.
"""


def write_publish_pack(content: str, target_date: date) -> Path:
    CODEX_DIR.mkdir(parents=True, exist_ok=True)
    output = CODEX_DIR / f"publish_pack_{target_date.isoformat()}.md"
    output.write_text(content, encoding="utf-8")
    return output


def default_daily_posts_path(target_date: date) -> Path:
    return CODEX_DIR / f"daily_posts_{target_date.isoformat()}.md"


def build_daily_operator_context(
    text: str,
    *,
    draft_path: Path,
    target_date: date,
    source: str = "instagram",
    image_path: str | Path | None = None,
    facebook_mode: str = "photo",
    link_placement: str = "first-comment",
) -> DailyOperatorContext:
    sections = parse_draft(text)
    rows = parse_summary_table(text)
    index, section, feature, path = pick_traffic_target(sections, rows, target_date)
    slot_id = section_slot_id(section) or f"slot_{index + 1}"
    topic = topic_for_section(rows, index, section)
    copy = TRAFFIC_COPY.get(
        feature,
        {
            "keyword": "VYKLAD",
            "promise": "dostaneš vlastní výklad",
            "story": "Post je začátek. Vlastní odpověď najdeš na webu.",
        },
    )
    campaign = campaign_for_date(target_date)
    content_base = f"{slot_id}_{slugify(feature)}"
    funnel_params = {
        "source": tracking_source_for(target_date, slot_id),
        "feature": tracking_feature_for(feature),
    }
    story_url = build_utm_url(
        path,
        source=source,
        medium="story_link",
        campaign=campaign,
        content=content_base,
        extra_params=funnel_params,
    )
    profile_url = build_utm_url(
        path,
        source=source,
        medium="profile_link",
        campaign=campaign,
        content=content_base,
        extra_params=funnel_params,
    )
    payload = build_facebook_publish_payload(
        text,
        target_date=target_date,
        mode=facebook_mode,
        link_placement=link_placement,
        image_path=image_path,
    )
    resolved_image = Path(image_path) if image_path else (payload.image_path or Path(""))
    story_frames = [
        section.first_sentence.rstrip(".") or copy["story"],
        f"{copy['story']} Tady je tvůj další krok.",
        f"Link sticker: {feature}",
    ]
    return DailyOperatorContext(
        draft_path=draft_path,
        target_date=target_date,
        qa=qa_draft(text),
        slot_id=slot_id,
        topic=topic,
        feature=feature,
        clean_url=absolute_url(path),
        story_url=story_url,
        profile_url=profile_url,
        facebook_payload=payload,
        instagram_caption=instagram_ready_caption(section),
        story_frames=story_frames,
        image_path=resolved_image,
        image_exists=bool(resolved_image) and resolved_image.is_file(),
        campaign=campaign,
    )


def daily_operator_status_items(context: DailyOperatorContext) -> list[tuple[str, str, str]]:
    qa_status = "PASS" if context.qa.passed else "FAIL"
    image_status = "OK" if context.image_exists else "CHYBÍ"
    fb_status = "READY" if context.facebook_payload.mode == "link" or context.image_exists else "BLOCKED"
    return [
        ("QA", qa_status, "AGENTS pravidla a obsahová struktura"),
        ("Image", image_status, str(context.image_path)),
        ("Facebook dry-run", fb_status, "photo post + první komentář s trackovaným odkazem"),
        ("Tracking", "OK", f"{context.facebook_payload.tracking_source} / {context.facebook_payload.tracking_feature}"),
    ]


def build_daily_operator_report(
    context: DailyOperatorContext,
    *,
    control_room_path: Path | None = None,
    preview_path: Path | None = None,
    publish_pack_path: Path | None = None,
    traffic_pack_path: Path | None = None,
) -> str:
    status_lines = [
        f"- {name}: {status} — {note}"
        for name, status, note in daily_operator_status_items(context)
    ]
    issue_lines = context.qa.errors + context.qa.warnings
    issues = "\n".join(f"- {item}" for item in issue_lines) if issue_lines else "- Bez nalezených problémů."
    outputs = [
        ("Control room", control_room_path),
        ("Preview", preview_path),
        ("Publish pack", publish_pack_path),
        ("Traffic pack", traffic_pack_path),
    ]
    output_lines = [f"- {label}: {path}" for label, path in outputs if path]
    if not output_lines:
        output_lines = ["- Použij `--write`, pokud chceš uložit HTML a markdown výstupy."]

    execute_command = (
        "python codex_social_workflow.py facebook-publish "
        f"--file {context.draft_path} "
        f"--image {context.image_path} --execute"
    )
    return "\n".join(
        [
            f"# Daily operator — {context.target_date.isoformat()}",
            "",
            "## Stav",
            *status_lines,
            "",
            "## Traffic cíl",
            f"- Slot: {context.slot_id}",
            f"- Téma: {context.topic}",
            f"- Web funkce: {context.feature}",
            f"- Cílová URL: {context.clean_url}",
            f"- Campaign: `{context.campaign}`",
            "",
            "## QA",
            issues,
            "",
            "## Uložené výstupy",
            *output_lines,
            "",
            "## Ostré publikování po kontrole",
            f"```bash\n{execute_command}\n```",
            "",
        ]
    )


def file_uri(path: Path) -> str:
    try:
        return path.resolve().as_uri()
    except ValueError:
        return ""


def pre_block(text: str) -> str:
    return f"<pre>{html.escape(text)}</pre>"


def build_daily_control_room_html(context: DailyOperatorContext) -> str:
    qa_class = "pass" if context.qa.passed else "fail"
    image_html = (
        f'<img src="{html.escape(file_uri(context.image_path))}" alt="Traffic visual">'
        if context.image_exists
        else '<div class="missing">Obrázek zatím chybí</div>'
    )
    issues = context.qa.errors + context.qa.warnings
    issue_html = (
        "<ul>" + "".join(f"<li>{html.escape(item)}</li>" for item in issues) + "</ul>"
        if issues
        else "<p>Bez nalezených problémů.</p>"
    )
    status_cards = "\n".join(
        f"""
        <div class="status-card">
          <strong>{html.escape(name)}</strong>
          <span class="{html.escape(status.lower())}">{html.escape(status)}</span>
          <p>{html.escape(note)}</p>
        </div>
        """
        for name, status, note in daily_operator_status_items(context)
    )
    story_html = "".join(
        f"<div class=\"story-frame\"><span>Frame {idx}</span><p>{html.escape(frame)}</p></div>"
        for idx, frame in enumerate(context.story_frames, start=1)
    )
    dry_run_command = (
        "python codex_social_workflow.py facebook-publish "
        f"--file {context.draft_path} --image {context.image_path}"
    )
    execute_command = f"{dry_run_command} --execute"

    return f"""<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Daily operator {context.target_date.isoformat()}</title>
  <style>
    :root {{
      color-scheme: dark;
      --bg: #050510;
      --panel: #101020;
      --panel-2: #17152a;
      --line: rgba(248, 244, 255, 0.16);
      --text: #f8f4ff;
      --muted: #b9adc9;
      --gold: #e4bd68;
      --green: #58d69b;
      --red: #ff7b8d;
      --violet: #8f5cff;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: radial-gradient(circle at 20% 0%, rgba(143, 92, 255, 0.22), transparent 30rem), var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }}
    main {{ width: min(1500px, calc(100% - 48px)); margin: 0 auto; padding: 32px 0 48px; }}
    header {{ display: flex; justify-content: space-between; gap: 24px; align-items: end; margin-bottom: 22px; }}
    h1 {{ margin: 0 0 8px; font-size: 34px; line-height: 1.05; }}
    h2 {{ margin: 0 0 14px; font-size: 19px; }}
    p {{ line-height: 1.48; }}
    .muted {{ color: var(--muted); margin: 0; overflow-wrap: anywhere; }}
    .badge {{ border: 1px solid rgba(228, 189, 104, 0.38); color: var(--gold); padding: 7px 9px; font-size: 12px; text-transform: uppercase; }}
    .status {{ display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }}
    .status-card, section {{ border: 1px solid var(--line); background: rgba(16, 16, 32, 0.88); }}
    .status-card {{ padding: 13px; }}
    .status-card strong {{ display: block; margin-bottom: 8px; }}
    .status-card span {{ color: var(--gold); font-size: 12px; }}
    .status-card span.pass, .status-card span.ok, .status-card span.ready {{ color: var(--green); }}
    .status-card span.fail, .status-card span.chybí, .status-card span.blocked {{ color: var(--red); }}
    .status-card p {{ color: var(--muted); margin: 8px 0 0; font-size: 13px; overflow-wrap: anywhere; }}
    .grid {{ display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 18px; align-items: start; }}
    section {{ padding: 18px; margin-bottom: 18px; }}
    .visual img {{ width: 100%; display: block; border: 1px solid var(--line); background: #050510; }}
    .missing {{ aspect-ratio: 4 / 5; display: grid; place-items: center; border: 1px dashed var(--line); color: var(--muted); }}
    .meta-list {{ display: grid; gap: 8px; color: var(--muted); font-size: 14px; overflow-wrap: anywhere; }}
    .meta-list strong {{ color: var(--text); }}
    pre {{ white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; padding: 14px; background: #090914; border: 1px solid var(--line); color: #eee7ff; font: 14px/1.48 ui-monospace, SFMono-Regular, Consolas, monospace; }}
    .story-grid {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }}
    .story-frame {{ min-height: 170px; border: 1px solid var(--line); background: linear-gradient(180deg, #0a0a18, #111024); padding: 14px; display: flex; flex-direction: column; justify-content: space-between; }}
    .story-frame span {{ color: var(--gold); font-size: 12px; }}
    .story-frame p {{ margin: 14px 0 0; }}
    .qa.pass h2 {{ color: var(--green); }}
    .qa.fail h2 {{ color: var(--red); }}
    a {{ color: var(--gold); overflow-wrap: anywhere; }}
    @media (max-width: 1050px) {{
      header {{ display: block; }}
      .status, .grid, .story-grid {{ grid-template-columns: 1fr; }}
      .badge {{ display: inline-block; margin-top: 14px; }}
    }}
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Daily operator</h1>
        <p class="muted">Mystická Hvězda · {context.target_date.isoformat()} · finální kontrola před publikací</p>
      </div>
      <div class="badge">Není veřejný post</div>
    </header>

    <div class="status">{status_cards}</div>

    <div class="grid">
      <div>
        <section class="visual">
          <h2>Traffic vizuál</h2>
          {image_html}
        </section>
        <section>
          <h2>Traffic cíl</h2>
          <div class="meta-list">
            <div><strong>Slot:</strong> {html.escape(context.slot_id)}</div>
            <div><strong>Téma:</strong> {html.escape(context.topic)}</div>
            <div><strong>Funkce:</strong> {html.escape(context.feature)}</div>
            <div><strong>URL:</strong> <a href="{html.escape(context.clean_url)}">{html.escape(context.clean_url)}</a></div>
            <div><strong>Campaign:</strong> {html.escape(context.campaign)}</div>
          </div>
        </section>
      </div>

      <div>
        <section class="qa {qa_class}">
          <h2>QA {'PASS' if context.qa.passed else 'FAIL'}</h2>
          {issue_html}
        </section>
        <section>
          <h2>Facebook post</h2>
          {pre_block(context.facebook_payload.message)}
        </section>
        <section>
          <h2>První komentář</h2>
          {pre_block(context.facebook_payload.first_comment or context.facebook_payload.link)}
        </section>
      </div>
    </div>

    <section>
      <h2>Instagram caption</h2>
      {pre_block(context.instagram_caption)}
    </section>

    <section>
      <h2>Story frames</h2>
      <div class="story-grid">{story_html}</div>
      <p class="muted">Link sticker: {html.escape(context.story_url)}</p>
    </section>

    <section>
      <h2>Příkazy</h2>
      <p class="muted">Nejdřív dry-run, po kontrole execute.</p>
      {pre_block(dry_run_command + chr(10) + execute_command)}
    </section>
  </main>
</body>
</html>
"""


def write_daily_control_room(content: str, target_date: date) -> Path:
    CODEX_DIR.mkdir(parents=True, exist_ok=True)
    output = CODEX_DIR / f"daily_control_room_{target_date.isoformat()}.html"
    output.write_text(content, encoding="utf-8")
    return output


def select_visual_sections(
    sections: list[DraftSection],
    rows: list[dict[str, str]],
    target_date: date,
    mode: str,
) -> list[tuple[int, DraftSection]]:
    if mode == "all":
        return list(enumerate(sections))
    if mode in {"morning", "noon", "evening"}:
        selected = [(idx, section) for idx, section in enumerate(sections) if section_slot_id(section) == mode]
        return selected or []
    if mode == "traffic":
        index, section, _, _ = pick_traffic_target(sections, rows, target_date)
        return [(index, section)]
    raise ValueError(f"Neznámý visual mode: {mode}")


def visual_filename(target_date: date, index: int, section: DraftSection) -> str:
    slot = section_slot_id(section) or f"slot_{index + 1}"
    return f"social_{target_date.strftime('%Y%m%d')}_{slot}_{slugify(section.post_type)}"


def build_visual_pack(
    text: str,
    *,
    target_date: date,
    mode: str = "traffic",
    generate: bool = False,
) -> tuple[str, list[Path]]:
    sections = parse_draft(text)
    rows = parse_summary_table(text)
    selected = select_visual_sections(sections, rows, target_date, mode)
    generated_paths: list[Path] = []

    lines = [
        f"# Visual pack — {target_date.isoformat()}",
        "",
        f"- Režim: `{mode}`",
        f"- Počet vizuálů: {len(selected)}",
        "- Doporučení: pro běžný den generuj jen `traffic` vizuál. Všechny 3 vizuály nech na kampaně nebo carousel.",
        "",
    ]

    if not selected:
        lines.append("Nebyly nalezeny žádné sekce pro vybraný režim.")
        return "\n".join(lines), generated_paths

    generator = None
    if generate:
        from generators.image_generator import generate_image  # noqa: WPS433
        generator = generate_image

    for index, section in selected:
        slot = section_slot_id(section) or f"slot_{index + 1}"
        topic = topic_for_section(rows, index, section)
        filename = visual_filename(target_date, index, section)
        lines.extend(
            [
                f"## {slot} — {topic}",
                f"- Typ: {section.post_type}",
                f"- Soubor: `{filename}.png`",
                "",
                "```",
                section.image_prompt,
                "```",
                "",
            ]
        )
        if generator:
            path = generator(
                prompt=section.image_prompt,
                platform="instagram",
                post_type="portrait",
                filename=filename,
            )
            generated_paths.append(path)
            lines.append(f"Vygenerováno: `{path}`")
            lines.append("")

    return "\n".join(lines), generated_paths


def write_visual_pack(content: str, target_date: date) -> Path:
    CODEX_DIR.mkdir(parents=True, exist_ok=True)
    output = CODEX_DIR / f"visual_pack_{target_date.isoformat()}.md"
    output.write_text(content, encoding="utf-8")
    return output


def build_codex_image_brief(
    text: str,
    *,
    target_date: date,
    mode: str = "traffic",
) -> tuple[str, str, str]:
    sections = parse_draft(text)
    rows = parse_summary_table(text)
    selected = select_visual_sections(sections, rows, target_date, mode)
    if not selected:
        raise ValueError("Draft neobsahuje sekci vhodnou pro Codex image brief.")

    index, section = selected[0]
    slot = section_slot_id(section) or f"slot_{index + 1}"
    topic = topic_for_section(rows, index, section)
    filename = f"codex_{target_date.strftime('%Y%m%d')}_{slot}_{slugify(topic)}.png"
    destination = str((OUTPUT_DIR / "images" / filename).resolve())

    prompt = f"""Use case: stylized-concept
Asset type: premium social traffic graphic for Instagram Story and Facebook link post
Primary request: Create one polished mystical 3D CGI visual for "{topic}".
Scene/backdrop: deep navy cosmic starfield background (#050510), subtle nebula and stardust, luxury mystical app aesthetic.
Subject: {section.image_prompt}
Style/medium: premium 3D CGI render, icon-art style, high-end spiritual brand visual.
Composition/framing: portrait 4:5, one central floating object, generous empty solid #050510 margin around all sides, object centered and readable on mobile.
Lighting/mood: dramatic inner violet/indigo/gold glow, mysterious but calm, premium not kitsch.
Color palette: deep navy #050510, violet, indigo, soft gold, pearl highlights.
Materials/textures: polished crystal, subtle metallic gold engravings, soft subsurface glow where relevant.
Text: no text.
Constraints: no people, no faces, no readable letters, no logos, no watermark, no cards, no frames, no borders, no decorative ornaments inside the empty margin.
Avoid: flat design, watercolor, busy collage, social media template, poster text, tarot-card frame, beige/brown dominant palette."""

    brief = f"""# Codex image brief — {target_date.isoformat()}

## Vybraný vizuál
- Slot: {slot}
- Téma: {topic}
- Typ: {section.post_type}
- Cílový soubor: `{destination}`

## Prompt pro Codex image tool
```text
{prompt}
```

## Použití
- Primární: Story po Reelu s link stickerem.
- Sekundární: Facebook link post.
- Negeneruj všechny 3 vizuály v běžný den. Tenhle jeden má nést traffic cíl.
"""
    return brief, prompt, destination


def write_codex_image_brief(content: str, target_date: date) -> Path:
    CODEX_DIR.mkdir(parents=True, exist_ok=True)
    output = CODEX_DIR / f"codex_image_brief_{target_date.isoformat()}.md"
    output.write_text(content, encoding="utf-8")
    return output


def caption_to_html(caption: str) -> str:
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", caption.strip()) if part.strip()]
    return "\n".join(
        f"<p>{html.escape(paragraph).replace(chr(10), '<br>')}</p>"
        for paragraph in paragraphs
    )


def build_preview_html(text: str, *, target_date: date) -> str:
    sections = parse_draft(text)
    rows = parse_summary_table(text)
    qa = qa_draft(text)
    status = "QA PASS" if qa.passed else "QA FAIL"
    status_class = "pass" if qa.passed else "fail"

    cards: list[str] = []
    for index, section in enumerate(sections):
        slot_id = section_slot_id(section) or f"slot-{index + 1}"
        slot_label = {
            "morning": "08:00 Ráno",
            "noon": "12:00 Poledne",
            "evening": "19:00 Večer",
        }.get(slot_id, section.slot_title)
        topic = topic_for_section(rows, index, section)
        hashtags = " ".join(section.hashtags)
        prompt_preview = section.image_prompt[:220] + ("..." if len(section.image_prompt) > 220 else "")
        cards.append(
            f"""
            <article class="post-card {html.escape(slot_id)}">
              <div class="visual" aria-label="Vizuální placeholder">
                <div class="stars"></div>
                <div class="symbol"></div>
                <div class="visual-label">{html.escape(topic)}</div>
              </div>
              <div class="content">
                <div class="slot">{html.escape(slot_label)}</div>
                <h2>{html.escape(topic)}</h2>
                <div class="chips">
                  <span>{html.escape(section.post_type)}</span>
                  <span>{html.escape(section.hook)}</span>
                  <span class="{html.escape(section.intent)}">{html.escape(section.intent)}</span>
                  <span>CTA: {html.escape(section.cta)}</span>
                </div>
                <div class="caption">{caption_to_html(section.caption)}</div>
                <div class="hashtags">{html.escape(hashtags)}</div>
                <details>
                  <summary>Image prompt</summary>
                  <p>{html.escape(prompt_preview)}</p>
                </details>
              </div>
            </article>
            """
        )

    issues = qa.errors + qa.warnings
    issue_html = (
        "<ul>" + "".join(f"<li>{html.escape(item)}</li>" for item in issues) + "</ul>"
        if issues
        else "<p>Bez nalezených problémů.</p>"
    )

    return f"""<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Internal social review {target_date.isoformat()}</title>
  <style>
    :root {{
      color-scheme: dark;
      --bg: #050510;
      --panel: #0c0b18;
      --panel-2: #141226;
      --line: rgba(238, 231, 255, 0.14);
      --text: #f8f4ff;
      --muted: #b9adc9;
      --gold: #e4bd68;
      --violet: #8f5cff;
      --emerald: #58d69b;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 15% 10%, rgba(143, 92, 255, 0.18), transparent 28rem),
        radial-gradient(circle at 85% 0%, rgba(228, 189, 104, 0.12), transparent 24rem),
        var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }}
    main {{
      width: min(1480px, calc(100% - 48px));
      margin: 0 auto;
      padding: 34px 0 48px;
    }}
    header {{
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 22px;
    }}
    h1 {{
      margin: 0 0 8px;
      font-size: 34px;
      line-height: 1.05;
    }}
    .subline {{
      margin: 0;
      color: var(--muted);
      font-size: 15px;
    }}
    .review-note {{
      display: inline-flex;
      margin-top: 12px;
      border: 1px solid rgba(228, 189, 104, 0.32);
      color: var(--gold);
      padding: 7px 9px;
      font-size: 12px;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: rgba(228, 189, 104, 0.06);
    }}
    .qa {{
      border: 1px solid var(--line);
      background: rgba(12, 11, 24, 0.72);
      padding: 14px 16px;
      min-width: 270px;
    }}
    .qa strong.pass {{ color: var(--emerald); }}
    .qa strong.fail {{ color: #ff7b8d; }}
    .qa ul, .qa p {{ margin: 8px 0 0; color: var(--muted); font-size: 13px; }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
      align-items: start;
    }}
    .post-card {{
      border: 1px solid var(--line);
      background: linear-gradient(180deg, rgba(20, 18, 38, 0.92), rgba(10, 9, 20, 0.96));
      min-width: 0;
      overflow: hidden;
    }}
    .visual {{
      position: relative;
      aspect-ratio: 4 / 5;
      display: grid;
      place-items: center;
      background:
        radial-gradient(circle at 50% 44%, rgba(143, 92, 255, 0.22), transparent 28%),
        radial-gradient(circle at 50% 42%, rgba(228, 189, 104, 0.12), transparent 18%),
        #050510;
      border-bottom: 1px solid var(--line);
      overflow: hidden;
    }}
    .stars::before, .stars::after {{
      content: "";
      position: absolute;
      inset: 13%;
      background-image:
        radial-gradient(circle, rgba(255,255,255,0.92) 0 1px, transparent 1.3px),
        radial-gradient(circle, rgba(228,189,104,0.8) 0 1px, transparent 1.2px);
      background-size: 54px 68px, 82px 92px;
      opacity: 0.55;
    }}
    .symbol {{
      position: relative;
      width: 42%;
      aspect-ratio: 1;
      border-radius: 50%;
      background:
        radial-gradient(circle at 35% 25%, rgba(255,255,255,0.85), transparent 13%),
        radial-gradient(circle at 50% 58%, rgba(88,214,155,0.92), rgba(20,74,69,0.95) 64%, rgba(5,5,16,0.9));
      box-shadow: 0 0 42px rgba(143, 92, 255, 0.42), 0 0 80px rgba(88, 214, 155, 0.22);
      border: 1px solid rgba(228, 189, 104, 0.5);
    }}
    .noon .symbol {{
      width: 48%;
      border-radius: 50%;
      background:
        radial-gradient(circle at 50% 45%, rgba(228,189,104,0.55), transparent 18%),
        radial-gradient(circle at 50% 50%, #15101f 0 48%, rgba(228,189,104,0.85) 49% 54%, #050510 55%);
    }}
    .evening .symbol {{
      width: 40%;
      border-radius: 14%;
      transform: rotate(9deg);
    }}
    .evening .symbol::after {{
      content: "";
      position: absolute;
      inset: 35% -32%;
      border: 2px solid rgba(228, 189, 104, 0.9);
      border-radius: 50%;
      transform: rotate(-25deg);
      box-shadow: 0 0 22px rgba(228, 189, 104, 0.42);
    }}
    .visual-label {{
      position: absolute;
      left: 24px;
      right: 24px;
      bottom: 24px;
      text-align: center;
      color: rgba(248, 244, 255, 0.78);
      font-size: 13px;
      line-height: 1.3;
    }}
    .content {{ padding: 18px; }}
    .slot {{
      color: var(--gold);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }}
    h2 {{
      margin: 0 0 12px;
      font-size: 20px;
      line-height: 1.16;
    }}
    .chips {{
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
    }}
    .chips span {{
      border: 1px solid var(--line);
      color: var(--muted);
      padding: 5px 7px;
      font-size: 12px;
      line-height: 1;
      background: rgba(255, 255, 255, 0.035);
    }}
    .chips .soft_promo {{ color: var(--gold); }}
    .caption {{
      color: #eee7ff;
      font-size: 15px;
      line-height: 1.47;
    }}
    .caption p {{ margin: 0 0 13px; }}
    .hashtags {{
      margin-top: 14px;
      color: var(--gold);
      font-size: 14px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }}
    details {{
      margin-top: 14px;
      color: var(--muted);
      font-size: 12px;
      border-top: 1px solid var(--line);
      padding-top: 12px;
    }}
    summary {{ cursor: pointer; color: #ddd4ec; }}
    details p {{ margin: 8px 0 0; line-height: 1.45; }}
    @media (max-width: 1100px) {{
      .grid {{ grid-template-columns: 1fr; }}
      header {{ display: block; }}
      .qa {{ margin-top: 18px; }}
    }}
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Interní kontrola social série</h1>
        <p class="subline">Mystická Hvězda · {target_date.isoformat()} · náhled captionů, CTA a vizuálního směru</p>
        <div class="review-note">Není to post k publikování</div>
      </div>
      <aside class="qa">
        <strong class="{status_class}">{status}</strong>
        {issue_html}
      </aside>
    </header>
    <section class="grid">
      {"".join(cards)}
    </section>
  </main>
</body>
</html>
"""


def write_preview_html(content: str, target_date: date) -> Path:
    CODEX_DIR.mkdir(parents=True, exist_ok=True)
    output = CODEX_DIR / f"preview_{target_date.isoformat()}.html"
    output.write_text(content, encoding="utf-8")
    return output


def draft_hash(section: DraftSection) -> str:
    digest = hashlib.sha1(section.caption.encode("utf-8")).hexdigest()
    return digest[:12]


def already_logged(memory: dict[str, Any], section: DraftSection) -> bool:
    preview = section.caption[:100].replace("\n", " ").strip()
    for post in memory.get("approved_posts", []):
        if post.get("caption_preview") == preview:
            return True
        if post.get("draft_hash") == draft_hash(section):
            return True
    return False


def log_draft(text: str, score: float, force: bool = False, dry_run: bool = False) -> int:
    qa = qa_draft(text)
    if qa.errors and not force:
        print_qa(qa)
        print("\nLogování zastaveno. Oprav chyby nebo použij --force.")
        return 1

    sections = parse_draft(text)
    rows = parse_summary_table(text)
    if len(rows) < len(sections):
        print("Logování vyžaduje souhrnnou tabulku s tématy.")
        return 1

    sys.path.insert(0, str(BASE_DIR))
    from generators.content_memory import (  # noqa: WPS433
        _load_memory,
        _save_memory,
        record_approved_post,
        record_golden_template,
        record_hook_score,
        record_post,
    )

    memory = _load_memory()
    logged = 0
    skipped = 0
    planned: list[tuple[str, DraftSection]] = []

    for index, section in enumerate(sections):
        if already_logged(memory, section) and not force:
            skipped += 1
            continue
        row = rows[index]
        topic = row.get("tema") or row.get("téma") or section.first_sentence[:60] or "nezadané téma"
        if dry_run:
            planned.append((topic, section))
            logged += 1
            continue
        record_post(
            topic=topic,
            post_type=section.post_type,
            hook_formula=section.hook,
            content_intent=section.intent,
        )
        record_approved_post(
            topic=topic,
            post_type=section.post_type,
            caption=section.caption,
            quality_score=score,
            content_intent=section.intent,
        )
        record_hook_score(section.hook, score)
        record_golden_template(section.post_type, section.caption, section.hook, score)
        memory = _load_memory()
        if memory.get("approved_posts"):
            memory["approved_posts"][-1].update(
                {
                    "draft_hash": draft_hash(section),
                    "hook_formula": section.hook,
                    "cta_type": section.cta,
                    "slot": section_slot_id(section) or section.slot_title,
                }
            )
            _save_memory(memory)
        logged += 1

    if dry_run:
        print("DRY RUN: content_memory.json nebyl změněn.")
        for topic, section in planned:
            print(
                f"- {topic} | {section.post_type} | {section.hook} | "
                f"{section.intent} | {section_slot_id(section) or section.slot_title}"
            )
    print(f"Zalogováno: {logged}. Přeskočeno jako duplicita: {skipped}.")
    return 0


def parse_metric_value(value: Any) -> int:
    if value is None:
        return 0
    text = str(value).strip().replace(" ", "").replace(",", ".")
    if not text:
        return 0
    try:
        return max(0, int(round(float(text))))
    except ValueError:
        return 0


def classify_engagement(
    *,
    likes: int = 0,
    comments: int = 0,
    shares: int = 0,
    saves: int = 0,
    views: int = 0,
) -> str:
    weighted_score = likes + comments * 4 + shares * 6 + saves * 5
    if views > 0:
        rate = weighted_score / views
        if rate >= 0.05:
            return "high"
        if rate >= 0.015:
            return "medium"
        return "low"
    if weighted_score >= 80:
        return "high"
    if weighted_score >= 20:
        return "medium"
    return "low"


def recent_unrated_posts(memory: dict[str, Any], days: int, today: date) -> list[dict[str, Any]]:
    rated = {
        (entry.get("date"), entry.get("topic"))
        for entry in memory.get("engagement_log", [])
    }
    posts = posts_in_window(memory.get("approved_posts", []), days, today)
    return [
        post for post in posts
        if (post.get("date"), post.get("topic")) not in rated
    ]


def write_engagement_template(days: int = 14, output: Path | None = None, today: date | None = None) -> Path:
    today = today or date.today()
    output = output or CODEX_DIR / f"engagement_template_{today.isoformat()}.csv"
    memory = load_memory()
    posts = recent_unrated_posts(memory, days, today)

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=ENGAGEMENT_TEMPLATE_FIELDS)
        writer.writeheader()
        for post in posts:
            writer.writerow({
                "date": post.get("date", ""),
                "post_type": post_type_of(post),
                "topic": post.get("topic", ""),
                "caption_preview": post.get("caption_preview", ""),
                "likes": "",
                "comments": "",
                "shares": "",
                "saves": "",
                "views": "",
                "engagement": "",
                "notes": "",
            })
    return output


def import_engagement_csv(path: Path, dry_run: bool = False) -> int:
    sys.path.insert(0, str(BASE_DIR))
    from generators.content_memory import _load_memory, record_engagement  # noqa: WPS433

    memory = _load_memory()
    existing = {
        (entry.get("date"), entry.get("topic"))
        for entry in memory.get("engagement_log", [])
    }
    imported = 0
    skipped = 0

    with path.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            post_date = (row.get("date") or "").strip()
            topic = (row.get("topic") or "").strip()
            post_type = (row.get("post_type") or "").strip()
            if not post_date or not topic or not post_type:
                skipped += 1
                continue
            if (post_date, topic) in existing:
                skipped += 1
                continue

            explicit = (row.get("engagement") or "").strip().lower()
            engagement = explicit if explicit in {"high", "medium", "low"} else classify_engagement(
                likes=parse_metric_value(row.get("likes")),
                comments=parse_metric_value(row.get("comments")),
                shares=parse_metric_value(row.get("shares")),
                saves=parse_metric_value(row.get("saves")),
                views=parse_metric_value(row.get("views")),
            )
            notes = (row.get("notes") or "").strip()
            if dry_run:
                print(f"- {post_date} | {post_type} | {topic} => {engagement}")
            else:
                record_engagement(
                    post_date=post_date,
                    post_type=post_type,
                    topic=topic,
                    engagement=engagement,
                    notes=notes,
                )
            imported += 1
            existing.add((post_date, topic))

    if dry_run:
        print("DRY RUN: content_memory.json nebyl změněn.")
    print(f"Engagement import: {imported} imported, {skipped} skipped.")
    return 0


def weekly_report(days: int) -> str:
    memory = load_memory()
    today = date.today()
    approved = posts_in_window(memory.get("approved_posts", []), days, today)
    used = posts_in_window(memory.get("used_topics", []), days, today)
    source = approved or used
    type_counts = Counter(post_type_of(post) for post in source)
    intent_counts = Counter(post.get("content_intent") or post.get("intent") or "unknown" for post in source)
    topic_counts = Counter(post.get("topic", "?") for post in source)
    recent_hooks = Counter(hook_of(post) for post in source if hook_of(post) != "?")
    ranked_hooks = hook_rankings(memory)[:5]

    lines = [
        f"# Weekly Codex Review — posledních {days} dnů",
        "",
        f"- Schválené posty: {len(approved)}",
        f"- Všechny logované pokusy: {len(used)}",
        f"- Typy: {format_counter(type_counts)}",
        f"- Intenty: {format_counter(intent_counts)}",
        f"- Nejčastější témata: {format_counter(topic_counts, limit=5)}",
        f"- Hooky v období: {format_counter(recent_hooks, limit=5) or 'bez dat'}",
        f"- Top hooky celkově: {', '.join(f'{h} ({s:.1f})' for h, s, _ in ranked_hooks) or 'bez dat'}",
        "",
        "## Doporučení",
    ]

    recommendations = build_recommendations(type_counts, intent_counts, topic_counts, ranked_hooks, len(source))
    lines.extend(f"- {item}" for item in recommendations)
    return "\n".join(lines) + "\n"


def format_counter(counter: Counter, limit: int = 8) -> str:
    if not counter:
        return ""
    return ", ".join(f"{key} {count}×" for key, count in counter.most_common(limit))


def build_recommendations(
    type_counts: Counter,
    intent_counts: Counter,
    topic_counts: Counter,
    ranked_hooks: list[tuple[str, float, int]],
    total: int,
) -> list[str]:
    if total == 0:
        return ["Nejdřív vygeneruj a zaloguj první sérii přes daily → qa → log-draft."]

    recommendations: list[str] = []
    if type_counts.get("story", 0) / total > 0.5:
        recommendations.append("Story formát dominuje. Přidej více question, myth_bust a tip, aby feed nebyl jen reelový deník.")
    if intent_counts.get("soft_promo", 0) == 0:
        recommendations.append("Chybí soft_promo. Další polední post napoj na jeden povolený web nástroj.")
    if intent_counts.get("pure_value", 0) < max(1, total // 2):
        recommendations.append("Zkontroluj promo tlak. Pure value by měla tvořit většinu běžné série.")
    if ranked_hooks:
        top = ", ".join(hook for hook, _, _ in ranked_hooks[:3])
        recommendations.append(f"Preferuj top hooky: {top}.")
    if "?" in type_counts or topic_counts.get("?", 0):
        recommendations.append("Část starších logů nemá vyplněný hook nebo typ. Nový log-draft to bude ukládat konzistentně.")
    repeated = [topic for topic, count in topic_counts.most_common(3) if count >= 3 and topic != "?"]
    if repeated:
        recommendations.append(f"Opakují se témata: {', '.join(repeated)}. Další 7 dní je vynech.")
    if not recommendations:
        recommendations.append("Rytmus je v pořádku. Další zlepšení hledej v silnějších prvních větách a CTA rotaci.")
    return recommendations


def cmd_brief(args: argparse.Namespace) -> int:
    target = date.fromisoformat(args.date) if args.date else date.today()
    print(build_brief(target))
    return 0


def cmd_daily(args: argparse.Namespace) -> int:
    target = date.fromisoformat(args.date) if args.date else date.today()
    brief_path = write_daily_brief(target)
    draft_path = write_daily_draft_template(target)
    print(f"Denní Codex brief uložen: {brief_path}")
    print(f"Draft šablona připravena: {draft_path}")
    print()
    print(build_brief(target))
    return 0


def cmd_daily_operator(args: argparse.Namespace) -> int:
    target = date.fromisoformat(args.date) if args.date else date.today()
    draft_path = Path(args.file) if args.file else default_daily_posts_path(target)

    if not draft_path.exists():
        brief_path = write_daily_brief(target)
        template_path = write_daily_draft_template(target)
        print(f"Daily operator nemá hotový draft: {draft_path}")
        print(f"Brief uložen: {brief_path}")
        print(f"Draft šablona připravena: {template_path}")
        print("Další krok: doplň finální posty a spusť daily-operator znovu.")
        return 0

    text = draft_path.read_text(encoding="utf-8")
    if PLACEHOLDER_RE.search(text) and not args.allow_placeholders:
        print("Daily operator zastaven: draft stále obsahuje placeholdery.")
        print("Doplň finální posty nebo použij --allow-placeholders pro interní náhled.")
        return 1

    context = build_daily_operator_context(
        text,
        draft_path=draft_path,
        target_date=target,
        source=args.source,
        image_path=args.image,
        facebook_mode=args.facebook_mode,
        link_placement=args.link_placement,
    )

    traffic_pack_path = publish_pack_path = preview_path = control_room_path = None
    if not args.no_write:
        traffic_pack_path = write_traffic_pack(
            draft_path,
            build_traffic_pack(text, target_date=target, source=args.source),
            target,
        )
        publish_pack_path = write_publish_pack(
            build_publish_pack(text, target_date=target, source=args.source),
            target,
        )
        preview_path = write_preview_html(build_preview_html(text, target_date=target), target)
        control_room_path = write_daily_control_room(build_daily_control_room_html(context), target)

    print(
        build_daily_operator_report(
            context,
            control_room_path=control_room_path,
            preview_path=preview_path,
            publish_pack_path=publish_pack_path,
            traffic_pack_path=traffic_pack_path,
        )
    )

    if context.qa.errors and not args.no_fail:
        return 1
    if (
        context.facebook_payload.mode == "photo"
        and not context.image_exists
        and not args.allow_missing_image
    ):
        print("Daily operator skončil s blokací: pro photo post chybí obrázek.")
        return 1
    return 0


def cmd_qa(args: argparse.Namespace) -> int:
    text = Path(args.file).read_text(encoding="utf-8")
    result = qa_draft(text)
    print_qa(result)
    if result.errors and not args.no_fail:
        return 1
    return 0


def cmd_log_draft(args: argparse.Namespace) -> int:
    text = Path(args.file).read_text(encoding="utf-8")
    return log_draft(text, score=args.score, force=args.force, dry_run=args.dry_run)


def cmd_engagement_template(args: argparse.Namespace) -> int:
    target = date.fromisoformat(args.date) if args.date else date.today()
    output = write_engagement_template(days=args.days, output=args.output, today=target)
    print(f"Engagement template uložen: {output}")
    return 0


def cmd_engagement_import(args: argparse.Namespace) -> int:
    return import_engagement_csv(args.file, dry_run=args.dry_run)


def cmd_weekly(args: argparse.Namespace) -> int:
    report = weekly_report(args.days)
    if args.write:
        CODEX_DIR.mkdir(parents=True, exist_ok=True)
        path = CODEX_DIR / f"weekly_review_{date.today().isoformat()}.md"
        path.write_text(report, encoding="utf-8")
        print(f"Weekly review uložen: {path}\n")
    print(report)
    return 0


def run_live_funnel_export(
    *,
    days: int = 90,
    output: Path | None = None,
    summary_json: Path | None = None,
    limit: int = 5000,
    skip_entitlement_audit: bool = False,
    json_output: bool = False,
    runner=subprocess.run,
) -> subprocess.CompletedProcess:
    output_path = output or DEFAULT_FUNNEL_CSV
    summary_path = summary_json or DEFAULT_FUNNEL_SUMMARY_JSON
    output_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.parent.mkdir(parents=True, exist_ok=True)

    command = [
        "node",
        str(LIVE_FUNNEL_SCRIPT),
        "--days",
        str(days),
        "--limit",
        str(limit),
        "--output",
        str(output_path),
        "--summary-json",
        str(summary_path),
    ]
    if skip_entitlement_audit:
        command.append("--skip-entitlement-audit")
    if json_output:
        command.append("--json")

    return runner(
        command,
        cwd=ROOT_DIR,
        text=True,
        capture_output=True,
        check=False,
    )


def print_completed_process(process: subprocess.CompletedProcess) -> None:
    if process.stdout:
        print(process.stdout.rstrip())
    if process.stderr:
        print(process.stderr.rstrip(), file=sys.stderr)


def cmd_pull_funnel(args: argparse.Namespace) -> int:
    output = args.output or DEFAULT_FUNNEL_CSV
    summary_json = args.summary_json or DEFAULT_FUNNEL_SUMMARY_JSON
    process = run_live_funnel_export(
        days=args.days,
        output=output,
        summary_json=summary_json,
        limit=args.limit,
        skip_entitlement_audit=args.skip_entitlement_audit,
        json_output=args.json,
    )
    print_completed_process(process)
    return process.returncode


def run_google_growth_export(
    *,
    days: int = 90,
    output_dir: Path | None = None,
    credentials: str | None = None,
    ga4_property_id: str | None = None,
    gsc_site_url: str | None = None,
    skip_ga4: bool = False,
    skip_gsc: bool = False,
    check_config: bool = False,
    json_output: bool = False,
    runner=subprocess.run,
) -> subprocess.CompletedProcess:
    output_path = output_dir or GOOGLE_DIR
    output_path.mkdir(parents=True, exist_ok=True)

    command = [
        "node",
        str(GOOGLE_GROWTH_SCRIPT),
        "--days",
        str(days),
        "--output-dir",
        str(output_path),
    ]
    if credentials:
        command.extend(["--credentials", credentials])
    if ga4_property_id:
        command.extend(["--ga4-property-id", ga4_property_id])
    if gsc_site_url:
        command.extend(["--gsc-site-url", gsc_site_url])
    if skip_ga4:
        command.append("--skip-ga4")
    if skip_gsc:
        command.append("--skip-gsc")
    if check_config:
        command.append("--check-config")
    if json_output:
        command.append("--json")

    return runner(
        command,
        cwd=ROOT_DIR,
        text=True,
        capture_output=True,
        check=False,
    )


def cmd_pull_google(args: argparse.Namespace) -> int:
    process = run_google_growth_export(
        days=args.days,
        output_dir=args.output_dir,
        credentials=args.credentials,
        ga4_property_id=args.ga4_property_id,
        gsc_site_url=args.gsc_site_url,
        skip_ga4=args.skip_ga4,
        skip_gsc=args.skip_gsc,
        check_config=args.check_config,
        json_output=args.json,
    )
    print_completed_process(process)
    return process.returncode


def run_entitlement_sync(
    *,
    execute: bool = False,
    limit: int = 1000,
    json_output: bool = False,
    runner=subprocess.run,
) -> subprocess.CompletedProcess:
    command = [
        "node",
        str(ENTITLEMENT_SYNC_SCRIPT),
        "--limit",
        str(limit),
    ]
    if execute:
        command.append("--execute")
    if json_output:
        command.append("--json")

    return runner(
        command,
        cwd=ROOT_DIR,
        text=True,
        capture_output=True,
        check=False,
    )


def cmd_entitlement_sync(args: argparse.Namespace) -> int:
    process = run_entitlement_sync(
        execute=args.execute,
        limit=args.limit,
        json_output=args.json,
    )
    print_completed_process(process)
    return process.returncode


def cmd_growth_operator(args: argparse.Namespace) -> int:
    sys.path.insert(0, str(BASE_DIR))
    from growth_review import (  # noqa: WPS433
        format_report,
        run_growth_review,
        write_growth_review,
    )

    target = date.fromisoformat(args.date) if args.date else date.today()
    funnel_csv = args.funnel_csv
    if args.live_funnel:
        funnel_csv = funnel_csv or DEFAULT_FUNNEL_CSV
        process = run_live_funnel_export(
            days=args.funnel_days,
            output=funnel_csv,
            summary_json=DEFAULT_FUNNEL_SUMMARY_JSON,
            limit=args.funnel_limit,
            skip_entitlement_audit=args.skip_entitlement_audit,
            json_output=False,
        )
        print_completed_process(process)
        if process.returncode != 0:
            return process.returncode
        print()

    google_json = args.google_json
    if args.live_google:
        google_process = run_google_growth_export(
            days=args.google_days,
            output_dir=GOOGLE_DIR,
            credentials=args.google_credentials,
            ga4_property_id=args.ga4_property_id,
            gsc_site_url=args.gsc_site_url,
            skip_ga4=args.skip_ga4,
            skip_gsc=args.skip_gsc,
            json_output=False,
        )
        print_completed_process(google_process)
        if google_process.returncode != 0:
            return google_process.returncode
        google_json = DEFAULT_GOOGLE_GROWTH_JSON
        print()

    report, paths = run_growth_review(
        funnel_csv=funnel_csv,
        live_summary=DEFAULT_FUNNEL_SUMMARY_JSON if args.live_funnel else args.live_summary_json,
        google_json=google_json,
        pinterest_csv=args.pinterest_csv,
        memory=args.memory,
        days=args.days,
        today=target,
    )

    if args.write:
        markdown_path, json_path = write_growth_review(report, target_date=target)
        stream = sys.stderr if args.json else sys.stdout
        print(f"Growth operator report ulozen: {markdown_path}", file=stream)
        print(f"Growth operator JSON ulozen: {json_path}", file=stream)
        if not args.json:
            print()

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(format_report(report))
        print()
        print("Inputs")
        print(f"- funnel_csv: {paths['funnel_csv']}")
        if paths.get("live_summary"):
            print(f"- live_summary: {paths['live_summary']}")
        if paths.get("google_json"):
            print(f"- google_json: {paths['google_json']}")
        print(f"- pinterest_csv: {paths['pinterest_csv']}")
        print(f"- memory: {paths['memory']}")
    return 0


def cmd_traffic_pack(args: argparse.Namespace) -> int:
    draft_path = Path(args.file)
    text = draft_path.read_text(encoding="utf-8")
    if PLACEHOLDER_RE.search(text) and not args.allow_placeholders:
        print("Traffic pack zastaven: draft stále obsahuje placeholdery. Nejdřív doplň finální posty.")
        return 1
    target = date.fromisoformat(args.date) if args.date else infer_date_from_path(draft_path)
    pack = build_traffic_pack(text, target_date=target, source=args.source)
    if args.write:
        output = write_traffic_pack(draft_path, pack, target)
        print(f"Traffic pack uložen: {output}\n")
    print(pack)
    return 0


def cmd_publish_pack(args: argparse.Namespace) -> int:
    draft_path = Path(args.file)
    text = draft_path.read_text(encoding="utf-8")
    if PLACEHOLDER_RE.search(text) and not args.allow_placeholders:
        print("Publish pack zastaven: draft stále obsahuje placeholdery. Nejdřív doplň finální posty.")
        return 1
    target = date.fromisoformat(args.date) if args.date else infer_date_from_path(draft_path)
    pack = build_publish_pack(text, target_date=target, source=args.source)
    if args.write:
        output = write_publish_pack(pack, target)
        print(f"Publish pack uložen: {output}\n")
    print(pack)
    return 0


def cmd_facebook_publish(args: argparse.Namespace) -> int:
    draft_path = Path(args.file)
    text = draft_path.read_text(encoding="utf-8")
    if PLACEHOLDER_RE.search(text) and not args.allow_placeholders:
        print("Facebook publish zastaven: draft stále obsahuje placeholdery. Nejdřív doplň finální posty.")
        return 1

    target = date.fromisoformat(args.date) if args.date else infer_date_from_path(draft_path)
    payload = build_facebook_publish_payload(
        text,
        target_date=target,
        mode=args.mode,
        link_placement=args.link_placement,
        image_path=args.image,
    )

    if payload.mode == "photo":
        if not payload.image_path or not payload.image_path.exists():
            print(f"Facebook publish zastaven: obrázek neexistuje: {payload.image_path}")
            print("Vygeneruj obrázek, předej --image, nebo použij --mode link.")
            return 1
        publish_image = payload.image_path
        publish_link = None
    else:
        publish_image = None
        publish_link = payload.link

    status = "EXECUTE" if args.execute else "DRY RUN"
    print(f"Facebook API {status} — {target.isoformat()}")
    print(f"- Mode: {payload.mode}")
    print(f"- Slot: {payload.slot_id}")
    print(f"- Téma: {payload.topic}")
    print(f"- Web funkce: {payload.feature}")
    print(f"- Funnel source: {payload.tracking_source}")
    print(f"- Funnel feature: {payload.tracking_feature}")
    print(f"- Link: {payload.link}")
    if payload.first_comment:
        print("- Link placement: první komentář")
    if publish_image:
        print(f"- Obrázek: {publish_image}")
    print("\nMessage:")
    print(payload.message)
    if payload.first_comment:
        print("\nFirst comment:")
        print(payload.first_comment)

    if not args.execute:
        print("\nNic nebylo publikováno. Ostrý post vyžaduje flag --execute.")
        return 0

    sys.path.insert(0, str(BASE_DIR))
    from meta_publisher import MetaPublisher  # noqa: WPS433

    publisher = MetaPublisher()
    if not args.skip_verify:
        verification = publisher.verify_credentials()
        if not verification.get("success"):
            print(f"\nMeta credentials selhaly: {verification.get('error')}")
            return 1
        print(f"\nMeta API ověřeno: {verification.get('name')} ({verification.get('id')})")

    result = publisher.publish_to_facebook(
        message=payload.message,
        image_path=publish_image,
        link=publish_link,
    )
    if result.get("success"):
        post_id = result.get("post_id")
        print(f"\nFacebook post publikován: {post_id}")
        if payload.first_comment:
            comment_result = publisher.comment_on_facebook_object(post_id, payload.first_comment)
            if comment_result.get("success"):
                print(f"První komentář s odkazem přidán: {comment_result.get('comment_id')}")
            else:
                print(f"První komentář se nepodařilo přidat: {comment_result.get('error')}")
                return 1
        return 0

    print(f"\nFacebook publikace selhala: {result.get('error')}")
    return 1


def cmd_visual_pack(args: argparse.Namespace) -> int:
    draft_path = Path(args.file)
    text = draft_path.read_text(encoding="utf-8")
    if PLACEHOLDER_RE.search(text) and not args.allow_placeholders:
        print("Visual pack zastaven: draft stále obsahuje placeholdery. Nejdřív doplň finální posty.")
        return 1
    target = date.fromisoformat(args.date) if args.date else infer_date_from_path(draft_path)
    pack, generated = build_visual_pack(
        text,
        target_date=target,
        mode=args.mode,
        generate=args.generate,
    )
    if args.write:
        output = write_visual_pack(pack, target)
        print(f"Visual pack uložen: {output}\n")
    print(pack)
    if generated:
        print("Vygenerované obrázky:")
        for path in generated:
            print(f"- {path}")
    return 0


def cmd_codex_image_brief(args: argparse.Namespace) -> int:
    draft_path = Path(args.file)
    text = draft_path.read_text(encoding="utf-8")
    if PLACEHOLDER_RE.search(text) and not args.allow_placeholders:
        print("Codex image brief zastaven: draft stále obsahuje placeholdery. Nejdřív doplň finální posty.")
        return 1
    target = date.fromisoformat(args.date) if args.date else infer_date_from_path(draft_path)
    brief, _, destination = build_codex_image_brief(text, target_date=target, mode=args.mode)
    if args.write:
        output = write_codex_image_brief(brief, target)
        print(f"Codex image brief uložen: {output}")
        print(f"Cílový soubor po vygenerování: {destination}\n")
    print(brief)
    return 0


def cmd_preview(args: argparse.Namespace) -> int:
    draft_path = Path(args.file)
    text = draft_path.read_text(encoding="utf-8")
    if PLACEHOLDER_RE.search(text) and not args.allow_placeholders:
        print("Preview zastaven: draft stále obsahuje placeholdery. Nejdřív doplň finální posty.")
        return 1
    target = date.fromisoformat(args.date) if args.date else infer_date_from_path(draft_path)
    preview = build_preview_html(text, target_date=target)
    output = write_preview_html(preview, target)
    print(f"Preview HTML uložen: {output}")
    return 0


def cmd_urls(_: argparse.Namespace) -> int:
    print("Povolené soft_promo web funkce:")
    for feature, url in WEB_FEATURES.items():
        exists = (ROOT_DIR / url.lstrip("/")).exists()
        status = "OK" if exists else "CHYBÍ"
        print(f"- {feature}: {url} [{status}]")
    if LEGACY_URL_FIXES:
        print("\nZnámé opravy překlepů:")
        for old, new in LEGACY_URL_FIXES.items():
            print(f"- {old} -> {new}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Codex workflow pro denní social content Mystické Hvězdy",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    brief = sub.add_parser("brief", help="Vytiskne denní brief z content_memory")
    brief.add_argument("--date", help="Datum YYYY-MM-DD, default dnes")
    brief.set_defaults(func=cmd_brief)

    daily = sub.add_parser("daily", help="Uloží denní Codex brief do output/codex")
    daily.add_argument("--date", help="Datum YYYY-MM-DD, default dnes")
    daily.set_defaults(func=cmd_daily)

    operator = sub.add_parser("daily-operator", help="Spustí denní kontrolní workflow a vytvoří control room")
    operator.add_argument("--file", help="Markdown soubor s 3 posty. Default output/codex/daily_posts_YYYY-MM-DD.md")
    operator.add_argument("--date", help="Datum YYYY-MM-DD, default dnes")
    operator.add_argument("--source", default="instagram", help="utm_source pro IG odkazy")
    operator.add_argument("--image", help="Volitelná cesta k hotovému obrázku pro Facebook photo post")
    operator.add_argument(
        "--facebook-mode",
        default="photo",
        choices=["photo", "link"],
        help="photo = doporučeno; link = klasický Facebook link card post",
    )
    operator.add_argument(
        "--link-placement",
        default="first-comment",
        choices=["first-comment", "caption", "none"],
        help="Kam dát trackovaný odkaz u photo postu. Default první komentář.",
    )
    operator.add_argument("--no-write", action="store_true", help="Jen vytisknout report, neukládat packy a HTML")
    operator.add_argument("--no-fail", action="store_true", help="Vrátit exit 0 i při QA chybách")
    operator.add_argument("--allow-missing-image", action="store_true", help="Neblokovat photo workflow, když chybí obrázek")
    operator.add_argument("--allow-placeholders", action="store_true", help="Povolit výstup i z nevyplněné šablony")
    operator.set_defaults(func=cmd_daily_operator)

    qa = sub.add_parser("qa", help="Zkontroluje hotový markdown draft podle AGENTS.md")
    qa.add_argument("--file", required=True, help="Markdown soubor s 3 posty")
    qa.add_argument("--no-fail", action="store_true", help="Vždy exit 0 i při chybách")
    qa.set_defaults(func=cmd_qa)

    log = sub.add_parser("log-draft", help="Zaloguje schválený markdown draft do content_memory")
    log.add_argument("--file", required=True, help="Markdown soubor s 3 posty")
    log.add_argument("--score", type=float, default=8.0, help="QG skóre uložené k postům")
    log.add_argument("--force", action="store_true", help="Logovat i při QA chybách nebo duplicitě")
    log.add_argument("--dry-run", action="store_true", help="Otestovat logování bez změny content_memory.json")
    log.set_defaults(func=cmd_log_draft)

    engagement_template = sub.add_parser("engagement-template", help="Vytvoří CSV šablonu pro doplnění výsledků postů")
    engagement_template.add_argument("--days", type=int, default=14, help="Kolik dnů zpět zahrnout")
    engagement_template.add_argument("--date", help="Datum YYYY-MM-DD, default dnes")
    engagement_template.add_argument("--output", type=Path, help="Cílový CSV soubor. Default output/codex/engagement_template_YYYY-MM-DD.csv")
    engagement_template.set_defaults(func=cmd_engagement_template)

    engagement_import = sub.add_parser("engagement-import", help="Naimportuje výsledky postů z engagement CSV do content_memory")
    engagement_import.add_argument("--file", type=Path, required=True, help="CSV s columns: date, post_type, topic, likes/comments/shares/saves/views nebo engagement")
    engagement_import.add_argument("--dry-run", action="store_true", help="Vypsat import bez změny content_memory.json")
    engagement_import.set_defaults(func=cmd_engagement_import)

    weekly = sub.add_parser("weekly", help="Datový review report pro další týden")
    weekly.add_argument("--days", type=int, default=7)
    weekly.add_argument("--write", action="store_true", help="Uložit report do output/codex")
    weekly.set_defaults(func=cmd_weekly)

    pull = sub.add_parser("pull-funnel", help="Download live Supabase funnel export for growth operator")
    pull.add_argument("--days", type=int, default=90, help="Funnel data window in days")
    pull.add_argument("--limit", type=int, default=5000, help="Maximum funnel events used by the report")
    pull.add_argument("--output", type=Path, help="Segments CSV output path. Default output/revenue/funnel-segments-90d.csv")
    pull.add_argument("--summary-json", type=Path, help="Summary JSON output path. Default output/revenue/funnel-live-summary.json")
    pull.add_argument("--skip-entitlement-audit", action="store_true", help="Skip subscription/user premium flag audit")
    pull.add_argument("--json", action="store_true", help="Print machine-readable JSON")
    pull.set_defaults(func=cmd_pull_funnel)

    google_pull = sub.add_parser("pull-google", help="Download Google Search Console and GA4 growth data")
    google_pull.add_argument("--days", type=int, default=90, help="Google data window in days")
    google_pull.add_argument("--output-dir", type=Path, help="Output directory. Default output/google")
    google_pull.add_argument("--credentials", help="Path to Google service-account JSON")
    google_pull.add_argument("--ga4-property-id", help="GA4 numeric property ID")
    google_pull.add_argument("--gsc-site-url", help="Search Console site URL, e.g. sc-domain:mystickahvezda.cz")
    google_pull.add_argument("--skip-ga4", action="store_true", help="Only fetch Search Console data")
    google_pull.add_argument("--skip-gsc", action="store_true", help="Only fetch GA4 data")
    google_pull.add_argument("--check-config", action="store_true", help="Validate env/config without calling Google APIs")
    google_pull.add_argument("--json", action="store_true", help="Print machine-readable JSON")
    google_pull.set_defaults(func=cmd_pull_google)

    entitlement = sub.add_parser("entitlement-sync", help="Dry-run or execute premium users.is_premium repair")
    entitlement.add_argument("--limit", type=int, default=1000, help="Maximum active subscription rows to inspect")
    entitlement.add_argument("--execute", action="store_true", help="Actually update mismatched users.is_premium flags")
    entitlement.add_argument("--json", action="store_true", help="Print machine-readable JSON")
    entitlement.set_defaults(func=cmd_entitlement_sync)

    growth = sub.add_parser("growth-operator", help="Spojí social memory, funnel export a Pinterest do akčního growth reportu")
    growth.add_argument("--funnel-csv", type=Path, help="Admin export /api/admin/funnel?format=csv&view=segments")
    growth.add_argument("--pinterest-csv", type=Path, help="Pinterest inventory CSV. Default output/pinterest/pinterest_pins.csv")
    growth.add_argument("--memory", type=Path, help="Content memory JSON. Default output/content_memory.json")
    growth.add_argument("--days", type=int, default=14, help="Kolik dní content memory vyhodnotit")
    growth.add_argument("--live-funnel", action="store_true", help="Download live Supabase funnel before the review")
    growth.add_argument("--funnel-days", type=int, default=90, help="Funnel data window in days for --live-funnel")
    growth.add_argument("--funnel-limit", type=int, default=5000, help="Maximum funnel events for --live-funnel")
    growth.add_argument("--skip-entitlement-audit", action="store_true", help="Skip subscription/user premium audit for --live-funnel")
    growth.add_argument("--live-summary-json", type=Path, help="Saved JSON summary from pull-funnel for entitlement drift checks")
    growth.add_argument("--live-google", action="store_true", help="Download Google Search Console and GA4 before the review")
    growth.add_argument("--google-json", type=Path, help="Saved JSON summary from pull-google")
    growth.add_argument("--google-days", type=int, default=90, help="Google data window in days for --live-google")
    growth.add_argument("--google-credentials", help="Path to Google service-account JSON for --live-google")
    growth.add_argument("--ga4-property-id", help="GA4 numeric property ID for --live-google")
    growth.add_argument("--gsc-site-url", help="Search Console site URL for --live-google")
    growth.add_argument("--skip-ga4", action="store_true", help="With --live-google, skip GA4")
    growth.add_argument("--skip-gsc", action="store_true", help="With --live-google, skip Search Console")
    growth.add_argument("--date", help="Datum reportu YYYY-MM-DD, default dnes")
    growth.add_argument("--write", action="store_true", help="Uložit Markdown a JSON report do output/codex")
    growth.add_argument("--json", action="store_true", help="Vytisknout machine-readable JSON")
    growth.set_defaults(func=cmd_growth_operator)

    traffic = sub.add_parser("traffic-pack", help="Vytvoří UTM odkazy, Story CTA a Facebook post z denního draftu")
    traffic.add_argument("--file", required=True, help="Markdown soubor s 3 posty")
    traffic.add_argument("--date", help="Datum YYYY-MM-DD, default z názvu souboru nebo dnes")
    traffic.add_argument("--source", default="instagram", help="utm_source pro IG odkazy")
    traffic.add_argument("--write", action="store_true", help="Uložit traffic pack do output/codex")
    traffic.add_argument("--allow-placeholders", action="store_true", help="Povolit výstup i z nevyplněné šablony")
    traffic.set_defaults(func=cmd_traffic_pack)

    publish = sub.add_parser("publish-pack", help="Vytvoří jasný publikační balíček z denního draftu")
    publish.add_argument("--file", required=True, help="Markdown soubor s 3 posty")
    publish.add_argument("--date", help="Datum YYYY-MM-DD, default z názvu souboru nebo dnes")
    publish.add_argument("--source", default="instagram", help="utm_source pro IG odkazy")
    publish.add_argument("--write", action="store_true", help="Uložit publish pack do output/codex")
    publish.add_argument("--allow-placeholders", action="store_true", help="Povolit výstup i z nevyplněné šablony")
    publish.set_defaults(func=cmd_publish_pack)

    fb = sub.add_parser("facebook-publish", help="Pošle traffic post na Facebook stránku přes Meta API")
    fb.add_argument("--file", required=True, help="Markdown soubor s 3 posty")
    fb.add_argument("--date", help="Datum YYYY-MM-DD, default z názvu souboru nebo dnes")
    fb.add_argument(
        "--mode",
        default="photo",
        choices=["photo", "link"],
        help="photo = doporučeno, zachová 4:5 obrázek; link = klasický link card post",
    )
    fb.add_argument(
        "--link-placement",
        default="first-comment",
        choices=["first-comment", "caption", "none"],
        help="Kam dát trackovaný odkaz u photo postu. Default první komentář, aby hlavní text nebyl dlouhý.",
    )
    fb.add_argument("--image", help="Volitelná cesta k obrázku pro --mode photo")
    fb.add_argument("--execute", action="store_true", help="Skutečně publikovat na Facebook stránku")
    fb.add_argument("--skip-verify", action="store_true", help="Přeskočit ověření Meta credentials před publikací")
    fb.add_argument("--allow-placeholders", action="store_true", help="Povolit výstup i z nevyplněné šablony")
    fb.set_defaults(func=cmd_facebook_publish)

    visual = sub.add_parser("visual-pack", help="Připraví image prompty nebo vygeneruje grafiku z denního draftu")
    visual.add_argument("--file", required=True, help="Markdown soubor s 3 posty")
    visual.add_argument("--date", help="Datum YYYY-MM-DD, default z názvu souboru nebo dnes")
    visual.add_argument(
        "--mode",
        default="traffic",
        choices=["traffic", "morning", "noon", "evening", "all"],
        help="Které vizuály připravit. Default traffic = jen hlavní webový cíl.",
    )
    visual.add_argument("--write", action="store_true", help="Uložit visual pack do output/codex")
    visual.add_argument("--generate", action="store_true", help="Skutečně vygenerovat PNG obrázky do output/images")
    visual.add_argument("--allow-placeholders", action="store_true", help="Povolit výstup i z nevyplněné šablony")
    visual.set_defaults(func=cmd_visual_pack)

    codex_img = sub.add_parser("codex-image-brief", help="Vytvoří nejlepší prompt pro Codex image tool")
    codex_img.add_argument("--file", required=True, help="Markdown soubor s 3 posty")
    codex_img.add_argument("--date", help="Datum YYYY-MM-DD, default z názvu souboru nebo dnes")
    codex_img.add_argument(
        "--mode",
        default="traffic",
        choices=["traffic", "morning", "noon", "evening"],
        help="Který vizuál připravit pro Codex image tool. Default traffic.",
    )
    codex_img.add_argument("--write", action="store_true", help="Uložit brief do output/codex")
    codex_img.add_argument("--allow-placeholders", action="store_true", help="Povolit výstup i z nevyplněné šablony")
    codex_img.set_defaults(func=cmd_codex_image_brief)

    preview = sub.add_parser("preview", help="Vytvoří HTML náhled denní série postů")
    preview.add_argument("--file", required=True, help="Markdown soubor s 3 posty")
    preview.add_argument("--date", help="Datum YYYY-MM-DD, default z názvu souboru nebo dnes")
    preview.add_argument("--allow-placeholders", action="store_true", help="Povolit výstup i z nevyplněné šablony")
    preview.set_defaults(func=cmd_preview)

    urls = sub.add_parser("urls", help="Zobrazí povolené promo URL a ověří lokální soubory")
    urls.set_defaults(func=cmd_urls)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
