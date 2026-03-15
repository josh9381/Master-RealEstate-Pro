# E2E Test Suite Audit — Phase 13.19

**Date:** 2025-01-24  
**Suite:** 15 Playwright spec files, 103 tests total  
**Config:** `e2e/playwright.config.ts` — Chromium only, `retries: 2`, `screenshot: only-on-failure`, `trace: on-first-retry`

---

## Summary

| Category | Files | Tests | Notes |
|----------|-------|-------|-------|
| **Functional** | 1 | 7 | 01-auth |
| **Mixed (has real interactions)** | 4 | 27 | 04-leads, 08-communication, 09-workflows, 15-misc |
| **Smoke (navigate + screenshot)** | 10 | 69 | Everything else |
| **Total** | **15** | **103** | |

**Key Finding:** ~67% of tests are pure smoke — they navigate to a URL, call `verifyPageLoaded()` (checks body isn't empty), take a screenshot, and pass. These tests almost never fail because they have no meaningful assertions. Only `01-auth` and parts of `04-leads` / `15-misc` actually interact with the application.

---

## Per-File Assessment

### Tier 1 — Keep & Expand (Functional)

| File | Tests | Verdict |
|------|-------|---------|
| **01-auth.spec.ts** | 7 | **Keep.** Fills login/register forms, checks redirects. Add: assert error message on invalid login, assert toast on logout. |
| **04-leads.spec.ts** | 12 | **Keep.** Best functional coverage — creates leads, searches, bulk-selects, tests pipeline/kanban. Add: assert lead appears in list after creation, verify edit persistence. |
| **15-misc.spec.ts** | 5 | **Keep.** Calendar view switching, task creation + checkbox toggle are genuinely functional. Add assertions. |

### Tier 2 — Expand into Real Tests

| File | Tests | Verdict |
|------|-------|---------|
| **03-dashboard.spec.ts** | 2 | **Expand.** Has card count check. Add: assert specific widget content, verify metric values render. |
| **05-campaigns.spec.ts** | 11 | **Expand.** Create campaign fills a multi-step form — add assertion that campaign appears in list. |
| **08-communication.spec.ts** | 7 | **Expand.** Inbox/compose has real clicks. Add: assert compose modal opens, send test message. |
| **09-workflows.spec.ts** | 3 | **Expand.** Checks ReactFlow canvas presence. Add: drag a node, verify connection. |
| **13-help.spec.ts** | 4 | **Expand.** Fills search input. Add: assert search results, assert ticket form validation. |

### Tier 3 — Keep as Smoke (Low Priority)

| File | Tests | Verdict |
|------|-------|---------|
| **02-navigation.spec.ts** | 8 | **Keep as-is.** Navigation smoke tests have value for detecting broken routes. Remove silent fallbacks — tests should fail when elements aren't found. |
| **10-settings.spec.ts** | 14 | **Keep as-is.** 14 settings pages verified to load. Low priority for functional expansion. |
| **11-admin.spec.ts** | 9 | **Keep as-is.** Admin page smoke tests. |
| **12-billing.spec.ts** | 5 | **Keep as-is.** Billing page smoke tests. |

### Tier 4 — Low Value, Consider Removing

| File | Tests | Verdict |
|------|-------|---------|
| **06-ai-hub.spec.ts** | 7 | **Low value.** Many routes likely don't exist (`/ai/segmentation`, `/ai/predictive`, etc.). Tests pass because `verifyPageLoaded()` accepts any non-empty body. |
| **07-analytics.spec.ts** | 7 | **Low value.** Same issue — suspect routes, no assertions. |
| **14-integrations.spec.ts** | 2 | **Low value.** Only 2 smoke tests. Barely covers anything. |

---

## Cross-Cutting Issues

### 1. Silent Failures (Critical)
Most specs wrap interactions in `if (await element.isVisible()) { click } else { console.log('not found') }`. This means tests **pass even when the UI is broken**. Recommendation: Remove defensive wrappers — let tests fail when expected elements are missing.

### 2. No `expect()` Assertions
~70% of tests have zero `expect()` calls. They navigate, click, screenshot, and pass. Recommendation: Add at least one meaningful assertion per test.

### 3. Suspect Routes
Many specs navigate to routes that may not exist as distinct pages (e.g., `/leads/merge`, `/ai/training`, `/analytics/report-builder`). The SPA shell renders without error, so smoke tests pass. Recommendation: Verify routes exist before keeping their tests.

### 4. Screenshot-Only Verification
Screenshots are captured but never compared (no visual regression baseline). They serve as debugging aids only.

---

## Recommended Priority Actions

1. **Remove defensive `if/else` wrappers** in all specs — tests should fail on missing elements
2. **Add `expect()` assertions** to Tier 1 and Tier 2 specs (auth, leads, dashboard, campaigns, misc)
3. **Verify suspect routes exist** — remove tests for non-existent pages
4. **Keep all smoke tests** for now — they catch broken imports/routing at minimal cost
5. **Do not rewrite** — incremental improvement is more practical than a full rewrite
