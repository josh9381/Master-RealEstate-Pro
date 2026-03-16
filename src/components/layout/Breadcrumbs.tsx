import { Link, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Home, ChevronRight } from 'lucide-react'

const LABEL_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  create: 'Create',
  pipeline: 'Pipeline',
  import: 'Import',
  export: 'Export',
  followups: 'Follow-ups',
  history: 'History',
  merge: 'Merge',
  campaigns: 'Campaigns',
  templates: 'Templates',
  schedule: 'Schedule',
  reports: 'Reports',
  'ab-testing': 'A/B Testing',
  ai: 'AI Hub',
  'lead-scoring': 'Lead Scoring',
  segmentation: 'Segmentation',
  'predictive-analytics': 'Predictive Analytics',
  intelligence: 'Intelligence',
  'ai-analytics': 'AI Analytics',
  'ai-settings': 'Settings',
  'org-ai-settings': 'Organization AI',
  'ai-cost-dashboard': 'Cost Dashboard',
  analytics: 'Analytics',
  'lead-analytics': 'Lead Analytics',
  'conversion-reports': 'Conversions',
  'usage-analytics': 'Usage',
  'custom-reports': 'Custom Reports',
  attribution: 'Attribution',
  'goal-tracking': 'Goals',
  'lead-velocity': 'Lead Velocity',
  'source-roi': 'Source ROI',
  'follow-up-analytics': 'Follow-up Analytics',
  'period-comparison': 'Period Comparison',
  communication: 'Communication',
  inbox: 'Inbox',
  'email-templates': 'Email Templates',
  'call-center': 'Call Center',
  'social-media': 'Social Media',
  newsletters: 'Newsletters',
  workflows: 'Workflows',
  builder: 'Builder',
  'automation-rules': 'Automation Rules',
  settings: 'Settings',
  profile: 'Profile',
  business: 'Business',
  team: 'Team',
  'email-config': 'Email',
  notifications: 'Notifications',
  security: 'Security',
  compliance: 'Compliance',
  'google-integration': 'Google Integration',
  'twilio-setup': 'Twilio Setup',
  'service-config': 'Service Config',

  'password-security': 'Password',
  'tags-manager': 'Tags',
  'custom-fields': 'Custom Fields',
  admin: 'Admin',
  subscription: 'Subscription',
  'system-settings': 'System',
  'feature-flags': 'Feature Flags',

  'data-export': 'Data Export',

  'health-check': 'Health Check',
  'database-maintenance': 'Database',
  'audit-trail': 'Audit Trail',
  billing: 'Billing',
  invoices: 'Invoices',
  help: 'Help',
  documentation: 'Documentation',
  support: 'Support',
  tutorials: 'Tutorials',
  integrations: 'Integrations',
  api: 'API',
  calendar: 'Calendar',
  activity: 'Activity',
  tasks: 'Tasks',
}

function getLabel(segment: string): string {
  return LABEL_MAP[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function isIdSegment(segment: string): boolean {
  // Match UUIDs, numeric IDs, and cuid/nanoid-style IDs (long alphanumeric strings)
  return /^[0-9a-f-]{8,}$|^\d+$|^[a-zA-Z0-9_-]{16,}$/.test(segment)
}

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const queryClient = useQueryClient()

  if (pathname === '/' || pathname === '/dashboard') return null

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  // Try to resolve a friendly name for an ID segment from the query cache
  const resolveIdLabel = (idSegment: string, parentSegment?: string): string => {
    if (parentSegment === 'campaigns') {
      const cached = queryClient.getQueryData<Record<string, unknown>>(['campaign', idSegment])
      if (cached?.name) return cached.name as string
    }
    if (parentSegment === 'leads') {
      const cached = queryClient.getQueryData<Record<string, unknown>>(['lead', idSegment])
      if (cached) {
        const name = [cached.firstName, cached.lastName].filter(Boolean).join(' ')
        if (name) return name
      }
    }
    return idSegment.length > 12 ? `${idSegment.slice(0, 8)}…` : idSegment
  }

  // Build breadcrumb items
  const items: { label: string; path: string }[] = []
  let currentPath = ''
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    currentPath += `/${seg}`
    if (isIdSegment(seg)) {
      const parentSeg = i > 0 ? segments[i - 1] : undefined
      items.push({ label: resolveIdLabel(seg, parentSeg), path: currentPath })
    } else {
      items.push({ label: getLabel(seg), path: currentPath })
    }
  }

  // Collapse middle segments at 4+ depth
  let displayItems = items
  if (items.length >= 4) {
    displayItems = [
      items[0],
      { label: '…', path: '' },
      items[items.length - 2],
      items[items.length - 1],
    ]
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
      <Link
        to="/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </Link>
      {displayItems.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          {item.path && i < displayItems.length - 1 ? (
            <Link to={item.path} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
