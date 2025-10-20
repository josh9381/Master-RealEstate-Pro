import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Plus, Search, Filter, Download, LayoutGrid, LayoutList, MoreHorizontal } from 'lucide-react'
import { AdvancedFilters } from '@/components/filters/AdvancedFilters'
import { BulkActionsBar } from '@/components/bulk/BulkActionsBar'
import { ActiveFilterChips } from '@/components/filters/ActiveFilterChips'
import { useToast } from '@/hooks/useToast'

const mockLeads = [
  { id: 1, name: 'John Doe', email: 'john@example.com', company: 'Acme Inc', phone: '+1234567890', score: 85, status: 'qualified', source: 'Website', assignedTo: 'Sarah' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', company: 'Tech Corp', phone: '+1234567891', score: 72, status: 'contacted', source: 'Referral', assignedTo: 'Mike' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', company: 'StartupXYZ', phone: '+1234567892', score: 91, status: 'qualified', source: 'LinkedIn', assignedTo: 'Sarah' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', company: 'BigCo', phone: '+1234567893', score: 68, status: 'new', source: 'Campaign', assignedTo: null },
  { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', company: 'Enterprise LLC', phone: '+1234567894', score: 79, status: 'contacted', source: 'Cold Call', assignedTo: 'Mike' },
]

interface FilterConfig {
  status: string[]
  source: string[]
  scoreRange: [number, number]
  dateRange: { from: string; to: string }
  tags: string[]
  assignedTo: string[]
}

function LeadsList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table')
  const { toast } = useToast()

  const [filters, setFilters] = useState<FilterConfig>({
    status: [],
    source: [],
    scoreRange: [0, 100],
    dateRange: { from: '', to: '' },
    tags: [],
    assignedTo: [],
  })

  const [activeFilterChips, setActiveFilterChips] = useState<Array<{ id: string; label: string; value: string }>>([])

  const toggleLeadSelection = (id: number) => {
    setSelectedLeads((prev: number[]) =>
      prev.includes(id) ? prev.filter((leadId: number) => leadId !== id) : [...prev, id]
    )
  }

  const toggleAllSelection = () => {
    if (selectedLeads.length === mockLeads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(mockLeads.map(lead => lead.id))
    }
  }

  const handleApplyFilters = (newFilters: FilterConfig) => {
    setFilters(newFilters)
    
    // Convert filters to chips
    const chips: Array<{ id: string; label: string; value: string }> = []
    
    newFilters.status.forEach((s, i) => chips.push({ id: `status-${i}`, label: 'Status', value: s }))
    newFilters.source.forEach((s, i) => chips.push({ id: `source-${i}`, label: 'Source', value: s }))
    newFilters.tags.forEach((t, i) => chips.push({ id: `tag-${i}`, label: 'Tag', value: t }))
    newFilters.assignedTo.forEach((a, i) => chips.push({ id: `assigned-${i}`, label: 'Assigned', value: a }))
    
    if (newFilters.scoreRange[0] > 0 || newFilters.scoreRange[1] < 100) {
      chips.push({ 
        id: 'score', 
        label: 'Score', 
        value: `${newFilters.scoreRange[0]}-${newFilters.scoreRange[1]}` 
      })
    }
    
    if (newFilters.dateRange.from || newFilters.dateRange.to) {
      chips.push({ 
        id: 'date', 
        label: 'Date', 
        value: `${newFilters.dateRange.from || '...'} to ${newFilters.dateRange.to || '...'}` 
      })
    }
    
    setActiveFilterChips(chips)
    toast.success('Filters applied successfully')
  }

  const handleRemoveChip = (chipId: string) => {
    setActiveFilterChips((prev: Array<{ id: string; label: string; value: string }>) => 
      prev.filter((c: { id: string; label: string; value: string }) => c.id !== chipId)
    )
    // In a real app, update the actual filters state here
  }

  const handleClearAllFilters = () => {
    setFilters({
      status: [],
      source: [],
      scoreRange: [0, 100],
      dateRange: { from: '', to: '' },
      tags: [],
      assignedTo: [],
    })
    setActiveFilterChips([])
  }

  const handleBulkAction = (action: string) => {
    toast.success(`${action} applied to ${selectedLeads.length} leads`)
    setSelectedLeads([])
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'qualified': return 'success'
      case 'contacted': return 'warning'
      case 'new': return 'secondary'
      default: return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedLeads.length}
        onClearSelection={() => setSelectedLeads([])}
        onChangeStatus={() => handleBulkAction('Status change')}
        onAddTags={() => handleBulkAction('Tags added')}
        onAssignTo={() => handleBulkAction('Assignment')}
        onExport={() => handleBulkAction('Export')}
        onDelete={() => handleBulkAction('Delete')}
        onBulkEmail={() => handleBulkAction('Bulk email')}
      />

      {/* Advanced Filters Panel */}
      <AdvancedFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="mt-2 text-muted-foreground">
            Manage and track all your leads in one place
          </p>
        </div>
        <Button asChild>
          <Link to="/leads/create">
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Link>
        </Button>
      </div>

      {/* Actions Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFilters(true)}>
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button variant="outline" asChild>
              <Link to="/leads/import">
                <Download className="mr-2 h-4 w-4" />
                Import
              </Link>
            </Button>
            <div className="flex rounded-lg border">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'pipeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('pipeline')}
                className="rounded-l-none"
                asChild
              >
                <Link to="/leads/pipeline">
                  <LayoutGrid className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Active Filter Chips */}
      <ActiveFilterChips
        chips={activeFilterChips}
        onRemove={handleRemoveChip}
        onClearAll={handleClearAllFilters}
        resultCount={mockLeads.length}
      />

      {/* Leads Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedLeads.length === mockLeads.length}
                  onChange={toggleAllSelection}
                  className="rounded"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockLeads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedLeads.includes(lead.id)}
                    onChange={() => toggleLeadSelection(lead.id)}
                    className="rounded"
                  />
                </TableCell>
                <TableCell>
                  <Link
                    to={`/leads/${lead.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {lead.name}
                  </Link>
                </TableCell>
                <TableCell>{lead.company}</TableCell>
                <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
                <TableCell>
                  <Badge variant={lead.score >= 80 ? 'success' : 'secondary'}>
                    {lead.score}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(lead.status)}>
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell>{lead.source}</TableCell>
                <TableCell>{lead.assignedTo || '-'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

export default LeadsList
