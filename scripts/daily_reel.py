#!/usr/bin/env python3
"""
Daily Reel — Voiceover Generator pro Mystickou Hvězdu
======================================================
1. Načte denní horoskopy z Supabase cache
2. Chybějící vygeneruje přes Claude API (stejný prompt jako web)
3. Náhodně vybere 3 znamení (nebo dle --signs)
4. Přes Claude API zformátuje do voiceover scriptu s [] stylovými tagy

Usage:
    python daily_reel.py
    python daily_reel.py --date 2026-04-07               # konkrétní datum
    python daily_reel.py --signs Beran Rak Štír           # konkrétní 3 znamení
"""

import sys
import os
import re
import json
import random
import hashlib
import unicodedata
import argparse
import requests
from datetime import date, timedelta
from pathlib import Path

from daily_common import (
    ApiUsageStats,
    build_qa_report,
    existing_output_action,
    infer_claude_purpose,
    model_for_purpose,
    print_api_report,
    print_qa_report,
    write_json_sidecar,
)

SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPT_DIR / "output"

# ─── Konfigurace — klíče z prostředí nebo server/.env ─────────────────────────

def _load_env():
    """Načte .env soubor pokud existuje (server/.env nebo ../.env)."""
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
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if not os.environ.get(k):  # přepíše i prázdné hodnoty
                        os.environ[k] = v
            break

_load_env()

SUPABASE_URL  = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
WEBSITE_URL   = "https://www.mystickahvezda.cz"
CREATIVE_MODEL = os.environ.get("DAILY_REEL_CREATIVE_MODEL", "claude-sonnet-4-5")
UTILITY_MODEL  = os.environ.get("DAILY_REEL_UTILITY_MODEL", CREATIVE_MODEL)
API_STATS = ApiUsageStats()

if not SUPABASE_URL or not SUPABASE_KEY or not ANTHROPIC_KEY:
    print("[CHYBA] Chybí proměnné prostředí: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY")
    print("  Nastav je v server/.env nebo v systémovém prostředí.")
    sys.exit(1)

ALL_SIGNS = ['Beran', 'Býk', 'Blíženci', 'Rak', 'Lev', 'Panna',
             'Váhy', 'Štír', 'Střelec', 'Kozoroh', 'Vodnář', 'Ryby']

MONTHS_CS = ["ledna", "února", "března", "dubna", "května", "června",
             "července", "srpna", "září", "října", "listopadu", "prosince"]

# Povolené styly pro každé znamení — zachovává astro charakter
SIGN_ALLOWED_TAGS = {
    'Beran':    ['intense', 'commanding', 'confident', 'serious'],
    'Býk':      ['warm', 'soft', 'gentle', 'serious'],
    'Blíženci': ['upbeat', 'confident', 'mysterious', 'warm'],
    'Rak':      ['gentle', 'soft', 'warm', 'mysterious'],
    'Lev':      ['commanding', 'confident', 'warm', 'upbeat'],
    'Panna':    ['serious', 'confident', 'gentle', 'soft'],
    'Váhy':     ['warm', 'gentle', 'soft', 'confident'],
    'Štír':     ['intense', 'mysterious', 'commanding', 'serious'],
    'Střelec':  ['upbeat', 'confident', 'intense', 'warm'],
    'Kozoroh':  ['serious', 'commanding', 'confident', 'intense'],
    'Vodnář':   ['mysterious', 'confident', 'upbeat', 'intense'],
    'Ryby':     ['soft', 'gentle', 'mysterious', 'warm'],
}

SIGN_VOCATIVE = {
    'Beran': 'Berane', 'Býk': 'Býku', 'Blíženci': 'Blíženci',
    'Rak': 'Raku', 'Lev': 'Lve', 'Panna': 'Panno',
    'Váhy': 'Váhy', 'Štír': 'Štíre', 'Střelec': 'Střelci',
    'Kozoroh': 'Kozorohu', 'Vodnář': 'Vodnáři', 'Ryby': 'Ryby'
}

USED_SIGNS_FILE = OUTPUT_DIR / "used_signs.json"

def load_used_signs() -> dict:
    if USED_SIGNS_FILE.exists():
        return json.loads(USED_SIGNS_FILE.read_text(encoding="utf-8"))
    return {}

def save_used_signs(data: dict):
    USED_SIGNS_FILE.parent.mkdir(parents=True, exist_ok=True)
    USED_SIGNS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def pick_signs(target_date: str) -> list:
    """Vybere 3 znamení která v daný den ještě nebyla použita."""
    used = load_used_signs()
    already_used = used.get(target_date, [])
    remaining = [s for s in ALL_SIGNS if s not in already_used]

    if len(remaining) < 3:
        # Všech 12 použito — reset pro tento den
        print(f"  [!] Vsechna znameni pro {target_date} uz pouzita — resetuji.")
        already_used = []
        remaining = ALL_SIGNS[:]

    chosen = random.sample(remaining, 3)

    # Ulož použitá znamení
    used[target_date] = already_used + chosen
    save_used_signs(used)
    return chosen


HOROSCOPE_SYSTEM_PROMPT = """Jsi laskavý astrologický průvodce. Generuješ denní horoskop.
Odpověď MUSÍ být validní JSON objekt bez markdown formátování (žádné ```json).
Struktura:
{
  "prediction": "Text horoskopu (přesně 3 věty) specifický pro dané znamení. Hlavní energie dne a jedna konkrétní rada vycházející z vlastností tohoto znamení.",
  "affirmation": "Osobní denní mantra — silná, poetická, specifická pro dané znamení a jeho element. 15–25 slov, první osoba, přítomný čas. Nesmí být generická ani klišovitá.",
  "luckyNumbers": [číslo1, číslo2, číslo3, číslo4]
}
Text piš česky, poeticky a povzbudivě.
DŮLEŽITÉ: Text piš VŽDY v tykání — 2. osoba jednotného čísla (ty/tě/ti/tvé/tvůj). NIKDY nepoužívej vykání (vás/vám/vaše/váš/buďte/věnujte/nebojte/využijte/jste).
GENDEROVÁ NEUTRALITA: Vyhni se minulému času a slovům, která určují pohlaví čtenáře. Piš v přítomném nebo budoucím čase."""

SIGN_ENERGY_PROFILES = {
    'Beran':    'průkopník, akce, odvaha, impulzivnost — energie ohně',
    'Býk':      'stabilita, smyslovost, trpělivost, materialismus — energie země',
    'Blíženci': 'komunikace, zvídavost, dualita, rychlost — energie vzduchu',
    'Rak':      'emoce, domov, intuice, ochrana — energie vody',
    'Lev':      'kreativita, sebevyjádření, vedení, drama — energie ohně',
    'Panna':    'analýza, detail, služba, zdraví — energie země',
    'Váhy':     'harmonie, vztahy, krása, rozhodování — energie vzduchu',
    'Štír':     'transformace, hloubka, tajemství, regenerace — energie vody',
    'Střelec':  'svoboda, expanze, cestování, filozofie — energie ohně',
    'Kozoroh':  'disciplína, kariéra, ambice, struktura — energie země',
    'Vodnář':   'revoluce, komunita, originalita, budoucnost — energie vzduchu',
    'Ryby':     'sny, empatie, spiritualita, iluze — energie vody',
}

# ─── Helpers ──────────────────────────────────────────────────────────────────

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def normalize_sign(sign: str) -> str:
    """Beran → beran, Štír → stir (stejná logika jako server)"""
    nfd = unicodedata.normalize('NFD', sign.lower())
    return ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')

def cache_key(sign: str, target_date: str) -> str:
    # v3-cs-nocontext = produkční cache (horoskopy.html + Claude), stejná jako na webu
    return f"{normalize_sign(sign)}_daily_{target_date}_v3-cs-nocontext"

def supabase_headers() -> dict:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

# ─── Supabase ─────────────────────────────────────────────────────────────────

def fetch_from_cache(signs: list, target_date: str) -> dict:
    """Vrátí {sign: prediction_text} pro znamení která jsou v cache."""
    keys = [cache_key(s, target_date) for s in signs]
    keys_filter = ",".join(f'"{k}"' for k in keys)

    url = f"{SUPABASE_URL}/rest/v1/cache_horoscopes"
    params = {
        "select": "sign,response",
        "cache_key": f"in.({keys_filter})"
    }
    resp = requests.get(url, headers=supabase_headers(), params=params, timeout=10)
    resp.raise_for_status()

    result = {}
    for row in resp.json():
        try:
            data = json.loads(row["response"])
            result[row["sign"]] = data.get("prediction", "")
        except Exception:
            pass
    return result

def save_to_cache(sign: str, target_date: str, response_json: dict):
    """Uloží vygenerovaný horoskop do Supabase cache."""
    url = f"{SUPABASE_URL}/rest/v1/cache_horoscopes"
    payload = {
        "cache_key": cache_key(sign, target_date),
        "sign": sign,
        "period": "daily",
        "response": json.dumps(response_json, ensure_ascii=False),
        "period_label": target_date,
    }
    headers = {**supabase_headers(), "Prefer": "resolution=merge-duplicates"}
    resp = requests.post(url, headers=headers, json=payload, timeout=10)
    if resp.status_code not in (200, 201):
        print(f"  [!] Cache save warning pro {sign}: {resp.status_code}")

# ─── Claude API ───────────────────────────────────────────────────────────────

def claude_call(system: str, user: str, max_tokens: int = 1000,
                purpose: str | None = None, model: str | None = None) -> str:
    import anthropic
    purpose = purpose or infer_claude_purpose()
    selected_model = model or model_for_purpose(purpose, CREATIVE_MODEL, UTILITY_MODEL)
    API_STATS.record(
        purpose=purpose,
        model=selected_model,
        system=system,
        user=user,
        max_tokens=max_tokens,
    )
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    msg = client.messages.create(
        model=selected_model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}]
    )
    return msg.content[0].text.strip()

def generate_horoscope(sign: str, target_date: str) -> str:
    """Vygeneruje horoskop přes Claude (stejný prompt jako web) a uloží do cache."""
    print(f"  [*] Generuji horoskop pro {sign}...")
    d = date.fromisoformat(target_date)
    date_cs = f"{d.day}. {MONTHS_CS[d.month - 1]} {d.year}"
    energy = SIGN_ENERGY_PROFILES.get(sign, '')
    energy_line = f"\nENERGIE ZNAMENÍ {sign.upper()}: {energy}. Přizpůsob tón, metafory a radu této energii." if energy else ""
    user_prompt = f"Znamení: {sign}\nDatum: {date_cs}{energy_line}"
    raw = claude_call(HOROSCOPE_SYSTEM_PROMPT, user_prompt, max_tokens=600)

    # Parsuj JSON z odpovědi
    try:
        # Odstraň markdown code blocks pokud jsou
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        data = json.loads(clean.strip())
    except Exception:
        # Fallback: použij raw text jako prediction
        data = {"prediction": raw, "affirmation": "", "luckyNumbers": []}

    save_to_cache(sign, target_date, data)
    return data.get("prediction", raw)

def build_suno_prompt(signs: list, script: str, target_date: str) -> str:
    """Vygeneruje Suno prompt tematicky odpovídající voiceoveru — pokaždé jiný."""
    date_obj = date.fromisoformat(target_date)
    date_cs = f"{date_obj.day}. {MONTHS_CS[date_obj.month - 1]}"

    # Detekuj dominantní náladu scriptu podle tagů
    tag_counts = {}
    for tag in ['intense', 'mysterious', 'commanding', 'serious', 'gentle', 'soft', 'warm', 'confident', 'upbeat']:
        tag_counts[tag] = script.count(f'[{tag}]')
    dominant = max(tag_counts, key=tag_counts.get)

    # Denní variace — jiná kombinace nástrojů každý den
    INSTRUMENT_VARIATIONS = [
        "warm piano and soft orchestral strings",
        "gentle marimba and airy synth pads",
        "acoustic guitar harmonics and warm cello",
        "soft vibraphone and shimmering synth layers",
        "light harp and delicate flute melody",
        "mellow Rhodes piano and warm ambient textures",
        "gentle music box melody over soft orchestral bed",
    ]
    TEXTURE_VARIATIONS = [
        "shimmering cosmic light trails",
        "gentle stardust floating through warm air",
        "soft nebula glow on the horizon",
        "sunrise breaking through a starlit sky",
        "golden light filtering through cosmic clouds",
        "morning dew on a celestial landscape",
        "first rays of light touching distant galaxies",
    ]

    day_seed = int(hashlib.md5(target_date.encode()).hexdigest(), 16)
    instruments = INSTRUMENT_VARIATIONS[day_seed % len(INSTRUMENT_VARIATIONS)]
    texture = TEXTURE_VARIATIONS[(day_seed // 7) % len(TEXTURE_VARIATIONS)]

    MOOD_SEEDS = {
        'intense':    'motivational and bright, energizing without aggression',
        'mysterious': 'gently mysterious, warm and hopeful, like a cosmic morning secret',
        'commanding': 'confident and uplifting, inspiring forward momentum',
        'serious':    'calm and grounding, peaceful morning meditation',
        'gentle':     'tender and healing, soft and reassuring',
        'soft':       'delicate and airy, like floating through morning light',
        'warm':       'golden and hopeful, sunrise energy, easy and flowing',
        'confident':  'bright and empowering, feel-good and positive',
        'upbeat':     'light and cheerful, flowing rhythm, easy listening joy',
    }
    mood_seed = MOOD_SEEDS.get(dominant, 'warm and uplifting, positive cosmic energy')

    system = """You are an expert music producer writing song descriptions for the AI music generator Suno.
Output: ONLY the song description — max 3 lines, plain English.
CRITICAL: Use ONLY standard ASCII Latin characters. Zero Chinese, Japanese, Korean or any non-Latin characters.
No style tags, no headers, no comments. Just the description."""

    user = f"""Date: {date_cs}
Zodiac signs: {', '.join(signs)}
Featured instruments today: {instruments}
Visual texture: {texture}
Mood character: {mood_seed}

Write a Suno song description. The music must:
- Be instrumental (no vocals, no lyrics)
- SHORT: exactly 60-90 seconds — mention this
- OPENING VARIETY: NEVER start the description with "Energetic morning cosmic sprint" — use a fresh, unique opening every time. Examples: "Bright celestial fanfare with...", "A sunrise-powered groove built on...", "Punchy cosmic rhythm driven by...", "Sparkling dawn theme featuring..."
- NEVER mention zodiac sign names (Aries, Taurus, Gemini, Leo, Virgo, Scorpio, etc.) — Suno does not use them and they sound odd in music descriptions
- Style: MORNING ENERGIZER — upbeat, driving, feel-good, makes you want to get up and move
- Mystical and cosmic aesthetic but with ENERGY — think sunrise sprint, not sunset meditation
- Bright tempo, forward momentum, punchy rhythm — NOT ambient, NOT background, NOT sleep music
- Major key, uplifting chord progressions, clear beat
- NO slow pads, NO drone, NO lullaby feel, NO "floating" or "drifting" atmosphere
- Use the featured instruments: {instruments} — play them with energy, not softly
- Evoke the visual texture: {texture} — but dynamic, like the scene is in motion
- Feel unique to today while staying in this warm positive style
- End with: "Short instrumental, 60-90 seconds, loop-ready." """

    print("[*] Generuji Suno prompt...")
    return claude_call(system, user, max_tokens=300)


def build_thumbnail_prompt(target_date: str, signs: list,
                           bg_color: str, wheel_color: str) -> str:
    """Vygeneruje Nano Banana thumbnail prompt přes thumbnail.generate_one()."""
    import thumbnail
    history = thumbnail.load_history()
    prompt = thumbnail.generate_one(target_date, bg_color, wheel_color, history)
    thumbnail.save_history(history)
    return prompt


def build_tiktok_description(signs: list, script: str, target_date: str) -> str:
    """Vygeneruje TikTok/Instagram description na základě hotového scriptu."""
    date_obj = date.fromisoformat(target_date)
    date_cs = f"{date_obj.day}. {MONTHS_CS[date_obj.month - 1]}"

    hashtag_signs_pascal = " ".join(f"#{s.capitalize()}" for s in signs)

    system = """Jsi copywriter pro českou mystickou stránku Mystická Hvězda.
Píšeš TikTok / Instagram description k horoskopu videu.

PRAVIDLA:
- Tykáš, 2. os. j.č., žádné lomené tvary (šel/šla)
- GENDEROVÁ NEUTRALITA: Absolutní zákaz minulých příčestí (toužila, čekala, hledal, snil, otevírala). VŽDY přítomný nebo budoucí čas. Místo "cesta, po které toužila" → "cesta, po které toužíš". Místo "byl jsi" → "jsi".
- Přesně 3 věty textu — záhadné, osobní, taháček na kliknutí
- Hook v první větě — napětí nebo otázka, přidej přesně 2 emoji organicky do textu (ne na konci)
- DATUM: Zahrň datum "{date_cs}" přirozeně do první věty — např. "Dnes {date_cs} přichází..." nebo "{date_cs} — den, kdy..."
- Vyhni se klišé jako "ze hvězd", "od hvězd", "hvězdy ti posílají" — hledej svěžejší formulace
- NEZMIŇUJ explicitně která 3 znamení jsou ve videu — zachovej záhadu
- Třetí věta = silná výzva k akci BEZ odkazu — např. "Sleduj nás ať ti neunikne nic." nebo "Ulož si video, budeš se k němu vracet." nebo "Označ někoho, komu to dnes sedí."
- ZAKÁZANÁ SLOVA: "portál", "brána", "otevírá se portál/brána" — příliš vágní klišé. Místo toho popiš konkrétní pocit nebo situaci.
- Na TikToku NESMÍ být žádný odkaz ani URL — pouze text a hashtags
- Za textem PRÁZDNÝ ŘÁDEK a pak hashtags na samostatném řádku
- Hashtags: MAX 6 celkem — #mystickaHvezda + VŠECHNA 3 znamení s velkým počátečním písmenem + 1 obecný (#astrologie nebo #horoskop) + 1 trendový (#fyp nebo #spiritualita)
- Piš POUZE česky, pouze latinkou, žádné cizí znaky ani kanji
- ČISTÁ ČEŠTINA: NIKDY nepoužívej anglická slova (spreadsheet, feedback, challenge, mindset, vibe, deadline, random...). Vždy česky: feedback → zpětná vazba, challenge → výzva, mindset → nastavení mysli. Výjimky: názvy planet a Instagram/TikTok.
- Výstup JEN samotný text, žádné komentáře"""

    user = f"""Datum: {date_cs}
Znamení ve videu: {', '.join(signs)} (NEzmiňuj je explicitně v textu)

Voiceover script (pro kontext):
{script[:600]}

Napiš TikTok description ve formátu:
[3 věty textu s emoji]

#mystickaHvezda [VŠECHNA 3 znamení] [1 obecný: #astrologie nebo #horoskop] [1 trendový: #fyp nebo #spiritualita]
(Znamení k použití — VŠECHNA 3: {hashtag_signs_pascal})"""

    print("[*] Generuji TikTok description...")
    return claude_call(system, user, max_tokens=400)


def build_facebook_description(signs: list, script: str, target_date: str) -> str:
    """Vygeneruje Facebook Reels description — delší, komunitní tón."""
    date_obj = date.fromisoformat(target_date)
    date_cs = f"{date_obj.day}. {MONTHS_CS[date_obj.month - 1]}"

    hashtag_signs_pascal = " ".join(f"#{s.capitalize()}" for s in signs)

    system = """Jsi copywriter pro českou mystickou stránku Mystická Hvězda.
Píšeš Facebook Reels description k horoskopu videu.

PRAVIDLA:
- Tykáš, 2. os. j.č., žádné lomené tvary (šel/šla)
- GENDEROVÁ NEUTRALITA: Absolutní zákaz minulých příčestí (toužila, čekala, hledal, snil). VŽDY přítomný nebo budoucí čas. Místo "cesta, po které toužila" → "cesta, po které toužíš". Vyhni se klišé "ze hvězd", "od hvězd" — hledej svěžejší formulace.
- Přesně 4 věty textu — RYTMUS: první 2 věty KRÁTKÉ (do 10 slov každá), třetí rozvíjí energii dne, čtvrtá silný závěr + CTA
- DATUM: Zahrň "{date_cs}" přirozeně do první nebo druhé věty
- 2–3 emoji organicky v textu, ne na konci jako blok
- NEZMIŇUJ explicitně která 3 znamení jsou ve videu — zachovej záhadu
- Čtvrtá věta = CTA s odkazem: "Celý výklad najdeš na mystickahvezda.cz/horoskopy.html ✨"
- Za textem PRÁZDNÝ ŘÁDEK a pak hashtags na samostatném řádku
- Hashtags: #mystickaHvezda + znamení s velkým počátečním písmenem + fixní FB tagy (bez #fyp)
- ZAKÁZANÁ SLOVA: "portál", "brána", "otevírá se portál/brána" — příliš vágní klišé. Místo toho popiš konkrétní pocit nebo situaci.
- Tón: komunitní, trochu osobnější než TikTok — jako by psal přítel, ne algoritmus
- VŽDY tykáš jednotlivci (ty/tě/ti/tvé) — NIKDY neoslovuj skupinu ("vás", "někdo z vás", "mnozí z vás") — i na FB mluvíš k jedinému čtenáři
- NIKDY 3. osoba o čtenáři ("třetí znamení pocítí", "někteří ucítí") — vždy 2. os. j.č. ("ty pocítíš", "cítíš")
- Piš POUZE česky, pouze latinkou
- ČISTÁ ČEŠTINA: NIKDY nepoužívej anglická slova (spreadsheet, feedback, challenge, mindset, vibe, deadline, random...). Vždy česky: feedback → zpětná vazba, challenge → výzva, mindset → nastavení mysli. Výjimky: názvy planet a Instagram/TikTok.
- Výstup JEN samotný text, žádné komentáře"""

    user = f"""Datum: {date_cs}
Znamení ve videu: {', '.join(signs)} (NEzmiňuj je explicitně v textu)
Web: https://www.mystickahvezda.cz/horoskopy.html

Voiceover script (pro kontext):
{script[:600]}

Napiš Facebook description ve formátu:
[4 věty textu s emoji]

#mystickaHvezda {hashtag_signs_pascal} #horoskop #astrologie #dennihoroskop #mystika"""

    print("[*] Generuji Facebook description...")
    return claude_call(system, user, max_tokens=400)


def build_voiceover(signs_data: dict, target_date: str) -> str:
    """Sestaví voiceover script — texty znamení jsou doslovně z produkce, Claude generuje jen hook a outro."""
    date_obj = date.fromisoformat(target_date)
    date_cs = f"{date_obj.day}. {MONTHS_CS[date_obj.month - 1]}"

    def normalize_tykani(text: str) -> str:
        """Převede vykání na tykání a odstraní oslovení (milý/milá/milí X)."""
        # Odstraň oslovení na začátku (Milý Lve, / Milá Panno, / Milí Blíženci, atd.)
        text = re.sub(r'^Mil[ýáé]\s+\w+,\s*', '', text)
        # Vykání → tykání
        replacements = [
            (r'\bvás\b', 'tě'),
            (r'\bVás\b', 'tě'),
            (r'\bvám\b', 'ti'),
            (r'\bVám\b', 'ti'),
            (r'\bvaše\b', 'tvé'),
            (r'\bVaše\b', 'tvé'),
            (r'\bváš\b', 'tvůj'),
            (r'\bVáš\b', 'tvůj'),
            (r'\bvaší\b', 'tvé'),
            (r'\bVaší\b', 'tvé'),
            (r'\bvašeho\b', 'tvého'),
            (r'\bVašeho\b', 'tvého'),
            (r'\bvašemu\b', 'tvému'),
            (r'\bVašemu\b', 'tvému'),
            (r'\bvašich\b', 'tvých'),
            (r'\bVašich\b', 'tvých'),
            (r'\bvašimi\b', 'tvými'),
            (r'\bVašimi\b', 'tvými'),
            (r'\bvašim\b', 'tvým'),
            (r'\bVašim\b', 'tvým'),
            (r'\bvámi\b', 'tebou'),
            (r'\bVámi\b', 'tebou'),
            (r'\bbuďte\b', 'buď'),
            (r'\bBuďte\b', 'Buď'),
            (r'\bvěnujte\b', 'věnuj'),
            (r'\bVěnujte\b', 'Věnuj'),
            (r'\bnezapomeňte\b', 'nezapomeň'),
            (r'\bNezapomeňte\b', 'Nezapomeň'),
            (r'\bnebojte se\b', 'neboj se'),
            (r'\bNebojte se\b', 'Neboj se'),
            (r'\bjste\b', 'jsi'),
            (r'\bJste\b', 'Jsi'),
            (r'\bvyužijte\b', 'využij'),
            (r'\bVyužijte\b', 'Využij'),
            (r'\bzkuste\b', 'zkus'),
            (r'\bZkuste\b', 'Zkus'),
            (r'\bpřijďte\b', 'přijď'),
            (r'\bPřijďte\b', 'Přijď'),
            (r'\bumíte\b', 'umíš'),
            (r'\bUmíte\b', 'Umíš'),
            (r'\bmůžete\b', 'můžeš'),
            (r'\bMůžete\b', 'Můžeš'),
            (r'\bmáte\b', 'máš'),
            (r'\bMáte\b', 'Máš'),
            (r'\bznáte\b', 'znáš'),
            (r'\bZnáte\b', 'Znáš'),
            (r'\bcítíte\b', 'cítíš'),
            (r'\bCítíte\b', 'Cítíš'),
            (r'\bvidíte\b', 'vidíš'),
            (r'\bVidíte\b', 'Vidíš'),
            (r'\bchcete\b', 'chceš'),
            (r'\bChcete\b', 'Chceš'),
            (r'\bpotřebujete\b', 'potřebuješ'),
            (r'\bPotřebujete\b', 'Potřebuješ'),
            (r'\bděláte\b', 'děláš'),
            (r'\bDěláte\b', 'Děláš'),
            (r'\bjdete\b', 'jdeš'),
            (r'\bJdete\b', 'Jdeš'),
            (r'\bvy\b', 'ty'),
            (r'\bVy\b', 'Ty'),
        ]
        for pattern, replacement in replacements:
            text = re.sub(pattern, replacement, text)
        return text.strip()

    # Připrav surová data znamení — normalizovaný text + metadata
    signs_raw = []
    for sign, prediction in signs_data.items():
        vocative = SIGN_VOCATIVE.get(sign, sign)
        allowed_tags = SIGN_ALLOWED_TAGS.get(sign, ['warm'])
        normalized = normalize_tykani(prediction)
        prediction_lower = normalized[0].lower() + normalized[1:] if normalized else normalized
        signs_raw.append({
            "vocative": vocative,
            "text": prediction_lower,
            "allowed_tags": allowed_tags,
        })

    # Claude generuje celý script — hook, sekce znamení s bohatými tagy, outro
    weekday_names = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"]
    weekday_name = weekday_names[date_obj.weekday()]

    system = """Jsi copywriter pro českou mystickou stránku Mystická Hvězda.
Píšeš voiceover script pro krátké video (Instagram Reel / TikTok).
Tykáš, 2. os. j.č. — NIKDY žádný lomený tvar.
GENDEROVÁ NEUTRALITA: Nepoužívej rodově zabarvená slovesa ani zájmena. Místo "jsi ten, kdo" → "jsi někdo, kdo". Místo "vykročil" → "vykročíš" nebo "jdeš". Místo "byl jsi" → "jsi". Místo "ten pravý" → "ta správná energie". Vždy přítomný čas nebo budoucí, nikdy minulý příčestí činné.

ENERGIE ZNAMENÍ (použij jako základ tónu sekce, ne doslova):
- Beran: průkopník, akce, odvaha, impulzivnost
- Býk: stabilita, smyslovost, trpělivost, materialismus
- Blíženci: komunikace, zvídavost, dualita, rychlost
- Rak: emoce, domov, intuice, ochrana
- Lev: kreativita, sebevyjádření, vedení, drama
- Panna: analýza, detail, služba, zdraví
- Váhy: harmonie, vztahy, krása, rozhodování
- Štír: transformace, hloubka, tajemství, regenerace
- Střelec: svoboda, expanze, cestování, filozofie
- Kozoroh: disciplína, kariéra, ambice, struktura
- Vodnář: revoluce, komunita, originalita, budoucnost
- Ryby: sny, empatie, spiritualita, iluze

JAZYK — ČISTÁ ČEŠTINA:
- NIKDY nepoužívej anglická slova (spreadsheet, too much, data, feedback, challenge, skill, mindset, vibe, random, deadline...).
- Vždy najdi český ekvivalent: spreadsheet → tabulka, feedback → zpětná vazba, deadline → termín, challenge → výzva, skill → dovednost, mindset → nastavení mysli, random → náhodný.
- Výjimky: názvy planet (Saturn, Jupiter, Pluto) a slovo "Instagram/TikTok" v CTA zůstávají.

Výstup JEN samotný text — žádné nadpisy, žádné labely, žádné hvězdičky."""

    signs_input = "\n".join(
        f'- {s["vocative"]}: "{s["text"]}" (dovolené tagy: {", ".join(s["allowed_tags"])})'
        for s in signs_raw
    )

    # Hook rotace podle dne v týdnu
    hook_rotace = {
        0: 'otázka — např. "Co když to, čemu se dnes vyhýbáš, je přesně to, co tě posune?"',     # Po
        3: 'otázka — např. "Co když to, čemu se dnes vyhýbáš, je přesně to, co tě posune?"',     # Čt
        1: 'provokace — např. "Většina lidí tohle přehlédne. Dnes ne."',                           # Út
        4: 'provokace — např. "Většina lidí tohle přehlédne. Dnes ne."',                           # Pá
        2: 'tiché otevření — např. "Dnes je v energii něco, co se nedá přehlédnout."',             # St
        5: 'tiché otevření — např. "Dnes je v energii něco, co se nedá přehlédnout."',             # So
        6: 'poetické — např. "Mezi nocí a ránem existuje okamžik, kdy vesmír mluví."',             # Ne
    }
    hook_styl = hook_rotace[date_obj.weekday()]

    user = f"""Datum: {date_cs} ({weekday_name})

Napiš celý voiceover script ve třech částech:

1) HOOK — přesně 2 věty, každá s tagem: "[tag] věta. [tag] věta."
   PRAVIDLO: NIKDY nejmenuj konkrétní znamení — divák musí video dokoukat, aby zjistil která.
   DATUM V HOOKU: Zahrň datum "{date_cs}" přirozeně do první nebo druhé věty — např. "Dnes, {date_cs}, přichází energie..." nebo "{date_cs} přináší vybraným znamením...". Datum ukáže, že jsme aktuální.
   Vyvolej zvědavost: naznač, že VYBRANÁ znamení dostanou speciální energii/průlom.
   NIKDY nepiš číslo znamení (ne "tři", "čtyři"). NIKDY: "Jsi mezi nimi?", "patříš mezi ně".
   HOOK STYL PRO DNEŠNÍ DEN ({weekday_name}): {hook_styl}
   GENDEROVÁ NEUTRALITA V HOOKU: Absolutní zákaz minulých příčestí (toužila, čekala, hledal, snil).
   Používej POUZE přítomný nebo budoucí čas — "touží", "čeká", "hledá", "přichází".
   Podmět hooku musí být vždy neutrální: "vybraná znamení", "hvězdy", "energie", "vesmír" — NIKDY "ty".
   ZAKÁZANÁ SLOVA V HOOKU: "portál", "brána", "otevírá se portál" — příliš vágní klišé. Místo toho popiš konkrétní pocit, situaci nebo astrologický posun.

2) SEKCE ZNAMENÍ — pro každé znamení níže napiš jeho sekci:
   - Začni oslovením: "[tag] {{vocative}},"
   - Pak PROKLÁDEJ text dalšími tagy uvnitř vět — každá věta nebo výrazný obrat MUSÍ mít svůj tag.
   - Vzor: "[intense] Berane, [commanding] dnes tě čeká průlom, [warm] který jsi dlouho hledal."
   - Minimálně 2–3 tagy na sekci znamení, rozložené přirozeně v textu.
   - Text věrně zachovej — jen obal tagy, nepřepisuj obsah.
   - Povolené tagy pro každé znamení jsou uvedeny níže.
   - Přizpůsob tón energii znamení (viz ENERGIE ZNAMENÍ v systémovém promptu).
   STRUKTURA SEKCE — pro každé ze tří znamení použij JINOU z těchto forem (střídej):
   - Forma A (výzva): "[tag] {{vocative}}, [tag] dnes přichází moment, který čekáš. [tag] Ne zítra. Dnes."
   - Forma B (varování): "[tag] {{vocative}}, [tag] pozor na jedno — dnešní energie může svést z cesty, pokud..."
   - Forma C (mikropříběh): "[tag] {{vocative}}, [tag] stojíš u okna. Venku prší. Zavřeš oči a najednou to cítíš — něco se mění."
   POVINNÉ: Alespoň JEDNA ze tří sekcí MUSÍ používat Formu C (mikropříběh) — přítomný čas, 2. os., konkrétní vizuální scéna z každodenního života ("Jdeš ulicí.", "Sedíš u stolu.", "Díváš se na telefon."). Ne abstraktní popisy energie.
   Tagy celkově: [mysterious] [intense] [warm] [gentle] [confident] [upbeat] [commanding] [soft]

   Znamení:
{signs_input}

3) OUTRO — 3 věty s tagy, CTA na web + výzva ke sdílení.
   Vzor: "[upbeat] věta o webu. [warm] výzva ke sdílení. [gentle] důvod proč poslat dál."
   NIKDY: "Pošli to někomu komu to sedí" ani "Třeba mu to dnes změní den"
   WEB URL V OUTRO: VŽDY "mystickahvezda.cz" — NIKDY "Mystická-Hvězda.cz", "mysticka-hvezda.cz" ani jiné varianty s pomlčkou.

Výstup ve formátu (nic jiného — žádné nadpisy jako HOOK: nebo SEKCE:):
[hook věta 1]. [hook věta 2].

[sekce znamení 1]

[sekce znamení 2]

[sekce znamení 3]

[outro]"""

    print("[*] Generuji voiceover script...")
    raw = claude_call(system, user, max_tokens=800)

    # Hook validace — zkontroluj, že hook odpovídá dennímu stylu
    hook_lines = raw.strip().split("\n")[0]  # první řádek = hook
    weekday = date_obj.weekday()
    needs_retry = False
    if weekday in (0, 3):  # Po/Čt = otázka — musí obsahovat "?"
        if "?" not in hook_lines:
            needs_retry = True
            print("  [!] Hook nema otazku pro Po/Ct — regeneruji...")
    elif weekday in (1, 4):  # Út/Pá = provokace — nesmí obsahovat "?"
        if "?" in hook_lines:
            needs_retry = True
            print("  [!] Hook ma otazku misto provokace pro Ut/Pa — regeneruji...")
    elif weekday == 6:  # Ne = poetický — nesmí obsahovat "většina" ani "?"
        if "většina" in hook_lines.lower() or "?" in hook_lines:
            needs_retry = True
            print("  [!] Hook neni poeticky pro nedeli — regeneruji...")

    if needs_retry:
        raw = claude_call(system, user, max_tokens=800)

    return raw

def proofread_script(script: str) -> str:
    """Projde voiceover script, opraví gramatiku a přeloží cizí slova do češtiny."""
    system = """Jsi jazykový korektor češtiny specializovaný na astrologické texty.
Dostaneš voiceover script s hranatými závorkami [tag] pro hlasové styly — ty NIKDY neměň ani neodstraňuj.
Výstup JEN opravený text — žádné komentáře, žádné vysvětlování změn, žádné uvozovky kolem textu."""

    user = f"""Oprav tento voiceover script:

1. Gramatické chyby — oprav interpunkci, shodu, pádové koncovky
2. Cizí slova → česky: Venus → Venuše, Mars → Mars (OK), Mercury → Merkur, Saturn → Saturn (OK), Jupiter → Jupiter (OK), Neptune → Neptun, Pluto → Pluto (OK).
   ANGLICKÁ SLOVA → ČESKY: spreadsheet → tabulka, too much → příliš, feedback → zpětná vazba, deadline → termín, challenge → výzva, skill → dovednost, mindset → nastavení mysli, vibe → atmosféra, random → náhodný, data → údaje. Pokud najdeš JAKÉKOLI anglické slovo (kromě planet a Instagram/TikTok), přelož ho do češtiny.
3. Vykání → tykání pokud ještě někde zbylo (vás/vám/vaše → tě/ti/tvé)
4. Genderová neutralita — odstraň rodově specifické tvary: minulá příčestí jako "vykročil/vykročila", "toužila/toužil", "čekala/čekal", "hledal/hledala" → přeformuluj na přítomný/budoucí čas ("vykračuješ", "půjdeš", "toužíš", "čekáš"); "byl jsi/byla jsi" → "jsi"; "ten/ta" jako zájmeno osoby → "někdo", "člověk"; NIKDY lomené tvary. Toto platí OBZVLÁŠTĚ pro hook (první 2 věty scriptu).
5. Slovenismy → čeština: kreatívní → kreativní, konštruktívní → konstruktivní, pozitívní → pozitivní, intuitívní → intuitivní, aktívní → aktivní, progresívní → progresivní, masívní → masivní, exkluzívní → exkluzivní. Obecně: -ívní → -ivní.
6. Rodově zbarvené tvary v popisech (TikTok/FB texty mimo voiceover tagy) — oprav: "nebál" → "neodvažoval ses", "bála ses" → "neodvažoval ses", "toužil/toužila" → "toužíš". Platí i pro všechny minulé příčestí v 2. os. ("viděl jsi" → "vidíš", "šel jsi" → "jdeš").
7. Mikropříběh — alespoň JEDNA ze tří sekcí znamení MUSÍ obsahovat konkrétní vizuální scénu v přítomném čase, 2. os. ("Stojíš u okna.", "Sedíš u stolu.", "Díváš se na telefon."). Pokud žádná sekce nemá mikropříběh, přidej ho do sekce s Formou C nebo do poslední sekce — přepiš začátek na vizuální scénu.
8. Jinak TEXT NEMĚŇ — zachovej přesné znění, styl, délku

Script:
{script}"""

    print("[*] Proofreading...")
    return claude_call(system, user, max_tokens=800)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Voiceover generator pro Mystickou Hvězdu")
    parser.add_argument("--date", default=None, help="Datum videa (YYYY-MM-DD), default: dnes")
    parser.add_argument("--signs", nargs=3, metavar="SIGN",
                        help="3 konkretni znameni (default: nahodny vyber)")
    parser.add_argument("--snip", default=None, help="Snip videa pro analyzu barev (PNG/JPG)")
    parser.add_argument("--color-desc", default=None, help="Manualni popis barev pozadi")
    parser.add_argument("--quality", choices=["standard", "premium"], default="standard",
                        help="standard = levnejsi cache jen pro vybrana znameni; premium = prefetch vsech 12")
    parser.add_argument("--prefetch-all", action="store_true",
                        help="Predem dogeneruje cache pro vsech 12 znameni bez ohledu na quality")
    parser.add_argument("--skip-suno", action="store_true",
                        help="Negeneruje Suno prompt")
    parser.add_argument("--skip-thumbnail", action="store_true",
                        help="Negeneruje thumbnail prompt ani neanalyzuje snip")
    parser.add_argument("--skip-descriptions", action="store_true",
                        help="Negeneruje TikTok/Instagram ani Facebook description")
    parser.add_argument("--reuse-existing", action="store_true",
                        help="Pokud vystupni soubor existuje, nepousti API a jen vypise existujici cestu")
    parser.add_argument("--force", action="store_true",
                        help="Povoli prepsani existujiciho vystupniho souboru")
    args = parser.parse_args()

    API_STATS.reset()
    target_date = args.date or str(date.today())
    quality = args.quality
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / f"voiceover_{target_date}.txt"
    output_action = existing_output_action(out_path, force=args.force, reuse_existing=args.reuse_existing)
    if output_action == "reuse":
        print(f"[OK] Pouzivam existujici vystup bez API volani: {out_path}")
        return
    if output_action == "abort":
        print(f"[STOP] Vystup uz existuje: {out_path}")
        print("Pouzij --reuse-existing pro praci s existujicim souborem nebo --force pro prepsani.")
        return

    print(f"\n=== Voiceover Generator | datum: {target_date} | kvalita: {quality} ===\n")
    print(f"[*] Modely: creative={CREATIVE_MODEL} | utility={UTILITY_MODEL}")

    # 1. Vyber znamení
    if args.signs:
        chosen = args.signs
        invalid = [s for s in chosen if s not in ALL_SIGNS]
        if invalid:
            print(f"[CHYBA] Neplatna znameni: {invalid}")
            print(f"  Platna: {ALL_SIGNS}")
            sys.exit(1)
        # Manuální výběr — zaznamenej do used_signs
        used = load_used_signs()
        already = used.get(target_date, [])
        used[target_date] = already + [s for s in chosen if s not in already]
        save_used_signs(used)
    else:
        chosen = pick_signs(target_date)

    # Zobraz progress — kolik znamení celkem použito v tomto dni
    used_today = load_used_signs().get(target_date, [])
    print(f"[*] Vybrana znameni: {', '.join(chosen)}")
    print(f"[*] Tento den celkem pouzito: {len(used_today)}/12 znameni")

    # 2. Cache — standard řeší jen vybraná znamení, premium zachovává původní prefetch všech 12
    if args.prefetch_all or quality == "premium":
        print("[*] Prefetch: kontroluji cache pro vsech 12 znameni...")
        cached_all = fetch_from_cache(ALL_SIGNS, target_date)
        missing = [s for s in ALL_SIGNS if s not in cached_all]
        if missing:
            print(f"  [!] Chybi v cache: {', '.join(missing)} — generuji...")
            for sign in missing:
                cached_all[sign] = generate_horoscope(sign, target_date)
            print(f"[OK] Vsech 12 znameni pripraveno v cache.")
        else:
            print(f"[OK] Vsech 12 znameni uz v cache.")
    else:
        print("[*] Cache rezim: usporne kontroluji/generuji jen vybrana znameni.")
        cached_all = fetch_from_cache(chosen, target_date)
        missing = [s for s in chosen if s not in cached_all]
        if missing:
            print(f"  [!] Chybi v cache: {', '.join(missing)} — generuji jen tato znameni...")
            for sign in missing:
                cached_all[sign] = generate_horoscope(sign, target_date)

    # 3. Sestav horoskopy pro vybraná znamení
    horoscopes = {sign: cached_all[sign] for sign in chosen}
    for sign in chosen:
        print(f"  [cache] {sign}")

    # 4. Build voiceover + TikTok description + Suno prompt
    script = build_voiceover(horoscopes, target_date)
    script = proofread_script(script)
    # Přidej datum na začátek voiceover scriptu
    d = date.fromisoformat(target_date)
    date_header = f"🗓️ {d.day}. {MONTHS_CS[d.month - 1]} {d.year}\n\n"
    script = date_header + script
    if args.skip_descriptions:
        description = "[PRESKOCENO: --skip-descriptions]"
        fb_description = "[PRESKOCENO: --skip-descriptions]"
    else:
        description = build_tiktok_description(chosen, script, target_date)
        fb_description = build_facebook_description(chosen, script, target_date)

    suno = "[PRESKOCENO: --skip-suno]" if args.skip_suno else build_suno_prompt(chosen, script, target_date)

    # Barvy pro thumbnail — ze snipu, manuálního popisu, nebo default
    if args.skip_thumbnail:
        bg_color = ""
        wheel_color = ""
        thumbnail = "[PRESKOCENO: --skip-thumbnail]"
    else:
        import thumbnail as _thumb_mod
        if args.color_desc:
            bg_color = args.color_desc
            desc_lower = args.color_desc.lower()
            warm = sum(desc_lower.count(w) for w in ["amber","orange","scarlet","golden","warm","sienna","rust"])
            cool = sum(desc_lower.count(w) for w in ["blue","cobalt","electric","glacial","silver","ice","cyan","teal"])
            purp = sum(desc_lower.count(w) for w in ["indigo","violet","purple"])
            if cool >= warm and cool >= purp:
                wheel_color = "deep navy and glacial blue tones with icy silver-gold filigree"
            elif purp > warm:
                wheel_color = "deep indigo and cosmic violet tones with silver-gold filigree"
            elif warm > 0:
                wheel_color = "warm deep amber and burnt sienna tones with golden filigree"
            else:
                wheel_color = _thumb_mod.DEFAULT_WHEEL_COLOR
        elif args.snip:
            from pathlib import Path as _Path
            snip_path = _Path(args.snip)
            if snip_path.exists():
                bg_color, wheel_color = _thumb_mod.analyze_colors(str(snip_path))
            else:
                print(f"[!] Snip nenalezen: {args.snip} — defaultni barvy")
                bg_color, wheel_color = _thumb_mod.DEFAULT_COLOR_DESC, _thumb_mod.DEFAULT_WHEEL_COLOR
        else:
            print("[*] Zadny snip — defaultni barvy thumbnailem")
            bg_color, wheel_color = _thumb_mod.DEFAULT_COLOR_DESC, _thumb_mod.DEFAULT_WHEEL_COLOR

        thumbnail = build_thumbnail_prompt(target_date, chosen, bg_color, wheel_color)

    qa_report = build_qa_report(
        voiceover=script,
        tiktok_description="" if args.skip_descriptions else description,
        facebook_description="" if args.skip_descriptions else fb_description,
        suno="" if args.skip_suno else suno,
        thumbnail="" if args.skip_thumbnail else thumbnail,
        signs=chosen,
    )

    # 5. Vystup
    sep = "=" * 60
    print(f"\n{sep}\nVOICEOVER SCRIPT\n{sep}")
    print(script)
    print(f"\n{sep}\nTIKTOK / INSTAGRAM DESCRIPTION\n{sep}")
    print(description)
    print(f"\n{sep}\nFACEBOOK REELS DESCRIPTION\n{sep}")
    print(fb_description)
    print(f"\n{sep}\nSUNO PROMPT\n{sep}")
    print(suno)
    print(f"\n{sep}\nTHUMBNAIL PROMPT (Nano Banana)\n{sep}")
    print(thumbnail)
    print(sep)
    print_qa_report(qa_report)
    api_summary = API_STATS.summary()
    print_api_report(API_STATS)
    print(f"\n[OK] Hotovo! Datum videa: {target_date}")
    print(f"[OK] Znameni: {', '.join(chosen)}")

    # Uloz do souboru
    output = (
        f"VOICEOVER SCRIPT\n{sep}\n{script}\n\n"
        f"TIKTOK / INSTAGRAM DESCRIPTION\n{sep}\n{description}\n\n"
        f"FACEBOOK REELS DESCRIPTION\n{sep}\n{fb_description}\n\n"
        f"SUNO PROMPT\n{sep}\n{suno}\n\n"
        f"THUMBNAIL PROMPT (Nano Banana)\n{sep}\n{thumbnail}\n"
    )
    out_path.write_text(output, encoding="utf-8")
    print(f"[OK] Ulozeno: {out_path}")
    json_path = write_json_sidecar(out_path, {
        "script": "daily_reel.py",
        "date": target_date,
        "quality": quality,
        "signs": chosen,
        "models": {
            "creative": CREATIVE_MODEL,
            "utility": UTILITY_MODEL,
        },
        "options": {
            "skip_suno": args.skip_suno,
            "skip_thumbnail": args.skip_thumbnail,
            "skip_descriptions": args.skip_descriptions,
            "prefetch_all": args.prefetch_all,
            "force": args.force,
        },
        "outputs": {
            "voiceover": script,
            "tiktok_description": None if args.skip_descriptions else description,
            "facebook_description": None if args.skip_descriptions else fb_description,
            "suno": None if args.skip_suno else suno,
            "thumbnail": None if args.skip_thumbnail else thumbnail,
            "thumbnail_colors": {
                "background": bg_color,
                "wheel": wheel_color,
            },
        },
        "qa_report": qa_report,
        "api_usage": api_summary,
    })
    print(f"[OK] JSON: {json_path}")


if __name__ == "__main__":
    main()
