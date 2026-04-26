# Scripts

This directory contains active project helper scripts.

## Validation and Build

- `audit-site-structure.mjs` - static sitemap/canonical/JSON-LD/local-link audit.
- `build-js.mjs` - esbuild bundling for frontend JavaScript.
- `check-hooks.mjs` - smoke test for Claude hook validators.
- `generate-sitemap-from-canonicals.mjs` - safe sitemap helper that derives URLs from indexable canonical HTML pages, preserves existing metadata, writes a review file by default, and only overwrites `sitemap.xml` with `--write`.
- `generate-ga-snippet.js` - manual GA4 snippet/config helper.
- `update-service-worker-cache.mjs` - validates precache assets and updates the service worker cache version.
- `validate-html.js` and `validate-sw-assets.js` - Claude hook helpers for local validation; they run as ESM because the project uses `"type": "module"`.
- `run-e2e-sections.mjs` - runs Playwright tests by named sections.

## Content Helpers

- `daily_reel.py`, `daily_reel2.py`, `thumbnail.py`, `thumbnail2.py`, and `evening_post.py` generate social/video drafts.
- Generated drafts and small state files belong in `scripts/output/`, not directly in `scripts/`.
- `astro_events_2026.json` is source configuration used by the reel generators.
- `daily_reel2.py` prints a captions command. Override the captions helper path
  with `CAPTIONS_TOOL` when it is not in the default user desktop location.

## One-Off Maintenance

The remaining `fix_*`, `optimize_*`, and generator helpers are manual
maintenance tools. Run them intentionally and check the diff before keeping
their output.

Old duplicate or stale scripts should be moved to `docs/archive/` instead of
staying here as runnable current tooling.
