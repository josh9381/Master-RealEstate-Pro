---
name: design-audit
description: "Systematic UI/UX audit of existing pages and components against design principles. Use when: reviewing UI quality, checking accessibility, auditing visual hierarchy, finding UX issues, code reviewing frontend changes. Triggers: design review, UI audit, UX review, accessibility check, visual hierarchy review, design feedback."
---

# Design Audit — Systematic UI Review

Evaluate existing UI against fundamental design principles. Provides actionable feedback rooted in design theory. Adapted from LibreUIUX Design Mastery plugin.

## When to Use

- Reviewing existing pages for quality improvements
- Code reviewing frontend PRs
- Checking accessibility compliance
- Identifying visual hierarchy issues
- Improving user experience of existing features

## Audit Framework

Evaluate across these dimensions, scoring 1-10:

### 1. Visual Hierarchy (Weight: High)

- [ ] Clear focal point — eye knows where to go first
- [ ] Logical reading order — F-pattern or Z-pattern flow
- [ ] Appropriate scale — importance reflected in size
- [ ] Contrast creates emphasis — color, weight, space differentiation
- [ ] Progressive disclosure — complexity revealed appropriately

**Key Question**: Can a user identify the primary action in under 3 seconds?

### 2. Typography (Weight: High)

- [ ] Limited typeface palette — 2 fonts maximum
- [ ] Clear hierarchy — heading, subheading, body, caption are distinct
- [ ] Readable body text — 45-75 characters per line
- [ ] Appropriate line height — 1.5+ for body, 1.2 for headings
- [ ] Consistent scale — following the project's type scale

### 3. Color Usage (Weight: High)

- [ ] Limited palette — using semantic tokens, not arbitrary colors
- [ ] 60-30-10 proportions — dominant, secondary, accent
- [ ] Semantic consistency — same colors mean same things everywhere
- [ ] WCAG AA contrast — 4.5:1 for text, 3:1 for UI components
- [ ] Dark mode correct — colors swap appropriately

### 4. Spacing & Layout (Weight: High)

- [ ] Consistent spacing scale — using Tailwind's 4px-based scale
- [ ] Sufficient whitespace — elements have room to breathe
- [ ] Logical grouping — related items are proximate (Gestalt)
- [ ] Grid adherence — consistent column structure
- [ ] Responsive — works at 375px, 768px, 1024px, 1440px

### 5. Interactive States (Weight: High)

- [ ] Hover states — all clickable elements respond to hover
- [ ] Focus states — visible keyboard focus indicators
- [ ] Active/pressed states — tactile feedback
- [ ] Disabled states — clearly non-interactive
- [ ] Loading states — feedback during async operations
- [ ] Error states — clear error messaging and recovery

### 6. Consistency (Weight: Medium)

- [ ] Component patterns — same elements look the same
- [ ] Interaction patterns — same actions work the same
- [ ] Naming/labeling — terminology is consistent
- [ ] Icon usage — consistent icon family (lucide-react)
- [ ] Brand alignment — matches design system tokens

### 7. Accessibility (Weight: High)

- [ ] Semantic HTML — proper elements (`button`, `a`, `nav`, `main`)
- [ ] Keyboard navigable — Tab order makes sense
- [ ] Screen reader labels — `aria-label` on icon buttons
- [ ] Dynamic announcements — `aria-live` on changing content
- [ ] Heading hierarchy — proper h1 → h2 → h3 nesting
- [ ] Touch targets — 44×44px minimum on mobile

### 8. Performance (Weight: Medium)

- [ ] No layout shift (CLS) — elements don't jump as page loads
- [ ] Lazy loading — below-fold content loaded on demand
- [ ] Optimized images — proper sizing, formats
- [ ] Minimal re-renders — proper React patterns

## Audit Procedure

1. **Read the target file(s)** being audited
2. **Score each dimension** 1-10 with specific observations
3. **Identify top 3 critical issues** that most impact UX
4. **Provide specific fixes** with code snippets for each issue
5. **Rate overall quality** as: Poor (1-3), Needs Work (4-5), Good (6-7), Excellent (8-9), Outstanding (10)

## Output Format

```markdown
## Design Audit: [Component/Page Name]

### Summary
Overall Score: X/10
Critical Issues: N

### Scores
| Dimension | Score | Key Finding |
|-----------|-------|-------------|
| Visual Hierarchy | X/10 | ... |
| Typography | X/10 | ... |
| Color Usage | X/10 | ... |
| Spacing & Layout | X/10 | ... |
| Interactive States | X/10 | ... |
| Consistency | X/10 | ... |
| Accessibility | X/10 | ... |
| Performance | X/10 | ... |

### Critical Issues
1. **[Issue]**: [Description] → [Specific fix with code]
2. ...

### Recommendations
- [Quick wins that have highest impact]
```
