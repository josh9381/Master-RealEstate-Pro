import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api'

const TITLE_MAP: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/leads/create': 'Create Lead',
  '/leads/pipeline': 'Pipeline',
  '/leads/import': 'Import Leads',
  '/leads/export': 'Export Leads',
  '/leads/followups': 'Follow-ups',
  '/leads/history': 'Lead History',
  '/leads/merge': 'Merge Leads',
  '/campaigns': 'Campaigns',
  '/campaigns/create': 'Create Campaign',
  '/campaigns/templates': 'Templates',
  '/campaigns/schedule': 'Schedule',
  '/campaigns/reports': 'Campaign Reports',
  '/campaigns/ab-testing': 'A/B Testing',
  '/ai': 'AI Hub',
  '/ai/lead-scoring': 'Lead Scoring',
  '/ai/segmentation': 'Segmentation',
  '/ai/predictive-analytics': 'Predictive Analytics',
  '/ai/intelligence': 'Intelligence',
  '/ai/ai-analytics': 'AI Analytics',
  '/ai/ai-settings': 'AI Settings',
  '/ai/org-ai-settings': 'Organization AI',
  '/ai/ai-cost-dashboard': 'AI Costs',
  '/analytics': 'Analytics',
  '/analytics/leads': 'Lead Analytics',
  '/analytics/conversions': 'Conversions',
  '/analytics/usage': 'Usage Analytics',
  '/analytics/custom-reports': 'Custom Reports',
  '/analytics/attribution': 'Attribution',
  '/analytics/goals': 'Goal Tracking',
  '/analytics/lead-velocity': 'Lead Velocity',
  '/analytics/source-roi': 'Source ROI',
  '/analytics/follow-up-analytics': 'Follow-up Analytics',
  '/analytics/period-comparison': 'Period Comparison',
  '/communication/inbox': 'Inbox',
  '/communication/email-templates': 'Email Templates',
  '/communication/call-center': 'Call Center',
  '/communication/social-media': 'Social Media',
  '/communication/newsletters': 'Newsletters',
  '/workflows': 'Workflows',
  '/workflows/automation-rules': 'Automation Rules',
  '/settings': 'Settings',
  '/settings/profile': 'Profile',
  '/settings/business': 'Business',
  '/settings/team': 'Team',
  '/settings/email-config': 'Email Settings',
  '/settings/notifications': 'Notifications',
  '/settings/security': 'Security',
  '/settings/compliance': 'Compliance',
  '/settings/google-integration': 'Google Integration',
  '/settings/twilio-setup': 'Twilio Setup',
  '/settings/service-config': 'Service Config',

  '/settings/password-security': 'Password',
  '/settings/tags-manager': 'Tags',
  '/settings/custom-fields': 'Custom Fields',
  '/admin': 'Admin',
  '/admin/subscription': 'Subscription',
  '/admin/system-settings': 'System Settings',
  '/admin/feature-flags': 'Feature Flags',

  '/admin/data-export': 'Data Export',

  '/admin/health-check': 'Health Check',
  '/admin/database-maintenance': 'Database Maintenance',
  '/admin/audit-trail': 'Audit Trail',
  '/billing': 'Billing',
  '/help': 'Help Center',
  '/help/documentation': 'Documentation',
  '/help/support': 'Support',
  '/help/tutorials': 'Tutorials',
  '/integrations': 'Integrations',
  '/integrations/api': 'API Integrations',
  '/calendar': 'Calendar',
  '/activity': 'Activity',
  '/tasks': 'Tasks',
  '/notifications': 'Notifications',
}

function getPageTitle(pathname: string): string {
  // Direct match
  if (TITLE_MAP[pathname]) return TITLE_MAP[pathname]

  // Pattern matches for dynamic routes (e.g., /leads/:id, /campaigns/:id)
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length >= 2) {
    const base = `/${segments[0]}`
    const isDynamic = /^[0-9a-f-]{8,}$|^\d+$/.test(segments[1])
    if (isDynamic) {
      const parentLabel = TITLE_MAP[base]
      if (parentLabel) return `${parentLabel} Detail`
    }
    // Try parent + child for 3-segment paths like /workflows/builder/:id
    if (segments.length >= 3) {
      const parentPath = `/${segments[0]}/${segments[1]}`
      if (TITLE_MAP[parentPath]) return TITLE_MAP[parentPath]
    }
  }

  // Fallback: humanize last segment
  const last = segments[segments.length - 1] || 'Dashboard'
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function usePageTitle() {
  const { pathname } = useLocation()

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) return 0
      const res = await notificationsApi.getUnreadCount()
      return res.data?.count || 0
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })

  useEffect(() => {
    const pageName = getPageTitle(pathname)
    const prefix = unreadCount > 0 ? `(${unreadCount}) ` : ''
    document.title = `${prefix}RealEstate Pro — ${pageName}`
  }, [pathname, unreadCount])
}
