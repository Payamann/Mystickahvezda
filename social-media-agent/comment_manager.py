"""
Comment Manager — správa komentářů na Facebooku a Instagramu

Funkce:
  - Načtení nových komentářů z Meta Graph API
  - Detekce tónu a typu komentáře (AI)
  - Generování odpovědí (Gemini)
  - Označení komentářů jako vyřízených
  - Lokální databáze komentářů (JSON)
  - Ochrana před spamem a negativními komentáři

Stav: Plně připraveno — aktivuje se po zadání META_ACCESS_TOKEN
"""
import json
import os
import tempfile
import requests
from pathlib import Path
from datetime import datetime, date, timedelta
from typing import Optional
import sys

sys.path.insert(0, str(Path(__file__).parent))
import config
from generators.text_generator import generate_comment_reply
from logger import get_logger

log = get_logger(__name__)

# Z centrální konfigurace
GRAPH_API_URL = config.GRAPH_API_URL

# Lokální databáze komentářů
COMMENTS_DB_PATH = config.OUTPUT_DIR / "comments_db.json"


# ══════════════════════════════════════════════════
# DATABÁZE KOMENTÁŘŮ (lokální JSON)
# ══════════════════════════════════════════════════

def _load_db() -> dict:
    if not COMMENTS_DB_PATH.exists():
        return {
            "comments": {},     # comment_id → comment record
            "last_fetch": None,
            "stats": {
                "total_fetched": 0,
                "total_replied": 0,
                "total_hidden": 0,
            }
        }
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(COMMENTS_DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def _save_db(db: dict):
    """Atomický zápis DB — zapisuje do temp souboru, pak přejmenuje."""
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(
        suffix=".tmp",
        prefix="comments_db_",
        dir=str(config.OUTPUT_DIR),
    )
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(db, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, str(COMMENTS_DB_PATH))
        log.debug("Comments DB uložena atomicky")
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


# ══════════════════════════════════════════════════
# META API — NAČTENÍ KOMENTÁŘŮ
# ══════════════════════════════════════════════════

def fetch_facebook_comments(
    limit_per_post: int = 100,
    since_hours: int = 168,
) -> list[dict]:
    """
    Načte komentáře ze všech postů na Facebook stránce
    z posledních X hodin.

    Returns:
        list komentářů se strukturou:
        {id, post_id, post_message, from_name, message, created_time, platform}
    """
    if not config.META_ACCESS_TOKEN or not config.META_PAGE_ID:
        raise ValueError("META_ACCESS_TOKEN a META_PAGE_ID musí být nastaveny v .env")

    token = config.META_ACCESS_TOKEN
    page_id = config.META_PAGE_ID
    comments = []

    # Krok 1: Načti nedávné posty
    since_ts = int((datetime.now() - timedelta(hours=since_hours)).timestamp())
    posts_url = f"{GRAPH_API_URL}/{page_id}/posts"
    posts_resp = requests.get(posts_url, params={
        "access_token": token,
        "fields": "id,message,created_time",
        "since": since_ts,
        "limit": 50,
    }, timeout=config.HTTP_TIMEOUT)

    if posts_resp.status_code != 200:
        raise Exception(f"Chyba načítání postů: {posts_resp.text}")

    posts = posts_resp.json().get("data", [])

    # Krok 2: Pro každý post načti komentáře
    for post in posts:
        post_id = post["id"]
        post_message = post.get("message", "")[:100]

        comments_url = f"{GRAPH_API_URL}/{post_id}/comments"
        params = {
            "access_token": token,
            "fields": "id,from,message,created_time,can_reply_privately",
            "limit": limit_per_post,
            "filter": "stream",
            "since": since_ts,  # jen komentáře z daného okna, ne celá historie
        }
        page_comments = []
        while comments_url:
            comments_resp = requests.get(comments_url, params=params, timeout=config.HTTP_TIMEOUT)
            if comments_resp.status_code != 200:
                break
            data = comments_resp.json()
            page_comments.extend(data.get("data", []))
            comments_url = data.get("paging", {}).get("next")
            params = {}  # next URL already contains all params

        if comments_resp.status_code != 200:
            continue

        for comment in page_comments:
            comments.append({
                "id": comment["id"],
                "platform": "facebook",
                "post_id": post_id,
                "post_message": post_message,
                "from_name": comment.get("from", {}).get("name", "Anonymní"),
                "from_id": comment.get("from", {}).get("id", ""),
                "message": comment.get("message", ""),
                "created_time": comment.get("created_time", ""),
                "fetched_at": datetime.now().isoformat(),
                "status": "new",           # new | replied | hidden | ignored
                "suggested_reply": None,
                "actual_reply": None,
                "sentiment": None,         # positive | neutral | negative | spam
                "reply_id": None,
            })

    return comments


def fetch_instagram_comments(
    limit_per_post: int = 25,
    since_hours: int = 48,
) -> list[dict]:
    """
    Načte komentáře z Instagram Business účtu
    z posledních X hodin.
    """
    if not config.META_ACCESS_TOKEN or not config.INSTAGRAM_ACCOUNT_ID:
        raise ValueError("META_ACCESS_TOKEN a INSTAGRAM_ACCOUNT_ID musí být nastaveny v .env")

    token = config.META_ACCESS_TOKEN
    ig_id = config.INSTAGRAM_ACCOUNT_ID
    comments = []

    # Načti nedávná media
    since_ts = int((datetime.now() - timedelta(hours=since_hours)).timestamp())
    media_url = f"{GRAPH_API_URL}/{ig_id}/media"
    media_resp = requests.get(media_url, params={
        "access_token": token,
        "fields": "id,caption,timestamp",
        "limit": 20,
    }, timeout=config.HTTP_TIMEOUT)

    if media_resp.status_code != 200:
        raise Exception(f"Chyba načítání IG médií: {media_resp.text}")

    for media in media_resp.json().get("data", []):
        media_id = media["id"]
        post_caption = media.get("caption", "")[:100]

        # Zkontroluj timestamp
        ts_str = media.get("timestamp", "")
        if ts_str:
            try:
                post_ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                if (datetime.now().astimezone() - post_ts).total_seconds() > since_hours * 3600:
                    continue
            except (ValueError, TypeError):
                pass

        # Načti komentáře k tomuto médiu
        comm_url = f"{GRAPH_API_URL}/{media_id}/comments"
        comm_resp = requests.get(comm_url, params={
            "access_token": token,
            "fields": "id,username,text,timestamp,replies{id,username,text,timestamp}",
            "limit": limit_per_post,
        }, timeout=config.HTTP_TIMEOUT)

        if comm_resp.status_code != 200:
            continue

        for comment in comm_resp.json().get("data", []):
            comments.append({
                "id": comment["id"],
                "platform": "instagram",
                "post_id": media_id,
                "post_message": post_caption,
                "from_name": comment.get("username", ""),
                "from_id": comment.get("username", ""),
                "message": comment.get("text", ""),
                "created_time": comment.get("timestamp", ""),
                "fetched_at": datetime.now().isoformat(),
                "status": "new",
                "suggested_reply": None,
                "actual_reply": None,
                "sentiment": None,
                "reply_id": None,
            })

    return comments


def fetch_all_comments(since_hours: int = 48) -> list[dict]:
    """
    Načte komentáře ze všech dostupných platforem.
    Přeskočí platformy kde chybí credentials.
    """
    all_comments = []
    errors = []

    if config.META_ACCESS_TOKEN and config.META_PAGE_ID:
        try:
            fb_comments = fetch_facebook_comments(since_hours=since_hours)
            all_comments.extend(fb_comments)
            log.info("Facebook: %d nových komentářů", len(fb_comments))
        except Exception as e:
            errors.append(f"Facebook: {e}")

    # Instagram API v2.4+ má deprecated endpoint — dočasně vypnuto
    # if config.META_ACCESS_TOKEN and config.INSTAGRAM_ACCOUNT_ID:
    #     ig_comments = fetch_instagram_comments(since_hours=since_hours)

    if errors:
        for e in errors:
            log.warning("%s", e)

    return all_comments


# ══════════════════════════════════════════════════
# ANALÝZA SENTIMENTU & PRIORITIZACE
# ══════════════════════════════════════════════════

def analyze_comment_sentiment(message: str) -> dict:
    """
    Keyword-based analýza sentimentu + off-topic detekce.
    Dostatečně přesná pro třídění bez nutnosti API volání.

    Returns:
        dict: sentiment, priority, needs_reply, should_hide, is_off_topic
    """
    text = message.lower()

    # ── ON-TOPIC klíčová slova (oblast Mystické Hvězdy) ──
    ON_TOPIC_SIGNALS = [
        # Astrologie
        "znamení", "znameni", "horoskop", "planeta", "saturn", "jupiter",
        "merkur", "venuše", "venuse", "mars", "neptun", "uran", "pluto",
        "ascendent", "beran", "býk", "byk", "blíženci", "blizenci",
        "rak", "lev", "panna", "váhy", "vahy", "štír", "stir",
        "střelec", "strelec", "kozoroh", "vodnář", "vodnar", "ryby",
        "retrográd", "retrograd", "tranzit",
        # Tarot
        "tarot", "karta", "karty", "výklad", "vyklad", "arkána", "arkana",
        # Krystaly a kameny
        "krystal", "kámen", "kamen", "ametyst", "růženín", "ruzenin",
        "obsidián", "obsidian", "citrín", "citrin", "turmalín", "turmalin",
        "minerál", "mineral",
        # Numerologie
        "numerolog", "číslo", "cislo", "životní cesta", "zivotni cesta",
        # Rituály a meditace
        "rituál", "ritual", "meditac", "mantra", "vizualizac", "svíčk",
        "svick", "kadidl", "očist", "ocist", "afirmac",
        # Energie a duchovní růst
        "energi", "čakr", "cakr", "aura", "duchovn", "spirituál",
        "spiritual", "intuic", "vesmír", "vesmir", "manifest",
        # Měsíc a cykly
        "měsíc", "mesic", "luná", "luna", "úplněk", "uplnek",
        "novoluní", "novoluni", "dorůstaj", "dorustaj", "couvaj",
        # Bylinky v mystice
        "bylinka", "byliny", "šalvěj", "salvej", "levandule",
        # Web
        "mystická hvězda", "mysticka hvezda", "mystickahvezda", "článek", "clanek",
        "blog", "stránk", "strank", "web",
    ]

    # ── OFF-TOPIC signály (témata mimo naši oblast) ──
    OFF_TOPIC_SIGNALS = [
        # Vaření a jídlo
        "recept", "polévk", "polevk", "polívk", "polivk", "vaření", "vareni",
        "pečení", "peceni", "jídlo", "jidlo", "oběd", "obed", "večeře", "vecere",
        "snídaně", "snidane", "koření", "koreni", "těsto", "testo", "mouka",
        "cukr", "máslo", "maslo", "ingredien",
        # Sport
        "fotbal", "hokej", "hokejov", "tenis", "liga", "zápas", "zapas", "góly", "goly",
        "olympi", "mistrovství", "mistrovstvi",
        # Politika
        "politik", "vláda", "vlada", "volby", "volit", "voleb", "strana", "prezident",
        "parlament", "senát", "senat", "zákon", "zakon",
        # Finance / investice
        "akcie", "investic", "investov", "bitcoin", "krypto", "burza", "půjčk", "pujck",
        "hypotéka", "hypoteka", "úrok", "urok",
        # Technologie (nesouvisející)
        "programov", "softwar", "iphone", "android", "počítač", "pocitac",
        "windows", "linux",
        # Medicínské rady
        "doktor", "nemoc", "lék", "lek", "bolest", "diagnóz", "diagnoz",
        "operac", "nemocnic", "antibiotik", "očkován", "ockovani",
    ]

    # Spam / negativní / skrýt
    SPAM_SIGNALS = [
        "follow back", "check my", "dm me", "link in bio", "crypto",
        "earn money", "bitcoin", "forex", "click here", "free gift",
        "❤️❤️❤️❤️❤️",  # spam emoji floods
    ]
    HATE_SIGNALS = [
        "blbost", "kraviny", "šarlatán", "sarlatán", "sarlatan",
        "podvod", "idioti", "hlupáci", "hlupaci",
        "nesmysl", "fake", "scam", "lhář", "lhar", "lžete", "lzete",
    ]
    NEGATIVE_SIGNALS = [
        "nevím", "nevim", "pochybuji", "nefunguje", "nesmysl",
        "nevěřím", "neverim", "pochybuju", "nefunguji",
        "škoda", "skoda", "zklamání", "zklamani", "špatně", "spatne",
        "nedava smysl", "nedává smysl",
    ]
    POSITIVE_SIGNALS = [
        "díky", "dekuji", "děkuji", "diky", "super", "skvělé", "skvele",
        "nádherné", "nadherné", "úžasné", "uzasne", "krásné", "krasne",
        "přesně", "presne", "pravda", "souhlasím", "souhlasim",
        "miluju", "miluji", "❤", "💜", "🙏", "moc pěkné", "moc pekne",
    ]
    QUESTION_SIGNALS = [
        "?", "jak", "proc", "proč", "co znamená", "co znamena",
        "muzete", "můžeš", "mohla", "pomoc", "porad", "poraď",
        "nevite", "nevíte", "jak se", "co to",
    ]

    # ── Klasifikace ──

    # 1. Spam — vždy skrýt
    if any(s in text for s in SPAM_SIGNALS):
        return {"sentiment": "spam", "priority": 0, "needs_reply": False, "should_hide": True, "is_off_topic": True}

    # 2. Hate — vždy skrýt
    if any(s in text for s in HATE_SIGNALS):
        return {"sentiment": "negative", "priority": 1, "needs_reply": False, "should_hide": True, "is_off_topic": False}

    # 3. Off-topic detekce — kontrola zda komentář NENÍ o mystice
    is_on_topic = any(s in text for s in ON_TOPIC_SIGNALS)
    is_off_topic = any(s in text for s in OFF_TOPIC_SIGNALS) and not is_on_topic

    # 4. Otázka
    if any(s in text for s in QUESTION_SIGNALS):
        if is_off_topic:
            return {"sentiment": "off_topic", "priority": 2, "needs_reply": True, "should_hide": False, "is_off_topic": True}
        return {"sentiment": "question", "priority": 10, "needs_reply": True, "should_hide": False, "is_off_topic": False}

    # 5. Skeptik
    if any(s in text for s in NEGATIVE_SIGNALS):
        return {"sentiment": "skeptical", "priority": 7, "needs_reply": True, "should_hide": False, "is_off_topic": is_off_topic}

    # 6. Pochvala
    if any(s in text for s in POSITIVE_SIGNALS):
        return {"sentiment": "positive", "priority": 5, "needs_reply": True, "should_hide": False, "is_off_topic": False}

    # 7. Off-topic bez otázky — nízká priorita
    if is_off_topic:
        return {"sentiment": "off_topic", "priority": 1, "needs_reply": False, "should_hide": False, "is_off_topic": True}

    return {"sentiment": "neutral", "priority": 3, "needs_reply": True, "should_hide": False, "is_off_topic": False}


# ══════════════════════════════════════════════════
# SYNCHRONIZACE A ULOŽENÍ
# ══════════════════════════════════════════════════

def regenerate_replies() -> int:
    """
    Přegeneruje odpovědi pro všechny nevyřízené komentáře v DB.
    Použij po změně reply logiky.
    """
    db = _load_db()
    count = 0
    for cid, comment in db["comments"].items():
        if comment.get("status") not in ("new", None):
            continue
        if not comment.get("needs_reply"):
            continue
        if not comment.get("message", "").strip():
            continue
        try:
            tone_map = {"question": "educational", "positive": "friendly",
                        "skeptical": "empathetic", "neutral": "friendly", "off_topic": "friendly"}
            tone = tone_map.get(comment.get("sentiment", "neutral"), "friendly")
            suggested = generate_comment_reply(
                original_comment=comment["message"],
                post_topic=comment.get("post_message", "mystika"),
                tone=tone,
            )
            comment["suggested_reply"] = suggested
            db["comments"][cid] = comment
            count += 1
        except Exception as e:
            log.warning("Regen selhal pro %s: %s", cid, e)
    _save_db(db)
    return count


def sync_comments(since_hours: int = 48) -> dict:
    """
    Hlavní sync funkce:
    1. Načte nové komentáře z API
    2. Filtruje duplicity
    3. Analyzuje sentiment
    4. Generuje návrhy odpovědí
    5. Uloží do lokální DB

    Returns:
        dict: statistiky synchronizace
    """
    db = _load_db()

    log.info("Načítám komentáře z posledních %d hodin...", since_hours)
    new_comments = fetch_all_comments(since_hours=since_hours)

    added = 0
    skipped = 0

    # Sleduj duplicity komentářů per post (max 3 stejné odpovědi)
    post_msg_counts: dict[str, dict[str, int]] = {}

    import unicodedata
    def _is_junk(msg: str) -> bool:
        """True pokud je komentář prázdný, příliš krátký nebo jen emoji/znaky."""
        stripped = msg.strip()
        if len(stripped) < 4:
            return True
        # Odstraň emoji a interpunkci, zkontroluj zda zbyde aspoň 1 písmeno
        letters = [c for c in stripped if unicodedata.category(c).startswith("L")]
        return len(letters) < 3

    for comment in new_comments:
        cid = comment["id"]

        # Přeskoč duplicity
        if cid in db["comments"]:
            skipped += 1
            continue

        msg = comment["message"].strip().lower()
        post_id = comment.get("post_id", "")

        # Přeskoč junk komentáře (prázdné, emoji-only, < 4 znaky)
        if _is_junk(comment["message"]):
            comment["status"] = "ignored"
            comment["sentiment"] = "junk"
            comment["priority"] = 0
            comment["needs_reply"] = False
            db["comments"][cid] = comment
            added += 1
            continue

        # Přeskoč duplicity (max 3 stejné odpovědi na stejném postu)
        if post_id not in post_msg_counts:
            post_msg_counts[post_id] = {}
        post_msg_counts[post_id][msg] = post_msg_counts[post_id].get(msg, 0) + 1
        if post_msg_counts[post_id][msg] > 3:
            comment["status"] = "ignored"
            comment["sentiment"] = "duplicate"
            comment["priority"] = 0
            comment["needs_reply"] = False
            db["comments"][cid] = comment
            added += 1
            continue

        # Analýza sentimentu
        analysis = analyze_comment_sentiment(comment["message"])
        comment.update(analysis)

        # Odpověď se generuje lazy — až těsně před odesláním v get_pending_comments()
        # Tady jen uložíme komentář bez odpovědi (šetří API náklady při syncu)

        db["comments"][cid] = comment
        db["stats"]["total_fetched"] = db["stats"].get("total_fetched", 0) + 1
        added += 1

    db["last_fetch"] = datetime.now().isoformat()
    _save_db(db)

    return {
        "added": added,
        "skipped": skipped,
        "total_in_db": len(db["comments"]),
    }


def get_pending_comments(
    platform: str = None,
    sentiment: str = None,
    min_priority: int = 0,
) -> list[dict]:
    """
    Vrátí nevyřízené komentáře seřazené podle priority. Žádné Claude API volání.

    Args:
        platform: filtr platformy (facebook | instagram | None = obě)
        sentiment: filtr sentimentu (question | positive | skeptical | neutral)
        min_priority: minimum priority skóre (0-10)
    """
    db = _load_db()
    pending = []

    for cid, comment in db["comments"].items():
        if comment.get("status") not in ("new", None):
            continue
        if platform and comment.get("platform") != platform:
            continue
        if sentiment and comment.get("sentiment") != sentiment:
            continue
        if comment.get("priority", 0) < min_priority:
            continue
        if comment.get("should_hide", False):
            continue

        pending.append(comment)

    # Recency bonus — nové komentáře mají přednost (boostuje FB engagement window)
    now = datetime.now()
    def _score(c: dict) -> float:
        priority = c.get("priority", 0)
        try:
            ct = datetime.fromisoformat(c["created_time"].replace("Z", "+00:00").replace("+0000", "+00:00"))
            age_hours = (now - ct.replace(tzinfo=None)).total_seconds() / 3600
        except Exception:
            age_hours = 9999
        if age_hours < 6:
            recency = 5      # čerstvé — největší dopad na algoritmus
        elif age_hours < 24:
            recency = 3
        elif age_hours < 72:
            recency = 1
        else:
            recency = 0
        return -(priority + recency)   # záporné = řazení sestupně

    pending.sort(key=_score)
    return pending


def save_comment_reply(comment_id: str, suggested_reply: str) -> None:
    """Uloží navrhovanou odpověď do DB. Volá se z comment_bot před odesláním."""
    db = _load_db()
    if comment_id in db["comments"]:
        db["comments"][comment_id]["suggested_reply"] = suggested_reply
        _save_db(db)


def save_comment_replies_batch(replies: dict[str, str]) -> None:
    """Uloží více navrhovaných odpovědí najednou. 1× disk I/O místo N×."""
    if not replies:
        return
    db = _load_db()
    for cid, reply in replies.items():
        if cid in db["comments"]:
            db["comments"][cid]["suggested_reply"] = reply
    _save_db(db)


# ══════════════════════════════════════════════════
# ODPOVÍDÁNÍ NA KOMENTÁŘE
# ══════════════════════════════════════════════════

def post_reply_facebook(comment_id: str, reply_text: str) -> dict:
    """Pošle odpověď na Facebook komentář přes Graph API"""
    if not config.META_ACCESS_TOKEN:
        return {"success": False, "error": "META_ACCESS_TOKEN chybí"}

    url = f"{GRAPH_API_URL}/{comment_id}/comments"
    resp = requests.post(url, data={
        "message": reply_text,
        "access_token": config.META_ACCESS_TOKEN,
    }, timeout=config.HTTP_TIMEOUT)

    result = resp.json()
    if "id" in result:
        return {"success": True, "reply_id": result["id"]}
    return {"success": False, "error": result.get("error", {}).get("message", str(result))}


def post_reply_instagram(comment_id: str, reply_text: str) -> dict:
    """Pošle odpověď na Instagram komentář přes Graph API"""
    if not config.META_ACCESS_TOKEN:
        return {"success": False, "error": "META_ACCESS_TOKEN chybí"}

    url = f"{GRAPH_API_URL}/{comment_id}/replies"
    resp = requests.post(url, data={
        "message": reply_text,
        "access_token": config.META_ACCESS_TOKEN,
    }, timeout=config.HTTP_TIMEOUT)

    result = resp.json()
    if "id" in result:
        return {"success": True, "reply_id": result["id"]}
    return {"success": False, "error": result.get("error", {}).get("message", str(result))}


def reply_to_comment(comment_id: str, reply_text: str, mark_done: bool = True) -> dict:
    """
    Odpoví na komentář na správné platformě a uloží do DB.

    Args:
        comment_id: ID komentáře
        reply_text: text odpovědi
        mark_done: označí komentář jako vyřízený
    """
    db = _load_db()
    comment = db["comments"].get(comment_id)

    if not comment:
        return {"success": False, "error": f"Komentář {comment_id} nenalezen v DB"}

    platform = comment.get("platform", "facebook")

    if platform == "facebook":
        result = post_reply_facebook(comment_id, reply_text)
    elif platform == "instagram":
        result = post_reply_instagram(comment_id, reply_text)
    else:
        return {"success": False, "error": f"Neznámá platforma: {platform}"}

    if result["success"] and mark_done:
        comment["status"] = "replied"
        comment["actual_reply"] = reply_text
        comment["replied_at"] = datetime.now().isoformat()
        comment["reply_id"] = result.get("reply_id")
        db["comments"][comment_id] = comment
        db["stats"]["total_replied"] = db["stats"].get("total_replied", 0) + 1
        _save_db(db)

    return result


def hide_comment(comment_id: str, platform: str = "facebook") -> dict:
    """Skryje nevhodný komentář (spam, hate)"""
    if not config.META_ACCESS_TOKEN:
        return {"success": False, "error": "META_ACCESS_TOKEN chybí"}

    if platform == "facebook":
        url = f"{GRAPH_API_URL}/{comment_id}"
        resp = requests.post(url, data={
            "is_hidden": True,
            "access_token": config.META_ACCESS_TOKEN,
        }, timeout=config.HTTP_TIMEOUT)
        result = resp.json()
        success = result.get("success", False)
    else:
        # Instagram nemá hide, ale lze použít delete
        url = f"{GRAPH_API_URL}/{comment_id}"
        resp = requests.delete(url, params={"access_token": config.META_ACCESS_TOKEN}, timeout=config.HTTP_TIMEOUT)
        success = resp.status_code == 200
        result = {"success": success}

    if success:
        db = _load_db()
        if comment_id in db["comments"]:
            db["comments"][comment_id]["status"] = "hidden"
            db["stats"]["total_hidden"] = db["stats"].get("total_hidden", 0) + 1
            _save_db(db)

    return {"success": success, "error": result.get("error", {}).get("message", "") if not success else ""}


def get_stats() -> dict:
    """Statistiky správy komentářů"""
    db = _load_db()
    all_comments = list(db["comments"].values())

    by_status = {}
    by_platform = {}
    by_sentiment = {}

    for c in all_comments:
        s = c.get("status", "new")
        by_status[s] = by_status.get(s, 0) + 1

        p = c.get("platform", "unknown")
        by_platform[p] = by_platform.get(p, 0) + 1

        sent = c.get("sentiment", "unknown")
        by_sentiment[sent] = by_sentiment.get(sent, 0) + 1

    pending = [c for c in all_comments if c.get("status") == "new" and not c.get("should_hide")]

    return {
        "total": len(all_comments),
        "pending": len(pending),
        "by_status": by_status,
        "by_platform": by_platform,
        "by_sentiment": by_sentiment,
        "last_fetch": db.get("last_fetch", "nikdy"),
        "db_stats": db.get("stats", {}),
    }
