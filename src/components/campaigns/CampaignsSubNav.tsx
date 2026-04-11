import { Link, useLocation } from 'react-router-dom'
import {
  Megaphone,
  Mail,
  MessageSquare,
  Phone,
  Share2,
  Calendar,
  PieChart,
  BarChart3,
  FileText,
  FlaskConical,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Campaign } from '@/types'

const pageNavItems = [
  { name: 'Templates', href: '/campaigns/templates', icon: FileText },
  { name: 'Schedule', href: '/campaigns/schedule', icon: Calendar },
  { name: 'Analytics', href: '/campaigns/analytics', icon: PieChart },
  { name: 'Reports', href: '/campaigns/reports', icon: BarChart3 },
  { name: 'A/B Testing', href: '/campaigns/ab-testing', icon: FlaskConical },
]

const typeFilters = [
  { key: 'all' as const, label: 'All', icon: Megaphone },
  { key: 'EMAIL' as const, label: 'Email', icon: Mail },
  { key: 'SMS' as const, label: 'SMS', icon: MessageSquare },
  { key: 'PHONE' as const, label: 'Phone', icon: Phone, comingSoon: true },
  { key: 'SOCIAL' as const, label: 'Social Media', icon: Share2, comingSoon: true },
]

type CampaignType = 'all' | 'EMAIL' | 'SMS' | 'PHONE' | 'SOCIAL'

interface CampaignsSubNavProps {
  /** Campaign data for showing counts in type filter buttons */
  campaigns?: Campaign[]
  /** Current type filter value */
  typeFilter?: CampaignType
  /** Callback when type filter changes */
  onTypeFilterChange?: (type: CampaignType) => void
}

export function CampaignsSubNav({ campaigns, typeFilter, onTypeFilterChange }: CampaignsSubNavProps) {
  const location = useLocation()

  const isActive = (href: string) => {
    return location.pathname.startsWith(href)
  }

  const hasTypeFilterProps = campaigns && typeFilter !== undefined && onTypeFilterChange

  return (
    <div className="flex items-center justify-between border-b pb-4">
      <nav className="flex items-center gap-1 overflow-x-auto">
        {/* Type filter buttons — with counts when on the list page, simple links otherwise */}
        {hasTypeFilterProps ? (
          typeFilters.map((item) => {
            const Icon = item.icon
            const count = item.key === 'all'
              ? campaigns.length
              : campaigns.filter(c => (c.type || '').toUpperCase() === item.key).length
            const active = typeFilter === item.key
            return (
              <button
                key={item.key}
                onClick={() => onTypeFilterChange(item.key)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium px-3 py-2 transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                <span className={`text-xs ${active ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  ({count})
                </span>
                {item.comingSoon && (
                  <Badge variant="warning" className="ml-1 text-[10px] px-1.5 py-0">
                    Coming Soon
                  </Badge>
                )}
              </button>
            )
          })
        ) : (
          <Link to="/campaigns">
            <Button
              variant={
                location.pathname === '/campaigns' ||
                (location.pathname.startsWith('/campaigns/') &&
                  !pageNavItems.some(item => location.pathname.startsWith(item.href)))
                  ? 'default'
                  : 'ghost'
              }
              size="sm"
              className={`gap-2 whitespace-nowrap ${
                location.pathname === '/campaigns' ||
                (location.pathname.startsWith('/campaigns/') &&
                  !pageNavItems.some(item => location.pathname.startsWith(item.href)))
                  ? ''
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Megaphone className="h-4 w-4" />
              Campaigns
            </Button>
          </Link>
        )}

        {/* Separator */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* Page navigation items */}
        {pageNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link key={item.href} to={item.href}>
              <Button
                variant={active ? 'default' : 'ghost'}
                size="sm"
                className={`gap-2 whitespace-nowrap ${
                  active ? '' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
