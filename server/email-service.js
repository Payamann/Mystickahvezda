import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

let resend = null;
const DEFAULT_FROM_EMAIL = 'noreply@mystickahvezda.cz';
const DEFAULT_BRAND_NAME = 'Mysticka Hvezda';
const FROM_EMAIL = formatFromEmail(process.env.FROM_EMAIL || DEFAULT_FROM_EMAIL);
const REPLY_TO_EMAIL = sanitizeHeaderValue(process.env.REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL || '');
const APP_URL = process.env.APP_URL || 'https://www.mystickahvezda.cz';

// Validate email configuration on startup
if (!process.env.FROM_EMAIL && process.env.NODE_ENV === 'production') {
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
  const year = new Date().getFullYear();

  const html = getBaseTemplate(`
    <div style="text-align:center;padding:20px 0 10px;">
      <p style="font-family:'Cinzel',serif;font-size:18px;color:#d4af37;letter-spacing:2px;margin:0 0 6px;">Tvůj horoskop je tady ✦</p>
      <p style="font-size:15px;color:rgba(255,255,255,0.8);margin:0;">Ahoj ${name},</p>
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
  const year = new Date().getFullYear();

  const html = getBaseTemplate(`
    <div style="text-align:center;padding:20px 0 10px;">
      <p style="font-family:'Cinzel',serif;font-size:18px;color:#d4af37;letter-spacing:2px;margin:0 0 6px;">Tvoje osobní mapa je tady ✦</p>
      <p style="font-size:15px;color:rgba(255,255,255,0.8);margin:0;">Ahoj ${name},</p>
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
  sendPauseEmail,
  sendDiscountEmail,
  sendUpgradeReminders,
  sendChurnRecoveryEmail,
  sendWeeklyFeatureEmail,
  sendTrialReminderEmails,
  sendHoroscopePdf,
  sendPersonalMapPdf,
  EMAIL_TEMPLATES
};
