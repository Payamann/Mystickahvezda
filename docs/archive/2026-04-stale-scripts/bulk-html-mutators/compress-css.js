import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const cssPath = path.join(rootDir, 'css', 'style.v2.css');
const minCssPath = path.join(rootDir, 'css', 'style.v2.min.css');

if (!fs.existsSync(cssPath)) {
    console.error('Zdrojový CSS soubor nenalezen.');
    process.exit(1);
}

let cssText = fs.readFileSync(cssPath, 'utf8');

// 1. Odstraníme komentáře (neprolomíme URL obsahující /*)
cssText = cssText.replace(/\/\*[\s\S]*?\*\//g, '');

// 2. Odstraníme zbytečné mezery, tabulátory, zalomení řádků
cssText = cssText.replace(/\s+/g, ' ');

// 3. Odstraníme mezery okolo znaků { } ; : ,
cssText = cssText.replace(/\s*([\{\}\:\;\,])\s*/g, '$1');

// 4. Odstraníme prázdné pravidla (např. body{})
cssText = cssText.replace(/[^\}\{]+\{\}/g, '');

fs.writeFileSync(minCssPath, cssText, 'utf8');

const originalSize = fs.statSync(cssPath).size;
const newSize = fs.statSync(minCssPath).size;
const savedPercent = ((originalSize - newSize) / originalSize * 100).toFixed(2);

console.log(`CSS úspěšně minifikováno!`);
console.log(`Původní velikost: ${(originalSize / 1024).toFixed(2)} KB`);
console.log(`Nová velikost: ${(newSize / 1024).toFixed(2)} KB`);
console.log(`Ušetřeno: ${savedPercent}%`);

// Změna v HTML
const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));
let modifiedCount = 0;

for (const file of files) {
    const filePath = path.join(rootDir, file);
    let html = fs.readFileSync(filePath, 'utf8');

    if (html.includes('href="css/style.v2.css"')) {
        html = html.replace('href="css/style.v2.css"', 'href="css/style.v2.min.css"');
        fs.writeFileSync(filePath, html, 'utf8');
        modifiedCount++;
    }
}
console.log(`Změněno odkázání ve ${modifiedCount} HTML souborech.`);
