# Automations & Workflows Tab — Full Audit

**Date:** March 20, 2026  
**Scope:** All frontend pages/components, backend API/services, database schema, and E2E tests related to the Automations tab and Workflows system.

---

## Executive Summary

The Automations/Workflows system is a feature-rich multi-page system encompassing:
- **Workflows List** (`/workflows`) — Dashboard with stats, list/grid views, analytics modal
- **Workflow Builder** (`/workflows/builder`) — Visual drag-and-drop canvas with templates, node configuration, execution logs
- **Automation Rules** (`/workflows/automation`) — Simplified rule creation, bulk actions, templates, search/filter

The backend is **well-architected** with proper multi-tenant isolation, execution tracking with per-step logging, retry logic with exponential backoff, real-time WebSocket events, failure notifications, and delayed action recovery on server restart.

**Overall Rating: 7.5/10** — Strong foundation with a solid backend, but the frontend has **8 unresolved git merge conflicts** that make WorkflowBuilder non-functional as shipped. Several other frontend and backend issues need attention.

---

## CRITICAL ISSUES (P0 — Must Fix)

### 1. **8 Git Merge Conflicts in WorkflowBuilder.tsx** ❌
**File:** `src/pages/workflows/WorkflowBuilder.tsx`  
**Lines:** 1, 215, 365, 603, 1043, 1353, 1373, 1457  
**Impact:** The WorkflowBuilder page **will not compile or render**. Users clicking "Create Workflow" or "Edit" on any workflow will see a blank page/error boundary.

Conflict regions include:
- **Line 1-7:** Import statements (duplicate `useRef`/`useQuery` imports)
- **Line 215-218:** `validationErrors` state declaration removed in stash
- **Line 365-375:** `addNodeFromComponent` function — "Updated upstream" uses `component.type/label/description/config`, "Stashed changes" uses bare `type/label` and adds position
- **Line 603-635:** Canvas rendering — "Updated upstream" uses refactored `<WorkflowCanvas>` component, "Stashed changes" has inline card-based node rendering
- **Line 1043-1147:** Validation warnings and canvas mounting — massive divergence between versions
- **Line 1353-1365:** Execution logs panel header
- **Line 1373-1410:** Execution logs body rendering
- **Line 1457-1471:** Execution logs footer

**Resolution:** The "Updated upstream" version should be kept in all cases — it uses the proper `WorkflowCanvas` component, has validation errors support, and uses the per-step execution log rendering. The "Stashed changes" version is an older inline implementation.

### 2. **WEBHOOK Trigger Missing from Validator** ⚠️
**File:** `backend/src/validators/workflow.validator.ts`  
**Impact:** The `createWorkflowSchema` and `updateWorkflowSchema` Zod validators only list 9 trigger types. The Prisma schema includes `WEBHOOK` as a valid `WorkflowTrigger`, and the `WorkflowComponentLibrary` frontend component offers a "Webhook" trigger. But the backend validator will **reject** any create/update request with `triggerType: 'WEBHOOK'`, causing a 400 error.

**Fix:** Add `'WEBHOOK'` to both Zod enum arrays.

---

## HIGH PRIORITY ISSUES (P1)

### 3. **AutomationRules: "Recent Executions" Section is Static** ⚠️
**File:** `src/pages/workflows/AutomationRules.tsx` (line ~1020)  
**Impact:** The "Recent Executions" card at the bottom always shows "No execution data yet" — it never fetches or displays actual execution data. The workflows list page similarly lacks global execution listing.

**Fix:** Fetch the latest `WorkflowExecution` records via `workflowsApi.getExecutions()` and render them.

### 4. **AutomationRules: "Available Triggers" Shows Stale/Incorrect List** ⚠️
**File:** `src/pages/workflows/AutomationRules.tsx` (line ~1038)  
The hardcoded "Available Triggers" reference card lists:
- "Form Submitted" — **not a supported trigger type** in the backend
- "Link Clicked" — **not a trigger type** (it's a condition type)
- Missing triggers: `Tag Added`, `Score Threshold`, `Manual`, `Webhook`, `Lead Assigned`, `Campaign Completed`

### 5. **WorkflowBuilder: Save Uses `action.type` Instead of Proper Action Types** ⚠️
**File:** `src/pages/workflows/WorkflowBuilder.tsx` (~line 540)  
When saving a workflow, the `saveWorkflow` function sets `triggerType` from the trigger node's config or from a slugified label. It also maps action nodes as `{ type: n.type, config: {...} }` — but `n.type` is the **node type** (`'action'`, `'condition'`, `'delay'`) not the **action type** (`'SEND_EMAIL'`, `'CREATE_TASK'`, etc.).

This means newly created workflows will have actions like `{ type: 'action', config: { label: 'Send Email' } }` instead of `{ type: 'SEND_EMAIL', config: {...} }`. The backend executor uses `action.type` to dispatch to the correct handler (e.g., `case 'SEND_EMAIL':`), so these will fall through to the `default: logger.warn('Unknown action type')` case and do nothing.

**Fix:** The action node needs to carry the specific action type (e.g., `SEND_EMAIL`) in its config or as a dedicated field, and `saveWorkflow` must use that value.

### 6. **WorkflowBuilder: triggerType Derivation is Fragile** ⚠️
**File:** `src/pages/workflows/WorkflowBuilder.tsx` (~line 544)  
```ts
triggerType: triggerNode?.config?.triggerType || triggerNode?.label?.toLowerCase().replace(/\s+/g, '_') || 'manual'
```
If a user picks a trigger from the component library (e.g., "Lead Created"), the `triggerType` config is not set — only the label is. Converting "Lead Created" to `lead_created` doesn't match the enum value `LEAD_CREATED`, causing backend validation failure.

**Fix:** Set `config.triggerType` on trigger nodes when they are created from the component library.

---

## MEDIUM PRIORITY ISSUES (P2)

### 7. **WorkflowNode: Connection Points Use `absolute` Positioning Without `relative` Parent**
**File:** `src/components/workflows/WorkflowNode.tsx` (line ~140-145)  
The connection point divs use `className="absolute -top-2 ..."` but the parent `<Card>` doesn't have `position: relative`. This means the connection dots will position relative to the nearest positioned ancestor, which may not be the card itself, causing visual misalignment.

**Fix:** Add `relative` class to the outer `<Card>` element.

### 8. **AutomationRules: Bulk Delete Doesn't Check Active Status**
**File:** `src/pages/workflows/AutomationRules.tsx` (~line 215)  
The `executeBulkAction` function calls `workflowsApi.deleteWorkflow()` for each selected rule without checking if workflows are active. The backend rejects deleting active workflows with a `ValidationError`, so bulk delete will silently fail for active workflows while showing a success toast for the count.

**Fix:** Either filter out active workflows before deletion, or toggle them inactive first, or show a proper error.

### 9. **WorkflowCanvas: Mini-Map and Instructions Overlap**
**File:** `src/components/workflows/WorkflowCanvas.tsx` (~line 480-530)  
Both the mini-map component and the keyboard instructions panel are positioned `absolute bottom-4 left-4 z-20`. They will render on top of each other when nodes exist.

### 10. **Execution Logs: Missing `steps` Include in Controller**
**File:** `backend/src/controllers/workflow.controller.ts` (~line 290)  
The `getWorkflowExecutions` controller doesn't include `steps` in its Prisma query, but the frontend `WorkflowBuilder` expects `exec.steps` in the execution logs mapping. This means per-step details won't appear in the UI even though the data exists in the database.

**Fix:** Add `include: { steps: { orderBy: { stepIndex: 'asc' } }, lead: { select: { firstName: true, lastName: true, email: true } } }` to the controller's `findMany`.

### 11. **Execution Logs: Missing `lead` Include in Controller**
Same as above — the frontend accesses `exec.lead.firstName`, `exec.lead.lastName`, `exec.lead.email` but the controller doesn't include the lead relation. This causes `undefined` values in the execution log display.

### 12. **WorkflowBuilder: "Total Executions" and "Success Rate" Stats Are Hardcoded to 0/—**
**File:** `src/pages/workflows/WorkflowBuilder.tsx` (~line 870-890)  
The quick stats cards in the builder show hardcoded `0` and `—` values instead of fetching actual workflow statistics from `workflowsApi.getAnalytics()`.

### 13. **ADD_TO_CAMPAIGN Action is Incomplete**
**File:** `backend/src/services/workflow.service.ts` (~line 1140)  
The `ADD_TO_CAMPAIGN` action handler only logs a message:
```ts
case 'ADD_TO_CAMPAIGN':
  logger.info(`Adding lead ${leadId} to campaign ${action.config.campaignId}`);
  break;
```
It doesn't actually add the lead to any campaign.

### 14. **Stats Label Mismatch in AutomationRules**
**File:** `src/pages/workflows/AutomationRules.tsx` (~line 625)  
The "Executions Today" stat card actually shows `stats.totalExecutions` (all-time total), not today's count. The label is misleading.

### 15. **"Time Saved" Stat is a Rough Estimate**
**File:** `src/pages/workflows/AutomationRules.tsx` (~line 115)  
```ts
timeSaved: Math.round((statsResponse.data.successfulExecutions || 0) * 0.05)
```
Time saved is calculated as `successfulExecutions * 0.05` hours — this is a completely arbitrary estimate with no basis in actual timing data.

---

## LOW PRIORITY ISSUES (P3)

### 16. **WorkflowComponentLibrary: Duplicate ID Between Trigger and Condition**
**File:** `src/components/workflows/WorkflowComponentLibrary.tsx`  
Both triggers and conditions have an item with `id: 'email-opened'`. If the system ever uses component IDs as keys, this could cause React key conflicts.

### 17. **Delay Config in Templates Uses Seconds, Config Panel Uses Minutes/Hours**
**File:** `src/pages/workflows/WorkflowBuilder.tsx` (templates section)  
Template nodes define delays as `config: { duration: 3600 }` (seconds), but the `NodeConfigPanel` delay config expects `{ duration: 1, unit: 'hours' }`. The templates will produce nodes with mismatched config format.

### 18. **AutomationRules: Missing `logger` Import**
**File:** `src/pages/workflows/AutomationRules.tsx`  
Uses `logger.error(...)` in catch blocks (lines ~158, 172, 180) but `logger` is imported from `@/lib/logger` at line 1. This is actually fine — just noting it's a top-level import.

### 19. **NodeConfigPanel: Node Label is Read-Only**
**File:** `src/components/workflows/NodeConfigPanel.tsx` (~line 600)  
The "Node Label" input is disabled (`disabled className="bg-muted"`). Users cannot rename nodes from the config panel; they need to understand this is by design.

### 20. **WorkflowNode: Using Emoji for Edit/Delete Buttons**
**File:** `src/components/workflows/WorkflowNode.tsx` (~line 135-145)  
Uses emoji characters (✏️ and 🗑️) instead of proper icon components for edit and delete buttons. This is inconsistent with the rest of the UI which uses Lucide icons.

### 21. **Workflow Recovery: No orgId Filter on RUNNING Executions**
**File:** `backend/src/services/workflow.service.ts` (`recoverDelayedWorkflowActions`)  
The recovery function queries all RUNNING executions globally (`take: 200`) without filtering by organization. In a multi-tenant system, this could cause one tenant's recovery to affect another's if execution IDs somehow collide (unlikely but worth noting).

### 22. **Delayed Action Scheduling Uses setTimeout — Server Restart Loses Them**
**File:** `backend/src/services/workflow.service.ts` (`scheduleDelayedActions`)  
Delayed actions use `setTimeout` which is lost on server restart. The `recoverDelayedWorkflowActions` function exists to handle this, but there's a window where delayed actions can be missed between the delay persisting to metadata and the recovery cron running (every 5 minutes according to server.ts).

---

## Architecture & Security Assessment

### ✅ What's Done Well

| Area | Details |
|------|---------|
| **Multi-tenant isolation** | Every controller query filters by `organizationId` from `req.user`. Both read and write operations check ownership. |
| **Input validation** | Zod schemas validate all create/update/toggle/test operations. Query params are also validated. |
| **Rate limiting** | Manual trigger and trigger-for-lead endpoints have rate limiting via `workflowTriggerLimiter`. |
| **Plan enforcement** | Workflow creation enforces plan limits via `enforcePlanLimit('workflows')`. |
| **Per-step execution logging** | Full step-by-step execution tracking with `WorkflowExecutionStep` model. |
| **Action retry with backoff** | Configurable 1-3 retries with exponential backoff (1s, 3s, 9s). |
| **Failure notifications** | On final failure, creates in-app Notification records + pushes real-time WebSocket events. |
| **Delayed action recovery** | `recoverDelayedWorkflowActions` reschedules lost delayed actions on server restart. |
| **Dry-run test mode** | `testWorkflow` validates actions without sending real emails/SMS. |
| **XSS protection** | `NodeConfigPanel` uses `DOMPurify.sanitize()` for email HTML preview. |
| **WebSocket events** | Real-time workflow completion/progress events pushed to organization members. |
| **Webhook triggers** | Secure webhook keys auto-generated, with proper validation. |

### Potential Improvements

| Area | Suggestion |
|------|-----------|
| **Webhook URL validation** | The WEBHOOK action `fetch()` call doesn't validate the URL against SSRF attacks. Consider restricting to external URLs, blocking private/localhost ranges. |
| **No execution concurrency limit** | Multiple rapid triggers could queue hundreds of executions. Consider adding per-workflow rate limiting. |
| **No audit logging** | Workflow create/edit/delete/toggle operations are not logged for audit trail purposes. |

---

## File Inventory

### Frontend (7 files)

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/workflows/WorkflowsList.tsx` | 799 | Main workflows dashboard with stats, list/grid view |
| `src/pages/workflows/WorkflowBuilder.tsx` | 1479 | Visual workflow builder (has merge conflicts) |
| `src/pages/workflows/AutomationRules.tsx` | 1065 | Simplified rule creation with templates |
| `src/components/workflows/WorkflowCanvas.tsx` | 568 | 2D canvas with zoom, pan, mini-map |
| `src/components/workflows/WorkflowNode.tsx` | 166 | Individual node rendering |
| `src/components/workflows/WorkflowComponentLibrary.tsx` | 331 | Drag-and-drop component library |
| `src/components/workflows/NodeConfigPanel.tsx` | 645 | Node configuration with type-specific forms |

### Backend (7 files)

| File | Lines | Purpose |
|------|-------|---------|
| `backend/src/controllers/workflow.controller.ts` | 449 | Express route handlers |
| `backend/src/services/workflow.service.ts` | 1453 | Core execution engine |
| `backend/src/services/workflowExecutor.service.ts` | 565 | Background queue manager |
| `backend/src/services/workflow-trigger.service.ts` | 233 | Event detection service |
| `backend/src/jobs/workflowProcessor.ts` | 215 | Periodic job processor |
| `backend/src/routes/workflow.routes.ts` | 139 | Route definitions |
| `backend/src/validators/workflow.validator.ts` | 66 | Zod validation schemas |

### Database (3 models)

| Model | Fields | Purpose |
|-------|--------|---------|
| `Workflow` | 15+ fields | Workflow definitions with trigger, actions, stats |
| `WorkflowExecution` | 8 fields | Individual execution tracking |
| `WorkflowExecutionStep` | 13 fields | Per-step execution detail |

### Routes (10 endpoints)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/workflows/stats` | Get workflow statistics |
| GET | `/api/workflows` | List workflows (with filters) |
| GET | `/api/workflows/:id` | Get single workflow |
| POST | `/api/workflows` | Create workflow |
| PUT | `/api/workflows/:id` | Update workflow |
| DELETE | `/api/workflows/:id` | Delete workflow |
| PATCH | `/api/workflows/:id/toggle` | Toggle active state |
| POST | `/api/workflows/:id/test` | Test workflow (dry run) |
| GET | `/api/workflows/:id/executions` | Get execution history |
| GET | `/api/workflows/:id/analytics` | Get analytics data |
| POST | `/api/workflows/:id/trigger` | Manual trigger |
| POST | `/api/workflows/trigger-for-lead` | Trigger for lead event |

---

## Summary of Issues by Priority

| Priority | Count | Key Items |
|----------|-------|-----------|
| **P0 Critical** | 2 | Merge conflicts in WorkflowBuilder; WEBHOOK missing from validator |
| **P1 High** | 4 | Save uses wrong action type; fragile triggerType derivation; static recent executions; stale trigger list |
| **P2 Medium** | 9 | Missing steps/lead includes; hardcoded stats; incomplete ADD_TO_CAMPAIGN; overlapping UI elements |
| **P3 Low** | 7 | Duplicate IDs; emoji buttons; delay config mismatch; read-only labels |
| **Total** | **22** | |
