# Server Scripts

This folder contains backend maintenance and operational helper scripts.

- JavaScript files here are manual server/database utilities. Run them only with
  the required environment variables loaded from `server/.env` or the shell.
- `create-pwa-icons.js` regenerates the PWA icon files referenced by
  `manifest.json`; prefer running `npm run build:pwa-icons` so the service
  worker cache hash is updated too.
- Content generators such as `generate-blog.js`, `generate-dictionary.js`, and
  `generate-zodiac-pages.js` write project files. Review their diffs before
  keeping generated output.
- Debug/verification scripts such as `db-check.js`, `debug-reading.js`, and
  `verify-production.js` may hit live services depending on your environment.
- SQL snippets for manual Supabase setup live in `server/scripts/sql/`.
- Versioned migrations live in `server/migrations/` or top-level `migrations/`;
  prefer migrations for schema changes that must be reproducible.
- Old one-off repair scripts should be archived under `docs/archive/` once they
  are no longer useful as active tooling.
