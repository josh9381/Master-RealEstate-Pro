import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { User, Settings, LogOut } from 'lucide-react'

interface ProfileDropdownProps {
  /** Where the menu appears relative to the trigger */
  position?: 'above' | 'below'
  /** Close sidebar on navigation (for sidebar usage) */
  closeSidebarOnNav?: boolean
  children: (props: {
    toggle: () => void
    isOpen: boolean
    displayName: string
    displayEmail: string
    userInitials: string
    avatarUrl: string | undefined
  }) => React.ReactNode
}

export function ProfileDropdown({ position = 'below', closeSidebarOnNav = false, children }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { setSidebarOpen } = useUIStore()
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User'
  const displayEmail = user?.email || ''
  const userInitials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U'
  const avatarUrl = user?.avatar

  const handleNav = (path: string) => {
    setIsOpen(false)
    navigate(path)
    if (closeSidebarOnNav) setSidebarOpen(false)
  }

  const handleLogout = async () => {
    setIsOpen(false)
    await logout()
    navigate('/auth/login')
  }

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  const positionClass = position === 'above'
    ? 'absolute bottom-full left-0 right-0 mb-2'
    : 'absolute right-0 mt-2 w-56'

  return (
    <div className="relative" ref={menuRef}>
      {children({
        toggle: () => setIsOpen(!isOpen),
        isOpen,
        displayName,
        displayEmail,
        userInitials,
        avatarUrl,
      })}

      {isOpen && (
        <>
          {position === 'below' && (
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          )}
          <div className={`${positionClass} bg-card border rounded-lg shadow-lg z-20`} role="menu" aria-label="User menu">
            {position === 'below' && (
              <div className="p-3 border-b">
                <p className="font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{displayEmail}</p>
              </div>
            )}
            <div className="p-2">
              <button
                onClick={() => handleNav('/settings/profile')}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                role="menuitem"
              >
                <User className="h-4 w-4" />
                <span>Profile Settings</span>
              </button>
              <button
                onClick={() => handleNav('/settings')}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                role="menuitem"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
              <div className="border-t my-2" />
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
