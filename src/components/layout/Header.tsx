import { useUIStore } from '@/store/uiStore'
import { Menu, Search, Moon, Sun, ChevronDown } from 'lucide-react'
import { Button } from '../ui/Button'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useState, useCallback } from 'react'
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal'
import { ProfileDropdown } from '@/components/shared/ProfileDropdown'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'

export function Header() {
  const { toggleSidebar, theme, toggleTheme } = useUIStore()
  const [showSearchModal, setShowSearchModal] = useState(false)

  const openSearch = useCallback(() => setShowSearchModal(true), [])
  useGlobalShortcuts({ onOpenSearch: openSearch })

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6 shadow-sm">
      {/* Left: Menu */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
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
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Alt+K
          </kbd>
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-pressed={theme === 'dark'}
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>

        <NotificationBell />

        {/* Profile Dropdown */}
        <div className="ml-2">
          <ProfileDropdown position="below">
            {({ toggle, isOpen, displayName, userInitials, avatarUrl }) => (
              <Button
                variant="ghost"
                className="flex items-center space-x-2"
                onClick={toggle}
                aria-label="User menu"
                aria-expanded={isOpen}
                aria-haspopup="true"
              >
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
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
            )}
          </ProfileDropdown>
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
