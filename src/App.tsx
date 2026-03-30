import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { AuthLayout } from './components/layout/AuthLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { RequireAdmin } from './components/auth/RequireRole'
import { PageErrorBoundary } from './components/PageErrorBoundary'
import { lazyWithRetry } from './lib/lazyWithRetry'

// Loading fallback for lazy components
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
)

// Dashboard (eagerly loaded - first page users see)
import Dashboard from './pages/dashboard/Dashboard'

// Auth (eagerly loaded - needed before main app)
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import TermsOfService from './pages/auth/TermsOfService'
import VerifyEmail from './pages/auth/VerifyEmail'

// Public pages
import { UnsubscribePage } from './pages/unsubscribe/UnsubscribePage'

// Leads (lazy loaded)
const LeadsList = lazyWithRetry(() => import('./pages/leads/LeadsList'))
const LeadDetail = lazyWithRetry(() => import('./pages/leads/LeadDetail'))
const LeadsPipeline = lazyWithRetry(() => import('./pages/leads/LeadsPipeline'))
const LeadsImport = lazyWithRetry(() => import('./pages/leads/LeadsImport'))
const LeadsExport = lazyWithRetry(() => import('./pages/leads/LeadsExport'))
const LeadsFollowups = lazyWithRetry(() => import('./pages/leads/LeadsFollowups'))
const LeadHistory = lazyWithRetry(() => import('./pages/leads/LeadHistory'))
const LeadsMerge = lazyWithRetry(() => import('./pages/leads/LeadsMerge'))
const LeadCreate = lazyWithRetry(() => import('./pages/leads/LeadCreate'))

// Campaigns (lazy loaded)
const CampaignsList = lazyWithRetry(() => import('./pages/campaigns/CampaignsList'))
const CampaignCreate = lazyWithRetry(() => import('./pages/campaigns/CampaignCreate'))
const CampaignDetail = lazyWithRetry(() => import('./pages/campaigns/CampaignDetail'))
const CampaignEdit = lazyWithRetry(() => import('./pages/campaigns/CampaignEdit'))
const CampaignTemplates = lazyWithRetry(() => import('./pages/campaigns/CampaignTemplates'))
const CampaignSchedule = lazyWithRetry(() => import('./pages/campaigns/CampaignSchedule'))
const CampaignReports = lazyWithRetry(() => import('./pages/campaigns/CampaignReports'))
// EmailCampaigns, SMSCampaigns, PhoneCampaigns merged into CampaignsList (filter tabs) — old URLs redirect
const ABTesting = lazyWithRetry(() => import('./pages/campaigns/ABTesting'))

// AI Hub (lazy loaded)
const AIHub = lazyWithRetry(() => import('./pages/ai/AIHub'))
const LeadScoring = lazyWithRetry(() => import('./pages/ai/LeadScoring'))
const Segmentation = lazyWithRetry(() => import('./pages/leads/segments/Segmentation'))
const IntelligenceHub = lazyWithRetry(() => import('./pages/ai/IntelligenceHub'))
const AIAnalytics = lazyWithRetry(() => import('./pages/ai/AIAnalytics'))
const AISettings = lazyWithRetry(() => import('./pages/ai/AISettings'))
const OrgAISettings = lazyWithRetry(() => import('./pages/ai/OrgAISettings'))
const AICostDashboard = lazyWithRetry(() => import('./pages/ai/AICostDashboard'))

// Analytics (lazy loaded)
const AnalyticsDashboard = lazyWithRetry(() => import('./pages/analytics/AnalyticsDashboard'))
const LeadAnalytics = lazyWithRetry(() => import('./pages/analytics/LeadAnalytics'))
const ConversionReports = lazyWithRetry(() => import('./pages/analytics/ConversionReports'))
const UsageAnalytics = lazyWithRetry(() => import('./pages/analytics/UsageAnalytics'))
const CustomReports = lazyWithRetry(() => import('./pages/analytics/CustomReports'))
const AttributionReport = lazyWithRetry(() => import('./pages/analytics/AttributionReport'))
const GoalTracking = lazyWithRetry(() => import('./pages/analytics/GoalTracking'))
const LeadVelocity = lazyWithRetry(() => import('./pages/analytics/LeadVelocity'))
const SourceROI = lazyWithRetry(() => import('./pages/analytics/SourceROI'))
const FollowUpAnalytics = lazyWithRetry(() => import('./pages/analytics/FollowUpAnalytics'))
const PeriodComparison = lazyWithRetry(() => import('./pages/analytics/PeriodComparison'))

// Communication (lazy loaded)
const CommunicationInbox = lazyWithRetry(() => import('./pages/communication/CommunicationInbox'))
const EmailTemplatesLibrary = lazyWithRetry(() => import('./pages/communication/EmailTemplatesLibrary'))
const SMSTemplatesLibrary = lazyWithRetry(() => import('./pages/communication/SMSTemplatesLibrary'))
const CallCenter = lazyWithRetry(() => import('./pages/communication/CallCenter'))
const SocialMediaDashboard = lazyWithRetry(() => import('./pages/communication/SocialMediaDashboard'))
const NewsletterManagement = lazyWithRetry(() => import('./pages/communication/NewsletterManagement'))

// Workflows (lazy loaded)
const WorkflowsList = lazyWithRetry(() => import('./pages/workflows/WorkflowsList'))
const WorkflowBuilder = lazyWithRetry(() => import('./pages/workflows/WorkflowBuilder'))

// Settings (lazy loaded)
const SettingsHub = lazyWithRetry(() => import('./pages/settings/SettingsHub'))
const ProfileSettings = lazyWithRetry(() => import('./pages/settings/ProfileSettings'))
const BusinessSettings = lazyWithRetry(() => import('./pages/settings/BusinessSettings'))
const TeamManagement = lazyWithRetry(() => import('./pages/settings/TeamManagement'))
const EmailConfiguration = lazyWithRetry(() => import('./pages/settings/EmailConfiguration'))
const NotificationSettings = lazyWithRetry(() => import('./pages/settings/NotificationSettings'))
const SecuritySettings = lazyWithRetry(() => import('./pages/settings/SecuritySettings'))
const ComplianceSettings = lazyWithRetry(() => import('./pages/settings/ComplianceSettings'))
const GoogleIntegration = lazyWithRetry(() => import('./pages/settings/GoogleIntegration'))
const TwilioSetup = lazyWithRetry(() => import('./pages/settings/TwilioSetup'))
const ServiceConfiguration = lazyWithRetry(() => import('./pages/settings/ServiceConfiguration'))

// Admin (lazy loaded)
const AdminPanel = lazyWithRetry(() => import('./pages/admin/AdminPanel'))
const SubscriptionPage = lazyWithRetry(() => import('./pages/admin/Subscription'))
const SystemSettings = lazyWithRetry(() => import('./pages/admin/SystemSettings'))
const FeatureFlags = lazyWithRetry(() => import('./pages/admin/FeatureFlags'))
const DataExportWizard = lazyWithRetry(() => import('./pages/admin/DataExportWizard'))
const HealthCheckDashboard = lazyWithRetry(() => import('./pages/admin/HealthCheckDashboard'))
const DatabaseMaintenance = lazyWithRetry(() => import('./pages/admin/DatabaseMaintenance'))
const AuditTrail = lazyWithRetry(() => import('./pages/admin/AuditTrail'))

// Billing (lazy loaded)
const BillingPage = lazyWithRetry(() => import('./pages/billing/BillingPage'))
const InvoiceDetail = lazyWithRetry(() => import('./pages/billing/InvoiceDetail'))

// Help (lazy loaded)
const HelpCenter = lazyWithRetry(() => import('./pages/help/HelpCenter'))
const DocumentationPages = lazyWithRetry(() => import('./pages/help/DocumentationPages'))
const SupportTicketSystem = lazyWithRetry(() => import('./pages/help/SupportTicketSystem'))
const VideoTutorialLibrary = lazyWithRetry(() => import('./pages/help/VideoTutorialLibrary'))

// Integrations (lazy loaded)
const IntegrationsHub = lazyWithRetry(() => import('./pages/integrations/IntegrationsHub'))
const APIIntegrationsPage = lazyWithRetry(() => import('./pages/integrations/APIIntegrationsPage'))

// Other lazy pages
const CalendarPage = lazyWithRetry(() => import('./pages/calendar/CalendarPage'))
const ActivityPage = lazyWithRetry(() => import('./pages/activity/ActivityPage'))
const TasksPage = lazyWithRetry(() => import('./pages/tasks/TasksPage'))
const PasswordSecurityPage = lazyWithRetry(() => import('./pages/settings/PasswordSecurityPage'))

// Phase 5 - Components (lazy loaded)
const TagsManager = lazyWithRetry(() => import('./components/settings/TagsManager').then(m => ({ default: m.TagsManager })))
const CustomFieldsManager = lazyWithRetry(() => import('./components/settings/CustomFieldsManager').then(m => ({ default: m.CustomFieldsManager })))
const NotificationsPage = lazyWithRetry(() => import('./pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })))

// 404
const NotFound = lazyWithRetry(() => import('./pages/NotFound'))

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/unsubscribe/:token" element={<UnsubscribePage />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />

      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/verify-email" element={<VerifyEmail />} />
      </Route>

      {/* Main app routes */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Dashboard"><Dashboard /></PageErrorBoundary></Suspense>} />
        <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Dashboard"><Dashboard /></PageErrorBoundary></Suspense>} />
        
        {/* Leads */}
        <Route path="/leads" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Leads List"><LeadsList /></PageErrorBoundary></Suspense>} />
        <Route path="/leads/create" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Create Lead"><LeadCreate /></PageErrorBoundary></Suspense>} />
        <Route path="/leads/:id" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Lead Detail"><LeadDetail /></PageErrorBoundary></Suspense>} />
        <Route path="/leads/pipeline" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Pipeline"><LeadsPipeline /></PageErrorBoundary></Suspense>} />
        <Route path="/leads/import" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Import Leads"><LeadsImport /></PageErrorBoundary></Suspense>} />
        <Route path="/leads/export" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Export Leads"><LeadsExport /></PageErrorBoundary></Suspense>} />
        <Route path="/leads/followups" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Follow-ups"><LeadsFollowups /></PageErrorBoundary></Suspense>} />
        <Route path="/leads/history" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Lead History"><LeadHistory /></PageErrorBoundary></Suspense>} />
        <Route path="/leads/merge" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Merge Leads"><LeadsMerge /></PageErrorBoundary></Suspense>} />
        <Route path="/leads/segments" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Segmentation"><Segmentation /></PageErrorBoundary></Suspense>} />
        
        {/* Calendar & Tasks */}
        <Route path="/calendar" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Calendar"><CalendarPage /></PageErrorBoundary></Suspense>} />
        <Route path="/activity" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Activity"><ActivityPage /></PageErrorBoundary></Suspense>} />
        <Route path="/tasks" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Tasks"><TasksPage /></PageErrorBoundary></Suspense>} />
        
        {/* Campaigns */}
        <Route path="/campaigns" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Campaigns"><CampaignsList /></PageErrorBoundary></Suspense>} />
        <Route path="/campaigns/create" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Create Campaign"><CampaignCreate /></PageErrorBoundary></Suspense>} />
        <Route path="/campaigns/:id" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Campaign Detail"><CampaignDetail /></PageErrorBoundary></Suspense>} />
        <Route path="/campaigns/:id/edit" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Edit Campaign"><CampaignEdit /></PageErrorBoundary></Suspense>} />
        <Route path="/campaigns/templates" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Campaign Templates"><CampaignTemplates /></PageErrorBoundary></Suspense>} />
        <Route path="/campaigns/schedule" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Campaign Schedule"><CampaignSchedule /></PageErrorBoundary></Suspense>} />
        <Route path="/campaigns/reports" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Campaign Reports"><CampaignReports /></PageErrorBoundary></Suspense>} />
        <Route path="/campaigns/email" element={<Navigate to="/campaigns?type=email" replace />} />
        <Route path="/campaigns/sms" element={<Navigate to="/campaigns?type=sms" replace />} />
        <Route path="/campaigns/phone" element={<Navigate to="/campaigns?type=phone" replace />} />
        <Route path="/campaigns/ab-testing" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="A/B Testing"><ABTesting /></PageErrorBoundary></Suspense>} />
        
        {/* AI Hub */}
        <Route path="/ai" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="AI Hub"><AIHub /></PageErrorBoundary></Suspense>} />
        <Route path="/ai/lead-scoring" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Lead Scoring"><LeadScoring /></PageErrorBoundary></Suspense>} />
        <Route path="/ai/segmentation" element={<Navigate to="/leads/segments" replace />} />
        <Route path="/ai/intelligence" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Intelligence Hub"><IntelligenceHub /></PageErrorBoundary></Suspense>} />
        <Route path="/ai/predictive" element={<Navigate to="/ai/intelligence" replace />} />
        <Route path="/ai/insights" element={<Navigate to="/ai/intelligence" replace />} />
        <Route path="/ai/analytics" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="AI Analytics"><AIAnalytics /></PageErrorBoundary></Suspense>} />
        <Route path="/ai/settings" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="AI Settings"><AISettings /></PageErrorBoundary></Suspense>} />
        <Route path="/ai/org-settings" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Org AI Settings"><OrgAISettings /></PageErrorBoundary></Suspense>} />
        <Route path="/ai/cost-dashboard" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="AI Cost Dashboard"><AICostDashboard /></PageErrorBoundary></Suspense>} />
        
        {/* Analytics */}
        <Route path="/analytics" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Analytics Dashboard"><AnalyticsDashboard /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/campaigns" element={<Navigate to="/campaigns/reports" replace />} />
        <Route path="/analytics/leads" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Lead Analytics"><LeadAnalytics /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/conversions" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Conversion Reports"><ConversionReports /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/usage" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Usage Analytics"><UsageAnalytics /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/custom-reports" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Custom Reports"><CustomReports /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/report-builder" element={<Navigate to="/analytics/custom-reports" replace />} />
        <Route path="/analytics/attribution" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Attribution Report"><AttributionReport /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/goals" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Goal Tracking"><GoalTracking /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/velocity" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Lead Velocity"><LeadVelocity /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/source-roi" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Source ROI"><SourceROI /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/follow-ups" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Follow-Up Analytics"><FollowUpAnalytics /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/comparison" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Period Comparison"><PeriodComparison /></PageErrorBoundary></Suspense>} />
        
        {/* Communication */}
        <Route path="/communication" element={<Navigate to="/communication/inbox" replace />} />
        <Route path="/communication/inbox" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Inbox"><CommunicationInbox /></PageErrorBoundary></Suspense>} />
        <Route path="/communication/templates" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Email Templates"><EmailTemplatesLibrary /></PageErrorBoundary></Suspense>} />
        <Route path="/communication/sms-templates" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="SMS Templates"><SMSTemplatesLibrary /></PageErrorBoundary></Suspense>} />
        <Route path="/communication/calls" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Cold Call Hub"><CallCenter /></PageErrorBoundary></Suspense>} />
        <Route path="/communication/social" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Social Media"><SocialMediaDashboard /></PageErrorBoundary></Suspense>} />
        <Route path="/communication/newsletter" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Newsletter"><NewsletterManagement /></PageErrorBoundary></Suspense>} />
        
        {/* Workflows */}
        <Route path="/workflows" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Workflows"><WorkflowsList /></PageErrorBoundary></Suspense>} />
        <Route path="/workflows/builder" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Workflow Builder"><WorkflowBuilder /></PageErrorBoundary></Suspense>} />
        
        {/* Settings */}
        <Route path="/settings" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Settings"><SettingsHub /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/profile" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Profile"><ProfileSettings /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/business" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Business Settings"><BusinessSettings /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/team" element={<Navigate to="/admin/team" replace />} />
        <Route path="/settings/email" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Email Config"><EmailConfiguration /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/notifications" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Notification Settings"><NotificationSettings /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/security" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Security"><SecuritySettings /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/compliance" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Compliance"><ComplianceSettings /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/google" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Google Integration"><GoogleIntegration /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/twilio" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Twilio Setup"><TwilioSetup /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/services" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Services"><ServiceConfiguration /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/tags" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Tags"><TagsManager /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/custom-fields" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Custom Fields"><CustomFieldsManager /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/security/password" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Password Security"><PasswordSecurityPage /></PageErrorBoundary></Suspense>} />
        
        {/* Notifications */}
        <Route path="/notifications" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Notifications"><NotificationsPage /></PageErrorBoundary></Suspense>} />
        
        {/* Admin */}
        <Route path="/admin" element={<RequireAdmin><Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Admin Panel"><AdminPanel /></PageErrorBoundary></Suspense></RequireAdmin>} />
        <Route path="/admin/team" element={<RequireAdmin><Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Team Management"><TeamManagement /></PageErrorBoundary></Suspense></RequireAdmin>} />
        <Route path="/admin/subscription" element={<RequireAdmin><Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Subscription Management"><SubscriptionPage /></PageErrorBoundary></Suspense></RequireAdmin>} />
        <Route path="/admin/system" element={<RequireAdmin><Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="System Settings"><SystemSettings /></PageErrorBoundary></Suspense></RequireAdmin>} />
        <Route path="/admin/features" element={<RequireAdmin><Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Feature Flags"><FeatureFlags /></PageErrorBoundary></Suspense></RequireAdmin>} />
        <Route path="/admin/export" element={<RequireAdmin><Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Data Export"><DataExportWizard /></PageErrorBoundary></Suspense></RequireAdmin>} />
        <Route path="/admin/health" element={<RequireAdmin><Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Health Check"><HealthCheckDashboard /></PageErrorBoundary></Suspense></RequireAdmin>} />
        <Route path="/admin/database" element={<RequireAdmin><Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Database Maintenance"><DatabaseMaintenance /></PageErrorBoundary></Suspense></RequireAdmin>} />
        <Route path="/admin/audit" element={<RequireAdmin><Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Audit Trail"><AuditTrail /></PageErrorBoundary></Suspense></RequireAdmin>} />
        
        {/* Billing */}
        <Route path="/billing" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Billing"><BillingPage /></PageErrorBoundary></Suspense>} />
        <Route path="/billing/subscription" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Billing"><BillingPage /></PageErrorBoundary></Suspense>} />
        <Route path="/billing/invoices/:id" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Invoice"><InvoiceDetail /></PageErrorBoundary></Suspense>} />
        <Route path="/billing/payment-methods" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Billing"><BillingPage /></PageErrorBoundary></Suspense>} />
        
        {/* Help */}
        <Route path="/help" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Help Center"><HelpCenter /></PageErrorBoundary></Suspense>} />
        <Route path="/help/docs" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Documentation"><DocumentationPages /></PageErrorBoundary></Suspense>} />
        <Route path="/help/support" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Support"><SupportTicketSystem /></PageErrorBoundary></Suspense>} />
        <Route path="/help/videos" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Video Tutorials"><VideoTutorialLibrary /></PageErrorBoundary></Suspense>} />
        
        {/* Integrations */}
        <Route path="/integrations" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Integrations"><IntegrationsHub /></PageErrorBoundary></Suspense>} />
        <Route path="/integrations/api" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="API Integrations"><APIIntegrationsPage /></PageErrorBoundary></Suspense>} />
        
        {/* 404 */}
        <Route path="/404" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  )
}

export default App
