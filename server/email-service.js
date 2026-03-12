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
 * EMAIL TEMPLATES
 */
const EMAIL_TEMPLATES = {
  onboarding_welcome: {
    subject: 'Vítej v Mystické Hvězdě! 🌟',
    getHtml: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Cinzel', serif; background: #0a0a1a; color: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #d4af37; font-size: 32px; margin: 0; }
            .content { background: rgba(20,15,30,0.8); border: 1px solid rgba(212,175,55,0.2);
                       border-radius: 12px; padding: 30px; }
            .cta { text-align: center; margin-top: 30px; }
            .btn { background: linear-gradient(135deg, #d4af37, #ffd700);
                   color: #000; padding: 12px 30px; border-radius: 6px;
                   text-decoration: none; font-weight: bold; display: inline-block; }
            .footer { text-align: center; margin-top: 40px; color: rgba(255,255,255,0.5); font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌟 Vítej!</h1>
            </div>
            <div class="content">
              <p>Gratuluji! Právě ses zaregistroval do Mystické Hvězdy.</p>
              <p>Tvé prémiové předplatné (<strong>${data.plan === 'premium_monthly' ? 'Hvězdný Průvodce' : 'Osvícení'}</strong>) je nyní aktivní a máš přístup k:</p>
              <ul>
                <li>📖 Neomezeným tarotovým výkladům</li>
                <li>⭐ Denním a měsíčním horoskopům</li>
                <li>🤖 AI Mentorovi (neomezené otázky)</li>
                <li>🗺️ Natalním kartám a astromatpě</li>
                <li>🔢 Numerologickým rozborem</li>
              </ul>
              <div class="cta">
                <a href="${process.env.APP_URL}/horoskopy.html" class="btn">Začít s horoskopem →</a>
              </div>
              <p style="margin-top: 30px; font-size: 14px; color: rgba(255,255,255,0.7);">
                Máš otázku? Napiš nám na <strong>support@mystickahvezda.cz</strong>
              </p>
            </div>
            <div class="footer">
              <p>© 2026 Mystická Hvězda | Tvoje cesta k sebepoznání</p>
            </div>
          </div>
        </body>
      </html>
    `
  },

  onboarding_features: {
    subject: 'Tvůj nový svět se otevírá ✨',
    getHtml: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Cinzel', serif; background: #0a0a1a; color: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .feature { background: rgba(212,175,55,0.1); border-left: 4px solid #d4af37;
                       padding: 15px; margin: 15px 0; border-radius: 4px; }
            .btn { background: #d4af37; color: #000; padding: 10px 20px;
                   border-radius: 4px; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #d4af37;">✨ Objevuj nové možnosti</h1>
            <p>Včera ses připojil, dnes máš přístup k funkcím, které změní tvoji cestu:</p>
            ${(data.features || []).map(f => `<div class="feature">📌 ${f}</div>`).join('')}
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.APP_URL}/mentor.html" class="btn">Potkej svého AI Mentora →</a>
            </div>
          </div>
        </body>
      </html>
    `
  },

  onboarding_nudge: {
    subject: 'Byly jsi tu? Tvůj AI mentor čeká... 🤖',
    getHtml: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Cinzel', serif; background: #0a0a1a; color: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .highlight { background: linear-gradient(135deg, rgba(155,89,182,0.2), rgba(212,175,55,0.1));
                         border: 1px solid rgba(155,89,182,0.3); padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #9b59b6;">Psst... 🤫</h1>
            <div class="highlight">
              <p>Viděli jsme, že ses přihlásil v "${data.plan === 'premium_monthly' ? 'plánu Hvězdný Průvodce' : 'plánu Osvícení'}",
                 ale zatím ses nepodíval na všechny funkce.</p>
              <p><strong>Tvůj AI mentor má pro tebe připravenu první otázku:</strong></p>
              <blockquote style="font-style: italic; color: #d4af37; margin: 20px 0;">
                "Jaká je tvá největší otázka v životě právě teď?"
              </blockquote>
              <p>Odpověz a nech se vést cestou k odpovědi...</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.APP_URL}/mentor.html" style="background: #9b59b6; color: white; padding: 12px 30px;
                 border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                Chatuj s mentorem →
              </a>
            </div>
          </div>
        </body>
      </html>
    `
  },

  subscription_paused: {
    subject: '⏸️ Tvé předplatné je pozastaveno',
    getHtml: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Cinzel', serif; background: #0a0a1a; color: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .info { background: rgba(76,201,240,0.1); border: 1px solid rgba(76,201,240,0.3);
                    padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #4cc9f0;">⏸️ Předplatné pozastaveno</h1>
            <div class="info">
              <p>Tvé předplatné jsme úspěšně pozastavili na <strong>${data.daysUntilResume || 30} dní</strong>.</p>
              <p style="font-size: 14px; color: rgba(255,255,255,0.7);">
                ✓ Bez dodatečných poplatků<br>
                ✓ Tvá data zůstávají zachována<br>
                ✓ Automaticky se obnoví po ${data.daysUntilResume || 30} dnech
              </p>
              <p style="margin-top: 20px;">Pokud se změníš a chceš se vrátit dříve,
                <a href="${process.env.APP_URL}/profil.html" style="color: #4cc9f0;">znovuaktivuj předplatné zde</a>.</p>
            </div>
            <p style="text-align: center; margin-top: 30px; color: rgba(255,255,255,0.5); font-size: 12px;">
              Chceme se zlepšit. Zpětná vazba je vítaná: support@mystickahvezda.cz
            </p>
          </div>
        </body>
      </html>
    `
  },

  discount_applied: {
    subject: '💝 Skvělá zpráva - máš slevu!',
    getHtml: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Cinzel', serif; background: #0a0a1a; color: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .offer { background: linear-gradient(135deg, rgba(212,175,55,0.2), rgba(255,215,0,0.1));
                     border: 2px solid #d4af37; padding: 30px; border-radius: 8px; text-align: center; }
            .discount { font-size: 48px; color: #ffd700; font-weight: bold; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #d4af37; text-align: center;">💝 Máš speciální nabídku!</h1>
            <div class="offer">
              <p>Abychom tě přiměli zůstat, máme pro tebe speciální nabídku:</p>
              <div class="discount">${data.discount || 50}% SLEVA</div>
              <p style="font-size: 18px; margin: 20px 0;">na <strong>${data.months || 3} měsíců</strong></p>
              <p style="color: rgba(255,255,255,0.7); font-size: 14px;">
                Sleva se automaticky aplikuje na tvůj účet.<br>
                Zůstaň s námi a objevuj hloubku svého bytí! ✨
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.APP_URL}/profil.html" style="background: #d4af37; color: #000; padding: 12px 30px;
                 border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                Věřit se svému předplatnému →
              </a>
            </div>
          </div>
        </body>
      </html>
    `
  },
  upgrade_reminder_day7: {
    subject: 'Vidím, co ti chybí... 👀',
    getHtml: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Cinzel', serif; background: #0a0a1a; color: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .comparison { background: rgba(155,89,182,0.1); border: 1px solid rgba(155,89,182,0.3);
                         padding: 20px; border-radius: 8px; margin: 20px 0; }
            .feature { padding: 10px 0; border-bottom: 1px solid rgba(212,175,55,0.1); }
            .feature:last-child { border-bottom: none; }
            .feature strong { color: #d4af37; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #9b59b6;">Vidím, co ti chybí... 👀</h1>
            <p>Používáš základní plán, ale tvoje otázky si zaslouží více...</p>
            <div class="comparison">
              <h3 style="color: #d4af37; margin-top: 0;">Co bys mohl dělat s Hvězdným Průvodcem:</h3>
              <div class="feature">✨ <strong>Neomezené tarotové výklady</strong> (místo 1 za den)</div>
              <div class="feature">📅 <strong>Týdenní a měsíční horoskopy</strong> (ne jen denní)</div>
              <div class="feature">🤖 <strong>AI Mentor chat</strong> bez omezení</div>
              <div class="feature">🔢 <strong>Numerologie a astrokartografie</strong></div>
            </div>
            <p style="text-align: center; margin-top: 30px;">
              <a href="${process.env.APP_URL}/cenik.html" style="background: #9b59b6; color: white; padding: 12px 30px;
                 border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                Upgradovat na Premium →
              </a>
            </p>
          </div>
        </body>
      </html>
    `
  },

  upgrade_reminder_day14: {
    subject: '⏰ Poslední šance - 50% sleva na Premium!',
    getHtml: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Cinzel', serif; background: #0a0a1a; color: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .offer { background: linear-gradient(135deg, rgba(255,107,107,0.2), rgba(212,175,55,0.2));
                     border: 2px solid #ff6b6b; padding: 30px; border-radius: 8px; text-align: center; }
            .price { font-size: 42px; color: #ff6b6b; font-weight: bold; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #ff6b6b; text-align: center;">⏰ Poslední šance!</h1>
            <div class="offer">
              <p>Tato nabídka platí jen pro dalších 24 hodin:</p>
              <div class="price">199 Kč → <span style="text-decoration: line-through;">99.50 Kč</span></div>
              <p style="font-size: 16px;">🎁 <strong>50% SLEVA</strong> na Hvězdný Průvodce</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.APP_URL}/cenik.html?utm_source=email&utm_campaign=upgrade_day14&utm_content=cta"
                 style="background: #ff6b6b; color: white; padding: 12px 30px;
                 border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                KOUPIT ZA 99.50 KČ →
              </a>
            </div>
          </div>
        </body>
      </html>
    `
  },

  churn_recovery_day25: {
    subject: '💔 Chceme tě zpátky - 30% sleva čeká',
    getHtml: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Cinzel', serif; background: #0a0a1a; color: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .msg { background: rgba(52,152,219,0.1); border: 1px solid rgba(52,152,219,0.3);
                   padding: 20px; border-radius: 8px; }
            .discount { background: linear-gradient(135deg, rgba(52,152,219,0.2), rgba(212,175,55,0.1));
                       border: 2px solid #3498db; padding: 20px; border-radius: 8px;
                       text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #3498db; text-align: center;">💔 Chceme tě zpátky!</h1>
            <div class="msg">
              <p>Všimli jsme si, že jsi chvíli nebyl aktivní. Víme, že se věci v životě mění...</p>
              <p>Chceme ti dát jednu poslední šanci na objevování:</p>
            </div>
            <div class="discount">
              <p style="margin: 0; color: #3498db; font-weight: bold;">SPECIÁLNÍ NABÍDKA PRO NÁVRAT</p>
              <div style="font-size: 36px; color: #d4af37; font-weight: bold; margin: 10px 0;">30% SLEVA</div>
              <p style="margin: 10px 0; color: rgba(255,255,255,0.8);">na prvních 3 měsíce Premium</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.APP_URL}/cenik.html?utm_source=email&utm_campaign=churn_recovery&utm_content=cta"
                 style="background: #3498db; color: white; padding: 12px 30px;
                 border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                Vrátit se s 30% slevou →
              </a>
            </div>
          </div>
        </body>
      </html>
    `
  },

  feature_weekly: {
    subject: 'Nový týden, nová funkce pro tebe ✨',
    getHtml: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Cinzel', serif; background: #0a0a1a; color: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .feature-box { background: rgba(212,175,55,0.1); border-left: 4px solid #d4af37;
                          padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #d4af37;">✨ Objev novou funkci</h1>
            <div class="feature-box">
              <h2 style="color: #d4af37; margin-top: 0;">${data.feature_title || 'Astrokartografia'}</h2>
              <p>${data.feature_description || 'Zjistěte, kde na světě je vaše energie nejsilnější...'}</p>
              <ul>
                ${(data.benefits || []).map(b => `<li>${b}</li>`).join('')}
              </ul>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${data.feature_url || process.env.APP_URL + '/profil.html'}"
                 style="background: #d4af37; color: #000; padding: 12px 30px;
                 border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                Zkusit nyní →
              </a>
            </div>
          </div>
        </body>
      </html>
    `
  },
  admin_contact_notification: {
    subject: (data) => `[Kontakt] ${data.subject} — od ${data.name}`,
    getHtml: (data) => `
      <!DOCTYPE html><html><head><meta charset="utf-8"></head>
      <body style="font-family:sans-serif;background:#f5f5f5;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;">
          <h2 style="color:#333;margin-top:0;">Nová zpráva z kontaktního formuláře</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px;font-weight:bold;width:120px;color:#555;">Jméno:</td>
              <td style="padding:8px;">${data.name}</td>
            </tr>
            <tr style="background:#f9f9f9;">
              <td style="padding:8px;font-weight:bold;color:#555;">Email:</td>
              <td style="padding:8px;"><a href="mailto:${data.email}">${data.email}</a></td>
            </tr>
            <tr>
              <td style="padding:8px;font-weight:bold;color:#555;">Předmět:</td>
              <td style="padding:8px;">${data.subject}</td>
            </tr>
            <tr style="background:#f9f9f9;">
              <td style="padding:8px;font-weight:bold;vertical-align:top;color:#555;">Zpráva:</td>
              <td style="padding:8px;white-space:pre-wrap;">${data.message}</td>
            </tr>
          </table>
          <p style="margin-top:20px;color:#999;font-size:12px;">
            Odesláno z mystickahvezda.cz
          </p>
        </div>
      </body></html>
    `
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
