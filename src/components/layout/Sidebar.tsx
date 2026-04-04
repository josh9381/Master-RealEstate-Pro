import { Link, useLocation } from 'react-router-dom'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Brain,
  BarChart3,
  MessageSquare,
  Zap,
  Settings,
  Shield,
  CreditCard,
  HelpCircle,
  X,
  ChevronUp,
  Crown,
  UserCog,
} from 'lucide-react'
import { ProfileDropdown } from '@/components/shared/ProfileDropdown'

import type { LucideIcon } from 'lucide-react'

const navigation: { name: string; href: string; icon: LucideIcon }[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'AI Hub', href: '/ai', icon: Brain },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Communications', href: '/communication/inbox', icon: MessageSquare },
  { name: 'Automations', href: '/workflows', icon: Zap },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
]

// Admin/Manager only navigation
const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: Shield, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Team Management', href: '/admin/team', icon: UserCog, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Subscription', href: '/admin/subscription', icon: Crown, roles: ['ADMIN'] },
  { name: 'Billing', href: '/billing', icon: CreditCard, roles: ['ADMIN'] },
]

export function Sidebar() {
  const location = useLocation()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const { user, getSubscriptionTier } = useAuthStore()
  
  // Filter admin navigation based on user role
  const userRole = user?.role?.toUpperCase() as 'ADMIN' | 'MANAGER' | 'USER' | undefined
  const filteredAdminNav = adminNavigation.filter(item => {
    if (!userRole) return false
    return item.roles.includes(userRole)
  })
  
  const tier = getSubscriptionTier()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'flex h-full shrink-0 flex-col border-r bg-card shadow-lg transition-all duration-300 overflow-hidden',
          'fixed left-0 top-0 z-50 lg:relative lg:z-auto',
          sidebarOpen ? 'w-64' : 'w-0 border-r-0'
        )}
        aria-hidden={!sidebarOpen}
      >
        {/* Logo & Close */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">RealEstate<span className="text-primary">Pro</span></span>
          </Link>
          
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href))
              
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              )
            })}
            
            {/* Admin Section */}
            {filteredAdminNav.length > 0 && (
              <>
                <li className="pt-4 pb-2">
                  <div className="flex items-center gap-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Shield className="h-3 w-3" />
                    <span>Administration</span>
                  </div>
                </li>
                
                {filteredAdminNav.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/admin' && location.pathname.startsWith(item.href))
                  
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={cn(
                          'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                        {item.name === 'Subscription' && tier && (
                          <span className={cn(
                            "ml-auto text-xs px-1.5 py-0.5 rounded font-medium",
                            tier === 'STARTER' && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
                            tier === 'PROFESSIONAL' && "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
                            tier === 'ELITE' && "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
                            tier === 'TEAM' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                            tier === 'ENTERPRISE' && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                          )}>
                            {tier}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </>
            )}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t p-4">
          <ProfileDropdown position="above" closeSidebarOnNav>
            {({ toggle, isOpen, displayName, displayEmail, userInitials, avatarUrl }) => (
              <button
                onClick={toggle}
                className="flex items-center space-x-3 w-full rounded-lg p-2 hover:bg-accent transition-colors"
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={displayName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {userInitials}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayEmail}</p>
                </div>
                <ChevronUp className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-180"
                )} />
              </button>
            )}
          </ProfileDropdown>
        </div>
      </aside>
    </>
  )
}

