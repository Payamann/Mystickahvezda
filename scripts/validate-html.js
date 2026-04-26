#!/usr/bin/env node
/**
 * validate-html.js — Validuje HTML soubor na povinné meta tagy
 * Používáno jako Claude Code hook po editaci .html souborů
 *
 * Vstup: JSON na stdin s toolInput.file_path
 * Výstup: JSON s hookSpecificOutput pokud nalezeny problémy
 */
import fs from 'node:fs';

let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.toolInput?.file_path || data.toolInput?.command || '';

    // Jen .html soubory
    if (!filePath.endsWith('.html')) {
      console.log(JSON.stringify({}));
      return;
    }

    // Přeskoč utility soubory
    const basename = filePath.split(/[/\\]/).pop();
    if (/^(404|admin|offline|GA-|GA4-)/.test(basename)) {
      console.log(JSON.stringify({}));
      return;
    }

    if (!fs.existsSync(filePath)) {
      console.log(JSON.stringify({}));
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const missing = [];

    if (!content.includes('og:title')) missing.push('og:title');
    if (!content.includes('og:image')) missing.push('og:image');
    if (!content.includes('rel="canonical"')) missing.push('canonical');
    if (!content.includes('apple-touch-icon')) missing.push('apple-touch-icon');
    if (!content.includes('rel="icon"')) missing.push('favicon');
    if (!content.includes('name="description"')) missing.push('meta description');

    if (missing.length > 0) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `VAROVÁNÍ: Soubor ${basename} nemá: ${missing.join(', ')}. Doplň chybějící meta tagy (viz /seo-audit).`
        }
      }));
    } else {
      console.log(JSON.stringify({}));
    }
  } catch {
    console.log(JSON.stringify({}));
  }
});
