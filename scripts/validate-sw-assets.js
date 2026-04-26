#!/usr/bin/env node
/**
 * validate-sw-assets.js — Validuje, že STATIC_ASSETS v SW odkazují na existující soubory
 * Používáno jako Claude Code hook po editaci service-worker.js
 *
 * Vstup: JSON na stdin s toolInput
 * Výstup: JSON s hookSpecificOutput pokud nalezeny problémy
 */
import fs from 'node:fs';
import path from 'node:path';

let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.toolInput?.file_path || data.toolInput?.command || '';

    // Jen service-worker.js
    if (!filePath.includes('service-worker')) {
      console.log(JSON.stringify({}));
      return;
    }

    // Najdi kořen projektu
    const dir = path.dirname(filePath);
    const swPath = filePath;

    if (!fs.existsSync(swPath)) {
      console.log(JSON.stringify({}));
      return;
    }

    const content = fs.readFileSync(swPath, 'utf8');
    const match = content.match(/STATIC_ASSETS\s*=\s*\[([\s\S]*?)\]/);

    if (!match) {
      console.log(JSON.stringify({}));
      return;
    }

    const fileRefs = match[1].match(/'([^']+)'/g);
    if (!fileRefs) {
      console.log(JSON.stringify({}));
      return;
    }

    const missing = [];
    fileRefs.forEach(ref => {
      const f = ref.replace(/'/g, '');
      const p = f.startsWith('/') ? f.slice(1) : f;
      const fullPath = path.join(dir, p);
      if (!fs.existsSync(fullPath)) missing.push(f);
    });

    if (missing.length > 0) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `VAROVÁNÍ: service-worker.js STATIC_ASSETS odkazuje na neexistující soubory: ${missing.join(', ')}. Vytvoř je nebo odstraň z pole.`
        }
      }));
    } else {
      console.log(JSON.stringify({}));
    }
  } catch {
    console.log(JSON.stringify({}));
  }
});
