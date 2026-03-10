# Master RealEstate Pro

A full-stack CRM platform built for real estate professionals. Manage leads, pipelines, campaigns, communications, and AI-powered insights — all in one place.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query |
| **Backend** | Express 5, TypeScript, Prisma ORM, PostgreSQL |
| **Real-time** | Socket.IO (WebSocket notifications) |
| **AI** | OpenAI GPT (content generation, lead scoring, insights) |
| **Voice** | Vapi.ai (AI-powered calling) |
| **Email** | SendGrid (transactional + campaign emails, MJML templates) |
| **SMS** | Twilio |
| **Payments** | Stripe (subscriptions, usage metering) |
| **Caching** | Redis (via ioredis) |
| **Testing** | Jest (backend), Playwright (e2e) |

## Features

- **Lead Management** — Pipeline boards (Kanban + list), custom stages, bulk actions, import (CSV/XLSX/vCard), deduplication, merge
- **Campaigns** — Email & SMS campaigns with A/B testing, workflow automation, scheduling, deliverability tracking
- **Communication** — Unified inbox (email, SMS, calls), call logging, follow-up reminders, templates
- **AI Hub** — Content generation, lead scoring, intelligence insights, message enhancement, chatbot
- **Analytics** — Custom report builder, saved reports, scheduled exports (CSV/PDF), goal tracking, attribution models
- **Pipeline** — Multiple pipeline types (Buyer, Seller, Rental, Commercial, General), drag-and-drop stages
- **Multi-tenancy** — Organization-scoped data isolation, role-based access control (Admin/Manager/Agent)
- **Billing** — Stripe-powered subscriptions with 5 plan tiers, usage enforcement, proration

## Prerequisites

- **Node.js** 22+ (see [.devcontainer/devcontainer.json](.devcontainer/devcontainer.json))
- **PostgreSQL** 14+
- **Redis** (optional — used for caching, distributed locks, rate limiting)

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/josh9381/Master-RealEstate-Pro.git
cd Master-RealEstate-Pro
npm install
cd backend && npm install
```

### 2. Configure Environment

```bash
# Frontend
cp .env.example .env

# Backend
cp backend/.env.example backend/.env
```

Edit both `.env` files with your database URL, API keys, and secrets. See the `.env.example` files for documentation on each variable.

### 3. Set Up Database

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

### 4. Start Development

```bash
# From project root — starts backend, frontend, and Prisma Studio
./start-dev.sh
```

Or start services individually:

```bash
# Backend (port 8000)
cd backend && npm run dev

# Frontend (port 3000)
npm run dev

# Prisma Studio (port 5555)
cd backend && npx prisma studio
```

### 5. Stop Development

```bash
./stop-dev.sh
```

## Project Structure

```
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # Reusable UI components
│   ├── pages/              # Route pages
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities (API client, logger, storage)
│   ├── store/              # Zustand state stores
│   └── types/              # TypeScript type definitions
├── backend/                # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # Express route definitions
│   │   ├── middleware/      # Auth, validation, rate limiting
│   │   ├── validators/     # Zod request schemas
│   │   ├── jobs/           # Cron jobs (cleanup, scheduling, workflows)
│   │   └── config/         # Database, CORS, Swagger, uploads
│   ├── prisma/             # Schema, migrations, seed
│   └── tests/              # Jest test suites
├── e2e/                    # Playwright end-to-end tests
├── docs/                   # Feature user guides
└── public/                 # Static assets (service worker)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (frontend) |
| `npm run build` | Type-check + build frontend for production |
| `npm run lint` | Run ESLint on frontend |
| `cd backend && npm run dev` | Start backend with hot reload (tsx) |
| `cd backend && npm run build` | Compile backend TypeScript |
| `cd backend && npm test` | Run backend Jest tests |
| `cd backend && npm run prisma:studio` | Open Prisma Studio GUI |
| `cd backend && npm run prisma:migrate` | Run database migrations |
| `cd backend && npm run prisma:seed` | Seed database with sample data |

## Environment Variables

See [.env.example](.env.example) (frontend) and [backend/.env.example](backend/.env.example) (backend) for the full list of required and optional variables.

Key services that need API keys:
- **OpenAI** — AI features (content generation, scoring, insights)
- **SendGrid** — Email sending and webhooks
- **Twilio** — SMS sending
- **Stripe** — Billing and subscriptions
- **Vapi.ai** — Voice AI calling
- **Redis** — Caching and distributed locks (optional)

## License

Private — all rights reserved.
