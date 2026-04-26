# SQL Helper Snippets

These files are manual Supabase SQL snippets kept for operational reference.

Use versioned migrations for new schema changes whenever possible:

- `server/migrations/`
- `migrations/`

Before running a snippet from this folder, compare it with the current migration
history and production schema. Some files predate later migrations and may only
be useful as reference.
