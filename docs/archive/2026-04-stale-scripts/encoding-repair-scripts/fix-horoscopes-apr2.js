#!/usr/bin/env node
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { config } from 'dotenv';
config({ path: path.join(__dirname, '../.env') });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const corrected = [
    {
        key: 'beran_daily_2026-04-02_v3-cs-nocontext',
        sign: 'Beran',
        data: {
            prediction: "Dnes tvá vládnoucí planeta Mars probouzí touhu po novém začátku. Je ideální čas zasadit semínka změn, které chceš vidět rozkvétat. Důvěřuj své intuici při důležitých rozhodnutích — vesmír ti šeptá odpovědi, které tvé srdce už zná.",
            affirmation: "Jsem průkopníkem své vlastní cesty — odvaha je mým kompasem",
            luckyNumbers: [9, 18, 27, 36]
        }
    },
    {
        key: 'byk_daily_2026-04-02_v3-cs-nocontext',
        sign: 'Býk',
        data: {
            prediction: "Venuše prochází harmonickým aspektem s Jupiterem, což otevírá dveře k novým příležitostem ve financích a vztazích. Tento duben tě vybízí, abys důvěřoval své intuici při rozhodování o hmotných záležitostech. Tvůj přirozený smysl pro krásu a harmonii tě povede ke správným volbám. Je čas zasadit semínka budoucí hojnosti.",
            affirmation: "Jsem zakořeněn v přítomnosti a otevřen hojnosti vesmíru",
            luckyNumbers: [6, 15, 24, 33]
        }
    },
    {
        key: 'blizenci_daily_2026-04-02_v3-cs-nocontext',
        sign: 'Blíženci',
        data: {
            prediction: "Merkur vstupuje do harmonického aspektu s Jupiterem, což přináší vlnu optimismu a nových příležitostí v komunikaci. Je to ideální den pro zahájení důležitých rozhovorů, podepsání smluv nebo vyjádření svých nápadů světu. Tvá přirozená zvídavost tě povede k zajímavému setkání, které může změnit tvůj pohled na věci. Důvěřuj své intuici a neboj se být autentický.",
            affirmation: "Nové možnosti přicházejí a vesmír mě vede správným směrem",
            luckyNumbers: [3, 7, 12, 21]
        }
    },
    {
        key: 'rak_daily_2026-04-02_v3-cs-nocontext',
        sign: 'Rak',
        data: {
            prediction: "Venuše v tvém sektoru komunikace otevírá brány k hlubokým a léčivým rozhovorům. Je čas nechat proudit city slovy — neboj se vyjádřit něžnost vůči těm, které miluješ. Měsíc v harmonickém aspektu s Neptunem ti šeptá, že intuice je tvým největším průvodcem. Důvěřuj svému vnitřnímu hlasu a věnuj čas kreativním činnostem, které hojí tvou duši.",
            affirmation: "Má citlivost je mou silou a má intuice mě vede správnou cestou",
            luckyNumbers: [2, 7, 13, 29]
        }
    },
    {
        key: 'lev_daily_2026-04-02_v3-cs-nocontext',
        sign: 'Lev',
        data: {
            prediction: "Jupiter v harmonickém aspektu s tvým ohňovým znamením otevírá dveře novým příležitostem v oblasti kreativity. Mars ve Vodnáři tě povzbuzuje, abys sdílel své nápady s druhými — spolupráce přinese překvapivé výsledky. Věnuj pozornost ranním hodinám, kdy budeš obzvláště intuitivní a schopný vidět skryté možnosti. Tvá přirozená velkorysost dnes přitáhne do tvého života lidi, kteří oceňují tvou autentičnost.",
            affirmation: "Zářím mým vnitřním světlem a přitahuji hojnost",
            luckyNumbers: [7, 14, 23, 31]
        }
    },
    {
        key: 'panna_daily_2026-04-02_v3-cs-nocontext',
        sign: 'Panna',
        data: {
            prediction: "Merkur, tvůj vládnoucí planet, tě dnes povzbuzuje k jasné komunikaci a praktickým řešením. Je ideální čas pro organizaci svého prostoru i myšlenek. Drobné detaily, které možná unikaly pozornosti, ti nyní odhalí cestu k důležitému poznání. Důvěřuj své schopnosti analyzovat situace a najít harmonii v každodenních rituálech.",
            affirmation: "Jsem v souladu s přirozeným řádem věcí a moje kroky vedou k dokonalosti",
            luckyNumbers: [5, 14, 23, 32]
        }
    },
    {
        key: 'vahy_daily_2026-04-02_v3-cs-nocontext',
        sign: 'Váhy',
        data: {
            prediction: "Tento den přináší harmonii do tvých vztahů a touhu po kráse ve všech jejích formách. Merkur ve vzdušném znamení podporuje tvou komunikační schopnost — je ideální čas pro důležité rozhovory nebo kreativní projekty. Důvěřuj své intuici při rozhodování, zvláště pokud jde o partnerství nebo spolupráci. Večer si věnuj chvíli klidu a umělecké tvorby.",
            affirmation: "Jsem v rovnováze se sebou i světem kolem mě",
            luckyNumbers: [6, 15, 24, 33]
        }
    },
    {
        key: 'stir_daily_2026-04-02_v3-cs-nocontext',
        sign: 'Štír',
        data: {
            prediction: "Dnes Mars ve tvém znamení podněcuje tvou vnitřní sílu k transformaci. Energie kolem tebe je intenzivní — ideální pro završení projektů, které dlouho čekaly na dokončení. Věnuj pozornost intimním vztahům, upřímná komunikace otevře dveře k hlubšímu porozumění. Tvá intuice je dnes obzvlášť ostrá, důvěřuj jí.",
            affirmation: "Moje síla spočívá v odvaze transformovat se a růst",
            luckyNumbers: [8, 11, 17, 23]
        }
    },
    {
        key: 'strelec_daily_2026-04-02_v3-cs-nocontext',
        sign: 'Střelec',
        data: {
            prediction: "Střelče, tento den ti hvězdy přinášejí touhu po duchovním růstu a poznání hlubších pravd. Merkur v harmonickém aspektu s Jupiterem, tvou vládnoucí planetou, otevírá brány intuitivního porozumění a přináší inspirativní setkání. Je čas naslouchat svému vnitřnímu hlasu a důvěřovat cestě, která se před tebou rozevírá. Tvá optimistická energie přitahuje příležitosti k expanzi a svobodě.",
            affirmation: "Důvěřuji moudrosti vesmíru a kráčím svou cestou s odvahou",
            luckyNumbers: [3, 9, 12, 21]
        }
    },
    {
        key: 'kozoroh_daily_2026-04-02_v3-cs-nocontext',
        sign: 'Kozoroh',
        data: {
            prediction: "Dnes Mars spojuje svou sílu s energií nového jarního cyklu, Kozorože. Je čas realizovat své dlouhodobé plány s odhodláním, které je ti vlastní. Venuše v harmonickém aspektu ti přináší příjemná setkání v oblasti vztahů a financí. Důvěřuj své vnitřní moudrosti a neboj se učinit ten důležitý krok vpřed.",
            affirmation: "Moje vytrvalost mě vede k úspěchu a naplnění",
            luckyNumbers: [4, 8, 13, 26]
        }
    },
    {
        key: 'vodnar_daily_2026-04-02_v3-cs-nocontext',
        sign: 'Vodnář',
        data: {
            prediction: "Duben tě láká k propojení svých vizí s každodenní realitou. Merkur v souladu s tvým znamením otevírá brány k inspirativním rozhovorům a nečekaným setkáním. Důvěřuj své intuici při volbě nových projektů — hvězdy podporují odvážné myšlenky, které mohou změnit tvůj směr. Dej prostor své kreativitě a nezapomínej na chvíle ticha, kde se rodí tvé nejcennější nápady.",
            affirmation: "Jsem průvodcem vlastní budoucnosti a důvěřuji svým jedinečným vizím",
            luckyNumbers: [7, 11, 23, 41]
        }
    },
    {
        key: 'ryby_daily_2026-04-02_v3-cs-nocontext',
        sign: 'Ryby',
        data: {
            prediction: "Dnešní den tě naplní tvůrčí energií a intuitivními vhledy. Venuše v tvém sektoru snů zesiluje tvou přirozenou citlivost — důvěřuj svým vnitřním pocitům, vedou tě správným směrem. Je ideální čas pro meditaci, umělecké projekty nebo hluboké rozhovory s blízkými. Tvůj soucit a empatie mohou dnes někomu přinést úlevu.",
            affirmation: "Důvěřuji proudu života a nechávám svou intuici být mým kompasem",
            luckyNumbers: [7, 12, 21, 33]
        }
    }
];

let ok = 0;
for (const h of corrected) {
    const { error } = await supabase.from('cache_horoscopes').upsert({
        cache_key: h.key,
        sign: h.sign,
        period: 'daily',
        response: JSON.stringify(h.data),
        period_label: 'Denní inspirace',
        generated_at: new Date().toISOString()
    }, { onConflict: 'cache_key' });

    if (error) {
        console.error(`❌ ${h.sign}: ${error.message}`);
    } else {
        console.log(`✅ ${h.sign}`);
        ok++;
    }
}
console.log(`\nHotovo: ${ok}/${corrected.length}`);
