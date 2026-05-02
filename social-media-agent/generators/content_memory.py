"""
Content Memory — sleduje použité témata a typy postů,
aby agent nevygeneroval stejný obsah dvakrát.

Atomic writes: zápis probíhá do temp souboru a poté
se přejmenuje — chrání proti poškození při crashi.
"""
import json
import random
import re
import tempfile
import os
import time
from pathlib import Path
from datetime import datetime, date
from typing import Optional
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
import config
from logger import get_logger

log = get_logger(__name__)

MEMORY_FILE = config.OUTPUT_DIR / "content_memory.json"
ATOMIC_REPLACE_ATTEMPTS = 5


_EMPTY_MEMORY = lambda: {
    "used_topics": [],
    "used_hooks": [],
    "used_post_types_last_7": [],
    "last_blog_promos": [],
    "approved_posts": [],        # schválené posty s náhledem a blog info
    "total_posts": 0,
    "total_approved": 0,
    "created_at": datetime.now().isoformat(),
    # === AUTO-LEARNING ===
    "qg_issue_log": [],          # záznamy opakujících se QG problémů
    "hook_scores": {},            # hook_formula → [score1, score2, ...] — efektivita hooků
    "engagement_log": [],         # manuální feedback o reálném engagementu
    "golden_templates": [],       # captiony s QG 8.5+ — vzorové šablony
    # === CONTENT SERIES ===
    "active_series": None,        # aktivní mini-série {name, theme, posts_planned, posts_done, start_date}
    # === WEEKLY COHESION ===
    "weekly_theme": None,         # {theme, week_start, description}
    # === CTA TRACKING ===
    "used_ctas": [],              # posledních N použitých CTA pro rotaci
}


def _load_memory() -> dict:
    if not MEMORY_FILE.exists():
        return _EMPTY_MEMORY()
    try:
        data = json.loads(MEMORY_FILE.read_text(encoding='utf-8'))
        # Zpětná kompatibilita — přidej chybějící klíče starým souborům
        for key, val in _EMPTY_MEMORY().items():
            if key not in data:
                data[key] = val
        return data
    except (json.JSONDecodeError, OSError) as e:
        log.error("Poškozený content_memory.json, vytvářím nový: %s", e)
        return _EMPTY_MEMORY()


def _save_memory(memory: dict):
    """
    Atomický zápis paměti — zapíše do temp souboru
    a přejmenuje na cílový. Při crashu zůstane starý soubor.
    """
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Zapíšeme do temp souboru ve stejném adresáři (nutné pro os.replace)
    fd, tmp_path = tempfile.mkstemp(
        suffix=".tmp",
        prefix="content_memory_",
        dir=str(config.OUTPUT_DIR),
    )
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(memory, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        # Atomický přesun — na stejném filesystému je to atomic operace
        for attempt in range(ATOMIC_REPLACE_ATTEMPTS):
            try:
                os.replace(tmp_path, str(MEMORY_FILE))
                break
            except PermissionError:
                if attempt == ATOMIC_REPLACE_ATTEMPTS - 1:
                    raise
                time.sleep(0.05 * (attempt + 1))
        log.debug("Content memory uložena atomicky: %s", MEMORY_FILE)
    except Exception:
        # Pokud se něco pokazí, smaž temp soubor
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def pick_content_intent() -> str:
    """
    Automaticky vybere záměr postu podle sledovaného poměru:
      pure_value   60% — čistě vzdělávací, žádné CTA na web
      soft_promo   25% — přirozená zmínka pokud to sedí
      direct_promo 15% — explicitní propagace nástroje/blogu

    Sleduje posledních 20 postů a vybere záměr, který je nejvíc
    pod svým cílovým poměrem.
    """
    TARGET = {"pure_value": 0.60, "soft_promo": 0.25, "direct_promo": 0.15}
    memory = _load_memory()
    today = date.today()

    recent = [
        e for e in memory.get("used_topics", [])
        if (today - date.fromisoformat(e["date"])).days <= 30
    ][-20:]  # posledních 20 postů

    if not recent:
        return "pure_value"

    counts = {"pure_value": 0, "soft_promo": 0, "direct_promo": 0}
    for e in recent:
        intent = e.get("content_intent", "pure_value")
        if intent in counts:
            counts[intent] += 1

    total = len(recent)
    # Vyber záměr s největším deficitem vůči cíli
    deficits = {k: TARGET[k] - (counts[k] / total) for k in TARGET}
    chosen = max(deficits, key=deficits.get)
    log.debug("Content intent: %s (poměr posl. 20: %s)", chosen, counts)
    return chosen


def pick_post_type_for_slot(slot_preferred_types: list[str]) -> str:
    """
    Vybere typ postu pro daný časový slot s respektováním Content Pillars.

    Content Pillars (cílový poměr):
      education   40% — educational, myth_bust, story
      engagement  30% — question, challenge, daily_energy
      promotion   20% — blog_promo, carousel_plan
      inspiration 10% — quote, tip

    Sleduje posledních 30 postů a vybere typ, jehož pilíř je nejvíc
    pod svým cílovým poměrem — ale jen z typů vhodných pro daný slot.
    """

    PILLAR_TARGETS = {
        "education": 0.40,
        "engagement": 0.30,
        "promotion": 0.20,
        "inspiration": 0.10,
    }
    TYPE_TO_PILLAR = {
        "educational": "education",
        "myth_bust": "education",
        "story": "education",
        "question": "engagement",
        "challenge": "engagement",
        "daily_energy": "engagement",
        "blog_promo": "promotion",
        "carousel_plan": "promotion",
        "quote": "inspiration",
        "tip": "inspiration",
        "cross_system": "education",
        "tool_demo": "promotion",
        "save_worthy": "inspiration",
    }

    memory = _load_memory()
    today = date.today()

    # Posledních 30 postů (10 dní × 3 denně)
    recent = [
        e for e in memory.get("used_topics", [])
        if (today - date.fromisoformat(e["date"])).days <= 10
    ][-30:]

    if not recent:
        return random.choice(slot_preferred_types)

    # Spočítej aktuální poměr pilířů
    pillar_counts = {"education": 0, "engagement": 0, "promotion": 0, "inspiration": 0}
    for e in recent:
        pt = e.get("post_type", "")
        pillar = TYPE_TO_PILLAR.get(pt)
        if pillar:
            pillar_counts[pillar] += 1

    total = len(recent)
    pillar_ratios = {k: v / total for k, v in pillar_counts.items()}

    # Deficit = target - actual (čím větší deficit, tím víc potřebujeme tento pilíř)
    pillar_deficits = {k: PILLAR_TARGETS[k] - pillar_ratios.get(k, 0) for k in PILLAR_TARGETS}

    # Z preferovaných typů pro slot vyber ten, jehož pilíř má největší deficit
    best_type = None
    best_deficit = -999

    for pt in slot_preferred_types:
        pillar = TYPE_TO_PILLAR.get(pt, "education")
        deficit = pillar_deficits.get(pillar, 0)
        if deficit > best_deficit:
            best_deficit = deficit
            best_type = pt

    return best_type or random.choice(slot_preferred_types)


def record_post(topic: str, post_type: str, hook_formula: str = "", blog_slug: str = "", content_intent: str = "pure_value"):
    """Zaznamená použitý post do paměti"""
    memory = _load_memory()

    entry = {
        "topic": topic,
        "post_type": post_type,
        "hook_formula": hook_formula,
        "content_intent": content_intent,
        "date": date.today().isoformat(),
    }

    memory["used_topics"].append(entry)
    memory["used_post_types_last_7"].append({
        "type": post_type,
        "date": date.today().isoformat(),
    })
    memory["total_posts"] = memory.get("total_posts", 0) + 1

    if hook_formula:
        memory["used_hooks"].append({
            "formula": hook_formula,
            "date": date.today().isoformat(),
        })

    if blog_slug:
        memory["last_blog_promos"].append({
            "slug": blog_slug,
            "date": date.today().isoformat(),
        })

    # Udržuj max 100 záznamů
    for key in ["used_topics", "used_post_types_last_7", "used_hooks", "last_blog_promos"]:
        if len(memory.get(key, [])) > 100:
            memory[key] = memory[key][-100:]

    _save_memory(memory)


def record_approved_post(
    topic: str,
    post_type: str,
    caption: str,
    quality_score: float,
    content_intent: str = "pure_value",
    blog_slugs: Optional[list] = None,
):
    """
    Zaznamená schválený post (prošel Quality Gate) do paměti.
    Automaticky extrahuje zmíněné blog slugy z caption textu.

    Volej po QG schválení — odlišné od record_post() který sleduje
    i zamítnuté pokusy. approved_posts = jen to co skutečně publikujeme.
    """
    memory = _load_memory()

    # Automatická extrakce blog slugů z caption (URL vzor /blog/slug.html)
    extracted_slugs = re.findall(r'/blog/([\w-]+)\.html', caption)
    all_slugs = list(set((blog_slugs or []) + extracted_slugs))

    entry = {
        "topic": topic,
        "post_type": post_type,
        "caption_preview": caption[:100].replace("\n", " ").strip(),
        "quality_score": round(quality_score, 1),
        "content_intent": content_intent,
        "blog_slugs": all_slugs,
        "date": date.today().isoformat(),
    }

    memory.setdefault("approved_posts", []).append(entry)
    memory["total_approved"] = memory.get("total_approved", 0) + 1

    # Také aktualizuj last_blog_promos pro zpětnou kompatibilitu
    for slug in all_slugs:
        memory.setdefault("last_blog_promos", []).append({
            "slug": slug,
            "date": date.today().isoformat(),
        })

    # Udržuj max 200 schválených postů (delší paměť než used_topics)
    if len(memory["approved_posts"]) > 200:
        memory["approved_posts"] = memory["approved_posts"][-200:]
    if len(memory.get("last_blog_promos", [])) > 100:
        memory["last_blog_promos"] = memory["last_blog_promos"][-100:]

    _save_memory(memory)
    log.info(
        "Schválený post uložen do paměti: '%s' / %s (skóre %.1f, blogy: %s)",
        topic, post_type, quality_score, all_slugs or "žádné"
    )


def get_variety_context() -> dict:
    """
    Vrátí kontext pro prompt, aby se vyhnul opakování.
    Zahrnuje témata, typy, hooky i naposledy použité blog články.
    """
    memory = _load_memory()
    today = date.today()

    # Témata použitá v posledních 14 dnech
    recent_topics = [
        e["topic"] for e in memory.get("used_topics", [])
        if (today - date.fromisoformat(e["date"])).days <= 14
    ]

    # Typy postů z posledních 7 dní
    recent_types = [
        e["type"] for e in memory.get("used_post_types_last_7", [])
        if (today - date.fromisoformat(e["date"])).days <= 7
    ]

    # Hooky z posledních 21 dní
    recent_hooks = [
        e["formula"] for e in memory.get("used_hooks", [])
        if (today - date.fromisoformat(e["date"])).days <= 21
    ]

    # Blog slugy ze schválených postů (posledních 60 dní) — hlavní zdroj
    approved_blog_slugs = []
    for e in memory.get("approved_posts", []):
        if (today - date.fromisoformat(e["date"])).days <= 60:
            approved_blog_slugs.extend(e.get("blog_slugs", []))

    # Fallback: starý last_blog_promos (30 dní)
    legacy_blog_slugs = [
        e["slug"] for e in memory.get("last_blog_promos", [])
        if (today - date.fromisoformat(e["date"])).days <= 30
    ]

    all_blog_slugs = list(set(approved_blog_slugs + legacy_blog_slugs))

    # Nedávné caption preview — pro kontrolu duplicit
    recent_captions = [
        e.get("caption_preview", "")
        for e in memory.get("approved_posts", [])
        if (today - date.fromisoformat(e["date"])).days <= 30
    ]

    has_any = recent_topics or recent_types or recent_hooks
    blog_avoid = (
        f"\nVYHNI SE těmto blog článkům (již propagovány v posl. 60 dnech): "
        f"{', '.join(all_blog_slugs)}"
    ) if all_blog_slugs else ""

    return {
        "recent_topics": list(set(recent_topics)),
        "recent_post_types": list(set(recent_types)),
        "recent_hooks": list(set(recent_hooks)),
        "recent_blog_slugs": all_blog_slugs,
        "recent_captions": recent_captions[-10:],
        "total_posts": memory.get("total_posts", 0),
        "total_approved": memory.get("total_approved", 0),
        "avoid_instruction": (
            f"VYHNI SE těmto tématům (použita v posl. 14 dnech): {', '.join(set(recent_topics)) or 'zatím žádná'}\n"
            f"VYHNI SE těmto typům postů (posl. 7 dní): {', '.join(set(recent_types)) or 'zatím žádné'}\n"
            f"VYHNI SE těmto hook formulím (posl. 21 dní): {', '.join(set(recent_hooks)) or 'zatím žádné'}"
            f"{blog_avoid}"
        ) if has_any else blog_avoid
    }


def get_promoted_blog_slugs() -> list[str]:
    """Vrátí slugy blogů propagovaných za posledních 60 dní"""
    return get_variety_context()["recent_blog_slugs"]


def get_approved_post_stats() -> dict:
    """Vrátí statistiky schválených postů (pro příkaz list)."""
    memory = _load_memory()
    today = date.today()
    approved = memory.get("approved_posts", [])

    last_30 = [e for e in approved if (today - date.fromisoformat(e["date"])).days <= 30]
    avg_score = round(sum(e["quality_score"] for e in last_30) / len(last_30), 1) if last_30 else 0
    blog_count = sum(1 for e in last_30 if e.get("blog_slugs"))

    return {
        "total_approved": memory.get("total_approved", 0),
        "last_30_days": len(last_30),
        "avg_quality_score": avg_score,
        "blog_posts_last_30": blog_count,
        "recent": last_30[-5:],  # posledních 5
    }


# ══════════════════════════════════════════════════
# AUTO-LEARNING: QG Issue Tracking
# ══════════════════════════════════════════════════

def record_qg_issues(post_type: str, issues: list[dict], ai_review: dict | None = None):
    """
    Zaznamená QG problémy pro učení. Sleduje opakující se vzorce
    a umožňuje generátoru se jim v budoucnu vyhnout.

    Args:
        post_type: typ postu (educational, quote, ...)
        issues: seznam issue dictů z QG rule checks
        ai_review: dict z AI review (scores, improvements)
    """
    memory = _load_memory()

    # Extrahuj jen warning/error issues (ne info)
    significant = [
        {"check": i["check"], "message": i["message"][:120]}
        for i in issues
        if i.get("severity") in ("error", "warning")
    ]

    # Extrahuj slabé oblasti z AI review (skóre < 7)
    weak_areas = []
    if ai_review and isinstance(ai_review.get("scores"), dict):
        weak_areas = [
            {"area": area, "score": score}
            for area, score in ai_review["scores"].items()
            if isinstance(score, (int, float)) and score < 7
        ]

    if not significant and not weak_areas:
        return  # nic k zaznamenání

    entry = {
        "date": date.today().isoformat(),
        "post_type": post_type,
        "rule_issues": significant,
        "weak_areas": weak_areas,
        "ai_improvements": (ai_review or {}).get("improvements", [])[:3],
    }

    memory.setdefault("qg_issue_log", []).append(entry)

    # Udržuj max 100 záznamů
    if len(memory["qg_issue_log"]) > 100:
        memory["qg_issue_log"] = memory["qg_issue_log"][-100:]

    _save_memory(memory)
    log.debug("QG issues zaznamenány: %d pravidel, %d slabých oblastí", len(significant), len(weak_areas))


def record_hook_score(hook_formula: str, score: float):
    """Zaznamená QG skóre pro konkrétní hook formuli — umožní rankovat efektivitu hooků."""
    if not hook_formula:
        return

    memory = _load_memory()
    hook_scores = memory.setdefault("hook_scores", {})
    hook_scores.setdefault(hook_formula, []).append(round(score, 1))

    # Udržuj max 20 skóre na hook (posledních 20 použití)
    if len(hook_scores[hook_formula]) > 20:
        hook_scores[hook_formula] = hook_scores[hook_formula][-20:]

    _save_memory(memory)


def record_engagement(post_date: str, post_type: str, topic: str, engagement: str, notes: str = ""):
    """
    Zaznamená manuální feedback o reálném engagementu postu.

    Args:
        post_date: datum postu (YYYY-MM-DD)
        post_type: typ postu
        topic: téma postu
        engagement: "high" / "medium" / "low"
        notes: volitelná poznámka (co fungovalo / nefungovalo)
    """
    memory = _load_memory()

    entry = {
        "date": post_date,
        "rated_at": date.today().isoformat(),
        "post_type": post_type,
        "topic": topic,
        "engagement": engagement,
        "notes": notes,
    }

    memory.setdefault("engagement_log", []).append(entry)

    # Udržuj max 200 záznamů
    if len(memory["engagement_log"]) > 200:
        memory["engagement_log"] = memory["engagement_log"][-200:]

    _save_memory(memory)
    log.info("Engagement zaznamenán: %s / %s = %s", topic, post_type, engagement)


def get_learned_lessons() -> str:
    """
    Analyzuje historii QG problémů a engagement dat.
    Vrátí textovou instrukci pro generátor — co se naučil z minulých chyb.

    Returns:
        str: instrukce pro prompt (prázdný string pokud není co říct)
    """
    memory = _load_memory()
    today = date.today()
    lessons = []

    # ── 1. Opakující se QG problémy (posledních 30 dní) ──
    qg_log = [
        e for e in memory.get("qg_issue_log", [])
        if (today - date.fromisoformat(e["date"])).days <= 30
    ]

    if qg_log:
        # Počítej frekvenci problémových oblastí
        issue_counts: dict[str, int] = {}
        for entry in qg_log:
            for issue in entry.get("rule_issues", []):
                check = issue.get("check", "unknown")
                issue_counts[check] = issue_counts.get(check, 0) + 1
            for weak in entry.get("weak_areas", []):
                area = weak.get("area", "unknown")
                issue_counts[f"ai_{area}"] = issue_counts.get(f"ai_{area}", 0) + 1

        # Top 3 nejčastější problémy
        top_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        if top_issues and top_issues[0][1] >= 2:  # alespoň 2× opakování
            issue_map = {
                "hook_strength": "SLABÉ HOOKY — začni odvážněji, konkrétním faktem nebo provokativní otázkou",
                "ai_hook": "SLABÉ HOOKY — první 2 řádky musí zastavit scrollování",
                "brand_voice": "BRAND VOICE — tón musí být teplý, moudrý, přístupný (ne korporátní)",
                "ai_brand_voice": "BRAND VOICE — přirozený tón Mystické Hvězdy, ne generický",
                "ai_value": "NÍZKÁ HODNOTA — post musí obsahovat konkrétní znalost, ne vágní fráze",
                "ai_language": "JAZYK — přirozená čeština bez klišé a anglicismů",
                "ai_engagement": "ENGAGEMENT — přidej osobní otázku nebo výzvu k akci",
                "cta_missing": "CHYBÍ CTA — každý post potřebuje výzvu k interakci",
                "english_leak": "ANGLIČTINA V TEXTU — piš čistě česky",
                "emoji_count": "PŘÍLIŠ EMOJI — max 4, strategicky",
                "caption_length": "DÉLKA TEXTU — dodržuj limit pro platformu",
                "ai_image_prompt": "SLABÝ IMAGE PROMPT — více detailů, dodržuj brand styl",
                "ai_hashtags": "HASHTAGY — relevantnější mix, ne generické",
            }
            recurring = []
            for check, count in top_issues:
                desc = issue_map.get(check, check.replace("ai_", "").replace("_", " ").upper())
                recurring.append(f"  • {desc} (opakuje se {count}×)")
            lessons.append(
                "UČENÍ Z MINULÝCH CHYB (tyto problémy se opakovaly — VYHNI SE JIM):\n"
                + "\n".join(recurring)
            )

        # Nejčastější AI improvement tipy
        all_improvements: dict[str, int] = {}
        for entry in qg_log[-15:]:  # posledních 15
            for tip in entry.get("ai_improvements", []):
                # Normalizuj tip na klíčové slovo
                tip_lower = tip.lower()[:60]
                all_improvements[tip_lower] = all_improvements.get(tip_lower, 0) + 1

        repeated_tips = [tip for tip, count in all_improvements.items() if count >= 2]
        if repeated_tips:
            lessons.append(
                "OPAKOVANÉ TIPY OD AI REVIEWERA:\n"
                + "\n".join(f"  • {t}" for t in repeated_tips[:3])
            )

    # ── 2. Hook efektivita ──
    hook_scores = memory.get("hook_scores", {})
    if hook_scores:
        # Průměrné skóre per hook
        avg_scores = {}
        for hook, scores in hook_scores.items():
            if len(scores) >= 2:  # alespoň 2 použití
                avg_scores[hook] = round(sum(scores) / len(scores), 1)

        if avg_scores:
            best = sorted(avg_scores.items(), key=lambda x: x[1], reverse=True)[:3]
            worst = sorted(avg_scores.items(), key=lambda x: x[1])[:2]

            if best and best[0][1] >= 7.0:
                lessons.append(
                    "NEJEFEKTIVNĚJŠÍ HOOK FORMULE (preferuj tyto):\n"
                    + "\n".join(f"  • {h} (průměr {s}/10)" for h, s in best)
                )
            if worst and worst[0][1] < 6.5:
                lessons.append(
                    "MÉNĚ EFEKTIVNÍ HOOKY (použij jen s opatrností):\n"
                    + "\n".join(f"  • {h} (průměr {s}/10)" for h, s in worst)
                )

    # ── 3. Engagement feedback ──
    eng_log = [
        e for e in memory.get("engagement_log", [])
        if (today - date.fromisoformat(e["rated_at"])).days <= 60
    ]

    if eng_log:
        # Co funguje: high engagement témata a typy
        high_topics = [e["topic"] for e in eng_log if e["engagement"] == "high"]
        low_topics = [e["topic"] for e in eng_log if e["engagement"] == "low"]
        high_types = [e["post_type"] for e in eng_log if e["engagement"] == "high"]

        if high_topics:
            # Deduplikace
            unique_high = list(dict.fromkeys(high_topics))[:5]
            lessons.append(
                f"TÉMATA S VYSOKÝM ENGAGEMENTEM (dělej více podobného): {', '.join(unique_high)}"
            )
        if low_topics:
            unique_low = list(dict.fromkeys(low_topics))[:3]
            lessons.append(
                f"TÉMATA S NÍZKÝM ENGAGEMENTEM (přistupuj jinak): {', '.join(unique_low)}"
            )
        if high_types:
            from collections import Counter
            type_counts = Counter(high_types).most_common(3)
            lessons.append(
                "NEJÚSPĚŠNĚJŠÍ TYPY POSTŮ: "
                + ", ".join(f"{t} ({c}× high)" for t, c in type_counts)
            )

        # Poznámky z feedbacku
        useful_notes = [e["notes"] for e in eng_log if e.get("notes") and e["engagement"] == "high"]
        if useful_notes:
            lessons.append(
                "CO FUNGOVALO (z manuálního feedbacku):\n"
                + "\n".join(f"  • {n[:100]}" for n in useful_notes[-3:])
            )

    if not lessons:
        return ""

    return "\n\n".join(lessons)


def get_hook_ranking() -> dict[str, float]:
    """Vrátí průměrné QG skóre per hook formula. Prázdný dict pokud nejsou data."""
    memory = _load_memory()
    hook_scores = memory.get("hook_scores", {})
    return {
        hook: round(sum(scores) / len(scores), 1)
        for hook, scores in hook_scores.items()
        if len(scores) >= 2
    }


def get_learning_stats() -> dict:
    """Vrátí statistiky auto-learning systému pro cmd_status."""
    memory = _load_memory()
    today = date.today()

    qg_log = memory.get("qg_issue_log", [])
    recent_qg = [e for e in qg_log if (today - date.fromisoformat(e["date"])).days <= 30]

    hook_scores = memory.get("hook_scores", {})
    hooks_with_data = {h: scores for h, scores in hook_scores.items() if len(scores) >= 2}

    eng_log = memory.get("engagement_log", [])
    recent_eng = [e for e in eng_log if (today - date.fromisoformat(e["rated_at"])).days <= 60]

    golden = memory.get("golden_templates", [])

    return {
        "qg_issues_tracked": len(recent_qg),
        "hooks_ranked": len(hooks_with_data),
        "engagement_ratings": len(recent_eng),
        "golden_templates": len(golden),
        "has_lessons": bool(get_learned_lessons()),
    }


# ══════════════════════════════════════════════════
# GOLDEN TEMPLATES — učení z nejlepších postů
# ══════════════════════════════════════════════════

GOLDEN_THRESHOLD = 8.5  # QG skóre pro zařazení do golden templates

def record_golden_template(post_type: str, caption: str, hook_formula: str, score: float):
    """
    Uloží caption s vysokým QG skóre jako vzorovou šablonu.
    Automaticky voláno po schválení postu s skóre >= GOLDEN_THRESHOLD.
    """
    if score < GOLDEN_THRESHOLD:
        return

    memory = _load_memory()
    golden = memory.setdefault("golden_templates", [])

    # Deduplikace — nesdílej podobné captiony
    caption_start = caption[:60].lower()
    for existing in golden:
        if existing.get("caption_start", "")[:60].lower() == caption_start:
            return  # už existuje podobný

    entry = {
        "post_type": post_type,
        "hook_formula": hook_formula,
        "caption_start": caption[:200].replace("\n", " ").strip(),
        "caption_length": len(caption.split()),
        "score": round(score, 1),
        "date": date.today().isoformat(),
    }

    golden.append(entry)

    # Max 30 golden templates (nejnovější)
    if len(golden) > 30:
        golden.sort(key=lambda x: x["score"], reverse=True)
        memory["golden_templates"] = golden[:30]

    _save_memory(memory)
    log.info("Golden template uložen: %s / %s (skóre %.1f)", post_type, hook_formula, score)


def get_golden_examples(post_type: str = None, limit: int = 3) -> str:
    """
    Vrátí textovou sekci s golden templates pro injekci do promptu.
    Pokud je zadán post_type, preferuje šablony stejného typu.
    """
    memory = _load_memory()
    golden = memory.get("golden_templates", [])

    if not golden:
        return ""

    # Preferuj šablony stejného typu, pak ostatní
    same_type = [g for g in golden if g["post_type"] == post_type] if post_type else []
    other = [g for g in golden if g["post_type"] != post_type] if post_type else golden

    selected = (same_type[:2] + other[:1]) if same_type else other[:limit]

    if not selected:
        return ""

    examples = []
    for g in selected:
        examples.append(
            f"  [{g['post_type']}] (QG {g['score']}/10, hook: {g['hook_formula']})\n"
            f"  \"{g['caption_start']}…\""
        )

    return (
        "GOLDEN TEMPLATES — tak vypadá perfektní post (inspiruj se strukturou, ne obsahem):\n"
        + "\n\n".join(examples)
    )


# ══════════════════════════════════════════════════
# CONTENT SERIES — mini-série postů
# ══════════════════════════════════════════════════

def start_series(name: str, theme: str, total_posts: int = 3, description: str = ""):
    """Zahájí novou mini-sérii (3-5 postů na jedno téma)."""
    memory = _load_memory()
    memory["active_series"] = {
        "name": name,
        "theme": theme,
        "description": description,
        "posts_planned": total_posts,
        "posts_done": 0,
        "start_date": date.today().isoformat(),
        "post_history": [],  # stručný přehled co již bylo
    }
    _save_memory(memory)
    log.info("Série zahájena: '%s' (%d postů)", name, total_posts)


def advance_series(post_summary: str):
    """Posune sérii o jeden post dopředu."""
    memory = _load_memory()
    series = memory.get("active_series")
    if not series:
        return

    series["posts_done"] += 1
    series["post_history"].append(post_summary[:100])

    if series["posts_done"] >= series["posts_planned"]:
        log.info("Série '%s' dokončena!", series["name"])
        memory["active_series"] = None
    else:
        log.info("Série '%s': %d/%d", series["name"], series["posts_done"], series["posts_planned"])

    _save_memory(memory)


def get_series_context() -> str:
    """Vrátí kontext aktivní série pro injekci do promptu."""
    memory = _load_memory()
    series = memory.get("active_series")
    if not series:
        return ""

    done = series["posts_done"]
    total = series["posts_planned"]
    history = "\n".join(f"  {i+1}. {p}" for i, p in enumerate(series.get("post_history", [])))

    return f"""
AKTIVNÍ MINI-SÉRIE: "{series['name']}" — post {done + 1} z {total}
Téma série: {series['theme']}
{('Popis: ' + series['description']) if series.get('description') else ''}
{'Předchozí posty v sérii:' + chr(10) + history if history else 'Toto je první post série.'}

PRAVIDLA SÉRIE:
- Navazuj na předchozí posty — čtenář musí cítit kontinuitu
- Začni odkazem na minulý díl: "Včera jsme mluvili o X, dnes jdeme hlouběji..."
- Buduj napětí — na konci naznač co přijde příště
- Každý díl musí stát i sám o sobě (pro ty co neviděli předchozí)
"""


# ══════════════════════════════════════════════════
# WEEKLY COHESION — téma týdne
# ══════════════════════════════════════════════════

def set_weekly_theme(theme: str, description: str = ""):
    """Nastaví téma týdne — všechny posty budou mít společný tón."""
    memory = _load_memory()
    # Začátek týdne = pondělí
    today = date.today()
    week_start = today - __import__("datetime").timedelta(days=today.weekday())

    memory["weekly_theme"] = {
        "theme": theme,
        "description": description,
        "week_start": week_start.isoformat(),
    }
    _save_memory(memory)
    log.info("Téma týdne nastaveno: '%s'", theme)


def get_weekly_theme_context() -> str:
    """Vrátí kontext tématu týdne pro injekci do promptu."""
    memory = _load_memory()
    wt = memory.get("weekly_theme")
    if not wt:
        return ""

    # Kontrola zda je stále aktuální (max 7 dní)
    today = date.today()
    try:
        start = date.fromisoformat(wt["week_start"])
        if (today - start).days > 7:
            return ""  # expirované
    except (ValueError, KeyError):
        return ""

    return f"""
TÉMA TÝDNE: "{wt['theme']}"
{('Popis: ' + wt['description']) if wt.get('description') else ''}
Všechny posty tento týden by měly rezonovat s tímto tématem.
Ne každý post musí být přímo o tomto tématu — ale tón, metafory nebo závěrečná
myšlenka by měly směřovat k weekly theme. Buduje to koherenci a profesionální dojem.
"""


# ══════════════════════════════════════════════════
# CTA LIBRARY s rotací
# ══════════════════════════════════════════════════

# ============================================================
# ENGAGEMENT BOOSTERS — techniky pro konkrétní metriky
# ============================================================

ENGAGEMENT_BOOSTERS = {
    "save_triggers": [
        "📌 Ulož si tohle na později — budeš to potřebovat.",
        "Tohle si ulož. Až přijde ten moment, budeš vědět proč.",
        "Save-worthy? Pokud ano, klikni na záložku 📎",
        "Tenhle post si zaslouží bookmark — vrátíš se k němu.",
    ],
    "share_triggers": [
        "Označ kamarádku, která to potřebuje slyšet 💜",
        "Sdílej do stories — možná to dnes někdo potřebuje víc než ty.",
        "Pošli to někomu, na koho jsi při čtení myslela.",
        "Sdílej → někdo v tvém okolí tohle právě teď hledá.",
    ],
    "comment_starters": [
        "A nebo B? Napiš do komentářů 👇",
        "Jedním slovem — co ti teď přišlo na mysl? Napiš to dole.",
        "Souhlasíš, nebo vidíš to jinak? Zajímá mě tvůj pohled.",
        "Napiš emoji, která vystihuje tvůj dnešní stav 🌙",
        "Odpověz jednou větou — první, co tě napadne.",
    ],
    "poll_binary": [
        "Intuice 🌙 nebo logika 🧠? Co volíš?",
        "Ráno 🌅 nebo večer 🌙? Kdy je tvá energie nejsilnější?",
        "Tarot 🃏 nebo astrologie ⭐? Co ti dává víc?",
    ],
}

# ============================================================
# MICRO-INTERACTIONS — drobné engagement triggery v textu
# ============================================================

MICRO_INTERACTIONS = [
    "Dej 🔥 pokud ti tohle rezonuje.",
    "Double tap, pokud tohle znáš.",
    "Dej ❤️ pokud souhlasíš — chci vědět, kolik nás je.",
    "Napiš ANO do komentáře, pokud jsi to taky zažila.",
    "Klikni na 💾 — tenhle post si zaslouží záložku.",
    "Pošli to kamarádce — ví proč.",
    "Napiš svou kartu / číslo / znamení do komentáře 👇",
    "Dej 🙌 pokud jsi to potřebovala slyšet.",
]


CTA_LIBRARY = {
    "engagement": [
        "Napiš mi do komentářů svou zkušenost",
        "Označ někoho, kdo to potřebuje slyšet",
        "Sdílej to do stories, ať to vidí víc lidí",
        "Co tě napadlo jako první? Napiš to dole",
        "Souhlasíš? Dej ❤️ pokud ano",
        "Jaká je tvá zkušenost? Zajímá mě tvůj příběh",
        "Dej vědět v komentářích, jestli to rezonuje",
        "Řekni mi — které téma chceš probrat příště?",
    ],
    "save": [
        "Ulož si tohle na později",
        "Tohle si bookmarkni — budeš to potřebovat",
        "Ulož a vrať se k tomu, až to budeš potřebovat",
        "Sdílej s někým, kdo prochází podobným",
    ],
    "web": [
        "Víc se dozvíš na mystickahvezda.cz",
        "Vyzkoušej si to zdarma na mystickahvezda.cz",
        "Odkaz na nástroj najdeš v biu",
        "Pronikni hlouběji — článek čeká na mystickahvezda.cz",
    ],
    "reflection": [
        "Zavři oči a polož si tu otázku znovu. Co přijde?",
        "Zkus si to dnes večer zapsat do deníku",
        "Nech to v sobě chvíli být. Odpověď přijde",
        "Dnes večer si na to vzpomeň — a všimni si, co cítíš",
    ],
}


def pick_cta(content_intent: str, post_type: str) -> str:
    """
    Vybere CTA z knihovny — rotuje, aby se neopakovalo.

    Args:
        content_intent: pure_value / soft_promo / direct_promo
        post_type: typ postu pro lepší výběr kategorie
    """
    memory = _load_memory()
    used_ctas = memory.get("used_ctas", [])

    # Vyber kategorii podle intentu a typu
    if content_intent == "pure_value":
        if post_type in ("question", "challenge"):
            pool = CTA_LIBRARY["engagement"]
        elif post_type in ("save_worthy", "tip"):
            pool = CTA_LIBRARY["save"]
        else:
            pool = CTA_LIBRARY["engagement"] + CTA_LIBRARY["reflection"]
    elif content_intent == "soft_promo":
        pool = CTA_LIBRARY["engagement"] + CTA_LIBRARY["web"][:2]
    else:  # direct_promo
        pool = CTA_LIBRARY["web"] + CTA_LIBRARY["engagement"][:3]

    # Vyhni se naposledy použitým
    available = [c for c in pool if c not in used_ctas[-6:]]
    if not available:
        available = pool  # fallback

    chosen = random.choice(available)

    # Zaznamenej
    used_ctas.append(chosen)
    if len(used_ctas) > 30:
        used_ctas = used_ctas[-30:]
    memory["used_ctas"] = used_ctas
    _save_memory(memory)

    return chosen


def pick_engagement_booster(post_type: str, content_intent: str) -> str:
    """
    Vybere engagement booster + micro-interaction podle typu postu.
    Vrátí text pro injekci do promptu.
    """
    # Vyber kategorii boosteru podle typu postu
    if post_type in ("save_worthy", "tip", "educational", "carousel_plan"):
        category = "save_triggers"
    elif post_type in ("quote", "story", "daily_energy"):
        category = "share_triggers"
    elif post_type in ("question", "challenge"):
        category = "comment_starters"
    else:
        category = random.choice(["save_triggers", "share_triggers", "comment_starters"])

    booster = random.choice(ENGAGEMENT_BOOSTERS[category])
    micro = random.choice(MICRO_INTERACTIONS)

    # Pro pure_value nepřidávej poll_binary (příliš agresivní)
    poll = ""
    if content_intent != "pure_value" and post_type in ("question", "challenge"):
        poll = f"\n  Volitelně binární volba: \"{random.choice(ENGAGEMENT_BOOSTERS['poll_binary'])}\""

    return (
        f"ENGAGEMENT BOOSTER (zapracuj přirozeně, ne násilně):\n"
        f"  Primární: \"{booster}\"\n"
        f"  Micro-interaction: \"{micro}\"{poll}"
    )
