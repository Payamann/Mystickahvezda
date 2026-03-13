# 📋 DETAILED IMPLEMENTATION PLAN — Mystická Hvězda

**Status:** Ready for Implementation | **Last Updated:** March 13, 2026
**Total Effort:** 175-220 hours | **Timeline:** 6-8 weeks | **Team Size:** 1-2 developers

---

## 🎯 QUICK START GUIDE

### This Week (Phase 1 - Critical Security)
1. **Remove unsafe-eval from CSP** (2-3h) — Security fix in server/index.js line 208
2. **Add Error Boundary** (4-5h) — Global error handler in js/error-boundary.js
3. **Consolidate Rate Limiting** (2-3h) — Single middleware.js source
4. **Implement Response Caching** (3-4h) — 50%+ API reduction
5. **Expand Tests to 70%** (4-5h) — npm test -- --coverage

### Next Sprint (Phase 2 - Architecture)
1. Split 2,689-line index.html into 8 components
2. Reorganize 40+ JS files into feature modules
3. Add WCAG AA accessibility to core pages
4. Test and document offline mode

---

## 📊 5-PHASE ROADMAP

### PHASE 1: CRITICAL SECURITY (Week 1 | 40-50 hours | 2 devs)
- Remove `unsafe-eval` from CSP
- Implement error boundaries
- Consolidate rate limiting (4 files → 1 middleware)
- Add response caching (Redis or in-memory)
- Expand tests to 70%+ coverage

**Success:** Zero CSP violations, <50ms cached responses, 70%+ test coverage

---

### PHASE 2: ARCHITECTURE (Weeks 2-3 | 50-60 hours | 2 devs)
- Split index.html: 2,689 → 300 lines + 8 templates
- Reorganize 40+ JS files into features/ and common/ structure
- Add WCAG AA accessibility to 5 core pages
- Test offline mode thoroughly

**Success:** Maintainable codebase, WCAG AA compliant, fully offline-capable

---

### PHASE 3: PERFORMANCE (Weeks 4-5 | 35-45 hours | 1-2 devs)
- Database query optimization (-40% queries)
- AI response caching (60%+ cache hit)
- CSS/asset optimization (reduce to 80KB)
- Code splitting & lazy loading (-40% JS)

**Success:** LCP <2.5s, PageSpeed >90, -50% API calls

---

### PHASE 4: UX FEATURES (Weeks 6-7 | 30-40 hours | 1-2 devs)
- Comprehensive error handling page
- Smart recommendations engine
- Expand offline features
- Analytics & monitoring dashboard

**Success:** Better user experience, improved engagement metrics

---

### PHASE 5: DEPLOYMENT (Week 8 | 20-25 hours | 1 dev)
- Migration guide & rollback plan
- Comprehensive pre-launch testing
- Final documentation
- Launch to production

**Success:** Zero deployment issues, all metrics met

---

## PHASE 1 DETAILED TASKS

### 1.1 Remove unsafe-eval from CSP (2-3 hours)

**Why:** Security vulnerability
**File:** server/index.js line 208

**Action:**
```javascript
// BEFORE
scriptSrc: [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",  // ❌ REMOVE
    'https://js.stripe.com',
],

// AFTER
scriptSrc: [
    "'self'",
    "'unsafe-inline'",
    'https://js.stripe.com',
],
```

**Verify:** 
- Check for eval() in: js/gemini-service.js, js/tarot.js, js/natal-chart.js
- Test all features work: npm test
- No CSP violations in browser console

---

### 1.2 Implement Error Boundary (4-5 hours)

**Create:** js/error-boundary.js

**Features:**
- Catch global JavaScript errors
- Display user-friendly messages
- Log errors server-side
- Allow recovery (reload, go home)

**Update:** index.html
- Add: <div id="error-container"></div>
- Add: <script src="js/error-boundary.js"></script>

**Test:** npm test (error-handling tests)

---

### 1.3 Consolidate Rate Limiting (2-3 hours)

**Create:** server/middleware.js

**Centralize:**
- apiLimiter (300 req/15min)
- authLimiter (10 req/1hr)
- aiLimiter (10/day free, 100/day premium)
- formLimiter (5 req/1hr)

**Remove from:** auth.js, newsletter.js, contact.js

**Test:** npm test (rate-limit tests)

---

### 1.4 Implement Response Caching (3-4 hours)

**Create:** server/middleware/cache.js

**Cache Strategy:**
- Horoscopes: 24 hours
- Tarot: 30 days
- AI responses: 1 hour
- Numerology: 90 days

**Target:** 50%+ cache hit rate, -60% API costs

**Test:** npm test (cache tests)

---

### 1.5 Expand Testing (4-5 hours)

**Create:**
- server/tests/error-handling.test.js
- server/tests/caching.test.js
- server/tests/rate-limiting.test.js

**Target:** 70%+ code coverage

**Command:** npm test -- --coverage

---

## PHASE 1 CHECKLIST

- [ ] 1.1: Remove unsafe-eval (CSP verification)
- [ ] 1.2: Error boundary (tests pass)
- [ ] 1.3: Rate limiting (consolidated in middleware.js)
- [ ] 1.4: Caching (50%+ cache hit rate)
- [ ] 1.5: Testing (70%+ coverage)

**Completion:** End of Week 1
**Verification:** npm test passes, npm test -- --coverage shows 70%+

---

## KEY FILES TO MODIFY

| Phase | File | Action | Priority |
|-------|------|--------|----------|
| 1 | server/index.js | Remove 'unsafe-eval' | 🔴 NOW |
| 1 | js/error-boundary.js | Create new | 🔴 NOW |
| 1 | server/middleware.js | Create + consolidate | 🔴 NOW |
| 1 | server/middleware/cache.js | Create new | 🔴 NOW |
| 1 | jest.config.js | Update coverage targets | 🔴 NOW |
| 2 | index.html | Split (2,689 → 300 lines) | 🟠 Week 2 |
| 2 | js/features/* | Reorganize (40+ files) | 🟠 Week 2 |
| 3 | server/routes/* | Query optimization | 🟡 Week 4 |
| 3 | css/style.v2.css | Reduce size | 🟡 Week 4 |

---

## METRICS TO TRACK

### Phase 1 Goals
```
Test Coverage:        Unknown → 70%+
Cache Hit Rate:       0% → 50%+
API Calls:            1x → 0.5x
CSP Violations:       Unknown → 0
Response Time:        800ms → <50ms (cached)
```

### Phase 3 Goals
```
LCP:                  3.8s → <2.5s
PageSpeed Score:      ~60 → >90
Bundle Size:          ?KB → 60% reduction
API Calls:            1x → 0.5x
```

---

## DEPENDENCIES & SEQUENCING

**Phase 1 can run in parallel:**
- Tasks 1.1, 1.2, 1.3 are independent
- Task 1.4 depends on environment setup
- Task 1.5 depends on 1.1-1.4 completion

**Phase 2 must sequence:**
- Task 2.1 (split HTML) should complete first
- Task 2.2 (reorganize JS) can happen in parallel
- Task 2.3 & 2.4 are independent

**Phase 3 depends on Phase 2:**
- Database optimization can start early
- Code splitting requires modular JS (Phase 2.2)

---

## GETTING STARTED

### Prerequisites
- Node.js 18+
- npm or yarn
- Redis (for caching, or use in-memory)
- Development IDE (VS Code recommended)

### Initial Setup
```bash
git checkout -b phase-1-implementation
git pull origin main
npm install
npm test -- --coverage  # Record baseline
```

### Development Workflow
```bash
# For each task
git checkout -b task-1-1-csp-removal
# ... make changes ...
npm test
git commit -m "feat: remove unsafe-eval from CSP"
git push origin task-1-1-csp-removal

# Create PR for code review
gh pr create --title "Phase 1.1: Remove unsafe-eval" --body "..."
```

---

## NEXT STEPS

1. **This Week:** Approve plan & start Phase 1
2. **Daily:** Update DETAILED_IMPLEMENTATION_PLAN.md with progress
3. **Friday:** Review Phase 1 metrics, plan Phase 2
4. **Weekly:** Check milestones against timeline

---

**Status:** Ready to implement
**Created:** March 13, 2026
**Next Review:** March 20, 2026 (Phase 1 completion check)

For Phase 1 code examples and detailed implementation, see COMPREHENSIVE_EVALUATION.md sections 1.1-1.5.
