# Master RealEstate Pro — Developer Setup Guide

## Prerequisites

| Tool | Min Version | Purpose |
|------|------------|---------|
| Node.js | 20.x | Runtime |
| npm | 10.x | Package manager |
| PostgreSQL | 15+ | Primary database |
| Redis | 7+ | Caching + distributed locks (optional but recommended) |
| Git | Any | Source control |

---

## Quick Start (Local Development)

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd Master-RealEstate-Pro

# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..
```

### 2. Configure environment variables

Copy the example files:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your values (see [Environment Variables](#environment-variables) below).

Minimum required variables to run locally:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/masterrealestate"
JWT_SECRET="<any-long-random-string>"
JWT_ACCESS_SECRET="<any-long-random-string>"
JWT_REFRESH_SECRET="<any-long-random-string>"
MASTER_ENCRYPTION_KEY="<exactly-32-bytes-base64-encoded>"
NODE_ENV="development"
```

Generate a secure `MASTER_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Set up the database

```bash
cd backend

# Run all Prisma migrations
npx prisma migrate dev

# (Optional) Seed the database with sample data
npm run prisma:seed
```

### 4. Start development servers

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts at http://localhost:8000
# API docs at http://localhost:8000/api-docs
```

**Terminal 2 — Frontend:**
```bash
# From project root
npm run dev
# Frontend starts at http://localhost:5173
```

Or use the convenience script:

```bash
./start-dev.sh   # Starts both frontend and backend
./stop-dev.sh    # Stops both
```

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/dbname` |
| `JWT_SECRET` | Legacy JWT signing secret (kept for compatibility) |
| `JWT_ACCESS_SECRET` | Access token signing secret (15-min tokens) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (1d / 7d tokens) |
| `MASTER_ENCRYPTION_KEY` | AES encryption key for secrets at rest — exactly 32 bytes, base64-encoded |

### Optional — Third-Party Services

| Variable | Service | Default behavior if absent |
|----------|---------|--------------------------|
| `SENDGRID_API_KEY` | SendGrid email | Logs to console instead of sending |
| `FROM_EMAIL` | Sender email address | `noreply@localhost` |
| `FROM_NAME` | Sender display name | `Master RealEstate Pro` |
| `TWILIO_ACCOUNT_SID` | Twilio SMS | Mock mode — SMS logged, not sent |
| `TWILIO_AUTH_TOKEN` | Twilio auth | Mock mode |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | App fails to start if Twilio SID is set |
| `OPENAI_API_KEY` | OpenAI | AI features disabled |
| `STRIPE_SECRET_KEY` | Stripe | Billing features disabled |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | Webhook verification skipped |
| `SENTRY_DSN` | Sentry error tracking | Error tracking disabled |

### Optional — Infrastructure

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | HTTP server port |
| `NODE_ENV` | `development` | `development` or `production` |
| `FRONTEND_URL` | — | Used for CORS in production (e.g. `https://app.yourdomain.com`) |
| `REDIS_ENABLED` | `false` | Set `true` to enable Redis caching + distributed locks |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `VAPID_PUBLIC_KEY` | — | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | — | Web Push VAPID private key |

---

## Available Scripts

### Frontend (run from project root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (hot reload) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run type-check` | TypeScript type check (no emit) |
| `npm run lint` | ESLint frontend |
| `npm run lint:all` | ESLint frontend + backend |
| `npm run type-check:all` | Type check frontend + backend |
| `npm run e2e` | Run Playwright E2E tests |
| `npm run e2e:ui` | Open Playwright UI mode |

### Backend (run from `backend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend with tsx watch (live reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start compiled backend (`dist/server.js`) |
| `npm test` | Run Jest backend tests |
| `npm run type-check` | TypeScript type check (no emit) |
| `npm run prisma:generate` | Regenerate Prisma client after schema changes |
| `npm run prisma:migrate` | Apply pending database migrations |
| `npm run prisma:studio` | Open Prisma Studio (visual DB browser) |
| `npm run prisma:seed` | Seed database with development data |

---

## Database Migrations

This project uses Prisma Migrations. All schema changes should go through migrations:

```bash
cd backend

# Make a schema change in prisma/schema.prisma, then:
npx prisma migrate dev --name describe-your-change

# To apply in production (CI/CD):
npx prisma migrate deploy
```

> **⚠️ Never run `prisma migrate dev` in production.** Use `prisma migrate deploy` instead.

---

## Running Tests

### Unit Tests (Vitest — frontend)

```bash
# Run all
npm test

# Run specific file
npx vitest run src/store/__tests__/toastStore.test.ts

# Watch mode
npm run test:watch
```

### Unit Tests (Jest — backend)

```bash
cd backend
npm test

# With coverage
npm run test:coverage
```

### E2E Tests (Playwright)

Requires the full app running locally:

```bash
# Start the app first
./start-dev.sh

# Then run E2E tests
npm run e2e
```

---

## Code Architecture Conventions

### Frontend

1. **Pages vs Components**: Route-level components live in `src/pages/`, reusable components in `src/components/`
2. **API calls**: Always use methods from `src/lib/api.ts` — never use `fetch` or axios directly in components
3. **State management**:
   - **Server state**: React Query (`useQuery` / `useMutation`) 
   - **Global client state**: Zustand stores in `src/store/`
   - **Local UI state**: `useState`
4. **Auth-protected routes**: Wrap with `<RequireAuth>` in `App.tsx`
5. **Admin-only routes**: Wrap with `<RequireAdmin>` in `App.tsx`
6. **localStorage**: Always use `src/lib/userStorage.ts` helpers (user-scoped keys)
7. **Error handling**: Use `console.error(error)` in catch blocks — never swallow silently

### Backend

1. **Route files**: Define routes only — import controllers, add middleware
2. **Controllers**: Business logic + DB access via Prisma. Return response with `res.json()`
3. **Services**: Complex multi-step logic extracted from controllers (campaign execution, AI, etc.)
4. **Validation**: Every POST/PUT/PATCH body goes through a Zod validator from `validators/`
5. **Auth middleware**: `authenticate` → sets `req.user`. `requireAdmin` → checks role
6. **Org scoping**: Always filter Prisma queries with `organizationId: req.user.organizationId`
7. **Error handling**: Throw errors — Express 5 catches async errors automatically

---

## Common Development Tasks

### Adding a new API endpoint

1. Add Prisma model / migration if schema change needed
2. Create/update controller in `backend/src/controllers/`
3. Add Zod validator in `backend/src/validators/`
4. Register route in `backend/src/routes/` with `validate()` middleware
5. Mount route in `server.ts`
6. Add corresponding API client method in `src/lib/api.ts`
7. Use via `useQuery`/`useMutation` in the frontend component

### Adding a new page

1. Create page component in `src/pages/<section>/PageName.tsx`
2. Add lazy import in `src/App.tsx`: `const PageName = lazy(() => import('./pages/...'))`
3. Add `<Route>` in the router (inside `<RequireAuth>` if protected)
4. Add sidebar navigation entry in `src/components/layout/Sidebar.tsx`

### Adding a new Zustand store

1. Create `src/store/myStore.ts` with `create<StoreType>()(...)` pattern
2. Export typed selector hooks if needed
3. Add to relevant components via `useMyStore(s => s.field)`

---

## Troubleshooting

### `Cannot find module '@/...'` errors
Ensure the `vite.config.ts` and `tsconfig.json` both have the `@/*` alias pointing to `./src/*`.

### Prisma type errors after schema change
Run `npm run prisma:generate` in `backend/` to regenerate the Prisma client.

### JWT token errors in development
Ensure `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are set in `.env`. The app requires these at startup.

### Redis connection failures
Redis is optional. Set `REDIS_ENABLED=false` (the default) in `.env` to bypass Redis entirely. Caching and distributed locks degrade gracefully.

### Vitest globals (`vi`, `describe`, etc.) not found  
These are declared globally via `/// <reference types="vitest/globals" />` in `src/vite-env.d.ts`. If the IDE doesn't see them, restart the TypeScript language server.

### CORS errors in development
The backend allows all origins in development mode (`NODE_ENV !== 'production'`). If you're seeing CORS errors, verify `NODE_ENV` is not set to `production` in your `.env`.
