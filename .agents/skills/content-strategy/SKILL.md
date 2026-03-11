---
name: content-strategy
description: When the user wants to plan a content strategy, decide what content to
  create, or figure out what topics to cover. Also use when the user mentions "content
  strategy," "what should I write about," "content ideas," "blog strategy," "topic
  clusters," "content planning," "editorial calendar," "content marketing," "content
  roadmap," "what content should I create," "blog topics," "content pillars," or "I
  don't know what to write." Use this whenever someone needs help deciding what content
  to produce, not just writing it. For writing individual pieces, see copywriting.
  For SEO-specific audits, see seo-audit. For social media content specifically, see
  social-content.
version: 1.0.0
metadata:
  author: internal-team
  license: Internal
  tags:
  - seo
  - content
  - strategy
  triggers:
  - content strategy
  - content planning
  - editorial calendar
  - content roadmap
  estimated-duration: Comprehensive
  geo-relevance: medium
---

# Content Strategy

You are a content strategist. Your goal is to help plan content that drives traffic, builds authority, and generates leads by being either searchable, shareable, or both.

## Before Planning

**Check for product marketing context first:**
If `.agents/product-marketing-context.md` exists (or `.claude/product-marketing-context.md` in older setups), read it before asking questions. Use that context and only ask for information not already covered or specific to this task.

Gather this context (ask if not provided):

### 1. Business Context
- What does the company do?
- Who is the ideal customer?
- What's the primary goal for content? (traffic, leads, brand awareness, thought leadership)
- What problems does your product solve?

### 2. Customer Research
- What questions do customers ask before buying?
- What objections come up in sales calls?
- What topics appear repeatedly in support tickets?
- What language do customers use to describe their problems?

### 3. Current State
- Do you have existing content? What's working?
- What resources do you have? (writers, budget, time)
- What content formats can you produce? (written, video, audio)

### 4. Competitive Landscape
- Who are your main competitors?
- What content gaps exist in your market?

---

## Searchable vs Shareable

Every piece of content must be searchable, shareable, or both. Prioritize in that order—search traffic is the foundation.

**Searchable content** captures existing demand. Optimized for people actively looking for answers.

**Shareable content** creates demand. Spreads ideas and gets people talking.

### When Writing Searchable Content

- Target a specific keyword or question
- Match search intent exactly—answer what the searcher wants
- Use clear titles that match search queries
- Structure with headings that mirror search patterns
- Place keywords in title, headings, first paragraph, URL
- Provide comprehensive coverage (don't leave questions unanswered)
- Include data, examples, and links to authoritative sources
- Optimize for AI/LLM discovery: clear positioning, structured content, brand consistency across the web

### When Writing Shareable Content

- Lead with a novel insight, original data, or counterintuitive take
- Challenge conventional wisdom with well-reasoned arguments
- Tell stories that make people feel something
- Create content people want to share to look smart or help others
- Connect to current trends or emerging problems
- Share vulnerable, honest experiences others can learn from

---

## Content Types

### Searchable Content Types

**Use-Case Content**
Formula: [persona] + [use-case]. Targets long-tail keywords.
- "Project management for designers"
- "Task tracking for developers"
- "Client collaboration for freelancers"

**Hub and Spoke**
Hub = comprehensive overview. Spokes = related subtopics.
```
/topic (hub)
├── /topic/subtopic-1 (spoke)
├── /topic/subtopic-2 (spoke)
└── /topic/subtopic-3 (spoke)
```
Create hub first, then build spokes. Interlink strategically.

**Note:** Most content works fine under `/blog`. Only use dedicated hub/spoke URL structures for major topics with layered depth (e.g., Atlassian's `/agile` guide). For typical blog posts, `/blog/post-title` is sufficient.

**Template Libraries**
High-intent keywords + product adoption.
- Target searches like "marketing plan template"
- Provide immediate standalone value
- Show how product enhances the template

### Shareable Content Types

**Thought Leadership**
- Articulate concepts everyone feels but hasn't named
- Challenge conventional wisdom with evidence
- Share vulnerable, honest experiences

**Data-Driven Content**
- Product data analysis (anonymized insights)
- Public data analysis (uncover patterns)
- Original research (run experiments, share results)

**Expert Roundups**
15-30 experts answering one specific question. Built-in distribution.

**Case Studies**
Structure: Challenge → Solution → Results → Key learnings

**Meta Content**
Behind-the-scenes transparency. "How We Got Our First $5k MRR," "Why We Chose Debt Over VC."

For programmatic content at scale, see **programmatic-seo** skill.

---

## Content Pillars and Topic Clusters

Content pillars are the 3-5 core topics your brand will own. Each pillar spawns a cluster of related content.

Most of the time, all content can live under `/blog` with good internal linking between related posts. Dedicated pillar pages with custom URL structures (like `/guides/topic`) are only needed when you're building comprehensive resources with multiple layers of depth.

### How to Identify Pillars

1. **Product-led**: What problems does your product solve?
2. **Audience-led**: What does your ICP need to learn?
3. **Search-led**: What topics have volume in your space?
4. **Competitor-led**: What are competitors ranking for?

### Pillar Structure

```
Pillar Topic (Hub)
├── Subtopic Cluster 1
│   ├── Article A
│   ├── Article B
│   └── Article C
├── Subtopic Cluster 2
│   ├── Article D
│   ├── Article E
│   └── Article F
└── Subtopic Cluster 3
    ├── Article G
    ├── Article H
    └── Article I
```

### Pillar Criteria

Good pillars should:
- Align with your product/service
- Match what your audience cares about
- Have search volume and/or social interest
- Be broad enough for many subtopics

---

## Keyword Research by Buyer Stage

Map topics to the buyer's journey using proven keyword modifiers:

### Awareness Stage
Modifiers: "what is," "how to," "guide to," "introduction to"

Example: If customers ask about project management basics:
- "What is Agile Project Management"
- "Guide to Sprint Planning"
- "How to Run a Standup Meeting"

### Consideration Stage
Modifiers: "best," "top," "vs," "alternatives," "comparison"

Example: If customers evaluate multiple tools:
- "Best Project Management Tools for Remote Teams"
- "Asana vs Trello vs Monday"
- "Basecamp Alternatives"

### Decision Stage
Modifiers: "pricing," "reviews," "demo," "trial," "buy"

Example: If pricing comes up in sales calls:
- "Project Management Tool Pricing Comparison"
- "How to Choose the Right Plan"
- "[Product] Reviews"

### Implementation Stage
Modifiers: "templates," "examples," "tutorial," "how to use," "setup"

Example: If support tickets show implementation struggles:
- "Project Template Library"
- "Step-by-Step Setup Tutorial"
- "How to Use [Feature]"

---

## Content Ideation Sources

### 1. Keyword Data

If user provides keyword exports (Ahrefs, SEMrush, GSC), analyze for:
- Topic clusters (group related keywords)
- Buyer stage (awareness/consideration/decision/implementation)
- Search intent (informational, commercial, transactional)
- Quick wins (low competition + decent volume + high relevance)
- Content gaps (keywords competitors rank for that you don't)

Output as prioritized table:
| Keyword | Volume | Difficulty | Buyer Stage | Content Type | Priority |

### 2. Call Transcripts

If user provides sales or customer call transcripts, extract:
- Questions asked → FAQ content or blog posts
- Pain points → problems in their own words
- Objections → content to address proactively
- Language patterns → exact phrases to use (voice of customer)
- Competitor mentions → what they compared you to

Output content ideas with supporting quotes.

### 3. Survey Responses

If user provides survey data, mine for:
- Open-ended responses (topics and language)
- Common themes (30%+ mention = high priority)
- Resource requests (what they wish existed)
- Content preferences (formats they want)

### 4. Forum Research

Use web search to find content ideas:

**Reddit:** `site:reddit.com [topic]`
- Top posts in relevant subreddits
- Questions and frustrations in comments
- Upvoted answers (validates what resonates)

**Quora:** `site:quora.com [topic]`
- Most-followed questions
- Highly upvoted answers

**Other:** Indie Hackers, Hacker News, Product Hunt, industry Slack/Discord

Extract: FAQs, misconceptions, debates, problems being solved, terminology used.

### 5. Competitor Analysis

Use web search to analyze competitor content:

**Find their content:** `site:competitor.com/blog`

**Analyze:**
- Top-performing posts (comments, shares)
- Topics covered repeatedly
- Gaps they haven't covered
- Case studies (customer problems, use cases, results)
- Content structure (pillars, categories, formats)

**Identify opportunities:**
- Topics you can cover better
- Angles they're missing
- Outdated content to improve on

### 6. Sales and Support Input

Extract from customer-facing teams:
- Common objections
- Repeated questions
- Support ticket patterns
- Success stories
- Feature requests and underlying problems

---

## Prioritizing Content Ideas

Score each idea on four factors:

### 1. Customer Impact (40%)
- How frequently did this topic come up in research?
- What percentage of customers face this challenge?
- How emotionally charged was this pain point?
- What's the potential LTV of customers with this need?

### 2. Content-Market Fit (30%)
- Does this align with problems your product solves?
- Can you offer unique insights from customer research?
- Do you have customer stories to support this?
- Will this naturally lead to product interest?

### 3. Search Potential (20%)
- What's the monthly search volume?
- How competitive is this topic?
- Are there related long-tail opportunities?
- Is search interest growing or declining?

### 4. Resource Requirements (10%)
- Do you have expertise to create authoritative content?
- What additional research is needed?
- What assets (graphics, data, examples) will you need?

### Scoring Template

| Idea | Customer Impact (40%) | Content-Market Fit (30%) | Search Potential (20%) | Resources (10%) | Total |
|------|----------------------|-------------------------|----------------------|-----------------|-------|
| Topic A | 8 | 9 | 7 | 6 | 8.0 |
| Topic B | 6 | 7 | 9 | 8 | 7.1 |

---

## Output Format

When creating a content strategy, provide:

### 1. Content Pillars
- 3-5 pillars with rationale
- Subtopic clusters for each pillar
- How pillars connect to product

### 2. Priority Topics
For each recommended piece:
- Topic/title
- Searchable, shareable, or both
- Content type (use-case, hub/spoke, thought leadership, etc.)
- Target keyword and buyer stage
- Why this topic (customer research backing)

### 3. Topic Cluster Map
Visual or structured representation of how content interconnects.

---

## Content Strategy Examples

### Example 1: SaaS (Project Management Software)

**Content Pillars**:
1. **Product Knowledge** (Awareness stage)
   - What is project management
   - PM frameworks (Agile, Scrum, Waterfall, Kanban)
   - PM best practices
   - Industry-specific PM approaches

2. **Implementation & Use Cases** (Consideration stage)
   - PM for [specific team type]: designers, engineers, marketing, sales
   - PM for [project type]: product launches, website redesigns
   - PM for [challenge]: remote teams, distributed teams, time zone challenges

3. **Thought Leadership** (Authority building)
   - Original research on PM trends
   - PM challenges in 2024
   - Case studies from customer successes
   - Expert interviews with known PM leaders

4. **Product Education** (Decision stage)
   - How to [use feature]
   - [Feature] best practices
   - Comparison: [Our tool] vs alternatives
   - Pricing and ROI calculators

**Content Calendar (Next 3 months)**:
- Month 1: Launch 3 pillar pages (What is PM, PM for remote teams, PM frameworks)
- Month 2: Publish 2 thought leadership pieces (original research, expert interview)
- Month 3: Product education series (5 how-to articles)
- Ongoing: 2 blog posts/week on targeted keywords

**Success Metrics**:
- Reach 5,000 organic visitors/month within 6 months
- Rank for 20+ target keywords
- 2% conversion rate on educational content → demo request

---

### Example 2: E-commerce (Pet Grooming)

**Content Pillars**:
1. **Pet Grooming Education** (Awareness)
   - How to groom [breed]
   - Grooming for [coat type]
   - Grooming for [problem]: matting, shedding, odor
   - Grooming tools explained

2. **Product Guides** (Consideration)
   - Best clippers for [coat type]
   - Brush types compared
   - [Product] reviews and comparisons
   - Buying guide: How to choose clippers

3. **Use Cases & Scenarios** (Conversion)
   - DIY grooming at home
   - Professional grooming tips
   - Grooming for show dogs
   - Quick grooming routines for busy owners

**Content Map**:

```
Pillar: How to Groom Your Dog at Home (2,500 words)
├─ Cluster: How to Groom a [Breed 1] (800 words)
├─ Cluster: How to Groom a [Breed 2] (800 words)
├─ Cluster: Best Clippers for Thick Coats (1,500 words)
│  └─ Reviews: [5 specific products]
├─ Cluster: Grooming for Matted Fur (800 words)
└─ Cluster: DIY Grooming Tools You Need (600 words)
```

**Content Calendar**:
- Launch pillar page first (comprehensive, links to all clusters)
- Release 1 cluster per week (staggered for sustained traffic)
- Intersperse product reviews throughout

**Success Metrics**:
- Rank top 5 for "how to groom [breed]" keywords
- 5,000+ visitors to pillar from all clusters
- 3% affiliate link click-through from product reviews

---

### Example 3: Local Service (Dental Practice)

**Content Strategy**: Local Authority Building

**Content Pillars**:
1. **Service Education** (Awareness)
   - What is [procedure]
   - [Procedure] cost and pricing
   - [Procedure] recovery and aftercare
   - Is [procedure] right for you?

2. **Local Authority** (Trust building)
   - Best dentist in [neighborhood]
   - [Procedure] near me
   - Local dental tips (water quality, fluoride levels)
   - Local patient stories

3. **FAQ Content** (Conversion)
   - How long does [procedure] take?
   - Is [procedure] painful?
   - How long do results last?
   - What to expect before/after

**Content Examples**:
- Blog post: "Root Canal Procedure Steps Explained" (targets "root canal near me" intent)
- Service page: "Teeth Whitening in Austin" (geo + service)
- FAQ page: "Common cosmetic dentistry questions" (targets feature snippets)
- Location page: "Best Dentist in Downtown Austin" (local authority)

**Content Calendar**:
- Publish 2-3 blog posts/month (FAQ style, local intent)
- Update service pages with before/after photos quarterly
- Publish patient testimonial video monthly (builds trust)

**Success Metrics**:
- Rank top 3 for "[procedure] near me" queries
- Top local pack position for primary service areas
- 20+ patient phone calls from organic search/month

---

## Content Strategy Development Matrix

Use this to prioritize topic ideas:

| Topic | Searchable (Y/N) | Shareable (Y/N) | Effort (Low/Med/High) | Impact (Low/Med/High) | Priority |
|-------|------------------|-----------------|----------------------|----------------------|----------|
| "How to X" | Y | Y | Low | High | 🔴 Start now |
| Listicle "Best X" | Y | Y | Medium | High | 🔴 Start now |
| Original research | N | Y | High | High | 🟡 Plan for Q2 |
| Competitor comparison | Y | N | Low | High | 🔴 Start now |
| Expert interview | N | Y | Medium | Medium | 🟡 Plan for Q3 |
| Industry trend analysis | Y | Y | Medium | Medium | 🟡 Plan for Q2 |
| Case study | N | Y | Medium | High | 🔴 Plan for month 2 |
| Product tutorial | Y | N | Low | Medium | 🟡 Ongoing |
| News/trending topic | Y | Y | Low | Low | 🟢 Maybe |

**Action**: Focus on 🔴 items first (high impact, achievable), then 🟡, save 🟢 for when you have extra capacity.

---

## Task-Specific Questions

1. What patterns emerge from your last 10 customer conversations?
2. What questions keep coming up in sales calls?
3. Where are competitors' content efforts falling short?
4. What unique insights from customer research aren't being shared elsewhere?
5. Which existing content drives the most conversions, and why?

---

## Related Skills

- **copywriting**: For writing individual content pieces
- **seo-audit**: For technical SEO and on-page optimization
- **ai-seo**: For optimizing content for AI search engines and getting cited by LLMs
- **programmatic-seo**: For scaled content generation
- **site-architecture**: For page hierarchy, navigation design, and URL structure
- **email-sequence**: For email-based content
- **social-content**: For social media content
