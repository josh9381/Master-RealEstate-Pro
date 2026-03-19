# Schedule, Calendar & Tasks — Full Audit

**Date:** 2026-03-17  
**Scope:** Campaigns > Schedule tab, Calendar page, Tasks page, LeadTasks component, and all supporting backend APIs  

---

## Executive Summary

| Area | Status | Critical Issues |
|------|--------|-----------------|
| Campaigns > Schedule | ✅ Working | 0 critical, 2 minor |
| Calendar Page | 🔴 BROKEN | 2 critical, 3 moderate |
| Tasks Page | ✅ Working | 0 critical, 2 minor |
| Backend Task API | ✅ Working | 0 critical, 1 minor |
| Backend Appointment API | ⚠️ Partial | 1 critical, 2 moderate |
| Campaign Scheduler Service | ✅ Working | 0 critical |

**Total Issues Found: 13** (3 Critical, 5 Moderate, 5 Minor)

---

## CRITICAL ISSUES

### CRIT-1: Frontend↔Backend Appointment Field Name Mismatch (Calendar BROKEN)

**Files:** `src/lib/api.ts` (L1793-1807), `backend/src/validators/appointment.validator.ts` (L4-37), `src/pages/calendar/CalendarPage.tsx` (L253-264)

The frontend `CreateAppointmentData` interface sends:
- `scheduledAt` (single datetime string)
- `duration` (number of minutes)

The backend `createAppointmentSchema` validator expects:
- `startTime` (ISO datetime string) — **required**
- `endTime` (ISO datetime string) — **required**

**Result:** Every appointment creation from the Calendar page **will fail** with validation error:
```json
{
  "error": "Validation error",
  "details": [
    { "path": "startTime", "message": "Invalid input: expected string, received undefined" },
    { "path": "endTime", "message": "Invalid input: expected string, received undefined" }
  ]
}
```

**Confirmed via live API test.** The backend also does NOT compute `endTime` from `duration` — it's a required field.

Similarly, when **reading** appointments, the backend returns `startTime`/`endTime` but the frontend CalendarPage maps from `scheduledAt` (line 122):
```ts
const date = new Date(appt.scheduledAt || appt.date || appt.startTime || new Date())
```
This falls back to `startTime` but the explicit preference for `scheduledAt` (which doesn't exist) means the code is fragile and the defensive fallback masks the mismatch.

**Fix:** Either update the frontend to send `startTime`/`endTime` or add a backend middleware/adapter that converts `scheduledAt` + `duration` → `startTime` + `endTime`.

---

### CRIT-2: Frontend↔Backend Appointment Type Enum Mismatch

**Files:** `src/pages/calendar/CalendarPage.tsx` (L23-30), `backend/prisma/schema.prisma` (L1317-1322), `backend/src/validators/appointment.validator.ts` (L7)

Frontend sends **lowercase** types: `meeting`, `viewing`, `consultation`, `inspection`, `follow_up`, `other`

Backend Prisma enum `AppointmentType` / validator expects **uppercase**: `CALL`, `MEETING`, `DEMO`, `CONSULTATION`, `FOLLOW_UP`

**Mismatched types:**
| Frontend | Backend | Status |
|----------|---------|--------|
| `meeting` | `MEETING` | Case mismatch — will fail validation |
| `viewing` | ❌ Not in enum | **Will fail** |
| `consultation` | `CONSULTATION` | Case mismatch — will fail validation |
| `inspection` | ❌ Not in enum | **Will fail** |
| `follow_up` | `FOLLOW_UP` | Case mismatch — will fail validation |
| `other` | ❌ Not in enum | **Will fail** |
| ❌ Missing | `CALL` | Frontend can't create CALL type |
| ❌ Missing | `DEMO` | Frontend can't create DEMO type |

**Confirmed via live API test** — backend rejects lowercase `"type": "meeting"` with `"Invalid appointment type"`.

---

### CRIT-3: Backend Appointment Validator Requires Location OR MeetingUrl

**File:** `backend/src/validators/appointment.validator.ts` (L28-31)

```ts
.refine(
  (data) => data.location || data.meetingUrl,
  { message: 'Either location or meeting URL is required', path: ['location'] }
)
```

The frontend form has `location` as optional and does **not** have a `meetingUrl` field at all. If a user creates an event without entering a location, it will fail validation even if all other fields are correct. A simple "Team standup" meeting with no location or URL should be permitted.

---

## MODERATE ISSUES

### MOD-1: Calendar Page — Upcoming Events Not Sorted

**File:** `src/pages/calendar/CalendarPage.tsx` (L598)

```tsx
{events.slice(0, 5).map(event => (
```

The events list is not sorted before slicing. Events are ordered as returned by the API (by `startTime asc`), but since the API returns all events for the month, the first 5 events may be in the past. This should filter to only future events and sort by date.

---

### MOD-2: Calendar — Week View Missing Key Prop on Fragment

**File:** `src/pages/calendar/CalendarPage.tsx` (L478-479)

```tsx
{HOURS.map(hour => (
  <>
```

The `<>` (Fragment) inside the `.map()` is missing a `key` prop. React will emit a warning. Should use `<React.Fragment key={hour}>` instead.

---

### MOD-3: Task Page — Stats Cards Count from Current Page Only

**File:** `src/pages/tasks/TasksPage.tsx` (L362-377)

```tsx
<div className="text-2xl font-bold">{tasks.filter(t => !t.completed).length}</div>
<div className="text-sm text-muted-foreground">Active Tasks</div>
```

The stats cards (Active Tasks, Due Today, High Priority, Completed) count from `tasks` which is the **current page** data, not all tasks. With pagination (page size 20), these numbers are misleading. Should use the `/api/tasks/stats` endpoint instead for accurate totals.

---

### MOD-4: Task Page — Double Filtering (Server + Client)

**File:** `src/pages/tasks/TasksPage.tsx` (L85-95, L277-286)

The `filter` state is sent to the server API (e.g., `status: 'COMPLETED'`), but then `filteredTasks` also applies the same filter client-side:
```tsx
if (filter === 'completed' && !task.completed) return false
```
This means server-filtered results are re-filtered on the client. While not causing bugs currently, it's redundant and could cause confusion if the server filter behavior changes. The `priorityFilter` and `assigneeFilter` are client-only additional filters which don't match server params, creating an inconsistent filtering model.

---

### MOD-5: Calendar — `UpdateAppointmentData` Doesn't Send `startTime`/`endTime`

**File:** `src/pages/calendar/CalendarPage.tsx` (L271-279)

```tsx
const updateData: UpdateAppointmentData = {
  title: eventForm.title.trim(),
  description: eventForm.description.trim() || undefined,
  type: eventForm.type,
  scheduledAt,
  duration: eventForm.duration,
  location: eventForm.location.trim() || undefined,
}
```

Same mismatch as CRIT-1 for updates — sends `scheduledAt`/`duration` but backend expects `startTime`/`endTime`.

---

## MINOR ISSUES

### MIN-1: Campaign Schedule — `isLoading` State Used for Button Disable During Reschedule

**File:** `src/pages/campaigns/CampaignSchedule.tsx` (L498-503)

The reschedule modal's "Confirm Reschedule" button uses `isLoading` (from `useQuery`) rather than a dedicated mutation loading state. Since `isLoading` is the query's fetching state, it may not accurately reflect when the reschedule API call is in progress. The reschedule uses a raw `await campaignsApi.rescheduleCampaign()` call (not a mutation), so there is no dedicated loading state.

---

### MIN-2: Campaign Schedule — Recurring Campaign `scheduledDate` Mapping Issue

**File:** `src/pages/campaigns/CampaignSchedule.tsx` (L369-373)

```tsx
<p className="text-xs text-muted-foreground mt-1">
  Next send: {new Date(schedule.scheduledDate || schedule.createdAt)...}
</p>
```

For recurring campaigns, `scheduledDate` is a display-formatted string (e.g., `"Mar 17, 2026"`) created at line 77, not an ISO date. Passing a formatted date string to `new Date()` can produce unreliable results depending on browser locale. Should use the original `startDate` or `nextSendAt` field from the raw API data instead.

---

### MIN-3: Task Creation — `assignedToId` Required by Backend But Optional in Frontend

**File:** `backend/src/validators/task.validator.ts` (L18), `src/pages/tasks/TasksPage.tsx` (L246-253)

Backend validator:
```ts
assignedToId: z.string().min(1, 'Assigned user ID is required'),
```

Frontend sends `assignedToId: taskForm.assignedToId || undefined`. If user doesn't pick an assignee, `undefined` is sent which will fail the backend's `min(1)` validation. The controller then also does a `.findFirst()` for the assigned user which would fail on empty string.

---

### MIN-4: Tasks Page — Duplicate `pageSize` Reset Logic

**File:** `src/pages/tasks/TasksPage.tsx` (L560)

```tsx
onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
```

Changing page size sets page to 1. But `handleFilterChange` also sets page to 1. If both change simultaneously (user changes filter and page size), there are two separate state updates. Minor — React batches these, so it's not a bug, just duplicated reset logic.

---

### MIN-5: Calendar Page — No Cancelled Events Filter

**File:** `src/pages/calendar/CalendarPage.tsx` (L116-130)

The calendar fetches all appointments for the month without filtering out cancelled ones. Cancelled appointments will appear on the calendar display alongside active ones with no visual distinction. The backend `getCalendarView` endpoint (`GET /api/appointments/calendar`) filters out cancelled events, but the page uses `getAppointments` (the generic list endpoint) instead.

---

## ARCHITECTURE OVERVIEW

### File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/campaigns/CampaignSchedule.tsx` | ~600 | Campaign schedule tab — lists upcoming, recurring, recently sent |
| `src/pages/calendar/CalendarPage.tsx` | ~720 | Full calendar with month/week/day views |
| `src/pages/tasks/TasksPage.tsx` | ~690 | Task list with CRUD, pagination, filtering |
| `src/components/leads/LeadTasks.tsx` | ~150 | Per-lead task list inline component |
| `src/components/campaigns/CampaignsSubNav.tsx` | ~100 | Campaign section sub-navigation |
| `src/lib/api.ts` (appointments section) | ~80 | Frontend API client for appointments |
| `src/lib/api.ts` (tasks section) | ~60 | Frontend API client for tasks |
| `backend/src/controllers/task.controller.ts` | ~430 | Task CRUD + stats controller |
| `backend/src/controllers/appointment.controller.ts` | ~610 | Appointment CRUD + calendar + ICS export |
| `backend/src/routes/task.routes.ts` | ~110 | Task REST routes |
| `backend/src/routes/appointment.routes.ts` | ~100 | Appointment REST routes |
| `backend/src/validators/task.validator.ts` | ~70 | Zod validation for tasks |
| `backend/src/validators/appointment.validator.ts` | ~100 | Zod validation for appointments |
| `backend/src/services/campaign-scheduler.service.ts` | ~390 | Cron-based campaign execution |
| `backend/src/services/reminder.service.ts` | ~180 | Appointment reminder service |
| `backend/prisma/schema.prisma` (Task model) | ~20 | Task data model |
| `backend/prisma/schema.prisma` (Appointment model) | ~20 | Appointment data model |

### Data Flow

```
Campaign Schedule Page
  └─ campaignsApi.getCampaigns({ status: 'SCHEDULED,PAUSED' })
  └─ campaignsApi.getCampaigns({ status: 'COMPLETED' })
  └─ campaignsApi.rescheduleCampaign(id, date)
  └─ campaignsApi.sendCampaignNow(id)
  └─ campaignsApi.pauseCampaign(id)
  └─ campaignsApi.updateCampaign(id, { status: 'CANCELLED' })

Calendar Page
  └─ appointmentsApi.getAppointments({ startDate, endDate })  ← Should use getCalendar()
  └─ appointmentsApi.createAppointment(data)                   ← BROKEN: field mismatch
  └─ appointmentsApi.updateAppointment(id, data)               ← BROKEN: field mismatch
  └─ appointmentsApi.cancelAppointment(id)
  └─ appointmentsApi.exportICS(id)

Tasks Page
  └─ tasksApi.getTasks({ status, page, limit })
  └─ tasksApi.createTask(data)
  └─ tasksApi.updateTask(id, data)
  └─ tasksApi.completeTask(id)
  └─ tasksApi.deleteTask(id)
  └─ usersApi.getTeamMembers()

Backend Cron Jobs
  └─ checkAndExecuteScheduledCampaigns()  ← every minute
  └─ sendUpcomingReminders()              ← every minute
```

### Security Assessment

| Check | Status |
|-------|--------|
| Authentication on all routes | ✅ All routes use `authenticate` middleware |
| Organization-scoped data access | ✅ All queries filter by `organizationId` |
| User ownership checks (appointments) | ✅ `userId` check on get/update/cancel |
| Role-based task filtering | ✅ Uses `getRoleFilterFromRequest()` |
| Input validation | ✅ Zod schemas on all routes |
| SQL injection prevention | ✅ Prisma ORM parameterization |
| Rate limiting (task creation) | ✅ `sensitiveLimiter` on POST |
| XSS in ICS export | ✅ `escapeICSText()` sanitizes output |
| Optimistic concurrency (scheduler) | ✅ Uses `updatedAt` for campaign claim |

### What Works Well

1. **Campaign Schedule Page** — Clean UI with scheduled, recurring, and recently sent sections. Data loaded server-side with proper filtering. Reschedule modal validates future dates. Confirmation dialogs for destructive actions.

2. **Task Backend** — Comprehensive CRUD with pagination, search, sorting, overdue detection, role-based filtering, real-time WebSocket updates (`pushTaskUpdate`), activity logging.

3. **Task Frontend** — Nice UX with proper pagination, multiple filter modes, empty states, loading skeletons, error banners, inline edit/complete/delete.

4. **Campaign Scheduler Service** — Robust with optimistic concurrency control, recurring campaign support (daily/weekly/monthly), deferred send-time optimization, A/B test auto-winner evaluation.

5. **Appointment Reminder Service** — Multi-channel (email + SMS), respects `reminderSent` flag to avoid duplicates, 24-hour window processing.

6. **ICS Export** — Proper iCalendar format with VALARM, attendees, organizer, status mapping.

---

## Recommended Fix Priority

| Priority | Issue | Effort |
|----------|-------|--------|
| 🔴 P0 | CRIT-1: Fix `scheduledAt`/`duration` → `startTime`/`endTime` mapping | Medium |
| 🔴 P0 | CRIT-2: Align appointment type enums (frontend ↔ backend) | Small |
| 🔴 P0 | CRIT-3: Make location/meetingUrl optional or add meetingUrl to frontend | Small |
| 🟡 P1 | MOD-3: Use `/api/tasks/stats` for TasksPage stat cards | Small |
| 🟡 P1 | MOD-5: Calendar update also sends wrong fields | Small (fix with CRIT-1) |
| 🟡 P1 | MIN-3: Make `assignedToId` optional in backend or required in frontend | Small |
| 🟡 P1 | MIN-5: Use `getCalendar()` endpoint or filter cancelled events | Small |
| 🟢 P2 | MOD-1: Sort/filter upcoming events to future only | Small |
| 🟢 P2 | MOD-2: Add key prop to Fragment in week view | Trivial |
| 🟢 P2 | MOD-4: Remove redundant client-side filtering | Small |
| 🟢 P2 | MIN-1: Add mutation loading state for reschedule | Small |
| 🟢 P2 | MIN-2: Use raw ISO date for recurring display | Small |
| 🟢 P3 | MIN-4: Consolidate page reset logic | Trivial |
