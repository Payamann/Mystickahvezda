#!/usr/bin/env python3
"""
weekly_review.py — Týdenní přehled výkonu social media agenta.

Zobrazí:
  - Počet postů za posledních 7 dní
  - Rozložení content pillars (vs. cíl 40/30/20/10)
  - Nejpoužívanější hooky a jejich průměrné skóre
  - Nejpoužívanější témata
  - Golden templates z tohoto týdne
  - Doporučení co příští týden zlepšit

Použití:
  python weekly_review.py
  python weekly_review.py --days 14   # posledních 14 dní
  python weekly_review.py --feedback "Tarot post měl 2× více saves"
"""
import argparse
import json
import sys
import io
from datetime import date, timedelta
from pathlib import Path
from collections import Counter

# Windows CP1250 fix — force UTF-8 output
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).parent))
import config
from generators.content_memory import _load_memory, record_engagement
from logger import get_logger

log = get_logger(__name__)


def get_posts_in_range(memory: dict, days: int) -> list:
    today = date.today()
    cutoff = today - timedelta(days=days)
    return [
        p for p in memory.get("used_topics", [])
        if date.fromisoformat(p["date"]) >= cutoff
    ]


def pillar_for_type(post_type: str) -> str:
    TYPE_TO_PILLAR = {
        "educational": "vzdělávání", "myth_bust": "vzdělávání",
        "story": "vzdělávání", "cross_system": "vzdělávání",
        "question": "engagement", "challenge": "engagement", "daily_energy": "engagement",
        "blog_promo": "propagace", "carousel_plan": "propagace", "tool_demo": "propagace",
        "quote": "inspirace", "tip": "inspirace", "save_worthy": "inspirace",
    }
    return TYPE_TO_PILLAR.get(post_type, "ostatní")


def print_separator(char="─", width=60):
    print(char * width)


def run_review(days: int = 7, feedback: str = ""):
    memory = _load_memory()
    posts = get_posts_in_range(memory, days)
    approved = [
        p for p in memory.get("approved_posts", [])
        if date.fromisoformat(p["date"]) >= date.today() - timedelta(days=days)
    ]

    print()
    print_separator("═")
    print(f"  📊 TÝDENNÍ REVIEW — posledních {days} dní")
    print(f"  {date.today() - timedelta(days=days)} → {date.today()}")
    print_separator("═")

    # ── Celkový počet ──
    print(f"\n  Celkem postů: {len(posts)}")
    print(f"  Schválených:  {len(approved)}")
    if approved:
        avg_score = sum(p.get("quality_score", 0) for p in approved) / len(approved)
        print(f"  Průměrné QG skóre: {avg_score:.1f}/10")

    # ── Content Pillars ──
    print_separator()
    print("  CONTENT PILLARS (cíl: 40% vzdělávání / 30% engagement / 20% propagace / 10% inspirace)")
    print_separator()
    pillar_counts = Counter(pillar_for_type(p.get("post_type", "")) for p in posts)
    total = len(posts) or 1
    targets = {"vzdělávání": 0.40, "engagement": 0.30, "propagace": 0.20, "inspirace": 0.10}
    for pillar, target in targets.items():
        count = pillar_counts.get(pillar, 0)
        ratio = count / total
        bar = "█" * int(ratio * 20)
        target_bar = "░" * int(target * 20)
        status = "✅" if abs(ratio - target) < 0.10 else ("⬆️" if ratio < target else "⬇️")
        print(f"  {status} {pillar:<12} {count:>2}× ({ratio:.0%}) cíl {target:.0%}  [{bar:<20}]")

    # ── Hooky ──
    print_separator()
    print("  HOOK VÝKON")
    print_separator()
    hook_scores = memory.get("hook_scores", {})
    if hook_scores:
        # hook_scores = {formula: [score1, score2, ...]}
        hook_stats = {
            h: {"avg": sum(scores) / len(scores), "count": len(scores)}
            for h, scores in hook_scores.items() if scores
        }
        for hook, stats in sorted(hook_stats.items(), key=lambda x: -x[1]["avg"])[:6]:
            avg = stats["avg"]
            count = stats["count"]
            bar = "█" * int(avg * 2)
            print(f"  {hook:<22} avg {avg:.1f}  {count:>2}× použit  [{bar}]")
    else:
        print("  (zatím žádná data)")

    # ── Témata ──
    print_separator()
    print("  NEJPOUŽÍVANĚJŠÍ TÉMATA (posledních 7 dní)")
    print_separator()
    topic_counts = Counter(p.get("topic", "") for p in posts)
    for topic, count in topic_counts.most_common(8):
        bar = "█" * count
        print(f"  {count}×  {topic[:45]:<45}  [{bar}]")

    # ── Golden templates ──
    golden = [
        g for g in memory.get("golden_templates", [])
        if date.fromisoformat(g.get("date", "2000-01-01")) >= date.today() - timedelta(days=days)
    ]
    if golden:
        print_separator()
        print(f"  ⭐ GOLDEN TEMPLATES tento týden ({len(golden)}×)")
        print_separator()
        for g in golden:
            print(f"  [{g.get('post_type','?')}] skóre {g.get('score','?')} — {g.get('caption','')[:60]}...")

    # ── Engagement feedback ──
    eng_log = memory.get("engagement_log", [])
    recent_eng = [
        e for e in eng_log
        if date.fromisoformat(e.get("date", "2000-01-01")) >= date.today() - timedelta(days=days)
    ]
    if recent_eng:
        print_separator()
        print("  📈 ENGAGEMENT FEEDBACK")
        print_separator()
        for e in recent_eng[-5:]:
            emoji = {"high": "🔥", "medium": "👍", "low": "👎"}.get(e.get("engagement", ""), "·")
            print(f"  {emoji} {e.get('engagement','?'):6} — {e.get('topic','?')[:40]} ({e.get('post_type','?')})")

    # ── Doporučení ──
    print_separator("═")
    print("  💡 DOPORUČENÍ NA PŘÍŠTÍ TÝDEN")
    print_separator("═")

    recommendations = []

    # Pillar doporučení
    for pillar, target in targets.items():
        count = pillar_counts.get(pillar, 0)
        ratio = count / total
        if ratio < target - 0.10:
            recommendations.append(f"⬆️  Přidej více '{pillar}' postů (máš {ratio:.0%}, cíl {target:.0%})")
        elif ratio > target + 0.15:
            recommendations.append(f"⬇️  Méně '{pillar}' postů (máš {ratio:.0%}, cíl {target:.0%})")

    # Cross_system a tool_demo check
    cross_count = sum(1 for p in posts if p.get("post_type") == "cross_system")
    tool_count = sum(1 for p in posts if p.get("post_type") == "tool_demo")
    if cross_count == 0:
        recommendations.append("🔗 Přidej aspoň 1 cross_system post — propojení systémů je unikátní obsah")
    if tool_count == 0:
        recommendations.append("🛠️  Přidej aspoň 1 tool_demo post — taste of premium konvertuje")

    # Hook doporučení
    used_hooks = set(p.get("hook_formula", "") for p in posts)
    missing_hooks = {"micro_story", "contrarian", "pattern_interrupt"} - used_hooks
    if missing_hooks:
        recommendations.append(f"🎣 Chybějící hooky tento týden: {', '.join(missing_hooks)}")

    if not recommendations:
        recommendations.append("✅ Obsah je vyvážený — pokračuj v stejném rytmu")

    for r in recommendations:
        print(f"  {r}")

    # ── Uložení manuálního feedbacku ──
    if feedback:
        print_separator()
        print(f"  📝 Ukládám feedback: {feedback}")
        record_engagement(
            post_date=date.today().isoformat(),
            post_type="weekly_review",
            topic="weekly_feedback",
            engagement="medium",
            notes=feedback,
        )
        print("  Feedback uložen do content_memory.json")

    print_separator("═")
    print()


def main():
    parser = argparse.ArgumentParser(description="Týdenní přehled výkonu social media agenta")
    parser.add_argument("--days", type=int, default=7, help="Počet dní pro analýzu (default: 7)")
    parser.add_argument("--feedback", default="", help="Manuální feedback k uložení (co fungovalo/nefungovalo)")
    args = parser.parse_args()
    run_review(days=args.days, feedback=args.feedback)


if __name__ == "__main__":
    main()
