"""
Konfigurace Social Media Agenta pro Mystická Hvězda
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Načti .env soubor
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# === API KLÍČE ===
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")   # Claude — generování textů
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")          # Gemini — generování obrázků (Imagen 3)
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")
META_PAGE_ID = os.getenv("META_PAGE_ID", "")
INSTAGRAM_ACCOUNT_ID = os.getenv("INSTAGRAM_ACCOUNT_ID", "")

# === BUFFER API ===
BUFFER_ACCESS_TOKEN = os.getenv("BUFFER_ACCESS_TOKEN", "")
BUFFER_PROFILE_ID = os.getenv("BUFFER_PROFILE_ID", "")  # Instagram profil ID v Buffer

# === IMGBB (hosting obrázků pro Buffer) ===
# Zdarma na https://imgbb.com — nutné pro posty s obrázkem přes Buffer
IMGBB_API_KEY = os.getenv("IMGBB_API_KEY", "")

# === HUGGING FACE (generování obrázků — FLUX.1-schnell) ===
# Zdarma na https://huggingface.co/settings/tokens (Read token)
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")

# === BRAND NASTAVENÍ ===
BRAND_NAME = os.getenv("BRAND_NAME", "Mystická Hvězda")
WEBSITE_URL = os.getenv("WEBSITE_URL", "https://www.mystickahvezda.cz")
LANGUAGE = os.getenv("LANGUAGE", "cs")

# === CLAUDE MODELY ===
TEXT_MODEL = "claude-sonnet-4-5"         # Pro texty, captions, hashtags
TEXT_MODEL_PRO = "claude-opus-4-5"       # Pro složitější úlohy (refinement, weekly plan)
IMAGE_MODEL = "imagen-3.0-generate-002"  # Imagen 3 pro obrázky (Gemini zůstává jen pro obrázky)

# === META GRAPH API ===
GRAPH_API_VERSION = "v22.0"
GRAPH_API_URL = f"https://graph.facebook.com/{GRAPH_API_VERSION}"
HTTP_TIMEOUT = 30  # sekundy pro všechny HTTP requesty

# === CESTY ===
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"
POSTS_DIR = OUTPUT_DIR / "posts"
IMAGES_DIR = OUTPUT_DIR / "images"
BLOG_INDEX_PATH = BASE_DIR.parent / "data" / "blog-index.json"

# === CONTENT NASTAVENÍ ===
# Témata pro posty (rotujeme automaticky)
CONTENT_THEMES = [
    # Systémy — přímé nástroje na webu
    "tarot",
    "numerologie",
    "astrologie",
    "runy",
    "andělé a andělské karty",
    # Web nástroje
    "lunární rituály a fáze měsíce",
    "natální karta a birth chart",
    "partnerská shoda a kompatibilita",
    "minulé životy a karma",
    "šamanské kolo a totemová zvířata",
    "horoskopy a předpovědi",
    "sny a jejich výklad",
    "biorytmy a osobní cykly",
    "aura a barvy energie",
    "afirmace a denní záměry",
    "astromapa a místa na světě",
    "čínský horoskop",
    # Životní témata (pure_value, bez přímého nástroje)
    "karmické vztahy a spřízněné duše",
    "synchronicita a znamení",
    "sebepoznání a životní účel",
    "duchovní rozvoj",
    "sezónní energie a astrologie roku",
]

# Témata s přímým nástrojem na webu — vhodná pro soft_promo a direct_promo
# Každé téma má URL na mystickahvezda.cz — agent MUSÍ odkazovat jen na relevantní URL
PROMOTABLE_TOOLS = {
    "tarot":                           "mystickahvezda.cz/tarot",
    "numerologie":                     "mystickahvezda.cz/numerologie",
    "astrologie":                      "mystickahvezda.cz/horoscope",
    "runy":                            "mystickahvezda.cz/runy",
    "andělé a andělské karty":         "mystickahvezda.cz/angelske-karty",
    "lunární rituály a fáze měsíce":   "mystickahvezda.cz/lunar-calendar",
    "natální karta a birth chart":     "mystickahvezda.cz/natalni-karta.html",
    "partnerská shoda a kompatibilita":"mystickahvezda.cz/partner-compatibility",
    "minulé životy a karma":           "mystickahvezda.cz/minuly-zivot",
    "šamanské kolo a totemová zvířata":"mystickahvezda.cz/shamanske-kolo",
    "horoskopy a předpovědi":          "mystickahvezda.cz/horoscope",
    "sny a jejich výklad":             "mystickahvezda.cz/snar",
    "biorytmy a osobní cykly":         "mystickahvezda.cz/biorytmy",
    "aura a barvy energie":            "mystickahvezda.cz/aura",
    "afirmace a denní záměry":         "mystickahvezda.cz/hvezdny-pruvodce",
    "astromapa a místa na světě":      "mystickahvezda.cz/astromapa",
    "čínský horoskop":                 "mystickahvezda.cz/cinsky-horoskop",
}

# Zpětná kompatibilita — seznam témat pro anti-repetition logiku
PROMOTABLE_THEMES = list(PROMOTABLE_TOOLS.keys())

# Typy postů (kompletní seznam)
POST_TYPES = {
    "educational":   "Vzdělávací post — vysvětluje mystický koncept",
    "myth_bust":     "Odhalení mýtu — bourá běžné omyly o mystice",
    "story":         "Příběhový post — s konkrétní scénou a lekcí",
    "quote":         "Původní citát nebo moudrost značky",
    "question":      "Zapojovací otázka pro komunitu",
    "tip":           "Konkrétní praktický rituál nebo tip",
    "challenge":     "Výzva pro komunitu (3-7 denní)",
    "blog_promo":    "Propagace blogového článku",
    "daily_energy":  "Denní energetická předpověď (lunár + astro)",
    "carousel_plan": "Plán karusel postu (7 slidů)",
    "cross_system":  "Propojení 2+ mystických systémů (tarot+astro, numerologie+runy...)",
    "tool_demo":     "Ukázka nástroje na konkrétním příkladu — taste of premium",
    "save_worthy":   "Checklist / porovnání / quick reference — obsah k uložení",
}

# Denní časové sloty pro 3× denní posting (ráno / poledne / večer)
DAILY_TIME_SLOTS = [
    {
        "id": "morning",
        "label": "🌅 Ráno",
        "time": "08:00",
        # save_worthy zvýšeno — ranní saves jsou nejsilnější signál pro IG algoritmus
        "preferred_types": ["daily_energy", "quote", "tip", "save_worthy"],
        "type_weights":    [0.30,           0.20,    0.25,  0.25],
        "content_intent": "pure_value",
    },
    {
        "id": "noon",
        "label": "☀️ Poledne",
        "time": "12:00",
        # cross_system a tool_demo jsou unikátní formáty — musí být v rotaci každý týden
        "preferred_types": ["educational", "myth_bust", "story", "cross_system", "tool_demo", "blog_promo"],
        "type_weights":    [0.25,           0.15,        0.20,   0.20,            0.15,         0.05],
        "content_intent": None,  # auto z pick_content_intent()
    },
    {
        "id": "evening",
        "label": "🌙 Večer",
        "time": "19:00",
        "preferred_types": ["question", "challenge", "myth_bust"],
        "type_weights":    [0.55,        0.25,         0.20],
        "content_intent": "pure_value",
    },
]

# Týdenní rytmus — různé dny mají různý obsah a energii
# Agent to použije pro výběr témat a tónu
WEEKLY_RHYTHM = {
    0: {  # Pondělí
        "mood": "motivační",
        "focus": "nový začátek, záměry, energie týdne",
        "preferred_themes": ["afirmace a denní záměry", "numerologie", "lunární rituály a fáze měsíce"],
        "avoid_types": ["challenge"],  # Pondělí není den pro výzvy — lidé teprve startují
        "boost_types": ["daily_energy", "quote", "save_worthy"],
    },
    1: {  # Úterý
        "mood": "vzdělávací",
        "focus": "hloubkové znalosti, systémy, jak věci fungují",
        "preferred_themes": ["tarot", "runy", "astrologie", "numerologie", "andělé a andělské karty"],
        "avoid_types": [],
        "boost_types": ["educational", "cross_system", "myth_bust"],
    },
    2: {  # Středa
        "mood": "praktický",
        "focus": "rituály, tipy, konkrétní nástroje",
        "preferred_themes": ["lunární rituály a fáze měsíce", "šamanské kolo a totemová zvířata", "biorytmy a osobní cykly"],
        "avoid_types": [],
        "boost_types": ["tip", "tool_demo", "save_worthy"],
    },
    3: {  # Čtvrtek
        "mood": "hluboký",
        "focus": "sebepoznání, stíny, karmanické vzorce",
        "preferred_themes": ["natální karta a birth chart", "minulé životy a karma", "karmické vztahy a spřízněné duše"],
        "avoid_types": [],
        "boost_types": ["story", "cross_system", "educational"],
    },
    4: {  # Pátek
        "mood": "lehký a zábavný",
        "focus": "vztahy, kompatibilita, horoskopy — konec týdne, odlehčení",
        "preferred_themes": ["partnerská shoda a kompatibilita", "horoskopy a předpovědi", "synchronicita a znamení"],
        "avoid_types": ["challenge"],
        "boost_types": ["question", "myth_bust", "quote"],
    },
    5: {  # Sobota
        "mood": "komunitní",
        "focus": "sdílení, příběhy, otázky — víkend = více času na čtení",
        "preferred_themes": ["sny a jejich výklad", "aura a barvy energie", "duchovní rozvoj"],
        "avoid_types": [],
        "boost_types": ["story", "question", "save_worthy"],
    },
    6: {  # Neděle
        "mood": "reflexivní",
        "focus": "uzavírání týdne, příprava na nový, introspekce",
        "preferred_themes": ["sebepoznání a životní účel", "sezónní energie a astrologie roku", "afirmace a denní záměry"],
        "avoid_types": ["tool_demo"],  # Neděle není prodejní den
        "boost_types": ["quote", "daily_energy", "tip"],
    },
}

# Adresář pro content kalendáře
CALENDAR_DIR = OUTPUT_DIR / "calendar"

# Content Pillars — doporučený poměr typů obsahu
# 40% vzdělávání | 30% zapojení | 20% propagace | 10% inspirace
CONTENT_PILLARS = {
    "education":   ["educational", "myth_bust", "story", "cross_system"],  # 40%
    "engagement":  ["question", "challenge", "daily_energy"],              # 30%
    "promotion":   ["blog_promo", "carousel_plan", "tool_demo"],           # 20%
    "inspiration": ["quote", "tip", "save_worthy"],                        # 10%
}

# Hashtags základní sada (vždy přidány)
BASE_HASHTAGS = [
    "#mystickahvezda",
    "#spiritualita",
    "#duchovnírozvoj",
    "#ezoterika",
]

# Hashtag Clusters — tematické sady pro lepší dosah
# Agent vybere 2-3 relevantní clustery + base = optimální mix
HASHTAG_CLUSTERS = {
    "tarot": {
        "big": ["#tarot", "#tarotreading", "#tarotcommunity"],
        "mid": ["#českýtarot", "#tarotczech", "#kartářství", "#výkladkaret"],
        "niche": ["#tarotváramluví", "#tarotdaily", "#tarotinspiration", "#tarotvýklad"],
    },
    "astrologie": {
        "big": ["#astrology", "#horoscope", "#zodiac"],
        "mid": ["#astrologiecz", "#horoskop", "#znamenízvěrokruhu"],
        "niche": ["#planetyahvězdy", "#natal chart", "#tranzity", "#astrovýklad"],
    },
    "numerologie": {
        "big": ["#numerology", "#numerologylife"],
        "mid": ["#numerologiecz", "#numerologie", "#číslaživota"],
        "niche": ["#životníčíslo", "#anděláčísla", "#11:11", "#numerologickýkód"],
    },
    "lunární": {
        "big": ["#moonphases", "#fullmoon", "#newmoon"],
        "mid": ["#měsíčnífáze", "#lunárnícyklus", "#úplněk"],
        "niche": ["#energieměsíce", "#novoluní", "#lunárníkalenář", "#moonritual"],
    },
    "meditace": {
        "big": ["#meditation", "#mindfulness", "#meditace"],
        "mid": ["#meditacecz", "#duchovno", "#vnitřníklid"],
        "niche": ["#rannímeditace", "#záměr", "#dechovápraxe", "#ticho"],
    },
    "energie": {
        "big": ["#energy", "#chakras", "#healing"],
        "mid": ["#čakry", "#energetickéléčení", "#aura"],
        "niche": ["#energieproudí", "#vibrace", "#energetickéčištění"],
    },
    "krystaly": {
        "big": ["#crystals", "#crystalhealing"],
        "mid": ["#krystaly", "#minerály", "#krystaloterapie"],
        "niche": ["#ametyst", "#růženín", "#krystalovávoda", "#kamenyaenergie"],
    },
    "rituály": {
        "big": ["#rituals", "#witchcraft", "#magick"],
        "mid": ["#rituály", "#svíčkovámagie", "#duchovnírituál"],
        "niche": ["#novolunírit", "#úplňkovrituál", "#bylinky", "#sabbat"],
    },
    "vztahy": {
        "big": ["#soulmate", "#twinflame", "#love"],
        "mid": ["#spřízněnáduše", "#karmickývztah", "#duchovnívztahy"],
        "niche": ["#partnerskáshoda", "#synastrie", "#karmicképouto"],
    },
    "sny": {
        "big": ["#dreams", "#dreaminterpretation"],
        "mid": ["#výkladsnu", "#snář", "#sny"],
        "niche": ["#lucidsny", "#snovámagie", "#podvědomí"],
    },
    "andělé": {
        "big": ["#angels", "#angelnumbers"],
        "mid": ["#andělskékarty", "#andělsképoselství"],
        "niche": ["#andělstrážný", "#duchovnívedení", "#anděl"],
    },
    "runy": {
        "big": ["#runes", "#vikingrunes"],
        "mid": ["#runy", "#runycz"],
        "niche": ["#nordickámystika", "#vikingskeruna", "#futhark"],
    },
    "shadow_work": {
        "big": ["#shadowwork", "#innerhealing", "#selfgrowth"],
        "mid": ["#sebepoznání", "#vnitřníléčení", "#stínovápráce"],
        "niche": ["#shadow", "#vnitřnídítě", "#léčenítraumat"],
    },
    "manifestace": {
        "big": ["#manifestation", "#lawofattraction", "#manifest"],
        "mid": ["#manifestace", "#hojnost", "#zákonpřitažlivosti"],
        "niche": ["#afirmace", "#vizualizace", "#záměr"],
    },
}

# Platforma-specifická nastavení
PLATFORM_SETTINGS = {
    "instagram": {
        "max_caption_length": 2200,
        "max_hashtags": 30,
        "image_size": (1080, 1080),  # čtvereček
        "story_size": (1080, 1920),  # story
    },
    "facebook": {
        "max_caption_length": 63206,
        "max_hashtags": 10,
        "image_size": (1200, 630),  # landscape
    }
}
