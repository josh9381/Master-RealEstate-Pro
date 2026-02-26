// Common types used across the application

export interface UserPermissions {
  canManageUsers: boolean
  canManageOrg: boolean
  canManageSystem: boolean
  canManageFinance: boolean
  canManageLeads: boolean
  canManageCampaigns: boolean
  canManageWorkflows: boolean
  canManageIntegrations: boolean
  canViewAllData: boolean
  canExportData: boolean
}

export interface OrganizationInfo {
  id: string
  name: string
  domain?: string
  logo?: string
  subscriptionTier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  trialEndsAt?: string
  memberCount?: number
}

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  name?: string
  avatar?: string
  role: 'admin' | 'user' | 'manager' | 'USER' | 'ADMIN' | 'MANAGER'
  organizationId: string
  createdAt: string
  permissions?: UserPermissions
  organization?: OrganizationInfo
}

export interface Lead {
  id: number
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  position?: string
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost' | 'negotiation'
  score: number
  source: string
  value?: number
  stage?: string
  assignedTo?: string | null
  createdAt: string
  updatedAt?: string
  lastContact?: string | null
  tags?: string[]
  notes?: string | Note[]
  customFields?: {
    industry?: string
    companySize?: number
    budget?: number
    website?: string
    address?: {
      street?: string
      city?: string
      state?: string
      zip?: string
      country?: string
    }
    [key: string]: unknown
  }
}

export interface Campaign {
  id: string
  name: string
  type: 'EMAIL' | 'SMS' | 'PHONE' | 'SOCIAL'
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  startDate: string
  endDate?: string
  scheduledDate?: string
  budget?: number
  spent?: number
  audience?: number
  recipients?: number
  sent: number
  opened?: number
  clicked?: number
  clicks?: number
  converted?: number
  revenue?: number
  roi?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  tags?: string[]
  subject?: string | null
  previewText?: string
  body?: string
  content?: string
  fullContent?: string
  delivered?: number
  bounced?: number
  unsubscribed?: number
  isArchived?: boolean
  archivedAt?: string
  isRecurring?: boolean
  isABTest?: boolean
  frequency?: string
  recurringPattern?: string
  recipientCount?: number
  maxOccurrences?: number
  abTest?: {
    variant: 'A' | 'B'
    winner?: 'A' | 'B'
    aOpens?: number
    bOpens?: number
    aClicks?: number
    bClicks?: number
  }
}

export interface Note {
  id: string
  content: string
  author: string
  createdAt: string
}

export interface Activity {
  id: string
  type: 'email' | 'call' | 'meeting' | 'note' | 'status_change'
  title: string
  description?: string
  timestamp: string
  user: string
}

export interface Analytics {
  revenue: number
  revenueChange: number
  leads: number
  leadsChange: number
  conversion: number
  conversionChange: number
  campaigns: number
  campaignsChange: number
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Dashboard types
export interface DashboardActivity {
  id: string
  type: string
  action: string
  lead: string
  time: string
  icon: React.ElementType
}

export interface DashboardTask {
  id: string
  title: string
  due: string
  priority: string
  status: string
}

export interface DashboardCampaign {
  id: string
  name: string
  type: string
  opens: number
  clicks: number
  conversions: number
  roi: string
}

export interface DashboardAlert {
  type: 'urgent' | 'warning' | 'success' | 'info'
  title: string
  message?: string
  description?: string
  category?: string
}

export interface ConversionStage {
  name: string
  count: number
  percentage?: number
}

export interface RevenueMonth {
  month: string
  totalRevenue: number
  deals?: number
}

// Workflow types
export interface WorkflowAction {
  type: string
  config?: Record<string, unknown>
  [key: string]: unknown
}

export interface WorkflowExecution {
  id: string
  status: 'COMPLETED' | 'FAILED' | 'RUNNING' | 'PENDING' | 'IN_PROGRESS' | 'SUCCESS'
  startedAt: string
  completedAt?: string
  createdAt?: string
  error?: string
  nodeId?: string
  nodeName?: string
  workflowName?: string
  result?: string
  duration?: number
}

export interface WorkflowTriggerData {
  conditions?: Record<string, unknown>
  [key: string]: unknown
}

// Report types
export interface ReportConfig {
  name: string
  type: string
  groupBy: string
  metrics: string[]
  dateRange: string
}

export interface SavedReport {
  id: number
  name: string
  description: string
  type: string
  lastRun: string
  creator: string
  category?: string
}

// Email Template types
export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category?: string
  isActive?: boolean
  usageCount?: number
  createdAt?: string
  updatedAt?: string
}

// Team member type
export interface TeamMember {
  id: string
  name?: string
  firstName: string
  lastName: string
  email?: string
  avatar?: string
}

// Assignable user (when assignedTo is an object from API)
export interface AssignedUser {
  id: string
  firstName?: string
  lastName?: string
  _id?: string
}

// Lead note from API
export interface LeadNote {
  id: string
  content: string
  author?: string
  createdAt?: string
  date?: string
  user?: {
    firstName?: string
    lastName?: string
  }
}

// Chart data point
export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

// Enriched campaign (for reports)
export interface EnrichedCampaign {
  id: string
  name: string
  type: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  revenue: number
  createdAt?: string
  recipientCount?: number
  opens?: number
  clicks?: number
  status?: string
  spent?: number
  converted?: number
  conversions?: number
}

// Activity from API
export interface ActivityRecord {
  id: string
  _id?: string
  type: string
  title?: string
  description?: string
  createdAt: string
  user?: {
    firstName?: string
    lastName?: string
    name?: string
  } | string
  userName?: string
  lead?: {
    firstName?: string
    lastName?: string
    name?: string
  }
  leadId?: string | number
  priority?: string
}

// Inbox API response type
export interface ApiSendResponse {
  data?: {
    id?: string | number
    threadId?: string | number
    message?: unknown
  }
  message?: string
  threadId?: string | number
}

// Automation rule (client-side mapped from workflow API)
export interface AutomationRule {
  id: number | string
  name: string
  description: string
  trigger: string
  actions: string[]
  status: 'active' | 'paused'
  executions: number
  lastRun: string
}

// Raw workflow from API response
export interface RawWorkflow {
  id: string | number
  name: string
  description?: string
  triggerType?: string
  trigger?: string
  isActive?: boolean
  status?: string
  actions?: Array<WorkflowAction | string>
  workflowExecutions?: Array<{ startedAt?: string }>
  executions?: number
  lastRun?: string
}

// AI model from performance API
export interface AIModelEntry {
  name?: string
  type?: string
  accuracy?: number
  dataPoints?: number
}

// Campaign timeline data point
export interface TimelineDataPoint {
  date: string
  sent?: number
  opened?: number
  clicked?: number
}

// Hourly engagement entry from API
export interface HourlyEngagementEntry {
  label: string
  opens?: number
  clicks?: number
}

// Device breakdown entry from API
export interface DeviceBreakdownEntry {
  name: string
  count: number
}

// Geographic breakdown entry from API
export interface GeoBreakdownEntry {
  name: string
  count: number
}

// A/B test result entry
export interface ABTestResultEntry {
  id: string
  variantA?: { subject?: string }
  variantB?: { subject?: string }
  _count?: { results?: number }
}

// Campaign preview data
export interface CampaignPreviewData {
  campaignId?: string
  campaignName?: string
  campaignType?: string
  subject?: string
  body?: string
  recipientCount?: number
  estimatedDelivery?: string
  cost?: {
    estimated?: number
    total?: number
    perRecipient?: number
    currency?: string
  }
  statusBreakdown?: Record<string, number>
  sampleRecipients?: Array<{
    id?: string
    email?: string
    name?: string
    phone?: string
    status?: string
    tags?: { id: string; name: string; color?: string }[]
  }>
  messagePreview?: {
    subject?: string
    body?: string
    from?: string
  }
  warnings?: string[]
  [key: string]: unknown
}

// Email template API response
export interface EmailTemplateResponse {
  body?: string
  data?: { body?: string }
}
