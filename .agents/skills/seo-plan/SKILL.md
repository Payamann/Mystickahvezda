---
name: seo-plan
description: Strategic SEO planning for new or existing websites. Industry-specific
  templates, competitive analysis, content strategy, and implementation roadmap. Use
  when user says "SEO plan", "SEO strategy", "content strategy", "site architecture",
  or "SEO roadmap".
version: 1.0.0
metadata:
  author: internal-team
  license: Internal
  tags:
  - seo
  - strategy
  - planning
  triggers:
  - seo strategy
  - seo plan
  - seo roadmap
  - strategic seo
  estimated-duration: Comprehensive
  geo-relevance: high
---

# Strategic SEO Planning

## Process

### 1. Discovery
- Business type, target audience, competitors, goals
- Current site assessment (if exists)
- Budget and timeline constraints
- Key performance indicators (KPIs)

### 2. Competitive Analysis
- Identify top 5 competitors
- Analyze their content strategy, schema usage, technical setup
- Identify keyword gaps and content opportunities
- Assess their E-E-A-T signals
- Estimate their domain authority

### 3. Architecture Design
- Load industry template from `assets/` directory
- Design URL hierarchy and content pillars
- Plan internal linking strategy
- Sitemap structure with quality gates applied
- Information architecture for user journeys

### 4. Content Strategy
- Content gaps vs competitors
- Page types and estimated counts
- Blog/resource topics and publishing cadence
- E-E-A-T building plan (author bios, credentials, experience signals)
- Content calendar with priorities

### 5. Technical Foundation
- Hosting and performance requirements
- Schema markup plan per page type
- Core Web Vitals baseline targets
- AI search readiness requirements
- Mobile-first considerations

### 6. Implementation Roadmap (4 phases)

#### Phase 1 — Foundation (weeks 1-4)
- Technical setup and infrastructure
- Core pages (home, about, contact, main services)
- Essential schema implementation
- Analytics and tracking setup

#### Phase 2 — Expansion (weeks 5-12)
- Content creation for primary pages
- Blog launch with initial posts
- Internal linking structure
- Local SEO setup (if applicable)

#### Phase 3 — Scale (weeks 13-24)
- Advanced content development
- Link building and outreach
- GEO optimization
- Performance optimization

#### Phase 4 — Authority (months 7-12)
- Thought leadership content
- PR and media mentions
- Advanced schema implementation
- Continuous optimization

## Industry Templates

Load from `assets/` directory:
- `saas.md` — SaaS/software companies
- `local-service.md` — Local service businesses
- `ecommerce.md` — E-commerce stores
- `publisher.md` — Content publishers/media
- `agency.md` — Agencies and consultancies
- `generic.md` — General business template

## Output

### Deliverables
- `SEO-STRATEGY.md` — Complete strategic plan
- `COMPETITOR-ANALYSIS.md` — Competitive insights
- `CONTENT-CALENDAR.md` — Content roadmap
- `IMPLEMENTATION-ROADMAP.md` — Phased action plan
- `SITE-STRUCTURE.md` — URL hierarchy and architecture

### KPI Targets
| Metric | Baseline | 3 Month | 6 Month | 12 Month |
|--------|----------|---------|---------|----------|
| Organic Traffic | ... | ... | ... | ... |
| Keyword Rankings | ... | ... | ... | ... |
| Domain Authority | ... | ... | ... | ... |
| Indexed Pages | ... | ... | ... | ... |
| Core Web Vitals | ... | ... | ... | ... |

### Success Criteria
- Clear, measurable goals per phase
- Resource requirements defined
- Dependencies identified
- Risk mitigation strategies

## DataForSEO Integration (Optional)

If DataForSEO MCP tools are available, use `dataforseo_labs_google_competitors_domain` and `dataforseo_labs_google_domain_intersection` for real competitive intelligence, `dataforseo_labs_bulk_traffic_estimation` for traffic estimates, `kw_data_google_ads_search_volume` and `dataforseo_labs_bulk_keyword_difficulty` for keyword research, and `business_data_business_listings_search` for local business data.

## 6-Month SEO Plan Example: SaaS (Project Management Software)

### Phase 1: Foundation (Weeks 1-4)

**Week 1-2: Technical Setup**
- [ ] Domain registered and HTTPS enabled
- [ ] Hosting with CDN for performance
- [ ] Google Search Console and Analytics set up
- [ ] XML sitemap created and submitted
- [ ] robots.txt optimized
- [ ] Homepage, About, Contact, Pricing pages created
- [ ] Core Web Vitals baseline measured

**Week 3-4: Foundation Content**
- [ ] Homepage (optimized for brand + primary value prop)
- [ ] Product overview page (covers key benefits)
- [ ] About page (company story + expertise signals)
- [ ] Pricing page (clear comparison + CTA)
- [ ] Contact/Demo request page
- [ ] Privacy/Terms pages
- [ ] All pages have schema markup (Organization, LocalBusiness if applicable)

**Week 4 Milestone**: Site fully crawlable, indexed, <2s LCP, 0 crawl errors

---

### Phase 2: Authority Building (Weeks 5-12)

**Content Calendar** (2 posts/week):

| Week | Content Focus | Keyword Target | Type |
|------|---------------|-----------------|------|
| 5-6 | PM frameworks | "agile project management" | Pillar (2,500 words) |
| 7 | Remote teams | "how to manage remote team" | Blog (1,200 words) |
| 8 | Team types | "project management for designers" | Use-case (1,000 words) |
| 9 | PM tools comp | "best project management tools" | Roundup (2,000 words) |
| 10 | PM challenges | "project management challenges" | Educational (1,200 words) |
| 11-12 | Case studies | Customer wins | Case Study (1,500 words x2) |

**Link Building** (Month 2):
- List 20 relevant SaaS blogs/directories
- Create comparison content (vs Monday, Asana, etc.)
- Pitch journalists: "New survey: X% of teams struggle with [problem]"

**Expected Results by End of Phase 2**:
- 12 indexed pages
- 5,000+ organic visitors
- Ranking for 15-20 keywords
- 200+ backlinks

---

### Phase 3: Optimization (Weeks 13-24)

**Month 5: On-Page & Technical Optimization**
- [ ] Audit all pages (on-page SEO)
- [ ] Improve Core Web Vitals (target <2s LCP)
- [ ] Add internal linking between related pages
- [ ] Implement breadcrumbs + schema
- [ ] Optimize images (WebP format, lazy loading)

**Month 6: Competitive Push**
- [ ] Analyze top 10 competitors for each target keyword
- [ ] Identify content gaps (what they're missing)
- [ ] Create better content than top 3 for priority keywords
- [ ] Build links from niche directories + review sites
- [ ] Publish comparison pages ("vs Competitor Name")

**Expected Results by End of Phase 3**:
- 25+ indexed pages
- Top 5 ranking for 10+ keywords
- 15,000+ organic visitors/month
- 500+ backlinks

---

### Phase 4: Authority & Scale (Months 7-12)

**Month 7-8: Thought Leadership**
- [ ] Publish original research (State of Project Management survey)
- [ ] Host webinar (record for YouTube)
- [ ] Interview industry experts (publish on blog)
- [ ] Guest post on 3-5 major publications
- [ ] PR outreach for major content announcements

**Month 9-10: Content Expansion**
- [ ] Expand winning content (1,500 word → 3,000 word)
- [ ] Create content clusters around 5 core topics
- [ ] Launch customer case study series (1 per month)
- [ ] Create interactive tools (ROI calculator, team size matcher)

**Month 11-12: Advanced SEO**
- [ ] Analyze SERP features for target keywords
  - Featured snippets: optimize 10 pieces for snippets
  - People Also Ask: create FAQ schema
  - Knowledge panels: build entity signals
- [ ] Monitor and respond to brand mentions
- [ ] Build partnerships with complementary SaaS (integrations → backlinks)

**Expected Results by End of Year**:
- 100+ indexed pages
- Top 10 ranking for 50+ keywords
- 50,000+ organic visitors/month
- 2,000+ backlinks from 500+ referring domains
- Domain Authority increase from 0 → 35+

---

## KPI Targets by Phase

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|
| Organic Sessions/month | 0→500 | 500→5K | 5K→15K | 15K→50K |
| Keywords Ranking (top 10) | 0 | 3-5 | 10+ | 50+ |
| Backlinks | 0 | 50-100 | 200-500 | 1,000+ |
| Domain Authority | 1 | 10-15 | 20-25 | 30-40 |
| Average Position | — | 15-20 | 8-12 | 5-8 |
| Conversion Rate | 1% | 1.5% | 2% | 3% |

---

## Industry-Specific Variations

### Local Service (Dentist, Plumber, etc.)

**Phase 1** (Same technical foundation)
**Phase 2** (Optimize Google Business Profile, get 50+ reviews)
**Phase 3** (Create location pages, local citations in 10+ directories)
**Phase 4** (Local expansion: add neighborhood pages, target "[service] [neighborhood]")

**Expected Results**: Top local pack position, 200+ calls/month by month 12

---

### E-commerce (Online Store)

**Phase 1** (Product infrastructure: category pages, product pages with schema)
**Phase 2** (Content: buying guides, product comparisons, category guides)
**Phase 3** (Blog strategy: trend content, seasonal content, how-to guides)
**Phase 4** (Authority: original research, expert content, brand authority)

**Expected Results**: 10,000+ organic product page visits/month, 5% of revenue from organic

---

### Agency/Consulting

**Phase 1** (Case studies, service pages, process documentation)
**Phase 2** (Thought leadership: blog on expertise, white papers)
**Phase 3** (Authority: original research, speaking appearances, media features)
**Phase 4** (Dominate: multiple pillar topics, massive content library)

**Expected Results**: Top of mind for target niche, qualified inbound leads weekly

---

## Related Skills

- [keyword-research](../keyword-research/) — Discover high-value keywords and search intent
- [competitor-analysis](../competitor-analysis/) — Analyze competitor strategies and gaps
- [content-strategy](../content-strategy/) — Plan content topics and publishing cadence
- [site-architecture](../site-architecture/) — Design URL hierarchy and information architecture
- [programmatic-seo](../programmatic-seo/) — Build SEO pages at scale from data sources
