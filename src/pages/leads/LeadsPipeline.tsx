import { useState } from 'react'
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
  Filter
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'

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

const stages: Stage[] = [
  { 
    id: 'new', 
    name: 'New', 
    count: 12, 
    color: 'bg-slate-500',
    conversionRate: 45,
    avgDays: 2,
    totalValue: '$125k',
    leads: [
      { id: 1, name: 'John Doe', company: 'Acme Inc', score: 85, value: '$45k', lastContact: '2 hours ago', email: 'john@acme.com', phone: '555-0101' },
      { id: 2, name: 'Jane Smith', company: 'Tech Corp', score: 72, value: '$32k', lastContact: '1 day ago', email: 'jane@techcorp.com', phone: '555-0102' },
      { id: 6, name: 'Sarah Lee', company: 'Global Inc', score: 88, value: '$48k', lastContact: '3 hours ago', email: 'sarah@global.com', phone: '555-0106' },
    ]
  },
  { 
    id: 'contacted', 
    name: 'Contacted', 
    count: 8,
    color: 'bg-blue-500',
    conversionRate: 62,
    avgDays: 5,
    totalValue: '$186k',
    leads: [
      { id: 3, name: 'Bob Johnson', company: 'StartupXYZ', score: 91, value: '$67k', lastContact: '4 hours ago', email: 'bob@startupxyz.com', phone: '555-0103' },
      { id: 7, name: 'Mike Chen', company: 'Innovate Co', score: 79, value: '$55k', lastContact: '1 day ago', email: 'mike@innovate.com', phone: '555-0107' },
    ]
  },
  { 
    id: 'qualified', 
    name: 'Qualified', 
    count: 15,
    color: 'bg-purple-500',
    conversionRate: 78,
    avgDays: 7,
    totalValue: '$342k',
    leads: [
      { id: 4, name: 'Alice Brown', company: 'BigCo', score: 68, value: '$89k', lastContact: '2 days ago', email: 'alice@bigco.com', phone: '555-0104' },
      { id: 5, name: 'Charlie Wilson', company: 'Enterprise LLC', score: 79, value: '$125k', lastContact: '5 hours ago', email: 'charlie@enterprise.com', phone: '555-0105' },
    ]
  },
  { 
    id: 'proposal', 
    name: 'Proposal', 
    count: 6,
    color: 'bg-orange-500',
    conversionRate: 85,
    avgDays: 12,
    totalValue: '$458k',
    leads: []
  },
  { 
    id: 'won', 
    name: 'Won', 
    count: 24,
    color: 'bg-green-500',
    conversionRate: 100,
    avgDays: 0,
    totalValue: '$1.2M',
    leads: []
  },
]

function LeadsPipeline() {
  const [pipelineStages, setPipelineStages] = useState<Stage[]>(stages)
  const [draggedLead, setDraggedLead] = useState<{ lead: Lead; fromStage: string } | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const { toast } = useToast()

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
