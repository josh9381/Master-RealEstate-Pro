import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { NotificationPanel } from './NotificationPanel'
import { notificationsApi } from '@/lib/api'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Fetch unread count on mount and every 30 seconds
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000) // Poll every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      // Check if user is authenticated before making request
      const token = localStorage.getItem('token')
      if (!token) {
        setUnreadCount(0)
        return
      }
      
      const response = await notificationsApi.getUnreadCount()
      setUnreadCount(response.data?.count || 0)
    } catch (error: any) {
      // Silently handle 401 errors (not logged in)
      if (error?.response?.status === 401) {
        setUnreadCount(0)
      } else {
        console.error('Failed to fetch unread count:', error)
      }
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAllRead = () => {
    setUnreadCount(0)
    fetchUnreadCount()
  }

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div ref={panelRef}>
          <NotificationPanel
            onClose={() => setIsOpen(false)}
            onMarkAllRead={handleMarkAllRead}
          />
        </div>
      )}
    </div>
  )
}
