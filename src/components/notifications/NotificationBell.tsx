import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { NotificationPanel } from './NotificationPanel'
import { notificationsApi } from '@/lib/api'
import { useSocketEvent } from '@/hooks/useSocket'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setUnreadCount(0)
        return
      }
      const response = await notificationsApi.getUnreadCount()
      setUnreadCount(response.data?.count || 0)
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } })?.response?.status === 401) {
        setUnreadCount(0)
      } else {
        console.error('Failed to fetch unread count:', error)
      }
    }
  }, [])

  // Initial fetch + slow polling as fallback (every 60s instead of 30s)
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 60000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Real-time: listen for new notifications via Socket.io
  useSocketEvent('notification', () => {
    setUnreadCount((prev) => prev + 1)
  })

  // Real-time: listen for explicit count adjustments
  useSocketEvent<{ delta?: number; count?: number }>('notification:count', (data) => {
    if (data.count !== undefined) {
      setUnreadCount(data.count)
    } else if (data.delta !== undefined) {
      setUnreadCount((prev) => Math.max(0, prev + data.delta!))
    }
  })

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
