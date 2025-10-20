import { useUIStore } from '@/store/uiStore'
import { Menu, Search, Moon, Sun } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { NotificationBell } from '@/components/notifications/NotificationBell'

export function Header() {
  const { toggleSidebar, theme, toggleTheme } = useUIStore()

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

        <Button variant="ghost" className="ml-2">
          <div className="h-8 w-8 rounded-full bg-primary/10" />
        </Button>
      </div>
    </header>
  )
}
