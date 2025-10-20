import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Bell,
  Check,
  AtSign,
  UserPlus,
  TrendingUp,
  Settings,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  AlertCircle,
  X
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface Notification {
  id: number
  type: 'mention' | 'assignment' | 'update' | 'system' | 'email' | 'sms' | 'call' | 'meeting'
  title: string
  message: string
  time: string
  read: boolean
  link?: string
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    type: 'mention',
    title: 'Sarah mentioned you',
    message: 'Sarah mentioned you in a comment on lead "Tech Corp"',
    time: '5 min ago',
    read: false,
    link: '/leads/123'
  },
  {
    id: 2,
    type: 'assignment',
    title: 'New lead assigned',
    message: 'John assigned you to follow up with "Enterprise Solutions"',
    time: '15 min ago',
    read: false,
    link: '/leads/124'
  },
  {
    id: 3,
    type: 'email',
    title: 'Email received',
    message: 'Michael Johnson replied to your email about the proposal',
    time: '1 hour ago',
    read: false,
    link: '/communication'
  },
  {
    id: 4,
    type: 'update',
    title: 'Lead status changed',
    message: 'Lead "ABC Inc" moved from Qualified to Proposal',
    time: '2 hours ago',
    read: true,
    link: '/leads/125'
  },
  {
    id: 5,
    type: 'meeting',
    title: 'Upcoming meeting',
    message: 'Meeting with "Global Tech" starts in 30 minutes',
    time: '3 hours ago',
    read: false,
    link: '/calendar'
  },
  {
    id: 6,
    type: 'sms',
    title: 'SMS received',
    message: 'Lisa Chen: "Thanks for the follow-up call today!"',
    time: '4 hours ago',
    read: true,
    link: '/communication'
  },
  {
    id: 7,
    type: 'system',
    title: 'System update',
    message: 'New AI features are now available in the platform',
    time: '1 day ago',
    read: true,
    link: '/ai'
  }
]

interface NotificationPanelProps {
  onClose: () => void
  onMarkAllRead: () => void
}

export function NotificationPanel({ onClose, onMarkAllRead }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [activeFilter, setActiveFilter] = useState<'all' | 'mention' | 'assignment' | 'update'>('all')
  const navigate = useNavigate()
  const { toast } = useToast()

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'mention':
        return <AtSign className="h-4 w-4 text-blue-500" />
      case 'assignment':
        return <UserPlus className="h-4 w-4 text-green-500" />
      case 'update':
        return <TrendingUp className="h-4 w-4 text-purple-500" />
      case 'system':
        return <Settings className="h-4 w-4 text-gray-500" />
      case 'email':
        return <Mail className="h-4 w-4 text-cyan-500" />
      case 'sms':
        return <MessageSquare className="h-4 w-4 text-orange-500" />
      case 'call':
        return <Phone className="h-4 w-4 text-pink-500" />
      case 'meeting':
        return <Calendar className="h-4 w-4 text-yellow-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const filteredNotifications = notifications.filter((n: Notification) => {
    if (activeFilter === 'all') return true
    return n.type === activeFilter
  })

  const unreadCount = notifications.filter((n: Notification) => !n.read).length

  const handleMarkAsRead = (id: number) => {
    setNotifications(notifications.map((n: Notification) =>
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n: Notification) => ({ ...n, read: true })))
    onMarkAllRead()
    toast.success('All notifications marked as read')
  }

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id)
    if (notification.link) {
      navigate(notification.link)
      onClose()
    }
  }

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications(notifications.filter((n: Notification) => n.id !== id))
    toast.success('Notification removed')
  }

  return (
    <Card className="absolute right-0 top-12 w-96 max-h-[600px] shadow-lg border z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1">
          <Button
            variant={activeFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('all')}
            className="flex-1"
          >
            All
          </Button>
          <Button
            variant={activeFilter === 'mention' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('mention')}
            className="flex-1"
          >
            Mentions
          </Button>
          <Button
            variant={activeFilter === 'assignment' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('assignment')}
            className="flex-1"
          >
            Assigned
          </Button>
          <Button
            variant={activeFilter === 'update' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('update')}
            className="flex-1"
          >
            Updates
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredNotifications.map((notification: Notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm line-clamp-1">
                        {notification.title}
                      </p>
                      <button
                        onClick={(e) => handleDelete(notification.id, e)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-xs text-muted-foreground">
                        {notification.time}
                      </p>
                      {!notification.read && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t flex gap-2">
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="flex-1"
          >
            <Check className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            navigate('/notifications')
            onClose()
          }}
          className="flex-1"
        >
          View all
        </Button>
      </div>
    </Card>
  )
}
