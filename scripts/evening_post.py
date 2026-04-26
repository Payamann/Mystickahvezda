#!/usr/bin/env python3
"""
Evening Post Generator pro Mystickou Hvězdu
============================================
Generuje večerní příspěvek na Instagram/Facebook/TikTok.
Střídá 6 typů obsahu, pamatuje si témata (neopakuje do 30 dní),
ladí se na základě manuálně zadaných skóre z Meta analytics.

Typy:
  educational      — vzdělávací, jak věc funguje
  engagement       — otázka, A/B volba, komentáře
  myth_bust        — boření mýtů (max 1x za 3 dny)
  lunar            — aktuální lunární fáze (max 1x za 3 dny)
  feature_spotlight — soft-promo funkce webu
  blog_promo       — propagace blogového článku (min 1x za 5 dní)

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
import math
from datetime import date, timedelta
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPT_DIR / "output"

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

# ─── Astronomický kontext (ephem) ─────────────────────────────────────────────

ZODIAC_CS = [
    "Beran", "Býk", "Blíženci", "Rak",
    "Lev", "Panna", "Váhy", "Štír",
    "Střelec", "Kozoroh", "Vodnář", "Ryby",
]

def _ecl_lon_deg(body, dt) -> float:
    """Vrátí ekliptikální délku tělesa ve stupních (0–360)."""
    import ephem
    return math.degrees(float(ephem.Ecliptic(body, epoch=dt).lon)) % 360

def _lon_to_sign(lon_deg: float) -> str:
    return ZODIAC_CS[int(lon_deg / 30) % 12]

def _is_retrograde(planet_cls, dt) -> bool:
    """Vrátí True pokud planeta jde retrográdně (ekliptikální délka klesá)."""
    import ephem
    p1 = planet_cls(); p1.compute(dt)
    p2 = planet_cls(); p2.compute(dt + 1)
    l1 = math.degrees(float(ephem.Ecliptic(p1, epoch=dt).lon)) % 360
    l2 = math.degrees(float(ephem.Ecliptic(p2, epoch=dt + 1).lon)) % 360
    diff = l2 - l1
    if diff > 180:  diff -= 360
    if diff < -180: diff += 360
    return diff < 0

def _moon_phase_name(illuminated: float, waxing: bool) -> str:
    """Přeloží % osvětlení + fázi na český název."""
    if illuminated < 3:
        return "Nový měsíc 🌑"
    elif illuminated < 48:
        return "Dorůstající srpek 🌒" if waxing else "Ubývající srpek 🌘"
    elif illuminated < 52:
        return "První čtvrť 🌓" if waxing else "Poslední čtvrť 🌗"
    elif illuminated < 97:
        return "Dorůstající gibbous 🌔" if waxing else "Ubývající gibbous 🌖"
    else:
        return "Úplněk 🌕"

def _moon_phase_energy(phase_name: str) -> str:
    """Krátký popis energie fáze pro promptování."""
    mapping = {
        "Nový měsíc":           "čas záměrů, nových začátků, ticha a setí semen",
        "Dorůstající srpek":    "čas akce, prvních kroků, odvážného rozjezdu",
        "První čtvrť":          "čas překonání překážek, rozhodnutí a tlaku dopředu",
        "Dorůstající gibbous":  "čas doladění, koncentrace, přípravy na naplnění",
        "Úplněk":               "čas kulminace, emocí, odhalení a naplnění záměrů",
        "Ubývající gibbous":    "čas vděčnosti, sdílení, zpracování sklizně",
        "Poslední čtvrť":       "čas odpuštění, vyhodnocení a uvolnění",
        "Ubývající srpek":      "čas poklidného uzavírání, odpočinku a přípravy na nový cyklus",
    }
    for key, val in mapping.items():
        if key in phase_name:
            return val
    return "čas introspekce a reflexe"

def get_astro_context(target_date: str) -> dict:
    """
    Vrátí skutečný astronomický kontext pro dané datum pomocí ephem.
    Zahrnuje: fázi Měsíce, znamení Měsíce, znamení Slunce,
    retrográdní planety a znamení klíčových planet.
    """
    try:
        import ephem
        d = date.fromisoformat(target_date)
        dt = ephem.Date(f"{d.year}/{d.month}/{d.day} 12:00:00")

        # ── Měsíc ──
        moon = ephem.Moon(); moon.compute(dt)
        moon_lon = _ecl_lon_deg(moon, dt)
        sun = ephem.Sun();   sun.compute(dt)
        sun_lon  = _ecl_lon_deg(sun, dt)
        moon_sun_angle = (moon_lon - sun_lon) % 360
        waxing = moon_sun_angle < 180
        phase_name = _moon_phase_name(moon.phase, waxing)
        moon_sign  = _lon_to_sign(moon_lon)

        # ── Slunce (astrologické znamení) ──
        sun_sign = _lon_to_sign(sun_lon)

        # ── Retrográdní planety ──
        PLANET_CLASSES = {
            "Merkur": ephem.Mercury,
            "Venuše": ephem.Venus,
            "Mars":   ephem.Mars,
            "Jupiter": ephem.Jupiter,
            "Saturn": ephem.Saturn,
            "Uran":   ephem.Uranus,
            "Neptun": ephem.Neptune,
        }
        retrogrades = [name for name, cls in PLANET_CLASSES.items() if _is_retrograde(cls, dt)]

        # ── Znamení klíčových planet ──
        planet_signs = {}
        for name, cls in PLANET_CLASSES.items():
            p = cls(); p.compute(dt)
            planet_signs[name] = _lon_to_sign(_ecl_lon_deg(p, dt))

        # ── Sestavení kontextového shrnutí ──
        retro_str = (", ".join(f"{r} ℞" for r in retrogrades)) if retrogrades else "žádná"
        planet_str = ", ".join(
            f"{n} v {s}{' ℞' if n in retrogrades else ''}"
            for n, s in planet_signs.items()
        )

        summary = (
            f"Astrologický kontext ({target_date}):\n"
            f"• Slunce: {sun_sign}\n"
            f"• Měsíc: {phase_name} v {moon_sign} ({round(moon.phase)}% osvětlení)\n"
            f"• Energie fáze: {_moon_phase_energy(phase_name)}\n"
            f"• Retrográdní planety: {retro_str}\n"
            f"• Planety: {planet_str}"
        )

        return {
            "moon_phase": phase_name,
            "moon_sign": moon_sign,
            "moon_illuminated": round(moon.phase),
            "waxing": waxing,
            "sun_sign": sun_sign,
            "retrogrades": retrogrades,
            "planet_signs": planet_signs,
            "summary": summary,
        }

    except Exception as e:
        # Fallback — alespoň sluneční znamení ze data
        d = date.fromisoformat(target_date)
        sun_sign = _sun_sign_fallback(d)
        return {
            "moon_phase": "neznámá",
            "moon_sign": "neznámé",
            "moon_illuminated": 50,
            "waxing": True,
            "sun_sign": sun_sign,
            "retrogrades": [],
            "planet_signs": {},
            "summary": f"Astrologický kontext: Slunce v {sun_sign} (ephem nedostupný: {e})",
        }

def _sun_sign_fallback(d: date) -> str:
    """Fallback výpočet slunečního znamení z data (bez ephem)."""
    boundaries = [
        (3, 21, "Beran"), (4, 20, "Býk"), (5, 21, "Blíženci"), (6, 21, "Rak"),
        (7, 23, "Lev"), (8, 23, "Panna"), (9, 23, "Váhy"), (10, 23, "Štír"),
        (11, 22, "Střelec"), (12, 22, "Kozoroh"), (1, 20, "Vodnář"), (2, 19, "Ryby"),
    ]
    for month, day, sign in boundaries:
        if d.month == month and d.day >= day:
            return sign
        if d.month == month + 1 and d.day < day:
            return sign
    return "Kozoroh"

# ─── Paměť ────────────────────────────────────────────────────────────────────

MEMORY_FILE = OUTPUT_DIR / "evening_memory.json"

def load_memory() -> dict:
    if MEMORY_FILE.exists():
        return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
    return {"posts": [], "category_scores": {}}

def save_memory(mem: dict):
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
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

# ─── Follow CTA pool ─────────────────────────────────────────────────────────

# Rotující follow CTA — přidává se na konec každého postu
# Nikdy 2x stejný za sebou (tracked v paměti)
FOLLOW_CTAS = [
    "Sleduj, ať ti neunikne zítřejší energie 🔮",
    "Sleduj stránku — každý den nový astrologický pohled 🌙",
    "Chceš vědět co přinese zítra? Sleduj 👆",
    "Přidej se — každý den tu najdeš něco pro svou duši ✨",
    "Sleduj a dostávej denní dávku kosmické energie 🌠",
    "Zítra tu bude další pohled na hvězdy — sleduj, ať ho nezmeškáš 🔮",
    "Každý den nový obsah pro ty, kdo hledají hlubší pohled. Sleduj 🌙",
    "Sleduj a buď první, kdo se dozví co hvězdy chystají ⭐",
]

def pick_follow_cta(mem: dict) -> str:
    """Vybere follow CTA — nikdy stejný jako minule."""
    last = mem.get("last_follow_cta", "")
    available = [c for c in FOLLOW_CTAS if c != last]
    chosen = random.choice(available)
    mem["last_follow_cta"] = chosen
    return chosen

# ─── Blogové články ───────────────────────────────────────────────────────────

BASE_BLOG_URL = "https://www.mystickahvezda.cz/blog/"

BLOG_ARTICLES = [
    # Planety
    {"title": "Průvodce retrográdním Merkurem",                 "slug": "retrogradni-merkur-pruvodce.html",                        "keywords": ["merkur", "retrográdní"],               "category": "planety"},
    {"title": "Merkur v retrográdě — co to znamená pro tvé znamení", "slug": "merkur-v-retrograde-co-to-znamena-pro-vase-znameni.html", "keywords": ["merkur", "retrográdní", "znamení"],    "category": "planety"},
    {"title": "Retrográdní Venuše 2026 — co čekat v lásce",    "slug": "retrograde-venus-2026-co-cekat-v-lasce.html",             "keywords": ["venuše", "retrográdní", "láska"],      "category": "planety"},
    {"title": "Saturnův návrat: co přinese tvůj 29. rok",       "slug": "saturuv-navrat-29-rok-zivota.html",                       "keywords": ["saturn", "návrat", "29"],               "category": "planety"},
    {"title": "Pluto ve Vodnáři 2024–2043",                     "slug": "pluto-ve-vodnari-2024-2043.html",                         "keywords": ["pluto", "vodnář", "transformace"],     "category": "planety"},
    {"title": "Zatmění Slunce a Měsíce 2026",                   "slug": "zatmeni-slunce-a-mesice-2026.html",                       "keywords": ["zatmění", "eclipse", "lunární"],        "category": "lunární"},
    {"title": "Měsíční uzly: uzel osudu a životní směr",        "slug": "uzel-osudu-severni-jizni-uzel.html",                      "keywords": ["měsíční uzly", "karma", "severní uzel"], "category": "planety"},
    {"title": "Lilith v natální kartě",                         "slug": "lilith-v-natalni-karte.html",                             "keywords": ["lilith", "natální karta"],             "category": "planety"},
    {"title": "Chiron — raněný léčitel v natální kartě",        "slug": "chiron-raneny-lecitel-natalni-karta.html",                 "keywords": ["chiron", "léčení"],                    "category": "planety"},
    {"title": "Čínský horoskop 2026 — rok Ohnivého koně",       "slug": "cinsky-horoskop-2026-rok-ohniveho-kone.html",             "keywords": ["čínský horoskop", "2026"],              "category": "znamení"},
    {"title": "Znamení zvěrokruhu a peníze",                    "slug": "znameni-zverokruhu-a-penize.html",                        "keywords": ["znamení", "peníze"],                   "category": "znamení"},
    # Lunární
    {"title": "Rituál novu Měsíce pro začátečníky",             "slug": "novy-mesic-ritual-zacatecnici.html",                      "keywords": ["nov", "nový měsíc", "rituál"],         "category": "lunární"},
    {"title": "Jak se připravit na úplněk",                     "slug": "jak-se-pripravit-na-uplnek.html",                         "keywords": ["úplněk", "příprava"],                  "category": "lunární"},
    {"title": "Úplněk v Kozorohu: rituál a výklad",             "slug": "uplnek-v-kozorohovi-ritual-a-vyznam.html",                "keywords": ["úplněk", "kozoroh"],                   "category": "lunární"},
    {"title": "Úplněk v Panně: rituál pro každé znamení",       "slug": "uplnek-v-panne-ritual-a-vyklad-pro-kazde-znameni.html",   "keywords": ["úplněk", "panna"],                     "category": "lunární"},
    # Natální karta & domy
    {"title": "Jak číst natální kartu — kompletní průvodce",    "slug": "jak-cist-natalni-kartu-pruvodce.html",                    "keywords": ["natální karta", "průvodce"],            "category": "nástroje"},
    {"title": "Měsíční znak v natální kartě",                   "slug": "mesicni-znak-natalni-karta.html",                         "keywords": ["natální karta", "měsíční znak"],        "category": "nástroje"},
    {"title": "Tajemství 12 astrologických domů",               "slug": "tajemstvi-12-astrologickych-domu.html",                   "keywords": ["astrologické domy", "domy"],            "category": "nástroje"},
    {"title": "Jak rozpoznat svou astrologickou signaturu",     "slug": "rozpoznejte-svou-astrologickou-signaturu.html",           "keywords": ["astrologická signatura"],               "category": "nástroje"},
    {"title": "Ascendent vs. sluneční znamení: jaký je rozdíl?","slug": "ascendent-vs-slunecni-znameni-jaky-je-rozdil.html",       "keywords": ["ascendent", "sluneční znamení"],        "category": "znamení"},
    # Tarot
    {"title": "Výklad tarotu pro začátečníky",                  "slug": "vyklad-tarotu-pro-zacatecniky.html",                      "keywords": ["tarot", "výklad"],                     "category": "nástroje"},
    {"title": "Keltský kříž — tarotové rozložení",              "slug": "keltsky-kriz-tarot-rozlozeni.html",                       "keywords": ["tarot", "keltský kříž"],               "category": "nástroje"},
    {"title": "Pohárové karty v tarotu",                        "slug": "co-znamenaji-pohary-v-tarotu.html",                       "keywords": ["tarot", "pohárové karty"],             "category": "nástroje"},
    {"title": "Mečové karty v tarotu",                          "slug": "mecove-karty-tarot-vyznam.html",                          "keywords": ["tarot", "mečové karty"],               "category": "nástroje"},
    {"title": "Jak fungují andělské karty",                     "slug": "jak-funguji-andelske-karty.html",                         "keywords": ["andělské karty"],                      "category": "nástroje"},
    {"title": "Andělská čísla 11:11 — poselství andělů",        "slug": "andelska-cisla-1111.html",                                "keywords": ["andělská čísla", "11:11", "1111"],     "category": "nástroje"},
    {"title": "Andělská čísla 333, 444, 555",                   "slug": "andelska-cisla-333-444-555.html",                         "keywords": ["andělská čísla", "333", "444"],         "category": "nástroje"},
    # Runy & Numerologie
    {"title": "Runový výklad doma — průvodce",                  "slug": "runovy-vyklad-doma-pruvodce.html",                        "keywords": ["runy", "výklad"],                      "category": "nástroje"},
    {"title": "Runy: severská magie v moderním světě",          "slug": "runy-severska-magie-v-modernim-svete.html",               "keywords": ["runy", "severská magie"],              "category": "nástroje"},
    {"title": "Životní číslo — odhalení kódu tvé duše",         "slug": "zivotni-cislo-odhaleni-kodu-vasi-duse.html",              "keywords": ["numerologie", "životní číslo"],        "category": "numerologie"},
    {"title": "Master čísla 11, 22, 33 v numerologii",          "slug": "mistrovska-cisla-numerologie.html",                       "keywords": ["numerologie", "master čísla"],         "category": "numerologie"},
    {"title": "Numerologie jména: křestní jméno a osud",        "slug": "numerologie-jmena-krizni-jmeno.html",                     "keywords": ["numerologie", "jméno"],                "category": "numerologie"},
    {"title": "Osobní rok v numerologii 2026",                  "slug": "osobni-rok-numerologie-2026.html",                        "keywords": ["numerologie", "osobní rok"],           "category": "numerologie"},
    {"title": "Numerologie kompatibilita partnerů",             "slug": "numerologie-kompatibilita-partneru.html",                 "keywords": ["numerologie", "kompatibilita"],        "category": "numerologie"},
    {"title": "Jak zjistit své logo a šestici v numerologii",   "slug": "jak-zjistit-sve-logo-a-sestici-v-numerologii.html",       "keywords": ["numerologie", "logo"],                 "category": "numerologie"},
    # Vztahy & spiritualita
    {"title": "Co je synastrie — partnerská astrologie",        "slug": "co-je-synastrie-jak-funguje-partnerska-astrologie.html",  "keywords": ["synastrie", "partnerská shoda"],       "category": "nástroje"},
    {"title": "Proč ti to v lásce nevychází",                   "slug": "proc-vam-to-v-lasce-nevyhcazi.html",                      "keywords": ["láska", "vztahy"],                     "category": "znamení"},
    {"title": "Iluze spřízněné duše a karmické vztahy",         "slug": "iluze-spriznene-duse-karmicke-vztahy.html",               "keywords": ["spřízněná duše", "karma", "vztahy"],   "category": "znamení"},
    {"title": "5 znaků, že potkáváš svou spřízněnou duši",      "slug": "5-znaku-ze-potkavate-svou-spriznenou-dusi.html",          "keywords": ["spřízněná duše", "znamení"],           "category": "znamení"},
    {"title": "Attachment styly — vzorce ve vztazích",          "slug": "attachment-styly-vzorce-ve-vztazich.html",                "keywords": ["vztahy", "attachment"],                "category": "znamení"},
    # Ostatní
    {"title": "Co je aura a jak ji vidět, číst a čistit",       "slug": "co-je-aura-jak-ji-videt-cist-cistit.html",                "keywords": ["aura", "energie"],                     "category": "nástroje"},
    {"title": "Čakrové léčení — návod pro začátečníky",         "slug": "cakrove-leceni-navod.html",                               "keywords": ["čakry", "léčení"],                     "category": "nástroje"},
    {"title": "Základy 7 čaker — anatomie energetického těla",  "slug": "zaklady-sedmi-caker-anatomie.html",                       "keywords": ["čakry", "energie"],                    "category": "nástroje"},
    {"title": "Zákon přitažlivosti — nejčastější chyby",        "slug": "zakon-pritazlivosti-chyby.html",                          "keywords": ["zákon přitažlivosti", "manifestace"],  "category": "nástroje"},
    {"title": "Křišťálová koule: tajemství scryingu",           "slug": "tajemstvi-kristalove-koule-scrying.html",                 "keywords": ["křišťálová koule"],                    "category": "nástroje"},
    {"title": "Šamanské kolo a totemové zvíře",                 "slug": "shamansko-kolo-totemove-zvire.html",                      "keywords": ["šamanské kolo", "totem"],              "category": "nástroje"},
    {"title": "Biorytmy — proč se ti někdy nedaří",             "slug": "biorytmy-proc-se-vam-nedari.html",                        "keywords": ["biorytmy", "energie", "cykly"],        "category": "nástroje"},
    {"title": "Průvodce energií a ochranou",                    "slug": "pruvodce-energie-ochrana.html",                           "keywords": ["energie", "ochrana"],                  "category": "nástroje"},
    {"title": "Psychologie snů — stromy a stíny",               "slug": "psychologie-snu-stici-stromy.html",                       "keywords": ["sny", "psychologie"],                  "category": "nástroje"},
    {"title": "Létání ve snu — co to znamená",                  "slug": "letani-ve-snu-vyznam.html",                               "keywords": ["sny", "létání"],                       "category": "nástroje"},
    {"title": "Feng shui doma: energie, peníze a láska",        "slug": "feng-shui-doma-energie-penizy-laska.html",                "keywords": ["feng shui", "energie", "doma"],        "category": "nástroje"},
    {"title": "4 živly v astrologii: oheň, země, vzduch, voda", "slug": "ctyri-zivly-astrologie-ohen-zeme-vzduch-voda.html",       "keywords": ["prvky", "živly", "elementy"],          "category": "prvky"},
]

# ─── Typy a kategorie ─────────────────────────────────────────────────────────

POST_TYPES = ["educational", "engagement", "myth_bust", "lunar", "feature_spotlight", "blog_promo"]

TYPE_TO_CATEGORY = {
    "educational":       ["planety", "lunární", "prvky", "znamení", "numerologie"],
    "engagement":        ["planety", "prvky", "znamení", "mýty"],
    "myth_bust":         ["mýty"],
    "lunar":             ["lunární"],
    "feature_spotlight": ["nástroje"],
    "blog_promo":        ["planety", "lunární", "prvky", "nástroje", "znamení", "numerologie"],
}

WEB_LINKS = {
    "nástroje": {
        "Natální karta": "https://www.mystickahvezda.cz/natalni-karta.html",
        "Tarot":         "https://www.mystickahvezda.cz/tarot.html",
        "Runy":          "https://www.mystickahvezda.cz/runy.html",
        "Numerologie":   "https://www.mystickahvezda.cz/numerologie.html",
        "Partnerská shoda": "https://www.mystickahvezda.cz/partnerska-shoda.html",
        "Lunární kalendář": "https://www.mystickahvezda.cz/lunace.html",
        "Andělská čísla":   "https://www.mystickahvezda.cz/andelske-karty.html",
        "Šamanské kolo":    "https://www.mystickahvezda.cz/shamanske-kolo.html",
        "Minulý život":     "https://www.mystickahvezda.cz/minuly-zivot.html",
        "Křišťálová koule": "https://www.mystickahvezda.cz/kristalova-koule.html",
    },
    "lunární": "https://www.mystickahvezda.cz/lunace.html",
    "default": "https://www.mystickahvezda.cz/horoskopy.html",
}

# ─── Výběr tématu a blogového článku ─────────────────────────────────────────

def get_recent_topics(mem: dict, days: int = 30) -> set:
    cutoff = date.today() - timedelta(days=days)
    return {
        p["topic"] for p in mem["posts"]
        if date.fromisoformat(p["date"]) >= cutoff
    }

def get_recent_types(mem: dict, n: int = 7) -> list:
    return [p["type"] for p in mem["posts"][-n:]]

def _astro_topic_boost(topic: str, astro: dict) -> float:
    """
    Vrátí bonus skóre (0.0–3.0) pro téma na základě aktuálního astro kontextu.
    Čím relevantnější téma k dnešní obloze, tím vyšší bonus.
    """
    boost = 0.0
    t_lower = topic.lower()
    retros  = [r.lower() for r in astro.get("retrogrades", [])]
    moon_ph = astro.get("moon_phase", "").lower()
    moon_sg = astro.get("moon_sign", "").lower()
    sun_sg  = astro.get("sun_sign",  "").lower()
    p_signs = {k.lower(): v.lower() for k, v in astro.get("planet_signs", {}).items()}

    # Retrográdní planety → silný boost pro téma o té planetě
    for r in retros:
        if r in t_lower:
            boost += 3.0
            break

    # Aktuální sluneční znamení → boost pro téma o tomto znamení
    if sun_sg and sun_sg in t_lower:
        boost += 2.0

    # Měsíční fáze → boost pro lunární témata
    if "nový měsíc" in moon_ph and any(x in t_lower for x in ["nov ", "nový měsíc", "záměr"]):
        boost += 2.5
    elif "úplněk" in moon_ph and any(x in t_lower for x in ["úplněk", "emoce", "kulminace"]):
        boost += 2.5
    elif "dorůstající" in moon_ph and any(x in t_lower for x in ["dorůstající", "budovat", "akce"]):
        boost += 1.5
    elif "ubývající" in moon_ph and any(x in t_lower for x in ["ubývající", "pustit", "uvolnit"]):
        boost += 1.5

    # Měsíc v daném znamení → boost pro téma o tomto znamení
    if moon_sg and moon_sg in t_lower:
        boost += 1.5

    # Planeta v daném znamení → slabší boost
    for planet, sign in p_signs.items():
        if planet in t_lower and sign in t_lower:
            boost += 1.0
            break

    return boost

def pick_blog_article(mem: dict, recent_topics: set, astro: dict = None) -> dict:
    """Vybere blogový článek, který nebyl nedávno použit.
    Preferuje články relevantní k aktuálnímu astro kontextu."""
    available = [a for a in BLOG_ARTICLES if a["title"] not in recent_topics]
    if not available:
        available = BLOG_ARTICLES[:]

    scores = mem.get("category_scores", {})
    weighted = []
    for a in available:
        base = scores.get(a["category"], {}).get("avg_score", 5.0)
        # Astro boost — přidej boost podle klíčových slov článku
        astro_boost = 0.0
        if astro:
            combined = a["title"] + " " + " ".join(a["keywords"])
            astro_boost = _astro_topic_boost(combined, astro)
        weighted.append((a, base + astro_boost))

    weighted.sort(key=lambda x: -x[1])
    # Náhodný výběr z top 8 (zachováme trochu variabilitu)
    top = [a for a, _ in weighted[:8]]
    return random.choice(top)

def pick_type(mem: dict, force_type: str = None) -> str:
    if force_type:
        return force_type

    recent_posts = mem.get("posts", [])
    recent_7 = get_recent_types(mem, 7)
    recent_3 = get_recent_types(mem, 3)
    last_type = recent_3[-1] if recent_3 else None

    excluded = set()

    # Pravidlo: max 2x stejný typ v řadě
    if len(recent_3) >= 2 and recent_3[-1] == recent_3[-2]:
        excluded.add(recent_3[-1])

    # Pravidlo: max 1x myth_bust za 3 dny
    if "myth_bust" in recent_3:
        excluded.add("myth_bust")

    # Pravidlo: max 1x lunar za 3 dny
    if "lunar" in recent_3:
        excluded.add("lunar")

    candidates = [t for t in POST_TYPES if t not in excluded]
    if not candidates:
        candidates = POST_TYPES[:]

    # Pravidlo: min 1x blog_promo za 5 dní — nudge
    last_5_types = [p["type"] for p in recent_posts[-5:]]
    if "blog_promo" not in last_5_types and "blog_promo" in candidates:
        return "blog_promo"

    # Skóre-váhový výběr
    scores = mem.get("category_scores", {})
    weighted = []
    for t in candidates:
        cats = TYPE_TO_CATEGORY.get(t, [])
        avg = sum(scores.get(c, {}).get("avg_score", 5.0) for c in cats) / max(len(cats), 1)
        weighted.append((t, avg))

    weighted.sort(key=lambda x: -x[1])
    # Top 3 — přidej náhodnost
    top = [t for t, _ in weighted[:3]]
    return random.choice(top)

def pick_topic(mem: dict, post_type: str, force_topic: str = None,
               astro: dict = None) -> tuple:
    """
    Vrátí (topic, category, blog_url_or_None).
    Pro blog_promo: topic = titulek článku, blog_url = URL článku.
    Pro ostatní typy: blog_url = None.
    Astro kontext zvyšuje váhu témat relevantních k aktuální obloze.
    """
    recent = get_recent_topics(mem)

    # Blog promo — vyber z BLOG_ARTICLES
    if post_type == "blog_promo":
        if force_topic:
            matches = [a for a in BLOG_ARTICLES
                       if force_topic.lower() in a["title"].lower()
                       or any(force_topic.lower() in kw.lower() for kw in a["keywords"])]
            article = matches[0] if matches else pick_blog_article(mem, recent, astro)
        else:
            article = pick_blog_article(mem, recent, astro)
        url = BASE_BLOG_URL + article["slug"]
        return article["title"], article["category"], url

    # Ostatní typy
    if force_topic:
        for cat, topics in TOPICS.items():
            for t in topics:
                if force_topic.lower() in t.lower():
                    return t, cat, None
        return force_topic, "planety", None

    cats = TYPE_TO_CATEGORY.get(post_type, ["planety"])
    scores = mem.get("category_scores", {})

    # Sbírej všechna dostupná témata z povolených kategorií s výsledným skóre
    candidates = []
    for cat in cats:
        for t in TOPICS.get(cat, []):
            if t in recent:
                continue
            base  = scores.get(cat, {}).get("avg_score", 5.0)
            boost = _astro_topic_boost(t, astro) if astro else 0.0
            candidates.append((t, cat, base + boost))

    if not candidates:
        # Fallback — reset všech témat
        cat = random.choice(cats)
        t = random.choice(TOPICS.get(cat, ["Astrologie a ty"]))
        return t, cat, None

    candidates.sort(key=lambda x: -x[2])
    # Náhodný výběr z top 5 (variabilita + astro relevance)
    top = candidates[:5]
    chosen = random.choice(top)
    return chosen[0], chosen[1], None

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

def generate_post(post_type: str, topic: str, category: str, target_date: str,
                  blog_url: str = None, astro: dict = None, mem: dict = None) -> dict:
    if mem is None:
        mem = {}
    d = date.fromisoformat(target_date)
    months_cs = ["ledna","února","března","dubna","května","června",
                 "července","srpna","září","října","listopadu","prosince"]
    date_cs = f"{d.day}. {months_cs[d.month-1]} {d.year}"

    # Najdi relevantní web odkaz (pro ne-blog typy)
    web_url = WEB_LINKS.get("default")
    if category == "lunární":
        web_url = WEB_LINKS["lunární"]
    elif category == "nástroje":
        for keyword, url in WEB_LINKS["nástroje"].items():
            if keyword.lower() in topic.lower():
                web_url = url
                break

    # DŮLEŽITÉ: URL nikdy nepíšeme přímo do textu postu —
    # Facebook algoritmus penalizuje posty s externími linky.
    # URL jde do prvního komentáře, post odkazuje textem "Link v komentáři 👇"

    type_instructions = {
        "educational": """Piš vzdělávací post — vysvětli jak věc SKUTEČNĚ funguje (mechanismus, výpočet, logika).
Struktura: hook → vysvětlení → konkrétní příklad → CTA.
Délka: 5–8 vět. Přidej 1 konkrétní příklad nebo analogii.
CTA: "Ulož si ⬇️" nebo "Celý článek v komentáři 👇" — NIKDY nepíš URL přímo do textu.""",

        "engagement": """Piš engagement post — otázka nebo A/B volba, která vyvolá komentáře.
Struktura: provokativní tvrzení nebo otázka → krátký kontext (2–3 věty) → výzva k reakci.
Délka: 3–5 vět. Konec vždy otázkou nebo výběrem.
NIKDY nedávej URL — chceš komentáře, ne kliknutí.""",

        "myth_bust": """Piš myth-bust post — boř mýtus konkrétními fakty.
Struktura: "Říká se, že X. To není pravda." → proč mýtus vznikl → jak to skutečně je → pointa.
Délka: 5–7 vět. Buď odvážný a přímý.
CTA: otázka do komentáře. NIKDY nepíš URL.""",

        "lunar": """Piš post o aktuální lunární fázi a co to znamená pro čtenáře dnes.
Struktura: co fáze přináší → konkrétní rada co dělat/nedělat → CTA na lunární kalendář.
Délka: 4–6 vět. Poetický ale praktický tón.
CTA: "Lunární kalendář najdeš v komentáři 👇" — NIKDY nepíš URL přímo do textu.""",

        "feature_spotlight": """Piš soft-promo post o funkci webu — ale vzdělávací, ne reklamní.
Vysvětli CO funkce dělá a PROČ je to užitečné. Pak přirozeně odkaž.
Délka: 5–7 vět. Nesmí znít jako reklama.
CTA: "Odkaz najdeš v komentáři 👇" — NIKDY nepíš URL přímo do textu.""",

        "blog_promo": f"""Piš teaser post, který přiměje lidi kliknout na blogový článek.
Článek: "{topic}"

Struktura:
1. Hook — překvapivé tvrzení nebo otázka, která cílí na bolest nebo zvědavost
2. Teasující úvod (3–4 věty) — naznač o čem článek je, ALE nevyzraď vše
3. "V článku se dozvíš:" + 3–4 odrážky s konkrétními výstupy
4. Krátký odstavec (1–2 věty) — proč je téma důležité právě teď
5. CTA: "Celý článek v komentáři 👇" — NIKDY nepíš URL přímo do textu

Délka: 6–10 vět celkem (bez odrážek). Nesmí znít jako reklama.""",
    }

    # Astro kontext pro Claude
    astro_block = ""
    if astro and astro.get("summary"):
        astro_block = f"\n\n{astro['summary']}\n\nDůležité: Pokud je to přirozené, zakomponuj tento astrologický kontext do postu (fáze Měsíce, retrográdní planety, sluneční sezóna). Nevnucuj ho násilně — jen když to dává smysl pro téma."

    system = """Jsi copywriter pro českou mystickou stránku Mystická Hvězda.
Píšeš večerní příspěvky na Instagram a Facebook.
Tykáš, 2. os. j.č. — NIKDY žádný lomený tvar (šel/šla).
DŮLEŽITÉ: Piš v rodově neutrálním stylu — vyhýbej se ženským i mužským tvarům minulého času a přídavných jmen.
Místo "naučila ses" → "naučil/a ses" NE — použij "co jsi se naučil" NE — použij přítomný čas nebo infinitiv: "co se učíš", "co poznáváš", "tvá cesta".
Žádné markdown formátování. Výstup JEN samotný text příspěvku a hashtags."""

    user = f"""Datum: {date_cs}
Téma: {topic}
Typ postu: {post_type}{astro_block}

{type_instructions[post_type]}

Napiš příspěvek a pak na novém řádku hashtags (4–6 tagů, první vždy #mystickaHvezda).

Formát výstupu:
[text příspěvku]

[hashtags]"""

    print(f"[*] Generuji {post_type} post: {topic}...")
    caption_raw = claude_call(system, user, max_tokens=900 if post_type == "blog_promo" else 700)

    # Odděl caption od hashtagů
    parts = caption_raw.strip().rsplit("\n\n", 1)
    caption = parts[0].strip() if len(parts) == 2 else caption_raw
    hashtags = parts[1].strip() if len(parts) == 2 else "#mystickaHvezda"

    # Follow CTA — přidej na konec captionu (před hashtagy)
    follow_cta = pick_follow_cta(mem)
    caption = f"{caption}\n\n{follow_cta}"

    # Připravené odpovědi na komentáře
    print("[*] Generuji odpovědi na komentáře...")
    replies_system = """Jsi správce komunity pro českou mystickou stránku Mystická Hvězda.
Píšeš krátké odpovědi na komentáře pod příspěvky.
Tykáš, 2. os. j.č. Tón: vřelý, mystický, autentický.
DŮLEŽITÉ: Piš rodově neutrálně — vyhýbej se "jsem rád/ráda", "ses podělila/podělil". Místo toho: "krásné sdílení", "to rezonuje", "díky za tenhle pohled".
Každá odpověď max 2 věty. Vždy konči otázkou která prodlouží konverzaci."""

    replies_user = f"""Post byl na téma: {topic} (typ: {post_type})

Text postu:
{caption}

Napiš 3 krátké odpovědi na nejpravděpodobnější typy komentářů:
1. Pozitivní reakce / souhlas / "to je přesně já"
2. Otázka nebo zvědavost ohledně tématu
3. Osobní příběh nebo zkušenost čtenáře

Formát — přesně takto, nic navíc:
1. [odpověď]
2. [odpověď]
3. [odpověď]"""

    replies_raw = claude_call(replies_system, replies_user, max_tokens=300)
    comment_replies = replies_raw.strip()

    # První komentář — URL jde sem, ne do postu (FB algoritmus penalizuje externí linky v postu)
    display_url = blog_url if blog_url else web_url
    if post_type == "engagement" or post_type == "myth_bust":
        first_comment = None  # engagement posty nepotřebují link
    else:
        first_comment = display_url

    # ── Vizuální koncepty — pool objektů pro rozmanitost ──────────────────────
    VISUAL_POOLS = {
        "lunar": [
            "moon (exact phase as specified in moon data)",
            "large raw amethyst crystal cluster",
            "selenite wand",
            "single white ritual candle with melted wax drips",
            "labradorite palm stone showing iridescent flash",
            "obsidian mirror disc",
            "large rose quartz sphere",
            "moonstone cabochon gemstone",
        ],
        "planety": [
            "the relevant planet as a photorealistic sphere",
            "golden celestial orrery arm with orbiting rings",
            "astrological compass rose",
            "large raw citrine crystal",
            "copper astronomical telescope",
            "zodiac wheel fragment in gold",
        ],
        "nástroje": [
            "the tool's iconic object (tarot card back, rune stone, etc.)",
            "large amethyst geode split open",
            "antique brass pendulum",
            "labradorite sphere showing iridescent flash",
            "leather-bound grimoire with gold clasps",
            "large rose quartz sphere",
            "moonstone cabochon gemstone",
        ],
        "znamení": [
            "the zodiac symbol as a golden 3D emblem",
            "relevant element crystal (fire opal, aquamarine, obsidian, emerald)",
            "constellation star map fragment",
            "animal totem of the sign as bronze sculpture",
        ],
        "mýty": [
            "cracked stone tablet with astrological glyphs",
            "scales of justice in gold (for myth-busting balance)",
            "magnifying glass lens in crystal",
            "broken old hourglass",
        ],
        "prvky": [
            "elemental crystal matching the element (fire opal, aquamarine, smoky quartz, malachite)",
            "the element's sacred geometry shape in crystal",
            "brazier with colored flame",
        ],
        "numerologie": [
            "golden number sculpture floating in space",
            "sacred geometry dodecahedron in crystal",
            "ancient stone dice with carved numbers",
            "fibonacci spiral in gold",
        ],
    }

    # Náhodně vyber vizuální koncept z poolu pro danou kategorii
    visual_pool = VISUAL_POOLS.get(category, VISUAL_POOLS["nástroje"])
    visual_concept = random.choice(visual_pool)

    # Image prompt
    print(f"[*] Generuji image prompt (vizuál: {visual_concept[:40]}...)...")
    img_system = """You are an expert at writing image generation prompts for mystical/cosmic brand Mystická Hvězda.
Output ONLY the prompt — no comments, no explanations. Plain ASCII Latin characters only."""

    # Přidej přesná měsíční data do image promptu
    moon_data = ""
    if astro:
        moon_data = (
            f"\nACTUAL MOON DATA for {target_date}: "
            f"{astro['moon_phase']} ({astro['moon_illuminated']}% illuminated), "
            f"moon in {astro['moon_sign']}. "
            f"{'Waxing' if astro['waxing'] else 'Waning'} phase. "
            f"If depicting the moon, it must match this exact phase visually — "
            f"{astro['moon_illuminated']}% of the disc is lit."
        )

    img_user = f"""Topic: {topic}
Post type: {post_type}
Date: {date_cs}{moon_data}

CHOSEN VISUAL CONCEPT: {visual_concept}
Use this as the main object. If it says "exact phase" for the moon, follow the moon data above precisely.

Write a Gemini image prompt for a Facebook/Instagram post visual.

STRICT RULES:
- Describe ONE single floating 3D CGI object only — use the CHOSEN VISUAL CONCEPT above
- Object: describe its shape, material, surface texture, and light color only — NO energy effects, NO waves, NO rings, NO trails, NO halos
- Background: very dark navy #050510 (almost black), faint purple nebula, scattered stars
- Style: premium 3D CGI render, icon-art style, photorealistic, octane render
- NO complex scenes, NO actions, NO flowing shapes, NO multiple elements, NO text, NO people, NO frames, NO borders, NO vignette, NO dark edges, NO letterboxing
- Portrait 4:5, object fully visible and centered in frame, background nebula extends to all edges — NO dark strips, NO empty margins anywhere in the image

FORMAT: exactly 4 sentences, structured like this example:
1. "A single [object] floating in center frame, [specific shape/size details and what is lit/shadowed]."
2. "The [object]'s surface is [material], rendered in [colors] with [light details]."
3. "Background is very dark navy #050510 with visible purple and violet nebula clouds softly glowing behind the object, scattered pinpoint stars."
4. "Premium 3D CGI render, icon-art style, octane render, portrait 4:5 ratio, object fully visible and centered, background fills all edges. NO waves, NO rings, NO energy effects, NO borders, NO halos, NO trails, NO vignette, NO dark strips at top or bottom."

Be literal and specific — describe only what you SEE, not what you FEEL. No metaphors, no abstract concepts."""

    image_prompt = claude_call(img_system, img_user, max_tokens=300)

    return {
        "caption": caption,
        "hashtags": hashtags,
        "image_prompt": image_prompt,
        "first_comment": first_comment,
        "comment_replies": comment_replies,
        "type": post_type,
        "topic": topic,
        "category": category,
        "blog_url": blog_url,
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

    # Načti skutečný astronomický kontext
    print("[*] Načítám astronomický kontext...")
    astro = get_astro_context(target_date)
    print(f"    {astro['summary'].splitlines()[0]}")
    for line in astro['summary'].splitlines()[1:]:
        print(f"    {line}")

    post_type = pick_type(mem, args.type)
    topic, category, blog_url = pick_topic(mem, post_type, args.topic, astro)

    print(f"\n[*] Typ: {post_type} | Kategorie: {category}")
    print(f"[*] Téma: {topic}")
    if blog_url:
        print(f"[*] Blog URL: {blog_url}")

    result = generate_post(post_type, topic, category, target_date, blog_url, astro, mem)

    # Výstup
    sep = "=" * 60
    print(f"\n{sep}")
    print(f"📅 {date_cs} | 🌙 večerní post\n")
    print(result["caption"])
    print(f"\n{result['hashtags']}")
    if result["first_comment"]:
        print(f"\n{sep}")
        print(f"💬 PRVNÍ KOMENTÁŘ (vlož ihned po zveřejnění):")
        print(f"🔗 {result['first_comment']}")
    print(f"\n{sep}")
    print(f"💬 ODPOVĚDI NA KOMENTÁŘE")
    print(sep)
    print(result["comment_replies"])
    print(f"\n{sep}\n🖼️  IMAGE PROMPT\n{sep}")
    print(result["image_prompt"])
    print(sep)

    # Ulož do paměti
    mem_entry = {
        "date": target_date,
        "type": post_type,
        "topic": topic,
        "category": category,
        "score": None,
    }
    if blog_url:
        mem_entry["blog_url"] = blog_url
    mem["posts"].append(mem_entry)
    save_memory(mem)

    # Ulož do souboru
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / f"evening_{target_date}.txt"
    file_content = (
        f"📅 {date_cs} | večerní post\n"
        f"Typ: {post_type} | Kategorie: {category}\n\n"
        f"{result['caption']}\n\n"
        f"{result['hashtags']}\n"
    )
    if result["first_comment"]:
        file_content += f"\n💬 PRVNÍ KOMENTÁŘ:\n🔗 {result['first_comment']}\n"
    file_content += f"\n💬 ODPOVĚDI NA KOMENTÁŘE\n{sep}\n{result['comment_replies']}\n"
    file_content += f"\nIMAGE PROMPT\n{sep}\n{result['image_prompt']}\n"
    out_path.write_text(file_content, encoding="utf-8")

    print(f"\n[OK] Typ: {post_type} | Téma: {topic}")
    print(f"[OK] Uloženo: {out_path}")
    print(f"[TIP] Po zveřejnění ohodnoť post: python evening_post.py --score 8.5")


if __name__ == "__main__":
    main()
