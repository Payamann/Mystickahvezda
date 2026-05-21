# Mysticka Hvezda Operator Context

Last updated: 2026-05-21

## Mission

Use Codex as a product, engineering, QA, and growth operator for Mysticka Hvezda. The primary business goal is paid conversion, not adding more features for its own sake.

North Star: users who complete one personal ritual or reading in a week and then create a paid intent.

Primary funnel: visit -> first value -> signup -> onboarding completed -> saved reading or ritual -> paywall or pricing intent -> checkout -> purchase -> D7 return.

## Current State

- Production branch: `origin/main`
- Railway deploy target: `Payamann/MystickaHvezdaOriginalAntigravity` on `main`
- Verified production commit source of truth: `npm.cmd run verify:production:commit` compares local `HEAD` against `/api/health` `deployment.commit`.
- Latest important funnel work:
  - `56291416` preserved paywall checkout handoff context
  - `4bd2f08e` connected profile recovery to the growth funnel
  - `e923c94b` recovered checkout after email verification
  - `e20be3aa` made checkout auth handoff durable
  - `fb060285` added exact-window live funnel exports
  - `69b64063` preserved homepage and pending checkout metadata through pricing/auth handoff
  - `0ed0104d` fixed mobile paid auth handoff layout and verified production auth/tool smokes
  - `cbab2c2d` added read-only production pricing handoff smoke
  - `84d17132` updated operator context after pricing smoke deploy
  - `2e2b99d7` made revenue truth monitoring resilient to GitHub status API limits
  - `f2ea54dd` added exact production commit verification helper
  - `106f5108` kept mobile pricing recommendations visible with the cookie banner and bound pricing checkout handlers before the plan manifest finishes loading
  - `2db6348e` added regression coverage for logged-in pricing checkout when `/api/plans` is slow
  - `2dbb0bc7` added mobile pricing recommendation regression coverage while the cookie banner is visible
  - `ae561a5f` added checkout recovery coverage for preserving billing interval through email verification
  - `ca9eb58b` added post-verification checkout failure recovery coverage and included it in `test:e2e:checkout-recovery`
  - `8a107bc9` preserves `billing_interval` on checkout recovery URLs after session creation failures
  - `1901b2b8` added post-verification checkout network-error recovery coverage and expanded `test:e2e:checkout-recovery` to 8 scenarios
  - `41511811` added coverage that expired post-verification checkout intents are discarded instead of starting checkout later
  - `92136557` added coverage that checkout recovery still starts when post-verification telemetry is temporarily unavailable
  - `aed3f6d8` added coverage that `checkout_auth_required` survives a temporary funnel-event outage and retries with the original handoff context
  - `430077b2` added coverage that `checkout_auth_form_submitted` telemetry outages do not block registration or checkout creation
- Latest known revenue truth:
  - Production is verified on `430077b2`
  - Latest post-deploy windows after `430077b2` still have insufficient paid funnel events
  - First-party analytics ingestion is active and production health is ok
  - 24h/7d/30d historical windows still show `checkout_auth_required > 0` and `checkout_requested = 0`
  - Do not treat the older windows as proof that the latest fix failed; use fresh post-deploy cohorts first
  - If the next fresh post-deploy paid event again shows `checkout_auth_required > 0` and `checkout_requested = 0`, prioritize post-auth checkout resume/debug with segment detail

## Default Operator Loop

Use this loop for autonomous work blocks:

1. Verify `git status`, latest commit, production health, and active branch.
2. Export or inspect the smallest useful data set before changing code.
3. Pick one narrow P0 slice with the highest revenue or reliability impact.
4. Implement only that slice.
5. Run targeted checks first, then broader gates if the slice is clean.
6. For UI changes, do desktop and mobile visual smoke.
7. Commit and push only after green gates.
8. Deploy to `origin/main` only when the change belongs in production and then require `deploy:guard` or production health plus `verify:production`.
9. End with the next P0 recommendation.

## Anti-Stuck Protocol

Autonomous work should not stop just because one path is blocked. Use this protocol whenever a task stalls for more than one tool run, one external dependency, or one failed gate.

1. Classify the blocker:
   - `credential`: missing token, expired auth, unavailable API quota.
   - `external`: Railway/GitHub/Stripe status missing or pending.
   - `data`: post-deploy window has too few events to justify product changes.
   - `test`: local regression or flaky E2E.
   - `scope`: next action would require pricing, Stripe, legal, or product decision.
2. Try one direct recovery:
   - rerun once if the failure is transient,
   - run the smallest diagnostic command,
   - inspect the exact file or endpoint that owns the failure.
3. If still blocked, do not keep polling indefinitely. Write a blocker note with:
   - current commit,
   - exact command or endpoint,
   - observed failure,
   - safest next human action.
4. Switch to the next non-blocked P0/P1 slice that does not depend on the blocker:
   - add missing test coverage for the suspected flow,
   - improve admin/analyzer diagnostics,
   - run visual or E2E smoke on the affected flow,
   - prepare a small refactor behind existing behavior.
5. Commit only completed, green, self-contained work. Do not commit raw production exports or unrelated dirty files.
6. End the cycle with:
   - shipped/verified work,
   - unresolved blocker,
   - next autonomous slice.

Timeboxing:

- Do not spend more than 20 minutes waiting on external deploy/check status without new information.
- Do not spend more than 30 minutes on live data if the post-deploy cohort has no meaningful events.
- Do not broaden scope after a failure; narrow it to the smallest reproducible flow.

## Decision Rules

Revenue funnel decisions:

- `checkout_auth_required > 0` and `checkout_requested = 0`: next P0 is post-auth checkout resume/debug.
- `checkout_requested > 0` and `checkout_started = 0`: next P0 is server or Stripe session creation.
- `checkout_started > 0` and `purchase = 0`: next P0 is checkout trust, cancel, or failed-payment recovery.
- Post-deploy window has no meaningful events: do not change product code; repeat the monitor later.

Priority order:

1. Revenue truth and paid handoff reliability
2. Paywall and pricing CTA clarity
3. Profile as return destination
4. Lifecycle retention
5. SEO/content expansion

## Guardrails

- Do not change checkout API, Stripe payloads, or plan pricing without fresh evidence.
- Do not add big new features while core funnel reliability is unresolved.
- Do not use fake claims, fake reviews, fake user counts, or unverified trial/price copy.
- Preserve `source`, `feature`, `plan`, `redirect`, `entry_source`, and `entry_feature` across auth, onboarding, profile, and checkout.
- Keep raw funnel CSV/JSON exports outside the repo unless explicitly sanitized and requested.
- Prefer Vanilla JS and existing Express patterns; no framework rewrite.

## Standard Commands

Revenue truth:

```powershell
$dir = Join-Path $env:TEMP 'mh-funnel'
node scripts/revenue-truth-monitor.mjs --since-live-production --output-dir $dir
node scripts/revenue-truth-monitor.mjs --since-railway-status --output-dir $dir
node scripts/revenue-truth-monitor.mjs --since <DEPLOY_ISO> --output-dir $dir
node scripts/export-live-funnel.mjs --since 2026-05-20T12:55:00Z --output (Join-Path $dir 'post-deploy.csv') --summary-json (Join-Path $dir 'post-deploy.json')
node scripts/export-live-funnel.mjs --days 1 --output (Join-Path $dir '24h.csv') --summary-json (Join-Path $dir '24h.json')
node scripts/export-live-funnel.mjs --days 7 --output (Join-Path $dir '7d.csv') --summary-json (Join-Path $dir '7d.json')
node scripts/export-live-funnel.mjs --days 30 --output (Join-Path $dir '30d.csv') --summary-json (Join-Path $dir '30d.json')
node scripts/analyze-funnel-segments.mjs (Join-Path $dir '7d.csv') --top 10 --min-events 1 --min-step 1
```

`monitor:revenue-truth:production` also prints a read-only first-party analytics pulse for the post-deploy window. If `analytics_events > 0` and `funnel_events = 0`, ingestion is alive and the blocker is lack of paid funnel activity rather than a broken analytics endpoint. When a post-deploy window is present, 24h/7d/30d summaries are labeled `basis=historical_context`; use them to pick test coverage or diagnostics, not to justify a runtime fix before fresh post-deploy events arrive. Each run also writes an aggregate-only `monitor-summary.json` in the chosen temp output directory; read `next_action` first in the next heartbeat.

For frequent 10-15 minute heartbeats, prefer `npm.cmd run monitor:revenue-truth:production:summary -- --output-dir <temp-dir>` first. It writes the same aggregate `monitor-summary.json` and skips the verbose segment analyzer; run the full monitor only when `next_action` or fresh paid events require segment detail.

If GitHub commit status API returns 403 during frequent monitoring, the summary monitor falls back to a short production-health timestamp window so the operator gets an aggregate report instead of stalling. Use `--github-status-fallback-minutes <N>` only when a different heartbeat window is needed.

Core checks:

```powershell
npm.cmd run audit:growth-loop
npm.cmd run check:paywall-trust
npm.cmd run test:e2e:checkout-recovery
npm.cmd run test:e2e:funnel-smoke
npm.cmd run test:e2e:checkout
npm.cmd run test:verify
```

Production checks:

```powershell
npm.cmd run deploy:guard
npm.cmd run verify:production
npm.cmd run verify:production:commit
npm.cmd run smoke:production:tool-runtime
npm.cmd run smoke:production:auth-handoff
npm.cmd run smoke:production:pricing-handoff
```

Production browser smoke scripts should route first-party analytics and funnel-event POSTs to local success responses so diagnostic checks do not pollute revenue truth windows. The smoke output should include `telemetry_blocked` counts; non-zero counts mean production requests were intercepted locally rather than written to analytics.

If `deploy:guard` is blocked by GitHub API 403 but production health is otherwise ok, run `npm.cmd run verify:production:commit` after a short Railway wait. It derives local HEAD, requires `/api/health` to report that exact commit, and runs the full production verifier.

If frequent heartbeat smoke runs hit a production natal-chart rate limit (`429`) while `/api/health` is ok, use `$env:VERIFY_SKIP_ASTRO='true'; npm.cmd run verify:production` for the next lightweight health/public-page pass. Keep full deploy confirmation on the default verifier with astro checks enabled.

## Automation Cadence

- During active autonomous sprints, run the summary revenue truth monitor every 10-15 minutes; report only aggregate counts and next P0.
- Daily revenue truth monitor: export post-deploy, 24h, 7d, and 30d windows; report only aggregate counts and next P0.
- Twice-weekly production smoke: run production health and public smoke checks; notify only on failure or changed deploy state.
- Weekly sprint planner: summarize what changed, what data says, and the next 3 implementation slices.
