# Dashboard User-Focused Audit

**Date:** March 10, 2026
**Scope:** Full interactive audit of `/dashboard` — every widget, button, API call, chart, and data flow tested.

---

## Fix Now (15) — Frontend-only, existing code corrections

| # | Issue | Severity | What It Takes |
|---|-------|----------|--------------|
| 1 | **Task un-complete sends lowercase `'pending'`** | High | Change to `'PENDING'` — API rejects lowercase with validation error |
| 2 | **Appointment times show "TBD"** | High | Change `apt.scheduledAt` → `apt.startTime` — field name mismatch with API |
| 3 | **Appointment lead names missing** | Medium | Change `apt.lead?.name` → `apt.lead?.firstName + lastName` — API returns split names |
| 4 | **`hasCampaignResults` always false** | Low | Fix nesting: `campaigns?.performance?.totalSent` instead of `campaigns?.totalSent` |
| 5 | **Quick stats show fake `+0%` badges** | Medium | Remove the hardcoded `+0%` / `+0` values — they mislead users |
| 6 | **Revenue chart 1,068x scale problem** | High | Limit display to last 6 months to match subtitle and avoid Feb spike flattening everything |
| 7 | **Revenue subtitle says "6-month" shows 13** | Low | Fix text or slice data to 6 months — either way 1 line |
| 8 | **Conversion funnel rates confusing** | Low | Add clarifying label ("stage-to-stage") so users don't misread 100% |
| 9 | **Pie chart: 5 colors for 27 sources** | Medium | Aggregate to top 5 + "Other" bucket so the chart is readable |
| 10 | **Campaign Performance chart all zeros** | Medium | Remove misleading zero Opens/Clicks bars — only show data that exists |
| 11 | **Revenue Y-axis no currency format** | Low | Add `tickFormatter` to format as `$82K`, `$11.4M` |
| 12 | **Revenue "leads" label is actually deals** | Low | Change dataKey label from "leads" to "deals" |
| 13 | **Activities not clickable to lead** | Medium | Preserve `leadId` in transform, add `onClick` → `/leads/:id` (route exists) |
| 14 | **Export menu no keyboard nav** | Low | Add `onKeyDown` / Escape handlers to dropdown |
| 15 | **Missing ARIA attributes** | Low | Add `aria-label` to charts, alerts section, export menu |

---

## Need New Features / Backend / Other System Parts (7)

| # | Issue | Severity | Why It Can't Be Fixed In Dashboard Alone |
|---|-------|----------|------------------------------------------|
| 16 | **Filters do nothing** | High | Backend `/analytics/dashboard` ignores `source`/`status`/`priority` params — needs new query logic in the analytics controller |
| 17 | **Filter options don't match real data** | Medium | Need a new API call to return distinct lead sources from DB, or backend filter support to match actual source values |
| 18 | **Stats card "change" values misleading** | Medium | Showing real `+12 vs last month` requires backend to compute previous-period totals — no such data exists in the API today |
| 19 | **Tasks not clickable to detail** | Low | No `/tasks/:id` detail view exists — needs a new task detail page and route |
| 20 | **Appointments link to generic calendar** | Low | Calendar page doesn't accept a date/appointment param — needs calendar page changes to support deep-linking |
| 21 | **Performance targets are arbitrary** | Low | Making them customizable per-org needs a settings/preferences backend endpoint and UI |
| 22 | **Date range ignored by most widgets** | Medium | Tasks, campaigns, revenue, alerts endpoints don't support `startDate`/`endDate` filtering — needs backend query changes in 4+ controllers |

---

## What Works Well

- **Navigation routing** — All 9 Quick Action / View All links route correctly
- **Loading skeletons** — Every section has animated placeholder states
- **Error states** — Every section handles API failures with Retry buttons
- **Task completion (forward)** — POST to mark tasks complete works correctly
- **Refresh button** — Re-fetches all 9 data sources simultaneously
- **Export CSV/PDF** — Well-structured export with proper data assembly
- **Responsive layout** — Grid adapts from 1-col to 4-col across breakpoints
- **Dark mode support** — Alert colors have both light and dark variants
- **Help tooltips** — Stats cards and conversion funnel have contextual help
