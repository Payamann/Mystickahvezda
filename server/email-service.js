import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { isProductionRuntime } from './config/runtime.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

let resend = null;
const DEFAULT_FROM_EMAIL = 'noreply@mystickahvezda.cz';
const DEFAULT_BRAND_NAME = 'Mysticka Hvezda';
const FROM_EMAIL = formatFromEmail(process.env.FROM_EMAIL || DEFAULT_FROM_EMAIL);
const REPLY_TO_EMAIL = sanitizeHeaderValue(process.env.REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL || '');
const APP_URL = process.env.APP_URL || 'https://www.mystickahvezda.cz';

// Validate email configuration on startup
if (!process.env.FROM_EMAIL && isProductionRuntime()) {
  console.warn('⚠️ WARNING: FROM_EMAIL not set in environment variables. Using fallback.');
}

// Lazy-load Resend to avoid errors if API key is missing
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

function sanitizeHeaderValue(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function formatFromEmail(value) {
  const cleaned = sanitizeHeaderValue(value);
  if (!cleaned) return `${DEFAULT_BRAND_NAME} <${DEFAULT_FROM_EMAIL}>`;
  if (/^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(cleaned)) {
    return `${DEFAULT_BRAND_NAME} <${cleaned}>`;
  }
  return cleaned;
}

function sanitizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [sanitizeHeaderValue(key), sanitizeHeaderValue(value)])
      .filter(([key, value]) => key && value)
  );
}

function toAbsoluteUrl(url) {
  const cleaned = sanitizeHeaderValue(url);
  if (!cleaned) return '';
  try {
    return new URL(cleaned, APP_URL).toString();
  } catch {
    return '';
  }
}

function buildListUnsubscribeUrl(template, data = {}, explicitUrl = '') {
  if (explicitUrl) return toAbsoluteUrl(explicitUrl);
  if ((template === 'daily_horoscope' || template === 'horoscope_subscription_confirm') && data.token) {
    return toAbsoluteUrl(`/api/subscribe/horoscope/unsubscribe?token=${encodeURIComponent(data.token)}`);
  }
  return '';
}

function buildEmailHeaders({ template, data = {}, headers = {}, unsubscribeUrl = '' }) {
  const baseHeaders = {};
  const listUnsubscribeUrl = buildListUnsubscribeUrl(template, data, unsubscribeUrl);

  if (listUnsubscribeUrl) {
    baseHeaders['List-Unsubscribe'] = `<${listUnsubscribeUrl}>`;
  }

  return {
    ...baseHeaders,
    ...sanitizeHeaders(headers)
  };
}

export function htmlToPlainText(html = '') {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<\/(?:p|div|h[1-6]|li|tr|table|section)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rarr;/g, '→')
    .replace(/&hellip;/g, '…')
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 15000);
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTextContent(value = '') {
  const safeText = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '');

  const paragraphs = safeText
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return '<p>Dnesni vedeni se pripravuje. Zkuste prosim otevrit horoskop na webu.</p>';
  }

  return paragraphs
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function formatEmailName(value = '', fallback = 'Ahoj') {
  const cleaned = String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

  return escapeHtml(cleaned || fallback);
}

const ACTIVATION_FEATURES = {
  daily_guidance: {
    label: 'denní horoskop',
    path: '/horoskopy.html',
    day0: 'Začni krátkým denním vhledem. Je to nejrychlejší způsob, jak z účtu udělat osobní místo.',
    day1: 'Vrať se k dennímu vedení a ulož první stopu do profilu.',
    day3: 'Když se k vedení vrátíš víckrát, začne dávat smysl paměť rituálu.'
  },
  horoskopy: {
    label: 'denní horoskop',
    path: '/horoskopy.html',
    day0: 'Začni krátkým denním vhledem. Je to nejrychlejší způsob, jak z účtu udělat osobní místo.',
    day1: 'Vrať se k dennímu vedení a ulož první stopu do profilu.',
    day3: 'Když se k vedení vrátíš víckrát, začne dávat smysl paměť rituálu.'
  },
  tarot: {
    label: 'tarotový výklad',
    path: '/tarot.html',
    day0: 'Polož jednu konkrétní otázku a nech tarot ukázat první směr.',
    day1: 'Navazující karta pomůže rozlišit, co je pocit a co další krok.',
    day3: 'Pokud se téma vrací, ulož výklad a sleduj vzorec v profilu.'
  },
  tarot_multi_card: {
    label: 'vícekartový tarot',
    path: '/tarot.html',
    day0: 'Začni vícekartovým výkladem, pokud potřebuješ souvislost místo jedné odpovědi.',
    day1: 'Vrať se k otázce a zkus druhý pohled: co teď pomůže, co drží zpět.',
    day3: 'Hlubší výklady dávají největší smysl, když je můžeš porovnat v historii.'
  },
  numerologie_vyklad: {
    label: 'numerologický výklad',
    path: '/numerologie.html',
    day0: 'Spočítej první osobní číslo a začni konkrétním rytmem, ne obecným textem.',
    day1: 'Vrať se k číslu a podívej se, jak se propisuje do vztahů nebo práce.',
    day3: 'Numerologie je silnější, když ji propojíš s horoskopem nebo partnerskou shodou.'
  },
  partnerska_detail: {
    label: 'partnerská shoda',
    path: '/partnerska-shoda.html',
    day0: 'Zadej dva profily a získej první vztahový vhled bez hledání v menu.',
    day1: 'Vrať se ke shodě a všimni si, jestli téma sedí na komunikaci, blízkost nebo hranice.',
    day3: 'Vztahový vhled má větší hodnotu, když naváže na tarot nebo natální kartu.'
  },
  daily_angel_card: {
    label: 'andělská karta',
    path: '/andelske-karty.html',
    day0: 'Otevři kartu dne a vezmi si jeden jednoduchý signál pro dnešek.',
    day1: 'Vrať se ke kartě a zapiš si, co se opravdu potvrdilo.',
    day3: 'Opakovaná karta nebo téma může být začátek osobního rituálu.'
  },
  natalni_interpretace: {
    label: 'natální karta',
    path: '/natalni-karta.html',
    day0: 'Doplň narození až ve chvíli, kdy otevíráš natální kartu. Účet už je připravený.',
    day1: 'Vrať se k natální kartě a začni jednou oblastí: vztahy, práce nebo energie.',
    day3: 'Natální karta dává smysl jako mapa, ke které se budeš vracet.'
  },
  mentor: {
    label: 'Hvězdný průvodce',
    path: '/mentor.html',
    day0: 'Polož jednu jasnou otázku a nech průvodce navázat na tvůj záměr.',
    day1: 'Vrať se s druhou otázkou: co je další konkrétní krok.',
    day3: 'Průvodce funguje nejlépe, když se ptáš na jednu situaci, ne na celý život najednou.'
  }
};

Object.assign(ACTIVATION_FEATURES, {
  andelske_karty_hluboky_vhled: ACTIVATION_FEATURES.daily_angel_card,
  angel_card_deep: ACTIVATION_FEATURES.daily_angel_card,
  crystal_ball_unlimited: {
    label: 'křišťálová koule',
    path: '/kristalova-koule.html',
    day0: 'Polož jednu osobní otázku a sleduj, jaký směr se objeví.',
    day1: 'Vrať se ke stejné otázce a porovnej, jestli se pocit zpřesnil.',
    day3: 'Když se téma vrací, naváže na tarot nebo profilovou reflexi.'
  },
  hvezdny_mentor: ACTIVATION_FEATURES.mentor,
  kristalova_koule: null,
  natal_chart: ACTIVATION_FEATURES.natalni_interpretace,
  numerology: ACTIVATION_FEATURES.numerologie_vyklad,
  runes_deep_reading: {
    label: 'runový výklad',
    path: '/runy.html',
    day0: 'Vytáhni runu pro jednu konkrétní otázku.',
    day1: 'Vrať se k symbolu a všimni si, kde se ukázal v praxi.',
    day3: 'Runy fungují nejlépe jako krátký rituál, ne jako nekonečné hledání.'
  },
  runy_hluboky_vyklad: null,
  shamanske_kolo_plne_cteni: {
    label: 'šamanské kolo',
    path: '/shamansko-kolo.html',
    day0: 'Otevři kolo pro jednu konkrétní otázku a vezmi si směr, který dnes půjde převést do praxe.',
    day1: 'Vrať se ke směru kola a všimni si, kde ti pomohl zpomalit, rozhodnout nebo pojmenovat další krok.',
    day3: 'Šamanské kolo dává větší hodnotu, když jeho symbol propojíš s tématem, které se ti opakuje.'
  },
  synastry: ACTIVATION_FEATURES.partnerska_detail,
  tarot_celtic_cross: ACTIVATION_FEATURES.tarot_multi_card
});
ACTIVATION_FEATURES.kristalova_koule = ACTIVATION_FEATURES.crystal_ball_unlimited;
ACTIVATION_FEATURES.runy_hluboky_vyklad = ACTIVATION_FEATURES.runes_deep_reading;
ACTIVATION_FEATURES.medicine_wheel = ACTIVATION_FEATURES.shamanske_kolo_plne_cteni;
ACTIVATION_FEATURES.minuly_zivot = {
  label: 'symbolický výklad minulého života',
  path: '/minuly-zivot.html',
  day0: 'Otevři archetypální příběh pro sebereflexi a vezmi si jedno téma, které se může propsat do současnosti.',
  day1: 'Vrať se k příběhu a zapiš si, který motiv sedí na tvoje dnešní rozhodování.',
  day3: 'Minulý život dává největší smysl jako symbolický rámec, když ho propojíš s aktuálním tématem v profilu.'
};
ACTIVATION_FEATURES.past_life = ACTIVATION_FEATURES.minuly_zivot;

const ACTIVATION_PRODUCT_OFFERS = {
  annual_horoscope: {
    label: 'Roční horoskop 2026 na míru',
    path: '/rocni-horoskop.html',
    feature: 'rocni_horoskop_2026',
    price: '199 Kč',
    cta: 'Získat roční výhled',
    promise: 'Jeden pevný PDF výstup pro celý rok, když nechceš hned řešit předplatné.'
  },
  personal_map: {
    label: 'Osobní mapa zbytku roku 2026',
    path: '/osobni-mapa.html',
    feature: 'osobni_mapa_2026',
    price: '299 Kč',
    cta: 'Otevřít osobní mapu',
    promise: 'Hlubší jednorázový výstup k datu narození, aktuálnímu tématu a dalším krokům.'
  },
  relationship_map: {
    label: 'Osobní mapa pro vztahové téma',
    path: '/osobni-mapa.html',
    feature: 'osobni_mapa_2026',
    price: '299 Kč',
    cta: 'Zadat vztahové téma',
    promise: 'Když se vztahové téma vrací, dej mu jeden konkrétní rámec bez měsíčního závazku.'
  }
};

const ACTIVATION_FEATURE_OFFER_KEY = {
  daily_guidance: 'annual_horoscope',
  horoskopy: 'annual_horoscope',
  numerologie_vyklad: 'personal_map',
  numerology: 'personal_map',
  natalni_interpretace: 'personal_map',
  natal_chart: 'personal_map',
  tarot: 'personal_map',
  tarot_multi_card: 'personal_map',
  tarot_celtic_cross: 'personal_map',
  daily_angel_card: 'personal_map',
  andelske_karty_hluboky_vhled: 'personal_map',
  angel_card_deep: 'personal_map',
  crystal_ball_unlimited: 'personal_map',
  kristalova_koule: 'personal_map',
  runes_deep_reading: 'personal_map',
  runy_hluboky_vyklad: 'personal_map',
  shamanske_kolo_plne_cteni: 'personal_map',
  medicine_wheel: 'personal_map',
  minuly_zivot: 'personal_map',
  past_life: 'personal_map',
  mentor: 'personal_map',
  hvezdny_mentor: 'personal_map',
  partnerska_detail: 'relationship_map',
  synastry: 'relationship_map'
};

function getActivationFeature(feature) {
  return ACTIVATION_FEATURES[feature] || ACTIVATION_FEATURES.daily_guidance;
}

function getActivationProductOffer(feature) {
  return ACTIVATION_PRODUCT_OFFERS[ACTIVATION_FEATURE_OFFER_KEY[feature] || 'personal_map'];
}

function buildTrackedLifecycleUrl({
  path,
  fallbackPath = '/horoskopy.html',
  campaign,
  feature,
  source,
  entryFeature,
  extraParams = {}
}) {
  let url;

  try {
    const baseUrl = new URL(APP_URL);
    const candidate = new URL(path || fallbackPath, baseUrl);
    url = candidate.origin === baseUrl.origin ? candidate : new URL(fallbackPath, baseUrl);
  } catch {
    url = new URL(fallbackPath, APP_URL);
  }

  url.searchParams.set('utm_source', 'email');
  url.searchParams.set('utm_medium', 'lifecycle');
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('source', campaign);
  url.searchParams.set('feature', feature || 'daily_guidance');
  if (source) url.searchParams.set('entry_source', source);
  if (entryFeature) url.searchParams.set('entry_feature', entryFeature);

  Object.entries(extraParams || {}).forEach(([key, value]) => {
    if (key && value != null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function buildTrackedActivationUrl({ path, campaign, feature, source }) {
  const fallbackPath = getActivationFeature(feature).path || '/horoskopy.html';
  return buildTrackedLifecycleUrl({
    path,
    fallbackPath,
    campaign,
    feature: feature || 'daily_guidance',
    source,
    entryFeature: feature
  });
}

function buildActivationTemplateData(data = {}, campaign = 'activation_day0') {
  const featureKey = data.feature || 'daily_guidance';
  const feature = getActivationFeature(featureKey);
  const ctaUrl = data.ctaUrl || buildTrackedActivationUrl({
    path: data.destination || feature.path,
    campaign,
    feature: featureKey,
    source: data.source
  });

  return {
    featureKey,
    feature,
    ctaUrl,
    name: formatEmailName(data.name, 'Ahoj')
  };
}

function buildActivationOfferTemplateData(data = {}) {
  const featureKey = data.feature || 'daily_guidance';
  const feature = getActivationFeature(featureKey);
  const offer = getActivationProductOffer(featureKey);
  const offerUrl = data.offerUrl || buildTrackedLifecycleUrl({
    path: offer.path,
    fallbackPath: offer.path,
    campaign: 'activation_day6_offer',
    feature: offer.feature,
    source: data.source,
    entryFeature: featureKey
  });

  return {
    featureKey,
    feature,
    offer,
    offerUrl,
    name: formatEmailName(data.name, 'Ahoj')
  };
}

function buildResendPayload({ to, subject, html, text, replyTo, headers, attachments }) {
  const payload = {
    from: FROM_EMAIL,
    to,
    subject: sanitizeHeaderValue(subject),
    html,
    text: text || htmlToPlainText(html)
  };

  const resolvedReplyTo = sanitizeHeaderValue(replyTo || REPLY_TO_EMAIL);
  if (resolvedReplyTo) payload.replyTo = resolvedReplyTo;
  if (headers && Object.keys(headers).length) payload.headers = headers;
  if (attachments) payload.attachments = attachments;

  return payload;
}

/**
 * BASE EMAIL TEMPLATE
 * Provides a unified, premium mystical look for all emails
 */
function getBaseTemplate(content, title = 'Mystická Hvězda', previewText = '') {
  const preheader = escapeHtml(previewText || title);

  return `
    <!DOCTYPE html>
    <html lang="cs">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@400;600&display=swap');
          
          body {
            margin: 0; padding: 0;
            background-color: #0a0a1a;
            color: #ffffff;
            font-family: 'Inter', sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          
          .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #0a0a1a;
            padding-bottom: 40px;
          }
          
          .main {
            background-color: #0f0f2d;
            margin: 0 auto;
            width: 100%;
            max-width: 600px;
            border-spacing: 0;
            font-family: 'Inter', sans-serif;
            color: #ffffff;
            border: 1px solid rgba(212, 175, 55, 0.1);
          }
          
          .header {
            padding: 40px 20px;
            text-align: center;
            background: linear-gradient(to bottom, #16163a, #0f0f2d);
          }
          
          .logo-text {
            font-family: 'Cinzel', serif;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #d4af37;
            text-decoration: none;
            margin: 0;
          }
          
          .content {
            padding: 40px 30px;
            line-height: 1.6;
            font-size: 16px;
          }
          
          .h1 {
            font-family: 'Cinzel', serif;
            font-size: 24px;
            color: #d4af37;
            margin-top: 0;
            margin-bottom: 20px;
            text-align: center;
          }
          
          .cta-box {
            text-align: center;
            padding: 30px 0;
          }
          
          .btn {
            background: linear-gradient(135deg, #d4af37, #f1c40f);
            color: #000000 !important;
            padding: 14px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 700;
            display: inline-block;
            box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
            text-transform: uppercase;
            font-size: 14px;
            letter-spacing: 1px;
          }
          
          .footer {
            padding: 30px;
            text-align: center;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            border-top: 1px solid rgba(212, 175, 55, 0.1);
          }
          
          .footer a { color: #d4af37; text-decoration: none; }
          
          .highlight {
            color: #d4af37;
            font-weight: 600;
          }
          
          .feature-item {
            background: rgba(212, 175, 55, 0.05);
            border-left: 3px solid #d4af37;
            padding: 15px;
            margin: 15px 0;
            border-radius: 0 4px 4px 0;
          }
          
          @media screen and (max-width: 600px) {
            .content { padding: 30px 20px; }
          }
        </style>
      </head>
      <body>
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;">
          ${preheader}
        </div>
        <center class="wrapper">
          <table class="main">
            <tr>
              <td class="header">
                <h1 class="logo-text">MYSTICKÁ HVĚZDA</h1>
              </td>
            </tr>
            <tr>
              <td class="content">
                ${content}
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p>© 2026 Mystická Hvězda | Tvoje cesta k sebepoznání</p>
                <p>Napiš nám na <a href="mailto:support@mystickahvezda.cz">support@mystickahvezda.cz</a></p>
                <p style="margin-top: 20px; opacity: 0.6;">
                  Pokud si nepřeješ dostávat tyto e-maily, můžeš se odhlásit v nastavení profilu.
                </p>
              </td>
            </tr>
          </table>
        </center>
      </body>
    </html>
  `;
}

/**
 * EMAIL TEMPLATES
 */
export const EMAIL_TEMPLATES = {
  onboarding_welcome: {
    subject: 'Vítej v Mystické Hvězdě! 🌟',
    getHtml: (data) => getBaseTemplate(`
      <div style="display:none;max-height:0;overflow:hidden;">Tvůj osobní tarot, horoskopy a duchovní vedení — vše je připraveno.</div>
      <h1 class="h1">Vítej mezi hvězdami!</h1>
      <p>Gratuluji! Právě jsi učinil první krok na cestě k hlubšímu sebepoznání.</p>
      <p>Tvůj prémiový plán <span class="highlight">${data.plan === 'premium_monthly' ? 'Hvězdný Průvodce' : 'Osvícení'}</span> je nyní aktivní. Tvůj osud se začíná odkrývat...</p>
      
      <div class="feature-item">
        <strong>Máš nyní neomezený přístup k:</strong>
        <ul style="margin-top: 10px; padding-left: 20px;">
          <li>📖 Neomezeným tarotovým výkladům</li>
          <li>⭐ Detailním osobním horoskopům</li>
          <li>✨ Duchovnímu průvodci pro tvé hluboké otázky</li>
          <li>🗺️ Natalním kartám a astromapě</li>
          <li>🔢 Numerologickému rozboru</li>
        </ul>
      </div>

      <div class="cta-box">
        <a href="${process.env.APP_URL}/horoskopy.html" class="btn">Otevřít svůj horoskop →</a>
      </div>
      
      <p style="font-size: 14px; text-align: center; opacity: 0.8;">
        "Hvězdy nenutí, ale vedou." Nech se vést svou vlastní intuicí.
      </p>
    `, 'Vítej v Mystické Hvězdě!')
  },

  onboarding_features: {
    subject: 'Tvůj nový svět se otevírá ✨',
    getHtml: (data) => getBaseTemplate(`
      <h1 class="h1">Objevuj skryté možnosti</h1>
      <p>Včera jsi se připojil k naší komunitě. Dnes je čas podívat se hlouběji pod povrch...</p>
      
      <p>Zde jsou funkce, které ti pomohou najít odpovědi, které hledáš:</p>
      
      ${(data.features || ['Duchovní průvodce', 'Tarotový výklad', 'Astromapa']).map(f => `
        <div class="feature-item">
          <strong>✨ ${f}</strong>
        </div>
      `).join('')}

      <div class="cta-box">
        <a href="${process.env.APP_URL}/mentor.html" class="btn">Potkat svého Duchovního průvodce →</a>
      </div>
      
      <p style="font-style: italic; opacity: 0.8; text-align: center;">
        "Vše, co hledáš venku, je již uvnitř tebe."
      </p>
    `, 'Objevuj Mystickou Hvězdu')
  },

  activation_first_step_day0: {
    subject: 'Tvůj první krok je připravený',
    getHtml: (data) => {
      const context = buildActivationTemplateData(data, 'activation_day0');
      return getBaseTemplate(`
        <div style="display:none;max-height:0;overflow:hidden;">Navážeme tam, kde jsi začal. Jeden konkrétní krok, žádné hledání v menu.</div>
        <h1 class="h1">${context.name}, začni tam, proč jsi přišel</h1>
        <p>Účet už má smysl až ve chvíli, kdy tě dovede k první osobní hodnotě.</p>
        <div class="feature-item">
          <strong>${escapeHtml(context.feature.label)}</strong>
          <p>${escapeHtml(context.feature.day0)}</p>
        </div>
        <div class="cta-box">
          <a href="${escapeHtml(context.ctaUrl)}" class="btn">Otevřít první krok →</a>
        </div>
      `, 'První krok po registraci')
    }
  },

  activation_quick_win_day1: {
    subject: 'Vrať se k prvnímu signálu',
    getHtml: (data) => {
      const context = buildActivationTemplateData(data, 'activation_day1');
      return getBaseTemplate(`
        <h1 class="h1">Jedna otázka stačí</h1>
        <p>Nemusíš projít celý web. Stačí se vrátit k tomu, co tě přivedlo dovnitř.</p>
        <div class="feature-item">
          <strong>${escapeHtml(context.feature.label)}</strong>
          <p>${escapeHtml(context.feature.day1)}</p>
        </div>
        <div class="cta-box">
          <a href="${escapeHtml(context.ctaUrl)}" class="btn">Pokračovat v osobním kroku →</a>
        </div>
      `, 'Rychlý návrat k první hodnotě')
    }
  },

  activation_depth_day3: {
    subject: 'Tady začíná osobní vzorec',
    getHtml: (data) => {
      const context = buildActivationTemplateData(data, 'activation_day3');
      const upgradeUrl = buildTrackedActivationUrl({
        path: '/cenik.html',
        campaign: 'activation_day3_upgrade',
        feature: context.featureKey,
        source: data.source
      });

      return getBaseTemplate(`
        <h1 class="h1">Když se téma vrací, stojí za to ho sledovat</h1>
        <p>První výklad je začátek. Hodnota roste ve chvíli, kdy se k němu můžeš vrátit, porovnat ho a vidět opakující se motivy.</p>
        <div class="feature-item">
          <strong>${escapeHtml(context.feature.label)}</strong>
          <p>${escapeHtml(context.feature.day3)}</p>
        </div>
        <div class="cta-box">
          <a href="${escapeHtml(context.ctaUrl)}" class="btn">Vrátit se k výkladu →</a>
        </div>
        <p style="font-size: 14px; text-align: center; opacity: 0.82;">
          Pokud už chceš hlubší historii a pravidelný návrat, můžeš se podívat i na
          <a href="${escapeHtml(upgradeUrl)}" style="color:#d4af37;">Hvězdného průvodce</a>.
        </p>
      `, 'Osobní vzorec')
    }
  },

  activation_one_time_offer_day6: {
    subject: 'Jeden další krok bez předplatného',
    getHtml: (data) => {
      const context = buildActivationOfferTemplateData(data);
      return getBaseTemplate(`
        <h1 class="h1">${context.name}, možná teď nepotřebuješ celý plán</h1>
        <p>Pokud se k tématu <span class="highlight">${escapeHtml(context.feature.label)}</span> vracíš, ale předplatné pro tebe teď není správný krok, dává smysl jeden konkrétní výstup.</p>
        <div class="feature-item">
          <strong>${escapeHtml(context.offer.label)}</strong>
          <p>${escapeHtml(context.offer.promise)}</p>
          <p style="margin-bottom:0;"><span class="highlight">${escapeHtml(context.offer.price)}</span> jednorázově, bez měsíčního závazku.</p>
        </div>
        <div class="cta-box">
          <a href="${escapeHtml(context.offerUrl)}" class="btn">${escapeHtml(context.offer.cta)} →</a>
        </div>
        <p style="font-size: 13px; text-align: center; opacity: 0.74;">
          Pokud už sis mezitím aktivoval Průvodce, tento email se neodesílá.
        </p>
      `, 'Jeden další krok bez předplatného')
    }
  },

  subscription_paused: {
    subject: '⏸️ Tvé předplatné je pozastaveno',
    getHtml: (data) => getBaseTemplate(`
      <h1 class="h1">Předplatné pozastaveno</h1>
      <p>Tvé předplatné jsme úspěšně pozastavili na <span class="highlight">${data.daysUntilResume || 30} dní</span>.</p>
      
      <div class="feature-item">
        <strong>Co to pro tebe znamená:</strong>
        <ul style="margin-top: 10px; padding-left: 20px;">
          <li>✓ Žádné poplatky po dobu pauzy</li>
          <li>✓ Tvá data a historie zůstávají v bezpečí</li>
          <li>✓ Automatické obnovení po ${data.daysUntilResume || 30} dnech</li>
        </ul>
      </div>

      <p>Pokud změníš názor, můžeš se kdykoli vrátit dříve.</p>

      <div class="cta-box">
        <a href="${process.env.APP_URL}/profil.html" class="btn">Správa profilu →</a>
      </div>
    `, 'Pozastavení předplatného')
  },

  discount_applied: {
    subject: '💝 Skvělá zpráva - máš slevu!',
    getHtml: (data) => getBaseTemplate(`
      <h1 class="h1">Dárek přímo z hvězd!</h1>
      <div style="text-align: center; margin-bottom: 30px;">
        <p>Abychom ti zpříjemnili tvou cestu, přichystali jsme pro tebe něco speciálního:</p>
        <div style="font-size: 48px; color: #d4af37; font-weight: 700; margin: 20px 0;">
          ${data.discount || 25}% SLEVA
        </div>
        <p>na tvé předplatné po dobu <span class="highlight">${data.months || 3} měsíců</span>.</p>
      </div>

      <p style="text-align: center;">Zůstaň s námi a pokračuj v objevování hloubky svého bytí.</p>

      <div class="cta-box">
        <a href="${process.env.APP_URL}/profil.html" class="btn">Uplatnit dar →</a>
      </div>
    `, 'Dárek pro tebe')
  },
  upgrade_reminder_day7: {
    subject: 'Vidím, co ti chybí... 👀',
    getHtml: (data) => getBaseTemplate(`
      <h1 class="h1">Tvé otázky si zaslouží více</h1>
      <p>Používáš základní plán, ale vesmír má pro tebe připraveno mnohem více odpovědí...</p>
      
      <div class="feature-item">
        <strong>S plánem Hvězdný Průvodce získáš:</strong>
        <ul style="margin-top: 10px; padding-left: 20px;">
          <li>✨ <strong>Neomezené</strong> tarotové výklady</li>
          <li>📅 Týdenní a měsíční horoskopy</li>
          <li><strong>Duchovní průvodce:</strong> Máte k dispozici svého osobního mentora, který zná vaše hvězdné nastavení.</li>
          <li>🔢 Hloubkovou numerologii</li>
        </ul>
      </div>

      <div class="cta-box">
        <a href="${process.env.APP_URL}/cenik.html" class="btn">Upgradovat na Premium →</a>
      </div>
    `, 'Tvé možnosti se rozšiřují')
  },

  upgrade_reminder_day14: {
    subject: '⏰ Poslední šance - 25% sleva na Premium',
    getHtml: (data) => getBaseTemplate(`
      <h1 class="h1">Hvězdná příležitost končí</h1>
      <div style="background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 25px;">
        <p>Tato limitovaná nabídka vyprší již za 24 hodin:</p>
        <div style="font-size: 32px; color: #ff6b6b; font-weight: 700; margin: 15px 0;">
          199 Kč → 149 Kč
        </div>
        <p><strong>🎁 25% SLEVA na první 3 měsíce</strong></p>
      </div>

      <p style="text-align: center;">Nechej si poradit od hvězd za poloviční cenu.</p>

      <div class="cta-box">
        <a href="${process.env.APP_URL}/cenik.html?utm_source=email&utm_campaign=upgrade_day14" class="btn" style="background: linear-gradient(135deg, #ff6b6b, #ee5253); color: white !important;">Aktivovat slevu 25% →</a>
      </div>
    `, 'Poslední šance')
  },

  churn_recovery_day25: {
    subject: '💔 Chceme tě zpátky - 30% sleva čeká',
    getHtml: (data) => getBaseTemplate(`
      <h1 class="h1">Chybíš nám...</h1>
      <p>Všimli jsme si, že jsi se na chvíli odmlčel. Víme, že cesta životem bývá klikatá a někdy potřebujeme pauzu.</p>
      
      <div style="background: rgba(52,152,219,0.1); border: 2px solid #3498db; padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0;">
        <p style="text-transform: uppercase; letter-spacing: 1px; font-size: 13px; color: #3498db; margin-bottom: 10px;">Speciální nabídka pro návrat</p>
        <div style="font-size: 36px; color: #d4af37; font-weight: 700;">30% SLEVA</div>
        <p>na tvé první 3 měsíce Premium</p>
      </div>

      <p style="text-align: center;">Tvůj osud stále čeká na odhalení. Vrátíš se?</p>

      <div class="cta-box">
        <a href="${process.env.APP_URL}/cenik.html?utm_source=email&utm_campaign=churn_recovery" class="btn" style="background: linear-gradient(135deg, #3498db, #2980b9); color: white !important;">Vrátit se ke hvězdám →</a>
      </div>
    `, 'Vrať se k nám')
  },

  feature_weekly: {
    subject: 'Nový týden, nová cesta k objevování ✨',
    getHtml: (data) => getBaseTemplate(`
      <h1 class="h1">Pohled do hloubky</h1>
      <div class="feature-item">
        <h2 style="color: #d4af37; margin-top: 0; font-family: 'Cinzel', serif;">${data.feature_title || 'Astrokartografie'}</h2>
        <p>${data.feature_description || 'Zjisti, kde na světě je tvá energie nejsilnější a kde na tebe čeká úspěch...'}</p>
        
        ${data.benefits ? `
          <ul style="margin-top: 10px; padding-left: 20px;">
            ${data.benefits.map(b => `<li>${b}</li>`).join('')}
          </ul>
        ` : ''}
      </div>

      <p style="text-align: center;">Využij potenciál tohoto týdne naplno.</p>

      <div class="cta-box">
        <a href="${data.feature_url || process.env.APP_URL + '/profil.html'}" class="btn">Vyzkoušet nyní →</a>
      </div>
    `, 'Týdenní inspirace')
  },
  admin_contact_notification: {
    subject: (data) => `[Kontakt] ${data.subject} — od ${data.name}`,
    getHtml: (data) => getBaseTemplate(`
      <h1 class="h1">Nová zpráva z webu</h1>
      <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(212,175,55,0.2); padding: 20px; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; color: #ffffff;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid rgba(212,175,55,0.1); color: #d4af37; width: 100px;">Od:</td>
            <td style="padding: 10px; border-bottom: 1px solid rgba(212,175,55,0.1);">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid rgba(212,175,55,0.1); color: #d4af37;">E-mail:</td>
            <td style="padding: 10px; border-bottom: 1px solid rgba(212,175,55,0.1);"><a href="mailto:${data.email}" style="color: #ffffff;">${data.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid rgba(212,175,55,0.1); color: #d4af37;">Předmět:</td>
            <td style="padding: 10px; border-bottom: 1px solid rgba(212,175,55,0.1);">${data.subject}</td>
          </tr>
          <tr>
            <td style="padding: 10px; color: #d4af37; vertical-align: top;">Zpráva:</td>
            <td style="padding: 10px; line-height: 1.5;">${data.message}</td>
          </tr>
        </table>
      </div>
    `, 'Nová zpráva - Mystická Hvězda')
  },

  trial_ending_reminder: {
    subject: 'Vaše zkušební období končí za 2 dny ⏳',
    getHtml: (data) => getBaseTemplate(`
      <h1 class="h1">Zkušební období brzy končí</h1>
      <p>Vaše zkušební období u Mystické Hvězdy končí za <span class="highlight">${data.daysRemaining || 2} dny</span>.</p>

      <p>Během zkušebního období jste měli přístup k:</p>
      <div class="feature-item">
        <ul style="margin-top: 10px; padding-left: 20px;">
          <li>📖 Neomezeným tarotovým výkladům</li>
          <li>⭐ Detailním osobním horoskopům</li>
          <li>✨ Duchovnímu průvodci</li>
          <li>🗺️ Natálním kartám</li>
        </ul>
      </div>

      <p>Po skončení zkušebního období bude automaticky aktivováno vaše předplatné. Pokud si nepřejete pokračovat, můžete předplatné zrušit v nastavení profilu.</p>

      <div class="cta-box">
        <a href="${process.env.APP_URL}/profil.html" class="btn">Spravovat předplatné →</a>
      </div>
    `, 'Zkušební období končí')
  },

  trial_ended: {
    subject: 'Děkujeme za vyzkoušení Mystické Hvězdy ✨',
    getHtml: (data) => getBaseTemplate(`
      <h1 class="h1">Zkušební období skončilo</h1>
      <p>Vaše 7denní zkušební období právě skončilo a vaše předplatné <span class="highlight">Hvězdný Průvodce</span> je nyní plně aktivní.</p>

      <p>Od dnešního dne vám bude pravidelně účtována měsíční platba. Veškeré prémiové funkce zůstávají k dispozici.</p>

      <div class="feature-item">
        <strong>Co máte k dispozici:</strong>
        <ul style="margin-top: 10px; padding-left: 20px;">
          <li>📖 Neomezené tarotové výklady</li>
          <li>⭐ Týdenní a měsíční horoskopy</li>
          <li>✨ Duchovní průvodce pro hluboké otázky</li>
          <li>🗺️ Natální karty s interpretací</li>
        </ul>
      </div>

      <div class="cta-box">
        <a href="${process.env.APP_URL}/profil.html" class="btn">Otevřít svůj profil →</a>
      </div>

      <p style="font-size: 13px; opacity: 0.7; text-align: center;">
        Předplatné můžete kdykoli spravovat ve svém profilu.
      </p>
    `, 'Vítejte v plném předplatném')
  }

};

/**
 * Send email via Resend
 */
export async function sendEmail(emailConfig) {
  try {
    const { to, template, data = {}, headers = {}, replyTo, text, unsubscribeUrl } = emailConfig;

    if (!template || !EMAIL_TEMPLATES[template]) {
      throw new Error(`Unknown email template: ${template}`);
    }

    const templateConfig = EMAIL_TEMPLATES[template];
    const html = templateConfig.getHtml(data);

    console.log(`[EMAIL] Sending ${template} to ${to}`);

    const resendClient = getResend();
    if (!resendClient) {
      throw new Error('Resend not initialized - missing RESEND_API_KEY');
    }

    const response = await resendClient.emails.send(buildResendPayload({
      to,
      subject: typeof templateConfig.subject === 'function' ? templateConfig.subject(data) : templateConfig.subject,
      html,
      text,
      replyTo,
      headers: buildEmailHeaders({ template, data, headers, unsubscribeUrl })
    }));

    if (response.error) {
      throw response.error;
    }

    console.log(`[EMAIL] ✓ Sent ${template} (ID: ${response.data.id})`);
    return { success: true, emailId: response.data.id };
  } catch (error) {
    console.error(`[EMAIL] ✗ Failed to send ${emailConfig.template}:`, error.message);
    throw error;
  }
}

/**
 * Send onboarding email sequence
 * Uses job scheduler for delayed emails
 */
export async function sendOnboardingSequence(userId, email, planType) {
  try {
    // Import scheduleEmailLater here to avoid circular dependency
    const { scheduleEmailLater } = await import('./jobs/email-queue.js');

    // Email 1: Welcome (immediate)
    await sendEmail({
      to: email,
      template: 'onboarding_welcome',
      data: { plan: planType }
    });

    // Email 2: Features (24 hours = 86400 seconds)
    await scheduleEmailLater({
      userId,
      email,
      template: 'onboarding_features',
      data: { plan: planType },
      delaySeconds: 86400
    });

    // Email 3: Nudge (72 hours = 259200 seconds)
    await scheduleEmailLater({
      userId,
      email,
      template: 'onboarding_nudge',
      data: { plan: planType },
      delaySeconds: 259200
    });

    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Failed to send onboarding sequence:', error);
    throw error;
  }
}

/**
 * Schedule a short post-activation lifecycle for new free users.
 * It is triggered after onboarding, when the user has enough context for a useful next step.
 */
export async function sendActivationLifecycleSequence({
  userId,
  email,
  name = '',
  source = '',
  feature = 'daily_guidance',
  destination = '',
  delays = {}
} = {}) {
  if (!email) {
    throw new Error('Missing email for activation lifecycle sequence.');
  }

  try {
    const { scheduleEmailLater } = await import('./jobs/email-queue.js');
    const dedupeBase = userId || email;
    const context = {
      name,
      source,
      feature: feature || 'daily_guidance',
      destination
    };

    const results = [];
    results.push(await scheduleEmailLater({
      userId,
      email,
      template: 'activation_first_step_day0',
      data: {
        ...context,
        dedupeKey: `activation:${dedupeBase}:day0`
      },
      delaySeconds: delays.day0 ?? 0,
      dedupeKey: `activation:${dedupeBase}:day0`
    }));

    results.push(await scheduleEmailLater({
      userId,
      email,
      template: 'activation_quick_win_day1',
      data: {
        ...context,
        dedupeKey: `activation:${dedupeBase}:day1`
      },
      delaySeconds: delays.day1 ?? 86400,
      dedupeKey: `activation:${dedupeBase}:day1`
    }));

    results.push(await scheduleEmailLater({
      userId,
      email,
      template: 'activation_depth_day3',
      data: {
        ...context,
        dedupeKey: `activation:${dedupeBase}:day3`
      },
      delaySeconds: delays.day3 ?? 259200,
      dedupeKey: `activation:${dedupeBase}:day3`
    }));

    results.push(await scheduleEmailLater({
      userId,
      email,
      template: 'activation_one_time_offer_day6',
      data: {
        ...context,
        skipIfPremium: true,
        dedupeKey: `activation:${dedupeBase}:day6`
      },
      delaySeconds: delays.day6 ?? 518400,
      dedupeKey: `activation:${dedupeBase}:day6`
    }));

    const scheduled = results.filter(result => !result.skipped).length;
    return { success: true, scheduled, skipped: results.length - scheduled };
  } catch (error) {
    console.error('[EMAIL] Failed to schedule activation lifecycle sequence:', error);
    throw error;
  }
}

/**
 * Send pause notification
 */
export async function sendPauseEmail(email, daysUntilResume = 30) {
  try {
    await sendEmail({
      to: email,
      template: 'subscription_paused',
      data: { daysUntilResume }
    });
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Failed to send pause email:', error);
    throw error;
  }
}

/**
 * Send discount notification
 */
export async function sendDiscountEmail(email, discount = 50, months = 3) {
  try {
    await sendEmail({
      to: email,
      template: 'discount_applied',
      data: { discount, months }
    });
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Failed to send discount email:', error);
    throw error;
  }
}

/**
 * Send upgrade reminder sequence (Day 7, 14)
 */
export async function sendUpgradeReminders(userId, email) {
  try {
    const { scheduleEmailLater } = await import('./jobs/email-queue.js');

    // Email 1: Day 7 - "See what you're missing"
    await scheduleEmailLater({
      userId,
      email,
      template: 'upgrade_reminder_day7',
      data: {},
      delaySeconds: 604800 // 7 days
    });

    // Email 2: Day 14 - limited retention discount
    await scheduleEmailLater({
      userId,
      email,
      template: 'upgrade_reminder_day14',
      data: {},
      delaySeconds: 1209600 // 14 days
    });

    console.log(`[EMAIL] Upgrade reminders scheduled for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Failed to schedule upgrade reminders:', error);
    throw error;
  }
}

/**
 * Send churn recovery email (Day 25 after signup)
 */
export async function sendChurnRecoveryEmail(userId, email) {
  try {
    const { scheduleEmailLater } = await import('./jobs/email-queue.js');

    await scheduleEmailLater({
      userId,
      email,
      template: 'churn_recovery_day25',
      data: {},
      delaySeconds: 2160000 // 25 days
    });

    console.log(`[EMAIL] Churn recovery email scheduled for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Failed to schedule churn recovery email:', error);
    throw error;
  }
}

/**
 * Send weekly feature discovery email
 */
export async function sendWeeklyFeatureEmail(email, featureData = {}) {
  try {
    await sendEmail({
      to: email,
      template: 'feature_weekly',
      data: featureData
    });
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Failed to send weekly feature email:', error);
    throw error;
  }
}

/**
 * Schedule trial reminder emails (Day 5: ending soon, Day 7: ended)
 */
export async function sendTrialReminderEmails(userId, email, trialEndDate) {
  if (!trialEndDate) return;
  const trialEnd = new Date(trialEndDate);
  if (isNaN(trialEnd.getTime())) return; // guard against invalid date

  try {
    const { scheduleEmailLater } = await import('./jobs/email-queue.js');
    const now = new Date();

    // Day 5: "Trial ending in 2 days"
    const day5Delay = Math.max(0, Math.floor((trialEnd - now - 2 * 86400000) / 1000));
    if (day5Delay > 60) { // at least 1 minute in the future
      await scheduleEmailLater({
        userId,
        email,
        template: 'trial_ending_reminder',
        data: { daysRemaining: 2 },
        delaySeconds: day5Delay
      });
    }

    // Day 7: "Trial ended, subscription active"
    const day7Delay = Math.max(0, Math.floor((trialEnd - now) / 1000));
    if (day7Delay > 60) {
      await scheduleEmailLater({
        userId,
        email,
        template: 'trial_ended',
        data: {},
        delaySeconds: day7Delay
      });
    }

    console.log(`[EMAIL] Trial reminders scheduled for user ${userId} (end: ${trialEndDate})`);
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Failed to schedule trial reminders:', error);
    throw error;
  }
}

/**
 * Schedule post-purchase lifecycle emails for the one-time Personal Map product.
 * The sequence is intentionally short: product value first, subscription upsell second.
 */
export async function sendPersonalMapLifecycleSequence({
  orderId = null,
  email,
  name,
  sign,
  productId = 'osobni_mapa_2026',
  source = 'personal_map_checkout',
  stripeSessionId = null,
  delays = {}
}) {
  if (!email) {
    throw new Error('Missing email for personal map lifecycle sequence.');
  }

  try {
    const { scheduleEmailLater } = await import('./jobs/email-queue.js');
    const baseData = {
      orderId,
      name,
      sign,
      productId,
      source,
      stripeSessionId
    };
    const dedupeBase = orderId || stripeSessionId || `${productId}:${email}`;

    const reflectionResult = await scheduleEmailLater({
      email,
      template: 'personal_map_reflection_day1',
      data: baseData,
      delaySeconds: delays.reflectionDay1 ?? 86400,
      dedupeKey: `personal_map:${dedupeBase}:reflection_day1`
    });

    const pruvodceResult = await scheduleEmailLater({
      email,
      template: 'personal_map_pruvodce_day3',
      data: baseData,
      delaySeconds: delays.pruvodceDay3 ?? 259200,
      dedupeKey: `personal_map:${dedupeBase}:pruvodce_day3`
    });

    const results = [reflectionResult, pruvodceResult];
    const scheduled = results.filter(result => !result.skipped).length;
    console.log(`[EMAIL] Personal map lifecycle sequence scheduled for ${email}`);
    return { success: true, scheduled, skipped: results.length - scheduled };
  } catch (error) {
    console.error('[EMAIL] Failed to schedule personal map lifecycle sequence:', error);
    throw error;
  }
}

/**
 * Schedule post-purchase lifecycle emails for the annual horoscope PDF.
 * The first email turns the PDF into a concrete ritual, the second bridges to a subscription.
 */
export async function sendAnnualHoroscopeLifecycleSequence({
  orderId = null,
  email,
  name,
  sign,
  productId = 'rocni_horoskop_2026',
  year = new Date().getFullYear(),
  source = 'annual_horoscope_checkout',
  stripeSessionId = null,
  delays = {}
}) {
  if (!email) {
    throw new Error('Missing email for annual horoscope lifecycle sequence.');
  }

  try {
    const { scheduleEmailLater } = await import('./jobs/email-queue.js');
    const baseData = {
      orderId,
      name,
      sign,
      productId,
      year,
      source,
      stripeSessionId
    };
    const dedupeBase = orderId || stripeSessionId || `${productId}:${email}`;

    const reflectionResult = await scheduleEmailLater({
      email,
      template: 'annual_horoscope_reflection_day1',
      data: baseData,
      delaySeconds: delays.reflectionDay1 ?? 86400,
      dedupeKey: `annual_horoscope:${dedupeBase}:reflection_day1`
    });

    const pruvodceResult = await scheduleEmailLater({
      email,
      template: 'annual_horoscope_pruvodce_day3',
      data: baseData,
      delaySeconds: delays.pruvodceDay3 ?? 259200,
      dedupeKey: `annual_horoscope:${dedupeBase}:pruvodce_day3`
    });

    const results = [reflectionResult, pruvodceResult];
    const scheduled = results.filter(result => !result.skipped).length;
    console.log(`[EMAIL] Annual horoscope lifecycle sequence scheduled for ${email}`);
    return { success: true, scheduled, skipped: results.length - scheduled };
  } catch (error) {
    console.error('[EMAIL] Failed to schedule annual horoscope lifecycle sequence:', error);
    throw error;
  }
}

EMAIL_TEMPLATES.horoscope_subscription_confirm = {
  subject: 'Odběr denního horoskopu potvrzen',
  getHtml: (data) => {
    const sign = escapeHtml(data.sign);
    const horoscopeUrl = toAbsoluteUrl('/horoskopy.html');
    const unsubscribeUrl = data.token
      ? toAbsoluteUrl(`/api/subscribe/horoscope/unsubscribe?token=${encodeURIComponent(data.token)}`)
      : horoscopeUrl;

    return getBaseTemplate(`
    <h1 class="h1">Odběr je aktivní</h1>
    <p>Tvůj denní horoskop pro znamení <span class="highlight">${sign}</span> je zapnutý.</p>
    <p>Každé ráno ti pošleme krátké vedení pro den: na co se soustředit, kde ubrat a co si pohlídat.</p>
    <div class="cta-box">
      <a href="${horoscopeUrl}" class="btn">Otevřít dnešní horoskop &rarr;</a>
    </div>
    <p style="font-size:13px;opacity:0.6;text-align:center;margin-top:2rem;">
      Pokud si nepřeješ dostávat denní horoskop, můžeš se <a href="${unsubscribeUrl}" style="color:#d4af37;">kdykoli odhlásit</a>.
    </p>
  `, 'Odběr denního horoskopu', `Potvrzení odběru denního horoskopu pro znamení ${data.sign}.`);
  }
};

EMAIL_TEMPLATES.daily_horoscope = {
  subject: (data) => `Tvůj denní horoskop: ${data.sign}`,
  getHtml: (data) => {
    const sign = escapeHtml(data.sign);
    const date = escapeHtml(data.date);
    const horoscopeUrl = toAbsoluteUrl('/horoskopy.html');
    const unsubscribeUrl = data.token
      ? toAbsoluteUrl(`/api/subscribe/horoscope/unsubscribe?token=${encodeURIComponent(data.token)}`)
      : horoscopeUrl;

    return getBaseTemplate(`
    <h1 class="h1">Horoskop pro ${sign}</h1>
    <p style="text-align:center;opacity:0.7;margin-top:-10px;">${date}</p>

    <div style="background:rgba(212,175,55,0.07);border-left:3px solid #d4af37;padding:20px 25px;border-radius:0 8px 8px 0;margin:25px 0;line-height:1.8;font-size:16px;">
      ${formatTextContent(data.horoscope_text)}
    </div>

    <div class="cta-box">
      <a href="${horoscopeUrl}" class="btn">Celý horoskop na webu &rarr;</a>
    </div>

    <p style="font-size:12px;opacity:0.5;text-align:center;margin-top:2rem;">
      Dostáváš tento email protože jsi přihlášen k odběru denního horoskopu Mystické Hvězdy.<br>
      <a href="${unsubscribeUrl}" style="color:#d4af37;">Odhlásit se z odběru</a>
    </p>
  `, `Denní horoskop: ${data.sign}`, `Krátké ranní vedení pro znamení ${data.sign}. Otevři, co dnes podpořit a co nechat být.`);
  }
};

EMAIL_TEMPLATES.personal_map_reflection_day1 = {
  subject: 'Jak z Osobní mapy vytěžit první krok',
  getHtml: (data) => {
    const name = formatEmailName(data.name);
    const mentorUrl = toAbsoluteUrl('/mentor.html?source=personal_map_email_day1&feature=mentor&utm_source=email&utm_campaign=personal_map_day1');
    const mapUrl = toAbsoluteUrl('/osobni-mapa.html?source=personal_map_email_day1&feature=osobni_mapa_2026&utm_source=email&utm_campaign=personal_map_day1');

    return getBaseTemplate(`
    <h1 class="h1">Vrať se k jedné větě</h1>
    <p>${name}, Osobní mapa nejlíp funguje, když z ní neuděláš další dlouhý text, který jen přečteš a odložíš.</p>
    <p>Dnes si zkus vybrat jednu větu, která se tě dotkla. Ne tu nejhezčí. Tu, u které cítíš malé napětí nebo úlevu.</p>

    <div class="feature-item">
      <strong>Krátké cvičení na 5 minut:</strong>
      <ul style="margin-top:10px;padding-left:20px;">
        <li>Otevři PDF a najdi jednu větu, která tě zastavila.</li>
        <li>Napiš si: "Co mi tahle věta dovoluje přestat tlačit silou?"</li>
        <li>Vyber jeden malý krok pro dalších 24 hodin.</li>
      </ul>
    </div>

    <p>Pokud chceš další denní vedení k tomu, co ti mapa otevřela, nech si položit doplňující otázku v Průvodci.</p>

    <div class="cta-box">
      <a href="${mentorUrl}" class="btn">Pokračovat v Průvodci &rarr;</a>
    </div>

    <p style="font-size:13px;opacity:0.62;text-align:center;margin-top:2rem;">
      Tohle je navazující e-mail k nákupu Osobní mapy. K produktu se můžeš vrátit také tady:
      <a href="${mapUrl}" style="color:#d4af37;">Osobní mapa</a>.
    </p>
  `, 'První krok s Osobní mapou', 'Vyber jednu větu z mapy a převeď ji do jednoho malého kroku na dnešek.');
  }
};

EMAIL_TEMPLATES.personal_map_pruvodce_day3 = {
  subject: 'Mapa ti dala směr. Co tě povede dál?',
  getHtml: (data) => {
    const name = formatEmailName(data.name);
    const pricingUrl = toAbsoluteUrl('/cenik.html?source=personal_map_email_day3&feature=premium_membership&plan=pruvodce&utm_source=email&utm_campaign=personal_map_day3');
    const horoscopeUrl = toAbsoluteUrl('/horoskopy.html?source=personal_map_email_day3&feature=horoskopy&utm_source=email&utm_campaign=personal_map_day3');

    return getBaseTemplate(`
    <h1 class="h1">Mapa ukazuje směr. Průvodce drží rytmus.</h1>
    <p>${name}, Osobní mapa je dobrá pro velký odstup: co se opakuje, kde ztrácíš energii a kam dát pozornost.</p>
    <p>Jenže změna se většinou neděje v jednom velkém rozhodnutí. Děje se v malých návratech: dnes si všimneš vzorce, zítra si uhlídáš hranici, pozítří položíš lepší otázku.</p>

    <div class="feature-item">
      <strong>Proto dává smysl navázat Průvodcem:</strong>
      <ul style="margin-top:10px;padding-left:20px;">
        <li>denní a týdenní vedení, které navazuje na tvoje aktuální období,</li>
        <li>tarot, horoskopy a mentor na otázky, které se po mapě objeví,</li>
        <li>jedno místo, kam se vrátíš, když nechceš zase všechno řešit jen v hlavě.</li>
      </ul>
    </div>

    <div class="cta-box">
      <a href="${pricingUrl}" class="btn">Odemknout Průvodce &rarr;</a>
    </div>

    <p style="font-size:13px;opacity:0.62;text-align:center;margin-top:2rem;">
      Chceš zatím zůstat u volného obsahu? Otevři si
      <a href="${horoscopeUrl}" style="color:#d4af37;">dnešní horoskop</a>.
    </p>
  `, 'Navázat na Osobní mapu', 'Osobní mapa ti dala směr. Průvodce ti pomůže vracet se k němu každý den.');
  }
};

EMAIL_TEMPLATES.annual_horoscope_reflection_day1 = {
  subject: 'První krok s ročním horoskopem',
  getHtml: (data) => {
    const name = formatEmailName(data.name);
    const year = escapeHtml(data.year || new Date().getFullYear());
    const horoscopeUrl = toAbsoluteUrl('/horoskopy.html?source=annual_horoscope_email_day1&feature=daily_guidance&utm_source=email&utm_campaign=annual_horoscope_day1');
    const productUrl = toAbsoluteUrl('/rocni-horoskop.html?source=annual_horoscope_email_day1&feature=rocni_horoskop_2026&utm_source=email&utm_campaign=annual_horoscope_day1');

    return getBaseTemplate(`
    <h1 class="h1">Nečti celý rok najednou</h1>
    <p>${name}, roční horoskop je nejsilnější, když z něj nevytvoříš dlouhý seznam předpovědí.</p>
    <p>Dnes si vyber jen jednu část pro rok ${year}: měsíc, vztahové téma nebo větu, u které cítíš jasné ano nebo lehké napětí.</p>

    <div class="feature-item">
      <strong>Krátký postup na 5 minut:</strong>
      <ul style="margin-top:10px;padding-left:20px;">
        <li>Otevři PDF a najdi jednu větu, která tě zastavila.</li>
        <li>Napiš si, co pro tebe znamená v příštích 7 dnech.</li>
        <li>Vyber jeden malý krok, který nepůsobí dramaticky, ale je konkrétní.</li>
      </ul>
    </div>

    <p>Pokud chceš roční téma zasadit do dnešní energie, otevři si denní horoskop a porovnej, kde se potkávají.</p>

    <div class="cta-box">
      <a href="${horoscopeUrl}" class="btn">Otevřít dnešní horoskop &rarr;</a>
    </div>

    <p style="font-size:13px;opacity:0.62;text-align:center;margin-top:2rem;">
      Tohle je navazující e-mail k nákupu Ročního horoskopu. K produktu se můžeš vrátit také tady:
      <a href="${productUrl}" style="color:#d4af37;">Roční horoskop</a>.
    </p>
  `, 'První krok s Ročním horoskopem', 'Vyber jednu větu z ročního horoskopu a převeď ji do konkrétního kroku pro tento týden.');
  }
};

EMAIL_TEMPLATES.annual_horoscope_pruvodce_day3 = {
  subject: 'Roční téma potřebuje denní oporu',
  getHtml: (data) => {
    const name = formatEmailName(data.name);
    const year = escapeHtml(data.year || new Date().getFullYear());
    const pricingUrl = toAbsoluteUrl('/cenik.html?source=annual_horoscope_email_day3&feature=premium_membership&plan=pruvodce&utm_source=email&utm_campaign=annual_horoscope_day3');
    const horoscopeUrl = toAbsoluteUrl('/horoskopy.html?source=annual_horoscope_email_day3&feature=daily_guidance&utm_source=email&utm_campaign=annual_horoscope_day3');

    return getBaseTemplate(`
    <h1 class="h1">Výhled ukáže směr. Rytmus tě udrží v pohybu.</h1>
    <p>${name}, roční horoskop pro ${year} ti dává mapu větších témat: kde šetřit sílu, kdy jednat a čemu dát čas.</p>
    <p>Jenže v běžném týdnu se rozhoduje podle malých signálů. Právě tam dává smysl mít po ruce Průvodce, který tě vrací k otázce: co z toho pro mě platí dnes?</p>

    <div class="feature-item">
      <strong>Hvězdný Průvodce naváže na roční výhled:</strong>
      <ul style="margin-top:10px;padding-left:20px;">
        <li>denní a týdenní horoskopy pro průběžné vedení,</li>
        <li>tarot a mentor pro otázky, které se po PDF objeví,</li>
        <li>jedno místo pro návraty, když nechceš velké téma řešit jen v hlavě.</li>
      </ul>
    </div>

    <div class="cta-box">
      <a href="${pricingUrl}" class="btn">Odemknout Průvodce &rarr;</a>
    </div>

    <p style="font-size:13px;opacity:0.62;text-align:center;margin-top:2rem;">
      Chceš zatím zůstat u volného obsahu? Otevři si
      <a href="${horoscopeUrl}" style="color:#d4af37;">dnešní horoskop</a>.
    </p>
  `, 'Navázat na Roční horoskop', 'Roční horoskop ti dal směr. Průvodce ti pomůže vracet se k němu v běžných dnech.');
  }
};

const SIGN_NAMES_EMAIL = {
  beran: 'Beran', byk: 'Býk', blizenci: 'Blíženci', rak: 'Rak',
  lev: 'Lev', panna: 'Panna', vahy: 'Váhy', stir: 'Štír',
  strelec: 'Střelec', kozoroh: 'Kozoroh', vodnar: 'Vodnář', ryby: 'Ryby'
};

/**
 * Sends a personalized Roční Horoskop PDF as an email attachment.
 */
export async function sendHoroscopePdf({ to, name, sign, pdfBuffer }) {
  const client = getResend();
  if (!client) {
    console.error('[EMAIL] Resend not configured — cannot send horoscope PDF');
    return;
  }

  const signName = SIGN_NAMES_EMAIL[sign] || sign;
  const safeName = formatEmailName(name, 'Ahoj');
  const year = new Date().getFullYear();

  const html = getBaseTemplate(`
    <div style="text-align:center;padding:20px 0 10px;">
      <p style="font-family:'Cinzel',serif;font-size:18px;color:#d4af37;letter-spacing:2px;margin:0 0 6px;">Tvůj horoskop je tady ✦</p>
      <p style="font-size:15px;color:rgba(255,255,255,0.8);margin:0;">Ahoj ${safeName},</p>
    </div>
    <div style="padding:20px 0;">
      <p>Právě ti posílám tvůj <strong style="color:#d4af37;">Roční Horoskop na míru ${year}</strong> — personalizovaný výklad speciálně pro tebe jako ${signName}.</p>
      <p style="margin-top:12px;">Najdeš ho v příloze tohoto e-mailu jako PDF. Doporučuji ho otevřít v klidu, udělat si čaj a číst pomalu — každá sekce je psaná přímo pro tebe.</p>
      <div style="background:rgba(212,175,55,0.07);border-left:3px solid #d4af37;padding:16px 20px;margin:24px 0;border-radius:0 6px 6px 0;">
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);">Horoskop obsahuje: osobnostní profil, výhled pro lásku a vztahy, kariéru a finance, osobní růst, klíčové měsíce roku a závěrečné slovo.</p>
      </div>
      <p>Pokud máš jakékoli otázky, odpověz na tento e-mail.</p>
      <p style="margin-top:16px;color:rgba(255,255,255,0.6);font-size:13px;">S láskou ze hvězd,<br><span style="color:#d4af37;font-family:'Cinzel',serif;">Mystická Hvězda</span></p>
    </div>
  `, `Tvůj Roční Horoskop ${year} je tady`);

  const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

  const { data, error } = await client.emails.send(buildResendPayload({
    to,
    subject: `✦ Tvůj Roční Horoskop na míru ${year} — ${signName}`,
    html,
    headers: {},
    attachments: [{
      filename: `horoskop-${year}-${sign}.pdf`,
      content: pdfBase64,
      type: 'application/pdf',
    }],
  }));

  if (error) {
    throw new Error(`Resend error: ${error.message} (${error.statusCode})`);
  }

  return data;
}

/**
 * Sends a personalized Osobní mapa PDF as an email attachment.
 */
export async function sendPersonalMapPdf({ to, name, sign, pdfBuffer }) {
  const client = getResend();
  if (!client) {
    console.error('[EMAIL] Resend not configured — cannot send personal map PDF');
    return;
  }

  const signName = SIGN_NAMES_EMAIL[sign] || sign;
  const safeName = formatEmailName(name, 'Ahoj');
  const year = new Date().getFullYear();

  const html = getBaseTemplate(`
    <div style="text-align:center;padding:20px 0 10px;">
      <p style="font-family:'Cinzel',serif;font-size:18px;color:#d4af37;letter-spacing:2px;margin:0 0 6px;">Tvoje osobní mapa je tady ✦</p>
      <p style="font-size:15px;color:rgba(255,255,255,0.8);margin:0;">Ahoj ${safeName},</p>
    </div>
    <div style="padding:20px 0;">
      <p>Právě ti posílám tvou <strong style="color:#d4af37;">Osobní mapu zbytku roku ${year}</strong> — prémiový výklad vytvořený pro tvoje znamení ${signName} a téma, se kterým teď přicházíš.</p>
      <p style="margin-top:12px;">Najdeš ji v příloze jako PDF. Doporučuji ji otevřít v klidu a číst pomalu. Některé části možná nebudou působit důležitě hned, ale vrátí se ve chvíli, kdy se v běžném dni objeví přesně ten signál, o kterém mapa mluví.</p>
      <div style="background:rgba(212,175,55,0.07);border-left:3px solid #d4af37;padding:16px 20px;margin:24px 0;border-radius:0 6px 6px 0;">
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);">Mapa obsahuje: hvězdný podpis, osobní mantru, hlavní téma období, vztahy, práci a peníze, klíčové měsíce, konkrétní kroky, rituál a otázky k zápisu.</p>
      </div>
      <p>Pokud máš jakékoli otázky, odpověz na tento e-mail.</p>
      <p style="margin-top:16px;color:rgba(255,255,255,0.6);font-size:13px;">S láskou ze hvězd,<br><span style="color:#d4af37;font-family:'Cinzel',serif;">Mystická Hvězda</span></p>
    </div>
  `, `Tvoje Osobní mapa ${year} je tady`);

  const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

  const { data, error } = await client.emails.send(buildResendPayload({
    to,
    subject: `✦ Tvoje Osobní mapa zbytku roku ${year} — ${signName}`,
    html,
    headers: {},
    attachments: [{
      filename: `osobni-mapa-${year}-${sign}.pdf`,
      content: pdfBase64,
      type: 'application/pdf',
    }],
  }));

  if (error) {
    throw new Error(`Resend error: ${error.message} (${error.statusCode})`);
  }

  return data;
}

export default {
  sendEmail,
  sendOnboardingSequence,
  sendActivationLifecycleSequence,
  sendPauseEmail,
  sendDiscountEmail,
  sendUpgradeReminders,
  sendChurnRecoveryEmail,
  sendWeeklyFeatureEmail,
  sendTrialReminderEmails,
  sendPersonalMapLifecycleSequence,
  sendAnnualHoroscopeLifecycleSequence,
  sendHoroscopePdf,
  sendPersonalMapPdf,
  EMAIL_TEMPLATES
};
