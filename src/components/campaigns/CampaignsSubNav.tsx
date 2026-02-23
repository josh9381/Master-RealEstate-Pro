import { Link, useLocation } from 'react-router-dom'
import {
  Megaphone,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  BarChart3,
  FileText,
  FlaskConical,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FeatureGate, UsageBadge } from '@/components/subscription/FeatureGate'

const navItems = [
  { name: 'All', href: '/campaigns', icon: Megaphone, exact: true },
  { name: 'Email', href: '/campaigns/email', icon: Mail },
  { name: 'SMS', href: '/campaigns/sms', icon: MessageSquare },
  { name: 'Phone', href: '/campaigns/phone', icon: Phone, comingSoon: true },
  { name: 'Templates', href: '/campaigns/templates', icon: FileText },
  { name: 'Schedule', href: '/campaigns/schedule', icon: Calendar },
  { name: 'Reports', href: '/campaigns/reports', icon: BarChart3 },
  { name: 'A/B Testing', href: '/campaigns/ab-testing', icon: FlaskConical },
]

interface CampaignsSubNavProps {
  /** Hide the "Create Campaign" button (e.g. on the Create page itself) */
  hideCreateButton?: boolean
}

export function CampaignsSubNav({ hideCreateButton }: CampaignsSubNavProps) {
  const location = useLocation()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="flex items-center justify-between border-b pb-4 mb-6">
      <nav className="flex items-center gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
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
                {item.comingSoon && (
                  <Badge variant="warning" className="ml-1 text-[10px] px-1.5 py-0">
                    Soon
                  </Badge>
                )}
              </Button>
            </Link>
          )
        })}
      </nav>
      {!hideCreateButton && (
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <UsageBadge resource="campaigns" />
          <FeatureGate resource="campaigns">
            <Link to="/campaigns/create">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Create Campaign
              </Button>
            </Link>
          </FeatureGate>
        </div>
      )}
    </div>
  )
}
