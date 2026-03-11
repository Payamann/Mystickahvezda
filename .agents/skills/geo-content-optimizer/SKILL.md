---
name: geo-content-optimizer
description: "This skill should be used when the user asks to \"optimize for AI\"\
  , \"get cited by ChatGPT\", \"appear in AI answers\", \"GEO optimization\", \"generative\
  \ engine optimization\", \"Google AI Overview optimization\", \"get mentioned by\
  \ Perplexity AI\", \"appear in Gemini answers\", \"AI does not mention my brand\"\
  , \"make content AI-quotable\", or \"increase AI citation frequency\". Optimizes\
  \ content to increase citation frequency across AI systems: ChatGPT (Browse), Claude,\
  \ Perplexity AI, Google AI Overviews, and Google Gemini. Adds quotable statements,\
  \ structured Q&A, precise statistics with sources, expert attribution, and FAQ schema.\
  \ Uses CORE-EEAT GEO-First items (C02, C09, O03, R01\u2013R05, E01) as optimization\
  \ targets. Produces a GEO score, rewritten content sections, and a citation-optimization\
  \ checklist. For SEO-focused writing, see seo-content-writer. For entity and brand\
  \ AI presence, see entity-optimizer."
version: 3.0.0
metadata:
  author: internal-team
  license: Internal
  tags:
  - seo
  - content
  - optimize
  triggers:
  - geo content
  - location targeting
  - regional content
  - geo seo
  estimated-duration: Medium
  geo-relevance: high
---

# GEO Content Optimizer

> **[SEO & GEO Skills Library](https://skills.sh/aaron-he-zhu/seo-geo-claude-skills)** · 20 skills for SEO + GEO · Install all: `npx skills add aaron-he-zhu/seo-geo-claude-skills`

<details>
<summary>Browse all 20 skills</summary>

**Research** · [keyword-research](../../research/keyword-research/) · [competitor-analysis](../../research/competitor-analysis/) · [serp-analysis](../../research/serp-analysis/) · [content-gap-analysis](../../research/content-gap-analysis/)

**Build** · [seo-content-writer](../seo-content-writer/) · **geo-content-optimizer** · [meta-tags-optimizer](../meta-tags-optimizer/) · [schema-markup-generator](../schema-markup-generator/)

**Optimize** · [on-page-seo-auditor](../../optimize/on-page-seo-auditor/) · [technical-seo-checker](../../optimize/technical-seo-checker/) · [internal-linking-optimizer](../../optimize/internal-linking-optimizer/) · [content-refresher](../../optimize/content-refresher/)

**Monitor** · [rank-tracker](../../monitor/rank-tracker/) · [backlink-analyzer](../../monitor/backlink-analyzer/) · [performance-reporter](../../monitor/performance-reporter/) · [alert-manager](../../monitor/alert-manager/)

**Cross-cutting** · [content-quality-auditor](../../cross-cutting/content-quality-auditor/) · [domain-authority-auditor](../../cross-cutting/domain-authority-auditor/) · [entity-optimizer](../../cross-cutting/entity-optimizer/) · [memory-management](../../cross-cutting/memory-management/)

</details>

This skill optimizes content to appear in AI-generated responses. As AI systems increasingly answer user queries directly, getting cited by these systems becomes crucial for visibility.

## When to Use This Skill

- Optimizing existing content for AI citations
- Creating new content designed for both SEO and GEO
- Improving chances of appearing in AI Overviews
- Making content more quotable by AI systems
- Adding authority signals that AI systems trust
- Structuring content for AI comprehension
- Competing for visibility in the AI-first search era

## What This Skill Does

1. **Citation Optimization**: Makes content more likely to be quoted by AI
2. **Structure Enhancement**: Formats content for AI comprehension
3. **Authority Building**: Adds signals that AI systems trust
4. **Factual Enhancement**: Improves accuracy and verifiability
5. **Quote Creation**: Creates memorable, citeable statements
6. **Source Attribution**: Adds proper citations that AI can verify
7. **GEO Scoring**: Evaluates content's AI-friendliness

## How to Use

### Optimize Existing Content

```
Optimize this content for GEO/AI citations: [content or URL]
```

```
Make this article more likely to be cited by AI systems
```

### Create GEO-Optimized Content

```
Write content about [topic] optimized for both SEO and GEO
```

### GEO Audit

```
Audit this content for GEO readiness and suggest improvements
```

## Data Sources

> See [CONNECTORS.md](../../CONNECTORS.md) for tool category placeholders.

**With ~~AI monitor + ~~SEO tool connected:**
Automatically pull AI citation patterns (which content is being cited by ChatGPT, Claude, Perplexity), current AI visibility scores, competitor citation frequency, and AI Overview appearance tracking.

**With manual data only:**
Ask the user to provide:
1. Target queries where they want AI citations
2. Current content URL or full content text
3. Any known instances where competitors are being cited by AI

Proceed with the full workflow using provided data. Note in the output which metrics are from automated collection vs. user-provided data.

## Instructions

When a user requests GEO optimization:

1. **Load CORE-EEAT GEO-First Optimization Targets**

   Before optimizing, load GEO-critical items from the [CORE-EEAT Benchmark](../../references/core-eeat-benchmark.md):

   ```markdown
   ### CORE-EEAT GEO-First Targets

   These items have the highest impact on AI engine citation. Use as optimization checklist:

   **Top 6 Priority Items**:
   | Rank | ID | Standard | Why It Matters |
   |------|----|----------|---------------|
   | 1 | C02 | Direct Answer in first 150 words | All engines extract from first paragraph |
   | 2 | C09 | Structured FAQ with Schema | Directly matches AI follow-up queries |
   | 3 | O03 | Data in tables, not prose | Most extractable structured format |
   | 4 | O05 | JSON-LD Schema Markup | Helps AI understand content type |
   | 5 | E01 | Original first-party data | AI prefers exclusive, verifiable sources |
   | 6 | O02 | Key Takeaways / Summary Box | First choice for AI summary citations |

   **All GEO-First Items** (optimize for all when possible):
   C02, C04, C05, C07, C08, C09 | O02, O03, O04, O05, O06, O09
   R01, R02, R03, R04, R05, R07, R09 | E01, E02, E03, E04, E06, E08, E09, E10
   Exp10 | Ept05, Ept08 | A08

   **AI Engine Preferences**:
   | Engine | Priority Items |
   |--------|----------------|
   | Google AI Overview | C02, O03, O05, C09 |
   | ChatGPT Browse | C02, R01, R02, E01 |
   | Perplexity AI | E01, R03, R05, Ept05 |
   | Claude | R04, Ept08, Exp10, R03 |

   _Full benchmark: [references/core-eeat-benchmark.md](../../references/core-eeat-benchmark.md)_
   ```

2. **Analyze Current Content**

   ```markdown
   ## GEO Analysis: [Content Title]
   
   ### Current State Assessment
   
   | GEO Factor | Current Score (1-10) | Notes |
   |------------|---------------------|-------|
   | Clear definitions | [X] | [notes] |
   | Quotable statements | [X] | [notes] |
   | Factual density | [X] | [notes] |
   | Source citations | [X] | [notes] |
   | Q&A format | [X] | [notes] |
   | Authority signals | [X] | [notes] |
   | Content freshness | [X] | [notes] |
   | Structure clarity | [X] | [notes] |
   | **GEO Readiness** | **[avg]/10** | **Average across factors** |
   
   **Primary Weaknesses**:
   1. [Weakness 1]
   2. [Weakness 2]
   3. [Weakness 3]
   
   **Quick Wins**:
   1. [Quick improvement 1]
   2. [Quick improvement 2]
   ```

3. **Apply GEO Optimization Techniques**

   > **GEO fundamentals**: AI systems prioritize content that is authoritative (expert credentials, proper citations), accurate (verifiable, up-to-date), clear (well-structured, unambiguous), and quotable (standalone answers, specific data). See [references/geo-optimization-techniques.md](./references/geo-optimization-techniques.md) for details.

   Apply the six core optimization techniques: definition optimization, quotable statement creation, authority signal enhancement, structure optimization, factual density improvement, and FAQ schema implementation.

   > **Reference**: See [references/geo-optimization-techniques.md](./references/geo-optimization-techniques.md) for detailed before/after examples, templates, and checklists for each technique.

   Key principles:
   - **Definitions**: 25-50 words, standalone, starting with the term
   - **Quotable statements**: Specific statistics with sources, verifiable facts
   - **Authority signals**: Expert quotes with credentials, proper source citations
   - **Structure**: Q&A format, comparison tables, numbered lists
   - **Factual density**: Replace vague claims with specific data points
   - **FAQ schema**: JSON-LD FAQPage markup matching visible content

4. **Generate GEO-Optimized Output**

   ```markdown
   ## GEO Optimization Report

   ### Changes Made

   **Definitions Added/Improved**:
   1. [Definition 1] - [location in content]
   2. [Definition 2] - [location in content]

   **Quotable Statements Created**:
   1. "[Statement 1]"
   2. "[Statement 2]"

   **Authority Signals Added**:
   1. [Expert quote/citation]
   2. [Source attribution]

   **Structural Improvements**:
   1. [Change 1]
   2. [Change 2]

   ### Before/After GEO Score

   | GEO Factor | Before (1-10) | After (1-10) | Change |
   |------------|---------------|--------------|--------|
   | Clear definitions | [X] | [X] | +[X] |
   | Quotable statements | [X] | [X] | +[X] |
   | Factual density | [X] | [X] | +[X] |
   | Source citations | [X] | [X] | +[X] |
   | Q&A format | [X] | [X] | +[X] |
   | Authority signals | [X] | [X] | +[X] |
   | **Overall GEO Score** | **[avg]/10** | **[avg]/10** | **+[X]** |

   ### AI Query Coverage

   This content is now optimized to answer:
   - "What is [topic]?" ✅
   - "How does [topic] work?" ✅
   - "Why is [topic] important?" ✅
   - "[Topic] vs [alternative]" ✅
   - "Best [topic] for [use case]" ✅
   ```

5. **CORE-EEAT GEO Self-Check**

    After optimization, verify GEO-First items:

    ```markdown
    ### CORE-EEAT GEO Post-Optimization Check

    | ID | Standard | Status | Notes |
    |----|----------|--------|-------|
    | C02 | Direct Answer in first 150 words | ✅/⚠️/❌ | [notes] |
    | C04 | Key terms defined on first use | ✅/⚠️/❌ | [notes] |
    | C09 | Structured FAQ with Schema | ✅/⚠️/❌ | [notes] |
    | O02 | Summary Box / Key Takeaways | ✅/⚠️/❌ | [notes] |
    | O03 | Comparisons in tables | ✅/⚠️/❌ | [notes] |
    | O05 | JSON-LD Schema Markup | ✅/⚠️/❌ | [notes] |
    | O06 | Section chunking (3–5 sentences) | ✅/⚠️/❌ | [notes] |
    | R01 | ≥5 precise data points with units | ✅/⚠️/❌ | [notes] |
    | R02 | ≥1 citation per 500 words | ✅/⚠️/❌ | [notes] |
    | R04 | Claims backed by evidence | ✅/⚠️/❌ | [notes] |
    | R07 | Full entity names | ✅/⚠️/❌ | [notes] |
    | E01 | Original first-party data | ✅/⚠️/❌ | [notes] |
    | Exp10 | Limitations acknowledged | ✅/⚠️/❌ | [notes] |
    | Ept08 | Reasoning transparency | ✅/⚠️/❌ | [notes] |

    **Items Needing Attention**: [list any ⚠️/❌ items]

    _For full 80-item audit, use [content-quality-auditor](../../cross-cutting/content-quality-auditor/)_
    ```

## Validation Checkpoints

### Input Validation
- [ ] Content source identified (URL, full text, or content draft)
- [ ] Target AI queries or topics clearly defined
- [ ] Current GEO baseline assessed (if optimizing existing content)

### Output Validation
- [ ] At least 3 clear, quotable definitions added
- [ ] Factual density improved with at least 5 verifiable statistics
- [ ] All claims have source citations from authoritative sources
- [ ] Q&A format sections cover top 5 user queries
- [ ] GEO score improvement of at least 50% from baseline
- [ ] Source of each data point clearly stated (~~AI monitor data, user-provided, or estimated)

## Example

**User**: "Optimize this paragraph for GEO: 'Email marketing is a good way to reach customers. It's been around for a while and many businesses use it. You can send newsletters, promotions, and other messages.'"

**Output**:

```markdown
## GEO-Optimized Version

**Email marketing** is a digital marketing strategy that uses email to promote 
products, build customer relationships, and drive conversions. According to 
the Data & Marketing Association, email marketing delivers an average ROI 
of $42 for every $1 invested, making it the highest-performing digital 
marketing channel.

### Key email marketing formats include:

1. **Newsletters**: Regular updates sharing company news, industry insights, 
   and valuable content to maintain subscriber engagement
2. **Promotional emails**: Time-sensitive offers, discounts, and product 
   announcements designed to drive immediate sales
3. **Transactional emails**: Order confirmations, shipping updates, and 
   account notifications with 8x higher open rates than marketing emails
4. **Automated sequences**: Pre-scheduled email series triggered by user 
   actions, such as welcome series or abandoned cart reminders

> **Key statistic**: 81% of small businesses rely on email as their primary 
> customer acquisition channel (Emarsys, 2024).

---

### Changes Made:

Changes: added clear definition, 2 stats with sources, structured list, DMA/Emarsys citations, 3 quotable facts. **GEO Score**: 1/10 → 8/10.
```

## GEO Optimization Checklist

> **Reference**: See the GEO Readiness Checklist in [references/geo-optimization-techniques.md](./references/geo-optimization-techniques.md) for the full checklist covering definitions, quotable content, authority, structure, and technical elements.

## GEO Optimization Frameworks

### The "QUOTE Protocol" — Making Content AI-Quotable

AI systems cite content that provides:
- **Quotable**: Stands alone without context
- **Unique**: Not general knowledge
- **Original**: First-party data or exclusive insight
- **Traceable**: Source and attribution are clear
- **Explicit**: Direct answer, no ambiguity

**Example NOT quotable**:
"Email marketing is important for businesses because it helps reach customers and build relationships."
→ Generic, not specific, no data

**Example QUOTABLE**:
"Email marketing delivers a 4,200% ROI according to the Data & Marketing Association, meaning for every $1 spent, marketers get $42 in return."
→ Specific statistic, named source, clear number

---

### The "Definition Sandwich" Framework

AI systems prioritize content that defines terms clearly. Use this 3-part structure:

```
TERM: [The term you're defining]

SIMPLE DEFINITION (25-35 words):
Clear, jargon-free definition that a 10-year-old could understand.

TECHNICAL DEFINITION (40-60 words):
Industry-specific definition with relevant context and distinctions.

EXAMPLE (30-50 words):
Real-world example showing the term in practice.
```

**Real Example**:

```
TERM: Cumulative Layout Shift (CLS)

SIMPLE DEFINITION:
When a webpage's elements move around unexpectedly while you're reading or clicking.
Example: A button shifts down just as you're about to click it.

TECHNICAL DEFINITION:
CLS is a Core Web Vital measuring unexpected visual instability caused by asynchronously
loaded content, unannounced ads, or dynamic content. Measured on a 0-1 scale (ideal <0.1).
Caused by missing image dimensions, animations, font-loading, or DOM manipulation.

EXAMPLE:
You're reading a blog post when suddenly an ad loads, pushing your current paragraph down
3 inches. You lose your place. CLS score: 0.15 (failing). Fixed by reserving space for ads
in CSS. CLS score: 0.05 (passing).
```

---

### AI Engine Preference Framework

Different AI systems prefer different content structures:

| AI Engine | Prefers | Structure | Example |
|-----------|---------|-----------|---------|
| **Google AI Overview** | Definitions + tables | Direct answer, data in tables | "What is project management?" |
| **ChatGPT Browse** | Original data + expert quotes | First-party research, attributed sources | Industry studies, original research |
| **Perplexity AI** | Comprehensive + recent | Updated stats, multiple viewpoints | "Latest trends in [topic]" |
| **Claude** | Reasoning transparency | Methodology explanation, caveats | "How does X work?" |
| **Gemini** | Structured data + schema | JSON-LD, FAQ schema, tables | Blog posts with schema |

**Optimization strategy**:
- Add definitions (AI Overview loves these)
- Include original statistics (ChatGPT, Perplexity cite first-party data)
- Explain your methodology (Claude respects transparent reasoning)
- Structure with tables and lists (Gemini prefers structured formats)
- Add FAQ schema (All prefer Q&A format)

---

## GEO Optimization Real Examples

### Example 1: Blog Post Optimization for Google AI Overviews

**Original paragraph** (NOT optimized for GEO):
"Project management is important for teams because it helps with organization and communication. Teams that use project management tools tend to perform better and meet deadlines more easily."

**Problems**:
- Vague ("important," "tend to")
- No data points
- No quoted statistic
- Generic, could describe anything

**GEO-Optimized version**:

```markdown
**Project Management** is a structured approach to organizing team work through planning,
scheduling, resource allocation, and communication protocols. According to the Project
Management Institute, 75% of organizations that adopt formal project management achieve
above-average project success rates, defined as projects completing on time and within budget.

### Key metrics for project success:

- **On-time delivery**: 75% of organizations with project management finish on schedule
  (vs. 35% of organizations without formal PM)
- **Budget adherence**: Projects stay within budget 71% of the time with PM processes
  (vs. 42% without)
- **Team efficiency**: Teams using PM tools report 45% fewer meeting hours through
  async status updates and centralized communication

> **Direct quote from PMI study**: "Organizations that enforce discipline around project
> management practices have project success rates that are 2.5x higher than organizations
> that do not."
```

**What changed**:
- ✅ Added clear definition (first sentence)
- ✅ Added specific statistic with source (75%, PMI)
- ✅ Compared with/without scenarios
- ✅ Structured data as bullet points (AI loves this)
- ✅ Added direct quote from authoritative source
- ✅ Provided 3 quantifiable metrics

**Expected AI Citation**: HIGH probability of being cited in Google AI Overview for "what is project management"

---

### Example 2: Service Page Optimization for GEO

**Original** (Website homepage, not GEO-optimized):
"We offer the best project management software for teams. Our tool is easy to use and helps teams collaborate better. Trusted by thousands of companies."

**Problems**:
- Marketing language ("best," "trusted by thousands")
- No facts, only claims
- Not written for AI extraction
- Can't be directly quoted

**GEO-Optimized version**:

```markdown
## What is [ProductName] Project Management Software?

[ProductName] is a web-based project management platform that enables teams to track
tasks, collaborate in real-time, and manage project timelines through a visual kanban
board interface, built-in team chat, and automated status reporting. The platform integrates
with 50+ business tools including Slack, Google Workspace, and Zapier.

### Key features:

| Feature | Description | Use Case |
|---------|-------------|----------|
| **Kanban Board** | Visual task organization with drag-and-drop | Real-time sprint management |
| **Timeline View** | Gantt chart showing project dependencies | Long-term project planning |
| **Team Chat** | Integrated messaging and comment threads | Reduce context-switching to Slack |
| **Automations** | Custom workflows (status change → Slack notification) | 8+ hours/week time savings per user |

### Customer results:

- **Zapier**: Reduced project delays from 2.5 weeks to 3 days (Zapier case study, 2024)
- **Buffer**: Decreased project meeting time by 40% (case study, 2023)
- **GitLab**: 50% faster project kickoffs with [ProductName] (internal data)

> **Customer testimonial**: "Before [ProductName], we had status updates across 6 different
> tools. Now everything is in one place. We've cut administrative overhead by 6 hours/week."
> — Sarah Chen, Zapier Project Manager

## How it compares to alternatives

| Feature | [ProductName] | Monday.com | Asana | Jira |
|---------|---------------|-----------|-------|------|
| Ease of Setup | <1 hour | 2 hours | 1.5 hours | 4+ hours |
| Free Plan | Yes, unlimited users | Yes, 3 users max | Yes, 15 users max | Yes |
| Learning Curve | Low | Medium | Medium | High |
| Best For | Small-medium teams | Custom workflows | Enterprise | Engineering teams |
```

**What changed**:
- ✅ Clear definition with specific details (kanban board, integrations)
- ✅ 3 customer results with metrics
- ✅ Comparison table (AI loves these)
- ✅ Direct customer quote with name/title
- ✅ Each claim backed by evidence
- ✅ Specific numbers (50+ integrations, 40% reduction, etc.)

**Expected AI Citation**: HIGH probability in "best project management tools" queries

---

## Tips for Success

1. **Answer the question first** - Put the answer in the first sentence
2. **Be specific** - Vague content doesn't get cited
3. **Cite sources** - AI systems trust verifiable information
4. **Stay current** - Update statistics and facts regularly
5. **Match query format** - Questions deserve direct answers
6. **Build authority** - Expert credentials increase citation likelihood
7. **Use tables and lists** - Structured data gets cited more often
8. **Include comparisons** - AI systems cite comparison tables frequently
9. **Attribute quotes** - Always credit the person/organization providing data
10. **Add FAQ schema** - Helps all AI systems understand your content

## Reference Materials

- [AI Citation Patterns](./references/ai-citation-patterns.md) - How Google AI Overviews, ChatGPT, Perplexity, and Claude select and cite sources
- [Quotable Content Examples](./references/quotable-content-examples.md) - Before/after examples of content optimized for AI citation

## Related Skills

- [seo-content-writer](../seo-content-writer/) — Create SEO content to optimize
- [schema-markup-generator](../schema-markup-generator/) — Add structured data
- [content-refresher](../../optimize/content-refresher/) — Update content for freshness
- [content-quality-auditor](../../cross-cutting/content-quality-auditor/) — Full 80-item CORE-EEAT audit
- [serp-analysis](../../research/serp-analysis/) — Analyze AI Overview patterns

