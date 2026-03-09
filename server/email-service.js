import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'noreply@mystickahvezda.cz';

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

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: templateConfig.subject,
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
 */
export async function sendOnboardingSequence(userId, email, planType) {
  try {
    // Email 1: Welcome (immediate)
    await sendEmail({
      to: email,
      template: 'onboarding_welcome',
      data: { plan: planType }
    });

    // Email 2: Features (24 hours later - would need scheduler)
    // TODO: Implement with job queue (Bull, RabbitMQ, etc.)
    console.log(`[EMAIL] Scheduled onboarding_features for user ${userId} in 24h`);

    // Email 3: Nudge (72 hours later)
    // TODO: Implement with job queue
    console.log(`[EMAIL] Scheduled onboarding_nudge for user ${userId} in 72h`);

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

export default {
  sendEmail,
  sendOnboardingSequence,
  sendPauseEmail,
  sendDiscountEmail,
  EMAIL_TEMPLATES
};
