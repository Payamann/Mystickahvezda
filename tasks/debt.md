# Technical Debt Map

Canonical tracking lives in:

- `TECHNICAL_DEBT_BACKLOG.md`
- `docs/TECHNICAL_DEBT_STATUS.md`

## Current Open Debt

| Area | Remaining Work | Notes |
|------|----------------|-------|
| Astro engine | Replace low-precision ephemeris with a reference-grade library or tables | Needed only before claiming high astronomical precision. |
| Birth locations | Expand from local city resolver to cached geocoding with historical timezone support | Current local resolver is deliberate and transparent. |
| Natal chart UI | Improve label placement, glyph density, and professional wheel rendering | Current SVG already shows houses, aspects, ticks, and orb labels. |
| Astrocartography | Add precise ASC/DSC curves and tighten MC/IC geometry with reference ephemerides | Current layer is low-precision MC/IC plus symbolic destination scoring. |
| Large astro data | Consider separate storage for versioned charts or reference data | Current reading payload limit is raised, but not a long-term ephemeris store. |

## Guardrails

- Run `npm run test:verify` before production pushes.
- After Railway deploy succeeds, run `npm run verify:production`.
- Keep broad one-off mutators in `docs/archive/2026-04-stale-scripts/`, not active tooling.
- Prefer adding focused checks to `audit:site`, `audit:tarot-assets`, or production smoke over adding manual scripts.
