# Orphaned Pages Plan

**Created:** February 28, 2026
**Status:** Not started

These are pages that have routes in App.tsx but no navigation link to reach them. Users can only find them by typing the URL directly.

---

## AI Hub — 3 orphans

| Page | Action | Detail | Status |
|---|---|---|---|
| **Segmentation** | **Wire** | Add nav card on AIHub → `/ai/segmentation` | ⬜ |
| **ModelTraining** | **Delete** | LeadScoring's training tab already covers this | ⬜ |
| **AIAnalytics** | **Wire** | Add nav card on AIHub → `/ai/analytics` | ⬜ |

## Analytics — 4 orphans

| Page | Action | Detail | Status |
|---|---|---|---|
| **ConversionReports** | **Wire** | Add nav card on AnalyticsDashboard → `/analytics/conversions` | ⬜ |
| **UsageAnalytics** | **Wire** | Add nav card on AnalyticsDashboard → `/analytics/usage` | ⬜ |
| **CustomReports** | **Wire** | Add nav card on AnalyticsDashboard → `/analytics/custom-reports` | ⬜ |
| **ReportBuilder** | **Merge** | Combine into CustomReports as a second tab ("Saved Reports" + "Report Builder") | ⬜ |

## Communication — 5 orphans

| Page | Action | Detail | Status |
|---|---|---|---|
| **EmailTemplatesLibrary** | **Wire** | Add sub-nav link from CommunicationInbox → `/communication/templates` | ⬜ |
| **SMSCenter** | **Delete** | ~70% overlap with Inbox's SMS view. Not worth a separate page. | ⬜ |
| **CallCenter** | **Wire** | Add sub-nav link from CommunicationInbox → `/communication/call-center` | ⬜ |
| **SocialMediaDashboard** | **Leave hidden** | "Coming Soon" stub, all buttons disabled | ⬜ |
| **NewsletterManagement** | **Leave hidden** | "Coming Soon" stub, all buttons disabled | ⬜ |

## Settings — 6 orphans + 1 dead file

| Page | Action | Detail | Status |
|---|---|---|---|
| **TeamManagement** | **Upgrade admin version** | Replace admin/TeamManagementPage.tsx (234 lines, TODOs) with settings/TeamManagement.tsx code (635 lines, real API) at the existing `/admin/team` sidebar link. Delete the weaker file. | ⬜ |
| **EmailConfiguration** | **Wire** | Link from IntegrationsHub email card → `/settings/email` | ⬜ |
| **ComplianceSettings** | **Wire** | Add new card on SettingsHub → `/settings/compliance` | ⬜ |
| **GoogleIntegration** | **Wire** | Link from IntegrationsHub Google card → `/settings/google` | ⬜ |
| **TwilioSetup** | **Wire** | Link from IntegrationsHub Twilio card → `/settings/twilio` | ⬜ |
| **DemoDataGenerator** | **Leave hidden** | All setTimeout simulations, no real API | ⬜ |
| **Integrations.tsx** | **Port then delete** | Move real API status-check logic into IntegrationsHub, then delete file | ⬜ |

## Admin — 5 orphans

| Page | Action | Detail | Status |
|---|---|---|---|
| **SystemSettings** | **Wire** | Add quick action on AdminPanel → `/admin/system` | ⬜ |
| **UserManagementDetail** | **Delete** | Zero API calls, hardcoded "John Doe", doesn't use route param | ⬜ |
| **DataExportWizard** | **Wire** | Add quick action on AdminPanel → `/admin/export` | ⬜ |
| **RetryQueue** | **Wire** | Add quick action on AdminPanel → `/admin/retry-queue` | ⬜ |
| **DatabaseMaintenance** | **Replace BackupRestore** | Change AdminPanel's existing `/admin/backup` link to point to `/admin/database`. Delete BackupRestore.tsx (all fake). | ⬜ |

## Billing — 3 orphans

| Page | Action | Detail | Status |
|---|---|---|---|
| **InvoiceDetail** | **Keep unwired** | Zero API calls, doesn't use `:id` param. Wire only after building real invoice API. | ⬜ |
| **UsageDashboard** | **Delete** | Zero API calls, all hardcoded. BillingPage has real usage bars. | ⬜ |
| **UpgradeWizard** | **Delete** | Zero API calls, wrong prices. admin/Subscription.tsx is the real flow. | ⬜ |

## Help — 3 orphans

| Page | Action | Detail | Status |
|---|---|---|---|
| **DocumentationPages** | **Wire** | HelpCenter "Browse Docs" button → `/help/docs` | ⬜ |
| **SupportTicketSystem** | **Wire** | HelpCenter "Open Ticket" button → `/help/support` | ⬜ |
| **VideoTutorialLibrary** | **Wire** | HelpCenter "Watch Videos" button → `/help/videos` | ⬜ |

---

## Summary

| Action | Count | Pages |
|---|---|---|
| **Wire** | 16 | Segmentation, AIAnalytics, ConversionReports, UsageAnalytics, CustomReports, EmailTemplatesLibrary, CallCenter, EmailConfiguration, ComplianceSettings, GoogleIntegration, TwilioSetup, SystemSettings, DataExportWizard, RetryQueue, DocumentationPages, SupportTicketSystem, VideoTutorialLibrary |
| **Merge** | 1 | ReportBuilder → CustomReports (as tabs) |
| **Upgrade** | 1 | TeamManagement replaces admin/TeamManagementPage at existing sidebar link |
| **Replace** | 1 | DatabaseMaintenance replaces BackupRestore |
| **Port then delete** | 1 | Integrations.tsx → move real code into IntegrationsHub |
| **Delete** | 6 | ModelTraining, SMSCenter, UserManagementDetail, UsageDashboard, UpgradeWizard, BackupRestore |
| **Leave hidden** | 3 | SocialMediaDashboard, NewsletterManagement, DemoDataGenerator |
| **Keep unwired** | 1 | InvoiceDetail |

---

## Build Order

| Step | Task | Estimated Time | Status |
|---|---|---|---|
| 1 | **Help Center** — Wire 3 buttons (DocumentationPages, SupportTicketSystem, VideoTutorialLibrary) | 10 min | ⬜ |
| 2 | **Deletes** — Remove 6 files + clean up routes (ModelTraining, SMSCenter, UserManagementDetail, UsageDashboard, UpgradeWizard, BackupRestore) | 20 min | ⬜ |
| 3 | **AIHub** — Add 2 nav cards (Segmentation, AIAnalytics) | 15 min | ⬜ |
| 4 | **SettingsHub + IntegrationsHub** — Add ComplianceSettings card + 3 integration links (Email, Google, Twilio) + port Integrations.tsx logic | 30 min | ⬜ |
| 5 | **AdminPanel** — Add 3 quick actions (SystemSettings, DataExportWizard, RetryQueue) + swap BackupRestore → DatabaseMaintenance | 20 min | ⬜ |
| 6 | **AnalyticsDashboard** — Add 3 nav cards (ConversionReports, UsageAnalytics, CustomReports) | 15 min | ⬜ |
| 7 | **CommunicationInbox** — Add 2 sub-nav links (EmailTemplatesLibrary, CallCenter) | 15 min | ⬜ |
| 8 | **TeamManagement upgrade** — Replace admin/TeamManagementPage with settings/TeamManagement code | 30 min | ⬜ |
| 9 | **ReportBuilder → CustomReports merge** — Combine as tabs | 45 min | ⬜ |
