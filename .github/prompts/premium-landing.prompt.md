---
name: premium-landing
description: "Generate premium-quality landing page sections with modern design. Use for hero sections, feature grids, pricing tables, testimonials, CTAs."
---

# Premium Landing Page

Generate premium $5k+ quality landing page sections. Uses the UI UX Pro Max search engine for data-driven design decisions.

## Workflow

### 1. Define Context
- What sections are needed? (hero, features, pricing, testimonials, CTA, footer)
- What is the target audience?
- What is the primary conversion goal?

### 2. Get Design Recommendations
```bash
python3 .github/skills/ui-ux-pro-max/scripts/search.py "real estate SaaS landing" --design-system -p "Master RealEstate Pro"
python3 .github/skills/ui-ux-pro-max/scripts/search.py "hero social-proof pricing" --domain landing
```

### 3. Build Each Section
Apply these patterns:

**Hero Section:**
- Strong headline with `text-4xl md:text-5xl lg:text-6xl font-bold`
- Subheadline with `text-lg md:text-xl text-muted-foreground`
- Clear CTA button with colored shadow
- Optional product screenshot/mockup
- Subtle background gradient or glass effect

**Feature Grid:**
- Use `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Each card: icon + title + description
- Hover effect on cards

**Social Proof:**
- Metrics with large numbers: `text-3xl font-bold`
- Logo wall with grayscale hover-to-color effect
- Testimonial cards with avatar + quote

**CTA Section:**
- Contrasting background
- Single clear action
- Urgency/value proposition

### 4. Quality Check
- [ ] Responsive at all breakpoints
- [ ] Dark mode compatible
- [ ] Animations use `prefers-reduced-motion`
- [ ] All text meets WCAG AA contrast
- [ ] Images have alt text
