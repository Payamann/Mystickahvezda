# Prediction & Impact Log

Use this for changes where the expected impact is uncertain enough to check
later. Keep entries short and evidence-based.

| Date | Task | Predicted Impact | Actual Side Effect | Lesson |
|------|------|------------------|--------------------|--------|
| 2026-04-27 | Archive stale script one-offs | Lower operational confusion with no runtime behavior change | `test:verify` remained green; production smoke should be run after deploy | Prefer archived traceability over deleting old manual tools outright. |

## Measurement Rules

- Prefer automated evidence: tests, static audits, production smoke, deploy
  status.
- Record negative side effects quickly, even if the change is rolled back later.
- Do not treat a passing local test as production proof; Railway smoke is a
  separate checkpoint.
