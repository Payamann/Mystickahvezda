# Skills Improvement - Implementation Plan

**Branch:** claude/improve-skills-content-34eWl
**Status:** Ready to implement
**Phase 1 Priority:** Quick Wins + Expansion

---

## Phase 1: Quick Wins (1-2 hours)

Start here for immediate improvements:

### 1.1 Create Skills Index

**File:** `.agents/SKILLS_INDEX.md`
**Effort:** 30 minutes

Create a searchable index of all 70+ skills organized by:
- SEO Skills (Research, Build, Optimize, Monitor)
- Marketing Skills (Copywriting, Strategy, Campaigns)
- CRO Skills (Conversion Optimization, Testing)
- Technical Skills (Performance, Design, Deployment)

### 1.2 Add Related Skills to Thin Skills

**Target:** 30 skills without proper "Related Skills" section
**Effort:** 30 minutes

Example structure to replicate:
```markdown
## Related Skills
- [alert-manager](../alert-manager/) — Monitoring companion
- [rank-tracker](../rank-tracker/) — Ranking data source
- [technical-seo-checker](../technical-seo-checker/) — Technical validation
```

**Skills to update:**
- All `seo-*` skills
- `cold-email`, `competitor-analysis`, `keyword-research`
- `backlink-analyzer`, `internal-linking-optimizer`
- And 20+ others

### 1.3 Standardize Metadata

**Target:** All 70+ skills
**Effort:** 30 minutes

Ensure all SKILL.md files have:
```yaml
---
name: skill-name
description: [Clear 1-2 sentence description]
version: "X.Y.Z"
license: [LICENSE if known]
metadata:
  author: [author name]
  tags: [3-5 relevant tags]
  geo-relevance: [high/medium/low for SEO skills]
  triggers: [5-10 common user phrases]
---
```

---

## Phase 2: Foundation Enhancement (3-5 hours)

### 2.1 Create Skills Taxonomy

**File:** `.agents/SKILLS_CATEGORIES.md`

Document how skills are organized:
```
## SEO Skills

### Research
- keyword-research
- competitor-analysis
- serp-analysis
- content-gap-analysis

### Build
- seo-content-writer
- schema-markup-generator
- meta-tags-optimizer
- geo-content-optimizer

### Optimize
- on-page-seo-auditor
- technical-seo-checker
- internal-linking-optimizer
- content-refresher

### Monitor
- rank-tracker
- alert-manager
- backlink-analyzer
- performance-reporter

### Cross-Cutting
- content-quality-auditor
- domain-authority-auditor
- entity-optimizer
- memory-management
```

### 2.2 Create Metadata Schema

**File:** `.agents/SKILLS_METADATA_SCHEMA.json`

```json
{
  "skillMetadataSchema": {
    "required": ["name", "description", "version"],
    "recommended": ["author", "license", "tags", "triggers"],
    "optional": ["geo-relevance", "complexity", "duration", "dependencies"],
    "examples": {
      "tags": ["seo", "keyword-research", "tool-setup"],
      "triggers": ["research keywords", "find opportunities", "analyze search"],
      "complexity": ["beginner", "intermediate", "advanced"],
      "geo-relevance": ["high", "medium", "low"]
    }
  }
}
```

### 2.3 Expand Top 10 Skills

**Target:** Most-used, foundational skills
**Effort:** 3-5 hours

Priority order:
1. ✅ `seo` - Already excellent
2. ✅ `copywriting` - Already good
3. ✅ `programmatic-seo` - Already good
4. ✅ `alert-manager` - Already excellent
5. `seo-content-writer` - Needs expansion
6. `seo-audit` - Needs examples
7. `keyword-research` - Missing templates
8. `competitor-analysis` - Missing frameworks
9. `page-cro` - Needs detailed examples
10. `cold-email` - Needs templates

For each, add:
- [ ] 3-5 real-world examples
- [ ] 2-3 reference files
- [ ] Success metrics section
- [ ] 3-5 related skills

---

## Phase 3: Reference Materials (5-8 hours)

### 3.1 Create Category Templates

Create reference directories for each skill category:

**SEO Skills References:**
- E-E-A-T evaluation framework
- Core Web Vitals thresholds (CWV reference)
- Schema.org markup guide
- Link quality assessment rubric

**Marketing Skills References:**
- Copywriting formulas and frameworks
- Email sequence templates
- Campaign structure templates
- KPI tracking templates

**CRO Skills References:**
- Conversion funnel templates
- A/B test planning templates
- Heuristic evaluation checklists
- Benchmark data by industry

**Content Skills References:**
- Content quality assessment rubric
- Readability score thresholds
- Content refresh triggers
- Outdated content detection rules

### 3.2 Populate Reference Files

For each skill, create 2-3 reference files:

Example: `copywriting/references/`
- `copy-frameworks.md` - Headline formulas, page structures
- `natural-transitions.md` - Transition phrases, connectors
- `copy-examples.md` - Real examples by page type

---

## Phase 4: Workflows & Organization (3-4 hours)

### 4.1 Document Common Workflows

**File:** `.agents/SKILLS_WORKFLOWS.md`

Example workflows:

**Workflow 1: SEO Site Launch**
```
1. keyword-research (find opportunities) - 2-3 hours
2. site-architecture (plan structure) - 2-3 hours
3. seo-content-writer (create content) - 4-6 hours per page
4. schema-markup-generator (add structure) - 1 hour
5. technical-seo-checker (validate) - 1 hour
6. seo-audit (final check) - 1-2 hours
7. alert-manager (setup monitoring) - 1 hour
Total: 12-20 hours
```

**Workflow 2: Programmatic SEO**
```
1. keyword-research (identify patterns)
2. competitor-analysis (understand landscape)
3. programmatic-seo (plan strategy)
4. schema-markup-generator (setup structure)
5. seo-audit (validate)
6. alert-manager (monitor performance)
```

**Workflow 3: Page Optimization**
```
1. seo-audit (find issues)
2. on-page-seo-auditor (detail analysis)
3. copywriting (improve messaging)
4. schema-markup-generator (add data)
5. technical-seo-checker (resolve issues)
```

**Workflow 4: Content Marketing**
```
1. keyword-research (find topics)
2. content-strategy (plan approach)
3. seo-content-writer (write)
4. copy-editing (polish)
5. social-content (repurpose)
6. analytics-tracking (measure)
```

### 4.2 Create Getting Started Guide

**File:** `.agents/SKILLS_GETTING_STARTED.md`

- What are skills?
- How to use a skill
- Which skill for your goal?
- Common workflows
- Tips for success

---

## Skills Priority List

### Tier 1: Expand Immediately (10+ hours)
These are most-used, should be 200+ lines with examples:

- [ ] `seo-content-writer` - Missing examples and frameworks
- [ ] `seo-audit` - Needs expanded examples
- [ ] `keyword-research` - Missing template and workflow
- [ ] `competitor-analysis` - Needs frameworks and templates
- [ ] `page-cro` - Needs detailed CRO frameworks
- [ ] `cold-email` - Needs email templates
- [ ] `copywriting` - Already good, just needs minor expansion
- [ ] `programmatic-seo` - Already good, ensure references are complete

### Tier 2: Enhance (8-10 hours)
Add reference materials and examples:

- [ ] All `seo-*` skills (14 total)
- [ ] All CRO skills (8 total)
- [ ] All marketing skills (12 total)

### Tier 3: Standardize (2-3 hours)
Ensure consistency:

- [ ] All remaining skills get:
  - [ ] Proper metadata
  - [ ] 3-5 "Related Skills"
  - [ ] 1-2 examples
  - [ ] Success metrics section

---

## Implementation Checklist

### Immediate (2-3 hours)
- [ ] Create SKILLS_INDEX.md
- [ ] Add "Related Skills" to 30+ thin skills
- [ ] Standardize all metadata fields
- [ ] Create SKILLS_METADATA_SCHEMA.json

### Phase 1 (3-5 hours)
- [ ] Expand top 10 skills with examples
- [ ] Create SKILLS_CATEGORIES.md taxonomy
- [ ] Add success metrics to 20+ skills
- [ ] Create SKILLS_TEMPLATES.md

### Phase 2 (5-8 hours)
- [ ] Create reference directories for 10 key skills
- [ ] Populate 20-30 reference files
- [ ] Add examples to all tier 1 skills
- [ ] Document validation checkpoints

### Phase 3 (3-4 hours)
- [ ] Document 5-8 common workflows
- [ ] Create SKILLS_WORKFLOWS.md
- [ ] Create SKILLS_GETTING_STARTED.md
- [ ] Update main README

---

## Success Metrics

You'll know this is successful when:

1. **Every skill has 150+ lines of documentation**
2. **Every skill has 3-5 "Related Skills" references**
3. **Every skill has at least 1-2 examples**
4. **60+ skills have reference materials**
5. **Clear taxonomy categorizes all skills**
6. **Users can find the right skill in 30 seconds**
7. **Workflows show skill sequences and timing**

---

## Estimated Timeline

| Phase | Duration | Effort |
|-------|----------|--------|
| Quick Wins | 1-2 hours | 5-10 points |
| Foundation | 3-5 hours | 10-15 points |
| References | 5-8 hours | 15-20 points |
| Workflows | 3-4 hours | 10-15 points |
| **TOTAL** | **12-19 hours** | **40-60 points** |

---

## Who Should Do What

**For technical skills (1-2 hours):**
- Add metadata and related skills
- Standardize references

**For skill experts (4-6 hours each):**
- Expand tier 1 skills
- Add real-world examples
- Create reference templates
- Document workflows

**For project lead (2-3 hours):**
- Review and approve changes
- Coordinate across skills
- Update main documentation

---

## Questions Before Starting?

1. Which skills are most important to your users?
2. Should we prioritize by domain (SEO first?) or by usage?
3. Do you want skill difficulty levels / prerequisites?
4. Should there be a "quick start" template for each skill?
5. Any skills that need special attention or expansion?

Let me know if you'd like me to implement any of these phases! 🚀
