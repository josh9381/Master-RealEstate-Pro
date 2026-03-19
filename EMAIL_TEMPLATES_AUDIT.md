# Email Templates Library — User Focus & UI Audit

**Date:** March 18, 2026  
**Page:** `/communication/templates` → `EmailTemplatesLibrary.tsx`  
**Status:** 🔴 CRITICAL issues preventing basic functionality

---

## Summary

The Email Templates Library page has a **show-stopping data-loading bug** that prevents any templates from ever rendering in the UI. Beyond that, there are significant UX gaps vs. the backend capabilities, accessibility deficiencies, and several polish issues.

| Severity | Count |
|----------|-------|
| 🔴 Critical (blocks core functionality) | 2 |
| 🟠 Major (degrades user experience significantly) | 6 |
| 🟡 Minor (polish / nice-to-have) | 8 |

---

## 🔴 CRITICAL Issues

### C1. Templates Never Load — API Response Shape Mismatch
**File:** `src/pages/communication/EmailTemplatesLibrary.tsx` line 40-46  
**Impact:** Templates will **always** show as empty even when data exists in the database.

The backend returns a nested response:
```json
{ "success": true, "data": { "templates": [...], "pagination": {...} } }
```

But the frontend query does:
```ts
const response = await templatesApi.getEmailTemplates()
return (response && Array.isArray(response)) ? response : []
```

Since `response` is an object (not an array), it **always** falls back to `[]`.

**Fix:** Extract the nested data, matching the pattern used by the SMS template page:
```ts
const response = await templatesApi.getEmailTemplates()
return response?.data?.templates || response?.templates || (Array.isArray(response) ? response : [])
```

---

### C2. "Compose" Button Copies Raw Block JSON, Not Rendered HTML
**File:** `src/pages/communication/EmailTemplatesLibrary.tsx` lines 297-300, 326-329  
**Impact:** When the user clicks "Compose," the raw serialized block editor JSON is copied to the clipboard (not HTML), and then they're navigated to the inbox. The clipboard content is unusable.

```ts
onClick={() => {
  navigator.clipboard.writeText(template.body)  // copies raw JSON
  navigate('/communication/inbox')
}}
```

**Fix:** Either:
- Compile the block JSON to HTML before copying, or
- Pass the template ID via route state/query param so the inbox can fetch and render it, or
- Use the backend `compileEmail` endpoint to get rendered HTML first.

---

## 🟠 MAJOR Issues

### M1. No Search Bar Exposed
**Backend supports:** `search` parameter that searches `name` and `subject` fields.  
**Frontend:** No search input anywhere on the page.  
**Impact:** Users with many templates cannot find what they need without scrolling through category filters.

**Fix:** Add a search input in the header or above the template library card.

---

### M2. No Pagination Controls
**Backend supports:** `page`, `limit`, `total`, `pages` in the response.  
**Frontend:** Fetches all templates in a single request with no page controls.  
**Impact:** As template libraries grow, the page will load all templates at once with no way to navigate through pages.

**Fix:** Add pagination controls (or infinite scroll) and pass `page`/`limit` params to the API.

---

### M3. Duplicate Template Feature Missing from UI
**Backend supports:** `POST /api/email-templates/:id/duplicate` endpoint is fully implemented.  
**Frontend API layer:** No `duplicateEmailTemplate` method in `templatesApi`.  
**UI:** No duplicate button on template cards.  
**Impact:** Users must manually recreate templates they want to duplicate, a time waste.

**Fix:** Add a duplicate button to the template card action row and wire it to the backend endpoint.

---

### M4. Delete Confirmation Doesn't Show Template Name
**File:** `src/pages/communication/EmailTemplatesLibrary.tsx` lines 452-470  
**Impact:** The delete modal says "Are you sure you want to delete this template?" without identifying _which_ template. Users can accidentally delete the wrong template.

**Fix:** Look up the template name from `showDeleteConfirm` (which holds the ID) and display it:
```
Are you sure you want to delete "Monthly Newsletter"? This action cannot be undone.
```

---

### M5. No Loading/Disabled State on Delete Action
**Impact:** When the delete API call is in progress, the Delete button remains clickable, allowing double-clicks and repeated requests.

**Fix:** Add a `deleting` state and disable the button during deletion.

---

### M6. Modals Lack Escape Key Handling
**File:** All three modals (Create/Edit, Preview, Delete) — lines 356, 421, 452  
**Impact:** Users cannot press Escape to dismiss modals, a fundamental UX expectation.

**Fix:** Add `onKeyDown` handler on the modal overlay to close on Escape key.

---

## 🟡 MINOR Issues

### m1. `thumbnail` Property Doesn't Exist on EmailTemplate Type
**File:** Lines 276, 312 reference `template.thumbnail` but neither the `EmailTemplate` TypeScript interface nor the Prisma `EmailTemplate` model have a `thumbnail` field.  
**Impact:** TypeScript will flag this as a type error. Always falls back to `'📧'`.  
**Fix:** Remove `template.thumbnail ||` references or add the field.

---

### m2. Stats Cards Redundant Computation on Every Render
**File:** Lines 186-197 (Most Used), 208-209 (Last Updated)  
**Impact:** The `[...templates].sort(...)` is called twice inline in JSX. On large datasets this is wasteful and hard to read.  
**Fix:** Compute `mostUsedTemplate` and `lastUpdatedTemplate` as `useMemo` values.

---

### m3. "Last Updated" Stat Card Uses Wrong Icon
**File:** Line 202 — uses `<Mail>` icon for "Last Updated"  
**Impact:** The mail icon doesn't convey "last updated" — a clock or calendar icon would be more intuitive.  
**Fix:** Use `Clock` or `Calendar` from lucide-react.

---

### m4. Category Filter Badges Not Keyboard-Accessible
**File:** Lines 227-237  
**Impact:** Badge elements with `onClick` are not focusable via Tab and not operable via Enter/Space. Screen reader users and keyboard-only users cannot filter by category.  
**Fix:** Use `<button>` elements styled as badges, or add `tabIndex={0}` and `onKeyDown` handlers.

---

### m5. No Active/Inactive Toggle in UI
**Backend supports:** `isActive` field with filtering.  
**Frontend:** No way to toggle a template active/inactive or filter by status.  
**Impact:** Users cannot retire templates without deleting them.  
**Fix:** Add an active/inactive toggle to template cards and an optional status filter.

---

### m6. Category Select in Create/Edit Modal Uses Unstyled Native `<select>`
**File:** Line 382-391  
**Impact:** The native `<select>` looks inconsistent with the rest of the UI which uses custom-styled components.  
**Fix:** Use a styled Select component consistent with the design system.

---

### m7. No Unsaved Changes Warning on Modal Close
**Impact:** If a user is mid-edit and clicks Cancel or the X button, their work is silently discarded.  
**Fix:** Check if form fields have been modified; if so, show a "Discard changes?" confirmation.

---

### m8. `renderTextContent` Has Weaker Sanitization Than DOMPurify
**File:** `EmailBlockEditor.tsx` ~line 785-800  
**Impact:** The `renderTextContent` function does custom regex-based sanitization instead of using DOMPurify (which is already imported in the template library page). While it strips `<script>` and `<iframe>`, regex-based sanitization is known to be bypassable.  
**Fix:** Use DOMPurify for HTML content sanitization in block previews as well.

---

## Feature Gap Analysis

| Feature | Backend | Frontend | Gap |
|---------|---------|----------|-----|
| List templates | ✅ | ❌ (broken parsing) | **Critical** |
| Create template | ✅ | ✅ | — |
| Edit template | ✅ | ✅ | — |
| Delete template | ✅ | ✅ (no name shown) | Minor |
| Duplicate template | ✅ | ❌ Not wired | **Major** |
| Search (name/subject) | ✅ | ❌ No search bar | **Major** |
| Pagination | ✅ | ❌ No controls | **Major** |
| Category filter | ✅ | ✅ | — |
| Active/inactive filter | ✅ | ❌ | Minor |
| Sort (name, date, usage) | ✅ | ❌ No sort controls | Minor |
| Template variables | ✅ | ✅ (in block editor) | — |
| Block-based editor | ✅ | ✅ | — |
| MJML compilation | ✅ | ✅ (in preview) | — |
| AI template generation | ✅ | ❌ Not exposed | Minor |
| Usage tracking | ✅ (usageCount) | ✅ (display only) | — |

---

## Recommended Fix Priority

1. **C1** — Fix API response parsing (templates cannot even display)
2. **C2** — Fix Compose button to use rendered HTML or pass template ID
3. **M4** — Show template name in delete confirmation
4. **M1** — Add search bar
5. **M3** — Add duplicate button + API method
6. **M2** — Add pagination controls
7. **M5** — Add loading state to delete
8. **M6** — Add Escape key to modals
9. **m1–m8** — Remaining polish items

---

## Files Audited

| File | Purpose |
|------|---------|
| `src/pages/communication/EmailTemplatesLibrary.tsx` | Main page component (480 lines) |
| `src/components/email/EmailBlockEditor.tsx` | Block-based email editor (~800 lines) |
| `src/components/email/EmailPreviewFrame.tsx` | Email preview iframe |
| `src/lib/emailBlocks.ts` | Block types, serialization, MJML utilities |
| `src/lib/api.ts` (lines 1449-1505) | `templatesApi` HTTP layer |
| `src/types/index.ts` (lines 269-281) | `EmailTemplate` interface |
| `backend/src/routes/email-template.routes.ts` | Express routes |
| `backend/src/controllers/email-template.controller.ts` | CRUD + duplicate controllers |
| `backend/src/validators/email-template.validator.ts` | Zod validation schemas |
| `backend/src/services/template.service.ts` | Template rendering service |
| `backend/prisma/schema.prisma` | `EmailTemplate` model |
