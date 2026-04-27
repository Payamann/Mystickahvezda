# Pre-Mortem Template

Use this before larger changes that touch runtime behavior, generated content,
payments, authentication, or SEO metadata.

## Scope

- Change:
- User-facing surfaces:
- Data touched:
- Deployment risk:

## Likely Failure Modes

1. Behavior regresses silently because the change only affects a static page or
   generated asset.
   - Mitigation: add or extend an automated static audit, route test, or
     Playwright smoke.
2. Czech copy or generated content gets corrupted by encoding/tooling.
   - Mitigation: run `npm run check:encoding` and keep generated output in UTF-8.
3. Production differs from local behavior after Railway deploy.
   - Mitigation: wait for GitHub/Railway status, then run
     `npm run verify:production`.

## 10-Minute Failure Check

If this breaks shortly after deploy, inspect:

- Latest commit status on GitHub/Railway.
- `npm run verify:production` output.
- Browser console and network requests for the affected page.
- Relevant server route tests or static audit coverage.
