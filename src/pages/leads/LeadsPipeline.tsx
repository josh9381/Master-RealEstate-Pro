import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  TrendingUp, 
  TrendingDown,
  Clock,
  DollarSign,
  Sparkles,
  Eye,
  Plus,

  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { leadsApi, analyticsApi } from '@/lib/api'
import { LeadsSubNav } from '@/components/leads/LeadsSubNav'

interface Lead {
  id: number
  firstName: string
  lastName: string
  company: string
  score: number
  value?: string
  lastContact?: string
  email?: string
  phone?: string
}

interface Stage {
  id: string
  name: string
  count: number
  leads: Lead[]
  color: string
  conversionRate?: number
  avgDays?: number
  totalValue?: string
}

function LeadsPipeline() {
  const [draggedLead, setDraggedLead] = useState<{ lead: Lead; fromStage: string } | null>(null)
  const [keyboardMoveLead, setKeyboardMoveLead] = useState<{ lead: Lead; fromStage: string } | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: pipelineStages = [], isLoading, refetch: loadPipelineData } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const response = await leadsApi.getLeads({ limit: 100 })
      const leads = response.data?.leads || []
      
      // Organize leads by status
      const statusMap: { [key: string]: Lead[] } = {
        new: [],
        contacted: [],
        qualified: [],
        proposal: [],
        negotiation: [],
        won: [],
        lost: []
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      leads.forEach((apiLead: any) => {
        const lead: Lead = {
          id: apiLead.id,
          firstName: apiLead.firstName,
          lastName: apiLead.lastName,
          company: apiLead.company || 'No Company',
          score: apiLead.score || 0,
          value: apiLead.estimatedValue ? `$${apiLead.estimatedValue}` : undefined,
          lastContact: apiLead.lastContactedAt ? new Date(apiLead.lastContactedAt).toLocaleDateString() : 'Never',
          email: apiLead.email,
          phone: apiLead.phone || undefined
        }
        
        const status = apiLead.status?.toLowerCase() || 'new'
        if (statusMap[status]) {
          statusMap[status].push(lead)
        } else {
          statusMap.new.push(lead)
        }
      })

      // Fetch real time-in-stage metrics from backend
      let stageMetrics: Record<string, number> = {}
      try {
        const metricsResponse = await analyticsApi.getPipelineMetrics()
        if (metricsResponse?.data?.metrics) {
          for (const m of metricsResponse.data.metrics) {
            stageMetrics[m.stage.toLowerCase()] = m.avgDays
          }
        }
      } catch (err) {
        console.warn('Pipeline metrics unavailable:', err)
        // Pipeline metrics are optional — continue with zeros
      }

      // Build pipeline stages
      const stages: Stage[] = [
        { 
          id: 'new', 
          name: 'New', 
          count: statusMap.new.length, 
          color: 'bg-slate-500',
          conversionRate: statusMap.new.length > 0 ? Math.round((statusMap.contacted.length / statusMap.new.length) * 100) : 0,
          avgDays: stageMetrics['new'] || 0,
          totalValue: calculateTotalValue(statusMap.new),
          leads: statusMap.new
        },
        { 
          id: 'contacted', 
          name: 'Contacted', 
          count: statusMap.contacted.length,
          color: 'bg-blue-500',
          conversionRate: statusMap.contacted.length > 0 ? Math.round((statusMap.qualified.length / statusMap.contacted.length) * 100) : 0,
          avgDays: stageMetrics['contacted'] || 0,
          totalValue: calculateTotalValue(statusMap.contacted),
          leads: statusMap.contacted
        },
        { 
          id: 'qualified', 
          name: 'Qualified', 
          count: statusMap.qualified.length,
          color: 'bg-purple-500',
          conversionRate: statusMap.qualified.length > 0 ? Math.round((statusMap.proposal.length / statusMap.qualified.length) * 100) : 0,
          avgDays: stageMetrics['qualified'] || 0,
          totalValue: calculateTotalValue(statusMap.qualified),
          leads: statusMap.qualified
        },
        { 
          id: 'proposal', 
          name: 'Proposal', 
          count: statusMap.proposal.length,
          color: 'bg-orange-500',
          conversionRate: statusMap.proposal.length > 0 ? Math.round((statusMap.negotiation.length / statusMap.proposal.length) * 100) : 0,
          avgDays: stageMetrics['proposal'] || 0,
          totalValue: calculateTotalValue(statusMap.proposal),
          leads: statusMap.proposal
        },
        { 
          id: 'negotiation', 
          name: 'Negotiation', 
          count: statusMap.negotiation.length,
          color: 'bg-yellow-500',
          conversionRate: statusMap.negotiation.length > 0 ? Math.round((statusMap.won.length / statusMap.negotiation.length) * 100) : 0,
          avgDays: stageMetrics['negotiation'] || 0,
          totalValue: calculateTotalValue(statusMap.negotiation),
          leads: statusMap.negotiation
        },
        { 
          id: 'won', 
          name: 'Won', 
          count: statusMap.won.length,
          color: 'bg-green-500',
          conversionRate: 100,
          avgDays: stageMetrics['won'] || 0,
          totalValue: calculateTotalValue(statusMap.won),
          leads: statusMap.won
        },
        { 
          id: 'lost', 
          name: 'Lost', 
          count: statusMap.lost.length,
          color: 'bg-gray-400',
          conversionRate: 0,
          avgDays: stageMetrics['lost'] || 0,
          totalValue: calculateTotalValue(statusMap.lost),
          leads: statusMap.lost
        },
      ]

      return stages
    }
  })

  const calculateTotalValue = (leads: Lead[]): string => {
    const total = leads.reduce((sum, lead) => {
      const value = lead.value ? parseInt(lead.value.replace(/[^0-9]/g, '')) : 0
      return sum + value
    }, 0)
    
    if (total >= 1000000) {
      return `$${(total / 1000000).toFixed(1)}M`
    } else if (total >= 1000) {
      return `$${(total / 1000).toFixed(0)}k`
    }
    return `$${total}`
  }

  const handleDragStart = (lead: Lead, stageId: string) => {
    setDraggedLead({ lead, fromStage: stageId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, toStageId: string) => {
    e.preventDefault()
    
    if (!draggedLead) return

    const { lead, fromStage } = draggedLead

    if (fromStage === toStageId) {
      setDraggedLead(null)
      return
    }

    // Save previous state for rollback
    const previousStages = pipelineStages

    // Optimistic local state update
    queryClient.setQueryData(['pipeline-stages'], (prev: Stage[] | undefined) => {
      if (!prev) return prev
      return prev.map((stage: Stage) => {
        if (stage.id === fromStage) {
          // Remove from old stage
          return {
            ...stage,
            leads: stage.leads.filter((l: Lead) => l.id !== lead.id),
            count: stage.count - 1
          }
        }
        if (stage.id === toStageId) {
          // Add to new stage
          return {
            ...stage,
            leads: [...stage.leads, lead],
            count: stage.count + 1
          }
        }
        return stage
      })
    })

    toast.success(`${lead.firstName} ${lead.lastName} moved to ${pipelineStages.find((s: Stage) => s.id === toStageId)?.name}`)
    setDraggedLead(null)

    // Persist to backend
    try {
      await leadsApi.updateLead(String(lead.id), { status: toStageId.toUpperCase() })
    } catch (error) {
      // Revert optimistic update on failure
      console.error('Failed to update lead status:', error)
      queryClient.setQueryData(['pipeline-stages'], previousStages)
      toast.error('Failed to save status change. Reverted.')
    }
  }

  // Keyboard-accessible stage move
  const handleKeyboardMove = async (lead: Lead, fromStageId: string, toStageId: string) => {
    if (fromStageId === toStageId) return

    const previousStages = pipelineStages

    queryClient.setQueryData(['pipeline-stages'], (prev: Stage[] | undefined) => {
      if (!prev) return prev
      return prev.map((stage: Stage) => {
        if (stage.id === fromStageId) {
          return { ...stage, leads: stage.leads.filter((l: Lead) => l.id !== lead.id), count: stage.count - 1 }
        }
        if (stage.id === toStageId) {
          return { ...stage, leads: [...stage.leads, lead], count: stage.count + 1 }
        }
        return stage
      })
    })

    const targetName = pipelineStages.find((s: Stage) => s.id === toStageId)?.name
    toast.success(`${lead.firstName} ${lead.lastName} moved to ${targetName}`)
    setKeyboardMoveLead(null)

    try {
      await leadsApi.updateLead(String(lead.id), { status: toStageId.toUpperCase() })
    } catch (error) {
      console.error('Failed to update lead status:', error)
      queryClient.setQueryData(['pipeline-stages'], previousStages)
      toast.error('Failed to save status change. Reverted.')
    }
  }

  const handleQuickAction = (action: string, lead: Lead) => {
    if (action === 'Call' && lead.phone) {
      window.location.href = `tel:${lead.phone}`
    } else if (action === 'Call') {
      toast.error('No phone number available')
    } else if (action === 'Email' && lead.email) {
      window.location.href = `mailto:${lead.email}`
    } else {
      toast.info(`Navigate to lead details to send ${action}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <LeadsSubNav />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline View</h1>
          <p className="mt-2 text-muted-foreground">
            Drag and drop leads between stages to update their status
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadPipelineData(); }} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading && pipelineStages.length === 0 ? (
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-96 bg-muted rounded" />)}
          </div>
        </div>
      ) : (

      <div className="flex space-x-4 overflow-x-auto pb-4">
        {pipelineStages.map((stage) => (
          <div 
            key={stage.id} 
            className="w-80 shrink-0"
            onDragOver={handleDragOver}
            onDrop={(e: React.DragEvent) => handleDrop(e, stage.id)}
          >
            <Card className="h-full">
              {/* Stage Header with Metrics */}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                    <CardTitle className="text-base">{stage.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">{stage.count}</Badge>
                </div>
                
                {/* Stage Metrics */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Conv. Rate</span>
                    <div className="flex items-center gap-1 font-medium">
                      {stage.conversionRate && stage.conversionRate > 50 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-orange-500" />
                      )}
                      <span>{stage.conversionRate}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Avg. Days</span>
                    <div className="flex items-center gap-1 font-medium">
                      <Clock className="h-3 w-3 text-blue-500" />
                      <span>{stage.avgDays}d</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Value</span>
                    <div className="flex items-center gap-1 font-medium">
                      <DollarSign className="h-3 w-3 text-green-500" />
                      <span>{stage.totalValue}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2 min-h-[400px]">
                  {stage.leads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead, stage.id)}
                      tabIndex={0}
                      role="button"
                      aria-roledescription="draggable lead card"
                      aria-label={`${lead.firstName} ${lead.lastName} in ${stage.name} stage. Press Enter to move to another stage.`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setKeyboardMoveLead({ lead, fromStage: stage.id })
                        } else if (e.key === 'Escape') {
                          setKeyboardMoveLead(null)
                        }
                      }}
                      className={`group cursor-move rounded-lg border bg-card p-3 hover:shadow-lg hover:border-primary/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${keyboardMoveLead?.lead.id === lead.id ? 'ring-2 ring-primary' : ''}`}
                    >
                      {/* Keyboard move stage selector */}
                      {keyboardMoveLead?.lead.id === lead.id && (
                        <div className="mb-2 p-2 bg-primary/5 rounded border border-primary/20">
                          <p className="text-xs font-medium mb-1">Move to stage:</p>
                          <div className="flex flex-wrap gap-1">
                            {pipelineStages.filter(s => s.id !== stage.id).map(s => (
                              <button
                                key={s.id}
                                className="px-2 py-1 text-xs rounded border hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                                onClick={() => handleKeyboardMove(lead, stage.id, s.id)}
                                onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setKeyboardMoveLead(null); } }}
                              >
                                {s.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Lead Card Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Link 
                            to={`/leads/${lead.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {lead.firstName} {lead.lastName}
                          </Link>
                          <p className="text-sm text-muted-foreground">{lead.company}</p>
                        </div>
                        <Badge 
                          variant={lead.score >= 80 ? 'default' : lead.score >= 60 ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {lead.score}
                        </Badge>
                      </div>

                      {/* Lead Metadata */}
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{lead.value}</span>
                        <span>{lead.lastContact}</span>
                      </div>

                      {/* Keyboard-accessible move dropdown */}
                      <select
                        className="mt-2 w-full text-xs border rounded px-2 py-1 bg-background cursor-pointer"
                        value=""
                        aria-label={`Move ${lead.firstName} ${lead.lastName} to another stage`}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleKeyboardMove(lead, stage.id, e.target.value)
                          }
                        }}
                      >
                        <option value="">Move to…</option>
                        {pipelineStages.filter(s => s.id !== stage.id).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>

                      {/* Quick Actions (Show on Hover) */}
                      <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2 text-xs"
                          onClick={() => lead.email ? (window.location.href = `mailto:${lead.email}`) : toast.error('No email available')}
                        >
                          <Mail className="mr-1 h-3 w-3" />
                          <Sparkles className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2 text-xs"
                          onClick={() => handleQuickAction('SMS', lead)}
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2 text-xs"
                          onClick={() => handleQuickAction('Call', lead)}
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2 text-xs ml-auto"
                          asChild
                        >
                          <Link to={`/leads/${lead.id}`}>
                            <Eye className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Empty State */}
                  {stage.leads.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Drop leads here or click to add
                      </p>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="mt-2"
                        asChild
                      >
                        <Link to="/leads/create">
                          <Plus className="mr-1 h-3 w-3" />
                          Add Lead
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}

export default LeadsPipeline
