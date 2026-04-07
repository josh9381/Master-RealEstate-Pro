---
name: ui-design-system
description: "Comprehensive UI/UX design system methodology for building professional interfaces. Use when: creating components, improving visual hierarchy, implementing animations, choosing spacing/typography, enhancing dark mode, building responsive layouts, improving hover states, adding micro-interactions. Triggers: component design, visual hierarchy, animation, spacing, typography, responsive, hover effect, micro-interaction, glass effect, gradient."
---

# UI Design System — Professional Interface Design

A comprehensive design methodology combining best practices from UI UX Pro Max, LibreUIUX, Claude Code UI Agents, and the Awesome Claude Code Toolkit. Tuned for this project's React + Tailwind + shadcn/ui stack.

## Design Philosophy

**Modern. Clean. Data-Dense. Professional.**

- Information-first layouts for CRM dashboard
- Consistent spacing on 4px/8px base grid
- Clear visual hierarchy with typography scale
- Micro-interactions that provide feedback, not distraction
- Dark mode as first-class citizen
- Accessibility (WCAG AA) as default

## Core Principles

1. **Design System First**: Never write custom styles directly in components. Use semantic tokens (`--primary`, `--accent`) and component variants
2. **Systematic Consistency**: Same elements look the same, same actions work the same
3. **Progressive Disclosure**: Complexity revealed appropriately
4. **Whitespace as Design Element**: Let elements breathe

---

## Color System

### Semantic Token Architecture (HSL)

This project uses HSL-based semantic tokens in `src/index.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
}
```

### Color Application Rules

| Purpose | Token | Usage |
|---------|-------|-------|
| Primary actions, CTAs | `--primary` | Buttons, links, active states |
| Page background | `--background` | Main content area |
| Card surfaces | `--card` | Card backgrounds |
| Body text | `--foreground` | Primary text |
| Secondary text | `--muted-foreground` | Descriptions, hints |
| Errors, warnings | `--destructive` | Error states, delete actions |
| Borders | `--border` | Dividers, input borders |
| Focus rings | `--ring` | Keyboard focus indicators |

### Status Colors (extend in Tailwind config)

```css
--success: 142 76% 36%;     /* green - Active, completed */
--warning: 38 92% 50%;      /* amber - Pending, attention */
--info: 199 89% 48%;        /* sky - Information */
```

### Color Psychology for Real Estate

- **Blue** (primary): Trust, professionalism, stability — perfect for financial/property decisions
- **Green**: Success, growth, positive metrics — use for conversion/deal indicators
- **Amber**: Attention, urgency — use for follow-up reminders, pending actions
- **Red**: Danger, urgency — use sparingly for destructive actions, overdue items

---

## Typography

### Scale (Compact for data-dense views)

| Element | Tailwind | Size | Weight | Use Case |
|---------|----------|------|--------|----------|
| Page Title | `text-2xl` | 24px | `font-semibold` | Page headers |
| Section Title | `text-lg` | 18px | `font-semibold` | Card/section headers |
| Card Title | `text-base` | 16px | `font-medium` | Card titles |
| Body | `text-sm` | 14px | `font-normal` | Default body text |
| Label | `text-xs` | 12px | `font-medium` | Labels, tags, captions |
| Metric | `text-3xl` | 30px | `font-bold` | Dashboard KPI numbers |
| Small Metric | `text-xl` | 20px | `font-semibold` | Secondary metrics |

### Typography Rules

- Maximum 2 font families (sans-serif + monospace for code)
- Line height: `leading-relaxed` (1.625) for body, `leading-tight` (1.25) for headings
- Line length: 45-75 characters per line for readability
- Don't use `font-bold` for everything — use weight to create hierarchy

---

## Spacing System

### 4px Base Grid

| Token | Value | Use Case |
|-------|-------|----------|
| `gap-1` / `p-1` | 4px | Inline icon gaps, tight spacing |
| `gap-2` / `p-2` | 8px | Default small spacing, badge padding |
| `gap-3` / `p-3` | 12px | Button padding-y, compact card padding |
| `gap-4` / `p-4` | 16px | **Standard** card padding, component gaps |
| `gap-6` / `p-6` | 24px | Section padding, comfortable card padding |
| `gap-8` / `p-8` | 32px | Component group gaps |
| `gap-12` | 48px | Section gaps |

### Spacing Rules

- Always use Tailwind spacing scale — never arbitrary values
- Consistent padding within component types (all cards same padding)
- Use `gap` in flex/grid instead of margin for spacing between children
- More space between unrelated groups, less between related items (Gestalt proximity)

---

## Border Radius

| Token | Value | Use Case |
|-------|-------|----------|
| `rounded-sm` | `calc(var(--radius) - 4px)` | Small badges, chips |
| `rounded-md` | `calc(var(--radius) - 2px)` | Buttons, inputs |
| `rounded-lg` | `var(--radius)` | **Default** — cards, containers |
| `rounded-xl` | 12px | Modals, hero cards |
| `rounded-full` | 9999px | Avatars, status dots, pills |

---

## Shadows & Depth

### Light Mode
```css
shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.05)     /* Subtle elevation */
shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.1)  /* Cards */
shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.1) /* Modals, dropdowns */
```

### Dark Mode
- Reduce shadow opacity by 50%
- Use `ring-1 ring-white/10` for edge definition instead of shadows
- Use subtle background color differences for depth

### Colored Shadows (for emphasis)
```css
shadow-primary: 0 4px 14px 0 rgba(59, 130, 246, 0.25)  /* Primary buttons */
shadow-success: 0 4px 14px 0 rgba(34, 197, 94, 0.25)   /* Success states */
```

---

## Animation & Micro-Interactions

### Timing Standards

| Duration | Use Case | Easing |
|----------|----------|--------|
| 150ms | Micro: hover colors, opacity | `ease-out` |
| 200ms | Standard: button hover, focus | `ease-out` |
| 300ms | Complex: modal enter, slide | `ease-in-out` |
| 500ms | Page transitions | `ease-in-out` |

### Standard Transitions

```css
/* Default for all interactive elements */
transition: all 200ms ease-out;

/* Color-only changes (faster) */
transition: color 150ms ease-out, background-color 150ms ease-out;

/* Transform with bounce for delight */
transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Hover States (REQUIRED for all interactive elements)

```css
/* Buttons */
hover:bg-primary/90 active:scale-[0.98]

/* Cards */
hover:shadow-md hover:border-primary/20 transition-all duration-200

/* Table rows */
hover:bg-muted/50 transition-colors duration-150

/* Links */
hover:text-primary hover:underline
```

### Entrance Animations

```css
/* Fade in up — for cards, content sections */
@keyframes fade-in-up {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Scale in — for modals, popovers */
@keyframes scale-in {
  0% { opacity: 0; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}

/* Slide in — for sidebars, drawers */
@keyframes slide-in-right {
  0% { transform: translateX(100%); }
  100% { transform: translateX(0); }
}
```

### Accessibility: Reduced Motion

**Always** wrap non-essential animations:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Component Patterns

### Interactive States Checklist

Every interactive component MUST implement:
- [ ] **Default** — resting state
- [ ] **Hover** — mouse over (`hover:`)
- [ ] **Focus** — keyboard focus (`focus-visible:ring-2 ring-ring ring-offset-2`)
- [ ] **Active** — pressed (`active:scale-[0.98]`)
- [ ] **Disabled** — non-interactive (`disabled:opacity-50 disabled:cursor-not-allowed`)
- [ ] **Loading** — async operation (spinner + disabled)

### Card Pattern

```tsx
<div className="bg-card border border-border rounded-lg p-6 
  hover:shadow-md hover:border-primary/20 
  transition-all duration-200">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-base font-medium text-card-foreground">Title</h3>
    <Badge variant="secondary">Status</Badge>
  </div>
  <p className="text-sm text-muted-foreground">Description</p>
</div>
```

### Metric Card Pattern

```tsx
<div className="bg-card border border-border rounded-lg p-4">
  <div className="flex items-center justify-between">
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
      Revenue
    </span>
    <span className="text-xs text-emerald-500 flex items-center gap-1">
      <TrendingUp className="w-3 h-3" /> +12.5%
    </span>
  </div>
  <div className="mt-2">
    <span className="text-2xl font-bold text-foreground">$45,231</span>
    <span className="text-sm text-muted-foreground ml-2">this month</span>
  </div>
</div>
```

### Glass Effect (use sparingly for premium feel)

```tsx
<div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl 
  border border-white/20 dark:border-gray-700/30 
  rounded-2xl shadow-xl p-6">
  {/* Content */}
</div>
```

### Empty State Pattern

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
    <Icon className="w-6 h-6 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-medium text-foreground mb-1">No items yet</h3>
  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
    Description of what to do next.
  </p>
  <Button>Add First Item</Button>
</div>
```

---

## Responsive Design

### Breakpoints

| Breakpoint | Width | Target |
|-----------|-------|--------|
| Default | 0px+ | Mobile phones |
| `sm:` | 640px+ | Large phones |
| `md:` | 768px+ | Tablets |
| `lg:` | 1024px+ | Laptops |
| `xl:` | 1280px+ | Desktops |
| `2xl:` | 1536px+ | Large screens |

### Mobile-First Rules

- Start with mobile layout, add complexity upward
- Touch targets: minimum 44×44px on mobile
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Sidebar: hidden on mobile, visible on `lg:`
- Font scaling: `text-2xl md:text-3xl lg:text-4xl` for hero text

---

## Accessibility Requirements (WCAG AA)

### Color Contrast
- Normal text: 4.5:1 ratio minimum
- Large text (18px+ bold or 24px+): 3:1 ratio minimum
- UI components: 3:1 against adjacent colors

### Keyboard Navigation
- All interactive elements reachable via Tab
- Visible focus indicators (`focus-visible:ring-2`)
- Escape key closes modals/popovers
- Enter/Space activate buttons and links
- Arrow keys navigate within composite widgets (tabs, menus)

### Semantic HTML
- `<button>` for actions, `<a>` for navigation
- `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` for landmarks
- `aria-label` on icon-only buttons
- `aria-live="polite"` on dynamic content (notifications, toast)
- Proper heading hierarchy (h1 → h2 → h3, never skip)

### Screen Reader Support
- Meaningful alt text on images
- `sr-only` class for visually hidden but screen-reader-accessible text
- Status announcements for async operations

---

## Quality Checklist

Before completing any UI work, verify:

- [ ] No emojis used as icons (use lucide-react SVGs)
- [ ] `cursor-pointer` on all clickable non-button elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Focus states visible for keyboard navigation
- [ ] Text contrast meets WCAG AA (4.5:1)
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] Dark mode renders correctly
- [ ] Loading states for async operations
- [ ] Empty states for lists/tables
- [ ] Error states for failed operations
- [ ] Consistent spacing using Tailwind scale
- [ ] Component uses `cn()` for class merging
- [ ] Component accepts `className` prop for overrides
