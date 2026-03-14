# Technical Debt Map

| Component | Issue | Refactor Plan | Est. Effort |
|-----------|-------|---------------|-------------|
| CSS | Ad-hoc styles in HTML | Move to `style.v2.css` | 1h |
| Server | Supabase logic in index.js | Extract to `db.js` module | 2h |
| Frontend | Monolithic main.js | Split into feature modules | 4h |
