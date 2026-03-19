# Communications Hub — Full Audit (March 2025)

## Overview

**Total Files Audited:** 30+  
**Total Lines of Code:** ~7,987 across communication-specific files  
**TypeScript Compilation:** Clean (zero errors frontend & backend)  
**IDE Errors:** None  

---

## File Inventory

### Frontend Pages (5 pages, 3,070 lines)
| File | Lines | Status |
|------|-------|--------|
| `src/pages/communication/CommunicationInbox.tsx` | 1,076 | Active — main unified inbox |
| `src/pages/communication/EmailTemplatesLibrary.tsx` | 665 | Active — email template CRUD |
| `src/pages/communication/CallCenter.tsx` | 610 | Active — cold call queue + stats |
| `src/pages/communication/NewsletterManagement.tsx` | 418 | Placeholder — "Coming Soon" |
| `src/pages/communication/SMSTemplatesLibrary.tsx` | 301 | Active — SMS template CRUD |
| `src/pages/communication/SocialMediaDashboard.tsx` | 160 | Placeholder |

### Frontend Inbox Components (8 files, 1,877 lines)
| File | Lines | Status |
|------|-------|--------|
| `inbox/ConversationView.tsx` | 706 | Active — message view + reply |
| `inbox/ContactList.tsx` | 323 | Active — contact list with folders |
| `inbox/ThreadList.tsx` | 282 | Active — legacy thread list (unused?) |
| `inbox/ComposeModal.tsx` | 140 | Active — new message compose |
| `inbox/types.ts` | 120 | Active — shared types |
| `inbox/ChannelSidebar.tsx` | 112 | Active — channel navigation |
| `inbox/FilterModal.tsx` | 108 | Active — advanced filters |
| `inbox/AttachmentModal.tsx` | 104 | Active — file upload |
| `inbox/SignatureEditorModal.tsx` | 74 | Active — email signatures |
| `inbox/index.ts` | 8 | Barrel export |

### Backend Routes (2 files, 390 lines)
| File | Lines | Endpoints |
|------|-------|-----------|
| `backend/src/routes/message.routes.ts` | 281 | 21 endpoints |
| `backend/src/routes/call.routes.ts` | 109 | 8 endpoints |

### Backend Controllers (2 files, 1,328 lines)
| File | Lines | Functions |
|------|-------|-----------|
| `backend/src/controllers/message.controller.ts` | 921 | 20 exported |
| `backend/src/controllers/call.controller.ts` | 407 | 8 exported |

### Backend Services (2 files, 1,062 lines)
| File | Lines | Provider |
|------|-------|----------|
| `backend/src/services/email.service.ts` | 638 | SendGrid |
| `backend/src/services/sms.service.ts` | 424 | Twilio |

### API Layer
| File | Section | Functions |
|------|---------|-----------|
| `src/lib/api.ts` | `messagesApi` | 17 functions |
| `src/lib/api.ts` | `templatesApi` | ~10 functions |
| `src/lib/api.ts` | `messageTemplatesApi` | ~6 functions |
| `src/lib/api.ts` | `callsApi` | ~8 functions |

---

## Architecture Assessment

### Data Flow (Working Correctly)
```
React Components → messagesApi (axios) → Express Routes → Controllers → Prisma ORM → PostgreSQL
                                                                      → Services (SendGrid/Twilio)
```

### Contact-Grouped Inbox (Working)
- Messages grouped by contact (lead ID, normalized phone, or email)
- Per-contact channel threads (email, sms, call)
- Unread counts tracked per channel and per contact
- Pagination applied after grouping

### Feature Completeness
| Feature | Status | Notes |
|---------|--------|-------|
| Send Email | ✅ Working | SendGrid integration, template support |
| Send SMS | ✅ Working | Twilio integration, opt-out checking |
| Make Call | ⚠️ Mock | Returns mock data, no Twilio Voice |
| Mark Read/Unread | ✅ Working | Single + batch |
| Star/Unstar | ✅ Working | Single + batch |
| Archive | ✅ Working | Single + batch |
| Trash/Delete | ✅ Working | Soft delete (batch) |
| Snooze | ✅ Working | Time-based with auto-unsnooze |
| Forward | ✅ Working | Via sendEmail |
| Print | ✅ Working | window.print() |
| Search | ✅ Working | Subject, body, from, to |
| Filters | ✅ Working | Date range, unread, starred, attachment, sender |
| Compose New | ✅ Working | Email/SMS/Call notes |
| AI Compose | ✅ Working | GPT-powered message generation |
| AI Enhance | ✅ Working | Tone-based message enhancement |
| Templates | ✅ Working | Insert pre-built templates |
| Quick Replies | ✅ Working | One-tap send |
| Attachments | ⚠️ Partial | Upload works, stored in /tmp only |
| Email Signature | ✅ Working | Per-user, auto-append option |
| Bulk Select | ✅ Working | Multi-select + batch operations |
| Auto Refresh | ✅ Working | 30s polling |
| Folder Navigation | ✅ Working | Inbox/Unread/Starred/Snoozed/Archived/Trash |
| Email Templates Library | ✅ Working | CRUD with categories |
| SMS Templates Library | ✅ Working | Character counting, segment calc |
| Cold Call Hub | ✅ Working | Smart queue, DNC, stats |
| Newsletter | ❌ Placeholder | Coming soon page |
| Social Media | ❌ Placeholder | Coming soon page |

---

## Bugs Found

### HIGH Severity

#### BUG-1: Trash and Archive Use Same Flag
**Files:** `backend/src/controllers/message.controller.ts` (lines 907-920)  
**Issue:** `batchDeleteMessages` sets `archived: true` — identical to `batchArchiveMessages`. There is no way to distinguish archived vs trashed messages. The inbox folder filter for both `'archived'` and `'trash'` query `{ archived: true }`.  
**Impact:** Users can't tell if a message was archived intentionally vs deleted to trash.  
**Fix:** Add a `trashedAt` or `trashed: Boolean` field to the Message model and use it for trash operations.

#### BUG-2: Batch Routes Missing Input Validation Middleware
**File:** `backend/src/routes/message.routes.ts` (lines 265-279)  
**Issue:** Routes `POST /batch-star`, `POST /batch-archive`, `POST /batch-delete` have no `validateBody()` middleware. The controllers do manual checks (`if (!messageIds || !Array.isArray(messageIds)`) but miss Zod validation that the rest of the routes use.  
**Impact:** Inconsistent validation — malformed payloads reach the controller. No type coercion or max-length enforcement on the messageIds array.  
**Fix:** Add `validateBody(batchOperationSchema)` to these three routes.

#### BUG-3: Client-Side Pagination on Large Dataset
**File:** `backend/src/controllers/message.controller.ts` (lines 80-85, 222-230)  
**Issue:** `getMessages()` fetches up to `Math.max(limit * 20, 1000)` messages from DB, groups them all in memory, sorts them, then slices for pagination. With thousands of messages, this is a significant memory and CPU bottleneck.  
**Impact:** Slow inbox load for high-volume accounts. Memory spikes on backend.  
**Fix:** Implement server-side grouped pagination using SQL window functions or cursor-based pagination.

### MEDIUM Severity

#### BUG-4: ThreadList Component Appears Unused
**File:** `src/pages/communication/inbox/ThreadList.tsx` (282 lines)  
**Issue:** `ThreadList` is defined and exported from the barrel `index.ts`, but it is NOT imported or rendered anywhere in `CommunicationInbox.tsx`. The inbox now uses `ContactList.tsx` instead.  
**Impact:** Dead code — 282 lines contributing nothing. Could confuse developers.  
**Fix:** Verify it's truly unused and remove, or keep if needed for backward compat.

#### BUG-5: File Uploads Stored in /tmp
**File:** `backend/src/routes/message.routes.ts` (lines 65-70)  
**Issue:** Uploaded attachments are stored at `/tmp/uploads` using `multer.diskStorage`. This is ephemeral storage — files won't survive container restarts or deployments.  
**Impact:** Attachment files will be lost after restart.  
**Fix:** Integrate S3/R2/persistent storage (noted in inline comments as TODO).

#### BUG-6: Forward Email Lacks Input Sanitization
**File:** `src/pages/communication/CommunicationInbox.tsx` (lines 600-625)  
**Issue:** `handleForwardConfirm` sends the forwarded message body directly from `selectedContact.lastMessage` without HTML sanitization. While the ConversationView uses DOMPurify for rendering, the forwarded body is passed as-is to `sendEmail`.  
**Impact:** Potential XSS chain if the forwarded email body contains malicious HTML and the recipient's client renders it.  
**Fix:** Sanitize forwarded content before sending.

#### BUG-7: Email CC/BCC Validated but Never Sent
**Files:** `backend/src/validators/message.validator.ts`, `backend/src/services/email.service.ts`  
**Issue:** The `sendEmailSchema` validates `cc` and `bcc` arrays, but the email service and controller never pass these to SendGrid's API call.  
**Impact:** Users could provide CC/BCC addresses that are silently ignored.  
**Fix:** Either wire CC/BCC into the SendGrid `msg` object or remove from the schema.

#### BUG-8: Optimistic Update Inconsistency on Snooze
**File:** `src/pages/communication/CommunicationInbox.tsx` (lines 465-485)  
**Issue:** `snoozeContact` fires individual `snoozeMessage` API calls for every message in the contact (via `Promise.all`). If any single call fails, the optimistic UI update stays but some messages remain unsnoozed. No rollback.  
**Impact:** Partial snooze state — some messages snoozed, some not.  
**Fix:** Use a batch snooze endpoint or add rollback on partial failure.

### LOW Severity

#### BUG-9: `ChannelSidebar.tsx` Exported but Not Used in Inbox
**File:** `src/pages/communication/inbox/ChannelSidebar.tsx`  
**Issue:** Component is exported from barrel but not rendered anywhere in current inbox layout. Contact list has folder tabs built-in.  
**Impact:** Dead code.

#### BUG-10: Mock Mode Call Returns Wrong Status
**File:** `backend/src/controllers/message.controller.ts` (makeCall function)  
**Issue:** `makeCall()` returns mock data with `"Mock mode"` message but creates a real DB record with status SENT.  
**Impact:** Database contains messages that were never actually sent. Stats are inflated.

#### BUG-11: Duplicate Template Seed Race Condition  
**File:** `src/pages/communication/CommunicationInbox.tsx` (lines 163-175)  
**Issue:** `useEffect` checks if `templatesData.length === 0 && quickRepliesData.length === 0` and calls `seedDefaults()`. If two components mount simultaneously (unlikely but possible in dev), two seed operations could run.  
**Impact:** Duplicate default templates in DB.  
**Fix:** Backend `seedDefaults` should be idempotent (check before insert).

#### BUG-12: Unused Imports in Routes
**File:** `backend/src/routes/message.routes.ts`  
**Issue:** `messageIdSchema` and `threadIdSchema` are imported but never used as middleware validators on any route.  
**Impact:** Code hygiene.

---

## Performance Concerns

| Issue | Location | Impact | Priority |
|-------|----------|--------|----------|
| Loads up to 1000 messages for grouping | `message.controller.ts:80` | Memory spike, slow for high-volume orgs | High |
| Sequential bulk email sending (100ms delay) | `email.service.ts` bulk function | 100 emails = 10+ seconds | Medium |
| Sequential bulk SMS sending (1000ms delay) | `sms.service.ts` bulk function | 100 SMS = 100+ seconds | Medium |
| Phone normalization in forEach loop | `message.controller.ts:105` | O(n) regex per message | Low |
| Suppression list checked per-email (no cache) | `email.service.ts` | Extra DB query per send in batch | Medium |
| Multiple sorts applied to contacts array | `message.controller.ts:202-220` | O(n log n) repeated | Low |
| No query result caching | General — all endpoints | Every request hits DB | Low |

---

## Security Assessment

| Check | Status | Notes |
|-------|--------|-------|
| Authentication on all routes | ✅ Pass | `router.use(authenticate)` applied globally |
| Organization isolation | ✅ Pass | All queries filter by `organizationId` |
| Rate limiting on sends | ✅ Pass | `messageSendLimiter` on email/SMS/call/reply |
| Rate limiting on batch ops | ❌ Missing | batch-star/archive/delete not rate-limited |
| Input validation (sends) | ✅ Pass | Zod schemas on email/SMS/call |
| Input validation (batch) | ❌ Missing | No validateBody on batch routes |
| File upload security | ✅ Pass | Blocked extensions, allowed list, 10MB limit |
| SQL injection | ✅ Pass | Prisma ORM parameterized queries throughout |
| XSS (render) | ✅ Pass | DOMPurify used in ConversationView |
| XSS (forward) | ⚠️ Partial | Forwarded body not sanitized before re-send |
| CSRF | ✅ Pass | JWT auth, no cookie-based sessions |
| Email opt-out checked | ✅ Pass | SMS opt-out and email suppression |

---

## Recommendations (Priority Order)

### Must Fix
1. **Add `trashed` field** to distinguish archive vs trash (BUG-1)
2. **Add `validateBody` middleware** to batch routes (BUG-2)
3. **Add rate limiting** to batch operation endpoints

### Should Fix
4. **Implement server-side grouped pagination** for `getMessages()` (BUG-3)
5. **Wire CC/BCC** into SendGrid or remove from schema (BUG-7)
6. **Integrate persistent file storage** (S3/R2) for attachments (BUG-5)
7. **Sanitize forwarded email content** before sending (BUG-6)

### Nice to Have
8. **Remove dead code** — `ThreadList.tsx`, `ChannelSidebar.tsx` if unused
9. **Remove unused imports** — `messageIdSchema`, `threadIdSchema` from routes
10. **Add batch snooze endpoint** to avoid N individual API calls (BUG-8)
11. **Cache suppression list** lookups for batch email sends
12. **Implement Twilio Voice** for real call functionality

---

## Summary

The Communications Hub is **functionally complete** for its core use cases (email, SMS, templates, call logging). The codebase is well-organized with a clean modular split of the inbox into 8 sub-components. TypeScript compilation is clean across both frontend and backend.

**Key strengths:**
- Full auth + org isolation on every endpoint
- Proper rate limiting on send operations
- DOMPurify for XSS protection on rendered content
- Optimistic UI updates with rollback on failure
- Comprehensive Zod validation on primary endpoints

**Key weaknesses:**
- Archive/trash conflation (same DB flag)
- Missing validation on 3 batch routes
- Client-side pagination bottleneck (loads 1000+ records)
- File storage is ephemeral (/tmp)
- Some dead code remaining from refactors

**Verdict:** Production-ready for normal usage loads with 3 high-priority fixes needed before scaling.
