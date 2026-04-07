# Master RealEstate Pro — Copilot Instructions

## Project Overview

A professional Real Estate CRM SaaS application built with React 18, TypeScript, Vite, and Tailwind CSS. Backend uses Node.js/Express with Prisma ORM and PostgreSQL.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with HSL CSS custom properties (shadcn/ui convention)
- **UI Components**: Custom component library following shadcn/ui patterns
- **State**: Zustand (client) + TanStack React Query (server)
- **Icons**: lucide-react (SVG-based)
- **Charts**: Recharts
- **Routing**: React Router v6
- **Backend**: Express + Prisma + PostgreSQL
- **Testing**: Vitest (frontend), Jest (backend), Playwright (e2e)

## Code Conventions

### Component Structure
- Components use `React.forwardRef` with `displayName`
- Class merging via `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge)
- All components accept `className` prop for consumer overrides
- Variant-based styling via conditional `cn()` objects
- UI primitives in `src/components/ui/` — compound component pattern (e.g., `Card`, `CardHeader`, `CardContent`)

### Styling Rules
- **Always** use Tailwind utility classes — no CSS modules or styled-components
- **Always** use semantic token classes (`bg-primary`, `text-muted-foreground`) — never raw color values
- **Always** use the Tailwind spacing scale — never arbitrary pixel values
- Dark mode via `.dark` class with CSS variable swapping in `src/index.css`
- HSL format without `hsl()` wrapper in CSS variables (e.g., `221.2 83.2% 53.3%`)

### State Management
- Server state (API data) → TanStack React Query
- Client state (UI toggles, form state) → Zustand stores in `src/store/`
- URL state for shareable filters/pagination via React Router

### Testing
- Frontend unit tests: `src/**/__tests__/*.test.tsx` with Vitest
- Backend tests: `backend/tests/` with Jest
- E2e tests: `e2e/tests/` with Playwright

## UI/UX Standards

### Design Quality
- Professional, clean, data-dense layouts appropriate for a CRM dashboard
- Consistent 4px/8px spacing grid
- Every interactive element needs hover, focus, active, and disabled states
- Smooth transitions (150-300ms) on all interactive elements
- Loading states for async operations, empty states for lists
- WCAG AA accessibility compliance (4.5:1 contrast, keyboard navigable, semantic HTML)

### Available Design Skills
When working on UI/UX tasks, these skills are available:
- `/ui-ux-pro-max` — Searchable database of 67+ styles, 161 colors, 57 fonts, 99 UX guidelines
- `/ui-design-system` — Comprehensive design system methodology with patterns and checklists
- `/design-audit` — Systematic UI review framework with scoring

## Build & Test Commands

```bash
# Frontend
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite build
npm run test         # Run Vitest
npm run type-check   # TypeScript only

# Backend
cd backend && npm run dev    # Start backend
cd backend && npm test       # Run Jest

# E2e
npm run e2e          # Run Playwright tests
```
