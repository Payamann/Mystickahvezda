"""Shared helpers for Mysticka Hvezda daily reel generators."""

from __future__ import annotations

import inspect
import json
import math
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any


CREATIVE_PURPOSES = {"voiceover", "horoscope"}


def infer_claude_purpose() -> str:
    """Infer call purpose from the calling function name."""
    for frame in inspect.stack()[2:8]:
        name = frame.function.lower()
        if "horoscope" in name:
            return "horoscope"
        if "voiceover" in name:
            return "voiceover"
        if "proofread" in name:
            return "proofread"
        if "caption" in name or "description" in name:
            return "caption"
        if "thumbnail" in name:
            return "thumbnail"
        if "suno" in name:
            return "suno"
        if "polish" in name or "strip" in name or "fix" in name:
            return "repair"
    return "general"


def model_for_purpose(purpose: str, creative_model: str, utility_model: str) -> str:
    """Use the strong model only for creative core by default."""
    return creative_model if purpose in CREATIVE_PURPOSES else utility_model


class ApiUsageStats:
    """Lightweight non-tokenizing usage tracker for API calls."""

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    def reset(self) -> None:
        self.calls.clear()

    def record(self, *, purpose: str, model: str, system: str, user: str, max_tokens: int) -> None:
        input_chars = len(system or "") + len(user or "")
        self.calls.append({
            "purpose": purpose,
            "model": model,
            "estimated_input_chars": input_chars,
            "estimated_input_tokens": math.ceil(input_chars / 4),
            "max_output_tokens": max_tokens,
        })

    def summary(self) -> dict[str, Any]:
        by_purpose = Counter(call["purpose"] for call in self.calls)
        by_model = Counter(call["model"] for call in self.calls)
        return {
            "total_calls": len(self.calls),
            "by_purpose": dict(sorted(by_purpose.items())),
            "by_model": dict(sorted(by_model.items())),
            "estimated_input_chars": sum(call["estimated_input_chars"] for call in self.calls),
            "estimated_input_tokens": sum(call["estimated_input_tokens"] for call in self.calls),
            "max_output_tokens": sum(call["max_output_tokens"] for call in self.calls),
            "calls": self.calls,
        }


def print_api_report(stats: ApiUsageStats) -> None:
    summary = stats.summary()
    print("\n" + "=" * 60)
    print("API USAGE REPORT")
    print("=" * 60)
    print(f"API calls: {summary['total_calls']}")
    print(f"Estimated input tokens: {summary['estimated_input_tokens']}")
    print(f"Max output tokens requested: {summary['max_output_tokens']}")
    if summary["by_purpose"]:
        print("By purpose: " + ", ".join(f"{k}={v}" for k, v in summary["by_purpose"].items()))
    if summary["by_model"]:
        print("By model: " + ", ".join(f"{k}={v}" for k, v in summary["by_model"].items()))
    print("=" * 60)


TAG_RE = re.compile(r"\[[a-zA-Z_]+\]")
BREAK_RE = re.compile(r"<break[^/]*/>")
WORD_RE = re.compile(r"\b[\wáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]+\b", re.UNICODE)

BANNED_PHRASES = [
    "portál",
    "brána",
    "ze hvězd",
    "od hvězd",
    "hvězdy ti posílají",
    "hvězdy ti šeptají",
    "neptun ti šeptá",
    "planeta ti šeptá",
]

ENGLISH_WORDS = [
    "spreadsheet",
    "feedback",
    "challenge",
    "mindset",
    "vibe",
    "deadline",
    "random",
    "skill",
    "data",
]

GENDER_PATTERNS = {
    "split_form": re.compile(r"\b\w+/\w+\b", re.IGNORECASE),
    "jsi_byl_byla": re.compile(r"\bjsi\s+(?:byl|byla|slyšel|slyšela|čekal|čekala|hledal|hledala|toužil|toužila)\b", re.IGNORECASE),
    "past_second_person": re.compile(r"\b\w+(?:l|la)\s+jsi\b|\bjsi\s+\w+(?:l|la)\b", re.IGNORECASE),
    "predicate_gender": re.compile(r"\b(?:jsi|nejsi|cítíš se|připadáš si)\s+(?:\w+\s+){0,2}\w+(?:á|ý|ou|ého|ému|ým|sám|sama)\b", re.IGNORECASE),
}


def strip_voice_markup(text: str) -> str:
    text = TAG_RE.sub("", text or "")
    text = BREAK_RE.sub("", text)
    text = re.sub(r"🗓️.*?\n", "", text)
    return re.sub(r"\s+", " ", text).strip()


def _hook_text(voiceover: str) -> str:
    body = re.sub(r"^🗓️.*?\n+", "", voiceover or "").strip()
    return body.split("\n\n", 1)[0].strip()


def _word_count(text: str) -> int:
    return len(WORD_RE.findall(text or ""))


def build_qa_report(
    *,
    voiceover: str,
    tiktok_description: str = "",
    facebook_description: str = "",
    suno: str = "",
    thumbnail: str = "",
    signs: list[str] | None = None,
    required_url: str = "mystickahvezda.cz/horoskopy.html",
) -> dict[str, Any]:
    signs = signs or []
    all_text = "\n".join([voiceover or "", tiktok_description or "", facebook_description or "", thumbnail or ""])
    clean_voiceover = strip_voice_markup(voiceover)
    hook = strip_voice_markup(_hook_text(voiceover))

    banned_hits = [phrase for phrase in BANNED_PHRASES if phrase.lower() in all_text.lower()]
    english_hits = [word for word in ENGLISH_WORDS if re.search(rf"\b{re.escape(word)}\b", all_text, re.IGNORECASE)]
    gender_hits = {
        name: sorted(set(match.group(0) for match in pattern.finditer(all_text)))
        for name, pattern in GENDER_PATTERNS.items()
    }
    gender_hits = {name: hits[:8] for name, hits in gender_hits.items() if hits}

    voice_lines = [line.strip() for line in (voiceover or "").splitlines() if line.strip()]
    missing_tag_lines = [
        line[:90] for line in voice_lines
        if not line.startswith("🗓️") and not set(line) <= {"="} and "[" not in line
    ][:8]

    hashtags = re.findall(r"#[^\s#]+", "\n".join([tiktok_description or "", facebook_description or ""]))
    missing_sign_hashtags = [f"#{sign}" for sign in signs if f"#{sign}" not in hashtags]

    issues: list[str] = []
    if banned_hits:
        issues.append("Zakázané fráze: " + ", ".join(banned_hits))
    if english_hits:
        issues.append("Podezřelá anglická slova: " + ", ".join(english_hits))
    if gender_hits:
        issues.append("Podezřelé genderové tvary: " + ", ".join(gender_hits.keys()))
    if missing_tag_lines:
        issues.append(f"Řádky bez voice tagu: {len(missing_tag_lines)}")
    if hashtags and "#mystickaHvezda" not in hashtags:
        issues.append("Chybí #mystickaHvezda v popiscích")
    if missing_sign_hashtags:
        issues.append("Chybí hashtag znamení: " + ", ".join(missing_sign_hashtags))
    if facebook_description and required_url not in facebook_description:
        issues.append(f"FB popisek neobsahuje {required_url}")

    return {
        "voiceover_word_count": _word_count(clean_voiceover),
        "hook_word_count": _word_count(hook),
        "hook": hook,
        "hashtags": hashtags,
        "missing_tag_lines": missing_tag_lines,
        "banned_phrase_hits": banned_hits,
        "english_word_hits": english_hits,
        "gender_hits": gender_hits,
        "issues": issues,
        "status": "ok" if not issues else "needs_review",
    }


def print_qa_report(report: dict[str, Any]) -> None:
    print("\n" + "=" * 60)
    print("QA REPORT")
    print("=" * 60)
    print(f"Status: {report.get('status', 'unknown')}")
    print(f"Voiceover words: {report.get('voiceover_word_count')}")
    print(f"Hook words: {report.get('hook_word_count')}")
    if report.get("issues"):
        for issue in report["issues"]:
            print(f"[!] {issue}")
    else:
        print("[OK] Bez nalezených deterministických problémů.")
    print("=" * 60)


def existing_output_action(path: Path, *, force: bool, reuse_existing: bool) -> str:
    if not path.exists():
        return "write"
    if reuse_existing:
        return "reuse"
    if force:
        return "write"
    return "abort"


def write_json_sidecar(txt_path: Path, payload: dict[str, Any]) -> Path:
    json_path = txt_path.with_suffix(".json")
    payload = {
        **payload,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    return json_path
