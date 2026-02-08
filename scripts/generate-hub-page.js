
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'zodiac-matrix.json');
const OUTPUT_FILE = path.join(ROOT_DIR, 'partnerska-shoda', 'index.html');

const zodiacSigns = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Generate Matrix HTML
let gridHtml = '';

zodiacSigns.forEach(sign1 => {
    gridHtml += `<div class="zodiac-group">`;
    gridHtml += `<h3 class="zodiac-group-title"><span class="icon">${getSignIcon(sign1.id)}</span> ${sign1.name} a...</h3>`;
    gridHtml += `<div class="links-grid">`;

    zodiacSigns.forEach(sign2 => {
        gridHtml += `<a href="${sign1.id}-${sign2.id}.html" class="link-card">
        <span class="badg">${sign2.element}</span>
        ${sign2.name}
     </a>`;
    });

    gridHtml += `</div></div>`;
});

function getSignIcon(id) {
    const icons = {
        aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
        libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓'
    };
    return icons[id] || '⭐';
}

const html = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partnerská shoda podle znamení | Mystická Hvězda</title>
  <meta name="description" content="Kompletní přehled partnerské shody všech znamení zvěrokruhu. Najděte ideálního partnera podle hvězd.">
  <link rel="stylesheet" href="../css/style.v2.css">
  <style>
    .zodiac-group { margin-bottom: 3rem; background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 15px; }
    .zodiac-group-title { color: var(--color-mystic-gold); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.8rem; }
    .link-card { 
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: rgba(10,10,26,0.6); border: 1px solid rgba(255,255,255,0.1);
        padding: 1rem; border-radius: 8px; text-decoration: none; color: white;
        transition: all 0.2s;
    }
    .link-card:hover { transform: translateY(-3px); border-color: var(--color-primary); background: rgba(155, 89, 182, 0.2); }
    .badg { font-size: 0.7rem; opacity: 0.6; margin-bottom: 0.2rem; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="stars"></div>
  <header class="header">
    <div class="container">
        <a href="../index.html" class="logo">Mystická Hvězda</a>
    </div>
  </header>
  <main class="container section">
    <div class="section__header">
      <h1 class="section__title">Partnerská shoda - Rozcestník</h1>
      <p>Vyberte své znamení a zjistěte, jak se hodíte k ostatním.</p>
    </div>
    
    ${gridHtml}
    
  </main>
</body>
</html>`;

fs.writeFileSync(OUTPUT_FILE, html);
console.log('✅ Hub page generated at partnerska-shoda/index.html');
