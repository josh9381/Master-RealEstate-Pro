# Master RealEstate Pro — Architecture Overview

## System Architecture

Master RealEstate Pro is a full-stack CRM application built for real estate professionals. It follows a client-server architecture with a React SPA frontend and a Node.js/Express REST API backend.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Client (Browser)                                                     │
│                                                                       │
│  React 19 + TypeScript        Vite (bundler)    Tailwind CSS          │
│  TanStack Query v5 (cache)    Zustand (store)   React Router v6       │
│  Socket.io-client             DOMPurify          recharts             │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │  HTTPS + WebSocket (Socket.io)
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│  Backend (Node.js)                                                    │
│                                                                       │
│  Express 5 + TypeScript       Pino (structured logging)              │
│  Helmet + CORS + CSRF         Rate limiting (express-rate-limit)      │
│  JWT Bearer auth              Zod request validation                  │
│  Multer (file uploads)        Sentry (error tracking, optional)       │
│  Swagger (API docs at /api-docs)                                      │
│                                                                       │
│  Socket.io server (real-time events)                                  │
│  node-cron (background jobs)                                          │
└───────────────────────┬───────────────────────┬─────────────────────┘
                        │                       │
           ┌────────────▼──────────┐   ┌────────▼─────────┐
           │  PostgreSQL (Prisma)   │   │  Redis (optional) │
           │  Primary datastore     │   │  Caching + locks  │
           └───────────────────────┘   └──────────────────┘
```

## Directory Structure

### Frontend (`/src`)

```
src/
├── main.tsx              # App entry point
├── App.tsx               # Root component + route definitions
├── index.css             # Global styles
├── vite-env.d.ts         # Vite + vitest type references
│
├── pages/                # Route-level page components (lazy-loaded)
│   ├── auth/             # Login, Register, ForgotPassword, ResetPassword
│   ├── dashboard/        # Main dashboard
│   ├── leads/            # Lead list, detail, pipeline, import, merge
│   ├── campaigns/        # Email/SMS campaigns, reports, A/B tests
│   ├── communication/    # Inbox, call center, email templates, newsletter
│   ├── analytics/        # Attribution, velocity, ROI, goals, custom reports
│   ├── calendar/         # Appointments + ICS export
│   ├── workflows/        # Visual workflow builder + execution logs
│   ├── ai/               # AI hub, lead scoring, cost dashboard, org settings
│   ├── settings/         # Profile, business, security, notifications, email
│   ├── admin/            # System admin panel (audit, team, feature flags, etc.)
│   ├── billing/          # Subscription and payment management
│   └── integrations/     # API keys, external integrations hub
│
├── components/           # Reusable components
│   ├── ui/               # Base UI primitives (Button, Input, Badge, etc.)
│   ├── layout/           # MainLayout, Sidebar, Header
│   ├── leads/            # Lead-specific sub-components
│   ├── campaigns/        # Campaign sub-components
│   ├── shared/           # Cross-feature components (ConfirmDialog, etc.)
│   └── auth/             # Auth guards (RequireAuth, RequireAdmin)
│
├── hooks/                # Custom React hooks
│   ├── useSessionManager.ts  # JWT refresh + idle timeout
│   ├── useRealtimeUpdates.ts # WebSocket event subscriptions
│   ├── useSocket.ts          # Socket.io connection management
│   └── useToast.ts           # Toast notification hook
│
├── lib/                  # Core utilities and API client
│   ├── api.ts            # Axios-based API client (all endpoint methods)
│   ├── appConfig.ts      # App-wide config constants
│   ├── userStorage.ts    # User-scoped localStorage helpers
│   ├── utils.ts          # General utilities
│   ├── exportService.ts  # CSV / PDF export
│   └── metricsCalculator.ts  # Dashboard metric calculation
│
├── store/                # Zustand global state
│   ├── authStore.ts      # Authentication + user state
│   ├── toastStore.ts     # Toast notifications
│   ├── uiStore.ts        # UI state (sidebar, theme)
│   └── confirmStore.ts   # Confirm dialog state
│
├── types/                # Shared TypeScript types
│   └── index.ts
│
└── test/
    └── setup.ts          # Vitest setup (mocks, environment)
```

### Backend (`/backend/src`)

```
backend/src/
├── server.ts             # Express app + middleware + route mounting
│
├── config/
│   ├── database.ts       # Prisma client singleton
│   ├── redis.ts          # ioredis client + connection management
│   ├── socket.ts         # Socket.io server setup + emit helpers
│   ├── cors.ts           # CORS options (dev-permissive / prod-strict)
│   ├── upload.ts         # Multer disk storage configs (avatar, logo, document)
│   ├── subscriptions.ts  # Stripe plan tiers, feature limits, price IDs
│   └── swagger.ts        # OpenAPI/Swagger spec setup
│
├── controllers/          # Route handler logic (one file per domain)
├── routes/               # Express router definitions (one file per domain)
├── services/             # Business logic (AI, campaigns, workflows, scoring, etc.)
├── middleware/
│   ├── auth.ts           # JWT `authenticate` middleware
│   ├── admin.ts          # Role guards (requireAdmin, requireAdminOrManager)
│   ├── validate.ts       # Zod request body/params/query validation helpers
│   ├── csrf.ts           # CSRF protection (Origin/Content-Type checks)
│   ├── rateLimiter.ts    # Rate limiters (general + per-route)
│   ├── sanitize.ts       # Input sanitization (sanitize-html)
│   ├── planLimits.ts     # Subscription plan enforcement middleware
│   ├── aiUsageLimit.ts   # AI cost budget enforcement middleware
│   ├── cache.ts          # Redis caching (`cacheResponse` decorator)
│   ├── errorHandler.ts   # Global error handler + 404 handler
│   └── logger.ts         # Correlation ID + pino request logger
│
├── validators/           # Zod schemas for request validation
├── jobs/                 # Background cron jobs
│   ├── reminderProcessor.ts   # Follow-up reminder delivery
│   ├── dataCleanup.ts         # Expired token/record pruning
│   ├── reportScheduler.ts     # Automated report generation + email
│   └── workflowProcessor.ts   # Workflow step execution engine
│
├── lib/
│   ├── logger.ts         # Pino logger instance
│   └── email.ts          # SendGrid email sending helper
│
├── types/                # Shared backend TypeScript types
└── utils/                # Utilities (distributed lock, SMS segments, etc.)
```

## Data Model Summary

All user data is scoped to an `Organization`. A `User` belongs to one `Organization` via `organizationId`.

| Entity | Description |
|--------|-------------|
| `Organization` | The top-level tenant. Owns all data. Has Stripe subscription info. |
| `User` | Authenticated agent/admin. Belongs to one org, has a role (USER \| MANAGER \| ADMIN). |
| `Lead` | The core CRM record. Has pipeline stage, real-estate fields, activities, notes, tasks. |
| `Pipeline` / `PipelineStage` | Customizable sales pipelines with ordered stages. |
| `Campaign` | Email or SMS campaigns. Has recipients (`CampaignLead`), A/B variants, tracking. |
| `Workflow` | Automated multi-step sequences tied to lead triggers. |
| `Message` | Inbox messages (email/SMS/chat). Belongs to a thread (`ChannelThread`). |
| `Appointment` | Calendar events with ICS export support. |
| `FollowUpReminder` | Follow-up tasks, supports recurrence patterns. |
| `AuditLog` | Immutable audit trail of all significant user actions. |
| `APIKey` | Hashed API keys for external integrations (SHA-256 stored). |

## Authentication & Authorization

### JWT-Based Auth
- **Access token**: Short-lived (15 min), stored in localStorage as `accessToken`
- **Refresh token**: Long-lived (1 day / 7 days depending on "remember me"), stored in localStorage as `refreshToken`
- All API routes (except `/api/auth/*`, `/api/docs`, `/health`, `/api/unsubscribe`) require `Authorization: Bearer <accessToken>`
- Token refresh is handled proactively by `useSessionManager` hook (refreshes 2 min before expiry)

### Role System
| Role | Permissions |
|------|------------|
| `USER` | Read/write own leads, send messages, manage own settings |
| `MANAGER` | + Access to admin routes, team management |
| `ADMIN` | Full access, billing, system settings, feature flags |

### CSRF Protection
The app uses JWT in `Authorization` headers (not cookies), making it inherently resistant to CSRF. Additional defense-in-depth measures in `middleware/csrf.ts`:
1. **Content-Type enforcement**: Rejects `application/x-www-form-urlencoded` on JSON API endpoints
2. **Origin validation**: Verifies `Origin`/`Referer` header against allowed origins on state-changing requests

## Real-Time Events (Socket.io)

The frontend subscribes to real-time events via `useRealtimeUpdates` hook in `MainLayout`. Events auto-invalidate the relevant React Query caches:

| Event | Trigger | Frontend action |
|-------|---------|-----------------|
| `lead:update` | Lead CRUD | Invalidates lead queries |
| `campaign:update` | Campaign status change | Invalidates campaign queries |
| `workflow:event` | Workflow step executed | Invalidates workflow queries |
| `message:update` | New inbound message | Invalidates message queries |
| `notification:new` | Any new notification | Updates notification bell |

## Background Jobs

All cron jobs use a Redis distributed lock (`SETNX`) to prevent duplicate execution in multi-instance deployments:

| Job | Schedule | Purpose |
|-----|----------|---------|
| Campaign scheduler | Every minute | Deliver scheduled email/SMS campaigns |
| Reminder processor | Every minute | Fire due follow-up reminders |
| Data cleanup | Every hour | Prune expired tokens, old login history |
| Report scheduler | Every 5 minutes | Generate + email scheduled reports |
| ML optimization | Nightly | Recalibrate lead scoring weights |

## Key Third-Party Services

| Service | Purpose | Required |
|---------|---------|----------|
| **Stripe** | Billing, subscriptions, invoices | No (billing disabled if unconfigured) |
| **SendGrid** | Transactional email | No (console.log fallback in dev) |
| **Twilio** | SMS + MMS campaigns | No (mock mode if unconfigured) |
| **OpenAI** | AI features (scoring, content, enrichment) | No (AI features disabled) |
| **Redis** | Caching + distributed locks | No (graceful degradation) |
| **Sentry** | Error tracking | No (disabled if SENTRY_DSN unset) |

## Security Measures

- **Helmet**: HTTP security headers (CSP, HSTS in production, X-Frame-Options, etc.)
- **CORS**: Strict origin whitelist in production, permissive in development
- **CSRF**: Origin/Content-Type validation on state-changing requests
- **Rate limiting**: General (100 req/15min), per-route limits on auth, AI, message send
- **Input sanitization**: `sanitize-html` on all incoming strings
- **Zod validation**: All request bodies validated against strict schemas before reaching controllers
- **Plan limits**: API-level enforcement of subscription tier resource caps
- **AI cost limits**: Configurable monthly budget with hard cap returning 429
- **Encryption**: Sensitive data (third-party API keys) encrypted with AES using `MASTER_ENCRYPTION_KEY`
- **Audit trail**: 27 action types logged to the `AuditLog` table for compliance
