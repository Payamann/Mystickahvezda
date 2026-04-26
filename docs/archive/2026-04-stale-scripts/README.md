# Stale Scripts Archive

This folder keeps old one-off helper scripts that should no longer be used as
active project tooling.

- `generate_sitemap.js` used a hard-coded local Windows workspace path.
- `generate-sitemap.js` was a second, partial sitemap generator beside the
  server-side sitemap helper and the active `npm run audit:site` validation.
- `server-generate-sitemap.js` was the old `server/scripts/generate-sitemap.js`
  helper. It rewrote `sitemap.xml` with a non-canonical origin and current-date
  `lastmod` values, so it is archived until replaced by a safe generator.
- `add-pwa-support.js` was a one-off HTML patcher that injected PWA tags and
  inline service worker registration. Active pages now load
  `js/dist/register-sw.js` instead.
- `clear-sw-cache.js` was a browser-console development snippet. Active cache
  invalidation is handled by `scripts/update-service-worker-cache.mjs`.
- `generate-pwa-icons.js` was an older PNG-only PWA icon helper. The active
  icon generator is `server/scripts/create-pwa-icons.js`.
- `encoding-repair-scripts/` contains old one-off mojibake/content repair
  scripts. They intentionally contain broken character samples and historical
  patch logic, and are not part of active project validation.
- `bulk-html-mutators/` contains old broad HTML/CSS/SEO/performance/image
  patchers that predate the current build, CSP, and audit workflow.

They are archived for traceability so they do not appear as runnable current
tools in `scripts/`.
