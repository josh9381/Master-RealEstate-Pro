# Communications Tab Audit: SMS vs Email — A User's Perspective

> **Date:** March 17, 2026  
> **Scope:** Full UX + code audit of SMS vs Email handling in Communications Hub  
> **Approach:** Thinking as the user — what do I see, what confuses me, what's missing?

---

## Table of Contents

1. [The Sending Problem: Full Breakdown](#the-sending-problem-full-breakdown)
2. [No SMS Template Management Page](#1-no-sms-template-management-page)
3. [Compose Modal Lacks Templates & AI](#2-compose-modal-lacks-templates--ai)
4. [SMS Character Counter Is Misleading](#3-sms-character-counter-is-misleading)
5. [Reply Box Doesn't Adapt to Channel Type](#4-reply-box-doesnt-adapt-to-channel-type)
6. [No SMS Delivery Status in UI](#5-no-sms-delivery-status-in-ui)
7. [Forward Feature Only Works for Email](#6-forward-feature-only-works-for-email)
8. [No SMS Opt-Out / Compliance UI](#7-no-sms-opt-out--compliance-ui)
9. [No Unified Contact Threading](#8-no-unified-contact-threading)
10. [AISMSComposer Exists But Is Unused in Inbox](#9-aissmscomposer-exists-but-is-unused-in-inbox)
11. [Sub-Nav Is Email-Centric](#10-sub-nav-is-email-centric)
12. [Summary Severity Table](#summary-severity-table)

---

## The Sending Problem: Full Breakdown

### What Happens When You're on "All Messages" and Hit Reply

You click a thread in the thread list. It could be email or SMS — the thread has a `type` field but the **reply box doesn't tell you which channel you're about to send on.**

- The reply input just says `"Type your reply..."` — no indication of whether Enter will send an email or an SMS.
- The Send button is a plain arrow icon with no label or channel indicator.
- The `handleSendReply` function **does** route correctly based on `selectedThread.type` — if it's email it calls `sendEmail`, if it's SMS it calls `sendSMS`. So it won't accidentally send wrong. **But the user has no way to know this.**
- The conversation header shows the contact name and optionally a subject line, but **no channel badge** like "SMS" or "Email".

### Additional Sending Issues Found

#### Problem A: AI Composer uses `selectedChannel` instead of `selectedThread.type`

**File:** `src/pages/communication/inbox/ConversationView.tsx`

```tsx
messageType={selectedChannel === 'sms' ? 'sms' : selectedChannel === 'call' ? 'call' : 'email'}
```

If the sidebar is on "All", `selectedChannel` is `'all'`, which falls through to `'email'`. So if you're viewing an SMS thread with "All Messages" selected, **AI generates email-style content**.

#### Problem B: Compose modal defaults to SMS regardless of context

```tsx
const [composeType, setComposeType] = useState<'email' | 'sms' | 'call'>('sms')
```

**File:** `src/pages/communication/CommunicationInbox.tsx`

If you're filtering by Email and hit Compose, it still opens with SMS selected. The default should match the currently selected channel, or at minimum default to `'email'` which is the more common compose action.

#### Problem C: Reply placeholder is generic

The reply input shows `"Type your reply..."` for **all** channels. It should say:
- `"Reply via SMS..."` for SMS threads
- `"Reply via email..."` for email threads
- `"Add call note..."` for call threads

#### Problem D: Send button has no label

The send button is just a bare `<Send />` icon. It should say **"Send SMS"** or **"Send Email"** so the user knows what's about to happen.

#### Problem E: No channel badge in conversation header

You see the contact name and subject, but **not whether this is an SMS or email thread**. The thread type should be visible at a glance in the conversation header — a colored badge like `SMS` (green) or `Email` (blue).

#### Problem F: Call threads have a reply box that does nothing

You can "reply" to a call thread, but the code in `handleSendReply` only handles `email` and `sms`:

```tsx
if (selectedThread.type === 'email') {
  await messagesApi.sendEmail({ ... })
} else if (selectedThread.type === 'sms') {
  await messagesApi.sendSMS({ ... })
}
// call type: nothing happens
```

If you type a reply in a call thread and hit send:
- No API call is made
- No error is shown
- The success toast won't fire
- A fake local message is still created and appended to the thread
- The user thinks they sent something but nothing actually happened

**Recommendation:** For call threads, either:
- Replace the reply box with a "Log Call Note" form that calls `messagesApi.makeCall()`, or
- Disable the reply box entirely and show "Call notes cannot be replied to — use the Cold Call Hub"

---

## 1. No SMS Template Management Page

**User experience:** I go to the sub-nav at the top of the inbox. I see:

> `Inbox` | `Email Templates` | `Cold Call Hub`

Where are my **SMS templates?**

The backend has full SMS template CRUD (`backend/src/routes/sms-template.routes.ts`), the API layer has `templatesApi.getSMSTemplates()` / `createSMSTemplate()` / etc. in `src/lib/api.ts`, and the Prisma schema has an `SMSTemplate` model — but **there is no frontend page to manage SMS templates**. The sub-nav in `CommunicationInbox.tsx` only links to `Email Templates`. There is no `/communication/sms-templates` route.

As a user who does a lot of SMS outreach, I have no way to create, edit, or organize my SMS templates from the Communications tab. The only place SMS templates surface is in campaign creation (`CampaignCreate.tsx`) — which is disconnected from the inbox workflow.

**Recommendation:** Add an SMS Templates page at `/communication/sms-templates` and add it to the sub-nav. It should be simpler than the email template editor (no block editor needed) — just body text, character count preview, segment count, and variable insertion.

---

## 2. Compose Modal Lacks Templates & AI

**User experience:** I click "Compose New", pick SMS, start typing. I see no way to insert an SMS template. The compose modal (`ComposeModal.tsx`) is bare — just a type toggle, lead selector, to field, subject (email only), and a textarea. There's no template picker, no AI assist, no quick replies.

Compare this with the **reply** flow in `ConversationView.tsx`, which has:
- Templates
- Quick Replies
- AI Composer
- AI Enhance
- Emoji picker
- Attachments
- Signature editor

**None of those are in the compose modal.**

As a user composing a *new* SMS: I can't use templates, I can't use AI assist, I can't insert quick replies. The compose modal is a dead-simple form while the reply box is feature-rich. This is backwards — if I'm starting a new conversation, I *need* templates even more than when replying.

**Recommendation:** Port the template/AI toolbar into the `ComposeModal`, and when composing SMS, show SMS-specific templates (from `templatesApi.getSMSTemplates()`), not the generic `MessageTemplate` quick-replies.

---

## 3. SMS Character Counter Is Misleading

In the compose modal, when SMS is selected, there's a character counter:

```
Character count: 42 / 160
```

This appears as a simple `/160` indicator, but SMS segments are **not** capped at 160 characters — the backend validator allows up to 1600 characters. Multiple segments are a real thing. The `AISMSComposer` component correctly calculates `segmentCount = Math.ceil(charCount / 160)`, but the inbox compose modal does **not**.

As a user, I see `42 / 160` and think I'll get cut off at 160. But I won't — I'll just be billed for multiple segments and I'd have no idea.

**Recommendation:** Show segment count alongside character count: e.g., `142 characters · 1 segment` or `320 characters · 2 segments (2× cost)`. Warn at 160+ but don't block.

---

## 4. Reply Box Doesn't Adapt to Channel Type

The reply area in `ConversationView` shows the **same toolbar for every channel**:

| Feature | Email | SMS | Call |
|---------|-------|-----|------|
| Attachments button | ✅ Correct | ⚠️ Should indicate MMS | ❌ Irrelevant |
| Signature editor | ✅ Gated to email | ✅ Hidden for SMS | ✅ Hidden |
| Templates | ⚠️ Shows generic MessageTemplates | ⚠️ Should show SMS templates | ❌ Irrelevant |
| AI Composer | ⚠️ Uses `selectedChannel` not thread type | ⚠️ Wrong context when on "All" | ❌ Irrelevant |
| Character count | Not needed | ❌ Missing | Not needed |
| Quick Replies | Generic for all | Should be SMS-aware | Irrelevant |

**Recommendation:**
- AI Composer should use `selectedThread.type` not `selectedChannel` to determine message type
- Template picker should load channel-appropriate templates (email templates for email threads, SMS templates for SMS threads)
- When in an SMS thread, show segment count on the reply text
- When in an SMS thread, attachment button should indicate it will send as MMS
- When in a call thread, replace the reply box with a "Log Note" form or disable it

---

## 5. No SMS Delivery Status in UI

For email, the conversation view shows rich delivery tracking — "Opened", "Clicked", delivery/sent/pending badges. For SMS? **Nothing.** The delivery status badges are wrapped in:

```tsx
{isFromMe && message.type === 'email' && (
  // tracking badges shown here
)}
```

The backend `sms.service.ts` creates Message records with status and could receive Twilio delivery callbacks, but the frontend **deliberately hides** status for SMS messages. As a user, I send an SMS and just see a blue bubble. Did it deliver? Did it fail? No idea.

**Recommendation:** Show delivery status for SMS too. Twilio provides delivery statuses (queued, sent, delivered, failed, undelivered). Change the condition to:

```tsx
{isFromMe && (message.type === 'email' || message.type === 'sms') && (
  // tracking badges
)}
```

Remove the `emailOpened` / `emailClicked` badges for SMS (those are email-only), but keep Sent / Delivered / Failed.

---

## 6. Forward Feature Only Works for Email

In the "More" menu on the conversation view, "Forward" always calls `handleForwardConfirm()` which uses `messagesApi.sendEmail()` — even if you're viewing an SMS thread. As a user viewing an SMS conversation, I click Forward and it sends an email forward. That's confusing.

**Recommendation:** Either:
- Gate the Forward action to email threads only (hide it for SMS/call), or
- Implement SMS forwarding (forward to another phone number)
- At minimum, label it "Forward via Email" so the user understands what will happen

---

## 7. No SMS Opt-Out / Compliance UI

The email service has proper opt-out checks — it verifies `lead.emailOptedIn`, adds unsubscribe headers, and has an `EmailSuppression` list. SMS has **none of this in the UI**. There's:
- No visible opt-in/out status for SMS
- No way to check if a contact has consented to SMS
- No unsubscribe / STOP handling
- No SMS suppression list

For real estate professionals using this for lead outreach, **SMS compliance (TCPA)** is critical. Sending unsolicited SMS can result in $500–$1,500 per message in fines.

**Recommendation:**
- Show SMS opt-in/out status on the lead card in the compose flow
- Add an opt-out indicator in the thread list for SMS
- At minimum, show a warning when sending to a lead without recorded SMS consent
- Implement STOP word detection on inbound SMS to auto-opt-out leads
- Add an SMS suppression list similar to `EmailSuppression`

---

## 8. No Unified Contact Threading

The backend controller (`message.controller.ts`) groups threads differently per channel:
- Phone numbers are normalized to E.164 for SMS
- Emails are lowercased for email grouping

This means **the same lead can appear as two or three separate threads** — one for email, one for SMS, one for calls. As a user looking at my inbox, I see "John Smith" three times. I have to click each thread to see the full picture.

**Recommendation:** Consider a unified contact-level view that shows all channels for a single lead in one expandable thread, with sub-sections for each channel. The current per-channel-per-contact threading is technically correct but creates a fragmented user experience.

---

## 9. AISMSComposer Exists But Is Unused in Inbox

There's a purpose-built `src/components/ai/AISMSComposer.tsx` with:
- Phone-preview mockup (looks like an actual phone screen)
- Tone selection (Professional / Friendly / Brief)
- Character counting with segment awareness
- Direct send capability
- AI regeneration per tone

It's a well-crafted component — but it's **not wired into the Communications inbox at all**. The inbox uses the generic `AIComposer` for all channels. The `AISMSComposer` only gets used from the leads detail page.

**Recommendation:** When composing or replying in an SMS thread, integrate `AISMSComposer` instead of the generic AI composer. The phone preview and segment awareness are exactly what SMS users need.

---

## 10. Sub-Nav Is Email-Centric

The sub-navigation bar shows:

> `Inbox` | `Email Templates` | `Cold Call Hub`

There's nothing SMS-specific in the navigation. No SMS Templates page, no SMS Analytics, no SMS Settings shortcut. The comms tab feels like an **email client that also accepts SMS**.

**Current routing structure:**
| Route | Page |
|-------|------|
| `/communication/inbox` | Unified Inbox |
| `/communication/templates` | Email Templates (only) |
| `/communication/calls` | Cold Call Hub |
| `/communication/social` | Social Media (Coming Soon) |
| `/communication/newsletter` | Newsletter (Coming Soon) |

No `/communication/sms-templates` exists.

**Recommendation:** Restructure the sub-nav to be channel-balanced:

Option A: `Inbox` | `Email Templates` | `SMS Templates` | `Cold Call Hub`

Option B: `Inbox` | `Templates` (with Email / SMS sub-tabs) | `Cold Call Hub`

---

## Architecture Notes

### What's Done Well (Backend)

The backend is actually ahead of the frontend:

- **Separate services:** `email.service.ts` (SendGrid) and `sms.service.ts` (Twilio) — clean separation
- **Separate validation schemas:** Email requires subject, SMS has 1600-char limit and E.164 phone validation
- **Separate template models:** `EmailTemplate` (has subject) vs `SMSTemplate` (body only) — correct domain modeling
- **Separate provider config:** `EmailConfig` / `SMSConfig` with encrypted credentials per user
- **Email deliverability service:** Bounce tracking, spam complaints, retry logic, suppression list
- **Template rendering:** Shared `template.service.ts` for variable replacement works across both channels
- **AI composing:** `ai-compose.service.ts` accepts `messageType` parameter for channel-aware generation

### What's Missing (Frontend Gap)

| Backend Feature | Frontend Status |
|----------------|----------------|
| SMS Template CRUD API | ❌ No management page |
| SMS delivery status tracking | ❌ Hidden in UI |
| SMS character/segment logic | ⚠️ Only in `AISMSComposer` (unused in inbox) |
| SMS template selection in sending | ❌ Not available in compose or reply |
| Channel-aware AI compose | ⚠️ Uses `selectedChannel` instead of thread type |
| SMS opt-in/consent checking | ❌ Not surfaced in UI |
| Twilio delivery callbacks | ❌ No UI representation |

---

## Summary Severity Table

| # | Issue | Severity | Effort | Files Involved |
|---|-------|----------|--------|----------------|
| S1 | Reply box doesn't indicate channel (send problem) | **Critical** | Low | `ConversationView.tsx` |
| S2 | AI Composer uses wrong channel context | **High** | Low | `ConversationView.tsx` |
| S3 | Compose modal defaults to SMS regardless of context | **Medium** | Low | `CommunicationInbox.tsx` |
| S4 | Generic reply placeholder for all channels | **Medium** | Low | `ConversationView.tsx` |
| S5 | Send button has no channel label | **Medium** | Low | `ConversationView.tsx` |
| S6 | No channel badge in conversation header | **Medium** | Low | `ConversationView.tsx` |
| S7 | Call thread reply silently does nothing | **High** | Low | `CommunicationInbox.tsx` |
| 1 | No SMS template management page | **High** | Medium | New page + `App.tsx` routing |
| 2 | Compose modal lacks templates/AI | **High** | Medium | `ComposeModal.tsx` |
| 3 | SMS char counter misleading | **Medium** | Low | `ComposeModal.tsx` |
| 4 | Reply box doesn't adapt to channel | **High** | Medium | `ConversationView.tsx` |
| 5 | No SMS delivery status in UI | **High** | Low | `ConversationView.tsx` |
| 6 | Forward always sends email | **Medium** | Low | `CommunicationInbox.tsx` |
| 7 | No SMS opt-out/compliance UI | **Critical** | Medium | Multiple files |
| 8 | No unified contact threading | **Low** | High | Backend + Frontend |
| 9 | AISMSComposer unused in inbox | **Medium** | Low | `ConversationView.tsx` |
| 10 | Sub-nav is email-centric | **Medium** | Low | `CommunicationInbox.tsx`, `App.tsx` |

### Priority Order for Fixes

**Wave 1 — Quick Wins (Low effort, High/Critical impact):**
1. S1: Add channel indicator to reply box + conversation header
2. S2: Fix AI Composer to use `selectedThread.type`
3. S5/S6: Add "Send SMS" / "Send Email" labels + channel badge
4. S7: Handle call thread replies properly
5. Issue 5: Show SMS delivery status (change one conditional)

**Wave 2 — Medium Effort, High Value:**
6. Issue 2: Port template/AI toolbar into ComposeModal
7. Issue 4: Make reply toolbar channel-aware
8. S3: Default compose type to `selectedChannel`
9. Issue 3: Fix SMS character counter with segments

**Wave 3 — New Features:**
10. Issue 1: Build SMS Templates management page
11. Issue 10: Update sub-nav
12. Issue 9: Wire AISMSComposer into inbox

**Wave 4 — Compliance (Should be higher if going to production):**
13. Issue 7: SMS opt-out / TCPA compliance UI
