import { EMAIL_TEMPLATES } from '../server/email-service.js';
import fs from 'fs';
import path from 'path';

const testData = {
  onboarding_welcome: { plan: 'premium_monthly' },
  onboarding_features: { features: ['Tarot denní výklad', 'AI Mentor neomezeně', 'Osobní horoskop'] },
  onboarding_nudge: { plan: 'premium_yearly' },
  subscription_paused: { daysUntilResume: 45 },
  discount_applied: { discount: 40, months: 6 },
  upgrade_reminder_day7: {},
  upgrade_reminder_day14: {},
  churn_recovery_day25: {},
  feature_weekly: {
    feature_title: 'Numerologie jména',
    feature_description: 'Zjisti, jaké vibrace nese tvé jméno a jak ovlivňuje tvůj životní úspěch.',
    benefits: ['Analýza osudového čísla', 'Vibrace jména a příjmení', 'Tipy pro harmonizaci']
  },
  admin_contact_notification: {
    name: 'Jan Novák',
    email: 'jan@example.cz',
    subject: 'Dotaz k tarotům',
    message: 'Dobrý den, chtěl bych se zeptat, zda plánujete přidat více balíčků karet do výkladu? Děkuji.'
  }
};

const outputDir = path.join(process.cwd(), 'tmp_email_previews');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

console.log('Generating email template previews...');

for (const [templateName, config] of Object.entries(EMAIL_TEMPLATES)) {
  try {
    const html = config.getHtml(testData[templateName] || {});
    const filePath = path.join(outputDir, `${templateName}.html`);
    fs.writeFileSync(filePath, html);
    console.log(`OK Generated: ${templateName}.html`);
  } catch (err) {
    console.error(`ERROR Failed to generate ${templateName}:`, err.message);
  }
}

console.log(`\nPreviews generated in: ${outputDir}`);
