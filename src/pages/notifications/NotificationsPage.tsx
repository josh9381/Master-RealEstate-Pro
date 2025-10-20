import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AtSign,
  UserPlus,
  TrendingUp,
  Settings,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  Search,
  Archive
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'

interface Notification {
  id: number
  type: 'mention' | 'assignment' | 'update' | 'system' | 'email' | 'sms' | 'call' | 'meeting'
  title: string
  message: string
  time: string
  date: string
  read: boolean
  link?: string
  leadName?: string
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    type: 'mention',
    title: 'Sarah mentioned you',
    message: 'Sarah mentioned you in a comment on lead "Tech Corp" regarding the Q4 pricing discussion',
    time: '5 min ago',
    date: '2025-10-20',
    read: false,
    link: '/leads/123',
    leadName: 'Tech Corp'
  },
  {
    id: 2,
    type: 'assignment',
    title: 'New lead assigned',
    message: 'John assigned you to follow up with "Enterprise Solutions" - high priority deal worth $150k',
    time: '15 min ago',
    date: '2025-10-20',
    read: false,
    link: '/leads/124',
    leadName: 'Enterprise Solutions'
  },
  {
    id: 3,
    type: 'email',
    title: 'Email received',
    message: 'Michael Johnson replied to your email about the proposal with additional questions',
    time: '1 hour ago',
    date: '2025-10-20',
    read: false,
    link: '/communication'
  },
  {
    id: 4,
    type: 'update',
    title: 'Lead status changed',
    message: 'Lead "ABC Inc" moved from Qualified to Proposal - contract ready for review',
    time: '2 hours ago',
    date: '2025-10-20',
    read: true,
    link: '/leads/125',
    leadName: 'ABC Inc'
  },
  {
    id: 5,
    type: 'meeting',
    title: 'Upcoming meeting',
    message: 'Meeting with "Global Tech" starts in 30 minutes - Conference Room A',
    time: '3 hours ago',
    date: '2025-10-20',
    read: false,
    link: '/calendar',
    leadName: 'Global Tech'
  },
  {
    id: 6,
    type: 'sms',
    title: 'SMS received',
    message: 'Lisa Chen: "Thanks for the follow-up call today! Looking forward to our demo next week."',
    time: '4 hours ago',
    date: '2025-10-20',
    read: true,
    link: '/communication'
  },
  {
    id: 7,
    type: 'call',
    title: 'Missed call',
    message: 'Missed call from David Williams at Startup Inc - left voicemail',
    time: '5 hours ago',
    date: '2025-10-20',
    read: true,
    link: '/communication'
  },
  {
    id: 8,
    type: 'assignment',
    title: 'Task reminder',
    message: 'You have 3 overdue follow-ups that need attention',
    time: 'Yesterday',
    date: '2025-10-19',
    read: true,
    link: '/leads/followups'
  },
  {
    id: 9,
    type: 'system',
    title: 'New AI features available',
    message: 'AI-powered email composer and SMS templates are now available in the platform',
    time: '2 days ago',
    date: '2025-10-18',
    read: true,
    link: '/ai'
  },
  {
    id: 10,
    type: 'update',
    title: 'Deal won!',
    message: 'Congratulations! Lead "Fortune 500 Co" closed successfully - $500k ARR',
    time: '2 days ago',
    date: '2025-10-18',
    read: true,
    link: '/leads/126',
    leadName: 'Fortune 500 Co'
  }
]

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'mention' | 'assignment' | 'update' | 'system'>('all')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { toast } = useToast()
  const navigate = useNavigate()

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'mention':
        return <AtSign className="h-5 w-5 text-blue-500" />
      case 'assignment':
        return <UserPlus className="h-5 w-5 text-green-500" />
      case 'update':
        return <TrendingUp className="h-5 w-5 text-purple-500" />
      case 'system':
        return <Settings className="h-5 w-5 text-gray-500" />
      case 'email':
        return <Mail className="h-5 w-5 text-cyan-500" />
      case 'sms':
        return <MessageSquare className="h-5 w-5 text-orange-500" />
      case 'call':
        return <Phone className="h-5 w-5 text-pink-500" />
      case 'meeting':
        return <Calendar className="h-5 w-5 text-yellow-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const filteredNotifications = notifications.filter((n: Notification) => {
    // Filter by active filter
    if (activeFilter === 'unread' && n.read) return false
    if (activeFilter !== 'all' && activeFilter !== 'unread' && n.type !== activeFilter) return false

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.leadName?.toLowerCase().includes(query)
      )
    }

    return true
  })

  const unreadCount = notifications.filter((n: Notification) => !n.read).length

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredNotifications.map((n: Notification) => n.id))
    }
  }

  const handleMarkAsRead = (id: number) => {
    setNotifications(notifications.map((n: Notification) =>
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const handleMarkSelectedAsRead = () => {
    setNotifications(notifications.map((n: Notification) =>
      selectedIds.includes(n.id) ? { ...n, read: true } : n
    ))
    setSelectedIds([])
    toast.success(`Marked ${selectedIds.length} notifications as read`)
  }

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n: Notification) => ({ ...n, read: true })))
    toast.success('All notifications marked as read')
  }

  const handleDeleteSelected = () => {
    setNotifications(notifications.filter((n: Notification) => !selectedIds.includes(n.id)))
    toast.success(`Deleted ${selectedIds.length} notifications`)
    setSelectedIds([])
  }

  const handleClearAll = () => {
    setNotifications([])
    toast.success('All notifications cleared')
  }

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id)
    if (notification.link) {
      navigate(notification.link)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="mt-2 text-muted-foreground">
            Stay updated with all your activities and updates
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <>
              <Button variant="outline" onClick={handleMarkSelectedAsRead}>
                <Check className="mr-2 h-4 w-4" />
                Mark as Read ({selectedIds.length})
              </Button>
              <Button variant="outline" onClick={handleDeleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedIds.length})
              </Button>
            </>
          )}
          {unreadCount > 0 && selectedIds.length === 0 && (
            <Button onClick={handleMarkAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
            <p className="text-xs text-muted-foreground">All notifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Badge variant="destructive">{unreadCount}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mentions</CardTitle>
            <AtSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter((n: Notification) => n.type === 'mention').length}
            </div>
            <p className="text-xs text-muted-foreground">You were tagged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter((n: Notification) => n.type === 'assignment').length}
            </div>
            <p className="text-xs text-muted-foreground">Tasks assigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('all')}
              >
                All
              </Button>
              <Button
                variant={activeFilter === 'unread' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('unread')}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </Button>
              <Button
                variant={activeFilter === 'mention' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('mention')}
              >
                <AtSign className="mr-2 h-4 w-4" />
                Mentions
              </Button>
              <Button
                variant={activeFilter === 'assignment' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('assignment')}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Assigned
              </Button>
              <Button
                variant={activeFilter === 'update' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('update')}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Updates
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {filteredNotifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedIds.length === filteredNotifications.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                  <Archive className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                    !notification.read
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                      : 'hover:bg-accent/50'
                  } ${selectedIds.includes(notification.id) ? 'ring-2 ring-primary' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(notification.id)}
                    onChange={() => handleToggleSelect(notification.id)}
                    className="mt-1 rounded"
                  />
                  
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {notification.title}
                        </p>
                        {notification.leadName && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {notification.leadName}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {notification.time}
                        </p>
                        {!notification.read && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation()
                          handleMarkAsRead(notification.id)
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        setNotifications(notifications.filter((n: Notification) => n.id !== notification.id))
                        toast.success('Notification removed')
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
