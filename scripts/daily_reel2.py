#!/usr/bin/env python3
"""
Daily Reel 2 — Voiceover Generator pro Mystickou Hvězdu
=========================================================
1. Načte denní horoskopy z Supabase cache
2. Chybějící vygeneruje přes Claude API (stejný prompt jako web)
3. Náhodně vybere 1 znamení (nebo dle --signs)
4. Přes Claude API zformátuje do voiceover scriptu s [] stylovými tagy

Usage:
    python daily_reel2.py
    python daily_reel2.py --date 2026-04-07        # konkrétní datum
    python daily_reel2.py --signs Kozoroh           # konkrétní znamení
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

USED_SIGNS_FILE = Path(__file__).parent / "used_signs2.json"

def load_used_signs() -> dict:
    if USED_SIGNS_FILE.exists():
        return json.loads(USED_SIGNS_FILE.read_text(encoding="utf-8"))
    return {}

def save_used_signs(data: dict):
    USED_SIGNS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def pick_signs(target_date: str) -> list:
    """Vybere 1 znamení které v daný den ještě nebylo použito."""
    used = load_used_signs()
    already_used = used.get(target_date, [])
    remaining = [s for s in ALL_SIGNS if s not in already_used]

    if len(remaining) < 1:
        # Všech 12 použito — reset pro tento den
        print(f"  [!] Vsechna znameni pro {target_date} uz pouzita — resetuji.")
        already_used = []
        remaining = ALL_SIGNS[:]

    chosen = random.sample(remaining, 1)

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

def claude_call(system: str, user: str, max_tokens: int = 1000) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    msg = client.messages.create(
        model="claude-sonnet-4-5",
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
- Style: SUBTLE MYSTICAL BACKGROUND — light, airy, atmospheric. Designed to sit UNDER a voiceover without competing with it.
- Think: soft cosmic backdrop, like distant stars humming. Present but never distracting.
- Low volume dynamics, gentle melodic hints — listener should feel the atmosphere, not notice the music
- Minimal arrangement: sparse notes, breathing space, no busy passages or solos
- Warm major key with a touch of mystery — hopeful and slightly ethereal
- NO strong melody that draws attention, NO loud swells, NO dramatic builds, NO percussion that punches through
- Use the featured instruments: {instruments} — played softly, as texture rather than foreground
- Evoke the visual texture: {texture} — still and atmospheric, like a held breath before dawn
- Feel unique to today while staying in this warm positive style
- End with: "Short instrumental, 60-90 seconds, loop-ready." """

    print("[*] Generuji Suno prompt...")
    return claude_call(system, user, max_tokens=300)


def build_tiktok_description(signs: list, script: str, target_date: str) -> str:
    """Vygeneruje TikTok/Instagram description na základě hotového scriptu."""
    date_obj = date.fromisoformat(target_date)
    date_cs = f"{date_obj.day}. {MONTHS_CS[date_obj.month - 1]} {date_obj.year}"

    sign = signs[0] if signs else ""

    system = """Jsi copywriter pro českou mystickou stránku Mystická Hvězda.
Píšeš TikTok / Instagram description k horoskopu videu pro JEDNO konkrétní znamení.

PRAVIDLA:
- Tykáš, 2. os. j.č., žádné lomené tvary (šel/šla)
- GENDEROVÁ NEUTRALITA: Absolutní zákaz minulých příčestí. VŽDY přítomný nebo budoucí čas.
- Přesně 3 věty textu — MIKROBLOG formát, ne jen popisek
- KLÍČOVÉ: Caption NEOPAKUJE hook videa ani twist — přidává NOVOU perspektivu nebo astro fakt (planeta, živel, mechanismus)
- Řádek 1: kontroverzní statement nebo astro fakt — jiná perspektiva než video hook
- Řádky 2–3: vzdělávací kontext (vládnoucí planeta, živel, psychologický mechanismus) + CTA
- DATUM: Zahrň datum "{date_cs}" přirozeně do první věty.
- 2 emoji organicky v textu (ne na konci jako blok)
- ZAKÁZANÁ SLOVA: "portál", "brána", "hvězdy ti posílají", "ze hvězd"
- Na TikToku NESMÍ být žádný odkaz ani URL — pouze text a hashtags
- Třetí věta = follow trigger nebo engagement CTA — důvod sledovat profil
- Za textem PRÁZDNÝ ŘÁDEK a pak hashtags na samostatném řádku
- Hashtags: MAX 6 celkem — #mystickaHvezda + znamení + #horoskop + #fyp
- GENDEROVÁ NEUTRALITA: Žádné genderové tvary ("být pravdivý/á", "byl/byla"). Přítomný čas, 2. os.
- AI-BLOB ZÁKAZ: Žádné symetrické vzorce ("Není to X. Je to Y." / "Ne X. Ale Y.")
- Piš POUZE česky, pouze latinkou, žádné cizí znaky ani kanji
- ČISTÁ ČEŠTINA: NIKDY nepoužívej anglická slova (spreadsheet, feedback, challenge, mindset, vibe, deadline, random...). Vždy česky: feedback → zpětná vazba, challenge → výzva, mindset → nastavení mysli. Výjimky: názvy planet a Instagram/TikTok.
- Výstup JEN samotný text, žádné komentáře"""

    user = f"""Datum: {date_cs}
Znamení ve videu: {sign}

Voiceover script (pro kontext — caption musí přidat NOVOU perspektivu, ne opakovat):
{script[:600]}

Napiš TikTok description ve formátu:
[3 věty textu s emoji — řádek 1: kontroverzní statement/astro fakt, řádek 2: vzdělávací kontext, řádek 3: follow trigger]

#mystickaHvezda #{sign} #horoskop #fyp"""

    print("[*] Generuji TikTok description...")
    return claude_call(system, user, max_tokens=400)


def build_facebook_description(signs: list, script: str, target_date: str) -> str:
    """Vygeneruje Facebook Reels description — delší, komunitní tón."""
    date_obj = date.fromisoformat(target_date)
    date_cs = f"{date_obj.day}. {MONTHS_CS[date_obj.month - 1]} {date_obj.year}"

    sign = signs[0] if signs else ""

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
- Tón: komunitní, trochu osobnější než TikTok — jako by psal přítel, ne algoritmus
- GENDEROVÁ NEUTRALITA: Žádné genderové tvary ("být pravdivý/á", "byl/byla"). Přítomný čas, 2. os.
- AI-BLOB ZÁKAZ: Žádné symetrické vzorce ("Není to X. Je to Y." / "Ne X. Ale Y.") — přeformuluj vždy do jedné věty
- Piš POUZE česky, pouze latinkou
- ČISTÁ ČEŠTINA: NIKDY nepoužívej anglická slova (spreadsheet, feedback, challenge, mindset, vibe, deadline, random...). Vždy česky: feedback → zpětná vazba, challenge → výzva, mindset → nastavení mysli. Výjimky: názvy planet a Instagram/TikTok.
- Výstup JEN samotný text, žádné komentáře"""

    user = f"""Datum: {date_cs}
Znamení ve videu: {sign}
Web: https://www.mystickahvezda.cz/horoskopy.html

Voiceover script (pro kontext — caption musí přidat NOVOU perspektivu a astro fakt):
{script[:600]}

Napiš Facebook description ve formátu:
[4 věty textu s emoji — řádek 1: kontroverzní statement, řádky 2–3: astro fakt + vzdělávací kontext, řádek 4: CTA s odkazem]

#mystickaHvezda #{sign} #horoskop #astrologie #dennihoroskop #mystika"""

    print("[*] Generuji Facebook description...")
    return claude_call(system, user, max_tokens=400)


def build_voiceover(signs_data: dict, target_date: str) -> str:
    """Sestaví voiceover script pro JEDNO znamení — mikropříběh + twist + komentářový trigger + follow trigger."""
    date_obj = date.fromisoformat(target_date)
    date_cs = f"{date_obj.day}. {MONTHS_CS[date_obj.month - 1]}"
    # Vezmi první (jediné) znamení ze slovníku
    sign = list(signs_data.keys())[0]
    sign_horoscope = list(signs_data.values())[0]
    sign_vocative = SIGN_VOCATIVE.get(sign, sign)
    sign_tags = SIGN_ALLOWED_TAGS.get(sign, ['warm', 'confident'])
    sign_energy = SIGN_ENERGY_PROFILES.get(sign, '')

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

    # Normalizuj horoskop (tykání)
    sign_horoscope = normalize_tykani(sign_horoscope)

    # Denní kontext
    weekday_names = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"]
    weekday_name = weekday_names[date_obj.weekday()]

    system = """Jsi copywriter pro českou mystickou stránku Mystická Hvězda.
Píšeš voiceover script pro krátké video (Instagram Reel / TikTok) — JEDNO konkrétní znamení.
Tykáš, 2. os. j.č. — NIKDY žádný lomený tvar.
GENDEROVÁ NEUTRALITA — ABSOLUTNÍ PRAVIDLO:
- 2. osoba (divák): Vždy přítomný čas nebo budoucí, nikdy minulý příčestí činné. Místo "vykročil" → "vykračuješ".
- 3. osoba (lidé ve scéně): NIKDY "němu/jí/ho/ji/on/ona" — divák může být muž, žena, jakákoliv orientace. Místo "naproti němu" → "naproti té osobě" nebo scénu postav bez lidí ("Otevřeš zprávu. Přečteš ji. Zamkneš telefon.").

FILOZOFIE: Mluvíš na JEDNOHO konkrétního člověka — ne na publikum. Video musí vyvolat reakci "to jsem přesně já."

STYL — MIKROPŘÍBĚH, ne přednáška:
- ❌ ZAKÁZÁNO: "tvá přirozená odvaha dostává zelenou" / "energie kolem tebe pulzuje" / "Neptun ti šeptá"
- ✅ SPRÁVNĚ: "Díváš se na tu zprávu. Přečteš ji potřetí. A zamkneš telefon."
- Slide 2 MUSÍ obsahovat konkrétní vizuální scénu z každodenního života — ne abstraktní rady

TWIST — POVINNÝ:
- Každé video MUSÍ mít moment překvapení nebo přerámování
- Formule: "Nemyslíš na [X]. Bojíš se [Y]." / "To co považuješ za [chybu] — je [síla]." / "Všichni říkají [X]. Pravda je opak."

BLACKLIST ZAKÁZANÝCH HOOKŮ — NIKDY NEPOUŽÍVEJ:
- "Hvězdy mluví..." / "Hvězdy říkají..." / "Hvězdy šeptají..." / "Stačí poslouchat..."
- Poetické popisy bez osobního zásahu ("Mlčky. Trpělivě. Hvězdy tam byly vždycky.")
- Atmosférické intro ("Noc. Ticho.")
- První věta delší než 7 slov
- Obecné zahájení bez identifikace znamení

ENERGIE ZNAMENÍ (základ tónu):
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

    # Hook rotace podle dne v týdnu — POUZE schválené formule, bez blacklistu
    hook_rotace = {
        0: f'přímé oslovení znamení — např. "Jsi {sign}? Zastav se." — identifikace = retence',                                          # Po
        1: f'kontroverze o znamení — např. "{sign}i nejsou [stereotyp]. Jsou [překvapení]." — max 7 slov první věta',                     # Út
        2: f'zrcadlo bolesti — např. "Vždycky [děláš X]. A nevíš proč." — osobní zásah, přítomný čas',                                   # St
        3: f'relationship hook — např. "Tvoje znamení ovlivňuje, jak miluješ." — prokázaně nejsilnější formule',                          # Čt
        4: f'přesný popis situace — např. "Pokud dnes nemůžeš [X] — tohle je důvod." — specifický zážitek persony',                      # Pá
        5: f'kontroverze o znamení — např. "{sign}i nejsou [stereotyp]. Jsou [překvapení]." — překvapující přerámování',                  # So
        6: f'zrcadlo bolesti — např. "Vždy [děláš X] jako první. A čekáš, že to někdo ocení." — nepohodlná pravda',                      # Ne
    }
    hook_styl = hook_rotace[date_obj.weekday()]

    # Vyber komentářový trigger podle znamení
    komentar_trigger_map = {
        'Beran':    f'Označ Berana, co tohle zná.',
        'Býk':      f'Napiš, jestli to sedí — Býci do komentáře ⬇️',
        'Blíženci': f'Označ Blížence, co tohle dělá.',
        'Rak':      f'Raci — napište jedno slovo jak se dnes cítíte ⬇️',
        'Lev':      f'Označ Lva, co tuhle energii zná.',
        'Panna':    f'Panny — napište, jestli to sedí ⬇️',
        'Váhy':     f'Označ Váhu, co tahle kalkulace zničila.',
        'Štír':     f'Označ Štíra, co přesně tohle dělá.',
        'Střelec':  f'Střelci — napiš kam tě to dnes tahá ⬇️',
        'Kozoroh':  f'Kozorohu — napiš co dnes odkládáš ⬇️',
        'Vodnář':   f'Označ Vodnáře, co tohle ví.',
        'Ryby':     f'Ryby — napište jedno slovo co teď cítíte ⬇️',
    }
    komentar_trigger = komentar_trigger_map.get(sign, f'Napiš svoje znamení ⬇️')

    # Follow trigger — rotace podle dne
    follow_triggers = [
        f"Zítra: které znamení to dělá nejhůř. Sleduj.",
        f"Příště odhalím {sign}ovo největší tajemství ve vztazích.",
        f"Pokračování zítra — sleduj, ať ti to neunikne.",
        f"Série pokračuje. Sleduj pro další znamení.",
        f"Zítra jdeme hlouběji. Sleduj.",
        f"Příští díl: co {sign} nikdy neřekne nahlas.",
        f"Zítra: proč {sign} sabotuje to, co chce nejvíc.",
    ]
    follow_seed = int(hashlib.md5(target_date.encode()).hexdigest(), 16)
    follow_trigger = follow_triggers[follow_seed % len(follow_triggers)]

    user = f"""Datum: {date_cs} ({weekday_name})
Znamení: {sign} (vokativ: {sign_vocative})
Energie znamení: {sign_energy}
Dovolené ElevenLabs tagy pro toto znamení: {', '.join(sign_tags)}

Napiš voiceover script PŘESNĚ ve 3 slidech. Struktura je pevná — NEměň ji.
CÍLOVÁ DÉLKA: 35–45 slov celkem (= 15–20 sekund). Piš STRUČNĚ — krátké punchy věty.

=== SLIDE 1 — HOOK (3–5 sekund, MAX 2 věty, 8–12 slov) ===
Hook styl pro dnešní den ({weekday_name}): {hook_styl}

Pravidla hooku:
- PRVNÍ věta: MAX 7 slov. Silná, přímá identifikace persony nebo nepohodlná pravda.
- DRUHÁ věta: Musí zrcadlit KONKRÉTNÍ frázi nebo situaci, kterou tato persona reálně zažívá — ne obecné "a většina to nechápe" ani vágní "a dnes se to mění".
- DATUM: Zahrň "{date_cs}" přirozeně do první nebo druhé věty.
- Každá věta má svůj ElevenLabs tag: "[tag] věta."
- Za každou větou přidej pauzu: <break time="0.5s" /> po první větě, <break time="1.0s" /> po druhé větě (přechod na slide 2).
- BLACKLIST — NIKDY: "Hvězdy mluví/říkají/šeptají", "Stačí poslouchat", poetické popisy bez osoby, věta delší než 7 slov jako první věta.

=== SLIDE 2 — JÁDRO + TWIST (6–8 sekund, 18–25 slov) ===
Toto je nejdůležitější část. MUSÍ obsahovat:

A) MIKROPŘÍBĚH — konkrétní vizuální scéna ze života persony:
   - Přítomný čas, 2. osoba, max 8 slov na větu
   - ❌ ZAKÁZÁNO: "tvá energie dostává zelenou", "Neptun ti šeptá", "cítíš to tlačení" (vnitřní pocit, ne vizuální)
   - ✅ SPRÁVNĚ: "Díváš se na tu zprávu. Přečteš ji potřetí. A zamkneš telefon."
   - Scéna musí být VIDITELNÁ — konkrétní akce kterou kamera vidí (díváš se, otevřeš, zamkneš, sedíš, scrolluješ), NE vnitřní monolog (cítíš, přemýšlíš, víš)
   - Mezi větami uvnitř slidu: <break time="0.3s" />
   - GENDER NEUTRALITA 3. OSOBY — KRITICKÉ: Nikdy nepoužívej "němu/jí/ho/ji/on/ona" pro osoby ve scéně. Divák může být kdokoli — muž, žena, jakákoliv orientace.
     ❌ "Sedíš naproti němu." — předpokládá mužského partnera = divák je žena
     ❌ "Díváš se na ni." — předpokládá ženský objekt
     ✅ "Sedíš naproti té osobě." / "Sedíš naproti svému šéfovi." (konkrétní role bez pohlaví) / "Otevřeš konverzaci." (bez osoby vůbec)
     ✅ Nejlepší: vybuduj scénu bez třetí osoby — objekt je věc, ne člověk: "Díváš se na tu zprávu.", "Otevřeš profil.", "Zamkneš telefon."

B) TWIST — povinný moment překvapení nebo přerámování:
   - Přijde po mikropříběhu jako "aha moment"
   - ❌ ZAKÁZANÉ SYMETRICKÉ VZORCE: "Nejde o X. Jde o Y." / "Není to X. Je to Y." / "Ne X. Ale Y." — tohle je AI-blob, NIKDY nepoužívej!
   - ✅ SPRÁVNÉ TWISTY: "Rozchod? Hádka? Ne. Přestáváš hrát roli, co ti někdo přidělil." / "Jo, ničíš to. Ale ne proto, že jsi zlá."
   - Divák musí říct "wow, tohle jsem nevěděla"
   - Za twistem: <break time="1.0s" /> (přechod na slide 3)
   - Použij dovolené tagy pro toto znamení

Horoskopový podklad (zahrň jeho esenci do mikropříběhu, nepřepisuj doslova):
"{sign_horoscope}"

=== SLIDE 3 — CTA (4–5 sekund, 10–14 slov) ===
Věta 1 (komentářový trigger — POVINNÁ): {komentar_trigger}
Věta 2 (follow trigger — POVINNÁ): {follow_trigger}

Pravidla CTA:
- Přesně tyto 2 věty — nezměněné, jen obal tagy
- ŽÁDNÝ odkaz na web v CTA — link patří do caption, ne do voiceoveru
- Tagy: věta 1 = [inviting], věta 2 = [clearly]
- Mezi větami: <break time="0.3s" />

=== ELEVENLABS FORMÁTOVÁNÍ (POVINNÉ) ===
- Každá věta MUSÍ mít emoční tag: [mysterious], [intense], [warm], [gentle], [confident], [upbeat], [commanding], [soft], [inviting], [clearly]
- Pauzy MUSÍ být přítomné:
  - <break time="0.3s" /> — krátká pauza (uvnitř slidu, mezi větami)
  - <break time="0.5s" /> — střední pauza (po první větě hooku)
  - <break time="1.0s" /> — dlouhá pauza (přechod mezi slidy 1→2 a 2→3)

=== VÝSTUPNÍ FORMÁT ===
Vypiš POUZE čistý voiceover text se značkami a <break> tagy. Žádné nadpisy SLIDE 1 / SLIDE 2 / SLIDE 3.
Mezi slidy vždy prázdný řádek.

Tagy celkově: [mysterious] [intense] [warm] [gentle] [confident] [upbeat] [commanding] [soft] [inviting] [clearly]"""

    print("[*] Generuji voiceover script...")
    raw = claude_call(system, user, max_tokens=800)

    # Hook validace — zkontroluj, že hook odpovídá dennímu stylu
    hook_line = raw.strip().split("\n")[0]
    weekday = date_obj.weekday()
    needs_retry = False
    if weekday in (0, 3):  # Po/Čt = otázka — musí obsahovat "?"
        if "?" not in hook_line:
            needs_retry = True
            print("  [!] Hook nema otazku pro Po/Ct — regeneruji...")
    elif weekday in (1, 4):  # Út/Pá = provokace — nesmí obsahovat "?"
        if "?" in hook_line:
            needs_retry = True
            print("  [!] Hook ma otazku misto provokace pro Ut/Pa — regeneruji...")
    elif weekday == 6:  # Ne = poetický — nesmí obsahovat "většina" ani "?"
        if "většina" in hook_line.lower() or "?" in hook_line:
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

1. Gramatické chyby — oprav interpunkci, shodu, pádové koncovky. "Dneš" → "Dnes".
2. Cizí slova → česky: Venus → Venuše, Mars → Mars (OK), Mercury → Merkur, Saturn → Saturn (OK), Jupiter → Jupiter (OK), Neptune → Neptun, Pluto → Pluto (OK).
   ANGLICKÁ SLOVA → ČESKY: spreadsheet → tabulka, too much → příliš, feedback → zpětná vazba, deadline → termín, challenge → výzva, skill → dovednost, mindset → nastavení mysli, vibe → atmosféra, random → náhodný, data → údaje. Pokud najdeš JAKÉKOLI anglické slovo (kromě planet a Instagram/TikTok), přelož ho do češtiny.
3. Vykání → tykání pokud ještě někde zbylo (vás/vám/vaše → tě/ti/tvé)
4. Genderová neutralita — DVA TYPY:
   a) 2. osoba (divák): minulá příčestí jako "vykročil/vykročila" → přítomný čas ("vykračuješ"); "být pravdivý/á" → "být bez masky"; "byl jsi/byla jsi" → "jsi". NIKDY lomené tvary.
   b) 3. osoba (lidé ve scéně): "němu/jí/ho/ji" → "té osobě" nebo přeformuluj scénu bez osobního zájmena. "Sedíš naproti němu" → "Sedíš naproti té osobě" nebo "Otevřeš konverzaci." "Usmívá se na tebe" → "Vidíš ten úsměv." NIKDY předpokládat pohlaví partnera/šéfa/kamaráda.
5. AI-blob symetrické vzorce — přeformuluj: "Nejde o X. Jde o Y." → "X? Y? Ne. [přerámování]." nebo slouč do jedné věty; "Není to X. Je to Y." → stejně přeformuluj. Nikdy nesmí zůstat struktura "[Negace]. [Pozitivní přerámování]." ve dvou větách za sebou.
6. <break> tagy a [emotion] tagy — NIKDY neměň, nemaž, nepřesouvej. Zachovej přesně jak jsou.
7. Jinak TEXT NEMĚŇ — zachovej přesné znění, styl, délku

Script:
{script}"""

    print("[*] Proofreading...")
    return claude_call(system, user, max_tokens=800)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Voiceover generator pro Mystickou Hvězdu")
    parser.add_argument("--date", default=None, help="Datum videa (YYYY-MM-DD), default: zitra")
    parser.add_argument("--signs", nargs=1, metavar="SIGN",
                        help="1 konkretni znameni (default: nahodny vyber)")
    args = parser.parse_args()

    target_date = args.date or str(date.today())
    print(f"\n=== Voiceover Generator | datum: {target_date} ===\n")

    # 1. Prefetch — zajisti že všech 12 znamení je v cache
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

    # 2. Vyber znamení
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
    print(f"[*] Vybrane znameni: {', '.join(chosen)}")
    print(f"[*] Tento den celkem pouzito: {len(used_today)}/12 znameni")

    # 3. Sestav horoskopy pro vybraná znamení (vše je už v cached_all)
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
    description = build_tiktok_description(chosen, script, target_date)
    fb_description = build_facebook_description(chosen, script, target_date)
    suno = build_suno_prompt(chosen, script, target_date)

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
    print(sep)
    print(f"\n[OK] Hotovo! Datum videa: {target_date}")
    print(f"[OK] Znameni: {', '.join(chosen)}")

    # Uloz do souboru
    out_path = Path(__file__).parent / f"voiceover2_{target_date}.txt"
    output = (
        f"VOICEOVER SCRIPT\n{sep}\n{script}\n\n"
        f"TIKTOK / INSTAGRAM DESCRIPTION\n{sep}\n{description}\n\n"
        f"FACEBOOK REELS DESCRIPTION\n{sep}\n{fb_description}\n\n"
        f"SUNO PROMPT\n{sep}\n{suno}\n"
    )
    out_path.write_text(output, encoding="utf-8")
    print(f"[OK] Ulozeno: {out_path}")



if __name__ == "__main__":
    main()
