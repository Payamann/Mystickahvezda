# Technical Debt Status

Aktualizováno: 2026-04-27

## Vyřešeno v posledním bloku

- Stabilizované E2E sekce: `content` běží defaultně s `--workers=2`, `checkout` s `--workers=1`.
- Centralizované serverové mapování feature -> plán přes `FEATURE_PLAN_MAP`.
- Přidaný `requireFeature(featureName)` middleware pro hard-gated premium funkce.
- Admin moderace Andělské pošty: seznam čekajících vzkazů, schválení, vrácení do fronty a smazání.
- Denní retence starých osobních cache dat pro numerologii, minulý život a medicínské kolo.
- Server už nepřebírá klientem poslané numerologické výpočty jako autoritu.
- Produktové texty a vybrané blogy už netvrdí přesnost tam, kde jde o symbolický nebo AI asistovaný výklad.
- Opravené překlepy a lomené tvary v dotčených feature textech.

## Vědomě zbývá

### Reálný astro engine

Současné natální, synastrické a astrokartografické výstupy jsou transparentně popsané jako symbolické/AI asistované. Pokud má produkt slibovat skutečné výpočty, je potřeba samostatná implementační etapa:

1. Vybrat zdroj efemerid a výpočetní knihovnu.
2. Přidat geokódování místa narození a časové zóny.
3. Počítat planety, domy, ascendent, aspekty a orbisy server-side.
4. Ukládat vypočtená astro data odděleně od AI interpretace.
5. Vykreslit natální kruh a astrokartografické linie z reálných dat.
6. Přidat regresní testy se známými referenčními daty.
7. Teprve potom změnit copy z "symbolické" na "výpočtové".

Dokud tato etapa není hotová, je správné držet současnou transparentní formulaci.

## Astro engine - posun 2026-04-26 večer

Hotovo:

- Health check už nehlásí zastaralé `DATABASE_URL`/`GEMINI_API_KEY`, ale aktuální Supabase a Anthropic/legacy AI konfiguraci; regresní test hlídá i degradovaný stav.
- Produkční smoke skript `npm run verify:production` míří defaultně na canonical doménu, ověřuje health, public manifesty, sitemap/robots, hlavní HTML vstupy i základní astro výpočty, podporuje CSRF/cookie auth flow a AI volání spouští jen přes `VERIFY_RUN_AI=true`.
- Produkční dependency audit je čistý: `npm audit --omit=dev` vrací 0 zranitelností. Plný `npm audit` je také čistý po odstranění nepoužívaného `fontmin`, upgrade `esbuild`, upgrade `express`/`express-rate-limit` a override `svix`.
- `package.json` má explicitní Node runtime `>=20 <25`, aby Railway/Nixpacks nespadly na nepodporovanou verzi.
- Serverový `astro-engine-v1` počítá low-precision geocentrické pozice Slunce, Měsíce, Merkuru, Venuše, Marsu, Jupiteru, Saturnu, Uranu, Neptunu a Pluta.
- Natální karta vrací strukturovaný `chart`: planety, znamení, stupně, retrograditu, aspekty, dominantní element/modalitu a souhrn.
- Veřejný endpoint `GET /api/natal-chart/calculate` vrací výpočet bez AI interpretace, takže klient už nemusí spoléhat na demo seed.
- `POST /api/natal-chart`, `POST /api/synastry` a `POST /api/astrocartography` posílají AI interpretaci nad vypočtenými daty.
- Premium `POST /api/natal-chart` už při výpadku AI vrací lokální fallback interpretaci nad vypočteným chartem místo 500.
- Synastrie počítá server-side cross-aspekty a skóre emoce/komunikace/vášeň/stabilita/celkem.
- Premium `POST /api/synastry` už při výpadku AI nevrací 500; vrátí lokální fallback interpretaci nad vypočteným synastrickým skóre a aspekty.
- Veřejný endpoint `POST /api/synastry/calculate` sjednocuje skóre partnerské shody pro nepřihlášené i přihlášené uživatele bez AI nákladů.
- Veřejný endpoint `GET /api/transits/current` počítá aktuální tranzitní aspekty vůči natální mapě bez AI nákladů.
- Pro rozpoznaná místa narození se používá časové pásmo přes `Intl` a whole-sign domy včetně ascendentu.
- Klient natální karty zobrazuje vypočtené Slunce/Měsíc/Ascendent z backendu.
- Klient natální karty zobrazuje dominantní element, modalitu, nejsilnější aspekty a serverově vypočtený tranzitní snapshot.
- Natální frontend byl vyčištěný od zastaralého bloku o demo planetách vygenerovaných na klientu; textová fallback logika teď odpovídá serverovému `astro-engine-v1`.
- Astrokartografie vrací strukturovanou symbolickou relokační vrstvu `astrocartography`: top doporučená místa, skóre, planetární rezonanci, praktické použití a transparentní poznámku k přesnosti.
- `POST /api/astrocartography` už při výpadku AI vrací lokální fallback interpretaci nad doporučenými destinacemi místo 500, včetně příznaku `fallback`.
- Klient astrokartografie zobrazuje serverový souhrn top míst a zvýrazňuje doporučené destinace přímo na mapě, místo aby spoléhal jen na volný AI text.
- OpenAPI dokumentace obsahuje veřejné astro výpočetní endpointy a základní schémata.
- Horoskopový endpoint už při zásahu AI limitu nevisí na ručně obaleném middleware; vrací korektní 429 a je pokrytý regresním testem.
- Stránka a prompt pro `Minulý život` jsou přepsané transparentněji: výstup je prezentovaný jako symbolická sebereflexe, ne faktické tvrzení o ověřené minulosti.
- `POST /api/past-life` má bezpečný symbolický fallback, pokud AI vrátí nevalidní JSON; premium uživatel nedostane 500 jen kvůli formátu odpovědi.
- `POST /api/medicine-wheel` má stejný fallback pro nevalidní AI JSON a prompt je upravený na archetypální sebereflexi bez předstírání konkrétní domorodé tradice.
- `POST /api/past-life` a `POST /api/medicine-wheel` používají stejný symbolický fallback i při samotném výpadku AI volání, nejen při nevalidním JSONu.
- `POST /api/horoscope` teď serverově validuje AI JSON před uložením do cache; rozbitá odpověď modelu spadne do strukturovaného fallbacku místo toho, aby se poslala klientovi nebo zanesla do cache.
- Programatické SEO stránky `/horoskop/:sign/:date` používají stejnou validaci, takže neindexují volný nebo poškozený AI text jako hotový denní horoskop.
- Paywall zásahy u hlubší Andělské karty a týdenních/měsíčních horoskopů se nově zapisují do funnel metrik stejně jako ostatní premium brány.
- Vyčerpání free limitu Křišťálové koule nově zapisuje `crystal_ball_unlimited` paywall hit, takže upsell už není slepé místo ve funnel datech.
- Křišťálová koule, snový výklad, tarot, tarotový souhrn, hlubší Andělská karta, runy a denní moudrost už při výpadku AI vrací lokální fallback nad otázkou/snem/kartami/runou/kontextem místo 500.
- Denní briefing má nově lokální fallback nad znamením, jménem a kartou dne a sanitizuje délky vstupů před tvorbou promptu/cache klíče.
- `POST /api/numerology` už při výpadku AI nevrací 500; použije fallback interpretaci nad vypočtenými čísly a vrací i strukturovaný blok `numbers` pro audit.
- Mentor free limit už počítá denní zprávy přes Supabase `count` místo prázdného `data` při `head: true`; čtvrtá free zpráva správně vrací paywall a zapisuje zásah do funnelu.
- Ukládání historie výkladů `/api/user/readings` přijímá skutečné frontendové typy (`crystal-ball`, `natal-chart`, `synastry` atd.) a validuje objektová data korektně; dříve špatné volání `validateString` mohlo ukládání tiše rozbíjet.
- Frontend `Auth.saveReading()` už posílá CSRF token, takže ukládání historie po výkladech nepadá na 403 u běžného prohlížečového volání.
- Doplněné CSRF hlavičky pro další stavové frontendové akce: `Auth.fetchProtected()` (synastrie), reset hesla z auth modalu, dokončení onboardingu, profilový journal, oblíbené a mazání výkladů v profilu.
- Profilový modal historie escapuje tarotový AI souhrn před převodem nových řádků na `<br>`, takže uložený výklad nemůže do detailu profilu vložit HTML.
- Profilová historie má sjednocené názvy, ikony a filtraci pro aktuálně ukládané typy výkladů (`crystal-ball`, `natal-chart`, `astrocartography`, `past-life`, `medicine-wheel`, `runes`), včetně aliasů pro starší uložené typy.
- Numerologická historie nově ukládá i AI/fallback interpretaci a profilový modal umí zobrazit obecné `response` nebo string data čitelně, ne jen jako JSON dump.
- Profilový modal nově vykresluje objektové `result` výklady jako strukturované sekce s popisky, takže `Minulý život` a `Šamanské kolo` nekončí jako `[object Object]`.
- `Auth.saveReading()` vrací přímo uložený reading s `id` a backend zároveň posílá `id` i top-level; tlačítka oblíbených po novém výkladu tak mají okamžitě správné ID.
- Natální karta už do historie neukládá free teaser bez plné interpretace; profil tak nedostává prázdné položky.
- Hluboký výklad Andělské karty, runový výklad, astrokartografie, Minulý život a Šamanské kolo se nově ukládají do profilu jako strukturované readingy a po uložení nabízejí přidání do oblíbených.
- Push notifikace mají připojené `/api/push` routy, serverové zrušení odběru a regresní test subscribe/unsubscribe; tlačítko už nemaže jen lokální stav v prohlížeči.
- Partnerská shoda nově přijímá volitelný čas a místo narození pro obě osoby, profilový autofill doplňuje i tato pole a serverová synastrie tak může počítat ascendent/domovou vrstvu místo pouhého date-only skóre.
- Synastrický engine nově vrací přesné metadata `precision`, `person1Precision` a `person2Precision`; kombinovaná přesnost se správně sníží, když jedné osobě chybí čas narození.
- Uložený synastrický výklad po plné analýze nově nabízí přidání do oblíbených stejně jako ostatní výkladové nástroje.
- UI Partnerské shody nově zobrazuje i serverem počítané skóre stability/závazku; fallback skórování má stejnou čtvrtou dimenzi a Playwright ji hlídá.
- Natální karta, Partnerská shoda a Astro mapa mají nápovědu podporovaných měst narození sjednocenou s lokální databází astro enginu a hlídanou statickým testem, takže uživatel snáz zadá místo, ze kterého lze spočítat ascendent a domy.
- Astro mapa nově vrací a vykresluje low-precision MC/IC meridiány planet (`angularLines`) nad natální mapou; prompt i UI už mají první výpočtovou liniovou vrstvu vedle symbolických doporučených měst.
- Vizuál natální karty je po výpočtu statický a zobrazuje vypočtené domy/aspekty v SVG; demo orbit animace zůstává jen před skutečným výpočtem.
- Výpočet fáze Měsíce používá UTC referenční nov, dá se zavolat pro konkrétní datum a má regresní test pro nov/úplněk i neplatný vstup.
- Testovací skripty mají samostatnou frontend unit sekci `test:unit:frontend` a `test:verify` ji nově spouští vedle serverových unit testů, takže numerologie/synastrie neleží mimo hlavní ověření.
- OpenAPI dokumentace nově pokrývá `/push/subscribe`, `/push/unsubscribe`, `PushSubscription` a `angularLines` pro astro mapu, aby veřejný kontrakt odpovídal implementaci.
- Profilový detail uložených astro výkladů nově zobrazuje čitelné souhrny skóre synastrie, vypočtené mapy a astrocartografických míst/linií místo samotného dlouhého interpretačního textu.
- Textové interpretace v profilovém modalu se před DOMPurify sanitizují už jako escapovaný/formátovaný obsah, takže se zachovají řádky a zároveň nevzniká prostor pro uložené HTML.
- Andělská pošta už nepoužívá demo vzkazy jako falešný social proof; při prázdném API ukáže prázdný stav a při výpadku API chybový stav, plus to hlídá Playwright regresní test.
- Limit uloženého readingu je zvýšený z 9 KB na 50 KB a regresní test ukládá realistický natální chart, synastrii i astrocartografii; vypočtená astro data se tak neztratí kvůli příliš nízkému payload limitu.
- HTML stránky už nenačítají DOMPurify dvakrát ze stejného CDN; statický CSP test nově hlídá duplicitní `<script src>`.
- API error handler vrací konkrétní JSON pro nevalidní JSON tělo a payload nad 64 KB, místo obecné 500/413 odpovědi bez použitelného detailu.
- Push klient už nemá hardcodovaný placeholder VAPID klíč; veřejný klíč se čte z `/api/config` a bez konfigurace se uloží jen intent.
- Sentry init už neposílá placeholder DSN; browser DSN se čte z `/api/config`, bez konfigurace se monitoring korektně nevypne chybou a statický test hlídá návrat placeholder klíčů.
- Partnerská shoda teď ve výsledku ukazuje souhrn astro enginu: přesnost výpočtu, Slunce/Měsíc/ASC obou osob a rozpoznané místo, aby uživatel viděl dopad zadaného času a místa narození.
- Natální SVG kruh nově popisuje nejsilnější aspektové linky zkratkou aspektu a orbem přímo v mapě; Playwright hlídá, že popisky po výpočtu vzniknou.
- Podporovaná místa narození mají veřejný endpoint `/api/birth-locations` a klientský hydrátor datalistů na natální kartě, partnerské shodě a astro mapě; HTML optiony zůstávají jako fallback, ale canonical seznam už je serverový.
- `/api/birth-locations` má veřejnou cache hlavičku `max-age=86400`, protože jde o stabilní manifest podporovaných měst.
- Playwright ověřuje, že datalist míst narození umí převzít runtime odpověď z `/api/birth-locations`, nejen statické fallback optiony.
- Natální karta už ve výsledku ukazuje všech 10 vypočtených planetárních pozic včetně Uranu, Neptunu a Pluta, nejen Slunce/Měsíc/ASC; E2E kontroluje kompletní seznam.
- Astrokartografický objekt nově nese `precision`, rozpoznané `location` a poznámky z natálního výpočtu; UI souhrn astro mapy ukazuje místo a přesnost zdrojové mapy vedle Slunce/Měsíce/ASC.
- Natální kruh má ekliptické 5°/10° tick marky a sign boundary značky; E2E hlídá 72 SVG ticků po vykreslení zvěrokruhu.
- `initConfig()` je idempotentní: paralelní moduly sdílí jeden `/api/config` request a po selhání se může další volání pokusit o retry.
- Homepage nově načítá `sentry-init.js` až po `api-config.js`, takže browser DSN z `/api/config` je dostupné před inicializací Sentry; statický test hlídá pořadí.
- Playwright ověřuje, že homepage stáhne `/api/config` jen jednou i při kombinaci `api-config` a `sentry-init`.
- Analytics eventy pro synastrii a astro mapu nově nesou přesnost výpočtu, rozpoznání míst a další metadata kvality vstupu.
- Astrokartografické doporučení opravuje `primaryPlanet.degreeText`: bere stupeň z vypočtené planety, ne ze sign objektu bez tohoto pole; regresní test hlídá vyplněný stupeň.
- Prompt pro astrokartografii nově obsahuje přesnost zdrojové mapy, rozpoznané místo narození a stupeň hlavní planety u doporučených destinací.
- Prompt pro synastrii nově obsahuje celkovou i person-level přesnost a rozpoznané místo obou osob, aby AI neinterpretovala ascendent/domovou vrstvu bez podkladu.
- Prompt pro natální kartu nově explicitně obsahuje rozpoznané místo narození vedle přesnosti výpočtu.
- Astro endpointy už propouštějí přesné `latitude`/`longitude`/`timeZone`/`country` vstupy do natálního, tranzitního, synastrického a astrokartografického výpočtu; API klienti tak nejsou omezeni jen lokálním seznamem podporovaných měst a výpočet bez validního IANA `timeZone` už se transparentně značí jako UTC přesnost bez ascendentu/domů.
- Lokální resolver míst narození používá hranice slov místo volného substring matchingu, takže podporuje `Praha 2`, `Praha-Vinohrady` nebo `New York, USA`, ale neoznačí omylem `Nepraha` jako Prahu.

Zbývá:

1. Nahradit low-precision efemeridu knihovnou nebo tabulkami s referenčními daty, pokud chceme deklarovat vysokou astronomickou přesnost.
2. Rozšířit geokódování ze serverového lokálního seznamu měst na obecný resolver s cache a historickými časovými změnami.
3. Zpřesnit natální kruh na plnohodnotné astrologické kolo s lepším rozmístěním popisků a planetárních glyphů; ekliptické tick marky, vypočtené domy/aspekty i orb popisky už SVG zobrazuje.
4. Zvážit samostatnou tabulku/artefakt pro velmi velká vypočtená astro data, pokud budeme ukládat více verzí chartu nebo referenční efemeridy mimo JSON readingu.
5. Pro astrokartografii doplnit přesné ASC/DSC křivky a zpřesnit MC/IC linie referenční efemeridou; dnes už existují low-precision MC/IC meridiány a symbolické skóre destinací, ale ne plná profesionální mapová geometrie.
