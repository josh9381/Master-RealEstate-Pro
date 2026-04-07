---
name: ui-ux-pro-max
description: "Searchable design intelligence database with 67 styles, 161 color palettes, 57 font pairings, 99 UX guidelines, and 25 chart types. Use when: choosing styles, colors, fonts, building new pages, creating landing pages, improving UI, adding dark mode, charts, or data visualization. Triggers: design system, color palette, font pairing, style guide, UX review, chart recommendation."
---

# UI/UX Pro Max — Design Intelligence Skill

A searchable design database with BM25-ranked recommendations for styles, colors, typography, UX guidelines, charts, and stack-specific patterns. Adapted from [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).

## Prerequisites

Python 3.x (no external dependencies).

## How to Use

Use this skill when the user requests any design decisions:

| Scenario | Trigger Examples | Start From |
|----------|-----------------|------------|
| **New project / page** | "Build a dashboard", "Create a landing page" | Step 1 → Step 2 |
| **New component** | "Create a pricing card", "Add a modal" | Step 3 (domain: style, ux) |
| **Choose style / color / font** | "What style fits a real estate CRM?", "Recommend colors" | Step 2 |
| **Review existing UI** | "Review this page for UX issues" | Step 3 (domain: ux) |
| **Add charts / data viz** | "Add analytics dashboard charts" | Step 3 (domain: chart) |
| **Stack best practices** | "React performance tips", "shadcn patterns" | Step 4 |

## Step 1: Analyze User Requirements

Extract:
- **Product type**: SaaS, CRM, real estate, dashboard
- **Target audience**: Agents, brokers, admins, leads
- **Style keywords**: professional, modern, clean, data-dense
- **Stack**: React + Tailwind + shadcn/ui (this project)

## Step 2: Generate Design System (REQUIRED for new pages/features)

```bash
python3 .github/skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

This returns: pattern, style, colors, typography, effects, and anti-patterns.

**Example:**
```bash
python3 .github/skills/ui-ux-pro-max/scripts/search.py "real estate CRM dashboard professional" --design-system -p "Master RealEstate Pro"
```

## Step 3: Detailed Domain Searches

```bash
python3 .github/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

| Need | Domain | Example |
|------|--------|---------|
| Product type patterns | `product` | `--domain product "SaaS CRM"` |
| Style options | `style` | `--domain style "glassmorphism dark"` |
| Color palettes | `color` | `--domain color "real estate professional"` |
| Font pairings | `typography` | `--domain typography "professional modern"` |
| Chart recommendations | `chart` | `--domain chart "real-time dashboard"` |
| UX best practices | `ux` | `--domain ux "animation accessibility"` |
| Landing structure | `landing` | `--domain landing "hero social-proof"` |

## Step 4: Stack-Specific Guidelines

```bash
# React patterns
python3 .github/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack react

# shadcn/ui patterns
python3 .github/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack shadcn

# Tailwind patterns
python3 .github/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack html-tailwind
```

## Available Data

| Domain | Records | Description |
|--------|---------|-------------|
| styles | 67 | UI styles with CSS keywords and AI prompts |
| colors | 161 | Color palettes by product type |
| typography | 57 | Font pairings with Google Fonts imports |
| ux-guidelines | 99 | Best practices and anti-patterns |
| charts | 25 | Chart types and library recommendations |
| landing | 35 | Page structure and CTA strategies |
| products | varies | Product type recommendations |
| react stack | 54 | React/Next.js performance patterns |
| shadcn stack | 61 | shadcn/ui component patterns |

## Project Context

This is a **Real Estate CRM SaaS** built with:
- React 18 + TypeScript + Vite
- Tailwind CSS with HSL CSS custom properties (shadcn/ui convention)
- Custom component library following shadcn/ui patterns (`cn()`, `forwardRef`, variants)
- lucide-react icons
- Dark mode via `.dark` class
- Recharts for data visualization
