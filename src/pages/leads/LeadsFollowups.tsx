import { logger } from '@/lib/logger'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useConfirm } from '@/hooks/useConfirm'
import { 
  Calendar, 
  Phone, 
  Mail, 
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  Search,
  RefreshCw,
  X
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { leadsApi, tasksApi } from '@/lib/api'
import type { Lead } from '@/types'

interface FollowUp {
  id: number
  lead: string
  company: string
  type: 'call' | 'email' | 'meeting' | 'task'
  date: string
  time: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'completed' | 'overdue'
  notes?: string
  leadId?: string
}

function LeadsFollowups() {
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'week'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newFollowup, setNewFollowup] = useState({
    leadId: '',
    type: 'call' as 'call' | 'email' | 'meeting' | 'task',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    priority: 'medium' as 'high' | 'medium' | 'low',
    notes: '',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [followupErrors, setFollowupErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const showConfirm = useConfirm()
  const queryClient = useQueryClient()

  const { data: followupsData, isLoading, refetch: loadFollowups } = useQuery({
    queryKey: ['followups'],
    queryFn: async () => {
      // Get tasks that are linked to leads (follow-ups)
      const tasksResponse = await tasksApi.getTasks({ limit: 100 })
      const tasks = tasksResponse.data?.tasks || tasksResponse.data || []
      
      // Get leads to map names
      const leadsResponse = await leadsApi.getLeads({ limit: 200 })
      const leads = leadsResponse.data?.leads || []
      
      const leadMap = new Map<string, Lead>(leads.map((l: Lead) => [String(l.id), l]))
      
      const now = new Date()
      
      // Transform tasks to follow-ups, only include tasks linked to leads
      const followupList: FollowUp[] = tasks
        .filter((task: Record<string, unknown>) => task.leadId)
        .map((task: Record<string, unknown>) => {
          const lead: Lead | undefined = leadMap.get(String(task.leadId))
          const dueDate = task.dueDate ? new Date(task.dueDate as string) : new Date(task.createdAt as string)
          const isCompleted = task.status === 'COMPLETED' || task.status === 'completed'
          const isOverdue = !isCompleted && dueDate < now
        
          return {
            id: task.id,
            lead: lead ? `${lead.firstName} ${lead.lastName}` : 'Unknown Lead',
            company: lead?.company || 'No Company',
            type: task.type === 'call' ? 'call' : task.type === 'email' ? 'email' : task.type === 'meeting' ? 'meeting' : 'task',
            date: dueDate.toISOString().split('T')[0],
            time: dueDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            priority: task.priority || 'medium',
            status: isCompleted ? 'completed' : isOverdue ? 'overdue' : 'pending',
            notes: task.description || task.title || undefined,
            leadId: String(task.leadId),
          }
        })
      
      // Build available leads for Add Follow-up dropdown
      const availableLeadsList = leads.map((l: Lead) => ({
        id: String(l.id),
        name: `${l.firstName} ${l.lastName}`,
        company: l.company || '',
      }))

      return { followups: followupList, availableLeads: availableLeadsList }
    },
  })

  const followups = followupsData?.followups ?? []
  const availableLeads = followupsData?.availableLeads ?? []

  const handleCreateFollowup = async () => {
    const newErrors: Record<string, string> = {}
    if (!newFollowup.leadId) {
      newErrors.leadId = 'Please select a lead'
    }
    const scheduledDate = new Date(`${newFollowup.date}T${newFollowup.time}:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const scheduledDay = new Date(scheduledDate)
    scheduledDay.setHours(0, 0, 0, 0)
    if (scheduledDay < today) {
      newErrors.date = 'Please select a future date and time'
    }
    setFollowupErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the validation errors')
      return
    }
    setIsCreating(true)
    try {
      await tasksApi.createTask({
        title: `${newFollowup.type.charAt(0).toUpperCase() + newFollowup.type.slice(1)} follow-up`,
        leadId: newFollowup.leadId,
        description: newFollowup.notes || `Scheduled ${newFollowup.type} follow-up`,
        dueDate: scheduledDate.toISOString(),
        priority: newFollowup.priority as 'low' | 'medium' | 'high',
        status: 'PENDING',
      })
      toast.success('Follow-up created successfully')
      setShowAddModal(false)
      setNewFollowup({ leadId: '', type: 'call', date: new Date().toISOString().split('T')[0], time: '09:00', priority: 'medium', notes: '' })
      loadFollowups()
    } catch (error) {
      logger.error('Failed to create follow-up:', error)
      toast.error('Failed to create follow-up')
    } finally {
      setIsCreating(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'warning'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'overdue':
        return { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive' }
      case 'completed':
        return { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', border: 'border-success' }
      default:
        return { icon: Clock, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary' }
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return Phone
      case 'email': return Mail
      case 'meeting': return Calendar
      default: return CheckCircle
    }
  }

  const handleComplete = async (id: number) => {
    const followup = followups.find((f: FollowUp) => f.id === id)
    
    if (!await showConfirm({ title: 'Complete Follow-up', message: `Mark follow-up with ${followup?.lead || 'this lead'} as complete?`, confirmLabel: 'Complete' })) {
      return
    }

    // Optimistic update
    const previousData = queryClient.getQueryData<{ followups: FollowUp[]; availableLeads: Array<{id: string; name: string; company: string}> }>(['followups'])
    queryClient.setQueryData<{ followups: FollowUp[]; availableLeads: Array<{id: string; name: string; company: string}> }>(['followups'], (old) => {
      if (!old) return old
      return {
        ...old,
        followups: old.followups.map((f: FollowUp) => f.id === id ? { ...f, status: 'completed' as const } : f),
      }
    })
    toast.success(`Follow-up with ${followup?.lead} marked as complete`)

    // Persist to backend
    try {
      await tasksApi.completeTask(String(id))
    } catch (error) {
      logger.error('Failed to update activity status:', error)
      // Revert on failure
      queryClient.setQueryData(['followups'], previousData)
      toast.error('Failed to mark follow-up as complete')
    }
  }

  const filteredFollowups = followups.filter((f: FollowUp) => {
    const matchesSearch = f.lead.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         f.company.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekEndStr = weekEnd.toISOString().split('T')[0]
    
    switch (filter) {
      case 'overdue':
        return f.status === 'overdue'
      case 'today':
        return f.date === todayStr
      case 'week':
        return f.date >= todayStr && f.date <= weekEndStr
      default:
        return true
    }
  })

  const overdueCount = followups.filter((f: FollowUp) => f.status === 'overdue').length
  const todayStr = new Date().toISOString().split('T')[0]
  const todayCount = followups.filter((f: FollowUp) => f.date === todayStr).length
  const weekEnd = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().split('T')[0]
  const weekCount = followups.filter((f: FollowUp) => f.date >= todayStr && f.date <= weekEndStr).length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">Follow-ups</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your scheduled follow-up tasks and never miss an opportunity
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadFollowups()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Follow-up
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All Tasks
        </Button>
        <Button
          size="sm"
          variant={filter === 'overdue' ? 'default' : 'outline'}
          onClick={() => setFilter('overdue')}
          className="gap-2"
        >
          <AlertCircle className="h-3 w-3" />
          Overdue
          {overdueCount > 0 && (
            <Badge variant="secondary" className="ml-1">{overdueCount}</Badge>
          )}
        </Button>
        <Button
          size="sm"
          variant={filter === 'today' ? 'default' : 'outline'}
          onClick={() => setFilter('today')}
          className="gap-2"
        >
          <Clock className="h-3 w-3" />
          Today
          {todayCount > 0 && (
            <Badge variant="secondary" className="ml-1">{todayCount}</Badge>
          )}
        </Button>
        <Button
          size="sm"
          variant={filter === 'week' ? 'default' : 'outline'}
          onClick={() => setFilter('week')}
          className="gap-2"
        >
          This Week
          {weekCount > 0 && (
            <Badge variant="secondary" className="ml-1">{weekCount}</Badge>
          )}
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search follow-ups..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Follow-ups List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredFollowups.map((followup) => {
          const statusConfig = getStatusConfig(followup.status)
          const StatusIcon = statusConfig.icon
          const TypeIcon = getTypeIcon(followup.type)

          return (
            <Card 
              key={followup.id}
              className={`transition-all hover:shadow-md ${
                followup.status === 'overdue' ? 'border-destructive/50' : ''
              } ${
                followup.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <CardContent className="p-4">
                {/* Header: icon + lead name + priority */}
                <div className="flex items-center gap-3 mb-2">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${statusConfig.bg}`}>
                    <TypeIcon className={`h-4 w-4 ${statusConfig.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{followup.lead}</p>
                    <p className="text-xs text-muted-foreground truncate">{followup.company}</p>
                  </div>
                  <Badge variant={getPriorityColor(followup.priority)} className="text-xs shrink-0">
                    {followup.priority}
                  </Badge>
                </div>

                {followup.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{followup.notes}</p>
                )}

                {/* Date, time, status row */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(followup.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{followup.time}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <StatusIcon className={`h-3 w-3 ${statusConfig.color}`} />
                    <span className={statusConfig.color}>{followup.status}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {followup.status !== 'completed' && (
                    <Button 
                      size="sm"
                      className="flex-1"
                      onClick={() => handleComplete(followup.id)}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Complete
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className={followup.status === 'completed' ? 'flex-1' : ''} asChild>
                    <Link to={followup.leadId ? `/leads/${followup.leadId}` : '/leads'}>
                      View Lead
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      )}

      {/* Empty State */}
      {filteredFollowups.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No follow-ups found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {filter !== 'all' 
                ? `No ${filter} follow-ups at the moment` 
                : 'Get started by scheduling your first follow-up'
              }
            </p>
            <Button className="mt-4" onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Follow-up
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Follow-up Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Add Follow-up" onKeyDown={(e) => { if (e.key === 'Escape') setShowAddModal(false) }}>
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold leading-tight">Add Follow-up</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Lead *</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={newFollowup.leadId}
                  onChange={(e) => { setNewFollowup(prev => ({ ...prev, leadId: e.target.value })); if (followupErrors.leadId) setFollowupErrors(prev => { const next = {...prev}; delete next.leadId; return next }) }}
                >
                  <option value="">Select a lead...</option>
                  {availableLeads.map((lead: {id: string; name: string; company: string}) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} {lead.company ? `(${lead.company})` : ''}
                    </option>
                  ))}
                </select>
                {followupErrors.leadId && <p className="text-sm text-destructive mt-1">{followupErrors.leadId}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={newFollowup.type}
                  onChange={(e) => setNewFollowup(prev => ({ ...prev, type: e.target.value as FollowUp['type'] }))}
                >
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="task">Task</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-md"
                    min={new Date().toISOString().split('T')[0]}
                    value={newFollowup.date}
                    onChange={(e) => { setNewFollowup(prev => ({ ...prev, date: e.target.value })); if (followupErrors.date) setFollowupErrors(prev => { const next = {...prev}; delete next.date; return next }) }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Time</label>
                  <input
                    type="time"
                    className="w-full p-2 border rounded-md"
                    value={newFollowup.time}
                    onChange={(e) => { setNewFollowup(prev => ({ ...prev, time: e.target.value })); if (followupErrors.date) setFollowupErrors(prev => { const next = {...prev}; delete next.date; return next }) }}
                  />
                </div>
              </div>
              {followupErrors.date && <p className="text-sm text-destructive mt-1">{followupErrors.date}</p>}
              <div>
                <label className="text-sm font-medium mb-1 block">Priority</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={newFollowup.priority}
                  onChange={(e) => setNewFollowup(prev => ({ ...prev, priority: e.target.value as FollowUp['priority'] }))}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <textarea
                  className="w-full p-2 border rounded-md min-h-[80px]"
                  placeholder="Add notes about this follow-up..."
                  value={newFollowup.notes}
                  onChange={(e) => setNewFollowup(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button onClick={handleCreateFollowup} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Follow-up'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default LeadsFollowups
