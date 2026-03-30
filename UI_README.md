# Master RealEstate Pro — UI Layer

This is the **extracted frontend UI** from the Master RealEstate Pro application, isolated for a complete visual redesign.

## Tech Stack

- **React 18** + TypeScript
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **React Router v6** (routing)
- **TanStack React Query** (data fetching)
- **Zustand** (state management)
- **Recharts** (charts)
- **Lucide React** (icons)
- **Socket.io-client** (real-time)

## Getting Started

```bash
npm install
npm run dev    # starts on http://localhost:3000
```

> **Note:** The UI expects a backend API at `http://localhost:8000/api`. Without it, pages will load but data won't populate. See "Mock Data" section below.

## Project Structure

```
src/
├── components/          # Reusable UI components (~101 files)
│   ├── ui/             # Base components (Button, Card, Input, Badge, Table, Dialog)
│   ├── layout/         # MainLayout, Sidebar, Header, Breadcrumbs
│   ├── ai/             # AI feature components
│   ├── leads/          # Lead management components
│   ├── campaigns/      # Campaign components
│   ├── auth/           # Auth guards (ProtectedRoute, RequireRole)
│   ├── email/          # Email builder
│   ├── workflows/      # Workflow builder
│   ├── notifications/  # Notification components
│   └── ...             # Other feature components
│
├── pages/              # Page-level components (~101 files)
│   ├── dashboard/      # Main dashboard
│   ├── leads/          # Lead pages (list, detail, create, pipeline)
│   ├── campaigns/      # Campaign pages
│   ├── analytics/      # Analytics & reports
│   ├── communication/  # Inbox, SMS, email templates
│   ├── settings/       # Settings pages
│   ├── auth/           # Login, Register, Forgot Password
│   └── ...             # Other pages
│
├── hooks/              # Custom React hooks
├── store/              # Zustand state stores
├── lib/                # API layer, utilities
├── services/           # Domain services
├── types/              # TypeScript interfaces
├── App.tsx             # Route definitions
├── main.tsx            # Entry point with providers
└── index.css           # Tailwind + custom styles
```

## What You CAN Freely Redesign

**Go wild with these — this is what the redesign is for:**

- **All component markup/JSX** — restructure layouts, change element hierarchy
- **All Tailwind classes** — new colors, spacing, typography, animations
- **`tailwind.config.js`** — completely new theme, colors, fonts, border radius
- **`index.css`** — custom CSS, animations, transitions
- **`src/components/ui/`** — replace with a UI library (shadcn, MUI, Chakra, etc.)
- **`src/components/layout/`** — completely new layout structure (sidebar, header, navigation)
- **Page layouts** — rearrange sections, add hero areas, change grid structures
- **Add new visual elements** — animations, gradients, glassmorphism, images, illustrations
- **Add new dependencies** — animation libs (Framer Motion), UI frameworks, etc.
- **Icons** — swap Lucide for another icon library

## What You Should NOT Change

**Keep these interfaces intact so the UI plugs back into the backend:**

- **`src/lib/api.ts`** — API function signatures and endpoints (the visual layer calls these)
- **`src/types/index.ts`** — TypeScript interfaces (Lead, Campaign, User, etc.)
- **`src/store/`** — Zustand store interfaces (you can change how stores are *consumed* visually)
- **`src/hooks/`** — Custom hook interfaces (keep the return types the same)
- **Route paths in `App.tsx`** — Keep `/leads`, `/campaigns`, `/dashboard`, etc. the same
- **React Query keys** — Don't change the query key patterns

**In short:** Change how things *look*, not how things *work*.

## Mock Data (For Previewing Without Backend)

To preview the UI without a running backend, you can:

1. Create mock data files in `src/mocks/`
2. Use [MSW (Mock Service Worker)](https://mswjs.io/) to intercept API calls
3. Or simply hardcode sample data in components during redesign

Example mock setup:
```bash
npm install msw --save-dev
npx msw init public/
```

## Reinserting Back Into Main Repo

After redesign, to merge back:

1. Copy redesigned `src/` into the main repo's `src/`
2. Update `tailwind.config.js` if theme changed
3. Update `index.css` if custom styles changed
4. Add any new npm dependencies to main repo's `package.json`
5. Run `npm install && npm run build` to verify
6. Test against the real backend

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
VITE_API_URL=http://localhost:8000/api
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=RealEstate Pro
```
