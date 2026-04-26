#!/usr/bin/env node

/**
 * Generate GA4 HTML Snippet
 *
 * Usage:
 *   node scripts/generate-ga-snippet.js <MEASUREMENT_ID>
 *
 * Example:
 *   node scripts/generate-ga-snippet.js G-ABC123XYZ
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const measurementId = process.argv[2];

if (!measurementId || !measurementId.startsWith('G-')) {
    console.error('❌ Error: Invalid Measurement ID format');
    console.error('Usage: node scripts/generate-ga-snippet.js G-XXXXXXXXXX');
    process.exit(1);
}

console.log(`\n📊 Google Analytics 4 Snippet Generator\n`);
console.log(`Measurement ID: ${measurementId}\n`);

// ────────────────────────────────────────────────────────────
// Step 1: Generate Head Snippet
// ────────────────────────────────────────────────────────────

const headSnippet = `<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}', {
        'page_path': window.location.pathname,
        'anonymize_ip': true
    });
</script>`;

// ────────────────────────────────────────────────────────────
// Step 2: Generate Body Snippet
// ────────────────────────────────────────────────────────────

const bodySnippet = `<!-- Analytics Initialization -->
<script type="module">
    import { initAnalytics, trackPageLoadMetrics } from './js/ga-tracking.js';

    document.addEventListener('DOMContentLoaded', () => {
        initAnalytics();
        trackPageLoadMetrics();
        console.log('[GA] Tracking initialized');
    });
</script>`;

// ────────────────────────────────────────────────────────────
// Step 3: Update ga-config.js
// ────────────────────────────────────────────────────────────

const configPath = path.join(__dirname, '../js/ga-config.js');
let configContent = fs.readFileSync(configPath, 'utf8');

configContent = configContent.replace(
    "MEASUREMENT_ID: 'G-XXXXXXXXXX',",
    `MEASUREMENT_ID: '${measurementId}',`
);

fs.writeFileSync(configPath, configContent, 'utf8');
console.log('✅ Updated js/ga-config.js with Measurement ID\n');

// ────────────────────────────────────────────────────────────
// Step 4: Output Instructions
// ────────────────────────────────────────────────────────────

console.log('📝 HTML SNIPPETS TO ADD:\n');

console.log('1️⃣  ADD THIS TO <head> SECTION (ALL HTML FILES):\n');
console.log('─'.repeat(60));
console.log(headSnippet);
console.log('─'.repeat(60));
console.log('\n');

console.log('2️⃣  ADD THIS BEFORE </body> TAG (AT LEAST IN index.html):\n');
console.log('─'.repeat(60));
console.log(bodySnippet);
console.log('─'.repeat(60));
console.log('\n');

// ────────────────────────────────────────────────────────────
// Step 5: Copy snippets to clipboard (if possible)
// ────────────────────────────────────────────────────────────

console.log('📋 NEXT STEPS:\n');
console.log('1. Copy the HEAD snippet above');
console.log('2. Add it to <head> of your HTML files');
console.log('3. Copy the BODY snippet above');
console.log('4. Add it before </body> tag');
console.log('5. Deploy changes');
console.log('6. Wait 24 hours for data to appear in Google Analytics\n');

console.log('🧪 TESTING:\n');
console.log('1. Open your website in Chrome');
console.log('2. Open DevTools → Network tab');
console.log('3. Look for requests to "google-analytics"');
console.log('4. Install Google Tag Assistant extension');
console.log('5. You should see GA4 events firing\n');

console.log(`✅ Configuration complete! ${measurementId}\n`);
