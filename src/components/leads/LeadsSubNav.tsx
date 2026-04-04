import { Link, useLocation } from 'react-router-dom'
import { 
  Users, 
  SquareKanban, 
  Clock, 
  Upload, 
  Download, 
  History, 
  Merge,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

const navItems = [
  { name: 'All Leads', href: '/leads', icon: Users, exact: true },
  { name: 'Pipeline', href: '/leads/pipeline', icon: SquareKanban },
  { name: 'Follow-ups', href: '/leads/followups', icon: Clock },
  { name: 'Segments', href: '/leads/segments', icon: Filter },
  { name: 'Import', href: '/leads/import', icon: Upload },
  { name: 'Export', href: '/leads/export', icon: Download },
  { name: 'History', href: '/leads/history', icon: History },
  { name: 'Merge', href: '/leads/merge', icon: Merge },
]

export function LeadsSubNav() {
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
              </Button>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
