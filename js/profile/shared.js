/**
 * Shared utility functions for profile modules
 */

// Helper: Escape HTML to prevent XSS
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper: API base URL
export function apiUrl() {
    return window.API_CONFIG?.BASE_URL || '/api';
}

// Helper: Auth headers (Authorization kept as fallback during cookie migration)
export function authHeaders(json = false) {
    const token = window.Auth?.token;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
}

// Helper: Fetch options with credentials for HttpOnly cookie auth
export function authFetchOptions(opts = {}) {
    return {
        credentials: 'include',
        headers: authHeaders(opts.json || false),
        ...opts
    };
}

const PLAN_TYPE_ALIASES = {
    vip: 'vip_majestrat'
};

const FALLBACK_PLAN_LABELS = {
    free: 'Poutn\u00edk',
    premium_monthly: 'Hv\u011bzdn\u00fd Pr\u016fvodce',
    exclusive_monthly: 'Osv\u00edcen\u00ed',
    vip_majestrat: 'VIP Majest\u00e1t'
};

const FALLBACK_PLAN_PRICES_CZK = {
    pruvodce: 199,
    'pruvodce-rocne': 1990,
    osviceni: 499,
    'osviceni-rocne': 4990,
    'vip-majestrat': 999
};

let planManifestPromise = null;
let plansById = new Map();
let plansByType = new Map();

export function normalizePlanType(planType) {
    return PLAN_TYPE_ALIASES[planType] || planType || 'free';
}

function readablePlanName(name) {
    return String(name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function indexPlanManifest(manifest) {
    const plans = Array.isArray(manifest?.plans) ? manifest.plans : [];
    plansById = new Map(plans.map(plan => [plan.id, plan]));
    plansByType = new Map();

    for (const plan of plans) {
        const planType = normalizePlanType(plan.planType);
        if (!planType) continue;

        if (!plansByType.has(planType) || plan.billingInterval === 'monthly') {
            plansByType.set(planType, plan);
        }
    }

    return manifest;
}

export async function loadPlanManifest() {
    if (planManifestPromise) return planManifestPromise;

    planManifestPromise = fetch(`${apiUrl()}/plans`, { credentials: 'same-origin' })
        .then(async response => {
            if (!response.ok) throw new Error(`Plan manifest returned ${response.status}`);
            const manifest = await response.json();
            if (!manifest.success || !Array.isArray(manifest.plans)) {
                throw new Error('Plan manifest has invalid shape');
            }
            return indexPlanManifest(manifest);
        })
        .catch(error => {
            console.warn('[Plans] Using fallback plan labels:', error.message);
            plansById = new Map();
            plansByType = new Map();
            return null;
        });

    return planManifestPromise;
}

export function formatPlanLabel(planType, options = {}) {
    const normalizedPlanType = normalizePlanType(planType);
    const manifestPlan = plansByType.get(normalizedPlanType);
    const baseLabel = readablePlanName(manifestPlan?.name) || FALLBACK_PLAN_LABELS[normalizedPlanType] || normalizedPlanType || FALLBACK_PLAN_LABELS.free;

    if (normalizedPlanType === 'free' && options.freeSuffix) {
        return `${baseLabel} (zdarma)`;
    }

    return baseLabel;
}

export function getPlanPriceCzk(planId) {
    const manifestPlan = plansById.get(planId);
    const manifestPrice = Number(manifestPlan?.priceCzk);

    if (Number.isFinite(manifestPrice)) {
        return manifestPrice;
    }

    return FALLBACK_PLAN_PRICES_CZK[planId] || null;
}

// Get icon for reading type
export function getReadingIcon(type) {
    const icons = {
        'tarot': 'book-marked', 'horoscope': 'sparkles', 'natal': 'map', 'natal-chart': 'map',
        'numerology': 'hash', 'synastry': 'heart', 'crystal': 'crystal-ball', 'journal': 'pen-tool'
    };
    const iconName = icons[type] || 'star';
    return `<i data-lucide="${iconName}" class="reading-type-icon"></i>`;
}

// Get title for reading type
export function getReadingTitle(type) {
    const titles = {
        'tarot': 'Tarotový výklad', 'horoscope': 'Horoskop', 'natal': 'Natální karta',
        'natal-chart': 'Natální karta', 'numerology': 'Numerologie',
        'synastry': 'Partnerská shoda', 'crystal': 'Křišťálová koule', 'journal': 'Manifestační deník'
    };
    return titles[type] || 'Výklad';
}
// Get Zodiac Sign from birth date string
export function getZodiacSign(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const month = date.getMonth() + 1;
    const day = date.getDate();

    const signs = [
        { name: 'Kozoroh', symbol: '♑', start: [1, 1], end: [1, 19] },
        { name: 'Vodnář', symbol: '♒', start: [1, 20], end: [2, 18] },
        { name: 'Ryby', symbol: '♓', start: [2, 19], end: [3, 20] },
        { name: 'Beran', symbol: '♈', start: [3, 21], end: [4, 19] },
        { name: 'Býk', symbol: '♉', start: [4, 20], end: [5, 20] },
        { name: 'Blíženci', symbol: '♊', start: [5, 21], end: [6, 20] },
        { name: 'Rak', symbol: '♋', start: [6, 21], end: [7, 22] },
        { name: 'Lev', symbol: '♌', start: [7, 23], end: [8, 22] },
        { name: 'Panna', symbol: '♍', start: [8, 23], end: [9, 22] },
        { name: 'Váhy', symbol: '♎', start: [9, 23], end: [10, 22] },
        { name: 'Štír', symbol: '♏', start: [10, 23], end: [11, 21] },
        { name: 'Střelec', symbol: '♐', start: [11, 22], end: [12, 21] },
        { name: 'Kozoroh', symbol: '♑', start: [12, 22], end: [12, 31] }
    ];

    return signs.find(s => 
        (month === s.start[0] && day >= s.start[1]) || 
        (month === s.end[0] && day <= s.end[1])
    ) || signs[0];
}

// Get Lucide icon name for zodiac symbol
export function getZodiacIconName(symbol) {
    const map = {
        '♈': 'ram', '♉': 'mountain', '♊': 'users', '♋': 'crab',
        '♌': 'lion', '♍': 'leaf', '♎': 'scale', '♏': 'bug',
        '♐': 'send', '♑': 'mountain', '♒': 'droplets', '♓': 'fish'
    };
    // Note: Lucide doesn't have all zodiac signs directly, using closest analogs
    return map[symbol] || 'sparkles';
}
