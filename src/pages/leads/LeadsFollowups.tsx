import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
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
import { leadsApi, activitiesApi } from '@/lib/api'
import { LeadsSubNav } from '@/components/leads/LeadsSubNav'

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
  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [availableLeads, setAvailableLeads] = useState<Array<{id: string; name: string; company: string}>>([])
  const [newFollowup, setNewFollowup] = useState({
    leadId: '',
    type: 'call' as 'call' | 'email' | 'meeting' | 'task',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    priority: 'medium' as 'high' | 'medium' | 'low',
    notes: '',
  })
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadFollowups()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadFollowups = async () => {
    setIsLoading(true)
    try {
      // Get recent activities that are pending
      const activitiesResponse = await activitiesApi.getActivities({ limit: 50 })
      const activities = activitiesResponse.data?.activities || []
      
      // Get leads to map names
      const leadsResponse = await leadsApi.getLeads({ limit: 100 })
      const leads = leadsResponse.data?.leads || []
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const leadMap = new Map(leads.map((l: any) => [l.id, l]))
      
      // Transform activities to follow-ups
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const followupList: FollowUp[] = activities.map((activity: any, index: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lead: any = leadMap.get(activity.leadId)
        const createdDate = activity.createdAt ? new Date(activity.createdAt) : new Date()
        const isPast = createdDate < new Date()
        
        return {
          id: activity.id || index,
          lead: lead ? `${lead.firstName} ${lead.lastName}` : 'Unknown Lead',
          company: lead?.company || 'No Company',
          type: activity.type === 'call' ? 'call' : activity.type === 'email' ? 'email' : activity.type === 'meeting' ? 'meeting' : 'task',
          date: createdDate.toISOString().split('T')[0],
          time: createdDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          priority: activity.priority || 'medium',
          status: isPast ? 'overdue' : 'pending',
          notes: activity.description || undefined,
          leadId: activity.leadId
        }
      })
      
      setFollowups(followupList)
      
      // Store leads for Add Follow-up dropdown
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAvailableLeads(leads.map((l: any) => ({
        id: String(l.id),
        name: `${l.firstName} ${l.lastName}`,
        company: l.company || '',
      })))
    } catch (error) {
      console.error('Error loading follow-ups:', error)
      toast.error('Failed to load follow-ups')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateFollowup = async () => {
    if (!newFollowup.leadId) {
      toast.error('Please select a lead')
      return
    }
    const scheduledDate = new Date(`${newFollowup.date}T${newFollowup.time}:00`)
    if (scheduledDate <= new Date()) {
      toast.error('Please select a future date and time')
      return
    }
    setIsCreating(true)
    try {
      await activitiesApi.createActivity({
        leadId: newFollowup.leadId,
        type: newFollowup.type,
        description: newFollowup.notes || `Scheduled ${newFollowup.type} follow-up`,
        scheduledAt: scheduledDate.toISOString(),
      })
      toast.success('Follow-up created successfully')
      setShowAddModal(false)
      setNewFollowup({ leadId: '', type: 'call', date: new Date().toISOString().split('T')[0], time: '09:00', priority: 'medium', notes: '' })
      loadFollowups()
    } catch (error) {
      console.error('Failed to create follow-up:', error)
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
        return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500' }
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500' }
      default:
        return { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500' }
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
    
    // Optimistic update
    setFollowups((prev: FollowUp[]) => 
      prev.map((f: FollowUp) => f.id === id ? { ...f, status: 'completed' } : f)
    )
    toast.success(`Follow-up with ${followup?.lead} marked as complete`)

    // Persist to backend
    try {
      await activitiesApi.updateActivity(String(id), { description: `Completed follow-up`, status: 'completed' })
    } catch (error) {
      console.error('Failed to update activity status:', error)
      // Revert on failure
      setFollowups((prev: FollowUp[]) =>
        prev.map((f: FollowUp) => f.id === id ? { ...f, status: followup?.status || 'pending' } : f)
      )
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

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <LeadsSubNav />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Follow-ups</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your scheduled follow-up tasks and never miss an opportunity
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadFollowups} disabled={isLoading}>
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
        >
          This Week
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
      <div className="grid gap-4">
        {filteredFollowups.map((followup) => {
          const statusConfig = getStatusConfig(followup.status)
          const StatusIcon = statusConfig.icon
          const TypeIcon = getTypeIcon(followup.type)

          return (
            <Card 
              key={followup.id}
              className={`transition-all hover:shadow-md ${
                followup.status === 'overdue' ? 'border-red-500/50' : ''
              } ${
                followup.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Left Section */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Type Icon */}
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${statusConfig.bg}`}>
                      <TypeIcon className={`h-6 w-6 ${statusConfig.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{followup.lead}</p>
                        <span className="text-sm text-muted-foreground">•</span>
                        <p className="text-sm text-muted-foreground">{followup.company}</p>
                        <Badge variant={getPriorityColor(followup.priority)} className="text-xs">
                          {followup.priority}
                        </Badge>
                      </div>

                      {followup.notes && (
                        <p className="text-sm text-muted-foreground">{followup.notes}</p>
                      )}

                      {/* Date & Time */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(followup.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{followup.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                          <span className={statusConfig.color}>{followup.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {followup.status !== 'completed' && (
                      <Button 
                        size="sm"
                        onClick={() => handleComplete(followup.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Complete
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link to={followup.leadId ? `/leads/${followup.leadId}` : '/leads'}>
                        View Lead
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Add Follow-up</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Lead *</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={newFollowup.leadId}
                  onChange={(e) => setNewFollowup(prev => ({ ...prev, leadId: e.target.value }))}
                >
                  <option value="">Select a lead...</option>
                  {availableLeads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} {lead.company ? `(${lead.company})` : ''}
                    </option>
                  ))}
                </select>
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
                    onChange={(e) => setNewFollowup(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Time</label>
                  <input
                    type="time"
                    className="w-full p-2 border rounded-md"
                    value={newFollowup.time}
                    onChange={(e) => setNewFollowup(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>
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
