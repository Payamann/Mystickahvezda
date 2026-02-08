import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../../public/images/planets');

const SWATCHES = {
    sun: { stop1: '#FFD700', stop2: '#FF8C00', glow: '#FF4500' },
    moon: { stop1: '#F0F0F0', stop2: '#C0C0C0', crater: '#A9A9A9' },
    mercury: { stop1: '#E0E0E0', stop2: '#708090' },
    venus: { stop1: '#FFFACD', stop2: '#FFDAB9' },
    mars: { stop1: '#FF6347', stop2: '#8B0000' },
    jupiter: { stop1: '#DEB887', stop2: '#8B4513' },
    saturn: { stop1: '#F4C430', stop2: '#CD853F', ring: '#D2691E' }
};

const PLANETS = {
    sun: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad-sun" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" style="stop-color:${SWATCHES.sun.stop1};stop-opacity:1" />
      <stop offset="80%" style="stop-color:${SWATCHES.sun.stop2};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${SWATCHES.sun.glow};stop-opacity:1" />
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <circle cx="50" cy="50" r="45" fill="url(#grad-sun)" filter="url(#glow)" />
  <!-- Solar flares hints -->
  <path d="M50 2 A 2 2 0 0 1 50 5" stroke="${SWATCHES.sun.stop1}" stroke-width="2" />
  <path d="M50 98 A 2 2 0 0 1 50 95" stroke="${SWATCHES.sun.stop1}" stroke-width="2" />
  <path d="M2 50 A 2 2 0 0 1 5 50" stroke="${SWATCHES.sun.stop1}" stroke-width="2" />
  <path d="M98 50 A 2 2 0 0 1 95 50" stroke="${SWATCHES.sun.stop1}" stroke-width="2" />
</svg>`,

    moon: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad-moon" cx="40%" cy="40%" r="60%" fx="40%" fy="40%">
      <stop offset="0%" style="stop-color:${SWATCHES.moon.stop1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${SWATCHES.moon.stop2};stop-opacity:1" />
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#grad-moon)" />
  <!-- Craters -->
  <circle cx="30" cy="40" r="8" fill="${SWATCHES.moon.crater}" opacity="0.3" />
  <circle cx="70" cy="60" r="5" fill="${SWATCHES.moon.crater}" opacity="0.2" />
  <circle cx="55" cy="25" r="4" fill="${SWATCHES.moon.crater}" opacity="0.2" />
</svg>`,

    mercury: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad-mercury" cx="30%" cy="30%" r="70%" fx="30%" fy="30%">
      <stop offset="0%" style="stop-color:${SWATCHES.mercury.stop1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${SWATCHES.mercury.stop2};stop-opacity:1" />
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#grad-mercury)" />
  <path d="M20 50 Q 50 80 80 50" fill="none" stroke="${SWATCHES.mercury.stop2}" opacity="0.1" stroke-width="2"/>
</svg>`,

    venus: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad-venus" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" style="stop-color:${SWATCHES.venus.stop1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${SWATCHES.venus.stop2};stop-opacity:1" />
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#grad-venus)" />
  <!-- Atmosphere bands -->
  <path d="M10 50 Q 50 60 90 50" fill="none" stroke="#fff" opacity="0.3" stroke-width="5"/>
  <path d="M20 70 Q 50 80 80 70" fill="none" stroke="#fff" opacity="0.2" stroke-width="3"/>
</svg>`,

    mars: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad-mars" cx="40%" cy="40%" r="60%">
      <stop offset="0%" style="stop-color:${SWATCHES.mars.stop1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${SWATCHES.mars.stop2};stop-opacity:1" />
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#grad-mars)" />
  <!-- Surface features -->
  <path d="M30 40 Q 50 50 70 30" fill="none" stroke="#8B0000" stroke-width="4" opacity="0.3" stroke-linecap="round"/>
  <circle cx="60" cy="70" r="10" fill="#8B0000" opacity="0.2"/>
</svg>`,

    jupiter: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad-jupiter" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${SWATCHES.jupiter.stop1}" />
      <stop offset="20%" style="stop-color:${SWATCHES.jupiter.stop2}" />
      <stop offset="40%" style="stop-color:${SWATCHES.jupiter.stop1}" />
      <stop offset="60%" style="stop-color:${SWATCHES.jupiter.stop2}" />
      <stop offset="80%" style="stop-color:${SWATCHES.jupiter.stop1}" />
      <stop offset="100%" style="stop-color:${SWATCHES.jupiter.stop2}" />
    </linearGradient>
    <radialGradient id="shade-jupiter" cx="50%" cy="50%" r="50%">
      <stop offset="80%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.3"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#grad-jupiter)" />
  <circle cx="50" cy="50" r="48" fill="url(#shade-jupiter)" />
  <!-- Great Red Spot -->
  <ellipse cx="70" cy="65" rx="12" ry="8" fill="#8B4513" opacity="0.6"/>
</svg>`,

    saturn: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad-saturn" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:${SWATCHES.saturn.stop1}" />
      <stop offset="100%" style="stop-color:${SWATCHES.saturn.stop2}" />
    </radialGradient>
  </defs>
  
  <!-- Back Rings -->
  <path d="M5 50 Q 50 20 95 50" fill="none" stroke="${SWATCHES.saturn.ring}" stroke-width="6" opacity="0.7"/>
  <path d="M10 50 Q 50 25 90 50" fill="none" stroke="${SWATCHES.saturn.ring}" stroke-width="4" opacity="0.9"/>

  <!-- Planet -->
  <circle cx="50" cy="50" r="35" fill="url(#grad-saturn)" />
  
  <!-- Front Rings -->
  <path d="M5 50 Q 50 80 95 50" fill="none" stroke="${SWATCHES.saturn.ring}" stroke-width="6" opacity="0.7"/>
  <path d="M10 50 Q 50 75 90 50" fill="none" stroke="${SWATCHES.saturn.ring}" stroke-width="4" opacity="0.9"/>
</svg>`
};

async function main() {
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        console.log(`📂 Output directory: ${OUTPUT_DIR}`);

        for (const [name, svgContent] of Object.entries(PLANETS)) {
            const filePath = path.join(OUTPUT_DIR, `${name}.svg`);
            await fs.writeFile(filePath, svgContent.trim());
            console.log(`✅ Saved ${name}.svg`);
        }

    } catch (error) {
        console.error('Fatal Error:', error);
    }
}

main();
