import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import { generateHoroscopeContent, renderPdf } from '../services/horoscope-pdf.js';
import { sendHoroscopePdf } from '../email-service.js';

const TEST = {
    name: 'Pavel',
    birthDate: '1989-01-01',
    sign: 'kozoroh',
    email: process.env.TEST_EMAIL || 'test@example.com',
};

console.log('[TEST] Generuji obsah horoskopem přes Claude API...');
const sections = await generateHoroscopeContent(TEST);
console.log('[TEST] Sekce vygenerovány:', Object.keys(sections).join(', '));

console.log('[TEST] Renderuji PDF přes Playwright...');
const pdfBuffer = await renderPdf({ ...TEST, sections });
console.log(`[TEST] PDF hotové: ${(pdfBuffer.length / 1024).toFixed(0)} KB`);

console.log(`[TEST] Posílám email na ${TEST.email}...`);
await sendHoroscopePdf({ to: TEST.email, name: TEST.name, sign: TEST.sign, pdfBuffer });
console.log('[TEST] ✅ Email odeslán!');
