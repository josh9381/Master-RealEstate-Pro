import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { Menu, Search, Moon, Sun, User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '../ui/Button'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal'

export function Header() {
  const { toggleSidebar, theme, toggleTheme } = useUIStore()
  const { user, logout } = useAuthStore()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const navigate = useNavigate()

  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearchModal(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogout = async () => {
    setShowProfileMenu(false)
    await logout()
    navigate('/auth/login')
  }

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User Name'
  const displayEmail = user?.email || 'user@example.com'
  const userInitials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6 shadow-sm">
      {/* Left: Menu */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 flex justify-center px-4">
        <Button
          variant="outline"
          className="w-full max-w-md flex items-center justify-between px-4 text-muted-foreground hover:text-foreground"
          onClick={() => setShowSearchModal(true)}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="text-sm">Search anything...</span>
          </div>
          <kbd className="hidden sm:inline-flex h-5 px-1.5 items-center gap-1 rounded border bg-muted text-[10px] font-medium">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>

        <NotificationBell />

        {/* Profile Dropdown */}
        <div className="relative ml-2">
          <Button 
            variant="ghost" 
            className="flex items-center space-x-2"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                {userInitials}
              </div>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-card border rounded-lg shadow-lg z-20">
                <div className="p-3 border-b">
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayEmail}</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false)
                      navigate('/settings/profile')
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
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                  <div className="border-t my-2" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
      />
    </header>
  )
}
