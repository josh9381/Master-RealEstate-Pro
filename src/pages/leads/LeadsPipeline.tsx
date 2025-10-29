import { useState, useEffect } from 'react'
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
  Filter,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { leadsApi } from '@/lib/api'

interface Lead {
  id: number
  name: string
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
  const [pipelineStages, setPipelineStages] = useState<Stage[]>([])
  const [draggedLead, setDraggedLead] = useState<{ lead: Lead; fromStage: string } | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadPipelineData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadPipelineData = async () => {
    setIsLoading(true)
    try {
      const response = await leadsApi.getLeads({ limit: 100 })
      const leads = response.data || []
      
      // Organize leads by status
      const statusMap: { [key: string]: Lead[] } = {
        new: [],
        contacted: [],
        qualified: [],
        proposal: [],
        won: [],
        lost: []
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      leads.forEach((apiLead: any) => {
        const lead: Lead = {
          id: apiLead.id,
          name: `${apiLead.firstName} ${apiLead.lastName}`,
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

      // Build pipeline stages
      const stages: Stage[] = [
        { 
          id: 'new', 
          name: 'New', 
          count: statusMap.new.length, 
          color: 'bg-slate-500',
          conversionRate: 45,
          avgDays: 2,
          totalValue: calculateTotalValue(statusMap.new),
          leads: statusMap.new
        },
        { 
          id: 'contacted', 
          name: 'Contacted', 
          count: statusMap.contacted.length,
          color: 'bg-blue-500',
          conversionRate: 62,
          avgDays: 5,
          totalValue: calculateTotalValue(statusMap.contacted),
          leads: statusMap.contacted
        },
        { 
          id: 'qualified', 
          name: 'Qualified', 
          count: statusMap.qualified.length,
          color: 'bg-purple-500',
          conversionRate: 78,
          avgDays: 7,
          totalValue: calculateTotalValue(statusMap.qualified),
          leads: statusMap.qualified
        },
        { 
          id: 'proposal', 
          name: 'Proposal', 
          count: statusMap.proposal.length,
          color: 'bg-orange-500',
          conversionRate: 85,
          avgDays: 12,
          totalValue: calculateTotalValue(statusMap.proposal),
          leads: statusMap.proposal
        },
        { 
          id: 'won', 
          name: 'Won', 
          count: statusMap.won.length,
          color: 'bg-green-500',
          conversionRate: 100,
          avgDays: 0,
          totalValue: calculateTotalValue(statusMap.won),
          leads: statusMap.won
        },
      ]

      setPipelineStages(stages)
    } catch (error) {
      console.error('Error loading pipeline data:', error)
      toast.error('Failed to load pipeline data')
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleDrop = (e: React.DragEvent, toStageId: string) => {
    e.preventDefault()
    
    if (!draggedLead) return

    const { lead, fromStage } = draggedLead

    if (fromStage === toStageId) {
      setDraggedLead(null)
      return
    }

    // Update stages
    setPipelineStages((prev: Stage[]) => {
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

    toast.success(`${lead.name} moved to ${pipelineStages.find((s: Stage) => s.id === toStageId)?.name}`)
    setDraggedLead(null)
  }

  const handleQuickAction = (action: string, leadName: string) => {
    toast.success(`${action} sent to ${leadName}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline View</h1>
          <p className="mt-2 text-muted-foreground">
            Drag and drop leads between stages to update their status
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadPipelineData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button asChild>
            <Link to="/leads/create">
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Link>
          </Button>
        </div>
      </div>

      {/* Pipeline Stages */}
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
                      className="group cursor-move rounded-lg border bg-card p-3 hover:shadow-lg hover:border-primary/50 transition-all duration-200"
                    >
                      {/* Lead Card Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Link 
                            to={`/leads/${lead.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {lead.name}
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

                      {/* Quick Actions (Show on Hover) */}
                      <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2 text-xs"
                          onClick={() => handleQuickAction('✨ AI Email', lead.name)}
                        >
                          <Mail className="mr-1 h-3 w-3" />
                          <Sparkles className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2 text-xs"
                          onClick={() => handleQuickAction('SMS', lead.name)}
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2 text-xs"
                          onClick={() => handleQuickAction('Call', lead.name)}
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
    </div>
  )
}

export default LeadsPipeline
