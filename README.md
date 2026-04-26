# Mystická Hvězda 🌟

Comprehensive astrology web application with AI-powered horoscopes, tarot readings, numerology, and personalized insights.

**Live:** https://www.mystickahvezda.cz

## Features

- 🔮 **AI-Powered Oracle**: Tarot, angel cards, runes, crystal ball readings powered by Gemini AI
- ♈ **Astrology Tools**: Natal charts, birth horoscopes, moon phases, synastry analysis
- 🔢 **Numerology & Personality**: Lucky numbers, aura colors, personality tests, birthdate analysis
- 📱 **Premium Membership**: Subscription-based premium content and AI guide mentorship
- 🔐 **Secure Authentication**: JWT-based auth with account lockout protection
- 📧 **Email System**: Resend-powered newsletters and notifications
- 💳 **Payments**: Stripe integration for premium subscriptions
- 🗄️ **Database**: Supabase (PostgreSQL) with advanced querying and caching

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **API**: Gemini API (Google AI)
- **Payment**: Stripe
- **Email**: Resend
- **Security**: Helmet, rate limiting, JWT, XSS protection

### Frontend
- **HTML5** with semantic structure
- **CSS3** with custom properties and responsive design
- **Vanilla JavaScript** (ES modules)
- **No frameworks** for lightweight performance
- **Service Worker** for offline functionality
- **Progressive Web App** (PWA) support

### Hosting
- **Server**: Railway.app
- **Storage**: Cloudflare CDN (images, assets)
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics 4

## Prerequisites

- Node.js 20+ ([download](https://nodejs.org/))
- npm 10+
- Git

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/mystickahvezda.git
cd mystickahvezda
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables

Copy the example file and fill in your credentials:
```bash
cp server/.env.example server/.env
```

Edit `server/.env` and add:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_key
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_public
STRIPE_WEBHOOK_SECRET=your_webhook_secret
RESEND_API_KEY=your_resend_key
SENTRY_DSN=your_sentry_dsn
NODE_ENV=development
PORT=3001
```

### 4. Run development server
```bash
npm run dev
```

Server runs at `http://localhost:3001`

## Development

### Available Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run tests
npm test

# Run lint, unit tests, static site audit and sitemap canonical check
npm run test:verify

# Check robots.txt, sitemap/canonical coverage, JSON-LD, manifest icons and local links
npm run audit:site

# Check or preview sitemap entries derived from canonical HTML pages
npm run sitemap:check
npm run sitemap:generate

# Check active source files for mojibake/encoding regressions
npm run check:encoding

# Check Claude hook validators
npm run check:hooks

# Run sectioned desktop E2E tests with stable defaults
npm run test:e2e:sections

# Run one E2E section
npm run test:e2e:content -- --workers=6

# Build CSS (minification)
npm run build:css

# Build JavaScript (minification)
npm run build:js

# Regenerate PWA icons and update the service worker cache hash
npm run build:pwa-icons

# Run ESLint linter
npm run lint
```

E2E sections: `api`, `core`, `content`, `tools`, `checkout`.
Use `npm run test:e2e:sections -- --section=tools --workers=6` to run a
parallel-friendly named section, or add `--project=mobile-chrome` for the mobile project.
The auth-heavy `core` section uses a stable default `--workers=1` unless you
override it explicitly.
Use `npm run test:e2e:sections -- --list-sections` to print the section map.
Do not start two E2E section commands in the same workspace at once; the runner
uses a lock file so parallel invocations fail fast instead of racing for port
`3001`.
CI keeps the `core` default workers and only passes `--workers=2` to the more
parallel-friendly sections.

API docs are served at `/api/docs` in development. In production the route
requires `DOCS_TOKEN`; the raw OpenAPI spec is available at `/api/docs/openapi.yaml`.

### Project Structure

```
mystickahvezda/
├── server/                    # Express backend
│   ├── index.js              # Main server file
│   ├── auth.js               # Authentication routes
│   ├── routes/               # API endpoints
│   ├── middleware.js         # Custom middleware
│   ├── services/             # Business logic
│   └── .env.example          # Environment template
├── js/                        # Frontend JavaScript
│   ├── api-config.js         # API setup
│   ├── auth-client.js        # Client auth
│   ├── tarot.js              # Tarot module
│   ├── horoscope.js          # Horoscope module
│   └── ...                   # Other modules
├── css/                       # Stylesheets
│   ├── style.v2.css          # Main styles
│   └── style.v2.min.css      # Minified styles
├── img/                       # Images (WebP optimized)
├── components/               # Reusable HTML components
├── index.html                # Homepage
├── tarot.html                # Tarot page
├── horoskopy.html            # Horoscopes page
└── ...                       # Other pages
```

## Security

### XSS Protection
- DOMPurify sanitization for all user-generated HTML content
- Content Security Policy (CSP) with nonce validation
- No unsafe-eval or unsafe-inline script execution (except critical CSS)

### Authentication
- JWT tokens in HttpOnly cookies
- Account lockout after 5 failed login attempts
- Password hashing with bcrypt
- CSRF token validation on state-changing operations

### Rate Limiting
- Global API rate limit: 100 requests/minute
- Static files: 500 requests/minute
- AI endpoints: 10 requests/minute per IP
- Authentication endpoints: 5 requests/minute (lockout protection)

### Data Protection
- HTTPS enforced in production
- HSTS headers (1-year preload)
- Secure headers via Helmet.js
- No sensitive data in URL parameters

## Performance

### Optimization
- CSS critical path inlining (~600 lines)
- JavaScript defer loading (all except critical path)
- Image optimization: WebP format with fallbacks
- Lazy loading: `loading="lazy"` on images
- Gzip compression on all responses
- Service Worker caching strategy (stale-while-revalidate)

### Metrics
- **Lighthouse Performance**: 85+
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s

## Database Schema

### Users Table
```sql
- id (UUID, primary key)
- email (unique)
- password_hash (bcrypt)
- username
- created_at
- last_login
- lockout_until (for failed login lockout)
```

### Readings Table
```sql
- id (UUID)
- user_id (FK)
- type (tarot/horoscope/natal-chart/etc)
- data (JSONB)
- created_at
```

### Subscriptions Table
```sql
- id (UUID)
- user_id (FK)
- stripe_subscription_id
- status
- current_period_end
```

See `server/db/migrations/` for full schema details.

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

Tests use Jest with supertest for API endpoint testing.

## Deployment

### Railway Deployment

1. Push to GitHub
2. Connect GitHub repo to Railway
3. Set environment variables in Railway dashboard
4. Railway auto-deploys on push to `main`

### Environment Setup

```bash
# Production
NODE_ENV=production
ALLOWED_ORIGINS=https://www.mystickahvezda.cz,https://mystickahvezda.cz
```

### Database Migrations

Migrations run automatically on startup. To manually migrate:

```bash
npm run migrate:up
```

## Troubleshooting

### Port already in use
```bash
# Find process using port 3001
lsof -i :3001
# Kill process
kill -9 <PID>
```

### Module not found errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection failed
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Check Supabase project is active and not in free tier suspension

### Stripe webhook errors
- Verify webhook secret in `.env`
- Check webhook endpoint is publicly accessible (Railway auto-provides HTTPS)

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Run linter: `npm run lint`
3. Run verification: `npm run test:verify`
4. Commit changes: `git commit -am 'Add feature'`
5. Push branch: `git push origin feature/your-feature`
6. Create Pull Request to `main`

All PRs must pass CI checks (lint + tests).

## License

MIT License — See [LICENSE](LICENSE) file

## Support

- 📧 **Email**: support@mystickahvezda.cz
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/mystickahvezda/issues)
- 💬 **Discord**: [Community Server](https://discord.gg/mystickahvezda)

## Changelog

### v1.0.0 (Current)
- ✅ Core astrology features
- ✅ AI-powered tarot readings
- ✅ Premium membership system
- ✅ XSS hardening with DOMPurify
- ✅ Performance optimization (WebP, lazy loading)
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Error tracking with Sentry

---

**Made with 🔮 by the Mystická Hvězda team**
