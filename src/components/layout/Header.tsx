import { useUIStore } from '@/store/uiStore'
import { Menu, Search, Moon, Sun, User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function Header() {
  const { toggleSidebar, theme, toggleTheme } = useUIStore()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6 shadow-sm">
      {/* Left: Menu & Search */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-64 pl-9"
          />
        </div>
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
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
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
                  <p className="font-medium">User Name</p>
                  <p className="text-xs text-muted-foreground">user@example.com</p>
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
            </>
          )}
        </div>
      </div>
    </header>
  )
}
