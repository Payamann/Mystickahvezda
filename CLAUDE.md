# Mystická Hvězda — Projektové instrukce pro Claude

## ⚠️ POVINNÉ: Automatické logování postů generovaných v chatu

Kdykoli v tomto chatu vygeneruješ Instagram příspěvky pro Mystickou Hvězdu,
**IHNED po jejich napsání** (ještě v téže odpovědi nebo hned po ní) spusť `log_post.py` pro každý post.

### Příkaz pro logování:
```bash
cd "C:\Users\pavel\OneDrive\Desktop\MystickaHvezda\social-media-agent" && set PYTHONIOENCODING=utf-8 && python log_post.py --topic "TÉMA" --type TYP --hook HOOK --intent INTENT --score SKORE --caption "PRVNÍ VĚTA..."
```

### Parametry:
| Parametr | Hodnota |
|---|---|
| `--topic` | Hlavní téma postu (česky, popisně) |
| `--type` | Typ: `educational`, `question`, `tip`, `story`, `quote`, `blog_promo`, `myth_bust`, `carousel_plan` |
| `--hook` | Hook formula: `curiosity_gap`, `contrarian`, `question`, `myth_bust`, `vulnerability`, `pattern_interrupt`, `micro_story`, `milestone`, `fear_reversal`, `celebration` |
| `--intent` | `pure_value`, `soft_promo`, nebo `direct_promo` |
| `--score` | Odhadované QG skóre 1–10 (hook síla + brand voice + hodnota + jazyk + CTA) |
| `--caption` | První věta captionnu (pro tracking) |

### Kdy logovat:
- ✅ Vždy když generuješ 1+ Instagram postů v chatu
- ✅ I při přepisu / úpravách existujících postů
- ✅ I při generování testovacích / ukázkových postů
- ❌ Ne při vysvětlování konceptů nebo přípravě bez finálního textu

### Proč je to důležité:
Bez logování se agent neučí, content memory je prázdná, témata se opakují
a hook efektivita se nesleduje. Paměť je mozek agenta.

---

## Social Media Agent — rychlý přehled

- **Umístění:** `social-media-agent/`
- **Spuštění:** `python agent.py generate --topic "téma" --type educational`
- **Paměť:** `social-media-agent/output/content_memory.json`
- **Logování chat postů:** `python log_post.py --help`
- **Deploy:** `git push origin main` → Railway automaticky nasadí web

## Jazykové pravidlo
Veškerá komunikace s uživatelem v češtině.
