#!/usr/bin/env python3
"""
Voiceover Generator pro Mystickou Hvězdu
==========================================
1. Načte zítřejší denní horoskopy z Supabase cache
2. Chybějící vygeneruje přes Claude API (stejný prompt jako web)
3. Náhodně vybere 3 znamení
4. Přes Claude API zformátuje do voiceover scriptu s [] stylovými tagy

Usage:
    python voiceover_generator.py
    python voiceover_generator.py --date 2026-04-07   # konkrétní datum
    python voiceover_generator.py --signs Beran Rak Štír Kozoroh  # konkrétní znamení
"""

import sys
import os
import json
import random
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

USED_SIGNS_FILE = Path(__file__).parent / "used_signs.json"

def load_used_signs() -> dict:
    if USED_SIGNS_FILE.exists():
        return json.loads(USED_SIGNS_FILE.read_text(encoding="utf-8"))
    return {}

def save_used_signs(data: dict):
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
    months_cs = ["ledna", "února", "března", "dubna", "května", "června",
                  "července", "srpna", "září", "října", "listopadu", "prosince"]
    d = date.fromisoformat(target_date)
    date_cs = f"{d.day}. {months_cs[d.month - 1]} {d.year}"
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
    months_cs = ["ledna", "února", "března", "dubna", "května", "června",
                  "července", "srpna", "září", "října", "listopadu", "prosince"]
    date_cs = f"{date_obj.day}. {months_cs[date_obj.month - 1]}"

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

    import hashlib as _hs
    day_seed = int(_hs.md5(target_date.encode()).hexdigest(), 16)
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
- Style: positive morning music — relaxing, uplifting, easy listening
- Subtly mystical and cosmic but LIGHT — like a sunrise, not a storm
- NO dark tones, NO tension, NO minor key, NO drama
- Use the featured instruments: {instruments}
- Evoke the visual texture: {texture}
- Feel unique to today while staying in this warm positive style
- End with: "Short instrumental, 60-90 seconds, loop-ready." """

    print("[*] Generuji Suno prompt...")
    return claude_call(system, user, max_tokens=300)


def build_tiktok_description(signs: list, script: str, target_date: str) -> str:
    """Vygeneruje TikTok/Instagram description na základě hotového scriptu."""
    date_obj = date.fromisoformat(target_date)
    months_cs = ["ledna", "února", "března", "dubna", "května", "června",
                  "července", "srpna", "září", "října", "listopadu", "prosince"]
    date_cs = f"{date_obj.day}. {months_cs[date_obj.month - 1]}"

    signs_lower = [s.lower() for s in signs]
    hashtag_signs = " ".join(f"#{s}" for s in signs_lower)

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
- Na TikToku NESMÍ být žádný odkaz ani URL — pouze text a hashtags
- Za textem PRÁZDNÝ ŘÁDEK a pak hashtags na samostatném řádku
- Hashtags: MAX 5 celkem — #mystickaHvezda + 1–2 ze znamení (ne nutně všechna, s velkým počátečním písmenem) + 1 obecný (#astrologie nebo #horoskop) + 1 trendový (#fyp nebo #spiritualita)
- Piš POUZE česky, pouze latinkou, žádné cizí znaky ani kanji
- Výstup JEN samotný text, žádné komentáře"""

    user = f"""Datum: {date_cs}
Znamení ve videu: {', '.join(signs)} (NEzmiňuj je explicitně v textu)

Voiceover script (pro kontext):
{script[:600]}

Napiš TikTok description ve formátu:
[3 věty textu s emoji]

#mystickaHvezda [1–2 ze znamení] [1 obecný: #astrologie nebo #horoskop] [1 trendový: #fyp nebo #spiritualita]
(Dostupná znamení: {hashtag_signs_pascal} — vyber max 2)"""

    print("[*] Generuji TikTok description...")
    return claude_call(system, user, max_tokens=400)


def build_facebook_description(signs: list, script: str, target_date: str) -> str:
    """Vygeneruje Facebook Reels description — delší, komunitní tón."""
    date_obj = date.fromisoformat(target_date)
    months_cs = ["ledna", "února", "března", "dubna", "května", "června",
                  "července", "srpna", "září", "října", "listopadu", "prosince"]
    date_cs = f"{date_obj.day}. {months_cs[date_obj.month - 1]}"

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
- Tón: komunitní, trochu osobnější než TikTok — jako by psal přítel, ne algoritmus
- Piš POUZE česky, pouze latinkou
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
    months_cs = ["ledna", "února", "března", "dubna", "května", "června",
                  "července", "srpna", "září", "října", "listopadu", "prosince"]
    date_cs = f"{date_obj.day}. {months_cs[date_obj.month - 1]}"

    def normalize_tykani(text: str) -> str:
        """Převede vykání na tykání a odstraní oslovení (milý/milá/milí X)."""
        import re
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
   - Forma C (příslib): "[tag] {{vocative}}, [tag] něco se dnes mění. [tag] Tiše, ale natrvalo."
   Tagy celkově: [mysterious] [intense] [warm] [gentle] [confident] [upbeat] [commanding] [soft]

   Znamení:
{signs_input}

3) OUTRO — 3 věty s tagy, CTA na web + výzva ke sdílení.
   Vzor: "[upbeat] věta o webu. [warm] výzva ke sdílení. [gentle] důvod proč poslat dál."
   NIKDY: "Pošli to někomu komu to sedí" ani "Třeba mu to dnes změní den"

Výstup ve formátu (nic jiného — žádné nadpisy jako HOOK: nebo SEKCE:):
[hook věta 1]. [hook věta 2].

[sekce znamení 1]

[sekce znamení 2]

[sekce znamení 3]

[outro]"""

    print("[*] Generuji voiceover script...")
    return claude_call(system, user, max_tokens=800)

def proofread_script(script: str) -> str:
    """Projde voiceover script, opraví gramatiku a přeloží cizí slova do češtiny."""
    system = """Jsi jazykový korektor češtiny specializovaný na astrologické texty.
Dostaneš voiceover script s hranatými závorkami [tag] pro hlasové styly — ty NIKDY neměň ani neodstraňuj.
Výstup JEN opravený text — žádné komentáře, žádné vysvětlování změn, žádné uvozovky kolem textu."""

    user = f"""Oprav tento voiceover script:

1. Gramatické chyby — oprav interpunkci, shodu, pádové koncovky
2. Cizí slova → česky: Venus → Venuše, Mars → Mars (OK), Mercury → Merkur, Saturn → Saturn (OK), Jupiter → Jupiter (OK), Neptune → Neptun, Pluto → Pluto (OK)
3. Vykání → tykání pokud ještě někde zbylo (vás/vám/vaše → tě/ti/tvé)
4. Genderová neutralita — odstraň rodově specifické tvary: minulá příčestí jako "vykročil/vykročila", "toužila/toužil", "čekala/čekal", "hledal/hledala" → přeformuluj na přítomný/budoucí čas ("vykračuješ", "půjdeš", "toužíš", "čekáš"); "byl jsi/byla jsi" → "jsi"; "ten/ta" jako zájmeno osoby → "někdo", "člověk"; NIKDY lomené tvary. Toto platí OBZVLÁŠTĚ pro hook (první 2 věty scriptu).
5. Jinak TEXT NEMĚŇ — zachovej přesné znění, styl, délku

Script:
{script}"""

    print("[*] Proofreading...")
    return claude_call(system, user, max_tokens=800)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Voiceover generator pro Mystickou Hvězdu")
    parser.add_argument("--date", default=None, help="Datum videa (YYYY-MM-DD), default: zitra")
    parser.add_argument("--signs", nargs=3, metavar="SIGN",
                        help="3 konkretni znameni (default: nahodny vyber)")
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
    print(f"[*] Vybrana znameni: {', '.join(chosen)}")
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
    months_cs = ["ledna", "února", "března", "dubna", "května", "června",
                 "července", "srpna", "září", "října", "listopadu", "prosince"]
    date_header = f"🗓️ {d.day}. {months_cs[d.month - 1]} {d.year}\n\n"
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
    out_path = Path(__file__).parent / f"voiceover_{target_date}.txt"
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
