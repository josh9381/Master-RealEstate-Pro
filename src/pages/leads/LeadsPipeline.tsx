import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  DollarSign,
  Sparkles,
  Eye,
  Plus,
  RefreshCw,
  ChevronDown,
  Layers,
  Settings2,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { pipelinesApi, leadsApi, type PipelineData } from '@/lib/api'
import { LeadsSubNav } from '@/components/leads/LeadsSubNav'
import { PipelineManager } from '@/components/leads/PipelineManager'

interface Lead {
  id: string | number
  firstName: string
  lastName: string
  company: string
  score: number
  value?: number | string
  lastContactAt?: string
  email?: string
  phone?: string
  pipelineStageId?: string
  status?: string
  assignedTo?: { firstName: string; lastName: string }
}

interface StageWithLeads {
  id: string
  name: string
  order: number
  color?: string
  isWinStage: boolean
  isLostStage: boolean
  leads: Lead[]
}

function LeadsPipeline() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false)
  const [draggedLead, setDraggedLead] = useState<{ lead: Lead; fromStageId: string } | null>(null)
  const [keyboardMoveLead, setKeyboardMoveLead] = useState<{ lead: Lead; fromStageId: string } | null>(null)
  const [showPipelineManager, setShowPipelineManager] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch all pipelines for this org
  const { data: pipelinesResponse, isLoading: loadingPipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesApi.getPipelines(),
  })

  const pipelines: PipelineData[] = pipelinesResponse?.data || []
  const activePipeline = pipelines.find(p => p.id === selectedPipelineId) || pipelines.find(p => p.isDefault) || pipelines[0]

  // Auto-select first pipeline
  if (activePipeline && !selectedPipelineId) {
    setTimeout(() => setSelectedPipelineId(activePipeline.id), 0)
  }

  // Fetch leads for the active pipeline
  const { data: pipelineLeadsResponse, isLoading: loadingLeads, refetch: refetchLeads } = useQuery({
    queryKey: ['pipeline-leads', activePipeline?.id],
    queryFn: async () => {
      if (!activePipeline) return null

      try {
        const response = await pipelinesApi.getPipelineLeads(activePipeline.id)
        return response.data
      } catch (error) {
        console.error('Pipeline leads endpoint unavailable, using fallback:', error)
        // Fallback: fetch all leads and group by status
        const response = await leadsApi.getLeads({ limit: 200 })
        const leads = response.data?.leads || []
        return { fallback: true, leads, pipeline: activePipeline }
      }
    },
    enabled: !!activePipeline,
  })

  // Build stage data with leads
  const buildStagesWithLeads = (): StageWithLeads[] => {
    if (!activePipeline) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = pipelineLeadsResponse as any
    if (data && !data.fallback && data.stages) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.stages.map((s: any) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        color: s.color,
        isWinStage: s.isWinStage,
        isLostStage: s.isLostStage,
        leads: s.leads || [],
      }))
    }

    // Fallback: group leads by status, matching to pipeline stages
    const leads: Lead[] = data?.leads || []
    const stages = activePipeline.stages || []

    return stages.map(stage => {
      const stageName = stage.name.toLowerCase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchingLeads = leads.filter((lead: any) => {
        if (lead.pipelineStageId === stage.id) return true
        const status = (lead.status || '').toLowerCase()
        return status === stageName ||
          (stageName === 'new' && status === 'new') ||
          (stageName === 'new lead' && status === 'new') ||
          (stageName === 'won' && status === 'won') ||
          (stageName === 'closed' && status === 'won') ||
          (stageName === 'lost' && status === 'lost') ||
          (stageName === 'withdrawn' && status === 'lost') ||
          (stageName === 'declined' && status === 'lost')
      })
      return {
        id: stage.id,
        name: stage.name,
        order: stage.order,
        color: stage.color || undefined,
        isWinStage: stage.isWinStage,
        isLostStage: stage.isLostStage,
        leads: matchingLeads,
      }
    })
  }

  const stagesWithLeads = buildStagesWithLeads()

  // Move lead mutation
  const moveLeadMutation = useMutation({
    mutationFn: ({ leadId, stageId }: { leadId: string; stageId: string }) =>
      pipelinesApi.moveLeadToStage(leadId, {
        pipelineId: activePipeline?.id,
        pipelineStageId: stageId,
      }),
    onError: () => {
      toast.error('Failed to save stage change. Please try again.')
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads', activePipeline?.id] })
    },
  })

  const calculateTotalValue = (leads: Lead[]): string => {
    const total = leads.reduce((sum, lead) => {
      const val = typeof lead.value === 'number' ? lead.value :
        typeof lead.value === 'string' ? parseInt(lead.value.replace(/[^0-9]/g, '')) || 0 : 0
      return sum + val
    }, 0)
    if (total >= 1000000) return `$${(total / 1000000).toFixed(1)}M`
    if (total >= 1000) return `$${(total / 1000).toFixed(0)}k`
    return `$${total}`
  }

  const handleDragStart = (lead: Lead, stageId: string) => {
    setDraggedLead({ lead, fromStageId: stageId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, toStageId: string) => {
    e.preventDefault()
    if (!draggedLead) return
    const { lead, fromStageId } = draggedLead
    if (fromStageId === toStageId) {
      setDraggedLead(null)
      return
    }
    await moveLead(lead, fromStageId, toStageId)
    setDraggedLead(null)
  }

  const moveLead = async (lead: Lead, fromStageId: string, toStageId: string) => {
    const targetStage = stagesWithLeads.find(s => s.id === toStageId)

    // Optimistic update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryClient.setQueryData(['pipeline-leads', activePipeline?.id], (prev: any) => {
      if (!prev) return prev
      if (prev.stages) {
        return {
          ...prev,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stages: prev.stages.map((s: any) => {
            if (s.id === fromStageId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return { ...s, leads: s.leads.filter((l: any) => l.id !== lead.id) }
            }
            if (s.id === toStageId) {
              return { ...s, leads: [...(s.leads || []), { ...lead, pipelineStageId: toStageId }] }
            }
            return s
          }),
        }
      }
      return prev
    })

    toast.success(`${lead.firstName} ${lead.lastName} moved to ${targetStage?.name}`)
    moveLeadMutation.mutate({ leadId: String(lead.id), stageId: toStageId })
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

  const isLoading = loadingPipelines || loadingLeads

  return (
    <div className="space-y-6">
      <LeadsSubNav />

      {/* Header with Pipeline Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Pipeline View</h1>
            {/* Pipeline Switcher */}
            {pipelines.length > 1 && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setShowPipelineDropdown(!showPipelineDropdown)}
                >
                  <Layers className="h-4 w-4 mr-1.5" />
                  {activePipeline?.name || 'Select Pipeline'}
                  <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                </Button>
                {showPipelineDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPipelineDropdown(false)} />
                    <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-lg border bg-popover shadow-lg py-1">
                      {pipelines.map(p => (
                        <button
                          key={p.id}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between ${
                            p.id === activePipeline?.id ? 'bg-muted font-medium' : ''
                          }`}
                          onClick={() => {
                            setSelectedPipelineId(p.id)
                            setShowPipelineDropdown(false)
                          }}
                        >
                          <div>
                            <span>{p.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {p.stages.length} stages
                            </span>
                          </div>
                          {p._count && (
                            <Badge variant="secondary" className="text-xs">
                              {p._count.leads}
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <p className="mt-2 text-muted-foreground">
            Drag and drop leads between stages to update their progress
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPipelineManager(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Manage
          </Button>
          <Button variant="outline" onClick={() => refetchLeads()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Pipeline Tabs (quick switch) */}
      {pipelines.length > 1 && (
        <div className="flex gap-1 rounded-lg border p-1 bg-muted/30 w-fit">
          {pipelines.map(p => (
            <Button
              key={p.id}
              size="sm"
              variant={p.id === activePipeline?.id ? 'default' : 'ghost'}
              onClick={() => setSelectedPipelineId(p.id)}
              className="h-8 text-xs"
            >
              {p.name}
              {p._count && p._count.leads > 0 && (
                <Badge variant={p.id === activePipeline?.id ? 'secondary' : 'outline'} className="ml-1.5 text-xs h-5 px-1.5">
                  {p._count.leads}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      )}

      {isLoading && stagesWithLeads.length === 0 ? (
        <div className="animate-pulse space-y-4">
          <div className="flex space-x-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-80 shrink-0 h-96 bg-muted rounded" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {stagesWithLeads.map((stage) => (
            <div
              key={stage.id}
              className="w-80 shrink-0"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={stage.color ? { backgroundColor: stage.color } : { backgroundColor: '#6B7280' }}
                      />
                      <CardTitle className="text-base">{stage.name}</CardTitle>
                      {stage.isWinStage && <Badge variant="default" className="text-xs bg-green-600">Win</Badge>}
                      {stage.isLostStage && <Badge variant="secondary" className="text-xs">Lost</Badge>}
                    </div>
                    <Badge variant="secondary">{stage.leads.length}</Badge>
                  </div>

                  {/* Stage Metrics */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Leads</span>
                      <span className="font-medium">{stage.leads.length}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Value</span>
                      <div className="flex items-center gap-1 font-medium">
                        <DollarSign className="h-3 w-3 text-green-500" />
                        <span>{calculateTotalValue(stage.leads)}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2 min-h-[300px]">
                    {stage.leads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead, stage.id)}
                        tabIndex={0}
                        role="button"
                        aria-roledescription="draggable lead card"
                        aria-label={`${lead.firstName} ${lead.lastName} in ${stage.name} stage`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setKeyboardMoveLead({ lead, fromStageId: stage.id })
                          } else if (e.key === 'Escape') {
                            setKeyboardMoveLead(null)
                          }
                        }}
                        className={`group cursor-move rounded-lg border bg-card p-3 hover:shadow-lg hover:border-primary/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          keyboardMoveLead?.lead.id === lead.id ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        {/* Keyboard move selector */}
                        {keyboardMoveLead?.lead.id === lead.id && (
                          <div className="mb-2 p-2 bg-primary/5 rounded border border-primary/20">
                            <p className="text-xs font-medium mb-1">Move to stage:</p>
                            <div className="flex flex-wrap gap-1">
                              {stagesWithLeads
                                .filter(s => s.id !== stage.id)
                                .map(s => (
                                  <button
                                    key={s.id}
                                    className="px-2 py-1 text-xs rounded border hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                                    onClick={() => {
                                      moveLead(lead, stage.id, s.id)
                                      setKeyboardMoveLead(null)
                                    }}
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
                            <p className="text-sm text-muted-foreground">
                              {lead.company || 'No Company'}
                            </p>
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
                          <span>
                            {typeof lead.value === 'number'
                              ? `$${lead.value.toLocaleString()}`
                              : lead.value || ''}
                          </span>
                          <span>
                            {lead.lastContactAt
                              ? new Date(lead.lastContactAt).toLocaleDateString()
                              : 'Never'}
                          </span>
                        </div>

                        {/* Move-to dropdown */}
                        <select
                          className="mt-2 w-full text-xs border rounded px-2 py-1 bg-background cursor-pointer"
                          value=""
                          aria-label={`Move ${lead.firstName} ${lead.lastName} to another stage`}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            if (e.target.value) {
                              moveLead(lead, stage.id, e.target.value)
                            }
                          }}
                        >
                          <option value="">Move to…</option>
                          {stagesWithLeads.filter(s => s.id !== stage.id).map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>

                        {/* Quick Actions (on hover) */}
                        <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              lead.email
                                ? (window.location.href = `mailto:${lead.email}`)
                                : toast.error('No email available')
                            }
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
                        <Button size="sm" variant="ghost" className="mt-2" asChild>
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

      {/* Pipeline Management Modal */}
      {showPipelineManager && (
        <PipelineManager
          pipelines={pipelines}
          onClose={() => setShowPipelineManager(false)}
        />
      )}
    </div>
  )
}

export default LeadsPipeline
