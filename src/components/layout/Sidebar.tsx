import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  User,
  LogOut,
  ChevronUp,
  Crown,
  UserCog,
  Building2,
  ChevronRight,
} from 'lucide-react'
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

const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: Shield, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Team Management', href: '/admin/team', icon: UserCog, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Subscription', href: '/admin/subscription', icon: Crown, roles: ['ADMIN'] },
  { name: 'Billing', href: '/billing', icon: CreditCard, roles: ['ADMIN'] },
]

const tierColors: Record<string, string> = {
  STARTER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PROFESSIONAL: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  ELITE: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  TEAM: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ENTERPRISE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const { user, logout, getSubscriptionTier } = useAuthStore()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const handleLogout = async () => {
    setShowProfileMenu(false)
    await logout()
    navigate('/auth/login')
  }

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User'
  const displayEmail = user?.email || ''
  const userInitials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U'
  const userRole = user?.role?.toUpperCase() as 'ADMIN' | 'MANAGER' | 'USER' | undefined
  const filteredAdminNav = adminNavigation.filter(item => {
    if (!userRole) return false
    return item.roles.includes(userRole)
  })
  const tier = getSubscriptionTier()

  if (!sidebarOpen) return null

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      </AnimatePresence>

      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col shadow-2xl lg:translate-x-0"
        style={{
          background: 'hsl(var(--sidebar-bg))',
          borderRight: '1px solid hsl(var(--sidebar-border))',
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div
          className="relative flex h-16 items-center justify-between px-5"
          style={{ borderBottom: '1px solid hsl(var(--sidebar-border))' }}
        >
          <Link to="/" className="flex items-center gap-3 group" onClick={() => setSidebarOpen(false)}>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)',
                boxShadow: '0 4px 12px hsl(var(--primary) / 0.4)',
              }}
            >
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none" style={{ color: 'hsl(var(--sidebar-fg))' }}>
                RealEstate Pro
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--sidebar-muted))' }}>
                CRM Platform
              </p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            aria-label="Close sidebar"
            style={{ color: 'hsl(var(--sidebar-muted))' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          <div className="mb-1">
            <p
              className="px-3 mb-2 font-semibold uppercase tracking-widest"
              style={{ color: 'hsl(var(--sidebar-muted) / 0.6)', fontSize: '10px' }}
            >
              Main Menu
            </p>
            <ul className="space-y-0.5">
              {navigation.map((item, index) => {
                const isActive = location.pathname === item.href ||
                  (item.href !== '/' && location.pathname.startsWith(item.href))
                return (
                  <motion.li
                    key={item.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                  >
                    <Link
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn('group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150')}
                      style={isActive
                        ? { background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--sidebar-accent))', boxShadow: 'inset 3px 0 0 hsl(var(--sidebar-accent))' }
                        : { color: 'hsl(var(--sidebar-muted))' }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                          e.currentTarget.style.color = 'hsl(var(--sidebar-fg))'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = ''
                          e.currentTarget.style.color = 'hsl(var(--sidebar-muted))'
                        }
                      }}
                    >
                      <item.icon style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                      <span className="flex-1">{item.name}</span>
                      {isActive && (
                        <ChevronRight
                          className="h-3.5 w-3.5 opacity-60"
                          style={{ color: 'hsl(var(--sidebar-accent))' }}
                        />
                      )}
                    </Link>
                  </motion.li>
                )
              })}
            </ul>
          </div>

          {filteredAdminNav.length > 0 && (
            <div className="mt-5">
              <div
                className="flex items-center gap-2 px-3 mb-2"
                style={{ color: 'hsl(var(--sidebar-muted) / 0.6)' }}
              >
                <Shield className="h-3 w-3" />
                <p className="font-semibold uppercase tracking-widest" style={{ fontSize: '10px' }}>
                  Administration
                </p>
              </div>
              <ul className="space-y-0.5">
                {filteredAdminNav.map((item, index) => {
                  const isActive = location.pathname === item.href ||
                    (item.href !== '/admin' && location.pathname.startsWith(item.href))
                  return (
                    <motion.li
                      key={item.name}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (navigation.length + index) * 0.03, duration: 0.2 }}
                    >
                      <Link
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn('group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150')}
                        style={isActive
                          ? { background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--sidebar-accent))', boxShadow: 'inset 3px 0 0 hsl(var(--sidebar-accent))' }
                          : { color: 'hsl(var(--sidebar-muted))' }
                        }
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                            e.currentTarget.style.color = 'hsl(var(--sidebar-fg))'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = ''
                            e.currentTarget.style.color = 'hsl(var(--sidebar-muted))'
                          }
                        }}
                      >
                        <item.icon style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                        <span className="flex-1">{item.name}</span>
                        {item.name === 'Subscription' && tier && (
                          <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded-md font-semibold border',
                            tierColors[tier] || 'bg-muted/500/20 text-muted-foreground border-gray-500/30'
                          )}>
                            {tier}
                          </span>
                        )}
                      </Link>
                    </motion.li>
                  )
                })}
              </ul>
            </div>
          )}
        </nav>

        {/* User Section */}
        <div
          className="relative p-3"
          style={{ borderTop: '1px solid hsl(var(--sidebar-border))' }}
        >
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 w-full rounded-xl p-2.5 transition-all duration-150"
            style={{ color: 'hsl(var(--sidebar-fg))' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
            aria-expanded={showProfileMenu}
            aria-haspopup="true"
            aria-label="User menu"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--primary) / 0.15))',
                  color: 'hsl(var(--sidebar-accent))',
                  border: '1px solid hsl(var(--primary) / 0.3)',
                }}
              >
                {userInitials}
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold truncate leading-none" style={{ color: 'hsl(var(--sidebar-fg))' }}>
                {displayName}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(var(--sidebar-muted))' }}>
                {displayEmail}
              </p>
            </div>
            <ChevronUp
              className={cn('h-4 w-4 flex-shrink-0 transition-transform duration-200', showProfileMenu && 'rotate-180')}
              style={{ color: 'hsl(var(--sidebar-muted))' }}
            />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute bottom-full left-3 right-3 mb-2 rounded-xl overflow-hidden shadow-2xl"
                style={{
                  background: 'hsl(224 50% 10%)',
                  border: '1px solid hsl(var(--sidebar-border))',
                }}
              >
                <div className="p-1.5">
                  <button
                    onClick={() => { setShowProfileMenu(false); navigate('/settings/profile'); setSidebarOpen(false) }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-lg transition-colors"
                    style={{ color: 'hsl(var(--sidebar-fg))' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                  >
                    <User className="h-4 w-4 opacity-70" />
                    <span>Profile Settings</span>
                  </button>
                  <button
                    onClick={() => { setShowProfileMenu(false); navigate('/settings'); setSidebarOpen(false) }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-lg transition-colors"
                    style={{ color: 'hsl(var(--sidebar-fg))' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                  >
                    <Settings className="h-4 w-4 opacity-70" />
                    <span>Settings</span>
                  </button>
                  <div className="my-1.5 mx-1" style={{ borderTop: '1px solid hsl(var(--sidebar-border))' }} />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-lg transition-colors"
                    style={{ color: '#F87171' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  )
}
