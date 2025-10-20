import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { AuthLayout } from './components/layout/AuthLayout'

// Dashboard
import Dashboard from './pages/dashboard/Dashboard'

// Auth
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Leads
import LeadsList from './pages/leads/LeadsList'
import LeadDetail from './pages/leads/LeadDetail'
import LeadsPipeline from './pages/leads/LeadsPipeline'
import LeadsImport from './pages/leads/LeadsImport'
import LeadsExport from './pages/leads/LeadsExport'
import LeadsFollowups from './pages/leads/LeadsFollowups'
import LeadHistory from './pages/leads/LeadHistory'
import LeadsMerge from './pages/leads/LeadsMerge'

// Campaigns
import CampaignsList from './pages/campaigns/CampaignsList'
import CampaignCreate from './pages/campaigns/CampaignCreate'
import CampaignDetail from './pages/campaigns/CampaignDetail'
import CampaignEdit from './pages/campaigns/CampaignEdit'
import CampaignTemplates from './pages/campaigns/CampaignTemplates'
import CampaignSchedule from './pages/campaigns/CampaignSchedule'
import CampaignReports from './pages/campaigns/CampaignReports'
import EmailCampaigns from './pages/campaigns/EmailCampaigns'
import SMSCampaigns from './pages/campaigns/SMSCampaigns'
import PhoneCampaigns from './pages/campaigns/PhoneCampaigns'
import ABTesting from './pages/campaigns/ABTesting'

// AI Hub
import AIHub from './pages/ai/AIHub'
import LeadScoring from './pages/ai/LeadScoring'
import Segmentation from './pages/ai/Segmentation'
import PredictiveAnalytics from './pages/ai/PredictiveAnalytics'
import ModelTraining from './pages/ai/ModelTraining'
import IntelligenceInsights from './pages/ai/IntelligenceInsights'

// Analytics
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard'
import CampaignAnalytics from './pages/analytics/CampaignAnalytics'
import LeadAnalytics from './pages/analytics/LeadAnalytics'
import ConversionReports from './pages/analytics/ConversionReports'
import UsageAnalytics from './pages/analytics/UsageAnalytics'
import CustomReports from './pages/analytics/CustomReports'
import ReportBuilder from './pages/analytics/ReportBuilder'

// Communication
import CommunicationInbox from './pages/communication/CommunicationInbox'
import EmailTemplatesLibrary from './pages/communication/EmailTemplatesLibrary'
import SMSCenter from './pages/communication/SMSCenter'
import CallCenter from './pages/communication/CallCenter'
import SocialMediaDashboard from './pages/communication/SocialMediaDashboard'
import NewsletterManagement from './pages/communication/NewsletterManagement'

// Workflows
import WorkflowsList from './pages/workflows/WorkflowsList'
import WorkflowBuilder from './pages/workflows/WorkflowBuilder'
import AutomationRules from './pages/workflows/AutomationRules'

// Settings
import SettingsHub from './pages/settings/SettingsHub'
import ProfileSettings from './pages/settings/ProfileSettings'
import BusinessSettings from './pages/settings/BusinessSettings'
import TeamManagement from './pages/settings/TeamManagement'
import EmailConfiguration from './pages/settings/EmailConfiguration'
import NotificationSettings from './pages/settings/NotificationSettings'
import SecuritySettings from './pages/settings/SecuritySettings'
import ComplianceSettings from './pages/settings/ComplianceSettings'
import GoogleIntegration from './pages/settings/GoogleIntegration'
import TwilioSetup from './pages/settings/TwilioSetup'
import ServiceConfiguration from './pages/settings/ServiceConfiguration'
import DemoDataGenerator from './pages/settings/DemoDataGenerator'

// Admin
import AdminPanel from './pages/admin/AdminPanel'
import UserManagementDetail from './pages/admin/UserManagementDetail'
import SystemSettings from './pages/admin/SystemSettings'
import FeatureFlags from './pages/admin/FeatureFlags'
import DebugConsole from './pages/admin/DebugConsole'
import BackupRestore from './pages/admin/BackupRestore'
import DataExportWizard from './pages/admin/DataExportWizard'
import RetryQueue from './pages/admin/RetryQueue'
import HealthCheckDashboard from './pages/admin/HealthCheckDashboard'
import DatabaseMaintenance from './pages/admin/DatabaseMaintenance'

// Billing
import BillingPage from './pages/billing/BillingPage'
import InvoiceDetail from './pages/billing/InvoiceDetail'
import UsageDashboard from './pages/billing/UsageDashboard'
import UpgradeWizard from './pages/billing/UpgradeWizard'
import PaymentMethods from './pages/billing/PaymentMethods'

// Help
import HelpCenter from './pages/help/HelpCenter'
import DocumentationPages from './pages/help/DocumentationPages'
import SupportTicketSystem from './pages/help/SupportTicketSystem'
import VideoTutorialLibrary from './pages/help/VideoTutorialLibrary'

// Integrations
import IntegrationsHub from './pages/integrations/IntegrationsHub'

// Phase 5 - New Components
import { TagsManager } from './components/settings/TagsManager'
import { CustomFieldsManager } from './components/settings/CustomFieldsManager'
import { NotificationsPage } from './pages/notifications/NotificationsPage'

// 404
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Main app routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Leads */}
        <Route path="/leads" element={<LeadsList />} />
        <Route path="/leads/:id" element={<LeadDetail />} />
        <Route path="/leads/pipeline" element={<LeadsPipeline />} />
        <Route path="/leads/import" element={<LeadsImport />} />
        <Route path="/leads/export" element={<LeadsExport />} />
        <Route path="/leads/followups" element={<LeadsFollowups />} />
        <Route path="/leads/history" element={<LeadHistory />} />
        <Route path="/leads/merge" element={<LeadsMerge />} />
        
        {/* Campaigns */}
        <Route path="/campaigns" element={<CampaignsList />} />
        <Route path="/campaigns/create" element={<CampaignCreate />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/campaigns/:id/edit" element={<CampaignEdit />} />
        <Route path="/campaigns/templates" element={<CampaignTemplates />} />
        <Route path="/campaigns/schedule" element={<CampaignSchedule />} />
        <Route path="/campaigns/reports" element={<CampaignReports />} />
        <Route path="/campaigns/email" element={<EmailCampaigns />} />
        <Route path="/campaigns/sms" element={<SMSCampaigns />} />
        <Route path="/campaigns/phone" element={<PhoneCampaigns />} />
        <Route path="/campaigns/ab-testing" element={<ABTesting />} />
        
        {/* AI Hub */}
        <Route path="/ai" element={<AIHub />} />
        <Route path="/ai/lead-scoring" element={<LeadScoring />} />
        <Route path="/ai/segmentation" element={<Segmentation />} />
        <Route path="/ai/predictive" element={<PredictiveAnalytics />} />
        <Route path="/ai/training" element={<ModelTraining />} />
        <Route path="/ai/insights" element={<IntelligenceInsights />} />
        
        {/* Analytics */}
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/analytics/campaigns" element={<CampaignAnalytics />} />
        <Route path="/analytics/leads" element={<LeadAnalytics />} />
        <Route path="/analytics/conversions" element={<ConversionReports />} />
        <Route path="/analytics/usage" element={<UsageAnalytics />} />
        <Route path="/analytics/custom-reports" element={<CustomReports />} />
        <Route path="/analytics/report-builder" element={<ReportBuilder />} />
        
        {/* Communication */}
        <Route path="/communication" element={<CommunicationInbox />} />
        <Route path="/communication/inbox" element={<CommunicationInbox />} />
        <Route path="/communication/templates" element={<EmailTemplatesLibrary />} />
        <Route path="/communication/sms" element={<SMSCenter />} />
        <Route path="/communication/calls" element={<CallCenter />} />
        <Route path="/communication/social" element={<SocialMediaDashboard />} />
        <Route path="/communication/newsletter" element={<NewsletterManagement />} />
        
        {/* Workflows */}
        <Route path="/workflows" element={<WorkflowsList />} />
        <Route path="/workflows/builder" element={<WorkflowBuilder />} />
        <Route path="/workflows/automation" element={<AutomationRules />} />
        
        {/* Settings */}
        <Route path="/settings" element={<SettingsHub />} />
        <Route path="/settings/profile" element={<ProfileSettings />} />
        <Route path="/settings/business" element={<BusinessSettings />} />
        <Route path="/settings/team" element={<TeamManagement />} />
        <Route path="/settings/email" element={<EmailConfiguration />} />
        <Route path="/settings/notifications" element={<NotificationSettings />} />
        <Route path="/settings/security" element={<SecuritySettings />} />
        <Route path="/settings/compliance" element={<ComplianceSettings />} />
        <Route path="/settings/google" element={<GoogleIntegration />} />
        <Route path="/settings/twilio" element={<TwilioSetup />} />
        <Route path="/settings/services" element={<ServiceConfiguration />} />
        <Route path="/settings/demo-data" element={<DemoDataGenerator />} />
        <Route path="/settings/tags" element={<TagsManager />} />
        <Route path="/settings/custom-fields" element={<CustomFieldsManager />} />
        
        {/* Notifications */}
        <Route path="/notifications" element={<NotificationsPage />} />
        
        {/* Admin */}
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/users/:id" element={<UserManagementDetail />} />
        <Route path="/admin/system" element={<SystemSettings />} />
        <Route path="/admin/features" element={<FeatureFlags />} />
        <Route path="/admin/debug" element={<DebugConsole />} />
        <Route path="/admin/backup" element={<BackupRestore />} />
        <Route path="/admin/export" element={<DataExportWizard />} />
        <Route path="/admin/retry-queue" element={<RetryQueue />} />
        <Route path="/admin/health" element={<HealthCheckDashboard />} />
        <Route path="/admin/database" element={<DatabaseMaintenance />} />
        
        {/* Billing */}
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/billing/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/billing/usage" element={<UsageDashboard />} />
        <Route path="/billing/upgrade" element={<UpgradeWizard />} />
        <Route path="/billing/payment-methods" element={<PaymentMethods />} />
        
        {/* Help */}
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/help/docs" element={<DocumentationPages />} />
        <Route path="/help/support" element={<SupportTicketSystem />} />
        <Route path="/help/videos" element={<VideoTutorialLibrary />} />
        
        {/* Integrations */}
        <Route path="/integrations" element={<IntegrationsHub />} />
        
        {/* Settings */}
        <Route path="/settings" element={<SettingsHub />} />
        
        {/* 404 */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  )
}

export default App
