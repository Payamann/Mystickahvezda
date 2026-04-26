# Root Artifacts Archive

This folder stores historical files that used to live in the repository root.
They are kept for traceability only and are not part of the runtime app,
deployment config, test fixtures, or active agent instructions.

Contents:

- `branches.txt` - old branch listing snapshot.
- `encoding_issues_report.txt` - historical output from `server/scripts/check-encoding.py`.
- `COPY_PASTE_SQL.sql` - one-off copy/paste email queue migration snippet; canonical migrations live in `migrations/`.
- `GA-HTML-SNIPPET.html` and `GA4-IMPLEMENTATION-CODE.html` - historical Google Analytics implementation notes with inline scripts.
- `js_files.txt` - old JavaScript directory listing snapshot.

New generated reports should go to `tmp/`, `docs/`, or outside the repository
instead of returning to the project root.
