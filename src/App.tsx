import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { AuthLayout } from './components/layout/AuthLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { PageErrorBoundary } from './components/PageErrorBoundary'

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

// Public pages
import { UnsubscribePage } from './pages/unsubscribe/UnsubscribePage'

// Leads (lazy loaded)
const LeadsList = lazy(() => import('./pages/leads/LeadsList'))
const LeadDetail = lazy(() => import('./pages/leads/LeadDetail'))
const LeadsPipeline = lazy(() => import('./pages/leads/LeadsPipeline'))
const LeadsImport = lazy(() => import('./pages/leads/LeadsImport'))
const LeadsExport = lazy(() => import('./pages/leads/LeadsExport'))
const LeadsFollowups = lazy(() => import('./pages/leads/LeadsFollowups'))
const LeadHistory = lazy(() => import('./pages/leads/LeadHistory'))
const LeadsMerge = lazy(() => import('./pages/leads/LeadsMerge'))
const LeadCreate = lazy(() => import('./pages/leads/LeadCreate'))

// Campaigns (lazy loaded)
const CampaignsList = lazy(() => import('./pages/campaigns/CampaignsList'))
const CampaignCreate = lazy(() => import('./pages/campaigns/CampaignCreate'))
const CampaignDetail = lazy(() => import('./pages/campaigns/CampaignDetail'))
const CampaignEdit = lazy(() => import('./pages/campaigns/CampaignEdit'))
const CampaignTemplates = lazy(() => import('./pages/campaigns/CampaignTemplates'))
const CampaignSchedule = lazy(() => import('./pages/campaigns/CampaignSchedule'))
const CampaignReports = lazy(() => import('./pages/campaigns/CampaignReports'))
const EmailCampaigns = lazy(() => import('./pages/campaigns/EmailCampaigns'))
const SMSCampaigns = lazy(() => import('./pages/campaigns/SMSCampaigns'))
const PhoneCampaigns = lazy(() => import('./pages/campaigns/PhoneCampaigns'))
const ABTesting = lazy(() => import('./pages/campaigns/ABTesting'))

// AI Hub (lazy loaded)
const AIHub = lazy(() => import('./pages/ai/AIHub'))
const LeadScoring = lazy(() => import('./pages/ai/LeadScoring'))
const Segmentation = lazy(() => import('./pages/ai/Segmentation'))
const PredictiveAnalytics = lazy(() => import('./pages/ai/PredictiveAnalytics'))
const ModelTraining = lazy(() => import('./pages/ai/ModelTraining'))
const IntelligenceInsights = lazy(() => import('./pages/ai/IntelligenceInsights'))
const AIAnalytics = lazy(() => import('./pages/ai/AIAnalytics'))

// Analytics (lazy loaded)
const AnalyticsDashboard = lazy(() => import('./pages/analytics/AnalyticsDashboard'))
const CampaignAnalytics = lazy(() => import('./pages/analytics/CampaignAnalytics'))
const LeadAnalytics = lazy(() => import('./pages/analytics/LeadAnalytics'))
const ConversionReports = lazy(() => import('./pages/analytics/ConversionReports'))
const UsageAnalytics = lazy(() => import('./pages/analytics/UsageAnalytics'))
const CustomReports = lazy(() => import('./pages/analytics/CustomReports'))
const ReportBuilder = lazy(() => import('./pages/analytics/ReportBuilder'))

// Communication (lazy loaded)
const CommunicationInbox = lazy(() => import('./pages/communication/CommunicationInbox'))
const EmailTemplatesLibrary = lazy(() => import('./pages/communication/EmailTemplatesLibrary'))
const SMSCenter = lazy(() => import('./pages/communication/SMSCenter'))
const CallCenter = lazy(() => import('./pages/communication/CallCenter'))
const SocialMediaDashboard = lazy(() => import('./pages/communication/SocialMediaDashboard'))
const NewsletterManagement = lazy(() => import('./pages/communication/NewsletterManagement'))

// Workflows (lazy loaded)
const WorkflowsList = lazy(() => import('./pages/workflows/WorkflowsList'))
const WorkflowBuilder = lazy(() => import('./pages/workflows/WorkflowBuilder'))
const AutomationRules = lazy(() => import('./pages/workflows/AutomationRules'))

// Settings (lazy loaded)
const SettingsHub = lazy(() => import('./pages/settings/SettingsHub'))
const ProfileSettings = lazy(() => import('./pages/settings/ProfileSettings'))
const BusinessSettings = lazy(() => import('./pages/settings/BusinessSettings'))
const TeamManagement = lazy(() => import('./pages/settings/TeamManagement'))
const EmailConfiguration = lazy(() => import('./pages/settings/EmailConfiguration'))
const NotificationSettings = lazy(() => import('./pages/settings/NotificationSettings'))
const SecuritySettings = lazy(() => import('./pages/settings/SecuritySettings'))
const ComplianceSettings = lazy(() => import('./pages/settings/ComplianceSettings'))
const GoogleIntegration = lazy(() => import('./pages/settings/GoogleIntegration'))
const TwilioSetup = lazy(() => import('./pages/settings/TwilioSetup'))
const ServiceConfiguration = lazy(() => import('./pages/settings/ServiceConfiguration'))
const DemoDataGenerator = lazy(() => import('./pages/settings/DemoDataGenerator'))

// Admin (lazy loaded)
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel'))
const TeamManagementPage = lazy(() => import('./pages/admin/TeamManagementPage'))
const SubscriptionPage = lazy(() => import('./pages/admin/Subscription'))
const UserManagementDetail = lazy(() => import('./pages/admin/UserManagementDetail'))
const SystemSettings = lazy(() => import('./pages/admin/SystemSettings'))
const FeatureFlags = lazy(() => import('./pages/admin/FeatureFlags'))
const DebugConsole = lazy(() => import('./pages/admin/DebugConsole'))
const BackupRestore = lazy(() => import('./pages/admin/BackupRestore'))
const DataExportWizard = lazy(() => import('./pages/admin/DataExportWizard'))
const RetryQueue = lazy(() => import('./pages/admin/RetryQueue'))
const HealthCheckDashboard = lazy(() => import('./pages/admin/HealthCheckDashboard'))
const DatabaseMaintenance = lazy(() => import('./pages/admin/DatabaseMaintenance'))

// Billing (lazy loaded)
const BillingPage = lazy(() => import('./pages/billing/BillingPage'))
const InvoiceDetail = lazy(() => import('./pages/billing/InvoiceDetail'))
const UsageDashboard = lazy(() => import('./pages/billing/UsageDashboard'))
const UpgradeWizard = lazy(() => import('./pages/billing/UpgradeWizard'))
const PaymentMethods = lazy(() => import('./pages/billing/PaymentMethods'))

// Help (lazy loaded)
const HelpCenter = lazy(() => import('./pages/help/HelpCenter'))
const DocumentationPages = lazy(() => import('./pages/help/DocumentationPages'))
const SupportTicketSystem = lazy(() => import('./pages/help/SupportTicketSystem'))
const VideoTutorialLibrary = lazy(() => import('./pages/help/VideoTutorialLibrary'))

// Integrations (lazy loaded)
const IntegrationsHub = lazy(() => import('./pages/integrations/IntegrationsHub'))
const APIIntegrationsPage = lazy(() => import('./pages/integrations/APIIntegrationsPage'))

// Other lazy pages
const CalendarPage = lazy(() => import('./pages/calendar/CalendarPage'))
const ActivityPage = lazy(() => import('./pages/activity/ActivityPage'))
const TasksPage = lazy(() => import('./pages/tasks/TasksPage'))
const PasswordSecurityPage = lazy(() => import('./pages/settings/PasswordSecurityPage'))
const BillingSubscriptionPage = lazy(() => import('./pages/billing/BillingSubscriptionPage'))

// Phase 5 - Components (lazy loaded)
const TagsManager = lazy(() => import('./components/settings/TagsManager').then(m => ({ default: m.TagsManager })))
const CustomFieldsManager = lazy(() => import('./components/settings/CustomFieldsManager').then(m => ({ default: m.CustomFieldsManager })))
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })))

// 404
const NotFound = lazy(() => import('./pages/NotFound'))

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/unsubscribe/:token" element={<UnsubscribePage />} />

      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
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
        <Route path="/campaigns/email" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Email Campaigns"><EmailCampaigns /></PageErrorBoundary></Suspense>} />
        <Route path="/campaigns/sms" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="SMS Campaigns"><SMSCampaigns /></PageErrorBoundary></Suspense>} />
        <Route path="/campaigns/phone" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Phone Campaigns"><PhoneCampaigns /></PageErrorBoundary></Suspense>} />
        <Route path="/campaigns/ab-testing" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="A/B Testing"><ABTesting /></PageErrorBoundary></Suspense>} />
        
        {/* AI Hub */}
        <Route path="/ai" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="AI Hub"><AIHub /></PageErrorBoundary></Suspense>} />
        <Route path="/ai/lead-scoring" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Lead Scoring"><LeadScoring /></PageErrorBoundary></Suspense>} />
        <Route path="/ai/segmentation" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Segmentation"><Segmentation /></PageErrorBoundary></Suspense>} />
        <Route path="/ai/predictive" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Predictive Analytics"><PredictiveAnalytics /></PageErrorBoundary></Suspense>} />
        <Route path="/ai/training" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Model Training"><ModelTraining /></PageErrorBoundary></Suspense>} />
        <Route path="/ai/insights" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Intelligence Insights"><IntelligenceInsights /></PageErrorBoundary></Suspense>} />
        <Route path="/ai/analytics" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="AI Analytics"><AIAnalytics /></PageErrorBoundary></Suspense>} />
        
        {/* Analytics */}
        <Route path="/analytics" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Analytics Dashboard"><AnalyticsDashboard /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/campaigns" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Campaign Analytics"><CampaignAnalytics /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/leads" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Lead Analytics"><LeadAnalytics /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/conversions" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Conversion Reports"><ConversionReports /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/usage" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Usage Analytics"><UsageAnalytics /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/custom-reports" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Custom Reports"><CustomReports /></PageErrorBoundary></Suspense>} />
        <Route path="/analytics/report-builder" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Report Builder"><ReportBuilder /></PageErrorBoundary></Suspense>} />
        
        {/* Communication */}
        <Route path="/communication" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Inbox"><CommunicationInbox /></PageErrorBoundary></Suspense>} />
        <Route path="/communication/inbox" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Inbox"><CommunicationInbox /></PageErrorBoundary></Suspense>} />
        <Route path="/communication/templates" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Email Templates"><EmailTemplatesLibrary /></PageErrorBoundary></Suspense>} />
        <Route path="/communication/sms" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="SMS Center"><SMSCenter /></PageErrorBoundary></Suspense>} />
        <Route path="/communication/calls" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Call Center"><CallCenter /></PageErrorBoundary></Suspense>} />
        <Route path="/communication/social" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Social Media"><SocialMediaDashboard /></PageErrorBoundary></Suspense>} />
        <Route path="/communication/newsletter" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Newsletter"><NewsletterManagement /></PageErrorBoundary></Suspense>} />
        
        {/* Workflows */}
        <Route path="/workflows" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Workflows"><WorkflowsList /></PageErrorBoundary></Suspense>} />
        <Route path="/workflows/builder" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Workflow Builder"><WorkflowBuilder /></PageErrorBoundary></Suspense>} />
        <Route path="/workflows/automation" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Automation Rules"><AutomationRules /></PageErrorBoundary></Suspense>} />
        
        {/* Settings */}
        <Route path="/settings" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Settings"><SettingsHub /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/profile" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Profile"><ProfileSettings /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/business" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Business Settings"><BusinessSettings /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/team" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Team"><TeamManagement /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/email" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Email Config"><EmailConfiguration /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/notifications" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Notification Settings"><NotificationSettings /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/security" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Security"><SecuritySettings /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/compliance" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Compliance"><ComplianceSettings /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/google" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Google Integration"><GoogleIntegration /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/twilio" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Twilio Setup"><TwilioSetup /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/services" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Services"><ServiceConfiguration /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/demo-data" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Demo Data"><DemoDataGenerator /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/tags" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Tags"><TagsManager /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/custom-fields" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Custom Fields"><CustomFieldsManager /></PageErrorBoundary></Suspense>} />
        <Route path="/settings/security/password" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Password Security"><PasswordSecurityPage /></PageErrorBoundary></Suspense>} />
        
        {/* Notifications */}
        <Route path="/notifications" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Notifications"><NotificationsPage /></PageErrorBoundary></Suspense>} />
        
        {/* Admin */}
        <Route path="/admin" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Admin Panel"><AdminPanel /></PageErrorBoundary></Suspense>} />
        <Route path="/admin/team" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Team Management"><TeamManagementPage /></PageErrorBoundary></Suspense>} />
        <Route path="/admin/subscription" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Subscription Management"><SubscriptionPage /></PageErrorBoundary></Suspense>} />
        <Route path="/admin/users/:id" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="User Management"><UserManagementDetail /></PageErrorBoundary></Suspense>} />
        <Route path="/admin/system" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="System Settings"><SystemSettings /></PageErrorBoundary></Suspense>} />
        <Route path="/admin/features" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Feature Flags"><FeatureFlags /></PageErrorBoundary></Suspense>} />
        <Route path="/admin/debug" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Debug Console"><DebugConsole /></PageErrorBoundary></Suspense>} />
        <Route path="/admin/backup" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Backup & Restore"><BackupRestore /></PageErrorBoundary></Suspense>} />
        <Route path="/admin/export" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Data Export"><DataExportWizard /></PageErrorBoundary></Suspense>} />
        <Route path="/admin/retry-queue" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Retry Queue"><RetryQueue /></PageErrorBoundary></Suspense>} />
        <Route path="/admin/health" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Health Check"><HealthCheckDashboard /></PageErrorBoundary></Suspense>} />
        <Route path="/admin/database" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Database Maintenance"><DatabaseMaintenance /></PageErrorBoundary></Suspense>} />
        
        {/* Billing */}
        <Route path="/billing" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Billing"><BillingPage /></PageErrorBoundary></Suspense>} />
        <Route path="/billing/subscription" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Subscription"><BillingSubscriptionPage /></PageErrorBoundary></Suspense>} />
        <Route path="/billing/invoices/:id" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Invoice"><InvoiceDetail /></PageErrorBoundary></Suspense>} />
        <Route path="/billing/usage" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Usage"><UsageDashboard /></PageErrorBoundary></Suspense>} />
        <Route path="/billing/upgrade" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Upgrade"><UpgradeWizard /></PageErrorBoundary></Suspense>} />
        <Route path="/billing/payment-methods" element={<Suspense fallback={<PageLoader />}><PageErrorBoundary pageName="Payment Methods"><PaymentMethods /></PageErrorBoundary></Suspense>} />
        
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
