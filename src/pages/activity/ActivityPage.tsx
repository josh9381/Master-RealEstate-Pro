import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Filter, Download, Mail, Phone, MessageSquare, Calendar, FileText, UserPlus, Activity, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { activitiesApi, leadsApi } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import type { ActivityRecord } from '@/types'

const PAGE_SIZE = 20

export default function ActivityPage() {
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState(searchParams.get('leadId') || '')

  // Fetch leads for the lead selector
  const { data: leadsResponse } = useQuery({
    queryKey: ['leads-selector'],
    queryFn: () => leadsApi.getLeads({ limit: 200 }),
    staleTime: 60_000,
  })

  const leads = useMemo(() => {
    const raw = leadsResponse?.data?.leads || leadsResponse?.leads || leadsResponse || []
    if (!Array.isArray(raw)) return []
    return raw.map((l: { id: string; firstName?: string; lastName?: string; email?: string }) => ({
      id: l.id,
      name: `${l.firstName || ''} ${l.lastName || ''}`.trim() || l.email || 'Unknown',
    }))
  }, [leadsResponse])

  // Build API query params
  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page,
      limit: PAGE_SIZE,
    }
    if (filter !== 'all') params.type = filter
    if (selectedLeadId) params.leadId = selectedLeadId
    if (dateFrom) params.startDate = dateFrom
    if (dateTo) params.endDate = dateTo
    return params
  }, [page, filter, selectedLeadId, dateFrom, dateTo])

  // Fetch activities from API with pagination and filters
  const { data: activitiesResponse, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['activities', queryParams],
    queryFn: () => activitiesApi.getActivities(queryParams),
  })

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    email: Mail,
    call: Phone,
    meeting: Calendar,
    note: FileText,
    sms: MessageSquare,
    lead: UserPlus,
    status_change: Activity,
  }

  const colorMap: Record<string, string> = {
    email: 'text-blue-500',
    call: 'text-green-500',
    meeting: 'text-purple-500',
    note: 'text-yellow-500',
    sms: 'text-orange-500',
    lead: 'text-indigo-500',
    status_change: 'text-gray-500',
  }

  function getRelativeTime(dateStr: string): string {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    const diffMonths = Math.floor(diffDays / 30)
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`
  }

  // Map API response to component format
  const rawActivities = useMemo(() => {
    const raw = activitiesResponse?.data?.activities || activitiesResponse?.activities || activitiesResponse || []
    if (!Array.isArray(raw)) return []
    return raw
  }, [activitiesResponse])

  const activities = useMemo(() => {
    return rawActivities.map((a: ActivityRecord) => ({
      id: a.id || a._id,
      type: (a.type || 'note').toLowerCase(),
      title: a.title || a.description || 'Activity',
      description: a.description || '',
      user: (typeof a.user === 'object' ? a.user?.name : a.user) || a.userName || 'System',
      timestamp: a.createdAt ? getRelativeTime(a.createdAt) : 'Unknown',
      rawDate: a.createdAt || '',
      icon: iconMap[(a.type || 'note').toLowerCase()] || Activity,
      color: colorMap[(a.type || 'note').toLowerCase()] || 'text-gray-500',
      leadName: a.lead ? `${a.lead.firstName || ''} ${a.lead.lastName || ''}`.trim() : undefined,
    }))
  }, [rawActivities])

  const totalCount = activitiesResponse?.data?.total || activitiesResponse?.total || activities.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Client-side search filter (search is on top of server-side filters)
  const filteredActivities = activities.filter((activity: typeof activities[number]) => {
    if (searchTerm && !activity.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !activity.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  // Export to CSV
  const handleExport = useCallback(() => {
    if (activities.length === 0) {
      toast.info('No activities to export')
      return
    }
    const headers = ['Type', 'Title', 'Description', 'User', 'Date']
    const rows = activities.map((a: typeof activities[number]) => [
      a.type,
      `"${(a.title || '').replace(/"/g, '""')}"`,
      `"${(a.description || '').replace(/"/g, '""')}"`,
      a.user,
      a.rawDate,
    ])
    const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activities-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${activities.length} activities`)
  }, [activities, toast])

  // Reset filters when changing type filter
  const handleTypeFilter = (type: string) => {
    setFilter(type)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Feed</h1>
          <p className="text-muted-foreground">Track all activities across your CRM</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {isError && (
        <ErrorBanner message={`Failed to load activities: ${error instanceof Error ? error.message : 'Unknown error'}`} retry={refetch} />
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{totalCount}</div>
          <div className="text-sm text-muted-foreground">Total Activities</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{activities.filter((a: typeof activities[number]) => a.type === 'email').length}</div>
          <div className="text-sm text-muted-foreground">Emails Sent</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{activities.filter((a: typeof activities[number]) => a.type === 'call').length}</div>
          <div className="text-sm text-muted-foreground">Calls Made</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{activities.filter((a: typeof activities[number]) => a.type === 'meeting').length}</div>
          <div className="text-sm text-muted-foreground">Meetings</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTypeFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'email' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTypeFilter('email')}
            >
              <Mail className="h-4 w-4 mr-2" />
              Emails
            </Button>
            <Button
              variant={filter === 'call' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTypeFilter('call')}
            >
              <Phone className="h-4 w-4 mr-2" />
              Calls
            </Button>
            <Button
              variant={filter === 'meeting' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTypeFilter('meeting')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Meetings
            </Button>
            <Button
              variant={showMoreFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMoreFilters(!showMoreFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>

        {/* More Filters Panel */}
        {showMoreFilters && (
          <div className="flex items-end gap-4 pt-2 border-t">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Lead</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedLeadId}
                onChange={(e) => { setSelectedLeadId(e.target.value); setPage(1) }}
              >
                <option value="">All Leads</option>
                {leads.map((l: { id: string; name: string }) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedLeadId('')
                setDateFrom('')
                setDateTo('')
                setPage(1)
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </Card>

      {/* Activity Timeline */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        
        <div className="space-y-6">
          {filteredActivities.map((activity: typeof activities[number], index: number) => {
            const Icon = activity.icon
            
            return (
              <div key={activity.id} className="flex gap-4">
                {/* Timeline Line */}
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-lg bg-accent ${activity.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {index < filteredActivities.length - 1 && (
                    <div className="w-px h-full bg-border mt-2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="font-semibold">{activity.title}</h3>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    </div>
                    <Badge variant="outline">{activity.type}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <span>{activity.user}</span>
                    {activity.leadName && (
                      <>
                        <span>•</span>
                        <span>{activity.leadName}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{activity.timestamp}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredActivities.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            No activities found matching your filters
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({totalCount} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
