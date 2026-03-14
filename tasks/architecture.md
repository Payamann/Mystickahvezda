# Architectural Context

## Project Overview
Mysticka Hvezda: An esoteric platform with horoscopes, tarot, and blog.

## Core Components
- **Frontend**: HTML/JS/CSS (Vanilla)
- **Backend**: Express/Supabase (located in `server/`)
- **Languages**: multilingual support (CZ, SK, PL)

## Mission Critical Files
- `server/index.js`: Main API entry point.
- `js/main.js`: Core frontend logic.
- `css/style.v2.css`: Global styles.

## Relationships
- Frontend interacts with Supabase via `server/` API and direct client calls.
- Static HTML files are generated/maintained individually.
