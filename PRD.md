# Product Requirements Document (PRD)

## Master RealEstate Pro — AI-Powered Real Estate CRM

| Field | Value |
|-------|-------|
| **Product Name** | Master RealEstate Pro |
| **Version** | 1.0.0 |
| **Owner** | josh9381 |
| **Last Updated** | March 2026 |
| **Status** | Active Development |

---

## 1. Executive Summary

Master RealEstate Pro is a full-stack, AI-powered Customer Relationship Management (CRM) platform purpose-built for real estate professionals — agents, teams, and brokerages. It consolidates lead management, multi-channel communications, marketing campaigns, AI-driven insights, workflow automation, and billing into a single, modern web application.

The platform replaces fragmented tooling (separate CRM, email marketing, dialer, analytics) with a unified experience that leverages AI throughout the lifecycle — from lead scoring and predictive analytics to intelligent content generation and send-time optimization.

---

## 2. Problem Statement

Real estate professionals today rely on a patchwork of disconnected tools:

- **Lead management** in one CRM
- **Email campaigns** in a separate marketing tool
- **SMS/calling** through a different provider
- **Analytics** built from spreadsheets
- **AI tools** bolted on as afterthoughts

This fragmentation leads to:

1. **Data silos** — lead context is scattered across platforms
2. **Missed follow-ups** — no unified view of communication history
3. **Manual busywork** — duplicate data entry, no automation
4. **Poor attribution** — inability to track which campaigns convert
5. **Scaling friction** — tools that don't grow with teams or brokerages

---

## 3. Target Users

### 3.1 Primary Personas

| Persona | Role | Key Needs |
|---------|------|-----------|
| **Solo Agent** | Individual real estate agent | Lead tracking, automated follow-ups, AI-generated listing content, simple campaign management |
| **Team Lead / Manager** | Manages 5–50 agents | Team performance dashboards, lead assignment/routing, pipeline visibility, role-based access |
| **Brokerage Admin** | Operations/IT at a brokerage | Multi-tenant org management, compliance/audit trails, billing oversight, system administration |

### 3.2 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access — organization settings, billing, user management, feature flags, audit trails, system maintenance |
| **Manager** | Team management, analytics, all CRM features, report scheduling |
| **Agent (User)** | Lead management, campaigns, communications, personal settings, AI features (within plan limits) |

---

## 4. Product Goals & Success Metrics

### 4.1 Business Goals

| Goal | Metric | Target |
|------|--------|--------|
| Replace fragmented tools | Feature parity coverage | All-in-one: CRM + campaigns + comms + analytics + AI |
| Drive AI adoption | % of users using AI features weekly | > 60% |
| Retain subscribers | Monthly churn rate | < 5% |
| Scale to teams | Avg org size | Support 1–500 users per org |

### 4.2 User Experience Goals

| Goal | Metric |
|------|--------|
| Fast onboarding | First lead imported within 5 minutes of signup |
| Reduce manual work | 50%+ reduction in repetitive tasks via automation |
| Actionable insights | AI surfaces 3+ proactive recommendations per week |
| Multi-channel in one view | Unified inbox covering email, SMS, calls |

---

## 5. Feature Requirements

### 5.1 Authentication & Security

| Feature | Priority | Description |
|---------|----------|-------------|
| Email/password auth | P0 | Registration, login, JWT-based sessions (access + refresh tokens) |
| Email verification | P0 | Verify email address on signup |
| Password reset flow | P0 | Forgot password → email link → reset |
| Two-factor authentication (2FA) | P1 | TOTP-based 2FA via authenticator apps (Speakeasy) |
| Session management | P1 | View/revoke active sessions, login history with device/IP/geo tracking |
| Role-based access control | P0 | Admin / Manager / Agent roles with permission gates |
| Rate limiting | P0 | Brute-force protection on auth endpoints |
| Input sanitization | P0 | HTML sanitization (sanitize-html), XSS prevention (DOMPurify) |

### 5.2 Lead Management

| Feature | Priority | Description |
|---------|----------|-------------|
| Lead CRUD | P0 | Create, read, update, delete leads with full contact details |
| Real estate fields | P0 | Property type, transaction type, budget range, timeline, location, beds/baths, pre-approval status |
| Pipeline boards | P0 | Kanban drag-and-drop + list views across pipeline stages |
| Multiple pipeline types | P1 | Buyer, Seller, Rental, Commercial, General pipelines with customizable stages |
| Lead import | P0 | CSV, XLSX, vCard file import with field mapping and duplicate detection |
| Lead export | P0 | Export to CSV/XLSX with filtered results |
| Bulk actions | P1 | Multi-select leads for bulk status change, assignment, tagging, deletion |
| Lead merge/deduplication | P1 | Detect and merge duplicate leads with field-level conflict resolution |
| Custom fields | P2 | Admin-defined custom fields per organization |
| Tags | P1 | Tagging system for flexible categorization |
| Saved filter views | P1 | Save and recall complex filter combinations |
| Lead scoring | P1 | AI-powered scoring based on engagement, demographics, and behavior |
| Follow-up reminders | P0 | Reminders with priority levels and recurrence patterns |
| Lead history/timeline | P1 | Full activity timeline per lead (calls, emails, notes, status changes) |

### 5.3 Campaign Management

| Feature | Priority | Description |
|---------|----------|-------------|
| Email campaigns | P0 | Create, schedule, and send email campaigns via SendGrid |
| SMS campaigns | P0 | SMS campaigns via Twilio |
| Campaign templates | P1 | Pre-built and custom campaign templates |
| MJML email builder | P1 | Block-based email editor with MJML rendering |
| A/B testing | P1 | Subject line, content, and send-time A/B tests with statistical evaluation |
| Campaign scheduling | P0 | Schedule campaigns for future delivery |
| Audience segmentation | P1 | Target campaigns to segments based on lead attributes and behavior |
| Deliverability tracking | P1 | Open rates, click rates, bounce tracking, complaint monitoring |
| Email suppression | P0 | Automatic suppression of bounced/complained addresses |
| Unsubscribe management | P0 | CAN-SPAM compliant unsubscribe with preference center |
| Campaign analytics | P1 | Per-campaign performance dashboard with engagement metrics |
| Workflow-triggered campaigns | P2 | Auto-send campaigns based on workflow triggers |

### 5.4 Communications

| Feature | Priority | Description |
|---------|----------|-------------|
| Unified inbox | P0 | Single inbox for email, SMS, and call logs |
| Email send/receive | P0 | Send emails from within the CRM, track replies via webhooks |
| SMS send/receive | P0 | Two-way SMS via Twilio |
| Call logging | P1 | Log calls with outcome, duration, and notes |
| AI voice calling | P2 | AI-powered outbound calls via Vapi.ai |
| Message templates | P1 | Reusable templates for email, SMS with variable interpolation |
| Communication history | P0 | Per-lead communication timeline |
| Attachments | P1 | File attachments on messages |
| Email signatures | P2 | Configurable per-user email signatures |

### 5.5 AI Hub

| Feature | Priority | Description |
|---------|----------|-------------|
| AI content generator | P1 | Generate listing descriptions, email copy, social posts, blog content via OpenAI GPT-4 |
| AI email composer | P1 | AI-assisted email drafting with context from lead data |
| AI SMS composer | P1 | AI-assisted SMS drafting |
| Message enhancer | P1 | Rephrase/improve existing messages (professional, casual, persuasive tones) |
| Lead scoring model | P1 | ML-powered lead prioritization with configurable scoring criteria |
| Intelligence insights | P2 | AI-generated insights about pipeline health, engagement patterns, anomalies |
| Predictive analytics | P2 | Forecast conversion probabilities and revenue projections |
| AI chatbot | P2 | Conversational assistant for CRM queries and actions |
| Send-time optimization | P2 | ML-based optimal send time prediction per lead |
| AI cost monitoring | P1 | Track and alert on AI API spend with budgets |
| AI settings/preferences | P1 | Per-user and per-org AI configuration (model, tone, usage limits) |

### 5.6 Analytics & Reporting

| Feature | Priority | Description |
|---------|----------|-------------|
| Dashboard | P0 | Overview metrics — lead count, pipeline value, conversion rates, recent activity |
| Lead analytics | P1 | Source performance, conversion funnels, velocity metrics |
| Campaign reports | P1 | Engagement metrics, deliverability, ROI tracking |
| Custom report builder | P1 | Build ad-hoc reports with flexible filters and chart types |
| Saved reports | P1 | Save and share report configurations |
| Scheduled exports | P2 | Auto-generate and email reports on a schedule (CSV/PDF) |
| Goal tracking | P1 | Set and track performance goals by metric and time period |
| Attribution models | P2 | First-touch, last-touch, and multi-touch attribution |
| Period comparison | P1 | Compare metrics across time periods |
| Follow-up analytics | P1 | Track follow-up completion rates and response times |
| Usage analytics | P1 | Platform usage metrics for admins |

### 5.7 Workflow Automation

| Feature | Priority | Description |
|---------|----------|-------------|
| Visual workflow builder | P1 | Drag-and-drop canvas for designing multi-step automations |
| Trigger types | P1 | Lead created, status changed, assigned, campaign completed, email opened, score threshold, time-based, tag added, webhook, manual |
| Action types | P1 | Send email, send SMS, update lead, assign lead, add tag, create task, wait/delay, conditional branch |
| Execution history | P1 | Log of all workflow runs with step-by-step results |
| Error handling & retry | P1 | Automatic retry on failure with configurable limits |
| Workflow enable/disable | P1 | Toggle workflows on/off without deletion |

### 5.8 Organization & Team Management

| Feature | Priority | Description |
|---------|----------|-------------|
| Multi-tenant isolation | P0 | Organization-scoped data — leads, campaigns, settings are isolated per org |
| Team creation | P1 | Create teams within an organization |
| Member management | P1 | Invite, remove, and manage team members |
| Role assignment | P0 | Assign Admin/Manager/Agent roles per user |
| Organization settings | P1 | Business info, branding, defaults |

### 5.9 Admin & Operations

| Feature | Priority | Description |
|---------|----------|-------------|
| Admin dashboard | P1 | System-wide stats, org health, active user counts |
| Audit trail | P1 | Immutable log of all data mutations with actor, action, timestamp, IP, device |
| Feature flags | P2 | Toggle features on/off per environment or org |
| Health check dashboard | P1 | System status, DB connectivity, external service health |
| Database maintenance | P2 | Cleanup tools, data integrity checks |
| Data export wizard | P2 | Full org data export for compliance/migration |
| Support ticket system | P2 | In-app support tickets with admin management |

### 5.10 Billing & Subscriptions

| Feature | Priority | Description |
|---------|----------|-------------|
| Subscription tiers | P0 | 5 tiers: Starter, Professional, Elite, Team, Enterprise |
| Stripe integration | P0 | Payment processing, subscription lifecycle, webhooks |
| Usage enforcement | P0 | Plan-based limits on leads, campaigns, AI calls, team size |
| Invoice management | P1 | View invoices, payment history |
| Payment methods | P1 | Add/update credit cards via Stripe Elements |
| Proration | P1 | Pro-rated upgrades/downgrades |
| Feature gating | P0 | UI-level feature gates based on subscription tier |
| Upgrade prompts | P1 | Contextual upgrade prompts when plan limits are hit |

### 5.11 Integrations

| Feature | Priority | Description |
|---------|----------|-------------|
| SendGrid (email) | P0 | Transactional + marketing email with webhook event tracking |
| Twilio (SMS) | P0 | Outbound + inbound SMS |
| OpenAI (AI) | P0 | GPT-4 for content generation, scoring, insights |
| Stripe (billing) | P0 | Payments, subscriptions, invoices |
| Vapi.ai (voice) | P1 | AI-powered outbound/inbound voice calls |
| Google Integration | P2 | Google Calendar / Contacts sync |
| API keys (BYOK) | P2 | Users provide their own API keys for external services |
| Webhooks | P2 | Inbound/outbound webhook support |
| REST API | P1 | API key-authenticated REST API for third-party integrations |

### 5.12 Notifications & Real-Time

| Feature | Priority | Description |
|---------|----------|-------------|
| In-app notifications | P0 | Real-time notification bell with unread count |
| WebSocket (Socket.IO) | P0 | Real-time updates for notifications, lead changes, campaign progress |
| Push notifications | P2 | Browser push notifications via Web Push / VAPID |
| Email notifications | P1 | Configurable email alerts for important events |
| Notification preferences | P1 | Per-user notification channel preferences |

### 5.13 Help & Onboarding

| Feature | Priority | Description |
|---------|----------|-------------|
| Help center | P2 | Searchable knowledge base |
| Getting started guide | P1 | Onboarding tour for new users |
| Video tutorials | P2 | Embedded tutorial library |
| Support tickets | P2 | In-app support with ticket tracking |
| Keyboard shortcuts | P2 | Power-user keyboard shortcuts with discoverable modal |
| Documentation articles | P2 | Admin-managed documentation CMS |

---

## 6. Technical Architecture

### 6.1 System Overview

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
│  Services Layer                                          │
│  ┌────────────┐ ┌───────────┐ ┌──────────────────────┐  │
│  │ AI Engine  │ │ Campaign  │ │ Workflow Engine       │  │
│  │ (OpenAI)   │ │ Executor  │ │ (Triggers + Actions) │  │
│  └────────────┘ └───────────┘ └──────────────────────┘  │
│  ┌────────────┐ ┌───────────┐ ┌──────────────────────┐  │
│  │ Email Svc  │ │ SMS Svc   │ │ Billing/Stripe       │  │
│  │ (SendGrid) │ │ (Twilio)  │ │ (Subscriptions)      │  │
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
│   (Prisma ORM)     │     │  Caching · Rate Limiting     │
│   60+ models       │     │  Distributed Locks           │
└────────────────────┘     └──────────────────────────────┘
```

### 6.2 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 18 + TypeScript | UI components and routing |
| **Build Tool** | Vite | Fast dev server and production builds |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **State Management** | Zustand | Lightweight global state (auth, UI, toasts) |
| **Data Fetching** | TanStack React Query | Server state caching, refetching, mutations |
| **HTTP Client** | Axios | API requests with interceptors |
| **Charts** | Recharts | Data visualization |
| **Icons** | Lucide React | Icon library |
| **Backend Framework** | Express 5 | REST API server |
| **ORM** | Prisma | Type-safe database access and migrations |
| **Database** | PostgreSQL 14+ | Primary data store |
| **Cache** | Redis (ioredis) | Response caching, rate limiting, distributed locks |
| **Auth** | JWT (jsonwebtoken) | Access + refresh token authentication |
| **Validation** | Zod | Request body/params/query validation |
| **Email** | SendGrid (@sendgrid/mail) + MJML | Transactional and marketing email |
| **SMS** | Twilio | Two-way SMS messaging |
| **AI** | OpenAI GPT-4 | Content generation, scoring, insights |
| **Voice** | Vapi.ai | AI-powered voice calling |
| **Payments** | Stripe | Subscriptions, invoicing, payment processing |
| **Real-Time** | Socket.IO | WebSocket notifications and live updates |
| **Logging** | Pino + pino-pretty | Structured JSON logging |
| **Security** | Helmet, bcryptjs, sanitize-html | HTTP headers, password hashing, input sanitization |
| **Monitoring** | Sentry (optional) | Error tracking and performance monitoring |
| **2FA** | Speakeasy | TOTP-based two-factor authentication |
| **Scheduling** | node-cron | Background job scheduling |
| **Testing (Backend)** | Jest | Unit and integration tests |
| **Testing (E2E)** | Playwright | End-to-end browser tests |

### 6.3 Database Schema (Key Models)

The Prisma schema defines **60+ models** organized across these domains:

- **Identity**: User, Organization, Team, TeamMember, RefreshToken, LoginHistory
- **CRM Core**: Lead (with real estate-specific fields), Pipeline, PipelineStage, Tag, CustomFieldDefinition
- **Campaigns**: Campaign, CampaignLead, ABTest, ABTestResult, CampaignAnalytics
- **Communications**: Message, Call, Note, EmailTemplate, SMSTemplate, MessageTemplate
- **AI**: AIInsight, UserAIPreferences, ChatMessage, LeadScoringModel, ScoringConfig
- **Automation**: Workflow, WorkflowExecution, WorkflowExecutionStep, Segment
- **Analytics**: SavedReport, Goal, ReportSchedule, ReportHistory, SavedFilterView
- **Billing**: Subscription, Invoice, UsageTracking
- **Operations**: AuditLog, Activity, Notification, PushSubscription, SupportTicket, FeatureFlag

### 6.4 API Design

- **RESTful** endpoints under `/api/` prefix
- **43 route modules** covering all feature domains
- **Zod validation** on all request inputs via middleware
- **JWT authentication** with access/refresh token rotation
- **Role-based authorization** middleware (Admin, Manager, Agent)
- **Organization-scoped** queries — all data access filtered by `orgId`
- **Rate limiting** per endpoint category
- **Swagger/OpenAPI** documentation auto-generated via swagger-jsdoc

### 6.5 Background Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Data cleanup | Daily | Purge expired tokens, old logs, orphaned records |
| Reminder processor | Every minute | Check and fire due follow-up reminders |
| Report scheduler | Hourly | Generate and email scheduled reports |
| Workflow processor | Continuous | Execute pending workflow steps and retry failures |

---

## 7. Subscription Tiers

| Feature / Limit | Starter | Professional | Elite | Team | Enterprise |
|-----------------|---------|-------------|-------|------|------------|
| Leads | Limited | Higher limit | Higher limit | Expanded | Unlimited |
| Campaigns / month | Limited | More | More | Expanded | Unlimited |
| AI requests / month | Limited | More | More | Expanded | Unlimited |
| Team members | 1 | Limited | More | Expanded | Unlimited |
| Pipelines | Basic | Multiple | Multiple | Multiple | Unlimited |
| A/B testing | — | ✓ | ✓ | ✓ | ✓ |
| Workflow automation | — | Basic | Advanced | Advanced | Full |
| Custom reports | — | ✓ | ✓ | ✓ | ✓ |
| API access | — | — | ✓ | ✓ | ✓ |
| Priority support | — | — | ✓ | ✓ | ✓ + SLA |
| Dedicated account manager | — | — | — | — | ✓ |

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Metric | Target |
|--------|--------|
| API response time (p95) | < 500ms |
| Page load (first contentful paint) | < 2s |
| Time to interactive | < 3s |
| WebSocket message latency | < 200ms |
| Database query time (p95) | < 100ms |

### 8.2 Security

| Requirement | Implementation |
|-------------|---------------|
| Authentication | JWT with short-lived access tokens + refresh token rotation |
| Password storage | bcrypt with cost factor 12 |
| Data in transit | HTTPS / TLS enforced |
| Input validation | Zod schemas on all API inputs |
| XSS prevention | DOMPurify (frontend) + sanitize-html (backend) |
| CSRF protection | SameSite cookies + token-based auth |
| Rate limiting | express-rate-limit per IP and per user |
| HTTP security headers | Helmet middleware |
| Encryption at rest | AES-256 for sensitive credentials (MASTER_ENCRYPTION_KEY) |
| 2FA | TOTP via Speakeasy |
| Audit logging | Immutable audit trail with IP, user agent, geo |
| Dependency scanning | Dependabot / npm audit |

### 8.3 Scalability

| Aspect | Approach |
|--------|----------|
| Database | PostgreSQL with Prisma — supports connection pooling, read replicas |
| Caching | Redis for API response caching, distributed locks |
| Real-time | Socket.IO with Redis adapter for horizontal scaling |
| Background jobs | node-cron workers (can be extracted to dedicated workers) |
| File uploads | Multer with configurable storage (local → S3 ready) |
| Multi-tenancy | Organization-scoped queries at ORM level |

### 8.4 Reliability

| Requirement | Approach |
|-------------|----------|
| Error handling | Global error handler middleware, structured error responses |
| AI retry logic | Exponential backoff with configurable max retries |
| Workflow retries | Automatic retry with failure tracking |
| Data backup | Database backup tracking (DataBackup model) |
| Monitoring | Sentry integration for error tracking |
| Logging | Pino structured logging with configurable levels |

### 8.5 Compliance

| Area | Implementation |
|------|---------------|
| CAN-SPAM | Unsubscribe links, suppression list, sender identification |
| Email deliverability | Bounce handling, complaint tracking, suppression management |
| Data export | GDPR-ready data export wizard for user data |
| Audit trail | Complete audit log of all data changes |
| Access control | Role-based permissions, organization isolation |

---

## 9. Testing Strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| **Unit tests (backend)** | Jest | Controllers, services, validators, utilities |
| **Integration tests** | Jest + Prisma | API endpoint integration with database |
| **E2E tests** | Playwright | 15 test suites covering all major user flows |
| **Type safety** | TypeScript strict mode | Compile-time type checking across full stack |
| **Linting** | ESLint | Code quality and consistency enforcement |

### E2E Test Suites

1. Authentication flows
2. Navigation and routing
3. Dashboard functionality
4. Lead management (CRUD, pipeline, import/export)
5. Campaign management (create, schedule, A/B testing)
6. AI Hub features
7. Analytics and reporting
8. Communication (inbox, email, SMS)
9. Workflow automation
10. Settings management
11. Admin panel
12. Billing and subscriptions
13. Help center
14. Integrations
15. Miscellaneous flows

---

## 10. Deployment & Infrastructure

### 10.1 Development Environment

- **Dev Container**: GitHub Codespaces / VS Code Dev Containers (Node.js 22)
- **Startup**: `./start-dev.sh` launches backend (port 8000), frontend (port 3000), and Prisma Studio (port 5555)
- **Shutdown**: `./stop-dev.sh` gracefully stops all services
- **Codespaces**: Automatic domain forwarding support built into startup scripts

### 10.2 Build & Deploy

| Stage | Command | Output |
|-------|---------|--------|
| Frontend build | `npm run build` | Static assets in `dist/` |
| Backend build | `cd backend && npm run build` | Compiled JS in `dist/` |
| Database migration | `npx prisma migrate deploy` | Schema applied to production DB |
| Backend start | `cd backend && npm start` | Express server on configured PORT |

### 10.3 Environment Configuration

- **Frontend**: `.env` with `VITE_` prefixed variables (API URL, app name)
- **Backend**: `.env` with database, auth, and service API keys
- **Required services**: PostgreSQL
- **Optional services**: Redis (caching/locks)
- **External APIs**: OpenAI, SendGrid, Twilio, Stripe, Vapi.ai

---

## 11. Future Roadmap

| Phase | Features |
|-------|----------|
| **Phase 2** | MLS/IDX integration, property listing sync, automated property alerts |
| **Phase 3** | Mobile app (React Native), offline-first support |
| **Phase 4** | Marketplace for third-party integrations, white-label options |
| **Phase 5** | Advanced ML models (churn prediction, LTV forecasting), custom AI model training |

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| **Lead** | A potential real estate client (buyer, seller, renter) |
| **Pipeline** | A series of stages representing the client journey (e.g., New → Contacted → Qualified → Won) |
| **Campaign** | A batch communication (email or SMS) sent to a target audience |
| **Workflow** | An automated sequence of actions triggered by events |
| **A/B Test** | An experiment comparing two or more variants of a campaign element |
| **Segment** | A dynamic group of leads matching specific criteria |
| **MJML** | Mailjet Markup Language — responsive email template framework |
| **BYOK** | Bring Your Own Key — users supply their own API keys for external services |
| **VAPID** | Voluntary Application Server Identification — Web Push authentication standard |
