# Communications Hub — UI Improvement Plan

## 1. Consolidate Templates into Reply Toolbar

**Problem:** Redundant "Email Templates" and "SMS Templates" nav buttons in sub-header, plus a separate "Templates" dropdown in the reply toolbar.

**Fix:**
- Remove "Email Templates" and "SMS Templates" from the sub-navigation bar
- Upgrade the reply toolbar "Templates" dropdown to a 2-tab picker: **Email Templates** | **SMS Templates**
- Add a "Manage Templates →" link at the bottom of each tab that navigates to the full library page
- Single entry point: insert a template inline, or click through to manage

## 2. Simplify Sub-Navigation

**Problem:** "Inbox" button is redundant — you're already on the inbox page.

**Fix:**
- Remove "Inbox" button
- Sub-nav becomes a clean 2-tab bar: **Inbox** (active/current) | **Cold Call Hub**
- Leaves room for future pages while staying minimal

## 3. Reposition "Mark All Read"

**Problem:** Sits in the top header alongside "Compose New", cluttering it. It's a list action, not a page action.

**Fix:**
- Move into the ContactList toolbar, next to search/filter/bulk-select controls
- Show as a small icon button or text link: `✓✓ Mark all read`
- Groups it with the other list-management actions where it logically belongs

## 4. Improve Compose New Modal

**Problem:** Plain stacked form with no templates, no AI, and weak type selector.

**Fixes:**
- **Template picker** — Add "Use Template" button near message body, filtered by current type (email/SMS)
- **AI compose** — Add "✨ Generate with AI" button, reusing the existing AI composer
- **Better type selector** — Replace plain buttons with pill/card selectors showing icon + label + description:
  - 📧 **Email** — Send an email message
  - 💬 **SMS** — Send a text message
  - 📞 **Call Note** — Log a call note
- **Visual hierarchy** — Add section dividers or step flow: Choose Type → Select Recipient → Write Message → Send

## Summary

| Change | Impact | Complexity |
|--------|--------|------------|
| Templates dropdown becomes 2-tab picker with "Manage →" link | Removes 2 nav buttons, cleaner header | Medium |
| Sub-nav becomes 2-tab: Inbox \| Cold Call Hub | Simpler navigation | Low |
| Mark All Read moves to ContactList toolbar | Declutters header | Low |
| Compose modal: template picker + AI + better type selector | Much better compose UX | Medium |
