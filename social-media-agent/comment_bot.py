"""
Comment Bot — automatický agent pro odpovídání na Facebook komentáře

Režimy:
  --auto     Automaticky odpoví na všechny komentáře bez potvrzení
  --review   (výchozí) Zobrazí návrhy, po 30 min bez akce odpoví sám
  --dry-run  Jen zobrazí co by odpověděl, nic neposílá

Spuštění:
  python comment_bot.py              # review mode, jednorázově
  python comment_bot.py --auto       # auto mode, jednorázově
  python comment_bot.py --loop       # polling každých 15 min (pro Railway)
  python comment_bot.py --dry-run    # test bez odesílání
"""

import argparse
import sys
import time
import os
import random
import json
from datetime import datetime, date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env", override=True, encoding="utf-8")

import config
from comment_manager import (
    sync_comments,
    regenerate_replies,
    get_pending_comments,
    save_comment_replies_batch,
    reply_to_comment,
    hide_comment,
    get_stats,
)
from generators.text_generator import generate_comment_reply
from logger import get_logger

log = get_logger("comment_bot")

POLL_INTERVAL    = int(os.getenv("COMMENT_POLL_INTERVAL", "900"))   # 15 min
AUTO_REPLY_DELAY = int(os.getenv("AUTO_REPLY_DELAY", "1800"))        # 30 min v review mode
REPLY_DELAY_MIN  = int(os.getenv("REPLY_DELAY_MIN", "45"))           # min. sekund mezi odpověďmi
REPLY_DELAY_MAX  = int(os.getenv("REPLY_DELAY_MAX", "120"))          # max. sekund mezi odpověďmi
DAILY_LIMIT      = int(os.getenv("DAILY_REPLY_LIMIT", "200"))        # max odpovědí za den

# Soubor pro sledování denního počtu odpovědí
_DAILY_COUNTER_FILE = Path(__file__).parent / "output" / "daily_reply_counter.json"


def _get_today_count() -> int:
    """Vrátí počet odpovědí odeslaných dnes."""
    if not _DAILY_COUNTER_FILE.exists():
        return 0
    try:
        data = json.loads(_DAILY_COUNTER_FILE.read_text(encoding="utf-8"))
        if data.get("date") == str(date.today()):
            return data.get("count", 0)
    except Exception:
        pass
    return 0


def _increment_today_count():
    """Zvýší denní počítač odpovědí o 1."""
    count = _get_today_count() + 1
    _DAILY_COUNTER_FILE.parent.mkdir(parents=True, exist_ok=True)
    _DAILY_COUNTER_FILE.write_text(
        json.dumps({"date": str(date.today()), "count": count}),
        encoding="utf-8",
    )
    return count


def _human_delay(mode: str):
    """Přidá náhodnou pauzu mezi odpověďmi — simuluje lidské chování."""
    if mode == "dry-run":
        return
    delay = random.uniform(REPLY_DELAY_MIN, REPLY_DELAY_MAX)
    log.debug("Čekám %.0fs před další odpovědí...", delay)
    time.sleep(delay)


# ══════════════════════════════════════════════════
# VÝPIS
# ══════════════════════════════════════════════════

def _sep():
    print("─" * 60)


def _print_comment(c: dict, idx: int):
    sentiment_emoji = {
        "question":  "❓",
        "positive":  "💚",
        "skeptical": "🤔",
        "neutral":   "💬",
        "off_topic": "↗️",
        "spam":      "🚫",
        "negative":  "⛔",
    }.get(c.get("sentiment", ""), "💬")

    print(f"\n[{idx}] {sentiment_emoji} {c['from_name']}  |  priorita: {c.get('priority', 0)}")
    print(f"     POST: {c.get('post_message', '')[:60]}...")
    print(f"     KOMENTÁŘ: {c['message']}")
    if c.get("suggested_reply"):
        print(f"     NÁVRH ODPOVĚDI: {c['suggested_reply']}")
    else:
        print(f"     (bez návrhu odpovědi)")


# ══════════════════════════════════════════════════
# ZPRACOVÁNÍ JEDNOHO KOMENTÁŘE
# ══════════════════════════════════════════════════

def process_comment(comment: dict, mode: str) -> bool:
    """
    Zpracuje jeden komentář podle režimu.
    Vrací True pokud byla odeslána odpověď.
    """
    cid = comment["id"]
    reply = comment.get("suggested_reply")

    # Skryj spam/hate bez odpovědi
    if comment.get("should_hide"):
        if mode != "dry-run":
            result = hide_comment(cid, comment.get("platform", "facebook"))
            log.info("Skryto [%s]: %s", cid, comment["message"][:40])
        else:
            print(f"  [DRY-RUN] Skryji spam: {comment['message'][:40]}")
        return False

    # Bez návrhu odpovědi přeskoč
    if not reply:
        log.debug("Bez návrhu odpovědi, přeskakuji: %s", cid)
        return False

    if mode == "dry-run":
        print(f"  [DRY-RUN] Odpověděl bych: {reply[:80]}...")
        return False

    if mode == "auto":
        _human_delay(mode)
        result = reply_to_comment(cid, reply)
        if result["success"]:
            count = _increment_today_count()
            print(f"  ✅ Odpovězeno [{count}/{DAILY_LIMIT}] na [{comment['from_name']}]: {reply[:60]}...")
            log.info("Auto-odpověď odeslána: %s", cid)
            return True
        else:
            print(f"  ❌ Chyba: {result.get('error')}")
            log.error("Chyba při odpovídání %s: %s", cid, result.get("error"))
            return False

    if mode == "review":
        # Semi-auto: zobraz návrh, čekej na vstup nebo timeout
        print(f"\n  💬 {comment['from_name']}: {comment['message']}")
        print(f"  📝 Návrh: {reply}")
        print(f"  [Enter=odešli | s=přeskoč | e=uprav]  ", end="", flush=True)

        # Na Railway (non-interactive) — chovej se jako auto mode (s delay + counter)
        if not sys.stdin.isatty():
            print("(auto-odesílám — non-interactive)")
            _human_delay("auto")
            result = reply_to_comment(cid, reply)
            if result["success"]:
                _increment_today_count()
            return result["success"]

        try:
            import select
            rlist, _, _ = select.select([sys.stdin], [], [], 30)
            if rlist:
                choice = sys.stdin.readline().strip().lower()
            else:
                choice = ""   # timeout → odešli
        except (AttributeError, ImportError):
            # Windows nemá select pro stdin
            choice = input().strip().lower()

        if choice == "s":
            print("  ⏭ Přeskočeno")
            return False
        elif choice == "e":
            new_reply = input("  Nový text: ").strip()
            if new_reply:
                result = reply_to_comment(cid, new_reply)
            else:
                result = reply_to_comment(cid, reply)
        else:
            result = reply_to_comment(cid, reply)

        if result["success"]:
            print(f"  ✅ Odesláno")
            return True
        else:
            print(f"  ❌ Chyba: {result.get('error')}")
            return False

    return False


# ══════════════════════════════════════════════════
# HLAVNÍ RUN
# ══════════════════════════════════════════════════

def run_once(mode: str, limit: int = 0):
    """Jeden běh: sync → zpracuj → vypiš statistiky. limit=0 znamená bez omezení."""

    if not config.META_ACCESS_TOKEN:
        print("❌ META_ACCESS_TOKEN není nastaven v .env")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"🤖 Comment Bot  |  {datetime.now().strftime('%Y-%m-%d %H:%M')}  |  mode: {mode}")
    print(f"{'='*60}")

    # 1. Synchronizuj komentáře
    print("\n📥 Synchronizuji komentáře...")
    try:
        since = 168 if mode == "dry-run" else 48  # dry-run vidí víc; auto jen čerstvé
        stats = sync_comments(since_hours=since)
        print(f"   Nové: {stats['added']}  |  Celkem v DB: {stats['total_in_db']}")
    except Exception as e:
        print(f"❌ Sync selhal: {e}")
        log.error("Sync selhal: %s", e, exc_info=True)
        return

    # 2. Načti nevyřízené a ořízni na limit — teprve pak generuj odpovědi
    pending = get_pending_comments(min_priority=3)
    if limit > 0:
        pending = pending[:limit]

    # 3. Generuj odpovědi přesně pro N komentářů (Claude API se zavolá max limit×)
    _TONE_MAP = {
        "question": "educational", "positive": "friendly",
        "skeptical": "empathetic", "neutral": "friendly", "off_topic": "friendly",
        "emotional": "empathetic",
    }
    import re as _re
    def _reply_has_issues(text: str) -> bool:
        if _re.search(r'[А-Яа-яЁё]', text):
            return True
        if _re.search(r'\w+/\w{1,6}\b', text):
            return True
        # Anglicismy které proklouzávají
        if any(w in text.lower() for w in ["nepassuje", "feelingovat", "neimpresionuje"]):
            return True
        return False

    new_replies: dict[str, str] = {}
    for comment in pending:
        # Cached reply — zkontroluj na lomené tvary, pokud je problém přegeneruj
        if comment.get("suggested_reply"):
            if _reply_has_issues(comment["suggested_reply"]):
                log.warning("Cached reply má problém, přegeneruji: %s", comment["id"])
                comment["suggested_reply"] = None  # vymaž → bude přegenerována
            else:
                continue
        if not comment.get("needs_reply"):
            continue
        if not comment.get("message", "").strip():
            continue
        try:
            tone = _TONE_MAP.get(comment.get("sentiment", "neutral"), "friendly")
            suggested = generate_comment_reply(
                original_comment=comment["message"],
                post_topic=comment.get("post_message", "mystika"),
                tone=tone,
                db_sentiment=comment.get("sentiment", ""),
            )
            comment["suggested_reply"] = suggested
            new_replies[comment["id"]] = suggested
            time.sleep(1.5)
        except Exception as e:
            log.warning("Nepodařilo se vygenerovat odpověď: %s", e)
            time.sleep(3)
    # Uložíme všechny vygenerované odpovědi v 1 disk I/O
    save_comment_replies_batch(new_replies)

    if not pending:
        print("\n✨ Žádné nevyřízené komentáře.")
        return

    # Zkontroluj denní limit
    today_count = _get_today_count()
    remaining = DAILY_LIMIT - today_count
    if remaining <= 0 and mode != "dry-run":
        print(f"\n🛑 Denní limit {DAILY_LIMIT} odpovědí dosažen. Zítra pokračujeme.")
        return

    if mode != "dry-run":
        print(f"\n📊 Denní limit: {today_count}/{DAILY_LIMIT} odpovědí dnes")

    print(f"\n📋 Nevyřízených komentářů: {len(pending)}")
    _sep()

    replied = 0
    for idx, comment in enumerate(pending, 1):
        # Zastav při dosažení denního limitu
        if mode != "dry-run" and _get_today_count() >= DAILY_LIMIT:
            print(f"\n🛑 Denní limit {DAILY_LIMIT} dosažen, zastavuji.")
            break
        _print_comment(comment, idx)
        success = process_comment(comment, mode)
        if success:
            replied += 1

    # 3. Statistiky
    _sep()
    db_stats = get_stats()
    print(f"\n📊 Statistiky: celkem {db_stats['total']} | čekajících {db_stats['pending']} | odpovězeno dnes: {replied}")
    print(f"   Sentimenty: {db_stats['by_sentiment']}")


def run_loop(mode: str):
    """Polling smyčka pro Railway"""
    print(f"🔁 Spouštím polling loop (každých {POLL_INTERVAL}s)")
    while True:
        try:
            run_once(mode)
        except KeyboardInterrupt:
            print("\n👋 Ukončuji...")
            break
        except Exception as e:
            log.error("Neočekávaná chyba v smyčce: %s", e, exc_info=True)
            print(f"⚠️ Chyba: {e} — čekám {POLL_INTERVAL}s")
        print(f"\n⏳ Čekám {POLL_INTERVAL}s do dalšího běhu...")
        time.sleep(POLL_INTERVAL)


# ══════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mystická Hvězda Comment Bot")
    parser.add_argument("--auto",    action="store_true", help="Automaticky odpoví bez potvrzení")
    parser.add_argument("--dry-run", action="store_true", help="Jen zobrazí, nic neposílá")
    parser.add_argument("--loop",    action="store_true", help="Polling smyčka (pro Railway)")
    parser.add_argument("--stats",   action="store_true", help="Zobrazí statistiky a skončí")
    parser.add_argument("--regen",   action="store_true", help="Přegeneruje odpovědi novou logikou")
    parser.add_argument("--limit",   type=int, default=0, help="Max počet komentářů ke zpracování")
    args = parser.parse_args()

    if args.stats:
        s = get_stats()
        print(f"\n📊 Comment Bot statistiky")
        print(f"   Celkem v DB:  {s['total']}")
        print(f"   Čekajících:   {s['pending']}")
        print(f"   Poslední sync: {s['last_fetch']}")
        print(f"   Podle statusu: {s['by_status']}")
        print(f"   Podle sentimentu: {s['by_sentiment']}")
        sys.exit(0)

    if args.regen:
        print("Přegenerovávám odpovědi novou logikou...")
        n = regenerate_replies()
        print(f"Hotovo — přegenerováno {n} odpovědí.")
        sys.exit(0)

    mode = "dry-run" if args.dry_run else ("auto" if args.auto else "review")

    if args.loop:
        run_loop(mode)
    else:
        run_once(mode, limit=args.limit)
