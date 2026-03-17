# Master RealEstate Pro

> AI-powered CRM platform purpose-built for real estate professionals — agents, teams, and brokerages.

Manage leads, pipelines, multi-channel campaigns, communications, workflow automation, and AI-driven insights in a single unified platform. Replace your fragmented stack of CRM + email marketing + dialer + analytics tools.

[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Private-red)](#license)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Scripts Reference](#scripts-reference)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Lead Management
- **Pipeline boards** — Kanban drag-and-drop + list views across customizable stages
- **Multiple pipeline types** — Buyer, Seller, Rental, Commercial, General
- **Real estate fields** — Property type, budget, timeline, location, beds/baths, pre-approval status
- **Import/Export** — CSV, XLSX, vCard import with field mapping and duplicate detection
- **Bulk actions** — Multi-select for status changes, assignment, tagging, deletion
- **Merge & deduplication** — Detect and merge duplicates with field-level conflict resolution
- **Custom fields & tags** — Org-defined custom fields and flexible tagging
- **Saved filter views** — Save and recall complex filter combinations
- **Follow-up reminders** — Priority-based reminders with recurrence patterns

### Campaign Management
- **Email campaigns** — Create, schedule, and send via SendGrid with MJML block editor
- **SMS campaigns** — Two-way SMS via Twilio
- **A/B testing** — Subject line, content, and send-time experiments with statistical evaluation
- **Campaign templates** — Pre-built and custom templates library
- **Audience segmentation** — Target campaigns based on lead attributes and behavior
- **Deliverability tracking** — Open/click rates, bounce handling, spam complaint monitoring
- **Unsubscribe management** — CAN-SPAM compliant with preference center

### AI Hub
- **Content generator** — Listing descriptions, email copy, social posts, blog content via GPT-4
- **AI email & SMS composer** — Context-aware drafting using lead data
- **Message enhancer** — Rephrase and improve messages (professional, casual, persuasive tones)
- **Lead scoring** — ML-powered lead prioritization with configurable scoring criteria
- **Intelligence insights** — AI-generated pipeline health analysis and engagement patterns
- **Predictive analytics** — Conversion probability and revenue forecasts
- **Send-time optimization** — ML-based optimal send time per lead
- **AI chatbot** — Conversational assistant for CRM queries
- **Cost monitoring** — Track and alert on AI API spend with budgets

### Communications
- **Unified inbox** — Single inbox for email, SMS, and call logs
- **Call logging & AI voice** — Log calls with outcomes; AI-powered calling via Vapi.ai
- **Message templates** — Reusable templates with variable interpolation
- **Communication timeline** — Full per-lead history across all channels

### Analytics & Reporting
- **Dashboard** — Overview metrics — lead count, pipeline value, conversion rates, activity feed
- **Custom report builder** — Ad-hoc reports with flexible filters and chart types
- **Goal tracking** — Set and track performance goals by metric and time period
- **Attribution models** — First-touch, last-touch, multi-touch attribution
- **Scheduled exports** — Auto-generate and email reports (CSV/PDF) on a schedule
- **Period comparison** — Compare metrics across any two time ranges

### Workflow Automation
- **Visual builder** — Drag-and-drop canvas for multi-step automations
- **10+ trigger types** — Lead created, status changed, email opened, score threshold, time-based, webhook, and more
- **Action types** — Send email/SMS, update lead, assign, tag, create task, wait, conditional branch
- **Execution history** — Step-by-step logs with error handling and automatic retries

### Organization & Team
- **Multi-tenant isolation** — Organization-scoped data for leads, campaigns, and settings
- **Role-based access** — Admin / Manager / Agent roles with permission gates
- **Team management** — Create teams, invite members, assign roles

### Billing & Subscriptions
- **5 subscription tiers** — Starter, Professional, Elite, Team, Enterprise
- **Stripe integration** — Payment processing, lifecycle management, usage metering
- **Feature gating** — UI-level feature gates based on plan; contextual upgrade prompts
- **Usage enforcement** — Plan-based limits on leads, campaigns, AI calls, team size

### Admin & Operations
- **Admin dashboard** — System-wide stats and org health
- **Audit trail** — Immutable log of all data changes with actor, IP, device, timestamp
- **Feature flags** — Toggle features per environment or org
- **Health checks** — System status, DB connectivity, external service health
- **Support tickets** — In-app support ticket system

### Real-Time & Notifications
- **WebSocket updates** — Live notifications, lead changes, campaign progress via Socket.IO
- **Push notifications** — Browser push via Web Push / VAPID
- **Configurable preferences** — Per-user notification channel selection

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, Recharts, Lucide Icons |
| **Backend** | Express 5, TypeScript, Prisma ORM, Zod validation, Pino logging |
| **Database** | PostgreSQL 14+ (60+ Prisma models) |
| **Cache** | Redis via ioredis (optional — caching, rate limiting, distributed locks) |
| **Real-time** | Socket.IO (WebSocket) |
| **AI** | OpenAI GPT-4 (content generation, scoring, insights, chatbot) |
| **Voice** | Vapi.ai (AI-powered calling) |
| **Email** | SendGrid (transactional + campaigns) with MJML templates |
| **SMS** | Twilio (two-way messaging) |
| **Payments** | Stripe (subscriptions, invoicing, usage metering) |
| **Security** | Helmet, bcryptjs, sanitize-html, DOMPurify, Speakeasy (2FA) |
| **Monitoring** | Sentry (optional error tracking) |
| **Testing** | Jest (backend unit/integration), Playwright (E2E), Vitest (frontend) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                   │
│   React 18 · TypeScript · Vite · Tailwind · Zustand     │
│   TanStack Query · Socket.IO Client · Recharts          │
└──────────┬──────────────────────────────┬───────────────┘
           │ REST API (HTTPS)             │ WebSocket
           ▼                              ▼
┌──────────────────────────────────────────────────────────┐
│                   Backend (Express 5)                    │
│   TypeScript · Prisma ORM · JWT Auth · Zod Validation    │
│   Helmet · CORS · Rate Limiting · Pino Logger            │
├──────────────────────────────────────────────────────────┤
│  Services                                                │
│  ┌────────────┐ ┌───────────┐ ┌──────────────────────┐  │
│  │ AI Engine  │ │ Campaign  │ │ Workflow Engine       │  │
│  │ (OpenAI)   │ │ Executor  │ │ (Triggers + Actions) │  │
│  └────────────┘ └───────────┘ └──────────────────────┘  │
│  ┌────────────┐ ┌───────────┐ ┌──────────────────────┐  │
│  │ Email      │ │ SMS       │ │ Billing              │  │
│  │ (SendGrid) │ │ (Twilio)  │ │ (Stripe)             │  │
│  └────────────┘ └───────────┘ └──────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  Background Jobs (node-cron)                             │
│  • Data cleanup  • Reminder processing                   │
│  • Report scheduling  • Workflow processing              │
└──────────┬──────────────────────────────┬───────────────┘
           │                              │
           ▼                              ▼
┌────────────────────┐     ┌──────────────────────────────┐
│   PostgreSQL 14+   │     │  Redis (Optional)            │
│   (60+ models)     │     │  Caching · Rate Limiting     │
│                    │     │  Distributed Locks           │
└────────────────────┘     └──────────────────────────────┘
```

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 22+ | See `.devcontainer/devcontainer.json` |
| **PostgreSQL** | 14+ | Primary database |
| **Redis** | 6+ | Optional — caching, distributed locks, rate limiting |

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/josh9381/Master-RealEstate-Pro.git
cd Master-RealEstate-Pro

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### 2. Configure Environment

```bash
# Frontend
cp .env.example .env

# Backend
cp backend/.env.example backend/.env
```

Edit both `.env` files with your credentials. Each file is thoroughly documented — see the [Environment Variables](#environment-variables) section below for details.

### 3. Set Up Database

```bash
cd backend

# Run migrations
npx prisma migrate dev

# Seed with sample data
npx prisma db seed

cd ..
```

### 4. Start Development

The easiest way — a single script that starts backend, frontend, and Prisma Studio:

```bash
./start-dev.sh
```

This starts:

| Service | Port | Log File |
|---------|------|----------|
| Backend API | 8000 | `/tmp/backend.log` |
| Frontend (Vite) | 3000 | `/tmp/frontend.log` |
| Prisma Studio | 5555 | `/tmp/prisma-studio.log` |

> **GitHub Codespaces**: The script auto-detects Codespaces and outputs the correct forwarded URLs.

Or start services individually:

```bash
# Backend with hot reload
cd backend && npm run dev

# Frontend dev server
npm run dev

# Prisma Studio (database GUI)
cd backend && npx prisma studio
```

### 5. Stop Development

```bash
./stop-dev.sh
```

---

## Project Structure

```
Master-RealEstate-Pro/
├── src/                          # Frontend (React + TypeScript)
│   ├── components/               # Reusable UI components
│   │   ├── ai/                   #   AI assistant, composers, enhancers
│   │   ├── auth/                 #   Auth guards, role-based layout
│   │   ├── bulk/                 #   Bulk action bars
│   │   ├── campaigns/            #   Campaign UI components
│   │   ├── communication/        #   Inbox, threads, compose
│   │   ├── email/                #   Email block editor, preview
│   │   ├── filters/              #   Advanced filter UI
│   │   ├── layout/               #   Header, sidebar, breadcrumbs
│   │   ├── leads/                #   Pipeline manager, follow-ups
│   │   ├── notifications/        #   Notification bell, panel
│   │   ├── onboarding/           #   Getting started tour
│   │   ├── search/               #   Global search modal
│   │   ├── settings/             #   Custom fields, tags manager
│   │   ├── subscription/         #   Feature gates, upgrade prompts
│   │   ├── ui/                   #   Button, Card, Dialog, Input, Table
│   │   └── workflows/            #   Visual canvas, node config
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # API client, utils, logger, storage
│   ├── pages/                    # Route pages (20+ sections)
│   │   ├── admin/                #   Admin panel, audit, health checks
│   │   ├── ai/                   #   AI Hub, scoring, insights, settings
│   │   ├── analytics/            #   Dashboards, reports, goals
│   │   ├── auth/                 #   Login, register, password reset
│   │   ├── billing/              #   Subscription, invoices, payments
│   │   ├── campaigns/            #   Create, edit, schedule, A/B test
│   │   ├── communication/        #   Inbox, call center, newsletters
│   │   ├── dashboard/            #   Main dashboard
│   │   ├── help/                 #   Help center, docs, tutorials
│   │   ├── integrations/         #   API integrations hub
│   │   ├── leads/                #   List, pipeline, import/export
│   │   ├── settings/             #   Profile, security, team, email
│   │   ├── tasks/                #   Task management
│   │   └── workflows/            #   Builder, list, rules
│   ├── services/                 # Frontend API service layers
│   ├── store/                    # Zustand stores (auth, UI, toast)
│   ├── types/                    # TypeScript type definitions
│   └── utils/                    # Scoring utils, helpers
├── backend/                      # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── config/               # DB, CORS, Swagger, upload config
│   │   ├── controllers/          # 41 route handler modules
│   │   ├── data/                 # Static data (campaign templates)
│   │   ├── jobs/                 # Cron jobs (cleanup, scheduling)
│   │   ├── lib/                  # Shared libraries
│   │   ├── middleware/            # Auth, rate limiting, validation, caching
│   │   ├── routes/               # 43 Express route modules
│   │   ├── services/             # 36 business logic services
│   │   ├── types/                # Backend type definitions
│   │   ├── utils/                # JWT, encryption, logging, GeoIP
│   │   └── validators/           # Zod request validation schemas
│   ├── prisma/                   # Schema, migrations, seed
│   └── tests/                    # Jest test suites
├── e2e/                          # Playwright E2E tests (15 suites)
├── docs/                         # Feature user guides
├── public/                       # Static assets (service worker)
├── start-dev.sh                  # Start all dev services
├── stop-dev.sh                   # Stop all dev services
└── PRD.md                        # Product Requirements Document
```

---

## Scripts Reference

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 3000 |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint on `src/` |
| `npm run test` | Run Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run type-check` | TypeScript type checking (no emit) |
| `npm run format` | Prettier formatting |

### Backend

| Command | Description |
|---------|-------------|
| `cd backend && npm run dev` | Start with hot reload (tsx watch) |
| `cd backend && npm run build` | Compile TypeScript to `dist/` |
| `cd backend && npm start` | Run compiled backend |
| `cd backend && npm test` | Run Jest test suites |
| `cd backend && npm run test:coverage` | Tests with coverage report |
| `cd backend && npm run prisma:studio` | Open Prisma Studio GUI (port 5555) |
| `cd backend && npm run prisma:migrate` | Run pending migrations |
| `cd backend && npm run prisma:seed` | Seed database with sample data |
| `cd backend && npm run prisma:generate` | Regenerate Prisma client |

### Cross-Project

| Command | Description |
|---------|-------------|
| `npm run lint:all` | Lint frontend + backend |
| `npm run type-check:all` | Type-check frontend + backend |
| `npm run test:backend` | Run backend tests from root |
| `npm run e2e` | Run Playwright E2E tests |
| `npm run e2e:ui` | Playwright E2E with interactive UI |

---

## Environment Variables

### Frontend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL (e.g., `http://localhost:8000/api`) |
| `VITE_API_BASE_URL` | Yes | Backend root URL for WebSocket/uploads (e.g., `http://localhost:8000`) |
| `VITE_APP_NAME` | No | App name shown in UI (default: `RealEstate Pro`) |

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | Access token signing secret (32+ chars) |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing secret (32+ chars) |
| `MASTER_ENCRYPTION_KEY` | Yes | AES-256 encryption key (64 hex chars) |
| `FRONTEND_URL` | Yes | Frontend URL for CORS and email links |
| `APP_URL` | Yes | Backend URL |
| `OPENAI_API_KEY` | For AI | OpenAI API key |
| `OPENAI_MODEL` | No | GPT model (default: `gpt-4-turbo-preview`) |
| `SENDGRID_API_KEY` | For email | SendGrid API key |
| `FROM_EMAIL` | For email | Sender email address |
| `TWILIO_ACCOUNT_SID` | For SMS | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | For SMS | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | For SMS | Twilio phone number |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `VAPI_API_KEY` | For voice | Vapi.ai API key |
| `REDIS_URL` | No | Redis connection URL |
| `REDIS_ENABLED` | No | Enable Redis caching (default: `false`) |

See [`.env.example`](.env.example) and [`backend/.env.example`](backend/.env.example) for the complete list with generation instructions.

---

## Testing

### Backend Unit & Integration Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Frontend Unit Tests

```bash
# Run once
npm test

# Watch mode
npm run test:watch
```

### End-to-End Tests (Playwright)

```bash
# Headless
npm run e2e

# Interactive UI mode
npm run e2e:ui
```

**15 E2E test suites** covering:

| Suite | Coverage |
|-------|----------|
| Auth | Login, register, password reset, email verification |
| Navigation | Routing, sidebar, breadcrumbs |
| Dashboard | Widgets, metrics, activity feed |
| Leads | CRUD, pipeline, import/export, bulk actions, filters |
| Campaigns | Create, schedule, A/B testing, templates |
| AI Hub | Content generation, scoring, insights |
| Analytics | Reports, goals, attribution, comparisons |
| Communication | Inbox, email, SMS, call logging |
| Workflows | Builder, triggers, execution |
| Settings | Profile, security, team, email config |
| Admin | Panel, audit trail, feature flags |
| Billing | Subscription, invoices, payment methods |
| Help | Help center, documentation, video tutorials |
| Integrations | API integrations, webhooks |
| Misc | Global search, notifications, keyboard shortcuts |

---

## API Documentation

The backend auto-generates Swagger/OpenAPI documentation:

```
http://localhost:8000/api/docs
```

43 route modules provide endpoints across:
- Authentication & user management
- Lead CRUD and pipeline operations
- Campaign management and A/B testing
- Message sending (email, SMS, calls)
- AI content generation and scoring
- Analytics, reports, and goals
- Workflow CRUD and execution
- Billing and subscription management
- Admin operations and audit trails
- Webhooks and integrations

---

## Documentation

Feature-specific user guides are available in the `docs/` directory:

| Guide | Description |
|-------|-------------|
| [A/B Testing](docs/AB_TESTING_USER_GUIDE.md) | Setting up and analyzing A/B tests |
| [AI Chatbot](docs/AI_CHATBOT_USER_GUIDE.md) | Using the AI conversational assistant |
| [AI Content Generator](docs/AI_CONTENT_GENERATOR_USER_GUIDE.md) | Generating listings, emails, and more |
| [Intelligence Hub](docs/INTELLIGENCE_HUB_USER_GUIDE.md) | AI-powered insights and recommendations |
| [Lead Scoring](docs/LEAD_SCORING_USER_GUIDE.md) | Configuring and using AI lead scoring |
| [Message Enhancer](docs/MESSAGE_ENHANCER_USER_GUIDE.md) | AI message improvement and rephrasing |

For the full Product Requirements Document, see [PRD.md](PRD.md).

---

## Contributing

This is a private repository. For team members:

1. Create a feature branch from `main`
2. Make changes with appropriate tests
3. Ensure `npm run lint:all` and `npm run type-check:all` pass
4. Submit a pull request for review

Commit hooks (Husky + lint-staged) enforce linting on staged files.

---

## License

Private — all rights reserved.
