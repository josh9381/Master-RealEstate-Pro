# Master RealEstate Pro — API Reference

## Base URL

```
Development:  http://localhost:8000/api
Production:   https://your-domain.com/api
```

## Interactive Docs (Swagger UI)

The full interactive API documentation is available at:

```
http://localhost:8000/api-docs
```

---

## Authentication

All endpoints (except those marked **Public**) require a JWT access token:

```http
Authorization: Bearer <accessToken>
```

### Obtaining a token

**POST** `/auth/login`

```json
{
  "email": "user@example.com",
  "password": "password",
  "rememberMe": false
}
```

Response:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": "...", "email": "...", "role": "USER" }
}
```

### Refreshing a token

**POST** `/auth/refresh`

```json
{ "refreshToken": "eyJ..." }
```

Response:
```json
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

---

## Endpoints by Domain

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Create account |
| POST | `/auth/login` | Public | Authenticate + get tokens |
| POST | `/auth/logout` | ✓ | Revoke refresh token |
| POST | `/auth/refresh` | Public | Refresh access token |
| GET | `/auth/me` | ✓ | Get current user |
| POST | `/auth/forgot-password` | Public | Send password reset email |
| POST | `/auth/reset-password` | Public | Reset password with token |
| POST | `/auth/verify-email` | Public | Verify email address |
| POST | `/auth/resend-verification` | Public | Resend verification email |
| POST | `/auth/mfa/verify` | Public | Verify TOTP during login |
| POST | `/auth/mfa/setup` | ✓ | Generate 2FA QR code |
| POST | `/auth/mfa/enable` | ✓ | Confirm and enable 2FA |
| POST | `/auth/mfa/disable` | ✓ | Disable 2FA |
| GET | `/auth/sessions` | ✓ | List active sessions |
| DELETE | `/auth/sessions/:id` | ✓ | Revoke a session |
| DELETE | `/auth/sessions` | ✓ | Revoke all other sessions |

---

### Leads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/leads` | ✓ | List leads (filterable, paginated) |
| POST | `/leads` | ✓ | Create a lead |
| GET | `/leads/:id` | ✓ | Get lead by ID |
| PUT | `/leads/:id` | ✓ | Update lead |
| DELETE | `/leads/:id` | ✓ | Delete lead |
| GET | `/leads/:id/activities` | ✓ | Lead activity timeline |
| POST | `/leads/import/preview` | ✓ | Preview a CSV/XLSX/VCF import |
| POST | `/leads/import/duplicates` | ✓ | Check import for duplicates |
| POST | `/leads/import` | ✓ | Execute lead import |
| POST | `/leads/merge` | ✓ | Merge two leads |
| GET | `/leads/scan-duplicates` | ✓ | Find duplicate leads in org |
| GET | `/leads/:id/documents` | ✓ | List lead documents |
| POST | `/leads/:id/documents` | ✓ | Upload document(s) to lead |
| DELETE | `/leads/:id/documents/:docId` | ✓ | Delete a lead document |

#### Lead Filters (GET `/leads` query params)

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Full-text search (name, email, phone) |
| `status` | string | Filter by lead status |
| `pipelineId` | string | Filter by pipeline |
| `stageId` | string | Filter by pipeline stage |
| `assignedToId` | string | Filter by assigned user |
| `source` | string | Filter by lead source |
| `tags` | string[] | Filter by tag IDs |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `sortBy` | string | Sort field |
| `sortOrder` | `asc` \| `desc` | Sort direction |

---

### Campaigns

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/campaigns` | ✓ | List campaigns |
| POST | `/campaigns` | ✓ | Create campaign |
| GET | `/campaigns/:id` | ✓ | Get campaign |
| PUT | `/campaigns/:id` | ✓ | Update campaign |
| DELETE | `/campaigns/:id` | ✓ | Delete campaign |
| POST | `/campaigns/:id/send` | ✓ | Send / schedule campaign |
| POST | `/campaigns/:id/pause` | ✓ | Pause running campaign |
| GET | `/campaigns/:id/recipients` | ✓ | List campaign recipients |
| GET | `/campaigns/:id/stats` | ✓ | Campaign performance stats |
| GET | `/ab-tests` | ✓ | List A/B tests |
| POST | `/ab-tests` | ✓ | Create A/B test |
| POST | `/ab-tests/:id/deploy-winner` | ✓ | Manual winner deployment |

---

### Messages (Inbox)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/messages` | ✓ | List inbox messages (filterable) |
| POST | `/messages` | ✓ | Send a message |
| GET | `/messages/:id` | ✓ | Get message |
| POST | `/messages/:id/reply` | ✓ | Reply to a message |
| GET | `/messages/thread/:threadId` | ✓ | Get thread messages |
| PATCH | `/messages/:id/star` | ✓ | Star/unstar message |
| PATCH | `/messages/:id/archive` | ✓ | Archive message |
| PATCH | `/messages/:id/snooze` | ✓ | Snooze message |
| PATCH | `/messages/:id/trash` | ✓ | Move to trash |
| PATCH | `/messages/:id/read` | ✓ | Mark as read |
| POST | `/messages/batch` | ✓ | Batch operation (archive, delete, etc.) |

---

### Workflows

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/workflows` | ✓ | List workflows |
| POST | `/workflows` | ✓ | Create workflow |
| GET | `/workflows/:id` | ✓ | Get workflow with steps |
| PUT | `/workflows/:id` | ✓ | Update workflow |
| DELETE | `/workflows/:id` | ✓ | Delete workflow |
| POST | `/workflows/:id/trigger` | ✓ | Manually trigger a workflow |
| GET | `/workflows/:id/executions` | ✓ | List workflow executions |
| GET | `/workflows/:id/executions/:execId` | ✓ | Get execution details (step logs) |

---

### Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/analytics/dashboard` | ✓ | Dashboard KPI data |
| GET | `/analytics/pipeline` | ✓ | Pipeline funnel data |
| GET | `/analytics/attribution` | ✓ | Multi-touch attribution report |
| GET | `/analytics/period-comparison` | ✓ | Period-over-period comparison |
| GET | `/analytics/lead-velocity` | ✓ | Pipeline velocity metrics |
| GET | `/analytics/source-roi` | ✓ | Lead source ROI |
| GET | `/analytics/follow-up-analytics` | ✓ | Follow-up performance |
| GET | `/analytics/campaigns` | ✓ | Campaign performance overview |
| GET | `/goals` | ✓ | List org goals |
| POST | `/goals` | ✓ | Create goal |
| GET | `/goals/:id` | ✓ | Get goal with progress |
| PUT | `/goals/:id` | ✓ | Update goal |
| DELETE | `/goals/:id` | ✓ | Delete goal |

---

### AI

All AI endpoints are rate-limited and subject to the org AI cost budget.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ai/chat` | ✓ | AI assistant chat (SSE streaming) |
| POST | `/ai/score-lead` | ✓ | Score a lead with AI |
| POST | `/ai/suggest-followup` | ✓ | Suggest follow-up actions |
| POST | `/ai/generate-email` | ✓ | Generate email content |
| POST | `/ai/generate-sms` | ✓ | Generate SMS content |
| POST | `/ai/enrich-lead/:id` | ✓ | Enrich lead with AI inference |
| GET | `/ai/insights` | ✓ | Get AI insights for org |
| GET | `/ai/cost-dashboard` | ✓ | AI usage and cost data |
| GET | `/ai/availability` | ✓ | Check if AI service is configured |
| GET | `/ai/org-settings` | ✓ | Get org AI personalization settings |
| PUT | `/ai/org-settings` | ✓ | Update org AI settings |

---

### Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/settings/profile` | ✓ | Get profile |
| PUT | `/settings/profile` | ✓ | Update profile |
| POST | `/settings/profile/avatar` | ✓ | Upload avatar |
| GET | `/settings/business` | ✓ | Get business settings |
| PUT | `/settings/business` | ✓ | Update business settings |
| POST | `/settings/business/logo` | ✓ | Upload business logo |
| GET | `/settings/email` | ✓ | Get email configuration |
| PUT | `/settings/email` | ✓ | Update email configuration |
| GET | `/settings/sms` | ✓ | Get SMS configuration |
| PUT | `/settings/sms` | ✓ | Update SMS configuration |
| GET | `/settings/notifications` | ✓ | Get notification preferences |
| PUT | `/settings/notifications` | ✓ | Update notification preferences |
| GET | `/settings/email-template-defaults` | ✓ | Get org email template defaults |
| PUT | `/settings/email-template-defaults` | ✓ | Update org email template defaults |

---

### Admin (Admin/Manager role required)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/team` | ✓ Admin | List org users |
| PATCH | `/users/:id/role` | ✓ Admin | Update user role |
| DELETE | `/users/:id` | ✓ Admin | Deactivate user |
| GET | `/admin/audit-logs` | ✓ Admin | Audit trail (filterable) |
| GET | `/admin/system-settings` | ✓ Admin | System settings |
| PUT | `/admin/system-settings` | ✓ Admin | Update system settings |
| GET | `/admin/feature-flags` | ✓ Admin | List feature flags |
| POST | `/admin/feature-flags` | ✓ Admin | Create feature flag |
| PUT | `/admin/feature-flags/:id` | ✓ Admin | Update feature flag |
| POST | `/admin/backup` | ✓ Admin | Create org data backup |
| GET | `/admin/backup` | ✓ Admin | List backups |
| GET | `/admin/backup/:id/download` | ✓ Admin | Download backup |

---

### Billing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/billing/status` | ✓ | Current subscription status |
| POST | `/billing/checkout` | ✓ | Create Stripe checkout session |
| POST | `/billing/portal` | ✓ | Open Stripe customer portal |
| GET | `/billing/invoices` | ✓ | List invoices |
| GET | `/billing/payment-methods` | ✓ | List payment methods |

---

## Error Responses

All errors follow a standard envelope:

```json
{
  "error": "Human-readable error message"
}
```

Or for validation errors:

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No content (delete) |
| 400 | Bad request / validation error |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient role or CSRF) |
| 404 | Not found |
| 409 | Conflict (duplicate resource) |
| 413 | Payload too large |
| 422 | Unprocessable entity |
| 429 | Rate limit exceeded / AI budget exceeded |
| 500 | Internal server error |
| 501 | Not implemented (feature coming soon) |

---

## Request Size Limits

| Route prefix | Limit |
|-------------|-------|
| `/api/ai/*` | 5 MB |
| `/api/webhooks/*` | 1 MB |
| All other routes | 1 MB |

File uploads (handled by multer, not express.json) have separate limits:
- Avatar / Logo: 5 MB, image types only
- Lead documents: 10 MB per file, 20 files max per lead (PDF, images, Office docs)
- Message attachments: 10 MB per file, 25 MB total per request

---

## Rate Limits

| Endpoint group | Limit |
|---------------|-------|
| General API | 100 requests / 15 min per IP |
| Auth (login, register) | 10 requests / 15 min per IP |
| Password change | 5 requests / 15 min per IP |
| Message send | 30 requests / 15 min per IP |
| AI generation | 20 requests / 15 min per IP |
| Workflow trigger | 20 requests / 15 min per IP |
| Team invite | 10 requests / hour per IP |
| Unsubscribe | 30 requests / 15 min per IP |
| Admin maintenance | 3 requests / hour per IP (production) |

---

## Pagination

Endpoints that return lists support cursor or offset pagination:

**Offset pagination** (most list endpoints):
```
GET /leads?page=2&limit=20
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 245,
    "totalPages": 13
  }
}
```

---

## Webhooks (Inbound)

### Stripe (Billing events)

```
POST /webhooks/stripe
```

Expects `Stripe-Signature` header for HMAC verification. Handles:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

### Twilio (Inbound SMS / MMS)

```
POST /webhooks/twilio/sms
```

Handles inbound SMS messages and STOP/START/HELP keywords (TCPA compliance).

### Workflow Webhooks (Custom triggers)

```
POST /webhooks/workflow/:triggerKey
```

Trigger key is generated when creating a webhook-triggered workflow. Includes HMAC signature verification.
