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

USED_SIGNS_FILE  = Path(__file__).parent / "used_signs2.json"
USED_SCENES_FILE = Path(__file__).parent / "used_scenes2.json"

def load_used_signs() -> dict:
    if USED_SIGNS_FILE.exists():
        return json.loads(USED_SIGNS_FILE.read_text(encoding="utf-8"))
    return {}

def save_used_signs(data: dict):
    USED_SIGNS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def load_used_scenes() -> list:
    if USED_SCENES_FILE.exists():
        return json.loads(USED_SCENES_FILE.read_text(encoding="utf-8"))
    return []

def save_used_scene(scene: str):
    scenes = load_used_scenes()
    scenes.append(scene)
    USED_SCENES_FILE.write_text(json.dumps(scenes[-14:], ensure_ascii=False, indent=2), encoding="utf-8")

def extract_scene_key(script: str) -> str:
    """Extrahuj první větu slide 2 pro blacklist (první krátká věta bez tagu)."""
    for line in script.splitlines():
        clean = re.sub(r'\[[\w]+\]\s*', '', line).strip()
        clean = re.sub(r'<break[^/]*/>', '', clean).strip()
        if 8 < len(clean) < 70 and not clean.startswith('🗓'):
            return clean[:60]
    return ""

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

    sign_str = signs[0] if signs else ""
    day_seed = int(hashlib.md5((target_date + sign_str).encode()).hexdigest(), 16)

    # Sign-specific instrument overrides — synergické s energií znamení
    SIGN_INSTRUMENT_OVERRIDE = {
        'Beran':    ["driving percussion and bold brass accents", "energetic strings and rhythmic pulse"],
        'Vodnář':   ["electric synth pads and futuristic arpeggio", "ambient synth layers with electric pulse"],
        'Štír':     ["dark cello and deep bass undertones", "brooding strings and distant piano"],
        'Blíženci': ["playful piano and quick silver flute", "bright marimba with dancing strings"],
        'Lev':      ["grand piano and warm brass fanfare", "bold strings and golden orchestral swell"],
        'Střelec':  ["adventurous strings and open horn melody", "expansive orchestral bed with warm brass"],
    }
    sign_instruments = SIGN_INSTRUMENT_OVERRIDE.get(sign_str)
    if sign_instruments:
        instruments = sign_instruments[day_seed % len(sign_instruments)]
    else:
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
- Style: WARM ENERGIZING BACKGROUND — present, uplifting, with gentle momentum. Designed to sit UNDER a voiceover, supporting it with forward energy.
- Think: morning sunrise energy, golden warmth, gentle drive — NOT ambient/sleepy/meditation.
- MUST have a soft rhythmic pulse or gentle beat — the music should MOVE, not float
- Warm major key with melodic phrases that breathe between spoken words
- Use the featured instruments: {instruments} — played with warmth and gentle energy, as supportive texture
- Evoke the visual texture: {texture} — bright and hopeful, like light spreading across the sky
- NO pure ambient/drone textures, NO "sparse notes with silence between them", NO meditation style
- NO strong melody that overshadows voice, NO loud swells, NO heavy percussion
- Balance: present enough to feel energizing, subtle enough not to compete with voiceover
- Feel unique to today while staying in this warm positive style
- End with: "Short instrumental, 60-90 seconds, loop-ready." """

    print("[*] Generuji Suno prompt...")
    return claude_call(system, user, max_tokens=300)


def build_thumbnail_prompt(sign: str, target_date: str, script: str) -> str:
    """Vygeneruje Nano Banana thumbnail prompt přes thumbnail2.build_prompt()."""
    import thumbnail2

    # Generuj scroll text přes Claude — uzavřený standalone výrok
    scroll_system = """Jsi copywriter pro českou mystickou stránku Mystická Hvězda.
Píšeš TEXT NA SVITEK pro thumbnail astrologického videa.
PRAVIDLA:
- Přesně 2 krátké věty — každá MAX 7 slov
- KRITICKÉ: obě věty tvoří JEDNU myšlenku — věta 2 je punchline nebo přímé pokračování věty 1
- Tykáš, přítomný čas, žádné lomené tvary, žádné uvozovky, žádné emoji
- JAZYK: pouze běžná přirozená čeština — jednoduchá slovesa, krátká slova
- ZAKÁZÁNO: složená nebo neobvyklá slovesa ("uvázni se", "zapusť", "zakotvi"), dvě nesouvisející myšlenky
- ZAKÁZÁNO: zájmena v druhé větě odkazující na podstatné jméno z první věty — "ho", "ji", "to", "ní", "něj" — každá věta MUSÍ dávat smysl samostatně bez kontextu té druhé
   ❌ "Plánuješ celý týden dopředu. A pak ho smazat a začít znovu." — "ho" odkazuje na "týden" z věty 1
   ✅ "Plánuješ celý týden dopředu. A pak smažeš vše a začneš znovu." — "vše" je samostatně srozumitelné
- ZAKÁZÁNO: genderová zájmena třetí osoby ("on", "ona", "jeho", "její") — piš bez pohlaví
- ZAKÁZÁNO: "to" jako zájmeno odkazující na předchozí větu ("Ty to víš" je OK jen pokud "to" je obecné, ne odkaz na konkrétní podstatné jméno z věty 1)

GENDEROVÁ NEUTRALITA — ABSOLUTNÍ ZÁKAZ (text čte žena, muž i nebinární osoba):
- ŽÁDNÁ adjektiva v jmenném přísudku končící -á, -ý, -ou, -ého, -ým (jedná se o genderové tvary):
   ❌ "Nejsi nerozhodnutá." ❌ "Nejsi přehnaně kritická." ❌ "Jsi jediná." ❌ "Cítíš se ztracený."
   ❌ "Jsi krásná." ❌ "Jsi silný." ❌ "Nejsi sama." ❌ "Nejsi sám."
- ŽÁDNÁ minulá příčestí činná (-l, -la, -li, -ly): ❌ "Čekala jsi." ❌ "Rozhodl jsi."
- ✅ Řešení: přeformuluj přes podstatné jméno, sloveso v přítomném čase, nebo obecnou formulaci:
   "Nejsi nerozhodnutá" → "Nerozhodnost není slabost" / "Tvé váhání má smysl"
   "Nejsi přehnaně kritická" → "Kritika není chyba" / "Tvůj pohled vidí víc"
   "Jsi jediná, kdo to vidí" → "Vidíš, co ostatní přehlédnou"
   "Cítíš se ztracený" → "Cítíš se mimo" / "Ztrácíš směr"
- TEST PŘED ZÁPISEM: Přečti každou větu a zeptej se: funguje stejně pro muže i ženu? Pokud ne, přeformuluj.
- TEST PŘED ZÁPISEM: přečti druhou větu izolovaně — dává smysl bez první věty? Pokud ne, přeformuluj.

DOBRÉ PŘÍKLADY (přesně tenhle styl):
"Ti uniká něco důležitého. A ty to víš."
"Tvůj instinkt ví víc, než si myslíš. Stačí mu věřit."
"Ostatní to nevidí. Ty to cítíš."
"Váháš. Ale uvnitř už víš."
"Hledáš odpověď v druhých. Je v tobě."
"Kontrola nedá klid. Dá jen iluzi."

Výstup: pouze 2 věty, každá na samostatném řádku, nic jiného."""

    scroll_user = f"""Znamení: {sign}
Voiceover (vyber twist nebo klíčovou myšlenku a zhušť ji do 2 vět):
{script[:400]}

KRITICKÉ: scroll text MUSÍ sémanticky odpovídat voiceoveru — pokud voiceover říká "chrání před spěchem", scroll NESMÍ říkat "chrání před pravdou". Zhušť to, co voiceover říká, ne nový význam.

Napiš 2 věty na thumbnail svitek."""

    print("[*] Generuji thumbnail scroll text...")
    scroll_raw = claude_call(scroll_system, scroll_user, max_tokens=80)
    scroll_lines = [l.strip() for l in scroll_raw.strip().splitlines() if l.strip()]
    scroll_line1 = scroll_lines[0] if len(scroll_lines) > 0 else "Tvůj instinkt ví víc, než si myslíš."
    scroll_line2 = scroll_lines[1] if len(scroll_lines) > 1 else "Stačí mu důvěřovat."

    # Regex safety-net — detekuj feminine adj. v jmenném přísudku (jsi/nejsi X-á)
    scroll_line1 = _strip_gendered_predicate(scroll_line1)
    scroll_line2 = _strip_gendered_predicate(scroll_line2)

    return thumbnail2.build_prompt(target_date, sign, scroll_line1, scroll_line2)


# Seznam sloves typu "být" kde za nimi adjektivum nese rod
_GENDERED_COPULA = r"(?:jsi|nejsi|jsem|nejsem|jsou|nejsou|býváš|bývám|cítíš\s+se|cítím\s+se|připadáš\s+si|připadám\s+si|zůstáváš|zůstaneš)"
# Adjektivum v jmenném přísudku končící genderovou koncovkou
_GENDERED_ADJ_PRED = re.compile(
    rf"\b{_GENDERED_COPULA}\s+(?:[a-záčďéěíňóřšťúůýž]+\s+){{0,3}}([a-záčďéěíňóřšťúůýž]+(?:á|ý|ou|ého|ému|ým|ých|ými)|sám|sama)\b",
    re.IGNORECASE
)
# Participium "byl/byla/rozhodl/rozhodla" v 2. os. — čistě aktivní minulé
_GENDERED_PARTICIPLE = re.compile(
    r"\b(?:jsi\s+|jsem\s+)?\w+(?:l|la|li|ly)\s+jsi\b|\bjsi\s+\w+(?:l|la|li|ly)\b",
    re.IGNORECASE
)


def _strip_gendered_predicate(sentence: str) -> str:
    """Oprav genderové adj. v jmenném přísudku přes Claude. Fallback: vrať originál."""
    if not sentence or not sentence.strip():
        return sentence
    m = _GENDERED_ADJ_PRED.search(sentence)
    if not m:
        return sentence
    # Ignoruj bezpečná slova (přídavná jména neutrální vůči rodu v daném kontextu)
    SAFE = {"tvojí", "tvou", "svou", "celou", "jinou", "jednou", "dlouho"}
    if m.group(1).lower() in SAFE:
        return sentence
    try:
        fixed = claude_call(
            "Jsi editor. Výstup POUZE opravená věta — žádné komentáře, žádné uvozovky.",
            f'Přepiš tuto větu BEZ jakéhokoliv genderového adjektiva v jmenném přísudku (žádné "jsi jediná", "nejsi kritická", "jsi ztracený" apod.). Použij podstatné jméno nebo sloveso v přítomném čase. Zachovej stejnou délku (max 7 slov) a význam.\n\nVěta: "{sentence}"',
            max_tokens=60
        )
        return fixed.strip().strip('"').strip("'")
    except Exception:
        return sentence


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
- KONZISTENCE ASTRO ASPEKTŮ: Pokud zmiňuješ konkrétní astro aspekt (např. "Měsíc v opozici k Chironu"), použij PŘESNĚ STEJNÝ aspekt jako ve voiceover scriptu. Nevymýšlej jiný.
- Za textem PRÁZDNÝ ŘÁDEK a pak hashtags na samostatném řádku
- Hashtags: MAX 6 celkem — #mystickaHvezda + znamení + #horoskop + #fyp
- GENDEROVÁ NEUTRALITA: Žádné genderové tvary ("být pravdivý/á", "byl/byla"). Přítomný čas, 2. os.
- AI-BLOB ZÁKAZ: Žádné symetrické vzorce ("Není to X. Je to Y." / "Ne X. Ale Y.")
- Piš POUZE česky, pouze latinkou, žádné cizí znaky ani kanji
- ČISTÁ ČEŠTINA: NIKDY nepoužívej anglická slova (spreadsheet, feedback, challenge, mindset, vibe, deadline, random...). Vždy česky: feedback → zpětná vazba, challenge → výzva, mindset → nastavení mysli. Výjimky: Instagram/TikTok.
- NÁZVY PLANET ČESKY: Mercury → Merkur, Venus → Venuše, Uranus → Uran, Neptune → Neptun. Nikdy "Mercur", nikdy "Mercury".
- ZAKÁZANÉ HASHTAGS: #znamenízvěrokruhu, #zodiac — nepoužívej je nikdy.
- FOLLOW TRIGGER: Nikdy nepište "Sleduj, až odhalím X" — místo toho "Sleduj profil — příště odhalím X" nebo "Sleduj, ať ti neunikne X".
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


def build_facebook_description(signs: list, script: str, target_date: str, tiktok_description: str = "") -> str:
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
- Video je pro JEDNO konkrétní znamení — nepředstírej, že jich je víc
- Čtvrtá věta = CTA s odkazem: "Celý výklad najdeš na mystickahvezda.cz/horoskopy.html ✨"
- Za textem PRÁZDNÝ ŘÁDEK a pak hashtags na samostatném řádku
- Hashtags: #mystickaHvezda + znamení s velkým počátečním písmenem + fixní FB tagy (bez #fyp)
- Tón: komunitní, trochu osobnější než TikTok — jako by psal přítel, ne algoritmus
- GENDEROVÁ NEUTRALITA: Žádné genderové tvary ("být pravdivý/á", "byl/byla"). Přítomný čas, 2. os.
- AI-BLOB ZÁKAZ: Žádné symetrické vzorce ("Není to X. Je to Y." / "Ne X. Ale Y.") — přeformuluj vždy do jedné věty
- KONZISTENCE ASTRO ASPEKTŮ: Pokud TikTok description (viz níže) zmiňuje konkrétní astro aspekt (planetu, tranzit, dům), použij PŘESNĚ STEJNÝ aspekt — nesměšuj s jiným. FB rozšiřuje stejný astro příběh, nevymýšlí nový.
- Piš POUZE česky, pouze latinkou
- ČISTÁ ČEŠTINA: NIKDY nepoužívej anglická slova (spreadsheet, feedback, challenge, mindset, vibe, deadline, random...). Vždy česky: feedback → zpětná vazba, challenge → výzva, mindset → nastavení mysli. Výjimky: Instagram/TikTok.
- NÁZVY PLANET ČESKY: Mercury → Merkur, Venus → Venuše, Uranus → Uran, Neptune → Neptun. Nikdy "Mercur", nikdy "Mercury".
- TÉMA: FB description MUSÍ rozvíjet PŘESNĚ STEJNÉ téma jako voiceover — nepřidávej nové vlastnosti znamení, nové příběhy ani jiné aspekty. Pokud voiceover mluví o vidění budoucnosti, FB rozšiřuje vidění budoucnosti — ne o archivaci lidí nebo jiné téma.
- Výstup JEN samotný text, žádné komentáře"""

    tiktok_context = f"\nTikTok description (použij stejný astro aspekt, rozviň ho):\n{tiktok_description}\n" if tiktok_description else ""

    user = f"""Datum: {date_cs}
Znamení ve videu: {sign}
Web: https://www.mystickahvezda.cz/horoskopy.html
{tiktok_context}
Voiceover script (HLAVNÍ TÉMA — FB musí rozvíjet přesně toto téma, ne jiné):
{script[:600]}

Napiš Facebook description ve formátu:
[4 věty textu s emoji — řádek 1: kontroverzní statement, řádky 2–3: astro fakt + vzdělávací kontext (STEJNÝ aspekt jako TikTok), řádek 4: CTA s odkazem]

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
- 2. osoba (divák): ABSOLUTNÍ ZÁKAZ minulého příčestí. Toto platí pro JAKÉKOLI sloveso v minulém čase vztahující se k divákovi.
  ❌ "rozhodla", "rozhodl", "ignorovala", "ignoroval", "udělala", "udělal", "byl", "byla" — VŠECHNY tvary jsou zakázané
  ✅ Vždy přeformuluj do přítomného nebo budoucího času: "rozhodla pustit" → "chceš pustit", "ignorovala" → "přeskakuješ", "byl jsi" → "jsi"
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
- NÁZVY PLANET ČESKY: Mercury → Merkur, Venus → Venuše, Uranus → Uran, Neptune → Neptun. Nikdy "Mercur".
- Výjimky: Saturn, Jupiter, Pluto, Mars (stejné česky i anglicky) a slovo "Instagram/TikTok" v CTA.

LOGIKA METAFOR:
- Každá fráze musí dávat smysl doslova. Zkontroluj: dává tato věta smysl, když ji řeknu doslova?
- ❌ "přeskakovat budoucnost" — nedává smysl. ✅ "ignorovat budoucnost" / "zaostávat za budoucností"
- ❌ "Neptun ti šeptá" — zakázáno (viz blacklist). ✅ "Neptun v tvém znamení zesiluje..."
- Metafory musí být konkrétní a vizuální, ne abstraktní.

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

    # Blacklist použitých scén — posledních 14
    used_scenes = load_used_scenes()
    scenes_blacklist = "\n".join(f"- {s}" for s in used_scenes[-7:]) if used_scenes else "žádné"

    # Vyber komentářový trigger podle znamení — pool variant, rotace podle data+znamení
    komentar_trigger_pools = {
        'Beran':    [
            'Berane — napiš, co dnes riskuješ ⬇️',
            'Poznáváš se? Napiš ANO nebo NE.',
            'Označ Berana, co potřebuje tohle slyšet.',
            'Co tě dnes brzdí? Jedno slovo ⬇️',
            'Berane — co by ses rozhodl bez přemýšlení?',
            'Napiš, jestli ti to sedí.',
            'Označ Berana, co tohle právě prožívá.',
            'Čemu se dnes bráníš? ⬇️',
        ],
        'Býk':      [
            'Býku — co dnes odmítáš pustit? ⬇️',
            'Poznáváš se v tom? Napiš jedno slovo.',
            'Označ Býka, co si tohle nese s sebou.',
            'Co bys dnes nejraději ignoroval? ⬇️',
            'Napiš, co ti tohle připomíná.',
            'Býku — jaké jedno slovo tě dnes popisuje?',
            'Sedí ti tohle? Napiš ANO nebo víc ⬇️',
            'Označ Býka, co tohle zná zpaměti.',
        ],
        'Blíženci': [
            'Blíženci — která verze tebe dnes vyhrává? ⬇️',
            'Napiš, co ti dnes hlava říká jako první.',
            'Označ Blížence, co potřebuje tohle slyšet.',
            'Dvě věci najednou — která vyhraje dnes? ⬇️',
            'Blíženci — napiš, co dnes říkáš a co si myslíš.',
            'Sedí to? Jedno slovo do komentáře.',
            'Označ Blížence, co tohle přesně dělá.',
            'Co dnes odkládáš, protože máš jiný nápad? ⬇️',
        ],
        'Rak':      [
            'Raku — napiš jedno slovo, jak se dnes cítíš ⬇️',
            'Označ Raka, co tohle drží v sobě.',
            'Sedí to? Napiš ANO nebo NE do komentáře.',
            'Raku — co dnes chrániš? ⬇️',
            'Koho dnes myslíš jako prvního? ⬇️',
            'Napiš, co by sis dnes potřeboval slyšet.',
            'Označ Raka, co tohle zná moc dobře.',
            'Co dnes navenek neříkáš, ale uvnitř cítíš? ⬇️',
        ],
        'Lev':      [
            'Lve — napiš, co dnes chceš, aby ostatní viděli ⬇️',
            'Poznáváš se? Jedno slovo do komentáře.',
            'Označ Lva, co si tohle zaslouží slyšet.',
            'Co tě dnes nenechává být průměrný? ⬇️',
            'Lve — napiš, co dnes ukazuješ světu.',
            'Sedí to? ANO nebo NE ⬇️',
            'Označ Lva, co tuhle energii přesně zná.',
            'Co dnes potřebuješ uznat sám sobě? ⬇️',
        ],
        'Panna':    [
            'Panno — napiš, jestli to sedí ⬇️',
            'Označ Pannu, co tohle analyzuje každý den.',
            'Co dnes opravuješ znovu? Napiš to ⬇️',
            'Sedí to? ANO nebo NE — Panno, do komentáře.',
            'Co dnes vidíš jako chybu, ale ostatní jako detail? ⬇️',
            'Panno — napiš, co dnes přehlíží ostatní, ale ne ty.',
            'Označ Pannu, co tohle dělá potichu.',
            'Napiš jedno slovo, co dnes řešíš ⬇️',
        ],
        'Váhy':     [
            'Váhy — co dnes nemůžeš rozhodnout? ⬇️',
            'Napiš jedno slovo, co dnes váháš.',
            'Označ Váhu, co tohle přesně zná.',
            'Označ Váhu, co tahle kalkulace vyčerpává.',
            'Co by ses rozhodl, kdyby tě nikdo neviděl? ⬇️',
            'Váhy — napiš, co dnes upřednostňuješ před sebou.',
            'Sedí to? Jedno slovo ⬇️',
            'Označ Váhu, co tohle dělá každý den.',
        ],
        'Štír':     [
            'Štíre — napiš, co dnes nepouštíš ⬇️',
            'Sedí to? Jedno slovo do komentáře.',
            'Označ Štíra, co tohle drží hluboko v sobě.',
            'Označ Štíra, co přesně tohle zná.',
            'Co dnes víš, ale zatím neříkáš? ⬇️',
            'Štíre — napiš, co dnes vidíš u druhých, ale oni to neví.',
            'Napiš ANO, pokud tohle přesně sedí.',
            'Označ Štíra, co si tohle nese každý den. ⬇️',
        ],
        'Střelec':  [
            'Střelci — napiš, kam tě to dnes táhne ⬇️',
            'Označ Střelce, co tohle přesně cítí.',
            'Co dnes chceš opustit? Napiš to ⬇️',
            'Napiš jedno místo, kam bys dnes odešel.',
            'Střelci — co dnes omezuje tvoji svobodu? ⬇️',
            'Označ Střelce, co si tohle říká každé ráno.',
            'Sedí to? Jedno slovo ⬇️',
            'Napiš, co dnes nemůžeš přestat plánovat.',
        ],
        'Kozoroh':  [
            'Kozorohu — napiš, co dnes odkládáš ⬇️',
            'Označ Kozoroha, co tohle nese každý den.',
            'Sedí to? ANO nebo NE do komentáře.',
            'Co dnes děláš, protože musíš, ne protože chceš? ⬇️',
            'Kozorohu — napiš, co by ostatní vzdali, ale ty ne.',
            'Označ Kozoroha, co tohle přesně zná.',
            'Napiš jedno slovo, co tě dnes pohání ⬇️',
            'Co dnes odsouváš na potom, i když víš, že je to teď? ⬇️',
        ],
        'Vodnář':   [
            'Vodnáři — napiš, co dnes vidíš jinak než ostatní ⬇️',
            'Sedí to? Jedno slovo do komentáře.',
            'Označ Vodnáře, co tohle ví.',
            'Co dnes ostatní nepochopí, ale ty ano? ⬇️',
            'Vodnáři — napiš nápad, co tě dnes nepustí.',
            'Označ Vodnáře, co tohle přesně zná.',
            'Napiš, co by ostatní označili za divné, ale ty za správné.',
            'Sedí to? ANO nebo NE ⬇️',
        ],
        'Ryby':     [
            'Ryby — napiš jedno slovo, co teď cítíš ⬇️',
            'Označ Ryby, co tohle nosí v sobě.',
            'Sedí to? ANO nebo NE — Ryby, do komentáře.',
            'Co dnes cítíš, ale neříkáš? Napiš to ⬇️',
            'Ryby — co dnes absorbujete od ostatních? ⬇️',
            'Označ Ryby, co tohle dělá potichu každý den.',
            'Napiš, co by ti dnes pomohlo pustit.',
            'Co vidíš u ostatních, co oni sami nevidí? ⬇️',
        ],
    }
    komentar_pool = komentar_trigger_pools.get(sign, ['Napiš svoje znamení ⬇️'])
    komentar_seed = int(hashlib.md5((target_date + sign + "komentar").encode()).hexdigest(), 16)
    komentar_trigger = komentar_pool[komentar_seed % len(komentar_pool)]

    # Follow trigger — rotace podle dne (různé struktury, ne jen "zítra sleduj")
    follow_triggers = [
        # Série — content tease bez "zítra"
        "Ukládej — budeš se k tomu vracet.",
        "Uložit a poslat někomu, kdo toto potřebuje slyšet.",
        "Uložit. Podívej se na to znovu večer.",
        # Označení
        f"Označ {sign_vocative}, co toto teď potřebuje.",
        f"Pošli to {sign_vocative}, co si tohle ještě neuvědomuje.",
        "Označ kohokoliv, kdo tohle zná zpaměti.",
        # Sleduj profil — obecné, bez slibu konkrétního znamení
        "Sleduj profil — každý den jiné znamení.",
        "Sleduj, ať ti neunikne tvůj den.",
        "Profil pro ty, co berou astro vážně.",
        "Na profilu najdeš výklad pro všechna ostatní znamení.",
        # Obecné teasery na další díl — bez vazby na konkrétní znamení
        "Příště: které znamení tohle nezvládá vůbec.",
        "Příště: temná strana vztahů — co si znamení neřeknou.",
        "Příští díl: jak planety ovlivňují tvé peníze.",
        "Příště: proč se bojíme přesně toho, po čem toužíme.",
        "Příští díl bude ještě přímější.",
        "Příště odhalím, co hvězdy říkají o tvých vztazích.",
        "Příště: znamení, která tvé tajemství neudrží.",
        "Příště: jedna věta, která popíše celou tvou karmu.",
    ]
    follow_seed = int(hashlib.md5((target_date + sign).encode()).hexdigest(), 16)
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
- DATUM: NEzačínej hook datem. Datum "{date_cs}" vlož nejdříve do slide 2, nebo ho vůbec nevkládej do hooku — hook musí začít silnou větou o osobě, ne o kalendáři.
- Každá věta má svůj ElevenLabs tag: "[tag] věta."
- Za každou větou přidej pauzu: <break time="0.5s" /> po první větě, <break time="1.0s" /> po druhé větě (přechod na slide 2).
- BLACKLIST — NIKDY: "Hvězdy mluví/říkají/šeptají", "Stačí poslouchat", poetické popisy bez osoby, věta delší než 7 slov jako první věta.

=== SLIDE 2 — JÁDRO + TWIST (6–8 sekund, 18–25 slov) ===
Toto je nejdůležitější část. MUSÍ obsahovat:

A) MIKROPŘÍBĚH — konkrétní vizuální scéna ze života persony:
   - Přítomný čas, 2. osoba, max 8 slov na větu
   - Scéna musí být ORIGINÁLNÍ a SPECIFICKÁ pro toto znamení ({sign}) a jeho energii — ne generická
   - ❌ ZAKÁZÁNO: "tvá energie dostává zelenou", "Neptun ti šeptá", "cítíš to tlačení" (vnitřní pocit, ne vizuální)
   - ❌ ZAKÁZANÉ SCÉNY (použité naposledy — NIKDY nepoužij žádnou z nich):
{scenes_blacklist}
   - ✅ SPRÁVNÝ STYL scény: přítomný čas, 2. osoba, viditelná akce (díváš se, otevřeš, zamkneš, stojíš, scrolluješ), NE vnitřní monolog (cítíš, přemýšlíš, víš). Scéna musí být JINÁ každý den — vymysli novou situaci vycházející z energie {sign}.
   - Mezi větami uvnitř slidu: <break time="0.3s" />
   - GENDER NEUTRALITA 3. OSOBY — KRITICKÉ: Nikdy nepoužívej "němu/jí/ho/ji/on/ona" pro osoby ve scéně.
     ✅ Nejlepší: vybuduj scénu bez třetí osoby — objekt je věc, ne člověk: "Díváš se na tu zprávu.", "Otevřeš profil.", "Zamkneš telefon."

B) TWIST — povinný moment překvapení nebo přerámování:
   - Přijde po mikropříběhu jako "aha moment" — nečekaný úhel pohledu, který změní výklad celé scény
   - ❌ ZAKÁZANÉ VZORCE — VŠECHNY varianty symetrie jsou zakázány:
     "Nejde o X. Jde o Y." / "Není to X. Je to Y." / "Ne X. Ale Y."
     "Ne proto, že X. Ale proto, že Y." / "Ne kvůli X. Ale kvůli Y."
     "To není X. To je Y." / "Tohle není X — je to Y."
     → Jakákoli věta tvaru [negace A] + [potvrzení B] je AI-blob. NIKDY.
   - ✅ SPRÁVNÉ TWISTY — překvapení přichází nečekaně, ne jako oprava:
     "Rozchod? Hádka? Ne. Přestáváš hrát roli, co ti někdo přidělil."
     "Jo, ničíš to. Ale ne proto, že jsi zlá." ← (tohle je OK, negace je uvnitř, ne vzorec)
     "Čekáš na souhlas. Od sebe."
     "Trpělivost tě nechrání před zklamáním. Chrání tě před spěchem, který by tě zničil dřív."
     "Pomalost není slabost. Je to tvůj způsob, jak přežít to, co ostatní vzdali."
   - SELF-CHECK před zapsáním twistové věty: "Překvapilo by tuto větu samotného diváka? Řekl by 'wow, to jsem nevěděl'?" — pokud ne, přepiš.
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
    # Po (0): přímé oslovení — musí obsahovat znamení nebo vokativ
    # Út (1): kontroverze — nesmí obsahovat "?"
    # St (2): zrcadlo bolesti — nesmí být kratší než 5 slov
    # Čt (3): relationship hook — musí obsahovat slovo vztah/miluj/partner/love nebo "?"
    # Pá (4): přesný popis situace — nesmí obsahovat "?"
    # So (5): kontroverze — nesmí obsahovat "?"
    # Ne (6): zrcadlo bolesti — nesmí obsahovat "většina"
    def hook_word_count(text: str) -> int:
        """Spočítá slova v hooku (slide 1) — odstraní tagy a break značky."""
        lines = text.strip().split("\n")
        hook_lines = []
        for line in lines:
            if not line.strip():
                break
            hook_lines.append(line)
        hook_text = " ".join(hook_lines)
        hook_clean = re.sub(r'\[[\w]+\]', '', hook_text)
        hook_clean = re.sub(r'<break[^/]*/>', '', hook_clean)
        hook_clean = re.sub(r'[^\w\s]', ' ', hook_clean)
        return len(hook_clean.split())

    hook_line = raw.strip().split("\n")[0]
    weekday = date_obj.weekday()
    needs_retry = False
    retry_reason = ""

    if weekday == 0:  # Po = přímé oslovení — musí obsahovat vokativ nebo jméno znamení
        if sign not in hook_line and sign_vocative not in hook_line:
            needs_retry = True
            retry_reason = "Hook nema osloveni znameni pro Pondeli"
    elif weekday in (1, 4, 5):  # Út/Pá/So = kontroverze/provokace — bez otázky
        if "?" in hook_line:
            needs_retry = True
            retry_reason = "Hook ma otazku misto provokace"
    elif weekday == 3:  # Čt = relationship hook — musí mít vztahové slovo nebo otázku
        vztah_slova = ['vztah', 'miluj', 'partner', 'lásk', 'cit', 'blízk', '?']
        if not any(s in hook_line.lower() for s in vztah_slova):
            needs_retry = True
            retry_reason = "Hook nema vztahovy kontext pro Ctvrtek"
    elif weekday == 6:  # Ne = zrcadlo bolesti — bez "většina"
        if "většina" in hook_line.lower():
            needs_retry = True
            retry_reason = "Hook obsahuje 'vetsina' misto zrcadla bolesti"

    # Délka hooku — vždy kontroluj bez ohledu na den
    wc = hook_word_count(raw)
    if wc > 12:
        needs_retry = True
        retry_reason = (retry_reason + " | " if retry_reason else "") + f"Hook prilis dlouhy ({wc} slov, max 12)"

    if needs_retry:
        print(f"  [!] {retry_reason} — regeneruji...")
        raw = claude_call(system, user, max_tokens=800)

    return raw

def proofread_script(script: str) -> str:
    """Trojitý proofread voiceover scriptu — 3 sekvenční pasy, každý zaměřený jinak."""

    # ── PAS 1: Gramatika, jazyk, struktura ───────────────────────────────────────
    system1 = """Jsi senior jazykový korektor češtiny specializovaný na astrologické texty.
Dostaneš voiceover script s hranatými závorkami [tag] a <break> tagy — ty NIKDY neměň ani neodstraňuj.
Výstup JEN opravený text — žádné komentáře, žádné vysvětlování, žádné uvozovky."""

    user1 = f"""PAS 1 — GRAMATIKA, JAZYK, STRUKTURA. Oprav každý bod:

1. GRAMATIKA — interpunkce, shoda, pádové koncovky, háčky/čárky. "Dneš" → "Dnes".

2. PLANETY ČESKY — Venus → Venuše, Mercury/Mercur → Merkur, Neptune → Neptun, Uranus → Uran.
   ANGLICKÁ SLOVA → ČESKY (kromě Instagram/TikTok):
   spreadsheet→tabulka, feedback→zpětná vazba, challenge→výzva, mindset→nastavení mysli, vibe→atmosféra, random→náhodný, deadline→termín.

3. VYKÁNÍ → TYKÁNÍ — vás/vám/vaše/váš → tě/ti/tvé/tvůj.

4. SPRÁVNÉ PLURÁLY ZNAMENÍ:
   Beran→Berani | Býk→Býci | Blíženci→Blíženci | Rak→Raci | Lev→Lvi
   Panna→Panny | Váhy→Váhy | Štír→Štíři | Střelec→Střelci
   Kozoroh→Kozorohy | Vodnář→Vodnáři | Ryby→Ryby
   ❌ Kozorohi, Kozorozi, Střelcové, Vodnářové → oprav vždy.

5. [emotion] TAGY — KAŽDÁ věta musí mít tag. Chybí-li, přidej vhodný:
   [mysterious] [intense] [warm] [gentle] [confident] [upbeat] [commanding] [soft] [inviting] [clearly]
   NIKDY neměň ani nemaž existující tagy.

6. <break> TAGY — NIKDY neměň, nemaž, nepřesouvej.

7. HOOK DÉLKA — hook = první odstavec (slide 1). Pokud má celkem > 12 slov (bez tagů a break značek), zkrať 2. větu hooku. Zachovej smysl a tagy.

8. LOGIKA METAFOR — oprav fráze bez doslovného smyslu:
   ❌ "přeskakovat budoucnost" / "vidět projekty dovnitř" / "ukládat lidi do archivů"

9. JINAK TEXT NEMĚŇ.

Script:
{script}"""

    print("[*] Proofreading voiceoveru — pas 1/3 (gramatika, jazyk, struktura)...")
    pass1 = claude_call(system1, user1, max_tokens=900)

    # ── PAS 2: Genderová neutralita ──────────────────────────────────────────────
    system2 = """Jsi expert na genderovou neutralitu v češtině.
Dostaneš voiceover script s hranatými závorkami [tag] a <break> tagy — ty NIKDY neměň ani neodstraňuj.
Výstup JEN opravený text — žádné komentáře, žádné vysvětlování, žádné uvozovky."""

    user2 = f"""PAS 2 — GENDEROVÁ NEUTRALITA. Toto je jediný úkol tohoto pasu. Projdi KAŽDOU větu:

PRAVIDLO: Text čte žena, muž i nebinární osoba. Jakýkoliv tvar vázaný na pohlaví je CHYBA.

A) 2. OSOBA — divák (ty/tě/ti/tvůj):
   ABSOLUTNÍ ZÁKAZ příčestí minulého, adjektiv a split forem vázaných na pohlaví:
   ❌ "rozhodla/rozhodl" → ✅ "rozhodneš / chceš rozhodnout"
   ❌ "udělala/udělal" → ✅ "uděláš / děláš"
   ❌ "byla/byl" → ✅ "jsi"
   ❌ "nerozhodná/nerozhodný" jako přísudek → ✅ "v nerozhodnosti" / "bez rozhodnutí"
   ❌ "přecitlivělá/přecitlivělý" → ✅ "přehnaně citlivý" NENÍ OK — ✅ "tvoje citlivost není slabost"
   ❌ "unavená/unavený" → ✅ přeformuluj celou větu do přítomného času bez adjektiva pohlaví
   ❌ "zvolila/zvolil" → ✅ "zvolíš / vybereš"

   KRITICKÉ — SPLIT FORMY JSOU ZAKÁZÁNY:
   ❌ "přecitlivělá ani přecitlivělý" — split forma adjektiva = CHYBA, i když vypadá inkluzivně
   ❌ "unavená ani unavený", "šťastná ani šťastný" — VŠECHNY tyto formy jsou zakázány
   ✅ Jediné řešení: přeformuluj větu bez jakéhokoliv genderového adjektiva:
      "nejsi přecitlivělá ani přecitlivělý" → "tvoje citlivost není slabost" / "nejsi přehnaně citlivý" NENÍ OK → "cítíš víc než ostatní — to je síla"

   PRAVIDLO KONDICIONÁLU: "bys udělala/udělal" → přeformuluj celou větu: "Co bys udělal" → "Co uděláš bez váhání"

B) 3. OSOBA — lidé ve scéně:
   ❌ "on/ona/jeho/její/jemu/jí/němu/ní/ho/ji" pro osoby → ✅ scéna bez třetí osoby nebo "ta osoba/druhá strana"
   VÝJIMKA: "ho/ji/to" jako zájmeno pro věci (ne lidi) je OK: "smazat ho" (= soubor) ✓

C) ADJEKTIVA POHLAVÍ v přívlastku nebo jmenném přísudku:
   OBECNÉ PRAVIDLO: JAKÉKOLI adjektivum v jmenném přísudku končící -á, -ý, -ou, -ého, -ému, -ým je ZAKÁZÁNO.
   Detekuj vzorce: "jsi X-á/ý", "nejsi X-á/ý", "cítíš se X-á/ý", "připadáš si X-á/ý".
   ❌ "jsi šťastná/šťastný" → ✅ "máš radost" / "cítíš štěstí"
   ❌ "nejsi nerozhodná" → ✅ "nejsi bez rozhodnutí" / "tvoje váhání není slabost"
   ❌ "jsi jediná/jediný, kdo vidí" → ✅ "vidíš, co ostatní přehlédnou"
   ❌ "nejsi sama/sám" → ✅ "nejsi bez opory" / "máš průvodce vedle sebe"
   ❌ "cítíš se ztracený/ztracená" → ✅ "cítíš se mimo" / "ztrácíš směr"
   ❌ "jsi silná/silný" → ✅ "máš sílu" / "neseš to"
   ❌ "nejsi přehnaně kritická/kritický" → ✅ "tvoje ostrost není chyba" / "tvůj pohled vidí víc"
   TEST: u každé věty se zeptej — funguje stejně pro muže i ženu? Pokud ne, přeformuluj.

D) [emotion] TAGY a <break> TAGY — NIKDY neměň.

Script:
{pass1}"""

    print("[*] Proofreading voiceoveru — pas 2/3 (genderová neutralita)...")
    pass2 = claude_call(system2, user2, max_tokens=900)

    # ── PAS 3: AI-blob, brand voice, finální čistota ─────────────────────────────
    system3 = """Jsi brand voice korektor pro českou mystickou stránku Mystická Hvězda.
Dostaneš voiceover script s hranatými závorkami [tag] a <break> tagy — ty NIKDY neměň ani neodstraňuj.
Výstup JEN opravený text — žádné komentáře, žádné vysvětlování, žádné uvozovky."""

    user3 = f"""PAS 3 — BRAND VOICE, AI-BLOB, FINÁLNÍ ČISTOTA.

1. AI-BLOB VZORCE — přeformuluj VŠECHNY symetrické struktury (i uvnitř jedné věty):
   ❌ DVĚ VĚTY: "Nejde o X. Jde o Y." / "Není to X. Je to Y." / "Ne X. Ale Y." / "Ne proto, že X. Ale proto, že Y."
   ❌ JEDNA VĚTA: "nečekáš na X, ale na Y" / "není to X — je to Y" / "ne X, ale Y" jako hlavní kostra věty
   ✅ Slouč nebo přeformuluj — twist musí přijít nečekaně, ne jako oprava předchozího:
      místo "nečekáš na povolení od reality, ale na souhlas od sebe"
      → "povolení od reality nikdy nepřijde — souhlas musí přijít od tebe"

2. ZAKÁZANÉ FRÁZE — odstraň nebo přepiš:
   ❌ "Hvězdy mluví/říkají/šeptají" / "ze hvězd" / "portál" / "brána"
   ❌ "tvá přirozená X dostává zelenou" / "energie kolem tebe pulzuje"
   ❌ "Neptun ti šeptá" / jakákoli planeta "ti šeptá/říká/posílá"

3. KONZISTENCE — zkontroluj, že astro aspekt zmíněný v textu (planeta, tranzit) je konzistentní v celém textu.

4. [emotion] TAGY a <break> TAGY — NIKDY neměň, nemaž, nepřesouvej.

5. JINAK TEXT NEMĚŇ — zachovej styl, délku, strukturu.

Script:
{pass2}"""

    print("[*] Proofreading voiceoveru — pas 3/3 (brand voice, AI-blob)...")
    pass3 = claude_call(system3, user3, max_tokens=900)

    return pass3


def proofread_caption(text: str, platform: str) -> str:
    """Trojitý proofread caption — 3 sekvenční pasy."""

    hashtag_rules = (
        "Zachovej hashtags přesně jak jsou — oprav pouze zakázané: "
        "#znamenízvěrokruhu nebo #zodiac → ODSTRAŇ. #Mercury/#Venus → #Merkur/#Venuše."
        if platform == "tiktok"
        else "Zachovej hashtags přesně jak jsou."
    )
    system_base = """Jsi senior jazykový korektor češtiny specializovaný na sociální sítě.
Výstup JEN opravený text — žádné komentáře, žádné vysvětlování, žádné uvozovky."""

    # ── PAS 1: Gramatika, jazyk, platforma ───────────────────────────────────────
    user1 = f"""PAS 1 — GRAMATIKA A JAZYK ({platform.upper()}):

1. GRAMATIKA — interpunkce, shoda, pádové koncovky, háčky a čárky.
   SKLOŇOVÁNÍ ZNAMENÍ (zachovej velké písmeno):
   v Beranu | v Býku | v Blížencích | v Raku | ve Lvu | v Panně
   ve Váhách (NE "ve Vahách") | ve Štíru | ve Střelci | v Kozorohu | ve Vodnáři | v Rybách

2. PLANETY ČESKY — Mercury/Mercur→Merkur, Venus→Venuše, Neptune→Neptun, Uranus→Uran.
   ANGLICKÁ SLOVA → ČESKY (kromě Instagram/TikTok).

3. VYKÁNÍ → TYKÁNÍ — vás/vám/vaše/váš → tě/ti/tvé/tvůj.

4. FOLLOW TRIGGER — "Sleduj, až odhalím X" → "Sleduj profil — příště odhalím X".

5. {hashtag_rules}

6. JINAK TEXT NEMĚŇ.

Caption:
{text}"""

    print(f"[*] Proofreading {platform} caption — pas 1/3 (gramatika)...")
    pass1 = claude_call(system_base, user1, max_tokens=600)

    # ── PAS 2: Genderová neutralita ──────────────────────────────────────────────
    user2 = f"""PAS 2 — GENDEROVÁ NEUTRALITA ({platform.upper()}). Jediný úkol tohoto pasu:

ABSOLUTNÍ ZÁKAZ příčestí minulého a gendrových adjektiv pro diváka (2. osoba):
❌ "rozhodla/rozhodl/rozhodlo" → ✅ přeformuluj do přítomného/budoucího času
❌ "udělala/udělal" → ✅ "uděláš"
❌ "toužila/toužil" → ✅ "toužíš"
❌ "nerozhodná/nerozhodný" jako přísudek → ✅ "v nerozhodnosti" / "bez rozhodnutí"
❌ kondicionál s příčestím: "bys zvolila/zvolil" → ✅ "zvolíš" nebo "co by sis vybral" NENÍ OK → "co uděláš bez váhání"

3. osoba ve větě: ❌ "on/ona/jeho/její/jemu/jí" pro lidi → ✅ "ta osoba" nebo scéna bez třetí osoby.
VÝJIMKA: "ho/ji/to" pro věci (ne lidi) je OK.

[emotion] TAGY a hashtags — NIKDY neměň.
JINAK TEXT NEMĚŇ.

Caption:
{pass1}"""

    print(f"[*] Proofreading {platform} caption — pas 2/3 (genderová neutralita)...")
    pass2 = claude_call(system_base, user2, max_tokens=600)

    # ── PAS 3: AI-blob, brand voice, formátování ────────────────────────────────
    user3 = f"""PAS 3 — AI-BLOB, BRAND VOICE, FORMÁTOVÁNÍ ({platform.upper()}):

1. AI-BLOB — přeformuluj VŠECHNY symetrické vzorce. Hledej tyto PŘESNÉ vzory:

   A) DVĚ VĚTY vedle sebe:
      ❌ "Není to X. Je to Y." / "Nejde o X. Jde o Y." / "Ne X. Ale Y."
      ❌ "Ne proto, že X. Ale proto, že Y." / "Ne kvůli X. Ale kvůli Y."

   B) UVNITŘ JEDNÉ VĚTY (čárkou, pomlčkou, středníkem):
      ❌ "X není slabost, je to Y" / "X není chaos, je to navigace"
      ❌ "nečekáš na X, ale na Y" / "není X — je Y"
      ❌ "X se dnes mění v Y" pokud X je negativní a Y pozitivní symetricky
      ✅ Přeformuluj: slouč do jednoduché věty BEZ symetrické opravy.
         Např. "tvoje trpělivost není slabost, je to taktika" → "tvoje trpělivost se dnes mění v taktiku"
         Nebo lépe: "dnes trpělivost pracuje jako taktika" (jedna myšlenka, ne oprava)

   C) TEST: Pokud z věty odstraníš první polovinu a zbyde "je to Y" / "ale Y" / "je Y", je to AI-blob.

2. MARKDOWN — ODSTRAŇ jakékoli formátovací značky:
   ❌ **bold**, *italic*, __underline__, ~~strike~~ — sociální sítě je nerendí
   ✅ Nech čistý text bez jakéhokoli markdown formátování.

3. ZAKÁZANÉ FRÁZE:
   ❌ "ze hvězd" / "hvězdy ti posílají" / "portál" / "brána"
   ❌ jakákoli planeta "ti šeptá/říká"

4. LOGIKA — oprav fráze bez doslovného smyslu.

5. Hashtags a emoji — NIKDY neměň.
6. JINAK TEXT NEMĚŇ — zachovej styl, délku.

Caption:
{pass2}"""

    print(f"[*] Proofreading {platform} caption — pas 3/3 (AI-blob, brand voice)...")
    pass3 = claude_call(system_base, user3, max_tokens=600)

    # ── Post-proofread Python sanitizace ─────────────────────────────────────────

    # 1) Odstraň markdown — deterministicky
    pass3 = re.sub(r'\*\*(.+?)\*\*', r'\1', pass3)
    pass3 = re.sub(r'\*(.+?)\*',     r'\1', pass3)
    pass3 = re.sub(r'__(.+?)__',     r'\1', pass3)
    pass3 = re.sub(r'~~(.+?)~~',     r'\1', pass3)

    # 2) AI-blob detekce — Python regex najde větu, LLM přepíše JEN tu větu
    # Vzory: "ne X, ale Y" / "není X, je to Y" / "není X — je Y"
    aiblob_patterns = [
        re.compile(r'[^.!?\n]{5,}\bne\s+\w[^,!?\n]{3,40},\s*ale\s+\w[^.!?\n]{3,}', re.IGNORECASE),
        re.compile(r'[^.!?\n]{5,}\bnení\s+\w[^,!?\n]{3,40},\s*je\s+to\s+\w[^.!?\n]{2,}', re.IGNORECASE),
        re.compile(r'[^.!?\n]{5,}\bnení\s+\w[^—\n]{3,40}—\s*je\s+to\s+\w[^.!?\n]{2,}', re.IGNORECASE),
    ]
    for aiblob_re in aiblob_patterns:
        m = aiblob_re.search(pass3)
        if m:
            bad = m.group(0).strip()
            print(f"  [!] AI-blob v caption: '{bad[:70]}' — opravuji...")
            fixed = claude_call(
                "Jsi editor. Výstup POUZE přepsaná věta — žádné komentáře, žádné uvozovky.",
                f'Přepiš tuto větu. Odstraň vzorec "ne X, ale Y" nebo "není X, je to Y" — výsledek musí být jedna plynulá myšlenka bez symetrie. Max stejná délka.\n\nVěta: "{bad}"',
                max_tokens=120
            )
            pass3 = pass3.replace(bad, fixed.strip(), 1)
            break  # jeden průchod stačí, spustí se znovu při dalším volání

    return pass3


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

    # ── Python sanitizace voiceoveru ──────────────────────────────────────────────

    def _sent_words(sentence: str) -> int:
        """Počet slov ve větě — bez tagů, bez break značek, bez interpunkce."""
        s = re.sub(r'\[[\w]+\]', '', sentence)
        s = re.sub(r'<break[^/]*/>', '', s)
        s = re.sub(r'[^\w\s]', ' ', s)
        return len(s.split())

    def _extract_hook_sentences(text: str) -> list[str]:
        """Vrátí seznam vět z prvního odstavce (hook)."""
        paragraphs = text.strip().split("\n\n")
        hook_para = paragraphs[0] if paragraphs else ""
        # Rozděl po <break> — každá věta končí break značkou
        parts = re.split(r'(<break[^/]*/>)', hook_para)
        sentences = []
        current = ""
        for part in parts:
            if re.match(r'<break', part):
                current += part
                sentences.append(current.strip())
                current = ""
            else:
                current += part
        if current.strip():
            sentences.append(current.strip())
        return [s for s in sentences if s]

    def _fix_hook_sentence(sentence: str, max_words: int) -> str:
        """Přepíše jednu větu hooku na max_words slov. Zachová tag a break."""
        tag_match = re.match(r'(\[[\w]+\])\s*', sentence)
        break_match = re.search(r'(<break[^/]*/>)', sentence)
        tag = tag_match.group(1) if tag_match else ""
        brk = break_match.group(1) if break_match else ""
        clean = re.sub(r'\[[\w]+\]', '', sentence)
        clean = re.sub(r'<break[^/]*/>', '', clean).strip()
        result = claude_call(
            "Jsi editor. Výstup POUZE přepsaná věta — žádné komentáře, žádné uvozovky, žádné vysvětlení.",
            f'Přepiš tuto větu tak, aby měla PŘESNĚ {max_words} slov nebo méně. Zachovej smysl. Žádné lomené tvary (šel/šla). Žádné split adjektiva (přecitlivělá ani přecitlivělý).\n\nVěta: "{clean}"',
            max_tokens=60
        )
        return f"{tag} {result.strip()} {brk}".strip()

    # 1) HOOK DÉLKA — Python počítá přesně, LLM jen přepíše konkrétní větu
    hook_sentences = _extract_hook_sentences(script)
    if len(hook_sentences) >= 2:
        total_wc = sum(_sent_words(s) for s in hook_sentences)
        if total_wc > 12:
            print(f"  [!] Hook {total_wc} slov (limit 12) — zkracuji 2. větu...")
            s1_wc = _sent_words(hook_sentences[0])
            max_s2 = max(3, 12 - s1_wc)
            fixed_s2 = _fix_hook_sentence(hook_sentences[1], max_s2)
            # Nahraď 2. větu v scriptu
            script = script.replace(hook_sentences[1], fixed_s2, 1)
            new_wc = sum(_sent_words(s) for s in _extract_hook_sentences(script))
            print(f"  [OK] Hook po zkrácení: {new_wc} slov")

    # 2) SPLIT ADJEKTIVA — Python regex, chirurgická oprava konkrétní věty
    split_adj_pattern = re.compile(r'[^\n]*\b\w+[aá]\s+(ani|nebo)\s+\w+[ýí]\b[^\n]*', re.IGNORECASE)
    split_match = split_adj_pattern.search(script.split("\n\n")[0] if "\n\n" in script else script[:300])
    if split_match:
        bad_sentence = split_match.group(0).strip()
        print(f"  [!] Split adjektivum: '{bad_sentence[:60]}...' — opravuji...")
        tag_m = re.match(r'(\[[\w]+\])\s*', bad_sentence)
        brk_m = re.search(r'(<break[^/]*/>)', bad_sentence)
        tag = tag_m.group(1) if tag_m else ""
        brk = brk_m.group(1) if brk_m else ""
        clean_sent = re.sub(r'\[[\w]+\]', '', bad_sentence)
        clean_sent = re.sub(r'<break[^/]*/>', '', clean_sent).strip()
        fixed = claude_call(
            "Jsi editor. Výstup POUZE opravená věta — žádné komentáře.",
            f'Přepiš tuto větu BEZ genderového adjektiva (žádné "přecitlivělá ani přecitlivělý", "unavená ani unavený" apod.). Použij podstatné jméno nebo přítomný čas. Max stejná délka.\n\nVěta: "{clean_sent}"',
            max_tokens=80
        )
        fixed_full = f"{tag} {fixed.strip()} {brk}".strip()
        script = script.replace(bad_sentence, fixed_full, 1)

    # 3) GENDER ADJ. V JMENNÉM PŘÍSUDKU — "jsi jediná", "nejsi nerozhodnutá", "cítíš se ztracený"
    #    Regex safety-net pro případy, kdy LLM proofread přehlédne.
    SAFE_WORDS = {"tvojí", "tvou", "svou", "celou", "jinou", "jednou", "dlouho",
                  "samou", "sebou", "dnou", "hlavou", "stranou", "cestou"}
    seen_sentences = set()
    for gender_match in list(_GENDERED_ADJ_PRED.finditer(script)):
        adj = gender_match.group(1).lower()
        if adj in SAFE_WORDS:
            continue
        # Najdi celou větu kolem nálezu
        start = gender_match.start()
        end = gender_match.end()
        # Rozšiř na hranice věty (., !, ?, \n\n, <break>)
        sent_start = max(script.rfind(". ", 0, start), script.rfind("\n", 0, start),
                         script.rfind("/>", 0, start), 0)
        sent_start = sent_start + 2 if sent_start > 0 else 0
        next_dot = script.find(".", end)
        next_break = script.find("<break", end)
        candidates = [c for c in (next_dot, next_break) if c > 0]
        sent_end = min(candidates) + 1 if candidates else len(script)
        bad_sentence = script[sent_start:sent_end].strip()
        if not bad_sentence or bad_sentence in seen_sentences:
            continue
        seen_sentences.add(bad_sentence)
        print(f"  [!] Genderové adjektivum: '{bad_sentence[:60]}...' — opravuji...")
        tag_m = re.match(r'(\[[\w]+\])\s*', bad_sentence)
        tag = tag_m.group(1) if tag_m else ""
        clean_sent = re.sub(r'\[[\w]+\]', '', bad_sentence)
        clean_sent = re.sub(r'<break[^/]*/>', '', clean_sent).strip()
        try:
            fixed = claude_call(
                "Jsi editor. Výstup POUZE opravená věta — žádné komentáře, žádné uvozovky.",
                f'Přepiš tuto větu BEZ jakéhokoliv genderového adjektiva v jmenném přísudku (žádné "jsi jediná", "nejsi kritická", "cítíš se ztracený"). Použij podstatné jméno nebo přítomný čas. Zachovej stejnou délku a význam.\n\nVěta: "{clean_sent}"',
                max_tokens=80
            )
            fixed_full = f"{tag} {fixed.strip()}".strip()
            script = script.replace(bad_sentence, fixed_full, 1)
        except Exception as e:
            print(f"  [!] Oprava selhala: {e}")

    # Ulož scénu slide 2 do blacklistu
    scene_key = extract_scene_key(script)
    if scene_key:
        save_used_scene(scene_key)
    # Přidej datum na začátek voiceover scriptu
    d = date.fromisoformat(target_date)
    date_header = f"🗓️ {d.day}. {MONTHS_CS[d.month - 1]} {d.year}\n\n"
    script = date_header + script
    description = build_tiktok_description(chosen, script, target_date)
    description = proofread_caption(description, "tiktok")
    fb_description = build_facebook_description(chosen, script, target_date, tiktok_description=description)
    fb_description = proofread_caption(fb_description, "facebook")

    # Garantuj správný hashtag znamení s diakritikou — AI ho občas ztratí
    sign = chosen[0]
    for text_var in ['description', 'fb_description']:
        val = locals()[text_var]
        # Oprav hashtag bez diakritiky zpět na správný tvar
        sign_slug = normalize_sign(sign)  # bez diakritiky, malá písmena
        import re as _re
        val = _re.sub(rf'#({re.escape(sign_slug)})\b', f'#{sign}', val, flags=re.IGNORECASE)
        if text_var == 'description':
            description = val
        else:
            fb_description = val
    suno = build_suno_prompt(chosen, script, target_date)
    thumbnail = build_thumbnail_prompt(chosen[0], target_date, script)

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
    print(f"\n[OK] Hotovo! Datum videa: {target_date}")
    print(f"[OK] Znameni: {', '.join(chosen)}")

    # Captions příkaz — čistý text bez tagů a break značek
    clean_text = re.sub(r'\[[\w]+\]', '', script)          # odstraň [tag]
    clean_text = re.sub(r'<break[^/]*/>', '', clean_text)   # odstraň <break ... />
    clean_text = re.sub(r'🗓️.*?\n', '', clean_text)         # odstraň datum řádek
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()    # normalizuj whitespace
    captions_cmd = (
        f'python "C:/Users/pavel/OneDrive/Desktop/captions-tool/captions.py" '
        f'"VIDEO.mp4" --model small --text "{clean_text}"'
    )
    print(f"\n{sep}\nCAPTIONS PŘÍKAZ (nahraď VIDEO.mp4)\n{sep}")
    print(captions_cmd)
    print(sep)

    # Uloz do souboru
    sign_slug = normalize_sign(chosen[0]) if chosen else "unknown"
    out_path = Path(__file__).parent / f"voiceover2_{target_date}_{sign_slug}.txt"
    output = (
        f"VOICEOVER SCRIPT\n{sep}\n{script}\n\n"
        f"TIKTOK / INSTAGRAM DESCRIPTION\n{sep}\n{description}\n\n"
        f"FACEBOOK REELS DESCRIPTION\n{sep}\n{fb_description}\n\n"
        f"SUNO PROMPT\n{sep}\n{suno}\n\n"
        f"THUMBNAIL PROMPT (Nano Banana)\n{sep}\n{thumbnail}\n\n"
        f"CAPTIONS PŘÍKAZ\n{sep}\n{captions_cmd}\n"
    )
    out_path.write_text(output, encoding="utf-8")
    print(f"[OK] Ulozeno: {out_path}")



if __name__ == "__main__":
    main()
