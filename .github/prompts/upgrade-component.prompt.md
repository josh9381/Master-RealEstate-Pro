---
name: upgrade-component
description: "Upgrade an existing UI component to professional quality. Adds missing hover states, animations, accessibility, dark mode support, and modern design patterns."
---

# Upgrade Component to Professional Quality

Take an existing component and upgrade it to premium quality by applying modern design patterns.

## What to Upgrade

Given a component file path, apply these enhancements:

### 1. Interactive States
Add missing states to all interactive elements:
- `hover:` — visual feedback on mouse over
- `focus-visible:ring-2 ring-ring ring-offset-2` — keyboard focus
- `active:scale-[0.98]` — pressed feedback
- `disabled:opacity-50 disabled:cursor-not-allowed` — disabled state
- `transition-all duration-200` — smooth transitions

### 2. Micro-Animations
- Card hover: `hover:shadow-md hover:border-primary/20 transition-all duration-200`
- Button hover: `hover:bg-primary/90 active:scale-[0.98] transition-all duration-150`
- Entrance: `animate-fade-in-up` for staggered card appearance
- Table rows: `hover:bg-muted/50 transition-colors duration-150`

### 3. Visual Hierarchy
- Ensure proper heading sizes (h1 > h2 > h3)
- Add `text-muted-foreground` to secondary text
- Use `font-medium` and `font-semibold` to create weight hierarchy
- Add proper spacing between sections

### 4. Accessibility
- Add `aria-label` to icon-only buttons
- Ensure semantic HTML elements
- Add `role` attributes where needed
- Check color contrast

### 5. Dark Mode
- Replace any hardcoded colors with semantic tokens
- Verify cards/surfaces use `bg-card` not `bg-white`
- Check borders use `border-border` not `border-gray-200`

### 6. Loading & Empty States
- Add skeleton loaders for async data
- Add empty state UI with icon + message + action
- Add error state with retry capability

## Procedure

1. Read the target component file
2. Identify missing enhancements from the list above
3. Apply changes using the project's `cn()` utility
4. Preserve existing functionality
5. Run the component's tests if they exist
