import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
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
  Archive,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import { notificationsApi, type Notification } from '@/lib/api'

export function NotificationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'mention' | 'assignment' | 'update' | 'system'>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(25)
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch notifications from API with 30s polling and server-side pagination (#112)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notifications', currentPage, pageSize],
    queryFn: async () => {
      const response = await notificationsApi.getNotifications({ page: currentPage, limit: pageSize })
      return response.data as {
        notifications: Notification[]
        unreadCount: number
        pagination: { page: number; limit: number; total: number; pages: number }
      }
    },
    refetchInterval: 30000,
  })

  const notifications = data?.notifications ?? []

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    },
    onError: () => toast.error('Failed to mark all as read'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.deleteNotification(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  const getNotificationIcon = (type: string) => {
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
    if (activeFilter === 'unread' && n.read) return false
    if (activeFilter !== 'all' && activeFilter !== 'unread' && n.type !== activeFilter) return false

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      )
    }

    return true
  })

  const unreadCount = data?.unreadCount ?? notifications.filter((n: Notification) => !n.read).length

  const handleToggleSelect = (id: string) => {
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

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync(id)
    } catch {
      toast.error('Failed to mark notification as read')
    }
  }

  const handleMarkSelectedAsRead = async () => {
    try {
      const count = selectedIds.length
      await Promise.all(selectedIds.map(id => notificationsApi.markAsRead(id)))
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setSelectedIds([])
      toast.success(`Marked ${count} notifications as read`)
    } catch {
      toast.error('Failed to mark selected as read')
    }
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  const handleDeleteSelected = async () => {
    try {
      const count = selectedIds.length
      await Promise.all(selectedIds.map(id => notificationsApi.deleteNotification(id)))
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setSelectedIds([])
      toast.success(`Deleted ${count} notifications`)
    } catch {
      toast.error('Failed to delete selected notifications')
    }
  }

  const handleClearAll = async () => {
    try {
      await Promise.all(notifications.map(n => notificationsApi.deleteNotification(n.id)))
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications cleared')
    } catch {
      toast.error('Failed to clear notifications')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Notification removed')
    } catch {
      toast.error('Failed to delete notification')
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id)
    }
    if (notification.link) {
      navigate(notification.link)
    }
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="mt-2 text-muted-foreground">Stay updated with all your activities and updates</p>
        </div>
        <ErrorBanner
          message={error instanceof Error ? error.message : 'Failed to load notifications'}
          retry={() => refetch()}
        />
      </div>
    )
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
                onClick={() => { setActiveFilter('all'); setCurrentPage(1) }}
              >
                All
              </Button>
              <Button
                variant={activeFilter === 'unread' ? 'default' : 'outline'}
                onClick={() => { setActiveFilter('unread'); setCurrentPage(1) }}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </Button>
              <Button
                variant={activeFilter === 'mention' ? 'default' : 'outline'}
                onClick={() => { setActiveFilter('mention'); setCurrentPage(1) }}
              >
                <AtSign className="mr-2 h-4 w-4" />
                Mentions
              </Button>
              <Button
                variant={activeFilter === 'assignment' ? 'default' : 'outline'}
                onClick={() => { setActiveFilter('assignment'); setCurrentPage(1) }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Assigned
              </Button>
              <Button
                variant={activeFilter === 'update' ? 'default' : 'outline'}
                onClick={() => { setActiveFilter('update'); setCurrentPage(1) }}
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
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
              <p className="text-lg font-medium">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
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
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
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
                        handleDelete(notification.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {data?.pagination && data.pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                {Math.min(currentPage * pageSize, data.pagination.total)} of{' '}
                {data.pagination.total} notifications
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                {Array.from({ length: data.pagination.pages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === data.pagination.pages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, idx) =>
                    typeof p === 'string' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">...</span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === currentPage ? 'default' : 'outline'}
                        size="sm"
                        className="min-w-[2rem]"
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </Button>
                    )
                  )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= data.pagination.pages}
                  onClick={() => setCurrentPage(p => Math.min(data.pagination.pages, p + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
