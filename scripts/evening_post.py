#!/usr/bin/env python3
"""
Evening Post Generator pro Mystickou Hvězdu
============================================
Generuje večerní příspěvek na Instagram/Facebook/TikTok.
Střídá 5 typů obsahu, pamatuje si témata (neopakuje do 30 dní),
ladí se na základě manuálně zadaných skóre z Meta analytics.

Usage:
    python evening_post.py                        # automatický výběr
    python evening_post.py --type educational     # vynutit typ
    python evening_post.py --topic "Merkur"       # vynutit téma
    python evening_post.py --score 8.5            # zalogovat skóre posledního postu
    python evening_post.py --date 2026-04-07      # konkrétní datum
"""

import sys
import os
import json
import random
import argparse
from datetime import date, timedelta
from pathlib import Path

# ─── Env loading ──────────────────────────────────────────────────────────────

def _load_env():
    env_paths = [
        Path(__file__).resolve().parent.parent / "server" / ".env",
        Path(__file__).resolve().parent / ".env",
    ]
    for env_path in env_paths:
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    k = k.strip(); v = v.strip().strip('"').strip("'")
                    if not os.environ.get(k):
                        os.environ[k] = v
            break

_load_env()

ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not ANTHROPIC_KEY:
    print("[CHYBA] Chybí ANTHROPIC_API_KEY v server/.env")
    sys.exit(1)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ─── Paměť ────────────────────────────────────────────────────────────────────

MEMORY_FILE = Path(__file__).parent / "evening_memory.json"

def load_memory() -> dict:
    if MEMORY_FILE.exists():
        return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
    return {"posts": [], "category_scores": {}}

def save_memory(mem: dict):
    MEMORY_FILE.write_text(json.dumps(mem, ensure_ascii=False, indent=2), encoding="utf-8")

# ─── Zásobník témat ───────────────────────────────────────────────────────────

TOPICS = {
    "planety": [
        "Merkur retrográdní — co to skutečně znamená",
        "Venuše a láska: jak planeta krásy ovlivňuje vztahy",
        "Mars — planeta akce, hněvu a energie",
        "Jupiter — planeta štěstí a expanze",
        "Saturn — karma, disciplína a životní lekce",
        "Uran — planeta změn a revoluce",
        "Neptun — iluze, intuice a spiritualita",
        "Pluto — transformace a smrt ega",
        "Sluneční návraty: proč je každé narozeniny jiné",
        "Měsíční uzly: karma a životní směr",
    ],
    "lunární": [
        "Nov Měsíce: jak zasadit záměry správně",
        "Úplněk a emoce: proč spíme hůř",
        "Dorůstající Měsíc — čas budovat a jednat",
        "Ubývající Měsíc — čas pustit a uvolnit",
        "Lunární eclipse: průlomy a konce",
        "Solární eclipse: nové kapitoly života",
        "Měsíc v každém znamení: jak to cítíš",
        "Lunární kalendář a zahradničení — pradávná moudrost",
    ],
    "prvky": [
        "Element ohně: Beran, Lev, Střelec — co je spojuje",
        "Element vody: Rak, Štír, Ryby — hloubka emocí",
        "Element vzduchu: Blíženci, Váhy, Vodnář — svět idejí",
        "Element země: Býk, Panna, Kozoroh — síla stability",
        "Proč se oheň a voda přitahují (a ničí)",
        "Vzduch a země: nejpraktičtější kombinace ve vztazích",
    ],
    "nástroje": [
        "Natální karta: jak ji číst a co ti říká",
        "Tarot není věštba — je to zrcadlo",
        "Runy: severský systém moudrosti starý 2000 let",
        "Numerologie: jak číslo životní cesty změní tvůj pohled",
        "Partnerská shoda v astrologii: na čem záleží skutečně",
        "Andělská čísla: co znamená 11:11 nebo 333",
        "Lunární kalendář: jak plánovat podle Měsíce",
        "Šamanské kolo: 4 světové strany a jejich energie",
        "Minulý život: jak ho poznat bez hypnózy",
        "Křišťálová koule: fokusování intuice",
    ],
    "mýty": [
        "Mýtus: Astrologie je jen pro ženy a new age",
        "Mýtus: Horoskop v novinách je astrologie",
        "Mýtus: Vše určují hvězdy — svobodná vůle neexistuje",
        "Mýtus: Škorpioni jsou zlí a žárliví",
        "Mýtus: Blíženci jsou nespolehliví",
        "Mýtus: Ascendent není důležitý",
        "Mýtus: Astrologie a věda jsou nepřátelé",
        "Mýtus: Každý Beran je stejný",
    ],
    "znamení": [
        "Beran: síla průkopníka a stín impulzivity",
        "Býk: síla věrnosti a stín tvrdohlavosti",
        "Blíženci: síla adaptability a stín povrchnosti",
        "Rak: síla empatie a stín uzavřenosti",
        "Lev: síla sebevyjádření a stín egoismu",
        "Panna: síla preciznosti a stín perfekcionismu",
        "Váhy: síla harmonie a stín nerozhodnosti",
        "Štír: síla transformace a stín kontroly",
        "Střelec: síla svobody a stín nezávaznosti",
        "Kozoroh: síla vytrvalosti a stín rigidity",
        "Vodnář: síla originality a stín odtažitosti",
        "Ryby: síla intuice a stín úniku z reality",
    ],
    "numerologie": [
        "Životní číslo 1: vůdce nebo tyran?",
        "Životní číslo 2: diplomat nebo oběť?",
        "Životní číslo 3: kreativec nebo roztěkaný?",
        "Životní číslo 4: budovatel nebo workoholik?",
        "Životní číslo 5: dobrodruh nebo nestabilní?",
        "Životní číslo 6: pečovatel nebo mučedník?",
        "Životní číslo 7: mudrc nebo samotář?",
        "Životní číslo 8: mocný nebo posedlý?",
        "Životní číslo 9: vizionář nebo idealist?",
        "Master čísla 11, 22, 33: co znamenají",
        "Osobní rok: jak ho spočítat a co čekat",
    ],
}

# Typy postů a jejich rotační váhy
POST_TYPES = ["educational", "engagement", "myth_bust", "lunar", "feature_spotlight"]

TYPE_TO_CATEGORY = {
    "educational": ["planety", "lunární", "prvky", "znamení", "numerologie"],
    "engagement":  ["planety", "prvky", "znamení", "mýty"],
    "myth_bust":   ["mýty"],
    "lunar":       ["lunární"],
    "feature_spotlight": ["nástroje"],
}

WEB_LINKS = {
    "nástroje": {
        "Natální karta": "https://www.mystickahvezda.cz/natalni-karta.html",
        "Tarot": "https://www.mystickahvezda.cz/tarot.html",
        "Runy": "https://www.mystickahvezda.cz/runy.html",
        "Numerologie": "https://www.mystickahvezda.cz/numerologie.html",
        "Partnerská shoda": "https://www.mystickahvezda.cz/partnerska-shoda.html",
        "Lunární kalendář": "https://www.mystickahvezda.cz/lunace.html",
        "Andělská čísla": "https://www.mystickahvezda.cz/andelske-karty.html",
        "Šamanské kolo": "https://www.mystickahvezda.cz/shamanske-kolo.html",
        "Minulý život": "https://www.mystickahvezda.cz/minuly-zivot.html",
        "Křišťálová koule": "https://www.mystickahvezda.cz/kristalova-koule.html",
    },
    "lunární": "https://www.mystickahvezda.cz/lunace.html",
    "default": "https://www.mystickahvezda.cz/horoskopy.html",
}

# ─── Výběr tématu ─────────────────────────────────────────────────────────────

def get_recent_topics(mem: dict, days: int = 30) -> set:
    cutoff = date.today() - timedelta(days=days)
    return {
        p["topic"] for p in mem["posts"]
        if date.fromisoformat(p["date"]) >= cutoff
    }

def get_recent_types(mem: dict, n: int = 3) -> list:
    return [p["type"] for p in mem["posts"][-n:]]

def pick_type(mem: dict, force_type: str = None) -> str:
    if force_type:
        return force_type

    recent = get_recent_types(mem, 3)

    # Pravidla rotace
    if recent and recent[-1] == "educational" and recent.count("educational") >= 2:
        candidates = [t for t in POST_TYPES if t != "educational"]
    elif recent.count("feature_spotlight") >= 2:
        candidates = [t for t in POST_TYPES if t != "feature_spotlight"]
    elif "myth_bust" not in recent[-7:] if len(recent) >= 7 else True:
        candidates = POST_TYPES  # myth_bust dostane šanci
    else:
        candidates = POST_TYPES

    # Preferuj typy s vyšším průměrným skóre
    scores = mem.get("category_scores", {})
    weighted = []
    for t in candidates:
        cats = TYPE_TO_CATEGORY.get(t, [])
        avg = sum(scores.get(c, {}).get("avg_score", 5.0) for c in cats) / max(len(cats), 1)
        weighted.append((t, avg))

    weighted.sort(key=lambda x: -x[1])
    # Vezmi top 3 a náhodně vyber (variabilita)
    top = [t for t, _ in weighted[:3]]
    return random.choice(top)

def pick_topic(mem: dict, post_type: str, force_topic: str = None) -> tuple:
    """Vrátí (topic, category)."""
    if force_topic:
        for cat, topics in TOPICS.items():
            for t in topics:
                if force_topic.lower() in t.lower():
                    return t, cat
        return force_topic, "planety"

    recent = get_recent_topics(mem)
    cats = TYPE_TO_CATEGORY.get(post_type, ["planety"])

    # Prioritizuj kategorie s vyšším skóre
    scores = mem.get("category_scores", {})
    cats_sorted = sorted(cats, key=lambda c: -scores.get(c, {}).get("avg_score", 5.0))

    for cat in cats_sorted:
        available = [t for t in TOPICS.get(cat, []) if t not in recent]
        if available:
            return random.choice(available), cat

    # Fallback — reset (všechna témata použita)
    cat = random.choice(cats)
    return random.choice(TOPICS.get(cat, ["Astrologie a ty"])), cat

# ─── Claude API ───────────────────────────────────────────────────────────────

def claude_call(system: str, user: str, max_tokens: int = 800) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    msg = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}]
    )
    return msg.content[0].text.strip()

# ─── Generování postu ─────────────────────────────────────────────────────────

def generate_post(post_type: str, topic: str, category: str, target_date: str) -> dict:
    d = date.fromisoformat(target_date)
    months_cs = ["ledna","února","března","dubna","května","června",
                 "července","srpna","září","října","listopadu","prosince"]
    date_cs = f"{d.day}. {months_cs[d.month-1]} {d.year}"

    # Najdi relevantní web odkaz
    web_url = WEB_LINKS.get("default")
    if category == "lunární":
        web_url = WEB_LINKS["lunární"]
    elif category == "nástroje":
        for keyword, url in WEB_LINKS["nástroje"].items():
            if keyword.lower() in topic.lower():
                web_url = url
                break

    type_instructions = {
        "educational": f"""Piš vzdělávací post — vysvětli jak věc SKUTEČNĚ funguje (mechanismus, výpočet, logika).
Struktura: hook → vysvětlení → konkrétní příklad → CTA (save nebo web odkaz).
Délka: 5–8 vět. Přidej 1 konkrétní příklad nebo analogii.
CTA: "Ulož si ⬇️" nebo odkaz na web: {web_url}""",

        "engagement": f"""Piš engagement post — otázka nebo A/B volba, která vyvolá komentáře.
Struktura: provokativní tvrzení nebo otázka → krátký kontext (2–3 věty) → výzva k reakci.
Délka: 3–5 vět. Konec vždy otázkou nebo výběrem.
NIKDY nedávej odkaz na web — chceš komentáře, ne kliknutí.""",

        "myth_bust": f"""Piš myth-bust post — boř mýtus konkrétními fakty.
Struktura: "Říká se, že X. To není pravda." → proč mýtus vznikl → jak to skutečně je → pointa.
Délka: 5–7 vět. Buď odvážný a přímý.
CTA: otázka do komentáře.""",

        "lunar": f"""Piš post o aktuální lunární fázi a co to znamená pro čtenáře dnes.
Struktura: co fáze přináší → konkrétní rada co dělat/nedělat → odkaz na lunární kalendář.
Délka: 4–6 vět. Poetický ale praktický tón.
CTA: odkaz {web_url}""",

        "feature_spotlight": f"""Piš soft-promo post o funkci webu — ale vzdělávací, ne reklamní.
Vysvětli CO funkce dělá a PROČ je to užitečné. Pak přirozeně odkaž.
Délka: 5–7 vět. Nesmí znít jako reklama.
CTA: odkaz {web_url}""",
    }

    system = """Jsi copywriter pro českou mystickou stránku Mystická Hvězda.
Píšeš večerní příspěvky na Instagram a Facebook.
Tykáš, 2. os. j.č. — NIKDY žádný lomený tvar (šel/šla).
Žádné markdown formátování. Výstup JEN samotný text příspěvku a hashtags."""

    user = f"""Datum: {date_cs}
Téma: {topic}
Typ postu: {post_type}

{type_instructions[post_type]}

Napiš příspěvek a pak na novém řádku hashtags (4–6 tagů, první vždy #mystickaHvezda).

Formát výstupu:
[text příspěvku]

[hashtags]"""

    print(f"[*] Generuji {post_type} post: {topic}...")
    caption_raw = claude_call(system, user, max_tokens=600)

    # Odděl caption od hashtagů
    parts = caption_raw.strip().rsplit("\n\n", 1)
    caption = parts[0].strip() if len(parts) == 2 else caption_raw
    hashtags = parts[1].strip() if len(parts) == 2 else "#mystickaHvezda"

    # Image prompt
    print("[*] Generuji image prompt...")
    img_system = """You are an expert at writing image generation prompts for mystical/cosmic brand Mystická Hvězda.
Output ONLY the prompt — no comments, no explanations. Plain ASCII Latin characters only."""

    img_user = f"""Topic: {topic}
Post type: {post_type}
Date: {date_cs}

Write a Gemini/Midjourney image prompt for a Facebook/Instagram post visual.
Style rules:
- Single floating 3D CGI object relevant to the topic
- Deep navy cosmic background (#050510)
- Purple/gold nebula, stardust particles
- Premium 3D CGI render, icon-art style
- NO text, NO people, NO cards, NO frames, NO borders
- Portrait 4:5 for Instagram OR square 1:1 for Facebook — pick what fits better
- Plain solid #050510 border ~20% margin, object floats centered"""

    image_prompt = claude_call(img_system, img_user, max_tokens=300)

    return {
        "caption": caption,
        "hashtags": hashtags,
        "image_prompt": image_prompt,
        "web_url": web_url,
        "type": post_type,
        "topic": topic,
        "category": category,
    }

# ─── Skórování ────────────────────────────────────────────────────────────────

def log_score(score: float, mem: dict) -> dict:
    """Přidá skóre k poslednímu postu a aktualizuje průměr kategorie."""
    posts = mem.get("posts", [])
    if not posts:
        print("[!] Žádný post k ohodnocení.")
        return mem

    last = posts[-1]
    last["score"] = score
    cat = last.get("category", "")

    if cat:
        cat_data = mem.setdefault("category_scores", {}).setdefault(cat, {"avg_score": 5.0, "count": 0})
        n = cat_data["count"]
        cat_data["avg_score"] = round((cat_data["avg_score"] * n + score) / (n + 1), 2)
        cat_data["count"] = n + 1

    print(f"[OK] Skóre {score} přidáno k: {last['topic']} ({cat})")
    if cat:
        print(f"     Nový průměr kategorie '{cat}': {mem['category_scores'][cat]['avg_score']}")
    return mem

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Evening post generator pro Mystickou Hvězdu")
    parser.add_argument("--date",  default=None, help="Datum (YYYY-MM-DD), default: dnes")
    parser.add_argument("--type",  default=None, choices=POST_TYPES, help="Vynutit typ postu")
    parser.add_argument("--topic", default=None, help="Vynutit téma (substring)")
    parser.add_argument("--score", default=None, type=float, help="Zalogovat skóre posledního postu (1–10)")
    args = parser.parse_args()

    mem = load_memory()

    # Skórování posledního postu
    if args.score is not None:
        mem = log_score(args.score, mem)
        save_memory(mem)
        return

    target_date = args.date or str(date.today())
    d = date.fromisoformat(target_date)
    months_cs = ["ledna","února","března","dubna","května","června",
                 "července","srpna","září","října","listopadu","prosince"]
    date_cs = f"{d.day}. {months_cs[d.month-1]} {d.year}"

    print(f"\n=== Evening Post Generator | datum: {target_date} ===\n")

    post_type = pick_type(mem, args.type)
    topic, category = pick_topic(mem, post_type, args.topic)

    print(f"[*] Typ: {post_type} | Kategorie: {category}")
    print(f"[*] Téma: {topic}")

    result = generate_post(post_type, topic, category, target_date)

    # Výstup
    sep = "=" * 60
    print(f"\n{sep}")
    print(f"📅 {date_cs} | 🌙 večerní post\n")
    print(result["caption"])
    print(f"\n{result['hashtags']}")
    print(f"\n{sep}\n🖼️  IMAGE PROMPT\n{sep}")
    print(result["image_prompt"])
    print(sep)

    # Ulož do paměti
    mem["posts"].append({
        "date": target_date,
        "type": post_type,
        "topic": topic,
        "category": category,
        "score": None,
    })
    save_memory(mem)

    # Ulož do souboru
    out_path = Path(__file__).parent / f"evening_{target_date}.txt"
    out_path.write_text(
        f"📅 {date_cs} | večerní post\n\n"
        f"{result['caption']}\n\n"
        f"{result['hashtags']}\n\n"
        f"IMAGE PROMPT\n{sep}\n{result['image_prompt']}\n",
        encoding="utf-8"
    )
    print(f"\n[OK] Typ: {post_type} | Téma: {topic}")
    print(f"[OK] Uloženo: {out_path}")
    print(f"[TIP] Po zveřejnění ohodnoť post: python evening_post.py --score 8.5")


if __name__ == "__main__":
    main()
