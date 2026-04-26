/**
 * Email newsletter service using Resend
 * Usage: node server/scripts/send-newsletter.js
 * 
 * Setup:
 * 1. npm install resend
 * 2. Add RESEND_API_KEY=re_... to server/.env
 * 3. Add FROM_EMAIL=newsletter@mystickahvezda.cz to server/.env
 * 4. Verify domain in Resend dashboard
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ── Config ──────────────────────────────────────────────────────────────────
const FROM = process.env.FROM_EMAIL || 'Mystická Hvězda <newsletter@mystickahvezda.cz>';
const DOMAIN = 'https://www.mystickahvezda.cz';
const BATCH_SIZE = 50; // Resend free tier limit per request

// ── Email HTML template ──────────────────────────────────────────────────────
function buildEmailHtml({ subject, preheader, headline, body, ctaText, ctaUrl, week }) {
    return `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#090915;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#090915;">
  <tr><td align="center" style="padding:40px 20px;">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#1a0a2e,#0f0a1f);border-radius:20px 20px 0 0;padding:40px 40px 30px;text-align:center;border-bottom:1px solid rgba(235,192,102,0.2);">
        <div style="font-size:2rem;margin-bottom:8px;">🌙</div>
        <div style="font-family:Georgia,serif;font-size:1.5rem;color:#ebc066;font-weight:bold;letter-spacing:1px;">Mystická Hvězda</div>
        <div style="font-size:0.8rem;color:rgba(255,255,255,0.4);margin-top:4px;letter-spacing:2px;text-transform:uppercase;">Váš hvězdný průvodce</div>
      </td></tr>
      
      <!-- Body -->
      <tr><td style="background:rgba(10,10,26,0.95);padding:40px;">
        <div style="font-size:0.75rem;color:rgba(235,192,102,0.6);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Týden ${week}</div>
        <h1 style="font-family:Georgia,serif;font-size:1.8rem;color:#ffffff;margin:0 0 20px;line-height:1.3;">${headline}</h1>
        <div style="color:rgba(255,255,255,0.75);line-height:1.8;font-size:0.95rem;">${body}</div>
        
        <!-- CTA -->
        <div style="text-align:center;margin:32px 0;">
          <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#b8860b);color:#0f0a1f;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:bold;font-size:0.95rem;">${ctaText}</a>
        </div>

        <!-- Quick links -->
        <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:20px;margin-top:16px;">
          <div style="color:rgba(255,255,255,0.4);font-size:0.8rem;margin-bottom:12px;text-align:center;">Dnešní nástroje</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
            <a href="${DOMAIN}/tarot.html" style="color:#ebc066;text-decoration:none;font-size:0.85rem;background:rgba(235,192,102,0.08);padding:6px 14px;border-radius:50px;border:1px solid rgba(235,192,102,0.2);">🃏 Tarot</a>
            <a href="${DOMAIN}/horoskopy.html" style="color:#ebc066;text-decoration:none;font-size:0.85rem;background:rgba(235,192,102,0.08);padding:6px 14px;border-radius:50px;border:1px solid rgba(235,192,102,0.2);">♈ Horoskopy</a>
            <a href="${DOMAIN}/lunace.html" style="color:#ebc066;text-decoration:none;font-size:0.85rem;background:rgba(235,192,102,0.08);padding:6px 14px;border-radius:50px;border:1px solid rgba(235,192,102,0.2);">🌙 Lunace</a>
            <a href="${DOMAIN}/kristalova-koule.html" style="color:#ebc066;text-decoration:none;font-size:0.85rem;background:rgba(235,192,102,0.08);padding:6px 14px;border-radius:50px;border:1px solid rgba(235,192,102,0.2);">🔮 Křišťál</a>
          </div>
        </div>
      </td></tr>
      
      <!-- Footer -->
      <tr><td style="background:rgba(5,5,15,0.8);border-radius:0 0 20px 20px;padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
        <p style="color:rgba(255,255,255,0.3);font-size:0.75rem;margin:0 0 8px;">Mystická Hvězda • ${DOMAIN}</p>
        <p style="color:rgba(255,255,255,0.25);font-size:0.72rem;margin:0;">
          Obdrželi jste tento email, protože jste se přihlásili k odběru. 
          <a href="${DOMAIN}/api/newsletter/unsubscribe?email={{EMAIL}}" style="color:rgba(235,192,102,0.4);text-decoration:underline;">Odhlásit se</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Send newsletter ──────────────────────────────────────────────────────────
async function sendNewsletter(newsletterData) {
    let Resend;
    try {
        Resend = (await import('resend')).Resend;
    } catch {
        console.error('❌ Resend není nainstalován. Spusťte: npm install resend');
        process.exit(1);
    }

    if (!process.env.RESEND_API_KEY) {
        console.error('❌ Chybí RESEND_API_KEY v .env souboru.');
        console.log('  1. Registrujte se na https://resend.com (zdarma)');
        console.log('  2. Přidejte API klíč do server/.env jako: RESEND_API_KEY=re_...');
        process.exit(1);
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Load subscribers from Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: subscribers, error } = await supabase
        .from('newsletter_subscribers')
        .select('email')
        .eq('is_active', true)
        .limit(10000);

    if (error) {
        console.error('❌ Chyba načítání odběratelů:', error.message);
        process.exit(1);
    }

    console.log(`📧 Odesílám newsletter ${subscribers.length} odběratelům...`);

    const week = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 86400000));
    const html = buildEmailHtml({ ...newsletterData, week });

    let sent = 0, failed = 0;

    // Send in batches
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
        const batch = subscribers.slice(i, i + BATCH_SIZE);
        for (const sub of batch) {
            try {
                await resend.emails.send({
                    from: FROM,
                    to: sub.email,
                    subject: newsletterData.subject,
                    html: html.replace('{{EMAIL}}', encodeURIComponent(sub.email))
                });
                sent++;
            } catch (err) {
                console.warn(`  ⚠️ Chyba pro ${sub.email}: ${err.message}`);
                failed++;
            }
        }
        // Small delay between batches
        await new Promise(r => setTimeout(r, 500));
        console.log(`  Odesláno: ${Math.min(i + BATCH_SIZE, subscribers.length)}/${subscribers.length}`);
    }

    console.log(`\n✅ Newsletter odeslán:`);
    console.log(`  Úspěšně: ${sent}`);
    console.log(`  Chyby: ${failed}`);
}

// ── Example newsletter content ──────────────────────────────────────────────
await sendNewsletter({
    subject: '🌙 Váš týdenní lunární přehled – energie a tipy pro tento týden',
    preheader: 'Měsíc v Rybách přináší čas introspekce a snění.',
    headline: 'Lunární energie tohoto týdne: Měsíc v Rybách',
    body: `<p>Tento týden prochází Měsíc citlivými a intuitivními Rybami. Je to čas, kdy emoce mohou být intenzivnější, sny živější a intuice spolehlivější než logika.</p>
    <p><strong>Co to znamená pro váš den:</strong></p>
    <ul style="padding-left:1.2rem;">
      <li style="margin-bottom:8px;">🧘 Věnujte čas tichu – meditace nebo procházka v přírodě nabitá 10×</li>
      <li style="margin-bottom:8px;">🎨 Kreativita proudí – skvělý čas pro umění, psaní nebo hudbu</li>
      <li style="margin-bottom:8px;">💤 Sny jsou informace – mějte zápisník u postele</li>
      <li>❤️ Empatie je na vrcholu – buďte laskaví k sobě i druhým</li>
    </ul>
    <p style="margin-top:16px;">Kompletní lunární kalendář a countdown do příštího Novolunění najdete na stránce Lunace.</p>`,
    ctaText: '🌙 Zobrazit lunární kalendář →',
    ctaUrl: `${DOMAIN}/lunace.html`
});
