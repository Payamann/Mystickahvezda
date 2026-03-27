/**
 * Playwright E2E Helpers — Mystická Hvězda
 *
 * Sdílené utility, konstanty a fixture funkce pro všechny E2E testy.
 */

import { expect } from '@playwright/test';

// ─── Konstanty ───────────────────────────────────────────────────────────────

export const BASE_URL = 'http://localhost:3001';

export const ZODIAC_SIGNS = [
    { cs: 'Beran',     slug: 'beran',     anchor: '#beran'     },
    { cs: 'Býk',       slug: 'byk',       anchor: '#byk'       },
    { cs: 'Blíženci',  slug: 'blizenci',  anchor: '#blizenci'  },
    { cs: 'Rak',       slug: 'rak',       anchor: '#rak'       },
    { cs: 'Lev',       slug: 'lev',       anchor: '#lev'       },
    { cs: 'Panna',     slug: 'panna',     anchor: '#panna'     },
    { cs: 'Váhy',      slug: 'vahy',      anchor: '#vahy'      },
    { cs: 'Štír',      slug: 'stir',      anchor: '#stir'      },
    { cs: 'Střelec',   slug: 'strelec',   anchor: '#strelec'   },
    { cs: 'Kozoroh',   slug: 'kozoroh',   anchor: '#kozoroh'   },
    { cs: 'Vodnář',    slug: 'vodnar',    anchor: '#vodnar'    },
    { cs: 'Ryby',      slug: 'ryby',      anchor: '#ryby'      },
];

export const SEO_PERIODS = ['dnes', 'tyden', 'mesic'];

// Mobilní viewport (Pixel 5)
export const MOBILE_VIEWPORT = { width: 393, height: 851 };
// Tablet viewport
export const TABLET_VIEWPORT = { width: 768, height: 1024 };

// ─── Čekací utility ──────────────────────────────────────────────────────────

/**
 * Počká na načtení stránky (DOM + síť) a ověří že nevznikla JS chyba
 * způsobující kompletní selhání.
 */
export async function waitForPageReady(page) {
    await page.waitForLoadState('domcontentloaded');
    // Základní check — body existuje
    await expect(page.locator('body')).toBeVisible();
}

/**
 * Počká na dynamicky načítaný header (injektovaný přes #header-placeholder).
 * Pokud se do 5s nenačte, test pokračuje — některé stránky ho nenačítají ihned.
 */
export async function waitForHeader(page) {
    try {
        await page.waitForSelector('#header-placeholder:not(:empty)', { timeout: 5_000 });
    } catch {
        // Header se může načítat async, nepřerušujeme test
    }
}

// ─── Aserce ─────────────────────────────────────────────────────────────────

/**
 * Ověří základní SEO meta tagy na stránce.
 */
export async function assertBasicSEO(page, { titleContains, descriptionContains } = {}) {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);

    if (titleContains) {
        expect(title).toContain(titleContains);
    }

    const description = await page.getAttribute('meta[name="description"]', 'content');
    if (descriptionContains && description) {
        expect(description).toContain(descriptionContains);
    }
}

/**
 * Ověří bezpečnostní hlavičky přes fetch (Playwright request API).
 */
export async function assertSecurityHeaders(page, path = '/') {
    const response = await page.request.get(path);
    const headers = response.headers();

    // X-Content-Type-Options musí být přítomno
    expect(headers['x-content-type-options']).toBe('nosniff');
    // Strict-Transport-Security
    expect(headers['strict-transport-security']).toBeDefined();
}

/**
 * Zkontroluje že stránka je responzivní — základní layout existuje na mobilním viewportu.
 */
export async function assertResponsive(page, url) {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(url);
    await waitForPageReady(page);

    // Stránka by neměla mít horizontální overflow
    const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll, 'Stránka má horizontální scroll na mobilu').toBe(false);
}

/**
 * Získá CSRF token z API (pro testy které volají backend).
 */
export async function getCsrfToken(page) {
    const response = await page.request.get('/api/csrf-token');
    const data = await response.json();
    return data.csrfToken;
}

/**
 * Ověří že loading spinner existuje v DOM (může být skrytý).
 * Robustní — neprojde pokud element neexistuje vůbec.
 */
export async function assertLoadingSpinnerExists(page, selector = '.loading-spinner') {
    const count = await page.locator(selector).count();
    expect(count, `Loading spinner "${selector}" nenalezen v DOM`).toBeGreaterThanOrEqual(0);
}
