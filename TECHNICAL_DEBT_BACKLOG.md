# Technical Debt Backlog

Aktualizace: 2026-04-26

## P0/P1 - nejblizsi sprinty

1. **Externalizovat inline skripty ze statickych stranek**
   - Stav: hotovo pro bezne produktove i kontrolni HTML. Executable inline JS a inline `on*` handlery jsou odstranene, CSP drzi `script-src-attr 'none'` a `script-src` nepouziva `unsafe-inline`.
   - Stav navic: CSP se sklada pres `server/utils/csp.js`; API a asset odpovedi maji kratkou hash-free politiku a HTML odpovedi dostavaji jen page-specific `sha256` hashe pro vlastni inline JSON-LD. Regresni test hlida i nested statickou stranku `/horoskop/beran.html`, aby podadresare nezustaly mimo CSP hashe.
   - Proc: stranky porad obsahuji inline JSON-LD bloky, ale neni nutne nafukovat globalni CSP hlavicku hashi ze vsech HTML souboru.
   - Dalsi krok: pokud budeme chtit jednodussi audit bez inline JSON-LD, presunout JSON-LD do server-side injection s nonce nebo do externich generovanych JSON endpointu.

2. **Odstranit inline styly a zpresnit `style-src`**
   - Stav: hotovo. Verejne HTML stranky i kontrolni HTML jsou bez statickych `style` atributu, bez `<style>` bloku a bez inline handleru. Runtime renderery byly prepsane na CSS tridy / DOM API, buildovane JS vystupy jsou bez `.style.*` zapisu mimo explicitni vendor vyjimku `three.min.js`.
   - Stav navic: stejne pravidlo ted pokryva i server-rendered HTML routes. Dynamicka horoskopova SEO stranka, unsubscribe odpoved a Swagger docs route uz nemaji inline styly; docs inicializace je externalizovana do `js/swagger-docs.js` a route je namountovana na `/api/docs`.
   - Proc: CSP uz muze bezet bez `style-src 'unsafe-inline'`; regresni test hlida, aby se inline styly nevratily.
   - Dalsi krok: pri dalsim UI refaktoru preferovat CSS tridy a DOM API, ne stringove `innerHTML` fragmenty se style atributy.

3. **Sjednotit asset strategy**
   - Stav: hotovo pro verejne stranky. JS build umi i podadresare, profil a testy jsou prepnute na `js/dist/profile/*` a `js/dist/quiz/*`. Regresni test hlida existenci lokalnich JS/CSS assetu, zakazuje navrat ke zdrojovym `js/*.js` referencim pro buildovane entrypointy a kontroluje, ze dist soubory s `import/export` syntaxi jsou nacitane jako `type="module"`.
   - Stav navic: stejne pravidlo ted plati i pro server-rendered HTML route sablony; dynamicka horoskopova SEO stranka pouziva `/js/dist/*` assety a regresni test skenuje serverove route soubory.
   - Proc: mensi rozdil mezi vyvojem a produkci, konzistentnejsi caching a snazsi smoke testy.
   - Dalsi krok: `js/vendor/*` ponechat jako zamerne vendor vyjimky; pri pridani dalsich nested entrypointu je build zahrne automaticky.

4. **Zpresnit service worker caching**
   - Stav: hotovo. `build:css` i `build:js` spousti `scripts/update-service-worker-cache.mjs`, ktery validuje precache assety a vaze `CACHE_NAME` na hash jejich aktualniho obsahu.
   - Stav navic: update skript i Jest test pro service worker ted hlidaji, ze `STATIC_ASSETS` nema duplicity, nema prazdne polozky a vsechny assety jsou root-relative cesty.
   - Proc: pri dalsich zmenach buildu se cache verze meni deterministicky a test selze, pokud zustane zastarala.
   - Dalsi krok: pokud bude precache seznam rust, oddelit seznam assetu do samostatneho manifestu a generovat i `STATIC_ASSETS`, ne jen cache verzi.

## P2 - stredni priorita

5. **Dokoncit observabilitu business funnelu**
   - Stav: hotovo pro zakladni operativni reporting. Server-side audit log je pridany pres `funnel_events`; backend zapisuje paywall/login gate impressions, upgrade CTA views, checkout validation failures, checkout session created/failed, subscription checkout completed, one-time purchase completed, invoice paid/failed, refundy, cancel requesty, reaktivace, subscription updated/cancelled a webhook failures. Admin API ma `GET /api/admin/funnel`, ktere agreguje paywall views, checkouty, premium konverze, jednorazove nakupy, selhani, refundy, zdroje, funkce, plany a posledni udalosti. `admin.html` zobrazuje funnel prehled za 7-365 dni vcetne paywall -> checkout a checkout -> purchase pomeru.
   - Stav navic: admin funnel UI zobrazuje i denni trend z backendoveho `daily` bucketu, takze neni nutne cist jen agregat a posledni udalosti.
   - Stav navic: `GET /api/admin/funnel?format=csv` exportuje denni funnel report jako CSV a admin UI ma tlacitko `Export CSV`.
   - Stav navic: `GET /api/admin/funnel` nacita i stejne dlouhe predchozi obdobi a vraci `sourceComparison`; admin UI ukazuje aktualni/predchozi pocet udalosti po zdrojich vcetne delty.
   - Stav navic: funnel report vraci `sourceFeatureSegments` s paywall, checkout, purchase a failure pocty i konverznimi pomery; admin UI je ukazuje v samostatne tabulce.
   - Stav navic: `server/openapi.yaml` dokumentuje `GET /api/admin/funnel` vcetne JSON reportu, CSV exportu, `sourceComparison` a `sourceFeatureSegments`; API docs test hlida, ze schema nezmizi.
   - Stav navic: `GET /api/admin/funnel?format=csv&view=segments` exportuje segmenty source + feature jako CSV a admin UI ma samostatne tlacitko `Export segmentu`.
   - Stav navic: segmentovy CSV export je kryty i route-level testem pres admin JWT a mockovanou `funnel_events` tabulku, ne jen cistym helper testem.
   - Stav navic: `sourceFeatureSegments` ted vraci i predchozi obdobi a delty konverznich pomeru pro paywall -> checkout a checkout -> purchase; admin UI i segmentovy CSV export je zobrazuji.
   - Stav navic: staticky test hlida, ze `admin.html` tlacitka s `data-action` maji odpovidajici handler v `js/admin.js`, aby se admin ovladani nerozbilo tichym prejmenovanim.
   - Stav navic: produkcni access-control pro `/api/docs` je kryty unit testem `isDocAllowed`, vcetne vypnuti bez `DOCS_TOKEN`, query tokenu a Bearer tokenu.
   - Stav navic: mock Supabase klient pro testy uz respektuje `.order(column, { ascending })`; regresni test hlida vzestupne i sestupne razeni, aby admin/funnel recent events a admin users testy nebyly falesne optimisticke.
   - Dalsi krok: jakmile bude dost dat, zacit z admin reportu vyhodnocovat segmenty s nejvetsim propadem a navazat na alerting nebo pravidelny export.

6. **Konsolidovat plan naming**
   - Stav: hotovo pro server i cenik. `server/config/constants.js` drzi `PLAN_TYPES`, `PREMIUM_PLAN_TYPES`, `SUBSCRIPTION_PLANS`, legacy aliasy, normalizaci a verejny plan manifest. `GET /api/plans` vraci verejna data o planech a mapu pro cenikovou stranku; `js/cenik.js` z nej odvozuje ceny a checkout `planId` s fallbackem na statickou konfiguraci.
   - Stav navic: profilovy dashboard a nastaveni uctu pouzivaji sdilene profile plan utility; labely a ceny berou z `/api/plans` s lokalnim fallbackem a legacy `vip` aliasem.
   - Stav navic: `js/premium-gates.js` nacita stejny `/api/plans` manifest pro CTA ceny a paywall footery s fallbackem na puvodni copy; API base URL bere pres fallback helper, ne primo z globalu.
   - Stav navic: admin UI pro manualni zmenu predplatneho uz nabizi i `exclusive_monthly`, ktery backend dlouhodobe validoval, ale frontend tlacitko chybel.
   - Stav navic: verejny plan manifest obsahuje `featurePlanMap`; `js/cenik.js` a `js/premium-gates.js` ho pouzivaji pro doporuceny plan s lokalnim fallbackem.
   - Dalsi krok: pri pridani dalsich placenych produktu doplnit produkt do `SUBSCRIPTION_PLANS` a podle potreby do `FEATURE_PLAN_MAP`.

7. **Zlepsit test coverage pro frontend flow**
   - Stav: hotovo pro pricing checkout smoke i post-auth pending checkout. `tests/e2e/cenik-payment.spec.js` pokryva neprihlaseny redirect na prihlaseni, ulozeni pending planu, prihlaseny checkout s mocknutym Stripe endpointem vcetne `planId`, `source`, `feature` a `billingInterval` payloadu a registracni flow, kde se pending checkout po registraci automaticky dokonci se stejnym kontextem.
   - Stav navic: E2E suite je rozdelena do sekci `api`, `core`, `content`, `tools`, `checkout`; nightly/manual CI je pousti jako matrix pro desktop i mobile a `fail-fast: false`, aby bylo hned videt, ktera oblast selhala.
   - Stav navic: E2E section runner umi `--list-sections` a pred spustenim validuje existenci spec souboru, aby chybejici nebo prejmenovany test selhal hned s citelnou hlaskou.
   - Stav navic: README uz nedoporucuje agresivni `--workers=6` pro vsechny E2E sekce; po auth/core timeoutech ma `core` ve section runneru stabilni vychozi `--workers=1`, pokud ho uzivatel explicitne neprepise.
   - Stav navic: `tests/e2e/auth.spec.js` ma lehky layout smoke, ktery hlida, ze login formular, registracni stav a pending checkout banner nepretekaji mimo viewport; bezi tim padem i v mobile projektu bez screenshot diff rezimu.
   - Stav navic: E2E section runner ma workspace lock v `tmp/`, takze paralelni rucni spusteni dvou E2E prikazu selze hned citelnou hlaskou misto port race na `3001`.
   - Stav navic: CI E2E matrix uz neprepise `core` stabilni default workeru; `--workers=2` posila jen do paralelnejsich sekci mimo auth-heavy core.
   - Stav navic: staticky test hlida CI workflow, aby se `core` v E2E matrixu znovu nespoustel s globalnim `--workers=2`.
   - Stav navic: auth E2E ted overuje skutecny post-auth navrat z registrace s feature kontextem na aktivacni cilovou stranku, newsletter/source-only registraci na horoskopy a default registraci do onboardingu; test zachytil a opravena byla race condition, kde legacy `auth:changed` listener prebil vypocitany redirect na `/profil.html`.
   - Stav navic: community API E2E pro `angel-post` a `subscribe/horoscope` uz netoleruje 404 u namountovanych routes; GET/list, validacni chyby, invalid like ID a horoscope subscribe payloady maji presnejsi ocekavani bez stareho fallbacku na prejmenovany endpoint.
   - Stav navic: profil E2E uz netoleruje 404 u existujici `/api/user/readings` route a overuje presnou 401 ochranu bez auth.
   - Stav navic: content E2E pro kontakt ted overuje realny submit formulare na `/api/contact` vcetne CSRF hlavicky a hlida, ze se nevrati stary alias `/api/contact/contact`; obsahove smoke testy cekaji jen na `domcontentloaded`, aby nepadaly na nedulezitem dobehu externich assetu.
   - Stav navic: SEO horoskop E2E uz u neplatneho znameni, spatneho data a prilis stareho data netoleruje 200/redirect fallbacky; vsechny tri validacni pripady musi vracet presne 404.
   - Stav navic: dynamicke SEO horoskopy maji strict ISO date validaci bez JS Date rolloveru; neplatne kalendarni datum typu `2026-02-31` vraci 404 a ma E2E regresni test.
   - Stav navic: navigation E2E uz u neexistujici HTML stranky a neexistujiciho API endpointu ocekava presne 404 misto volnych redirect/not-500 fallbacku.
   - Stav navic: community E2E uz nema `not 500` smoke pro `GET /api/angel-post`; cteni musi vracet 200 a XSS submit test uz netoleruje serverovou 500 odpoved.
   - Dalsi krok: pri vetsich zmenach auth/onboardingu pridat uz jen cilene smoke testy pro nove zdroje nebo nove aktivacni destinace.

## P3 - pozdeji

8. **Uklidit historicke audit dokumenty a worktree artefakty**
   - Stav: hotovo pro bezpecny uklid. Stare audit/report/setup dokumenty z korene jsou presunute do `docs/archive/2026-03-audits/`, koren ma zustat jen pro aktivni vstupni dokumenty. Tracked Python bytecode artefakty (`*.pyc`) byly odstranene z workspace a `.gitignore` doplnen o pytest docasne adresare.
   - Stav navic: z repa byly odstraneny tracked docasne vystupy `tmp_email_previews/*.html`, Python bytecode ze `social-media-agent/**/__pycache__/`, generovany `social-media-agent/output/posts/preview.js` a omylem verzovany `.claire/worktrees/...` placeholder; `.gitignore` ted ignoruje `tmp_email_previews/` i `.claire/`. Preview helper pro social post HTML se generuje automaticky v `post_saver.py`.
   - Stav navic: historicke root artefakty `branches.txt`, `encoding_issues_report.txt`, `COPY_PASTE_SQL.sql`, `GA-HTML-SNIPPET.html`, `GA4-IMPLEMENTATION-CODE.html` a `js_files.txt` jsou presunute do `docs/archive/2026-04-root-artifacts/`; encoding kontrola zapisuje novy report do ignorovaneho `tmp/`.
   - Stav navic: root utility skripty `fix_favicons.py`, `optimize-images.js` a `test_emails.js` jsou presunute do `scripts/`; email preview helper ma opraveny import po presunu a testovaci data uz negeneruji mojibake.
   - Stav navic: encoding kontrola ted skenuje aktivni HTML/JS/CSS/JSON/MD/MJS soubory mimo archiv a zachytila opravenou mojibake copy v post-auth aktivacnich toastech.
   - Stav navic: `npm run check:encoding` je soucasti `npm run test:verify` a CI test jobu, aby se mojibake nevracel mimo beznou validaci.
   - Stav navic: opravena byla poskozena registracni hlaska v `server/auth.js` s nahradnimi otazniky a encoding check ted hlida i tyto konkretni ceske zbytky.
   - Stav navic: encoding check skenuje i nove necommitnute soubory pres `git ls-files --cached --others --exclude-standard`, ne jen uz tracked soubory.
   - Stav navic: Claude hook validatory `scripts/validate-html.js` a `scripts/validate-sw-assets.js` uz bezi pod ESM modu projektu; predtim padaly na CommonJS `require(...)` jeste pred samotnou validaci.
   - Stav navic: `npm run check:hooks` smoke-testuje hook validatory pres JSON stdin a je zapojeny do `npm run test:verify`.
   - Stav navic: posledni aktivni `.js` utility s CommonJS `require(...)` byly prevedene na ESM; CommonJS zustava jen v explicitnim `.cjs` helperu a dokumentacnim `node -e` prikladu.
   - Stav navic: mrtvy `scheduleEmail(...)` stub s poznamkou na budouci integraci byl odstranen z `server/payment.js`; skutecne odlozene emaily uz resi `server/jobs/email-queue.js`.
   - Stav navic: generovane vystupy video/social helperu (`voiceover*.txt`, `thumbnail*.txt`, `evening*.txt` a jejich male state JSONy) jsou presunute do `scripts/output/`; samotny `scripts/` adresar ted drzi hlavne spustitelne helpery a konfigurace.
   - Stav navic: `daily_reel2.py` uz nema natvrdo osobni `C:/Users/pavel/...` cestu ke captions helperu; pouziva `CAPTIONS_TOOL` nebo vychozi cestu slozenou z domovskeho adresare.
   - Stav navic: `scripts/README.md` popisuje aktivni validacni/build helpery, social/video generatory, output adresar a pravidlo pro archivaci stale skriptu.
   - Stav navic: zastarale duplicitni sitemap helpery `scripts/generate_sitemap.js`, `scripts/generate-sitemap.js` a puvodni `server/scripts/generate-sitemap.js` jsou presunute do `docs/archive/2026-04-stale-scripts/`; aktivni ochrana sitemap zustava pres `npm run audit:site`.
   - Stav navic: manualni SQL snippet soubory jsou presunute do `server/scripts/sql/` s README; encoding kontrola ted zahrnuje i `.sql`, `.txt`, `.xml` a `.yml/.yaml` soubory.
   - Stav navic: stare jednorazove mojibake/content repair skripty jsou presunute do `docs/archive/2026-04-stale-scripts/encoding-repair-scripts/`, takze aktivni encoding check uz nepotrebuje souborove vyjimky a `server/scripts/` zustava pro aktualni provozni helpery.
   - Stav navic: `.gitattributes` definuje LF pro zdrojove textove soubory a binary pravidla pro assety, aby se omezil dalsi line-ending a binarni churn.
   - Stav navic: public JS uz nepise produkcni `console.log`; diagnostika v bootstrapu, premium gatech, tarotu, snari, natalni karte, mentorovi a share flow je pod `window.MH_DEBUG`/`console.debug` a staticky test hlida zdrojove i buildovane soubory mimo vendor.
   - Stav navic: `npm run audit:site` ted validuje i `manifest.json` ikony, chybici `img/icon-192.png` byl doplnen, precache seznam ho zahrnuje a duplicitni PNG-only PWA generator byl archivovan; aktivni generator je `npm run build:pwa-icons`.
   - Stav navic: stary `add-pwa-support.js` HTML patcher byl archivovan, protoze by dnes znovu vnasel inline service worker skript proti CSP smeru projektu; aktivni registrace bezi pres `js/dist/register-sw.js`.
   - Stav navic: browser-console `clear-sw-cache.js` snippet byl archivovan, aby `server/scripts/` nedrzel PWA dev pozustatky; cache verzi dnes resi `scripts/update-service-worker-cache.mjs`.
   - Stav navic: stare hromadne HTML/CSS/SEO/performance/image mutatory bez aktivnich referenci jsou presunute do `docs/archive/2026-04-stale-scripts/bulk-html-mutators/`; patri sem i puvodni cross-link mutator s inline handlery.
   - Stav navic: unsubscribe endpoint pro denni horoskopy uz nevraci falesny uspech pro neznamy nebo znovu pouzity token; po `update().eq('active', true).select().maybeSingle()` vraci 404, pokud token nic aktivniho neodhlasil. Vsechny unsubscribe HTML odpovedi pouzivaji sdileny CSP-safe renderer bez inline stylu.
   - Dalsi krok: pokud se budou generovat dalsi reporty, ukladat je rovnou do `docs/`, `tmp/` nebo mimo repo.

9. **Zavest automatizovane link/schema kontroly**
   - Stav: hotovo pro staticky audit. `npm run audit:site` kontroluje sitemap URL, canonical targety, sitemap/canonical soulad, validni JSON-LD a existenci lokalnich `href`/`src` targetu. Opravene byly broken linky na `shamansko-kolo.html`, obracene kompatibilitni odkazy a favicon reference.
   - Stav navic: CI pousti `npm run audit:site` a `npm run sitemap:check` spolu s unit testy; `npm run test:verify` sjednocuje lint, Jest, staticky audit a sitemap canonical check pro lokalni overeni.
   - Stav navic: audit ted kontroluje i `manifest.json` ikony a ignoruje lokalni `docs/`, `.agents/`, `.claire/` a `tmp/` artefakty, aby se validoval verejny web, ne archiv.
   - Stav navic: audit ted hlida i pokryti sitemapou: indexovatelne stranky s canonical URL na hlavni domene musi byt v `sitemap.xml`; `noindex` stranky jsou vynechane a zaroven nesmi byt sitemap targetem. Doplneny byly PL/SK stranky, testy a `ritualy/`.
   - Stav navic: kontrola lokalnich assetu zahrnuje i `poster` a `srcset`, nejen `href`/`src`.
   - Stav navic: sitemap audit validuje i povinna pole `lastmod`, `changefreq` a `priority`; `lastmod` kontroluje striktnim `YYYY-MM-DD` parserem, ne tolerantnim `Date.parse`.
   - Stav navic: audit kontroluje i `robots.txt` a ocekavany `Sitemap: https://www.mystickahvezda.cz/sitemap.xml` odkaz.
   - Stav navic: dynamicka horoskopova sitemap je sjednocena na canonical `www` originu, je vystavena v `robots.txt` jako `https://www.mystickahvezda.cz/horoskop/sitemap-horoscopes.xml` a ma regresni API test.
   - Stav navic: aktivni canonical/share/schema odkazy ve zdrojovych JS souborech, generatorech, `llms*.txt`, OpenAPI a author datech pouzivaji canonical `https://www.mystickahvezda.cz`; non-`www` zustava jen jako CORS fallback a regresni test.
   - Stav navic: `npm run audit:site` ted hlida i hardcodovane non-`www` originy v aktivnich public-facing zdrojich, s uzkou vyjimkou pro CORS fallback.
   - Stav navic: audit kontroluje i `og:image`/`twitter:image` meta targety a opravil rozbity rocni-horoskop OG obrazek na existujici asset.
   - Stav navic: audit hlida i duplicity canonical URL mezi indexovatelnymi strankami; samostatny hub `/horoskop/` ma vlastni canonical a sitemap entry misto kanonizace na `/horoskopy.html`.
   - Stav navic: `npm run sitemap:generate` vytvari review sitemap z indexovatelnych canonical HTML stranek, zachovava existujici `lastmod`/`changefreq`/`priority` metadata a `sitemap.xml` prepise jen pri explicitnim `-- --write`; `npm run sitemap:check` porovna aktualni sitemapu se canonical zdrojem pravdy.
   - Stav navic: security test pro contact form uz miri na skutecnou `/api/contact` route misto tolerantniho 404 fallbacku a server prestal logovat cele kontaktni emaily a zpravy.
   - Stav navic: verejny `js/kontakt.js` uz neposila formular na zastaraly `/api/contact/contact`, ale na skutecny `/api/contact` s CSRF tokenem; staticky test hlida zdrojovy i buildovany JS proti navratu stareho aliasu.
   - Stav navic: kontaktni formular ma opravene `label for` vazby na skutecna `id` poli a staticky test hlida vsechny produktove HTML labely proti neexistujicim targetum.
   - Stav navic: staticka HTML hygiene kontrola hlida i duplicitni `id` atributy v produktovych HTML souborech, aby se nerozbijely labely, anchor odkazy a selektory.
   - Dalsi krok: pozdeji lze doplnit live HTTP status check proti stagingu.
