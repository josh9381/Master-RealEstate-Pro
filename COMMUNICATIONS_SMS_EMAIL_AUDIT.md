# Communications Tab Audit: SMS vs Email — Full Breakdown

**Date:** March 18, 2026 (Revised)  
**Scope:** Complete UX, frontend, and backend audit of how SMS vs Email are handled across the Communications Hub  
**Method:** Line-by-line code review of every component + thinking as a real estate agent user

---

## Table of Contents

**PART 1 — THE SENDING PROBLEM (Critical)**
1. [The Core Sending Problem](#1-the-core-sending-problem)
2. [AI Composer Uses Wrong Channel](#2-ai-composer-uses-wrong-channel)
3. [Compose Modal Defaults to SMS Always](#3-compose-modal-defaults-to-sms-always)
4. [Reply Placeholder Is Generic](#4-reply-placeholder-is-generic)
5. [Send Button Has No Channel Label](#5-send-button-has-no-channel-label)
6. [No Channel Badge in Conversation Header](#6-no-channel-badge-in-conversation-header)
7. [Call Threads Have a Broken Reply Box](#7-call-threads-have-a-broken-reply-box)
8. [Reply Draft Leaks Between Threads](#8-reply-draft-leaks-between-threads)

**PART 2 — MISSING SMS FEATURES**
9. [No SMS Template Management Page](#9-no-sms-template-management-page)
10. [Compose Modal Lacks Templates & AI](#10-compose-modal-lacks-templates--ai)
11. [SMS Character Counter Is Misleading](#11-sms-character-counter-is-misleading)
12. [Reply Box Doesn't Adapt to Channel](#12-reply-box-doesnt-adapt-to-channel)
13. [No SMS Delivery Status in UI](#13-no-sms-delivery-status-in-ui)
14. [AISMSComposer Exists But Unused in Inbox](#14-aisms-composer-exists-but-unused-in-inbox)

**PART 3 — STRUCTURAL PROBLEMS**
15. [Forward Always Sends Email](#15-forward-always-sends-email)
16. [No SMS Opt-Out / Compliance UI](#16-no-sms-opt-out--compliance-ui)
17. [Sub-Nav Is Email-Centric](#17-sub-nav-is-email-centric)
18. [Same Lead Appears as Separate Threads per Channel](#18-same-lead-appears-as-separate-threads-per-channel)

**PART 4 — BACKEND BUGS**
19. [Backend replyToMessage Always Replies to fromAddress](#19-backend-replytomessage-always-replies-to-fromaddress)
20. [SMS Service Has No Opt-Out Check](#20-sms-service-has-no-opt-out-check)
21. [SMS Mock Mode Returns DELIVERED Status](#21-sms-mock-mode-returns-delivered-status)
22. [Hardcoded Organization Fallback ID](#22-hardcoded-organization-fallback-id)
23. [SMS Webhook Has No Signature Verification](#23-sms-webhook-has-no-signature-verification)

**PART 5 — DATA, PERFORMANCE & BROKEN FEATURES (Second Pass)**
24. [Backend getMessages Ignores Date Range and Sort Params](#24-backend-getmessages-ignores-date-range-and-sort-params)
25. [Backend Hardcodes starred: false on Every Message](#25-backend-hardcodes-starred-false-on-every-message)
26. [Pagination Replaces Data Instead of Appending](#26-pagination-replaces-data-instead-of-appending)
27. [Double-Filtering: Search Applied Server-Side AND Client-Side](#27-double-filtering-search-applied-server-side-and-client-side)
28. [Inbox Folder Shows Archived and Trashed Threads](#28-inbox-folder-shows-archived-and-trashed-threads)
29. [Backend getMessages Doesn't Filter Out Archived/Trashed](#29-backend-getmessages-doesnt-filter-out-archivedtrashed)
30. [Sidebar Unread Counts Based on Current Page Only](#30-sidebar-unread-counts-based-on-current-page-only)
31. [deleteMessage Performs Hard Delete — "Trash" Is Permanent](#31-deletemessage-performs-hard-delete--trash-is-permanent)
32. [Snooze Is Write-Only — Snoozed Threads Never Reappear](#32-snooze-is-write-only--snoozed-threads-never-reappear)
33. [Attachments Uploaded But Never Actually Sent With Emails](#33-attachments-uploaded-but-never-actually-sent-with-emails)
34. [Backend sendEmail Controller Ignores cc, bcc, and attachments](#34-backend-sendemail-controller-ignores-cc-bcc-and-attachments)
35. [Reply Input Is Single-Line — Can't Write Multi-Paragraph Replies](#35-reply-input-is-single-line--cant-write-multi-paragraph-replies)
36. [Email Templates Library "Use" Goes to Campaigns, Not Compose](#36-email-templates-library-use-goes-to-campaigns-not-compose)
37. [Email Templates "Recently Used" Section Is Static Placeholder](#37-email-templates-recently-used-section-is-static-placeholder)
38. [Email Template Settings Are Saved But Never Consumed](#38-email-template-settings-are-saved-but-never-consumed)
39. [Star/Archive/Delete Sends N API Calls for N Messages in Thread](#39-stararchivedelete-sends-n-api-calls-for-n-messages-in-thread)
40. [Reply Route Missing Rate Limiting](#40-reply-route-missing-rate-limiting)
41. [Star/Archive/Snooze Routes Missing Body & Params Validation](#41-stararchivesnooze-routes-missing-body--params-validation)
42. [Forward Dialog Doesn't Validate Email Format](#42-forward-dialog-doesnt-validate-email-format)
43. [Compose Modal Doesn't Reset Type on Re-Open](#43-compose-modal-doesnt-reset-type-on-re-open)
44. [Email Body Rendered as Plain Text — HTML Tags Visible](#44-email-body-rendered-as-plain-text--html-tags-visible)
45. ["All Messages" Sidebar Button Resets Folder, Others Don't](#45-all-messages-sidebar-button-resets-folder-others-dont)
46. [Filter Date Comparison Uses Timezone-Naive Parsing](#46-filter-date-comparison-uses-timezone-naive-parsing)
47. [No Communication State Store — All State Lost on Navigation](#47-no-communication-state-store--all-state-lost-on-navigation)
48. [Backend getMessages Loads All Messages Into Memory](#48-backend-getmessages-loads-all-messages-into-memory)
49. [Reply Body Has No Max Length Validation](#49-reply-body-has-no-max-length-validation)
50. [Newsletter & Social Media Pages Exist But Are Unreachable](#50-newsletter--social-media-pages-exist-but-are-unreachable)

**[Updated Priority Action Plan](#updated-priority-action-plan)**  
**[Full Severity Table](#full-severity-table)**

---

# PART 1 — THE SENDING PROBLEM

This is the highest-priority section. As a user, the most fundamental question when I'm in the inbox is: **"What am I about to send and on what channel?"** The current UI does not answer this.

---

## 1. The Core Sending Problem

**What happens right now:** I'm on "All Messages". I click a thread. It could be email or SMS. The thread has a `type` field internally, but:

- The reply input says `"Type your reply..."` — no indication of channel.
- The Send button is a bare `<Send />` icon — no label.
- The conversation header shows contact name and subject — no channel badge.
- The message bubbles all look identical (blue for outbound, gray for inbound) regardless of email vs SMS.

The good news: `handleSendReply` **does** route correctly based on `selectedThread.type`. It won't accidentally send on the wrong channel. But the user has **zero visual confirmation** of which channel they're using. A real estate agent sending 50+ messages a day needs to know instantly.

**File:** `src/pages/communication/inbox/ConversationView.tsx`

**What it should look like:**
- Conversation header: `John Smith` **`📧 Email`** or `John Smith` **`💬 SMS`**
- Reply input: `"Reply via email..."` or `"Reply via SMS..."`
- Send button: `Send Email` or `Send SMS` with channel-colored styling
- Message bubbles: Different styling per channel (blue for email, green for SMS, matching the sidebar colors that already exist)

---

## 2. AI Composer Uses Wrong Channel

**File:** `src/pages/communication/inbox/ConversationView.tsx` (line ~400)

```tsx
messageType={selectedChannel === 'sms' ? 'sms' : selectedChannel === 'call' ? 'call' : 'email'}
```

This uses the **sidebar filter** (`selectedChannel`) instead of the **actual thread type** (`selectedThread.type`). When the sidebar is on "All Messages", `selectedChannel` is `'all'`, which falls through the ternary to `'email'`.

**Real scenario:** Agent has sidebar on "All". Clicks an SMS thread from a lead. Clicks "Generate AI Message". AI generates a formal email with subject line and signature — for an SMS thread.

**Fix:** Change to `selectedThread?.type || 'email'`

---

## 3. Compose Modal Defaults to SMS Always

**File:** `src/pages/communication/CommunicationInbox.tsx` (line 82)

```tsx
const [composeType, setComposeType] = useState<'email' | 'sms' | 'call'>('sms')
```

Hardcoded default `'sms'` regardless of context.

**Real scenario:** Agent is viewing the Email channel filter, clicks "Compose New" — the modal opens with SMS pre-selected. Agent has to manually switch, or worse, doesn't notice and types a long email body into an SMS field.

**Fix:** Default should follow `selectedChannel`:
- If channel is `'email'` → default email
- If channel is `'sms'` → default sms  
- If channel is `'all'` → default email (most common compose action)

---

## 4. Reply Placeholder Is Generic

**File:** `src/pages/communication/inbox/ConversationView.tsx` (line ~530)

```tsx
<Input placeholder="Type your reply..." ... />
```

Same placeholder for every channel. This is the **most basic** place to communicate channel to the user.

**Fix:**
```tsx
placeholder={
  selectedThread?.type === 'sms' ? 'Reply via SMS...' :
  selectedThread?.type === 'email' ? 'Reply via email...' :
  selectedThread?.type === 'call' ? 'Add call note...' :
  'Type your reply...'
}
```

---

## 5. Send Button Has No Channel Label

**File:** `src/pages/communication/inbox/ConversationView.tsx` (line ~540)

```tsx
<Button onClick={onSendReply}>
  <Send className="h-4 w-4" />
</Button>
```

Just an icon. No text. No color differentiation.

**Fix:** Add label and channel-appropriate color:
```tsx
<Button onClick={onSendReply} className={selectedThread?.type === 'sms' ? 'bg-green-600' : ''}>
  <Send className="h-4 w-4 mr-2" />
  {selectedThread?.type === 'sms' ? 'Send SMS' : selectedThread?.type === 'email' ? 'Send Email' : 'Send'}
</Button>
```

---

## 6. No Channel Badge in Conversation Header

**File:** `src/pages/communication/inbox/ConversationView.tsx` (lines ~165-170)

The conversation header shows:
```tsx
<h3 className="font-semibold">{selectedThread.contact}</h3>
{selectedThread.subject && (
  <p className="text-sm text-muted-foreground">{selectedThread.subject}</p>
)}
```

No channel indicator. The ThreadList **does** show a channel icon per thread (Mail/MessageSquare/Phone with color coding), but once you're in the conversation view, that context disappears.

**Fix:** Add channel badge next to contact name:
```tsx
<div className="flex items-center gap-2">
  <h3 className="font-semibold">{selectedThread.contact}</h3>
  <Badge variant="outline" className={
    selectedThread.type === 'sms' ? 'text-green-600 border-green-300 bg-green-50' :
    selectedThread.type === 'email' ? 'text-blue-600 border-blue-300 bg-blue-50' :
    'text-purple-600 border-purple-300 bg-purple-50'
  }>
    {selectedThread.type === 'sms' ? '💬 SMS' : selectedThread.type === 'email' ? '📧 Email' : '📞 Call'}
  </Badge>
</div>
```

---

## 7. Call Threads Have a Broken Reply Box

**File:** `src/pages/communication/CommunicationInbox.tsx` (lines 406-416)

```tsx
const handleSendReply = async (textOverride?: string) => {
  // ...
  if (selectedThread.type === 'email') {
    await messagesApi.sendEmail({ ... })
  } else if (selectedThread.type === 'sms') {
    await messagesApi.sendSMS({ ... })
  }
  // ← call type falls through — NOTHING HAPPENS

  // But this runs unconditionally:
  const newMessage: Message = { id: Date.now(), ... }
  setThreads(prev => prev.map(...)) // Creates fake local message
  toast.success('Reply sent successfully') // ← THIS NEVER FIRES (no await completed)
  setReplyText('')
}
```

**Real scenario:** Agent opens a call thread, types a follow-up note, hits Enter. The code hits the if/else chain, falls through for `'call'`, skips the API call. Then it creates a **fake local message** (id = `Date.now()`) and adds it to the thread. The toast technically won't fire since no API call succeeded (actually it does fire because the code isn't wrapped in the right try/catch scoping — the toast is AFTER the if/else, not inside it). The user sees a message that was never sent.

**Fix options (pick one):**
- **Best:** Hide the reply box for call threads, show a "Log Call Note" button instead that calls `messagesApi.makeCall()`
- **Acceptable:** Route `call` type to `messagesApi.makeCall()` in the handler
- **Minimum:** Disable the reply input and send button for call threads with a helper message

---

## 8. Reply Draft Leaks Between Threads

**File:** `src/pages/communication/CommunicationInbox.tsx`

`replyText` state is a single `useState('')` at the component level. When you switch threads (click a different conversation), the draft text stays in the reply box.

**Real scenario:** Agent starts typing a detailed email reply in thread A. Clicks thread B (an SMS thread) to check something. The email draft is still in the reply box. Agent absentmindedly hits Enter — now that long email body gets sent as an SMS (multiple segments, high cost, and looks unprofessional as a text message).

**Fix:** Clear `replyText` when `selectedThread` changes, or store per-thread drafts:

```tsx
// In handleSelectThread:
setReplyText('')
setEmailSubject('')
```

Or better — maintain a `Map<threadId, string>` of drafts so users don't lose their work.

---

# PART 2 — MISSING SMS FEATURES

These are features that exist for email but are missing for SMS, making the inbox feel like an email client that also does texting.

---

## 9. No SMS Template Management Page

**The routing is:**
| Route | Page |
|-------|------|
| `/communication/inbox` | Unified Inbox |
| `/communication/templates` | **Email** Templates Library |
| `/communication/calls` | Cold Call Hub |

There is **no** `/communication/sms-templates` route. No page exists.

**But the backend is ready:**
- `backend/src/routes/sms-template.routes.ts` — Full CRUD endpoints
- `backend/src/controllers/sms-template.controller.ts` — Controller with character count stats
- `src/lib/api.ts` — `templatesApi.getSMSTemplates()`, `createSMSTemplate()`, etc.
- Prisma schema has `SMSTemplate` model with `body`, `category`, `variables`

**What the page needs:** Much simpler than the email template editor. No block editor. Just:
- Template name, category, body textarea
- Live character count and segment count (`Math.ceil(chars / 160)`)
- Variable insertion buttons (`{{firstName}}`, `{{propertyAddress}}`, etc.)
- Phone preview mockup (like the one already built in `AISMSComposer.tsx`)

---

## 10. Compose Modal Lacks Templates & AI

**File:** `src/pages/communication/inbox/ComposeModal.tsx`

The compose modal has: type toggle, lead picker, to field, subject (email only), textarea, send button. That's it.

The reply box in `ConversationView.tsx` has: Templates, Quick Replies, AI Composer, AI Enhance, Emoji picker, Attachments, Signature editor.

**None of those are in the compose modal.**

This is backwards in terms of user need. When composing a *new* message (cold outreach to a lead), you need templates and AI even more than when replying to an ongoing conversation where you already have context.

**What the compose modal needs:**
- Template picker (email templates when composing email, SMS templates when composing SMS)
- AI generate button
- Quick replies
- When SMS: character/segment counter
- When email: attachment support (currently no attach button in compose)

---

## 11. SMS Character Counter Is Misleading

**File:** `src/pages/communication/inbox/ComposeModal.tsx` (line ~121)

```tsx
{composeType === 'sms' && (
  <p className="text-xs text-muted-foreground">
    Character count: {composeBody.length} / 160
  </p>
)}
```

Shows `42 / 160` — implies a hard cap at 160. But:
- Backend allows up to 1600 characters (10 segments)
- Each segment past 160 chars costs extra
- The `AISMSComposer` component already calculates this correctly: `Math.ceil(charCount / 160)` segments

**What user sees:** "I have 160 characters max" — so they either truncate important info or don't realize they're being billed for 5 segments.

**What it should show:**
```
142 characters • 1 segment
---
320 characters • 2 segments ⚠️ (2x SMS cost)
---
800 characters • 5 segments ⚠️⚠️ (5x SMS cost — consider email instead)
```

Also: the reply box in `ConversationView` has **no** character counter at all when replying to SMS threads.

---

## 12. Reply Box Doesn't Adapt to Channel

**File:** `src/pages/communication/inbox/ConversationView.tsx` (reply box section)

The same toolbar renders for every channel type. Issues:

| Feature | Email Thread | SMS Thread | Call Thread |
|---------|-------------|------------|-------------|
| Templates | Shows generic `MessageTemplate` quick replies | Same generic templates (should show SMS templates) | Same (shouldn't show at all) |
| Quick Replies | OK for email | OK for SMS | Shouldn't be here |
| Attachments | Correct — adds to email | Means MMS — **no indication** of behavior change or different size limits | Shouldn't be here |
| Signature editor | Correctly gated to email ✓ | Hidden ✓ | Hidden ✓ |
| AI Composer | Uses wrong channel (bug #2) | Uses wrong channel (bug #2) | Generates message for dead reply box |
| Character counter | Not needed | **Missing** — should show segment count | N/A |
| Subject line | Shows when `emailSubject` exists | Shouldn't be possible | Shouldn't be possible |

**What it should do:**
- **Email:** Full toolbar (templates, attachments, signature, AI)
- **SMS:** Simplified toolbar (SMS templates, emoji, AI with SMS awareness, character/segment counter). Attachment button labeled "Send MMS" with size warning.
- **Call:** Replace reply box entirely with "Log Follow-up Note" form

---

## 13. No SMS Delivery Status in UI

**File:** `src/pages/communication/inbox/ConversationView.tsx` (lines ~260-280)

```tsx
{isFromMe && message.type === 'email' && (
  <div className="mt-3 pt-3 border-t border-primary-foreground/20 flex gap-2 flex-wrap">
    {message.emailOpened && (<Badge>Opened</Badge>)}
    {message.emailClicked && (<Badge>Clicked</Badge>)}
    {message.status && (<Badge>{message.status}</Badge>)}
  </div>
)}
```

This is **email-only**. The `message.type === 'email'` gate means SMS messages show zero delivery feedback.

But the backend tracks SMS status. Twilio provides: `queued → sent → delivered → failed → undelivered`. The `Message` model has a `status` field that stores this.

**What the user sees for SMS:** A blue bubble. Nothing else. Did it deliver? Did Twilio reject the number? No idea.

**Fix:** Show status for all outbound messages, with channel-appropriate display:
- **Email:** Sent → Delivered → Opened → Clicked (with open/click tracking)
- **SMS:** Queued → Sent → Delivered → Failed/Undelivered (Twilio statuses)

---

## 14. AISMSComposer Exists But Unused in Inbox

**File:** `src/components/ai/AISMSComposer.tsx`

This is a **purpose-built** SMS composer with:
- Phone device preview (shows how the SMS will look on a phone screen)
- Tone selection: Professional, Friendly, Brief
- Character counting with segment calculation
- AI regeneration per tone
- Direct send to Twilio

It's well-designed. It's tested. **It's not used anywhere in the inbox.** The inbox uses the generic `AIComposer` for all channels, which generates email-length content for SMS.

**Where it should be used:** When the AI Composer is opened in an SMS thread (either from the reply toolbar or compose modal), swap in `AISMSComposer` instead of the generic one.

---

# PART 3 — STRUCTURAL PROBLEMS

---

## 15. Forward Always Sends Email

**File:** `src/pages/communication/CommunicationInbox.tsx` (lines 443-455)

```tsx
const handleForwardConfirm = async () => {
  // ...
  await messagesApi.sendEmail({
    to: forwardEmail.trim(),
    subject: `Fwd: ${lastMsg?.subject || selectedThread.contact}`,
    body: `---------- Forwarded message ----------\n...`,
  })
}
```

Plus the Forward dialog label says "Enter the email address to forward this conversation to" and the input has `type="email"`.

If you're on an SMS thread and click Forward → you get prompted for an email address → it sends an email. That's confusing and arguably wrong.

**Fix options:**
- Hide Forward option for non-email threads
- Or: for SMS threads, prompt for phone number and forward as SMS
- Or: always forward via email (SMS → email transcript) but make the dialog label clear: "Forward this SMS conversation via email to:"

---

## 16. No SMS Opt-Out / Compliance UI

**This is the single most important legal issue.**

For email, the backend service (`email.service.ts`):
- Checks `lead.emailOptIn` before sending
- Adds `List-Unsubscribe` headers
- Maintains a suppression list (`EmailSuppression` model)
- Has a deliverability service tracking bounces and complaints

For SMS, the backend service (`sms.service.ts`):
- **No opt-in/opt-out check** at all (see Backend Bug #20)
- **No unsubscribe handling**
- **No suppression list**

In the **frontend**, there's zero visibility:
- No indicator showing if a lead has consented to SMS
- No warning when composing SMS to a lead without consent
- No opt-out button or "stop" keyword handling

For real estate agents doing SMS outreach, **TCPA compliance** requires:
1. Prior express consent before texting
2. Honoring opt-out requests (STOP keyword)
3. Maintaining a do-not-text list

**What's needed (minimum viable):**
- Show SMS consent status badge in compose flow (green = opted in, red = opted out, gray = unknown)
- Block sending to opted-out leads with clear error message
- Auto-detect "STOP" in inbound SMS and mark lead as opted out
- Add "SMS Consent" toggle to lead profile

---

## 17. Sub-Nav Is Email-Centric

**File:** `src/pages/communication/CommunicationInbox.tsx` (lines ~668-672)

```tsx
<div className="flex gap-2 border-b pb-3">
  <Link to="/communication"><Button>Inbox</Button></Link>
  <Link to="/communication/templates"><Button>Email Templates</Button></Link>
  <Link to="/communication/calls"><Button>Cold Call Hub</Button></Link>
</div>
```

Three items: Inbox, **Email** Templates, Cold **Call** Hub. SMS is invisible at the navigation level.

**Recommended structure:**

```
Inbox | Email Templates | SMS Templates | Cold Call Hub
```

Or consolidate:

```
Inbox | Templates (Email | SMS tabs) | Cold Call Hub
```

---

## 18. Same Lead Appears as Separate Threads per Channel

**Backend file:** `backend/src/controllers/message.controller.ts` (lines 95-120)

The threading logic groups by:
- **Email:** lowercase email address
- **SMS:** normalized E.164 phone number
- **Call:** `threadId` from metadata

This means "John Smith" who you've emailed AND texted shows up as **two separate threads**. There's no link between them. You lose the full picture of your communication with that lead.

The ThreadList already shows which lead each thread belongs to (via `thread.lead`), but the threads are never merged or linked.

**What it should feel like:** Click "John Smith" → see a unified timeline with email and SMS interleaved, or at minimum see tabs within the conversation view (Email | SMS | Calls).

**This is a larger effort** and could be Phase 2, but it's worth noting because real estate agents talk to leads across channels constantly.

---

# PART 4 — BACKEND BUGS

These bugs exist in the backend code. Some are latent (not exercised by the current frontend), others actively affect the system.

---

## 19. Backend replyToMessage Always Replies to fromAddress

**File:** `backend/src/controllers/message.controller.ts` (lines 624-693)

```tsx
export const replyToMessage = async (req, res) => {
  // ...
  if (isEmail) {
    const result = await sendEmailService({
      to: originalMessage.fromAddress,  // ← BUG
      // ...
    })
  } else {
    const result = await sendSMSService({
      to: originalMessage.fromAddress,  // ← BUG
      // ...
    })
  }
}
```

Always uses `fromAddress`. If the original message is **outbound** (from us to the lead), `fromAddress` is our own address. This would send the reply **to ourselves**.

**Note:** The frontend inbox does NOT use this endpoint — it calls `POST /messages/email` and `POST /messages/sms` directly, and resolves the reply-to address correctly on the client side:
```tsx
const replyTo = firstMsg.direction === 'INBOUND' ? firstMsg.from : firstMsg.to  // ✓ Correct
```

So this is a **latent bug** — it doesn't affect the inbox today, but it will break if any other client (mobile app, API integration) uses the `replyToMessage` endpoint.

**Fix:**
```tsx
const recipientAddress = originalMessage.direction === 'INBOUND'
  ? originalMessage.fromAddress
  : originalMessage.toAddress;
```

---

## 20. SMS Service Has No Opt-Out Check

**File:** `backend/src/services/sms.service.ts`

The email service checks `lead.emailOptIn` before sending. The SMS service does not check any opt-in status:

```typescript
// email.service.ts ✓
if (lead && !lead.emailOptIn) {
  return { success: false, error: 'Lead has opted out of emails' };
}

// sms.service.ts ✗ — No equivalent check exists
```

This is a compliance risk. Any lead can be texted regardless of consent status.

---

## 21. SMS Mock Mode Returns DELIVERED Status

**File:** `backend/src/services/sms.service.ts` (mock send function)

When Twilio is not configured, the service runs in mock mode:
```typescript
// SMS mock: returns 'DELIVERED'
status: 'DELIVERED'

// Email mock: returns 'PENDING'  
status: 'PENDING'
```

SMS mock falsely marks messages as delivered, inflating delivery metrics. Should return `'PENDING'` like email mock does.

---

## 22. Hardcoded Organization Fallback ID

**Files:** `backend/src/services/email.service.ts`, `backend/src/services/sms.service.ts`

```typescript
organizationId: options?.organizationId || 'clz0000000000000000000000'
```

If `organizationId` is undefined, messages get assigned to a hardcoded fallback ID. In a multi-tenant system, this means messages from different organizations could end up under the same org, breaking data isolation.

---

## 23. SMS Webhook Has No Signature Verification

**File:** `backend/src/services/sms.service.ts` (webhook handler)

Twilio delivery status webhooks are accepted without verifying the `X-Twilio-Signature` header. Anyone who discovers the webhook URL can fake delivery status updates.

---

# Priority Action Plan

### Do First (Quick wins, high impact)

These can all be done in a single PR. Estimated total: a few focused sessions of work.

| # | Fix | What to Change |
|---|-----|---------------|
| 1 | Channel badge in conversation header | Add `<Badge>` with type icon next to contact name in `ConversationView.tsx` |
| 4 | Channel-aware reply placeholder | Change `"Type your reply..."` to channel-specific text in `ConversationView.tsx` |
| 5 | Channel-labeled send button | Add text label + color to send button in `ConversationView.tsx` |
| 2 | Fix AI Composer channel source | Change `selectedChannel` → `selectedThread?.type` in `ConversationView.tsx` |
| 3 | Compose modal default matches channel | Change `useState('sms')` → use `selectedChannel` in `CommunicationInbox.tsx` |
| 8 | Clear draft on thread switch | Add `setReplyText('')` to `handleSelectThread` in `CommunicationInbox.tsx` |
| 7 | Disable reply for call threads | Gate reply box with `selectedThread.type !== 'call'` in `ConversationView.tsx` |
| 13 | Show SMS delivery status | Remove `message.type === 'email'` gate, show status for all types in `ConversationView.tsx` |
| 15 | Hide Forward for non-email | Conditionally show Forward button only for email threads in `ConversationView.tsx` |

### Do Second (Medium effort, important)

| # | Fix | What to Build |
|---|-----|--------------|
| 11 | Fix SMS character counter | Replace `/ 160` with segment counter + cost warning in `ComposeModal.tsx` and reply box |
| 12 | Channel-adaptive reply toolbar | Load SMS templates for SMS threads, hide irrelevant tools per channel |
| 14 | Wire AISMSComposer into inbox | When `selectedThread.type === 'sms'`, render `AISMSComposer` instead of generic `AIComposer` |
| 10 | Upgrade compose modal | Add template picker, AI button, emoji, and attachment support to `ComposeModal.tsx` |
| 17 | Add SMS Templates to sub-nav | Add link to sub-nav bar |
| 19 | Fix backend replyToMessage | Check `direction` to resolve correct recipient |

### Do Third (Larger features)

| # | Fix | What to Build |
|---|-----|--------------|
| 9 | SMS Template management page | New page at `/communication/sms-templates` with body editor, char counter, variable insertion |
| 16 | SMS opt-out/compliance | Lead SMS consent field, STOP keyword detection, sending gate, UI indicators |
| 20 | Backend SMS opt-out check | Add opt-in check to `sms.service.ts` matching email service |

### Phase 2 (Larger rework)

| # | Fix | What to Build |
|---|-----|--------------|
| 18 | Unified contact threading | Merge threads for same lead across channels into one conversation view |

---

# Full Severity Table

| # | Issue | Severity | Effort | File(s) |
|---|-------|----------|--------|---------|
| 1 | No channel badge in conversation header | **High** | Low | `ConversationView.tsx` |
| 2 | AI Composer uses `selectedChannel` not thread type | **High** | Low | `ConversationView.tsx` |
| 3 | Compose modal defaults to SMS always | **Medium** | Low | `CommunicationInbox.tsx` |
| 4 | Reply placeholder is generic | **Medium** | Low | `ConversationView.tsx` |
| 5 | Send button has no channel label | **Medium** | Low | `ConversationView.tsx` |
| 6 | No channel badge in conversation header | **High** | Low | `ConversationView.tsx` |
| 7 | Call threads have broken reply box | **High** | Low | `CommunicationInbox.tsx` |
| 8 | Reply draft leaks between threads | **High** | Low | `CommunicationInbox.tsx` |
| 9 | No SMS template management page | **High** | Medium | New page |
| 10 | Compose modal lacks templates/AI | **High** | Medium | `ComposeModal.tsx` |
| 11 | SMS char counter misleading | **Medium** | Low | `ComposeModal.tsx` |
| 12 | Reply box doesn't adapt to channel | **High** | Medium | `ConversationView.tsx` |
| 13 | No SMS delivery status in UI | **High** | Low | `ConversationView.tsx` |
| 14 | AISMSComposer unused in inbox | **Medium** | Low | `ConversationView.tsx` |
| 15 | Forward always sends email | **Medium** | Low | `CommunicationInbox.tsx` |
| 16 | No SMS opt-out/compliance UI | **Critical** | Medium | Multiple files |
| 17 | Sub-nav is email-centric | **Medium** | Low | `CommunicationInbox.tsx` |
| 18 | Same lead = separate threads per channel | **Low** | High | Backend + Frontend |
| 19 | Backend replyToMessage direction bug | **High** | Low | `message.controller.ts` |
| 20 | SMS service has no opt-out check | **Critical** | Low | `sms.service.ts` |
| 21 | SMS mock mode returns DELIVERED | **Medium** | Low | `sms.service.ts` |
| 22 | Hardcoded organization fallback ID | **High** | Low | `email.service.ts`, `sms.service.ts` |
| 23 | SMS webhook no signature verification | **Medium** | Medium | `sms.service.ts` |

---

# PART 5 — DATA, PERFORMANCE & BROKEN FEATURES (New Findings)

These issues were discovered in a second pass, going deeper into backend logic, pagination, search, attachments, and features that appear functional but don't actually work end-to-end.

---

## 24. Backend `getMessages` Ignores Date Range and Sort Params

**File:** `backend/src/controllers/message.controller.ts` (line 16)

The validator (`messageQuerySchema`) defines `startDate`, `endDate`, `sortBy`, and `sortOrder` parameters. But `getMessages` only destructures:

```tsx
const { type, direction, status, leadId, search, page = 1, limit = 50 } = req.query
```

The four other validated params are silently discarded. The backend always sorts by `createdAt desc`.

**Impact:** The FilterModal's date range filters go to the backend but have no effect there — threads are only date-filtered client-side against whatever page of data was returned. Sort customization doesn't work at all.

**Fix:** Destructure `startDate`/`endDate` and apply to `where.createdAt: { gte, lte }`. Use `sortBy`/`sortOrder` in the `orderBy`.

---

## 25. Backend Hardcodes `starred: false` on Every Message

**File:** `backend/src/controllers/message.controller.ts` (line ~159)

```tsx
thread.messages.push({
  // ...
  starred: false,   // ← Always false, ignores actual DB value
  status: message.status.toLowerCase(),
  // ...
})
```

The `message.starred` database column is never read when constructing the thread response.

**Impact:** Star status is lost on every page load. The "Starred" folder will be empty after a refresh. Users can star a thread, but the star disappears when they navigate away and come back.

**Fix:** Change to `starred: message.starred ?? false`.

---

## 26. Pagination Replaces Data Instead of Appending

**File:** `src/pages/communication/CommunicationInbox.tsx` (lines 107–173)

The `queryKey` includes `inboxPage`:
```tsx
queryKey: ['communication-threads', searchQuery, inboxPage],
```

When clicking "Load More" (incrementing `inboxPage`), React Query creates a new cache entry for page 2. The `useEffect` on line 173 then sets `threads` to just the new page's results. Previous threads disappear.

**Impact:** "Load More" effectively becomes "Go to next page" — users lose visibility of all previous threads. This is a data loss UX bug.

**Fix:** Use `useInfiniteQuery` from TanStack, or manually merge new page data into existing state.

---

## 27. Double-Filtering: Search Applied Server-Side AND Client-Side

**File:** `src/pages/communication/CommunicationInbox.tsx` (lines 107, 198–199)

`searchQuery` is sent to the backend as `params.search`, which searches `subject`, `body`, `fromAddress`, `toAddress`. The returned threads are then *also* filtered client-side:

```tsx
const matchesSearch = thread.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
                     thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
```

This searches `contact` and `lastMessage` — different fields from the backend. A thread found by subject/body search on the backend but not matching `contact`/`lastMessage` will be fetched then silently dropped.

**Impact:** Search results are inconsistent. Searching for a keyword in an email subject will match on the server but get filtered out on the client.

**Fix:** Remove the client-side `matchesSearch` filter when `searchQuery` is sent to the backend, or align the field sets.

---

## 28. Inbox Folder Shows Archived and Trashed Threads

**File:** `src/pages/communication/CommunicationInbox.tsx` (lines 190–195)

The `filteredThreads` logic:
```tsx
if (selectedFolder === 'unread' && thread.unread === 0) return false
if (selectedFolder === 'starred' && !thread.messages.some(m => m.starred)) return false
// ... etc
```

When `selectedFolder === 'inbox'` (the default), **no filter is applied** — archived and trashed messages remain visible alongside active ones.

**Impact:** Users see deleted/archived threads in their inbox, defeating the purpose of archiving/trashing.

**Fix:** Add: `if (selectedFolder === 'inbox' && thread.messages.some(m => m.archived || m.trashed)) return false`

---

## 29. Backend `getMessages` Doesn't Filter Out Archived/Trashed

**File:** `backend/src/controllers/message.controller.ts` (lines 14–78)

The backend query doesn't exclude archived, trashed, or actively-snoozed messages. All messages are returned regardless of state. The frontend then filters client-side, but only for the current page of 25 threads.

**Impact:** If you have 900 archived messages and 100 active ones, the API's `maxFetch` of 1000 mostly returns archived threads. Active threads may be pushed out of the result set.

**Fix:** Accept a `folder` query parameter and apply appropriate `where` conditions (e.g., exclude archived/trashed for the "inbox" folder).

---

## 30. Sidebar Unread Counts Based on Current Page Only

**File:** `src/pages/communication/inbox/ChannelSidebar.tsx` (lines 30–33)

```tsx
const totalUnread = threads.reduce((acc, t) => acc + t.unread, 0)
const emailUnread = threads.filter(t => t.type === 'email').reduce((acc, t) => acc + t.unread, 0)
```

The sidebar counts iterate over the `threads` prop — at most 25 threads from the current page. A backend `/messages/stats` endpoint exists but is never used for sidebar counts.

**Impact:** A user with 100 unread messages across 200 threads will only see the count from the first 25. Misleading.

**Fix:** Use `messagesApi.getStats()` to fetch real unread counts from the backend.

---

## 31. `deleteMessage` Performs Hard Delete — "Trash" Is Permanent

**File:** `backend/src/controllers/message.controller.ts` (lines 525–533)

```tsx
await prisma.message.delete({
  where: { id },
})
```

The frontend labels this "Move to trash" and shows a "Trash" folder in the sidebar. But the backend actually performs a permanent, irrecoverable hard delete.

**Impact:** Users clicking "Delete" / "Move to trash" permanently lose messages with no recovery. The trash folder UX is a lie.

**Fix:** Implement soft-delete (set a `deletedAt` timestamp or `trashed: true` flag) and filter these out of normal queries.

---

## 32. Snooze Is Write-Only — Snoozed Threads Never Reappear

**File:** `src/pages/communication/CommunicationInbox.tsx` (lines 360–370)

Snoozing sets `snoozedUntil` in the database and local state. But there is:
- No cron job or background task to un-snooze messages when time expires
- No client-side check on each fetch to surface expired snoozes
- No filter in `getMessages` that re-surfaces snoozed messages

**Impact:** Snoozed messages disappear permanently. The feature is broken end-to-end.

**Fix:** Add server-side cron to clear `snoozedUntil` for expired snoozes, or add client-side logic to check snooze expiry on each fetch.

---

## 33. Attachments Uploaded But Never Actually Sent With Emails

**File:** `src/pages/communication/CommunicationInbox.tsx` (line 413), `src/pages/communication/inbox/AttachmentModal.tsx`

The `AttachmentModal` uploads files to `POST /messages/attachments` (stored at `/tmp/uploads`). It also stores `File` objects in `pendingAttachments`. These are passed as `attachments` in `messagesApi.sendEmail()`.

Problem: The API call sends JSON (`api.post('/messages/email', data)`), but `File` objects cannot be serialized to JSON. The backend `sendEmailSchema` expects `{ filename, content, contentType }` objects. Meanwhile, the `sendEmail` controller doesn't even destructure `attachments`:

```tsx
const { to, subject, body, leadId, templateId, templateVariables, threadId } = req.body
// ← cc, bcc, attachments all ignored
```

**Impact:** Users attach files, see the upload toast, but the email arrives without any attachments. The entire attachment flow is broken.

**Fix:** After `uploadAttachment`, store the returned metadata. Convert file content to base64 or use the uploaded file path. Destructure `attachments` in the controller and pass to `sendEmailService`.

---

## 34. Backend `sendEmail` Controller Ignores `cc`, `bcc`, and `attachments`

**File:** `backend/src/controllers/message.controller.ts` (lines 268–278)

The validator accepts `cc`, `bcc`, and `attachments` fields, but the controller destructures only:

```tsx
const { to, subject, body, leadId, templateId, templateVariables, threadId } = req.body
```

CC, BCC, and attachments from the request body are completely ignored even if properly sent.

**Impact:** CC/BCC functionality doesn't work via the API. Attachment sending is broken (related to #33).

**Fix:** Destructure `cc`, `bcc`, `attachments` and pass them through to `sendEmailService`.

---

## 35. Reply Input Is Single-Line — Can't Write Multi-Paragraph Replies

**File:** `src/pages/communication/inbox/ConversationView.tsx` (lines ~517–524)

```tsx
<Input
  placeholder="Type your reply..."
  value={replyText}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendReply()
    }
  }}
/>
```

The reply box is an `<Input>` element (single-line). Enter sends immediately. There's no way to write multi-paragraph email replies.

**Impact:** For email threads, this is severely limiting. Agents writing detailed responses to leads can't create newlines. For SMS, single-line is more acceptable (but still limiting for longer messages).

**Fix:** Replace with `<textarea>` that supports Shift+Enter for newlines and Enter to send. Adjust styling to grow vertically with content.

---

## 36. Email Templates Library "Use" Goes to Campaigns, Not Compose

**File:** `src/pages/communication/EmailTemplatesLibrary.tsx` (line ~340)

```tsx
<Button onClick={() => navigate(`/campaigns/create?type=email&templateId=${template.id}...`)}>
  <Send className="h-4 w-4 mr-1" />
  Use
</Button>
```

The "Use" button navigates to `/campaigns/create` — the campaign creation flow. There's no way to insert an email template into the inbox compose modal for 1-on-1 communication.

**Impact:** Templates are only usable for bulk campaigns, not for individual email conversations. The template library feels disconnected from the inbox.

**Fix:** Add an option to insert the template body into the compose modal or reply box (e.g., "Use in Compose" button that opens the compose modal with the template pre-filled).

---

## 37. Email Templates "Recently Used" Section Is Static Placeholder

**File:** `src/pages/communication/EmailTemplatesLibrary.tsx` (lines ~440–447)

```tsx
<Card>
  <CardHeader>
    <CardTitle>Recently Used</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">No recently used templates yet.</p>
  </CardContent>
</Card>
```

Always shows "No recently used templates yet" regardless of actual usage. The template data includes `usageCount` and `lastUsedAt` fields, but they're never used to populate this section.

**Impact:** A feature that looks functional but does nothing. Users may expect to find their recently used templates here.

**Fix:** Sort templates by `lastUsedAt` desc and show the top N with non-null `lastUsedAt`.

---

## 38. Email Template Settings Are Saved But Never Consumed

**File:** `src/pages/communication/EmailTemplatesLibrary.tsx` (lines 50–67)

Template settings (default font, primary color, logo URL, tracking toggles) are saved to `/api/settings/email-template-defaults` via a PUT request. But nothing reads these settings when actually composing or sending emails. The template editor and email service don't reference them.

**Impact:** Users configure settings (font, color, logo) that have no downstream effect. False sense of control.

**Fix:** Apply these settings when rendering templates or creating new template defaults.

---

## 39. Star/Archive/Delete Sends N API Calls for N Messages in Thread

**File:** `src/pages/communication/CommunicationInbox.tsx` (lines 311–320)

```tsx
await Promise.all(thread.messages.map(m => messagesApi.starMessage(String(m.id), !isStarred)))
```

Starring, archiving, or deleting a thread sends one API request per message. A thread with 50 messages sends 50 parallel requests.

**Impact:** Performance degradation, potential rate limiting, and risk of partial failures (some messages starred, others not).

**Fix:** Add bulk endpoints (`POST /messages/bulk-star`, `POST /messages/bulk-archive`, etc.) that accept an array of message IDs.

---

## 40. Reply Route Missing Rate Limiting

**File:** `backend/src/routes/message.routes.ts` (lines 204–208)

```tsx
router.post(
  '/:id/reply',
  validateBody(replyToMessageSchema),   // ✓ validation
  asyncHandler(replyToMessage)          // ✗ no messageSendLimiter
)
```

The `POST /:id/reply` route has body validation but no `messageSendLimiter` middleware, unlike `sendEmail`/`sendSMS`/`makeCall` which all have it.

**Impact:** A malicious or buggy client can spam replies without rate limiting, exhausting SendGrid/Twilio quotas and running up costs.

**Fix:** Add `messageSendLimiter` middleware to the reply route.

---

## 41. Star/Archive/Snooze Routes Missing Body & Params Validation

**File:** `backend/src/routes/message.routes.ts` (lines 172–260)

`PATCH /:id/read`, `PATCH /:id/unread`, `PATCH /:id/star`, `PATCH /:id/archive`, `PATCH /:id/snooze` have no `validateBody` or `validateParams` middleware. The `:id` parameter is not validated as a CUID.

**Impact:** Malformed IDs pass through to Prisma (ugly error), and arbitrary body fields are accepted without validation.

**Fix:** Add `validateParams(messageIdSchema)` to all `:id` routes and `validateBody` for `star`, `archive`, `snooze`.

---

## 42. Forward Dialog Doesn't Validate Email Format

**File:** `src/pages/communication/CommunicationInbox.tsx` (lines 443–457)

`handleForwardConfirm` only checks `!forwardEmail.trim()`:

```tsx
const handleForwardConfirm = async () => {
  if (!forwardEmail.trim() || !selectedThread) return
  // ... sends to forwardEmail.trim() — no format validation
}
```

**Impact:** Users can forward to invalid addresses like "notanemail", which fails at the backend with a vague error instead of inline validation.

**Fix:** Add client-side email format validation before sending.

---

## 43. Compose Modal Doesn't Reset Type on Re-Open

**File:** `src/pages/communication/CommunicationInbox.tsx` (line 78)

`composeType` is initialized to `'sms'` and never reset when the compose modal is re-opened. If a user composed an email last time and closed, the next compose still shows email (because `composeType` was changed to `'email'` but never reset).

**Impact:** The compose channel is sticky in a confusing way. Combined with #3, the type is never predictable from the user's perspective.

**Fix:** Reset `composeType` based on `selectedChannel` when opening the compose modal:
```tsx
onClick={() => {
  setComposeType(selectedChannel === 'sms' ? 'sms' : selectedChannel === 'call' ? 'call' : 'email')
  setShowComposeModal(true)
}}
```

---

## 44. Email Body Rendered as Plain Text — HTML Tags Visible

**File:** `src/pages/communication/inbox/ConversationView.tsx` (line ~252)

```tsx
<p className="text-sm whitespace-pre-wrap">{message.body}</p>
```

If an email contains HTML (which most emails do — the backend stores HTML as `body`), users see raw tags: `<div><p>Hello</p></div>` instead of formatted content.

**Impact:** Received HTML emails are unreadable. Email template previews in `EmailTemplatesLibrary.tsx` correctly use DOMPurify + `dangerouslySetInnerHTML`, but the inbox conversation view does not.

**Fix:** For email-type messages, render with `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.body) }}`. For SMS, keep plain text.

---

## 45. "All Messages" Sidebar Button Resets Folder, Other Channel Buttons Don't

**File:** `src/pages/communication/inbox/ChannelSidebar.tsx` (line 43)

```tsx
onClick={() => { onSelectChannel('all'); onSelectFolder('inbox') }}  // Resets folder
```

But specific channel buttons (Email, SMS, Calls) don't reset the folder:
```tsx
onClick={() => onSelectChannel('email')}  // Keeps current folder
```

**Impact:** If you're in "Starred" folder, click "SMS" (stays Starred+SMS), then click "All Messages" — you silently jump to inbox, losing your folder context.

**Fix:** Either reset folder for all channel buttons, or don't reset for any.

---

## 46. Filter Date Comparison Uses Timezone-Naive Parsing

**File:** `src/pages/communication/CommunicationInbox.tsx` (lines 205–210)

```tsx
if (filters.dateFrom) {
  const threadDate = new Date(thread.messages[thread.messages.length - 1]?.timestamp || 0)
  if (threadDate < new Date(filters.dateFrom)) return false
}
```

`new Date(filters.dateFrom)` parses an HTML date input (`YYYY-MM-DD`) as UTC midnight, but `thread.messages[...].timestamp` is an ISO string from the server (UTC). Depending on the user's timezone offset, threads from the same calendar day may be incorrectly excluded.

**Impact:** Date filters may miss threads or include wrong ones depending on the user's timezone.

**Fix:** Normalize both dates using `startOfDay`/`endOfDay` in the user's local timezone before comparison.

---

## 47. No Communication State Store — All State Lost on Navigation

**File:** `src/pages/communication/CommunicationInbox.tsx` (lines 49–100)

The inbox has 30+ `useState` hooks managing all communication state locally. There's no Zustand store (unlike auth which uses `authStore`). 

**Impact:** Navigating away from the inbox tab (e.g., to view a lead profile) and coming back resets everything — selected thread, filters, search query, page number, draft text. Users lose all context on any navigation.

**Fix:** Move critical state (selectedThread, selectedChannel, selectedFolder, filters, searchQuery, page) to a Zustand store or use URL search params.

---

## 48. Backend `getMessages` Loads All Messages Into Memory for Threading

**File:** `backend/src/controllers/message.controller.ts` (lines 58–64)

```tsx
const maxFetch = Math.max(limitNum * 20, 1000)
const messages = await prisma.message.findMany({
  where,
  take: maxFetch,
  // ...
})
```

Fetches up to 1000+ messages in a single query, groups them into threads in-memory with a `Map`, then paginates the result. For organizations with tens of thousands of messages, this will cause high memory usage and slow responses.

**Impact:** Performance degradation at scale. Potential OOM crashes for high-volume inboxes.

**Fix:** Implement cursor-based pagination, or use SQL `GROUP BY` / distinct thread queries instead of in-memory grouping.

---

## 49. Reply Body Has No Max Length Validation

**File:** `backend/src/validators/message.validator.ts` (lines 83–86)

```tsx
export const replyToMessageSchema = z.object({
  body: z.string().min(1, 'Reply body is required'),
  // ... no .max() limit
})
```

A reply can have an arbitrarily large body (megabytes), potentially causing database bloat or SendGrid/Twilio API failures.

**Impact:** No size limit on replies; potential for abuse or accidental massive payloads.

**Fix:** Add `.max(50000)` or a similar reasonable limit.

---

## 50. Newsletter & Social Media Pages Exist But Are Unreachable From Communications

**File:** `src/App.tsx` (lines 221–222), `src/pages/communication/CommunicationInbox.tsx` (sub-nav)

Routes exist:
- `/communication/social` → `SocialMediaDashboard` (Coming Soon)
- `/communication/newsletter` → `NewsletterManagement` (Coming Soon)

But the sub-nav in `CommunicationInbox.tsx` only shows: **Inbox | Email Templates | Cold Call Hub**

These pages also don't appear in the main sidebar navigation. The only way to reach them is by typing the URL.

**Impact:** Features that exist are completely undiscoverable by users.

**Fix:** Add them to the sub-nav (with a "Coming Soon" badge), or add them to the main sidebar under Communications.

---

# Updated Priority Action Plan

### Do First (Quick wins, high impact)

| # | Fix | What to Change |
|---|-----|---------------|
| 1 | Channel badge in conversation header | Add `<Badge>` with type icon next to contact name |
| 4 | Channel-aware reply placeholder | Change `"Type your reply..."` to channel-specific text |
| 5 | Channel-labeled send button | Add text label + color to send button |
| 2 | Fix AI Composer channel source | Change `selectedChannel` → `selectedThread?.type` |
| 3 | Compose modal default matches channel | Change `useState('sms')` → use `selectedChannel` |
| 8 | Clear draft on thread switch | Add `setReplyText('')` to `handleSelectThread` |
| 7 | Disable reply for call threads | Gate reply box with `selectedThread.type !== 'call'` |
| 13 | Show SMS delivery status | Remove `message.type === 'email'` gate |
| 15 | Hide Forward for non-email | Conditionally show Forward button |
| **25** | **Fix starred always false** | **Change `starred: false` → `starred: message.starred ?? false`** |
| **28** | **Fix inbox folder filtering** | **Exclude archived/trashed from inbox view** |
| **42** | **Forward email validation** | **Add email format check before API call** |
| **43** | **Reset compose type on open** | **Set compose type based on selectedChannel** |
| **45** | **Fix sidebar folder reset inconsistency** | **Align channel button behavior** |

### Do Second (Medium effort, important)

| # | Fix | What to Build |
|---|-----|--------------|
| 11 | Fix SMS character counter | Segment counter + cost warning |
| 12 | Channel-adaptive reply toolbar | Load SMS templates for SMS threads |
| 14 | Wire AISMSComposer into inbox | Swap in SMS composer for SMS threads |
| 10 | Upgrade compose modal | Add template picker, AI button, emoji |
| 17 | Add SMS Templates to sub-nav | Add link to sub-nav bar |
| 19 | Fix backend replyToMessage | Check `direction` to resolve correct recipient |
| **24** | **Backend: apply date/sort params** | **Destructure and apply in getMessages** |
| **27** | **Fix double-filtering in search** | **Remove client-side filter when backend search is active** |
| **31** | **Implement soft-delete** | **Replace `prisma.message.delete()` with `deletedAt` flag** |
| **33** | **Fix attachment flow** | **Wire upload metadata to sendEmail** |
| **34** | **Pass cc/bcc/attachments in controller** | **Destructure and forward to email service** |
| **35** | **Replace Input with textarea for replies** | **Enable multi-line email replies** |
| **39** | **Add bulk star/archive/delete endpoints** | **Single API call for thread operations** |
| **40** | **Add rate limiter to reply route** | **Add messageSendLimiter middleware** |
| **44** | **Render HTML emails properly** | **DOMPurify + dangerouslySetInnerHTML for email type** |

### Do Third (Larger features)

| # | Fix | What to Build |
|---|-----|--------------|
| 9 | SMS Template management page | New page with body editor, char counter, variable insertion |
| 16 | SMS opt-out/compliance | Lead consent field, STOP detection, sending gate |
| 20 | Backend SMS opt-out check | Add opt-in check to `sms.service.ts` |
| **26** | **Fix pagination (useInfiniteQuery)** | **Accumulate pages instead of replacing** |
| **29** | **Backend folder filtering** | **Add folder param to exclude archived/trashed** |
| **30** | **Sidebar uses backend stats** | **Fetch real unread counts from /messages/stats** |
| **32** | **Fix snooze end-to-end** | **Add cron job to un-snooze expired messages** |
| **36** | **Template "Use" goes to compose** | **Option to insert template into compose modal** |
| **47** | **Communication state Zustand store** | **Persist selected thread, filters, page on navigation** |
| **48** | **Backend: cursor-based pagination** | **Replace in-memory threading with SQL grouping** |

### Phase 2 (Larger rework)

| # | Fix | What to Build |
|---|-----|--------------|
| 18 | Unified contact threading | Merge threads for same lead across channels |

---

# Full Severity Table

| # | Issue | Severity | Effort | File(s) |
|---|-------|----------|--------|---------|
| 1 | No channel badge in conversation header | **High** | Low | `ConversationView.tsx` |
| 2 | AI Composer uses `selectedChannel` not thread type | **High** | Low | `ConversationView.tsx` |
| 3 | Compose modal defaults to SMS always | **Medium** | Low | `CommunicationInbox.tsx` |
| 4 | Reply placeholder is generic | **Medium** | Low | `ConversationView.tsx` |
| 5 | Send button has no channel label | **Medium** | Low | `ConversationView.tsx` |
| 6 | No channel badge in conversation header | **High** | Low | `ConversationView.tsx` |
| 7 | Call threads have broken reply box | **High** | Low | `CommunicationInbox.tsx` |
| 8 | Reply draft leaks between threads | **High** | Low | `CommunicationInbox.tsx` |
| 9 | No SMS template management page | **High** | Medium | New page |
| 10 | Compose modal lacks templates/AI | **High** | Medium | `ComposeModal.tsx` |
| 11 | SMS char counter misleading | **Medium** | Low | `ComposeModal.tsx` |
| 12 | Reply box doesn't adapt to channel | **High** | Medium | `ConversationView.tsx` |
| 13 | No SMS delivery status in UI | **High** | Low | `ConversationView.tsx` |
| 14 | AISMSComposer unused in inbox | **Medium** | Low | `ConversationView.tsx` |
| 15 | Forward always sends email | **Medium** | Low | `CommunicationInbox.tsx` |
| 16 | No SMS opt-out/compliance UI | **Critical** | Medium | Multiple files |
| 17 | Sub-nav is email-centric | **Medium** | Low | `CommunicationInbox.tsx` |
| 18 | Same lead = separate threads per channel | **Low** | High | Backend + Frontend |
| 19 | Backend replyToMessage direction bug | **High** | Low | `message.controller.ts` |
| 20 | SMS service has no opt-out check | **Critical** | Low | `sms.service.ts` |
| 21 | SMS mock mode returns DELIVERED | **Medium** | Low | `sms.service.ts` |
| 22 | Hardcoded organization fallback ID | **High** | Low | `email.service.ts`, `sms.service.ts` |
| 23 | SMS webhook no signature verification | **Medium** | Medium | `sms.service.ts` |
| 24 | Backend ignores date/sort query params | **Medium** | Low | `message.controller.ts` |
| 25 | Backend hardcodes `starred: false` | **High** | Low | `message.controller.ts` |
| 26 | Pagination replaces data instead of appending | **High** | Medium | `CommunicationInbox.tsx` |
| 27 | Double-filtering breaks search results | **High** | Low | `CommunicationInbox.tsx` |
| 28 | Inbox folder shows archived/trashed threads | **High** | Low | `CommunicationInbox.tsx` |
| 29 | Backend doesn't filter archived/trashed | **Medium** | Low | `message.controller.ts` |
| 30 | Sidebar counts only from current page | **Medium** | Low | `ChannelSidebar.tsx` |
| 31 | Delete is hard-delete, not soft-delete | **Critical** | Medium | `message.controller.ts` |
| 32 | Snooze never un-snoozes | **High** | Medium | Backend + Frontend |
| 33 | Attachments uploaded but never sent | **Critical** | Medium | `CommunicationInbox.tsx`, `message.controller.ts` |
| 34 | Backend ignores cc/bcc/attachments | **High** | Low | `message.controller.ts` |
| 35 | Reply input is single-line | **High** | Low | `ConversationView.tsx` |
| 36 | Template "Use" goes to campaigns only | **Medium** | Low | `EmailTemplatesLibrary.tsx` |
| 37 | "Recently Used" section is static | **Low** | Low | `EmailTemplatesLibrary.tsx` |
| 38 | Template settings saved but never consumed | **Low** | Medium | `EmailTemplatesLibrary.tsx` |
| 39 | Star/archive/delete: N API calls per thread | **Medium** | Medium | `CommunicationInbox.tsx`, Backend |
| 40 | Reply route missing rate limiter | **Medium** | Low | `message.routes.ts` |
| 41 | Star/archive/snooze routes missing validation | **Medium** | Low | `message.routes.ts` |
| 42 | Forward dialog no email validation | **Low** | Low | `CommunicationInbox.tsx` |
| 43 | Compose type doesn't reset on re-open | **Medium** | Low | `CommunicationInbox.tsx` |
| 44 | HTML emails displayed as raw tags | **Critical** | Low | `ConversationView.tsx` |
| 45 | Sidebar "All Messages" resets folder inconsistently | **Low** | Low | `ChannelSidebar.tsx` |
| 46 | Date filter timezone mismatch | **Low** | Low | `CommunicationInbox.tsx` |
| 47 | No state store — navigation resets everything | **High** | Medium | `CommunicationInbox.tsx` |
| 48 | Backend threads all messages in memory | **Medium** | High | `message.controller.ts` |
| 49 | Reply body has no max length | **Medium** | Low | `message.validator.ts` |
| 50 | Newsletter & Social Media pages unreachable | **Low** | Low | `CommunicationInbox.tsx` |

---

## Key Takeaway

The **backend is ahead of the frontend** — SMS services, templates, validators, and configuration are well-built. The gap is in the UI, which treats SMS as a second-class channel.

But also: the **most dangerous issues are in the UX**, not the backend. An agent who sends an email-length message as a 10-segment SMS because the reply box didn't tell them what channel they were on — that's real money wasted and a bad impression on the lead. The sending ambiguity (#1-#8) should be the first thing fixed.

**New critical findings from the second pass:**
- **#25 (starred always false)** and **#31 (hard delete)** mean user actions (starring, trashing) don't persist properly
- **#33 (attachments broken)** is a complete feature failure — users think files are attached but they aren't
- **#44 (HTML emails raw)** makes every HTML email unreadable in the inbox
- **#26 (pagination)** and **#27 (double-filter)** make the inbox unreliable for users with many conversations
- **#32 (snooze broken)** is a feature that writes data but never reads it back
- **#47 (no state store)** means every tab switch wipes the user's context
