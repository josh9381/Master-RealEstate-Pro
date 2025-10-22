import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Brain,
  BarChart3,
  MessageSquare,
  Zap,
  Link as LinkIcon,
  Settings,
  Shield,
  CreditCard,
  HelpCircle,
  X,
  User,
  LogOut,
  ChevronUp,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'AI Hub', href: '/ai', icon: Brain },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Communications', href: '/communication', icon: MessageSquare },
  { name: 'Automation', href: '/workflows', icon: Zap },
  { name: 'Integrations', href: '/integrations', icon: LinkIcon },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Admin', href: '/admin', icon: Shield },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Help', href: '/help', icon: HelpCircle },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  if (!sidebarOpen) return null

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r bg-card shadow-lg transition-transform duration-300 lg:translate-x-0">
        {/* Logo & Close */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">CRM Platform</span>
          </Link>
          
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
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
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t p-4">
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-3 w-full rounded-lg p-2 hover:bg-accent transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">User Name</p>
                <p className="text-xs text-muted-foreground">user@example.com</p>
              </div>
              <ChevronUp className={cn(
                "h-4 w-4 transition-transform",
                showProfileMenu && "rotate-180"
              )} />
            </button>

            {/* Profile Menu */}
            {showProfileMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border rounded-lg shadow-lg">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false)
                      navigate('/settings/profile')
                      setSidebarOpen(false)
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false)
                      navigate('/settings')
                      setSidebarOpen(false)
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                  <div className="border-t my-2" />
                  <button
                    onClick={() => {
                      setShowProfileMenu(false)
                      navigate('/auth/login')
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
