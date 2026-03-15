import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

let resend = null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@mystickahvezda.cz';

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

/**
 * BASE EMAIL TEMPLATE
 * Provides a unified, premium mystical look for all emails
 */
function getBaseTemplate(content, title = 'Mystická Hvězda') {
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

  onboarding_nudge: {
    subject: 'Tvůj Duchovní průvodce na tebe čeká... ✨',
    getHtml: (data) => getBaseTemplate(`
      <h1 class="h1">Nezapomněl jsi na něco?</h1>
      <div style="background: rgba(155,89,182,0.1); border: 1px solid rgba(155,89,182,0.3); padding: 25px; border-radius: 12px; margin-bottom: 25px;">
        <p>Tvůj Duchovní průvodce pro tebe má připravenu úvahu k tvému aktuálnímu plánu <span class="highlight">${data.plan === 'premium_monthly' ? 'Hvězdný Průvodce' : 'Osvícení'}</span>.</p>
        
        <blockquote style="font-style: italic; color: #d4af37; border-left: 2px solid #9b59b6; padding-left: 15px; margin: 20px 0;">
          "Jaká je tvá největší životní otázka v tuto chvíli? Jsi připraven slyšet odpověď?"
        </blockquote>
        
        <p>Nechej se vést a odhal tajemství, která na tebe čekají.</p>
      </div>

      <div class="cta-box">
        <a href="${process.env.APP_URL}/mentor.html" class="btn" style="background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white !important;">Chatovat s Duchovním průvodcem →</a>
      </div>
    `, 'Ozvěna z vesmíru')
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
          ${data.discount || 50}% SLEVA
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
    subject: '⏰ Poslední šance - 50% sleva na Premium!',
    getHtml: (data) => getBaseTemplate(`
      <h1 class="h1">Hvězdná příležitost končí</h1>
      <div style="background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 25px;">
        <p>Tato limitovaná nabídka vyprší již za 24 hodin:</p>
        <div style="font-size: 32px; color: #ff6b6b; font-weight: 700; margin: 15px 0;">
          199 Kč → 99.50 Kč
        </div>
        <p><strong>🎁 50% SLEVA na první měsíc</strong></p>
      </div>

      <p style="text-align: center;">Nechej si poradit od hvězd za poloviční cenu.</p>

      <div class="cta-box">
        <a href="${process.env.APP_URL}/cenik.html?utm_source=email&utm_campaign=upgrade_day14" class="btn" style="background: linear-gradient(135deg, #ff6b6b, #ee5253); color: white !important;">Aktivovat slevu 50% →</a>
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
  }

};

/**
 * Send email via Resend
 */
export async function sendEmail(emailConfig) {
  try {
    const { to, template, data = {} } = emailConfig;

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

    const response = await resendClient.emails.send({
      from: FROM_EMAIL,
      to,
      subject: typeof templateConfig.subject === 'function' ? templateConfig.subject(data) : templateConfig.subject,
      html
    });

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

    // Email 2: Day 14 - "50% discount (limited time)"
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

export default {
  sendEmail,
  sendOnboardingSequence,
  sendPauseEmail,
  sendDiscountEmail,
  sendUpgradeReminders,
  sendChurnRecoveryEmail,
  sendWeeklyFeatureEmail,
  EMAIL_TEMPLATES
};
