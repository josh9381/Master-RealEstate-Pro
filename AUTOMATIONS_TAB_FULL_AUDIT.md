# Automations Tab — Full Audit (March 20, 2026)

**Scope:** All frontend pages/components, backend API/services, database schema, routing, types, and validation related to the Automations/Workflows tab.  
**Auditor:** GitHub Copilot  
**Previous Audit:** `AUTOMATIONS_WORKFLOWS_AUDIT.md` (same date)

---

## Executive Summary

The Automations tab consists of **3 pages** and **4 supporting components** on the frontend, backed by **7 backend files** (controller, 3 services, routes, validator, job processor) and **3 Prisma models**. The system provides visual workflow building, simplified automation rule creation, execution tracking with per-step logging, retry logic, and real-time updates.

### What's Changed Since Previous Audit

Several critical issues from the prior audit have been **resolved**:
- ✅ **Git merge conflicts in WorkflowBuilder.tsx** — Fully resolved. File compiles clean with 0 TypeScript errors.
- ✅ **WEBHOOK trigger missing from validator** — WEBHOOK is now present in all 3 Zod enum arrays (`createWorkflowSchema`, `updateWorkflowSchema`, `workflowQuerySchema`).
- ✅ **Execution logs missing `steps` and `lead` includes** — `getWorkflowExecutions` controller now includes `steps: { orderBy: { stepIndex: 'asc' } }` and `lead: { select: { firstName, lastName, email } }`.
- ✅ **ADD_TO_CAMPAIGN action incomplete** — Now uses `prisma.campaignLead.upsert()` to properly add leads to campaigns.
- ✅ **WorkflowBuilder stats hardcoded to 0** — Now fetches via `workflowsApi.getAnalytics()` using a `useQuery` hook.
- ✅ **Recent Executions in AutomationRules** — Now shows rules with recent lastRun values (top 5, sorted by date).
- ✅ **Available Triggers list in AutomationRules** — Updated to include all 10 supported trigger types (Lead Created, Status Changed, Email Opened, Score Threshold, Tag Added, Lead Assigned, Campaign Completed, Schedule, Manual, Webhook). Removed stale "Form Submitted" and "Link Clicked" entries.
- ✅ **Bulk Delete checks active status** — `executeBulkAction` now filters out active workflows, warns the user, and only deletes paused ones.
- ✅ **WorkflowNode connection points** — Card now has `relative` class via the outer Card element.
- ✅ **NodeConfigPanel node label** — Label input is now editable (not disabled).
- ✅ **WorkflowNode using emoji** — Now uses proper Lucide `Pencil` and `Trash2` icons.
- ✅ **SSRF protection on WEBHOOK action** — URL is now validated against private IP ranges, localhost, and metadata endpoints.
- ✅ **Canvas mini-map overlap with instructions** — Instructions panel now positioned at `bottom-40 left-4` to avoid overlapping the mini-map at `bottom-4 left-4`.

**Current Overall Rating: 8.5/10** — Strong system with most prior issues fixed. Remaining items are medium/low priority.

---

## REMAINING ISSUES

### P1 — High Priority

#### 1. Save Workflow: Action Types Still Fragile
**File:** [WorkflowBuilder.tsx](src/pages/workflows/WorkflowBuilder.tsx#L537)  
**Status:** Partially fixed  

The `saveWorkflow` function now uses `n.config?.actionType || n.type.toUpperCase()` for the action type. When components are added from the `WorkflowComponentLibrary`, they correctly carry `config.actionType` (e.g., `'SEND_EMAIL'`), so this works properly for library-created nodes.

**However**, the fallback `n.type.toUpperCase()` still produces `'ACTION'`, `'CONDITION'`, or `'DELAY'` for manually created nodes or imported-then-cleared nodes. If a user edits the config and removes `actionType`, the backend will receive an unknown action type.

**Recommendation:** Add client-side validation before save: warn if any action node is missing `config.actionType`.

#### 2. Trigger Type Derivation Still Has Partial Fallback
**File:** [WorkflowBuilder.tsx](src/pages/workflows/WorkflowBuilder.tsx#L540)  
```ts
triggerType: triggerNode?.config?.triggerType || triggerNode?.label?.toUpperCase().replace(/[\s-]+/g, '_') || 'MANUAL'
```
Since the `WorkflowComponentLibrary` now sets `config.triggerType` on all trigger components, this works correctly for library-created triggers. But the label-based fallback (`toUpperCase().replace(/[\s-]+/g, '_')`) can produce incorrect values for user-renamed triggers (e.g., "My Custom Trigger" → `"MY_CUSTOM_TRIGGER"`).

**Recommendation:** Prefer the `MANUAL` fallback over label derivation: `triggerNode?.config?.triggerType || 'MANUAL'`.

#### 3. Duplicate Workflow Uses Wrong Create Payload
**File:** [WorkflowBuilder.tsx](src/pages/workflows/WorkflowBuilder.tsx#L1160-L1176)  
The "Duplicate Workflow" button builds a payload with `trigger` and `conditions` fields, but the backend `createWorkflowSchema` expects `triggerType`, `triggerData`, and `actions`. The duplicate request will fail Zod validation due to:
- Missing `triggerType` (sends `trigger` instead)
- Missing `actions` array (sends `conditions` and wrong `actions` format)

**Fix:** Use the same `saveWorkflow` format: `{ name, triggerType, triggerData, actions }`.

#### 4. "Time Saved" Stat Calculation is Arbitrary
**File:** [AutomationRules.tsx](src/pages/workflows/AutomationRules.tsx#L118)  
```ts
timeSaved: Math.round((statsResponse.data.successfulExecutions || 0) * 2 / 60)
```
Time saved is `successfulExecutions * 2 / 60` hours — an arbitrary 2-minute-per-execution estimate. The label says "This month" but uses all-time totals.

**Recommendation:** Either remove the metric, label it as "estimated", or calculate from actual execution durations.

#### 5. Test Panel Input Not Connected to `runTest`
**File:** [WorkflowBuilder.tsx](src/pages/workflows/WorkflowBuilder.tsx#L1131-L1146)  
The "Test with Sample Data" input has no state binding or `name` — the value typed is never read. The `runTest` function calls `workflowsApi.testWorkflow(workflowId)` with no test data parameter.

**Fix:** Add a `testInput` state, bind it to the Input, and pass it as `testData` to the API call.

---

### P2 — Medium Priority

#### 6. Execution Logs Polling Runs Even When Logs Panel Is Closed
**File:** [WorkflowBuilder.tsx](src/pages/workflows/WorkflowBuilder.tsx#L303-L318)  
A 5-second polling interval calls `fetchWorkflowStatus()` continuously regardless of whether the user is viewing execution logs. This generates unnecessary API calls (2 requests per interval: `getWorkflow` + `getExecutions`).

**Recommendation:** Only poll when `showLogsPanel` or `showMetricsPanel` is true, or use WebSocket events instead.

#### 7. AutomationRules Create Modal Missing WEBHOOK Trigger
**File:** [AutomationRules.tsx](src/pages/workflows/AutomationRules.tsx#L451)  
The trigger dropdown in the "Create New Rule" modal has 9 options but omits `WEBHOOK`. The ref card at the bottom lists all 10 triggers including Webhook.

**Fix:** Add `<option value="WEBHOOK">Webhook</option>` to the trigger select.

#### 8. AutomationRules Create Doesn't Send triggerData
**File:** [AutomationRules.tsx](src/pages/workflows/AutomationRules.tsx#L288)  
The `createRule` function generates `newRuleData` without a `triggerData` field. The backend expects `triggerData` to hold configuration (e.g., schedule for TIME_BASED, threshold for SCORE_THRESHOLD). Without it, TIME_BASED and SCORE_THRESHOLD workflows are created with no configuration.

**Recommendation:** Add minimum config fields for those trigger types in the create modal.

#### 9. WorkflowCanvas: Connections Only Drawn Sequentially
**File:** [WorkflowCanvas.tsx](src/components/workflows/WorkflowCanvas.tsx#L350-L390)  
Connections are drawn between `nodes[i]` and `nodes[i+1]` only — strictly sequential. This means:
- Condition nodes cannot show branch paths (true/false paths)
- Parallel actions cannot be visualized
- Reordering nodes changes the connection topology

This is acceptable for v1 but limits the visual builder for complex conditional workflows.

#### 10. WorkflowsList Analytics Modal Not Implemented
**File:** [WorkflowsList.tsx](src/pages/workflows/WorkflowsList.tsx#L149)  
The `viewAnalytics` function sets `analyticsWorkflow` state to show an analytics modal, but the actual Dialog component for this modal is defined but appears to only show the workflow details without fetching analytics data via `workflowsApi.getAnalytics()`. 

**Recommendation:** Fetch and display actual analytics (daily execution counts, avg duration, failure breakdown).

#### 11. NodeConfigPanel Action Config Uses Label Matching
**File:** [NodeConfigPanel.tsx](src/components/workflows/NodeConfigPanel.tsx#L334)  
The `renderActionConfig()` switches behavior based on `node.label.toLowerCase()` string matching (e.g., `actionType.includes('email')`, `actionType.includes('sms')`). This means:
- Renaming a node from "Send Email" to "Welcome Message" hides the email configuration fields
- A node labeled "Email Notification" would show email config even if it's a notification action

**Fix:** Switch on `node.config?.actionType` instead of `node.label`.

#### 12. NodeConfigPanel Trigger Config Also Uses Label Matching
**File:** [NodeConfigPanel.tsx](src/components/workflows/NodeConfigPanel.tsx#L51)  
Same issue as above — `renderTriggerConfig()` matches on `node.label.toLowerCase()` rather than `node.config?.triggerType`. Renaming a trigger node hides its configuration.

---

### P3 — Low Priority

#### 13. WorkflowComponentLibrary: Duplicate IDs Across Categories
**File:** [WorkflowComponentLibrary.tsx](src/components/workflows/WorkflowComponentLibrary.tsx#L36)  
Trigger `email-opened` (id: `'email-opened'`) and condition `condition-email-opened` (id: `'condition-email-opened'`) — these have been fixed with different IDs. ✅ (no longer an issue)

#### 14. Recovery Function Has No orgId Filter
**File:** [workflow.service.ts](backend/src/services/workflow.service.ts#L1437)  
`recoverDelayedWorkflowActions` queries all RUNNING executions globally (`take: 200`, no org filter). In theory safe because execution IDs tie back to specific workflows, but in a multi-tenant system the recovery loop processes all tenants' data in one batch.

#### 15. SEND_NOTIFICATION Requires Lead Assignment
**File:** [workflow.service.ts](backend/src/services/workflow.service.ts#L1216)  
The `SEND_NOTIFICATION` action only creates a notification for `lead.assignedToId`. If no user is assigned to the lead, the notification is silently skipped. This may surprise users who expect team-wide notifications.

#### 16. WorkflowBuilder: Template Uses Count Always Shows 0
**File:** [WorkflowBuilder.tsx](src/pages/workflows/WorkflowBuilder.tsx#L63)  
All 8 templates show `uses: 0` — this is a static value, never incremented. Either remove the badge or track template usage.

#### 17. AutomationRules Template Uses Count Always Shows 0
**File:** [AutomationRules.tsx](src/pages/workflows/AutomationRules.tsx#L937)  
Same as above — the 6 rule templates all show `0 uses`.

#### 18. WorkflowBuilder Drag Image Cleanup Race Condition
**File:** [WorkflowComponentLibrary.tsx](src/components/workflows/WorkflowComponentLibrary.tsx#L279-L283)  
The drag image clone is appended to `document.body` and removed via `setTimeout(0)`. In rare cases, if the component unmounts during drag, the cleanup may fail, leaving a phantom element in the DOM.

#### 19. Export JSON Includes No Actions/Trigger Types
**File:** [WorkflowBuilder.tsx](src/pages/workflows/WorkflowBuilder.tsx#L1192)  
The "Export JSON" button exports `{ name, nodes, status, totalNodes, exportedAt }` — it omits the derived `triggerType`, `actions`, and `triggerData`. The exported file cannot be imported back as a valid workflow without manual reconstruction.

---

## Architecture & Security Assessment

### ✅ Strengths

| Area | Details |
|------|---------|
| **Multi-tenant isolation** | Every controller query filters by `organizationId`. All CRUD + read operations verify ownership. |
| **Input validation** | Zod schemas validate all 5 mutation endpoints. Query params also validated. All 10 trigger types supported. |
| **Rate limiting** | Manual trigger and trigger-for-lead endpoints use `workflowTriggerLimiter`. |
| **Plan enforcement** | `enforcePlanLimit('workflows')` on create. |
| **Per-step execution logging** | Full `WorkflowExecutionStep` model with stepIndex, actionType, status, error, retryCount, durationMs, branchTaken. |
| **Retry with backoff** | Configurable 1-3 retries with exponential delays (1s, 5s, 15s in executor). |
| **Failure notifications** | Creates in-app `Notification` records + WebSocket events on final failure. |
| **Delayed action recovery** | `recoverDelayedWorkflowActions()` reschedules lost in-memory delays on restart. |
| **Dry-run testing** | `testWorkflow` validates the full execution pipeline without sending real emails/SMS. |
| **XSS protection** | `DOMPurify.sanitize()` used for email HTML preview in NodeConfigPanel. |
| **SSRF protection** | Webhook action validates URL against private IP ranges, localhost, and metadata endpoints. Protocol restricted to http/https. 10s timeout with AbortSignal. |
| **WebSocket real-time events** | Workflow completion/progress pushed to organization members. |
| **TypeScript strict** | All 7 frontend files compile clean with 0 errors. |
| **Lazy loading** | All 3 pages use `lazyWithRetry()` with Suspense + ErrorBoundary wrappers. |
| **Database indexing** | Composite index on `(organizationId, isActive)`, plus individual indexes on `isActive`, `triggerType`, `organizationId`, execution `startedAt`, `status`, `workflowId`, `leadId`. |

### Security Notes

| Item | Status |
|------|--------|
| Email HTML preview sanitized via DOMPurify | ✅ Safe |
| Webhook URL validated against SSRF | ✅ Safe |
| No raw SQL queries — all Prisma ORM | ✅ Safe |
| User input in workflow names/descriptions not rendered as HTML | ✅ Safe (React auto-escapes) |
| Webhook headers pass-through from config | ⚠️ Low risk — admin-configured only |
| `setTimeout` for delays — lost on restart | ⚠️ Mitigated by recovery cron |

---

## Complete File Inventory

### Frontend (7 files, 0 compile errors)

| File | Lines | Purpose | Health |
|------|-------|---------|--------|
| `src/pages/workflows/WorkflowsList.tsx` | ~800 | Main dashboard: stats, list/grid views, analytics modal, delete with confirmation | ✅ Good |
| `src/pages/workflows/WorkflowBuilder.tsx` | ~1350 | Visual builder: canvas, templates, config panel, test panel, execution logs, import/export | ⚠️ 5 medium issues |
| `src/pages/workflows/AutomationRules.tsx` | ~1065 | Simplified rules: CRUD, bulk ops, search/filter, templates, triggers/actions reference | ⚠️ 3 medium issues |
| `src/components/workflows/WorkflowCanvas.tsx` | ~568 | 2D canvas: zoom, pan, mini-map, drag/click modes, connections, quick-start templates | ✅ Good |
| `src/components/workflows/WorkflowNode.tsx` | ~166 | Node card: type-based colors/icons, edit/delete buttons, connection points | ✅ Good |
| `src/components/workflows/WorkflowComponentLibrary.tsx` | ~331 | Component palette: 6 triggers, 4 conditions, 8 actions, 2 utilities | ✅ Good |
| `src/components/workflows/NodeConfigPanel.tsx` | ~645 | Config forms: trigger, condition, action, delay configs with DOMPurify | ⚠️ 2 medium issues |

### Backend (7 files)

| File | Lines | Purpose | Health |
|------|-------|---------|--------|
| `backend/src/controllers/workflow.controller.ts` | ~449 | Express handlers: CRUD, toggle, test, executions, stats, analytics, trigger | ✅ Good |
| `backend/src/services/workflow.service.ts` | ~1453 | Core engine: execution, retry, per-step logging, recovery, variable substitution | ✅ Good |
| `backend/src/services/workflowExecutor.service.ts` | ~565 | Queue manager: priority queue, concurrent processing, performance monitoring | ✅ Good |
| `backend/src/services/workflow-trigger.service.ts` | ~233 | Event detector: trigger matching, condition evaluation, async execution | ✅ Good |
| `backend/src/jobs/workflowProcessor.ts` | ~215 | Periodic processor: time-based triggers, scheduled workflows | ✅ Good |
| `backend/src/routes/workflow.routes.ts` | 139 | Route definitions: 12 endpoints, auth, validation, rate limiting | ✅ Good |
| `backend/src/validators/workflow.validator.ts` | 66 | Zod schemas: 5 schemas, all 10 trigger types | ✅ Good |

### Database (3 models, 1 enum)

| Model | Fields | Indexes | Purpose |
|-------|--------|---------|---------|
| `Workflow` | 18 | 4 | Definitions: name, trigger, actions, stats, config |
| `WorkflowExecution` | 8 + relations | 4 | Execution tracking: status, timing, metadata, lead |
| `WorkflowExecutionStep` | 13 | 2 | Per-step detail: action, result, retries, duration |
| `WorkflowTrigger` enum | 10 values | — | All trigger types |
| `ExecutionStatus` enum | 4 values | — | PENDING, RUNNING, SUCCESS, FAILED |

### API Endpoints (12 routes)

| Method | Route | Auth | Validation | Rate Limit |
|--------|-------|------|------------|------------|
| GET | `/api/workflows/stats` | ✅ | — | — |
| GET | `/api/workflows` | ✅ | Query | — |
| GET | `/api/workflows/:id` | ✅ | — | — |
| POST | `/api/workflows` | ✅ | Body + Plan | — |
| PUT | `/api/workflows/:id` | ✅ | Body | — |
| DELETE | `/api/workflows/:id` | ✅ | — | — |
| PATCH | `/api/workflows/:id/toggle` | ✅ | Body | — |
| POST | `/api/workflows/:id/test` | ✅ | Body | — |
| GET | `/api/workflows/:id/executions` | ✅ | — | — |
| GET | `/api/workflows/:id/analytics` | ✅ | — | — |
| POST | `/api/workflows/:id/trigger` | ✅ | — | ✅ |
| POST | `/api/workflows/trigger-for-lead` | ✅ | — | ✅ |

### Frontend Routes

| Path | Component | Lazy Loaded | Error Boundary |
|------|-----------|-------------|----------------|
| `/workflows` | WorkflowsList | ✅ | ✅ |
| `/workflows/builder` | WorkflowBuilder | ✅ | ✅ |
| `/workflows/automation` | AutomationRules | ✅ | ✅ |

---

## Workflow Component Library Inventory

### Triggers (6)
| ID | Label | Backend triggerType | Config Set |
|----|-------|-------------------|------------|
| lead-created | Lead Created | LEAD_CREATED | ✅ |
| lead-status-changed | Lead Status Changed | LEAD_STATUS_CHANGED | ✅ |
| email-opened | Email Opened | EMAIL_OPENED | ✅ |
| score-threshold | Score Threshold | SCORE_THRESHOLD | ✅ |
| time-based | Time-Based | TIME_BASED | ✅ |
| webhook | Webhook | WEBHOOK | ✅ |

**Missing from library:** LEAD_ASSIGNED, CAMPAIGN_COMPLETED, TAG_ADDED, MANUAL — these 4 trigger types exist in the backend enum but aren't in the drag/drop component library.

### Conditions (4)
| ID | Label | Config Type |
|----|-------|-------------|
| check-lead-field | Check Lead Field | lead_field |
| condition-email-opened | Email Opened | email_opened |
| link-clicked | Link Clicked | link_clicked |
| time-elapsed | Time Elapsed | time_elapsed |

### Actions (8)
| ID | Label | Backend actionType | Config Set |
|----|-------|-------------------|------------|
| send-email | Send Email | SEND_EMAIL | ✅ |
| send-sms | Send SMS | SEND_SMS | ✅ |
| update-lead | Update Lead | UPDATE_LEAD | ✅ |
| add-tag | Add Tag | ADD_TAG | ✅ |
| create-task | Create Task | CREATE_TASK | ✅ |
| assign-lead | Assign Lead | ASSIGN_LEAD | ✅ |
| send-notification | Send Notification | SEND_NOTIFICATION | ✅ |
| add-to-campaign | Add to Campaign | ADD_TO_CAMPAIGN | ✅ |

**Missing from library:** REMOVE_TAG, UPDATE_SCORE, WEBHOOK (action) — these 3 action types are supported by the backend service but not in the component library.

### Utilities (2)
| ID | Label | Config |
|----|-------|--------|
| delay | Delay | duration + unit |
| schedule | Schedule | datetime picker |

---

## Summary of Issues

| Priority | Count | Status |
|----------|-------|--------|
| **P0 Critical** | 0 | All resolved ✅ |
| **P1 High** | 5 | Action type fallback, trigger derivation, duplicate workflow, time saved metric, test input |
| **P2 Medium** | 7 | Polling overhead, missing WEBHOOK option, no triggerData on create, sequential connections, analytics modal, NodeConfigPanel label matching (×2) |
| **P3 Low** | 7 | Recovery orgId filter, notification requires assignment, template uses count, drag image cleanup, export incomplete, missing triggers/actions in library |
| **Total Active** | **19** | |
| **Resolved from prior audit** | **14** | |

---

## Recommendations (Priority Order)

1. **Add pre-save validation** in WorkflowBuilder to catch nodes missing `config.actionType` or `config.triggerType`
2. **Fix duplicate workflow** payload to match backend schema
3. **Switch NodeConfigPanel** action/trigger rendering to use `config.actionType`/`config.triggerType` instead of label matching
4. **Add WEBHOOK** to AutomationRules create modal trigger dropdown
5. **Add missing triggers** (LEAD_ASSIGNED, CAMPAIGN_COMPLETED, TAG_ADDED, MANUAL) to WorkflowComponentLibrary
6. **Add missing actions** (REMOVE_TAG, UPDATE_SCORE, WEBHOOK) to WorkflowComponentLibrary
7. **Conditionally poll** — only poll workflow status when execution logs or metrics panel is open
8. **Connect test input** — bind the sample data input to the `runTest` function
