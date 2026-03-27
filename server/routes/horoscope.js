/**
 * Horoscope Routes
 * GET/POST /api/horoscope
 * Includes daily/weekly/monthly horoscope with database caching
 */
import express from 'express';
import { optionalPremiumCheck } from '../middleware.js';
import { callClaude } from '../services/claude.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';
import { getHoroscopeCacheKey, getCachedHoroscope, saveCachedHoroscope } from '../services/astrology.js';

export const router = express.Router();

const VALID_ZODIAC_SIGNS = ['Beran', 'Býk', 'Blíženci', 'Rak', 'Lev', 'Panna', 'Váhy', 'Štír', 'Střelec', 'Kozoroh', 'Vodnář', 'Ryby'];

// Accusative (4th case) — used after "pro", "generuješ pro", etc.
const SIGN_ACCUSATIVE = {
    'Beran': 'Berana', 'Býk': 'Býka', 'Blíženci': 'Blížence', 'Rak': 'Raka',
    'Lev': 'Lva', 'Panna': 'Pannu', 'Váhy': 'Váhy', 'Štír': 'Štíra',
    'Střelec': 'Střelce', 'Kozoroh': 'Kozoroha', 'Vodnář': 'Vodnáře', 'Ryby': 'Ryby'
};

// Normalization map from SK/PL to CZ
const ZODIAC_NORMALIZATION = {
    // Slovak
    'Baran': 'Beran',
    'Škorpión': 'Štír',
    'Strelec': 'Střelec',
    'Kozorožec': 'Kozoroh',
    'Vodnár': 'Vodnář',
    // Polish
    'Byk': 'Býk',
    'Bliźnięta': 'Blíženci',
    'Lew': 'Lev',
    'Waga': 'Váhy',
    'Skorpion': 'Štír',
    'Strzelec': 'Střelec',
    'Koziorożec': 'Kozoroh',
    'Wodnik': 'Vodnář'
};

router.post('/', optionalPremiumCheck, async (req, res) => {
    try {
        let { sign, period = 'daily', context = [], lang = 'cs' } = req.body;

        // Try to normalize sign if it's not in the valid list
        if (sign && !VALID_ZODIAC_SIGNS.includes(sign)) {
            if (ZODIAC_NORMALIZATION[sign]) {
                sign = ZODIAC_NORMALIZATION[sign];
            }
        }

        if (!sign || !VALID_ZODIAC_SIGNS.includes(sign)) {
            return res.status(400).json({ success: false, error: 'Neplatné znamení zvěrokruhu.' });
        }

        if (!['daily', 'weekly', 'monthly'].includes(period)) {
            return res.status(400).json({ success: false, error: 'Neplatné období.' });
        }

        // Supported languages
        const supportedLangs = ['cs', 'sk', 'pl'];
        const targetLang = supportedLangs.includes(lang) ? lang : 'cs';

        // Language names for the prompt
        const langNames = { 'cs': 'česky', 'sk': 'slovensky', 'pl': 'polsky' };
        const langName = langNames[targetLang];

        // PREMIUM GATE: Free users can only access daily horoscope (bypass in dev)
        if (!req.isPremium && period !== 'daily' && process.env.NODE_ENV !== 'development') {
            const errorMsgs = {
                'cs': 'Týdenní a měsíční horoskopy jsou dostupné pouze pro Premium uživatele.',
                'sk': 'Týždenné a mesačné horoskopy sú dostupné iba pre Premium používateľov.',
                'pl': 'Horoskopy tygodniowe i miesięczne są dostępne tylko pro użytkowników Premium.'
            };
            return res.status(402).json({
                success: false,
                error: errorMsgs[targetLang],
                code: 'PREMIUM_REQUIRED',
                feature: 'horoscope_extended'
            });
        }

        // Generate cache key (include lang and context hash)
        const contextHash = Array.isArray(context) && context.length > 0
            ? Buffer.from(context.join('')).toString('base64').substring(0, 10)
            : 'nocontext';
        const cacheKey = `${getHoroscopeCacheKey(sign, period)}-${targetLang}-${contextHash}`;

        // Check database cache first
        const cachedData = await getCachedHoroscope(cacheKey);
        if (cachedData) {
            console.log(`📦 Horoscope Cache HIT: ${cacheKey}`);
            return res.json({
                success: true,
                response: cachedData.response,
                period: cachedData.period_label,
                cached: true
            });
        }

        console.log(`🔄 Horoscope Cache MISS: ${cacheKey} - Generating new for ${targetLang}...`);

        let periodPrompt;
        let periodLabel;
        let contextInstruction = '';

        // Labels mapping
        const labels = {
            'cs': { 'daily': 'Denní inspirace', 'weekly': 'Týdenní horoskop', 'monthly': 'Měsíční horoskop' },
            'sk': { 'daily': 'Denná inšpirácia', 'weekly': 'Týždenný horoskop', 'monthly': 'Mesačný horoskop' },
            'pl': { 'daily': 'Dzienna inspiracja', 'weekly': 'Horoskop tygodniowy', 'monthly': 'Horoskop miesięczny' }
        };

        periodLabel = labels[targetLang][period];

        if (context && Array.isArray(context) && context.length > 0) {
            const sanitized = context
                .slice(0, 5)
                .map(c => String(c).replace(/[\r\n\t]/g, ' ').substring(0, 300))
                .filter(c => c.trim().length > 0);

            if (sanitized.length > 0) {
                if (targetLang === 'sk') {
                    contextInstruction = `\nCONTEXT (Z užívateľovho denníka):\n"${sanitized.join('", "')}"\nINŠTRUKCIA PRE SYNERGIU: Ak je to relevantné, jemne a nepriamo nadväzuj na témy z denníka. Nehovor "V denníku vidím...", ale skôr "Hviezdy naznačujú posun v témach, ktoré ťa trápia...". Buď empatický.`;
                } else if (targetLang === 'pl') {
                    contextInstruction = `\nCONTEXT (Z dziennika użytkownika):\n"${sanitized.join('", "')}"\nINSTRUKCJA DLA SYNERGII: Jeśli to istotne, delikatnie i pośrednio nawiązuj do tematów z dziennika. Nie mów "Widzę w dzienniku...", ale raczej "Gwiazdy sugerują zmianę w tematach, które Cię martwią...". Bądź empatyczny.`;
                } else {
                    contextInstruction = `\nCONTEXT (Z uživatelova deníku):\n"${sanitized.join('", "')}"\nINSTRUKCE PRO SYNERGII: Pokud je to relevantní, jemně a nepřímo nawazuj na témata z deníku. Neříkej "V deníku vidím...", ale spíše "Hvězdy naznačují posun v tématech, která tě trápí...". Buď empatický.`;
                }
            }
        }

        const signAcc = SIGN_ACCUSATIVE[sign] || sign;

        const dateLocales = { 'cs': 'cs-CZ', 'sk': 'sk-SK', 'pl': 'pl-PL' };
        const today = new Date();
        const dateStr = today.toLocaleDateString(dateLocales[targetLang]);

        if (period === 'weekly') {
            periodPrompt = `Jsi inspirativní astrologický průvodce. Generuješ týdenní horoskop pro ${signAcc} na týden začínající ${dateStr}.\nOdpověď MUSÍ být validní JSON objekt bez markdown formátování (žádné \`\`\`json).\nStruktura:\n{\n  "prediction": "Text horoskopu (5-6 vět) specifický pro ${signAcc}. Zaměř se na hlavní energii, lásku, kariéru a jednu výzvu charakteristickou pro toto znamení.",\n  "affirmation": "Osobní týdenní mantra — silná, poetická, specifická pro ${signAcc}, jeho element a vládnoucí planetu. 15–25 slov, první osoba, přítomný čas. Nesmí být generická ani klišovitá. Příklad tónu: 'Má odvaha tvoří mosty tam, kde ostatní vidí propasti.'",\n  "luckyNumbers": [číslo1, číslo2, číslo3, číslo4]\n}\nText piš ${langName}, poeticky a povzbudivě.${contextInstruction}`;
        } else if (period === 'monthly') {
            periodPrompt = `Jsi moudrý astrologický průvodce. Generuješ měsíční horoskop pro ${signAcc} na aktuální měsíc (datum: ${dateStr}).\nOdpověď MUSÍ být validní JSON objekt bez markdown formátování (žádné \`\`\`json).\nStruktura:\n{\n  "prediction": "Text horoskopu (7-8 vět) specifický pro ${signAcc}. Zahrň úvod, lásku, kariéru, zdraví a klíčová data s ohledem na charakter tohoto znamení.",\n  "affirmation": "Hluboká měsíční mantra — specifická pro ${signAcc} a jeho transformační energii v tomto měsíci. 20–30 slov, první osoba, přítomný čas. Poetická, osobní, bez klišé. Příklad tónu: 'Jsem průkopníkem ticha — v hloubce svého bytí nacházím sílu, která přetváří svět.'",\n  "luckyNumbers": [číslo1, číslo2, číslo3, číslo4]\n}\nText piš ${langName}, inspirativně a hluboce.${contextInstruction}`;
        } else {
            periodPrompt = `Jsi laskavý astrologický průvodce. Generuješ denní horoskop pro ${signAcc} na den ${dateStr}.\nOdpověď MUSÍ být validní JSON objekt bez markdown formátování (žádné \`\`\`json).\nStruktura:\n{\n  "prediction": "Text horoskopu (3-4 věty) specifický pro ${signAcc}. Hlavní energie dne a jedna konkrétní rada vycházející z vlastností tohoto znamení.",\n  "affirmation": "Osobní denní mantra — silná, poetická, specifická pro ${signAcc} a jeho element. 15–25 slov, první osoba, přítomný čas. Nesmí být generická ani klišovitá. Příklad tónu: 'Má intuice je dnes mým nejostřejším nástrojem — naslouchám jí a jednám.'",\n  "luckyNumbers": [číslo1, číslo2, číslo3, číslo4]\n}\nText piš ${langName}, poeticky a povzbudivě.${contextInstruction}`;
        }

        const message = `Vygeneruj horoskop pro znamení ${sign} na ${dateStr}.`;

        const response = await callClaude(periodPrompt, message);

        // Strip markdown code fences if model wraps JSON in ```json ... ```
        const cleanResponse = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

        // Save to DB cache (non-blocking — don't let DB errors kill the response)
        saveCachedHoroscope(cacheKey, sign, period, cleanResponse, periodLabel)
            .then(() => console.log(`💾 Horoscope cached in DB: ${cacheKey}`))
            .catch(err => console.warn(`[HOROSCOPE] Cache save failed (non-fatal):`, err.message));

        res.json({ success: true, response: cleanResponse, period: periodLabel });

    } catch (error) {
        console.error('[HOROSCOPE] Claude Error:', error.message || error);

        // Fallback: return a static horoscope so users aren't left with empty page
        const { sign: bodySign, lang: bodyLang = 'cs' } = req.body || {};
        const signName = bodySign || 'neznámé znamení';
        const supportedLangs = ['cs', 'sk', 'pl'];
        const fallbackTargetLang = supportedLangs.includes(bodyLang) ? bodyLang : 'cs';

        // Unique sign-specific fallback content per language — varied opening styles
        const SIGN_FALLBACKS = {
            'Beran': {
                cs: { prediction: 'Cítíte ten neklid? To není náhoda — dnes je den, kdy se rodí nové začátky. Energie ohně ve vás plane silněji než obvykle a každé váhání je jen ztráta času. Udělejte ten krok, který odkládáte. Právě teď je ta správná chvíle.', affirmation: 'Moje odvaha otevírá dveře, které ostatní považují za zavřené.' },
                sk: { prediction: 'Cítite ten nepokoj? To nie je náhoda — dnes je deň, keď sa rodia nové začiatky. Energia ohňa vo vás planie silnejšie ako zvyčajne a každé váhanie je len strata času. Urobte ten krok, ktorý odkladáte. Práve teraz je tá správna chvíľa.', affirmation: 'Moja odvaha otvára dvere, ktoré ostatní považujú za zatvorené.' },
                pl: { prediction: 'Czujecie ten niepokój? To nie przypadek — dziś jest dzień, w którym rodzą się nowe początki. Energia ognia płonie w was silniej niż zwykle, a każde wahanie to tylko strata czasu. Zróbcie ten krok, który odkładacie. Właśnie teraz jest odpowiedni moment.', affirmation: 'Moja odwaga otwiera drzwi, które inni uważają za zamknięte.' },
            },
            'Býk': {
                cs: { prediction: 'Dnes je den, kdy se vyplatí zpomalit. Všimněte si vůně kávy, teplého světla za oknem, textury dřeva pod prsty. V těchto drobnostech se dnes skrývá víc odpovědí než v jakémkoliv spěchu. Stavějte pomalu, stavějte poctivě — to, co budujete, vydrží.', affirmation: 'Moje trpělivost a pevnost jsou základy, na nichž roste všechno krásné.' },
                sk: { prediction: 'Dnes je deň, keď sa oplatí spomaliť. Všimnite si vône kávy, teplého svetla za oknom, textúry dreva pod prstami. V týchto maličkostiach sa dnes skrýva viac odpovedí ako v akomkoľvek zhone. Stavajte pomaly, stavajte poctivo — to, čo budujete, vydrží.', affirmation: 'Moja trpezlivosť a pevnosť sú základy, na ktorých rastie všetko krásne.' },
                pl: { prediction: 'Dziś jest dzień, w którym warto zwolnić. Zauważcie zapach kawy, ciepłe światło za oknem, fakturę drewna pod palcami. W tych drobiazgach dziś kryje się więcej odpowiedzi niż w jakimkolwiek pośpiechu. Budujcie powoli, budujcie uczciwie — to, co tworzycie, przetrwa.', affirmation: 'Moja cierpliwość i wytrwałość są fundamentem, na którym rośnie wszystko piękne.' },
            },
            'Blíženci': {
                cs: { prediction: 'Někdo vám dnes řekne větu, která změní váš pohled na věc, o které jste přemýšleli celý týden. Buďte pozorní — ten rozhovor může přijít odkudkoliv: z náhodného setkání, zprávy od přítele, nebo řádky v knize. Vaše slova mají dnes zvláštní sílu — používejte je moudře.', affirmation: 'Moje zvídavost přináší odpovědi dřív, než si ostatní položí otázku.' },
                sk: { prediction: 'Niekto vám dnes povie vetu, ktorá zmení váš pohľad na vec, o ktorej ste premýšľali celý týždeň. Buďte pozorní — ten rozhovor môže prísť odkiaľkoľvek: z náhodného stretnutia, správy od priateľa alebo riadku v knihe. Vaše slová majú dnes zvláštnu silu — používajte ich múdro.', affirmation: 'Moja zvedavosť prináša odpovede skôr, ako si ostatní položia otázku.' },
                pl: { prediction: 'Ktoś wam dziś powie zdanie, które zmieni wasze spojrzenie na sprawę, o której myśleliście cały tydzień. Bądźcie uważni — ta rozmowa może nadejść zewsząd: ze spotkania, wiadomości od przyjaciela albo linijki w książce. Wasze słowa mają dziś szczególną moc — używajcie ich mądrze.', affirmation: 'Moja ciekawość przynosi odpowiedzi zanim inni zdążą zadać pytanie.' },
            },
            'Rak': {
                cs: { prediction: 'Zavřete na chvíli oči a zeptejte se sami sebe: co právě teď potřebuji? Ne co chtějí ostatní, ne co se sluší — co potřebujete vy. Dnes je vaše citlivost superschopností, ne slabostí. Srdce vám šeptá odpověď, kterou rozum ještě neslyší.', affirmation: 'Moje intuice je most mezi tím, co je, a tím, co být má.' },
                sk: { prediction: 'Zavrite na chvíľu oči a opýtajte sa sami seba: čo práve teraz potrebujem? Nie čo chcú ostatní, nie čo sa patrí — čo potrebujete vy. Dnes je vaša citlivosť superschopnosťou, nie slabosťou. Srdce vám šepká odpoveď, ktorú rozum ešte nepočul.', affirmation: 'Moja intuícia je most medzi tým, čo je, a tým, čo byť má.' },
                pl: { prediction: 'Zamknijcie na chwilę oczy i zapytajcie sami siebie: czego teraz naprawdę potrzebuję? Nie czego chcą inni, nie co wypada — czego potrzebujecie wy. Dziś wasza wrażliwość jest supermocą, nie słabością. Serce szepcze wam odpowiedź, której rozum jeszcze nie słyszy.', affirmation: 'Moja intuicja jest mostem między tym, co jest, a tym, co być powinno.' },
            },
            'Lev': {
                cs: { prediction: 'Scéna je připravena a reflektory jsou namířené přesně na vás. Ne proto, že byste o to museli prosit, ale proto, že to tak má být. Kreativní energie ve vás dnes hledá ventil — malujte, mluvte, tvořte, tančete. Cokoliv, co je autenticky vaše, dnes zazáří.', affirmation: 'Moje světlo neubírá světlo ostatním — naopak je rozsvěcuje.' },
                sk: { prediction: 'Scéna je pripravená a reflektory sú namierené presne na vás. Nie preto, že by ste o to museli prosiť, ale preto, že to tak má byť. Kreatívna energia vo vás dnes hľadá ventil — maľujte, hovorte, tvorte, tancujte. Čokoľvek, čo je autenticky vaše, dnes zažiari.', affirmation: 'Moje svetlo neubíja svetlo ostatných — naopak ho rozsvecuje.' },
                pl: { prediction: 'Scena jest gotowa, a reflektory skierowane dokładnie na was. Nie dlatego, że musieliście o to prosić, ale dlatego, że tak ma być. Twórcza energia szuka dziś w was ujścia — malujcie, mówcie, twórzcie, tańczcie. Cokolwiek jest autentycznie wasze, dziś zabłyśnie.', affirmation: 'Moje światło nie odbiera światła innym — wręcz przeciwnie, je rozpala.' },
            },
            'Panna': {
                cs: { prediction: 'Tam, kde ostatní vidí chaos, vy vidíte vzorce. A dnes jsou ty vzorce obzvlášť zřetelné. Je čas uklidit — ne jen na stole, ale i v hlavě. Roztřiďte priority, odhoďte zbytečné a soustřeďte se na to, co si zaslouží vaši preciznost. Přesnost se dnes vyplatí víc než rychlost.', affirmation: 'Moje pozornost k detailům tvoří dokonalost z obyčejných okamžiků.' },
                sk: { prediction: 'Tam, kde ostatní vidia chaos, vy vidíte vzorce. A dnes sú tie vzorce obzvlášť zreteľné. Je čas upratať — nielen na stole, ale aj v hlave. Roztrieďte priority, odhoďte zbytočné a sústreďte sa na to, čo si zaslúži vašu precíznosť. Presnosť sa dnes vyplatí viac ako rýchlosť.', affirmation: 'Moja pozornosť k detailom tvorí dokonalosť z obyčajných okamihov.' },
                pl: { prediction: 'Tam, gdzie inni widzą chaos, wy widzicie wzorce. A dziś te wzorce są wyjątkowo wyraźne. Czas posprzątać — nie tylko na biurku, ale i w głowie. Posortujcie priorytety, odrzućcie zbędne i skupcie się na tym, co zasługuje na waszą precyzję. Dziś dokładność opłaca się bardziej niż szybkość.', affirmation: 'Moja dbałość o szczegóły tworzy doskonałość z zwykłych chwil.' },
            },
            'Váhy': {
                cs: { prediction: 'Vztah, který vás v poslední době zaměstnává, dnes dostane nový impuls. Klíč neleží v tom, kdo má pravdu, ale v tom, co chcete oba. Vaše diplomacie je dar — dokáže proměnit napětí v dialog a konflikt v dohodu. Hledejte harmonii, ne kompromis.', affirmation: 'Moje schopnost nacházet rovnováhu přináší mír tam, kde vládl svár.' },
                sk: { prediction: 'Vzťah, ktorý vás v poslednej dobe zamestnáva, dnes dostane nový impulz. Kľúč neleží v tom, kto má pravdu, ale v tom, čo chcete obaja. Vaša diplomacia je dar — dokáže premeniť napätie na dialóg a konflikt na dohodu. Hľadajte harmóniu, nie kompromis.', affirmation: 'Moja schopnosť nachádzať rovnováhu prináša mier tam, kde vládol svár.' },
                pl: { prediction: 'Relacja, która was ostatnio zajmuje, dziś dostanie nowy impuls. Klucz nie leży w tym, kto ma rację, ale w tym, czego chcecie oboje. Wasza dyplomacja jest darem — potrafi przemienić napięcie w dialog, a konflikt w porozumienie. Szukajcie harmonii, nie kompromisu.', affirmation: 'Moja zdolność do znajdowania równowagi przynosi pokój tam, gdzie panował spór.' },
            },
            'Štír': {
                cs: { prediction: 'Pod povrchem se něco hýbe. Vy to cítíte — ten tichý, ale nezastavitelný proud transformace, který mění pravidla hry. Dnes je čas podívat se pravdě do očí a pustit to, co vás brzdí. Nebojte se hloubky. Právě tam nacházíte svou největší sílu.', affirmation: 'Moje síla roste v každé proměně, kterou odvážně přijmu.' },
                sk: { prediction: 'Pod povrchom sa niečo hýbe. Vy to cítite — ten tichý, ale nezastaviteľný prúd transformácie, ktorý mení pravidlá hry. Dnes je čas pozrieť sa pravde do očí a pustiť to, čo vás brzdí. Nebojte sa hĺbky. Práve tam nachádzate svoju najväčšiu silu.', affirmation: 'Moja sila rastie v každej premene, ktorú odvážne prijmem.' },
                pl: { prediction: 'Pod powierzchnią coś się rusza. Wy to czujecie — ten cichy, ale niepohamowany nurt transformacji, który zmienia reguły gry. Dziś czas spojrzeć prawdzie w oczy i puścić to, co was hamuje. Nie bójcie się głębi. Właśnie tam znajdujecie swoją największą siłę.', affirmation: 'Moja siła rośnie w każdej przemianie, którą odważnie przyjmuję.' },
            },
            'Střelec': {
                cs: { prediction: 'Obzor se dnes rozšiřuje — a s ním i vaše možnosti. Možná to bude nečekaný nápad, pozvánka, nebo prostě pocit, že je čas vykročit za hranice známého. Nechte se vést zvědavostí, ne strachem. Příležitost, která na vás čeká, je větší, než si zatím dovedete představit.', affirmation: 'Moje svoboda začíná tam, kde přestávám pochybovat o vlastním směru.' },
                sk: { prediction: 'Obzor sa dnes rozširuje — a s ním aj vaše možnosti. Možno to bude nečakaný nápad, pozvánka, alebo jednoducho pocit, že je čas vykročiť za hranice známeho. Nechajte sa viesť zvedavosťou, nie strachom. Príležitosť, ktorá na vás čaká, je väčšia, ako si zatiaľ viete predstaviť.', affirmation: 'Moja sloboda začína tam, kde prestávam pochybovať o vlastnom smere.' },
                pl: { prediction: 'Horyzont się dziś rozszerza — a wraz z nim wasze możliwości. Może to będzie niespodziewany pomysł, zaproszenie, albo po prostu uczucie, że czas wykroczyć poza granice znanego. Dajcie się prowadzić ciekawości, nie strachowi. Szansa, która na was czeka, jest większa, niż potraficie sobie wyobrazić.', affirmation: 'Moja wolność zaczyna się tam, gdzie przestaję wątpić we własny kierunek.' },
            },
            'Kozoroh': {
                cs: { prediction: 'Každý malý krok, který dnes uděláte, pokládá základní kámen něčeho většího. Možná to zatím nevidíte — ale hvězdy ano. Vaše disciplína není nuda, je to superschopnost. Svět odměňuje ty, kdo vytrvají, i když výsledky nejsou okamžitě viditelné. A vy to víte líp než kdokoliv jiný.', affirmation: 'Moje vytrvalost buduje to, co žádná zkratka nikdy přinést nemůže.' },
                sk: { prediction: 'Každý malý krok, ktorý dnes urobíte, kladie základný kameň niečoho väčšieho. Možno to zatiaľ nevidíte — ale hviezdy áno. Vaša disciplína nie je nuda, je to superschopnosť. Svet odmeňuje tých, ktorí vytrvajú, aj keď výsledky nie sú okamžite viditeľné. A vy to viete lepšie ako ktokoľvek iný.', affirmation: 'Moja vytrvalosť buduje to, čo žiadna skratka nikdy priniesť nemôže.' },
                pl: { prediction: 'Każdy mały krok, który dziś zrobicie, kładzie kamień węgielny czegoś większego. Może tego jeszcze nie widzicie — ale gwiazdy tak. Wasza dyscyplina to nie nuda, to supermoce. Świat nagradza tych, którzy wytrwają, nawet gdy wyniki nie są natychmiast widoczne. A wy to wiecie lepiej niż ktokolwiek inny.', affirmation: 'Moja wytrwałość buduje to, czego żaden skrót nigdy przynieść nie może.' },
            },
            'Vodnář': {
                cs: { prediction: 'Co kdybys dnes udělal přesný opak toho, co se od tebe čeká? Ne ze vzdoru — z vize. Svět potřebuje lidi, kteří myslí jinak, a dnes jsi přesně takový člověk. Jedno nekonvenční rozhodnutí může změnit mnohem víc, než tušíš. Důvěřuj svým nejdivočejším nápadům.', affirmation: 'Moje vize budoucnosti je dar, který sdílím se světem bez omluv.' },
                sk: { prediction: 'Čo keby si dnes urobil presný opak toho, čo sa od teba čaká? Nie zo vzdoru — z vízie. Svet potrebuje ľudí, ktorí myslia inak, a dnes si presne taký človek. Jedno nekonvenčné rozhodnutie môže zmeniť oveľa viac, ako tušíš. Dôveruj svojim najdivokejším nápadom.', affirmation: 'Moja vízia budúcnosti je dar, ktorý zdieľam so svetom bez ospravedlnení.' },
                pl: { prediction: 'A gdybyś dziś zrobił dokładnie odwrotność tego, czego się od ciebie oczekuje? Nie z przekory — z wizji. Świat potrzebuje ludzi, którzy myślą inaczej, a dziś jesteś dokładnie takim człowiekiem. Jedna niekonwencjonalna decyzja może zmienić o wiele więcej, niż przypuszczasz. Zaufaj swoim najdzikszym pomysłom.', affirmation: 'Moja wizja przyszłości jest darem, którym dzielę się ze światem bez przeprosin.' },
            },
            'Ryby': {
                cs: { prediction: 'Ten sen, co se vám zdál — nebo ta myšlenka, co přišla těsně před usnutím — v sobě nese víc pravdy, než si myslíte. Dnes jste obzvlášť citliví na jemné proudy kolem sebe. Použijte tuto vnímavost jako dar, ne jako zátěž. Nechte se vést pocity — dnes jsou přesnějším kompasem než jakákoliv logika.', affirmation: 'Moje empatie je síla, která léčí mě i ty, kdo jsou mi blízcí.' },
                sk: { prediction: 'Ten sen, čo sa vám sníval — alebo tá myšlienka, čo prišla tesne pred zaspávaním — v sebe nesie viac pravdy, ako si myslíte. Dnes ste obzvlášť citliví na jemné prúdy okolo seba. Použite túto vnímavosť ako dar, nie ako záťaž. Nechajte sa viesť pocitmi — dnes sú presnejším kompasom ako akákoľvek logika.', affirmation: 'Moja empatia je sila, ktorá lieči mňa aj tých, ktorí sú mi blízki.' },
                pl: { prediction: 'Ten sen, który wam się przyśnił — albo ta myśl, która przyszła tuż przed zaśnięciem — niesie w sobie więcej prawdy, niż myślicie. Dziś jesteście wyjątkowo wrażliwi na subtelne prądy wokół siebie. Użyjcie tej wrażliwości jako daru, nie jako ciężaru. Dajcie się prowadzić uczuciom — dziś są pewniejszym kompasem niż jakakolwiek logika.', affirmation: 'Moja empatia jest siłą, która leczy mnie i tych, którzy są mi bliscy.' },
            },
        };

        // Normalize signName to Czech key (Slovak/Polish signs may come in original form)
        const SIGN_NORMALIZATION_FALLBACK = {
            'Baran': 'Beran', 'Škorpión': 'Štír', 'Strelec': 'Střelec',
            'Kozorožec': 'Kozoroh', 'Vodnár': 'Vodnář',
        };
        const signKey = SIGN_NORMALIZATION_FALLBACK[signName] || signName;
        const signData = SIGN_FALLBACKS[signKey] || SIGN_FALLBACKS['Beran'];
        const fb = signData[fallbackTargetLang] || signData['cs'];

        const luckyNumbers = Array.from({ length: 4 }, () => Math.floor(Math.random() * 49) + 1);
        const labels = {
            'cs': { 'daily': 'Denní inspirace', 'weekly': 'Týdenní horoskop', 'monthly': 'Měsíční horoskop' },
            'sk': { 'daily': 'Denná inšpirácia', 'weekly': 'Týždenný horoskop', 'monthly': 'Mesačný horoskop' },
            'pl': { 'daily': 'Dzienna inspiracja', 'weekly': 'Horoskop tygodniowy', 'monthly': 'Horoskop miesięczny' }
        };
        const fallbackPeriodLabel = labels[fallbackTargetLang]?.daily || 'Denní inspirace';

        const fallbackResponse = JSON.stringify({
            prediction: fb.prediction,
            affirmation: fb.affirmation,
            luckyNumbers: luckyNumbers
        });

        res.json({
            success: true,
            response: fallbackResponse,
            period: fallbackPeriodLabel,
            fallback: true
        });
    }
});

export default router;
