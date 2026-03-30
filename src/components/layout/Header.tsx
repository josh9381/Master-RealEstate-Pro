import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  Moon,
  Sun,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  HelpCircle,
} from 'lucide-react'

export function Header() {
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User'
  const displayEmail = user?.email || ''
  const userInitials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U'

  const handleLogout = async () => {
    setShowProfileMenu(false)
    await logout()
    navigate('/auth/login')
  }

  return (
    <>
      <header
        className="sticky top-0 z-30 flex h-14 items-center justify-between px-4 transition-all duration-200"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          borderBottom: '1px solid hsl(var(--border))',
          boxShadow: '0 1px 3px rgb(0 0 0 / 0.04)',
        }}
      >
        {/* Left: Menu Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="h-8 w-8 rounded-lg hover:bg-accent"
          >
            <motion.div
              animate={{ rotate: sidebarOpen ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              <Menu className="h-4 w-4" />
            </motion.div>
          </Button>
        </div>

        {/* Center: Search */}
        <div className="flex-1 flex justify-center px-4 max-w-xl mx-auto">
          <button
            onClick={() => setShowSearchModal(true)}
            className="w-full flex items-center gap-2.5 px-3.5 h-9 rounded-lg text-sm transition-all duration-150 group"
            style={{
              background: 'hsl(var(--muted))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--muted-foreground))',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'hsl(var(--primary) / 0.4)'
              e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--primary) / 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'hsl(var(--border))'
              e.currentTarget.style.boxShadow = ''
            }}
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="flex-1 text-left text-sm">Search anything...</span>
            <kbd
              className="hidden sm:inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
              style={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              <span>⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="h-8 w-8 rounded-lg"
          >
            <AnimatePresence mode="wait">
              {theme === 'light' ? (
                <motion.div
                  key="moon"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Moon className="h-4 w-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Sun className="h-4 w-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          {/* Notifications */}
          <NotificationBell />

          {/* Divider */}
          <div className="w-px h-5 mx-1" style={{ background: 'hsl(var(--border))' }} />

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-150"
              style={{ color: 'hsl(var(--foreground))' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--accent))' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
              aria-label="User menu"
              aria-expanded={showProfileMenu}
              aria-haspopup="true"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)',
                    color: 'white',
                  }}
                >
                  {userInitials}
                </div>
              )}
              <span className="hidden sm:block text-sm font-medium max-w-24 truncate">
                {user?.firstName || 'User'}
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200 opacity-60',
                  showProfileMenu && 'rotate-180'
                )}
              />
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50"
                    style={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.2)',
                    }}
                  >
                    {/* User info */}
                    <div
                      className="px-4 py-3"
                      style={{ borderBottom: '1px solid hsl(var(--border))' }}
                    >
                      <p className="text-sm font-semibold truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{displayEmail}</p>
                    </div>

                    {/* Menu items */}
                    <div className="p-1.5">
                      <button
                        onClick={() => { setShowProfileMenu(false); navigate('/settings/profile') }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg transition-colors hover:bg-accent text-left"
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Profile Settings</span>
                      </button>
                      <button
                        onClick={() => { setShowProfileMenu(false); navigate('/settings') }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg transition-colors hover:bg-accent text-left"
                      >
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span>Settings</span>
                      </button>
                      <button
                        onClick={() => { setShowProfileMenu(false); navigate('/help') }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg transition-colors hover:bg-accent text-left"
                      >
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        <span>Help Center</span>
                      </button>
                      <div className="my-1.5" style={{ borderTop: '1px solid hsl(var(--border))' }} />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {showSearchModal && (
        <GlobalSearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
      )}
    </>
  )
}
