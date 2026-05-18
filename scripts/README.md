# Scripts

This directory contains active project helper scripts.

## Validation and Build

- `audit-site-structure.mjs` - static sitemap/canonical/JSON-LD/local-link audit.
- `build-js.mjs` - esbuild bundling for frontend JavaScript.
- `check-hooks.mjs` - smoke test for Claude hook validators.
- `analyze-funnel-segments.mjs` - offline analysis for admin funnel segment CSV exports.
- `generate-sitemap-from-canonicals.mjs` - safe sitemap helper that derives URLs from indexable canonical HTML pages, preserves existing metadata, writes a review file by default, and only overwrites `sitemap.xml` with `--write`.
- `generate-ga-snippet.js` - manual GA4 snippet/config helper.
- `update-service-worker-cache.mjs` - validates precache assets and updates the service worker cache version.
- `validate-html.js` and `validate-sw-assets.js` - Claude hook helpers for local validation; they run as ESM because the project uses `"type": "module"`.
- `run-e2e-sections.mjs` - runs Playwright tests by named sections.

### Funnel Segment Analysis

Export the admin funnel segments CSV from the admin UI (`view=segments`), then
rank the highest-loss source + feature paths without live credentials:

```powershell
npm run analyze:funnel -- path\to\funnel-segmenty-30d.csv
```

Useful filters:

```powershell
npm run analyze:funnel -- path\to\funnel-segmenty-30d.csv --top 12 --min-events 5 --min-step 3
```

The report groups leaks by funnel step and prints concrete next actions for the
worst source + feature combinations.

## Content Helpers

- `daily_reel.py`, `daily_reel2.py`, `thumbnail.py`, `thumbnail2.py`, and `evening_post.py` generate social/video drafts.
- `auto_daily_reel2_video.py` assembles a Daily Reel 2 draft into a video:
  it keeps bracketed delivery tags for ElevenLabs, writes a clean transcript for
  captions, can call ElevenLabs TTS + Forced Alignment, then renders the final
  vertical MP4 with FFmpeg.
- Generated drafts and small state files belong in `scripts/output/`, not directly in `scripts/`.
- `daily_reel.py`, `daily_reel2.py`, `evening_post.py`, and
  `generate-seo-pages.js` are dry-run guarded by default. Use their `--write`
  flag or matching `*_ALLOW_WRITE=true` env only when you intentionally want
  output files and live API calls.
- `astro_events_2026.json` is source configuration used by the reel generators.
- `daily_reel2.py` prints a captions command. Override the captions helper path
  with `CAPTIONS_TOOL` when it is not in the default user desktop location.

### Daily Reel 2 Video MVP

Dry-run without ElevenLabs credits:

```powershell
python scripts\auto_daily_reel2_video.py --date 2026-05-07 --sign Kozoroh --base-video "C:\path\template.mp4" --dry-run
```

Render with ElevenLabs:

```powershell
python scripts\auto_daily_reel2_video.py --date 2026-05-07 --sign Kozoroh --base-video "C:\path\template.mp4"
```

Required environment variables:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID` or `--voice-name`

Optional:

- `ELEVENLABS_MODEL_ID`, default `eleven_v3`
- `ELEVENLABS_STABILITY`, `ELEVENLABS_SIMILARITY`, `ELEVENLABS_STYLE`,
  `ELEVENLABS_SPEED`, `ELEVENLABS_SPEAKER_BOOST`

## One-Off Maintenance

The remaining `fix_*`, `optimize_*`, and generator helpers are manual
maintenance tools. Run them intentionally and check the diff before keeping
their output.

Old duplicate or stale scripts should be moved to `docs/archive/` instead of
staying here as runnable current tooling.
