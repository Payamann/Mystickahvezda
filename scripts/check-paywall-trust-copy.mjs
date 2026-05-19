import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const premiumSource = await readFile(path.join(rootDir, 'js', 'premium-gates.js'), 'utf8');
const synastrySource = await readFile(path.join(rootDir, 'js', 'synastry.js'), 'utf8');
const tarotSource = await readFile(path.join(rootDir, 'js', 'tarot.js'), 'utf8');
const tarotHtml = await readFile(path.join(rootDir, 'tarot.html'), 'utf8');

const requiredSnippetGroups = [
    ['Cena se zobrazí ve Stripe před potvrzením', 'Cena se zobraz\\u00ed ve Stripe p\\u0159ed potvrzen\\u00edm'],
    ['Zrušení v profilu', 'Zru\\u0161en\\u00ed v profilu'],
    ['getPlanTrialBadge(planId)'],
    ['getTrialCtaLabel(planId']
];

const forbiddenSnippets = [
    '7 DNÍ ZDARMA</div>',
    'Vyzkoušet 7 dní zdarma',
    '7 dní zdarma • Bez závazků',
    'Zrušení jedním kliknutím'
];

const errors = [];

for (const snippets of requiredSnippetGroups) {
    if (!snippets.some((snippet) => premiumSource.includes(snippet))) {
        errors.push(`Missing required paywall trust snippet: ${snippets[0]}`);
    }
}

for (const snippet of forbiddenSnippets) {
    if (premiumSource.includes(snippet)) {
        errors.push(`Forbidden hardcoded paywall claim found: ${snippet}`);
    }
}

const trialStart = premiumSource.indexOf('showTrialPaywall(featureName) {');
const initStart = trialStart >= 0 ? premiumSource.indexOf('\n    async init()', trialStart) : -1;
const trialMethod = trialStart >= 0 && initStart > trialStart
    ? premiumSource.slice(trialStart, initStart)
    : '';

if (!trialMethod) {
    errors.push('Could not locate showTrialPaywall method.');
} else if (/7\s+dn[íi]\s+zdarma/i.test(trialMethod)) {
    errors.push('showTrialPaywall must not hardcode a 7-day trial claim.');
}

const synastryRequired = [
    'SYNASTRY_PAYMENT_REASSURANCE',
    'getSynastryUpgradeLabel',
    'synastry-upgrade-reassurance'
];

for (const snippet of synastryRequired) {
    if (!synastrySource.includes(snippet)) {
        errors.push(`Missing synastry paywall trust snippet: ${snippet}`);
    }
}

const synastryForbidden = [
    'Vyzkoušet 7 dní zdarma',
    'Odemknout plný rozbor (199 Kč)'
];

for (const snippet of synastryForbidden) {
    if (synastrySource.includes(snippet)) {
        errors.push(`Forbidden hardcoded synastry paywall claim found: ${snippet}`);
    }
}

const tarotRequired = [
    'TAROT_PAYMENT_REASSURANCE',
    'getTarotUpgradeLabel',
    'tarot-upgrade-reassurance'
];

for (const snippet of tarotRequired) {
    if (!tarotSource.includes(snippet)) {
        errors.push(`Missing tarot paywall trust snippet: ${snippet}`);
    }
}

const tarotForbidden = [
    'Získejte Premium pro neomezené výklady',
    'Získat Premium',
    'Získat Premium a odhalit vše'
];

for (const snippet of tarotForbidden) {
    if (`${tarotSource}\n${tarotHtml}`.includes(snippet)) {
        errors.push(`Forbidden hardcoded tarot paywall claim found: ${snippet}`);
    }
}

if (errors.length > 0) {
    console.error('[check-paywall-trust-copy] Failed');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
}

console.log('[check-paywall-trust-copy] Paywall trust copy guard passed');
